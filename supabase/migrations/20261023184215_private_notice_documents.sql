begin;
create schema notice_document_private;
revoke all on schema notice_document_private from public,anon,authenticated;
create table public.notice_documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms(id),
  notice_id uuid not null references public.notices(id),
  name text not null check(length(name) between 1 and 255),
  storage_path text not null unique,
  file_size bigint not null check(file_size>0 and file_size<=10485760),
  mime_type text not null default 'application/pdf' check(mime_type='application/pdf'),
  uploaded_by uuid not null references public.users(id),
  created_at timestamptz not null default now()
);
alter table public.notice_documents enable row level security;
grant select,insert on public.notice_documents to authenticated;
revoke update,delete on public.notice_documents from anon,authenticated;
create policy notice_documents_read on public.notice_documents for select to authenticated using (
  firm_id=public.current_user_firm_id() and public.current_user_role() in ('SuperAdmin','Admin','Staff') and exists(select 1 from public.notices n where n.id=notice_id and n.firm_id=notice_documents.firm_id)
);
create policy notice_documents_insert on public.notice_documents for insert to authenticated with check (
  firm_id=public.current_user_firm_id() and uploaded_by=public.current_user_profile_id()
  and public.current_user_role() in ('SuperAdmin','Admin','Staff')
  and exists(select 1 from public.notices n where n.id=notice_id and n.firm_id=notice_documents.firm_id)
  and storage_path=firm_id::text||'/'||notice_id::text||'/'||id::text||'.pdf'
);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('notice-documents','notice-documents',false,10485760,array['application/pdf']);
create policy notice_files_read on storage.objects for select to authenticated using (
  bucket_id='notice-documents' and split_part(name,'/',1)=public.current_user_firm_id()::text
  and (exists(select 1 from public.notice_documents d where d.storage_path=objects.name and d.firm_id=public.current_user_firm_id())
    or (owner_id=auth.uid()::text and public.current_user_role() in ('SuperAdmin','Admin','Staff')))
);
create policy notice_files_insert on storage.objects for insert to authenticated with check (
  bucket_id='notice-documents' and split_part(name,'/',1)=public.current_user_firm_id()::text
  and public.current_user_role() in ('SuperAdmin','Admin','Staff')
  and exists(select 1 from public.notices n where n.id::text=split_part(name,'/',2) and n.firm_id=public.current_user_firm_id() and n.status<>'Archived')
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$'
);
-- Only unattached uploads can be cleaned up; retained attachments cannot be overwritten/deleted.
create policy notice_files_cleanup on storage.objects for delete to authenticated using (
  bucket_id='notice-documents' and split_part(name,'/',1)=public.current_user_firm_id()::text
  and owner_id=auth.uid()::text and public.current_user_role() in ('SuperAdmin','Admin','Staff')
  and not exists(select 1 from public.notice_documents d where d.storage_path=objects.name)
);
create function notice_document_private.record_document() returns trigger language plpgsql security definer set search_path='' as $$
declare actor public.users%rowtype;
begin
  select * into actor from public.users where id=public.current_user_profile_id() and auth_id=auth.uid();
  if auth.uid() is null or actor.id is null or new.firm_id is distinct from public.current_user_firm_id()
    or actor.role not in ('SuperAdmin','Admin','Staff') then raise exception 'Unauthorized upload'; end if;
  if not exists(select 1 from storage.objects where bucket_id='notice-documents' and name=new.storage_path and owner_id=auth.uid()::text) then
    raise exception 'Upload the PDF before attaching it';
  end if;
  if not exists(select 1 from public.notices where id=new.notice_id and firm_id=new.firm_id and status<>'Archived') then raise exception 'Notice unavailable or archived'; end if;
  if not exists(select 1 from storage.objects where bucket_id='notice-documents' and name=new.storage_path and (metadata->>'size')::bigint=new.file_size and metadata->>'mimetype'='application/pdf') then raise exception 'File metadata mismatch'; end if;
  new.uploaded_by := actor.id;
  insert into public.notice_history(firm_id,notice_id,actor_id,event_type,to_status)
  select new.firm_id,new.notice_id,actor.id,'PDF attached: '||new.name,n.status from public.notices n where n.id=new.notice_id;
  return new;
end;
$$;
create trigger notice_document_audit before insert on public.notice_documents for each row execute function notice_document_private.record_document();

create policy notice_files_fence on storage.objects as restrictive for all to authenticated using (
 bucket_id<>'notice-documents' or (split_part(name,'/',1)=public.current_user_firm_id()::text and public.current_user_role() in ('SuperAdmin','Admin','Staff'))
) with check (
 bucket_id<>'notice-documents' or (split_part(name,'/',1)=public.current_user_firm_id()::text and public.current_user_role() in ('SuperAdmin','Admin','Staff'))
);
create policy notice_files_read_fence on storage.objects as restrictive for select to authenticated using (
 bucket_id<>'notice-documents' or (owner_id=auth.uid()::text or exists(select 1 from public.notice_documents d where d.storage_path=objects.name))
);
create policy notice_files_no_replace on storage.objects as restrictive for update to authenticated using (bucket_id<>'notice-documents');
create policy notice_files_retention on storage.objects as restrictive for delete to authenticated using (
 bucket_id<>'notice-documents' or (owner_id=auth.uid()::text and not exists(select 1 from public.notice_documents d where d.storage_path=objects.name))
);
create policy notice_files_no_anon on storage.objects as restrictive for all to anon using (bucket_id<>'notice-documents') with check (bucket_id<>'notice-documents');
create policy notice_files_insert_fence on storage.objects as restrictive for insert to authenticated with check (
  bucket_id='notice-documents' and split_part(name,'/',1)=public.current_user_firm_id()::text
  and public.current_user_role() in ('SuperAdmin','Admin','Staff')
  and exists(select 1 from public.notices n where n.id::text=split_part(name,'/',2) and n.firm_id=public.current_user_firm_id() and n.status<>'Archived')
  and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$'
);
revoke all on function notice_document_private.record_document() from public,anon,authenticated;
commit;
