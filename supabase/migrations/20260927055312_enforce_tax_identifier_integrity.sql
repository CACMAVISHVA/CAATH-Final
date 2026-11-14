-- Keep statutory identifiers valid even when a write bypasses the browser UI.
-- Empty optional values remain allowed; non-empty values must be normalized.

alter table public.clients
  add constraint clients_pan_format_check
  check (
    pan is null or btrim(pan) = '' or
    (pan = upper(btrim(pan)) and pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$')
  ),
  add constraint clients_gstin_format_check
  check (
    gstin is null or btrim(gstin) = '' or
    (gstin = upper(btrim(gstin)) and gstin ~ '^(0[1-9]|[1-2][0-9]|3[0-8])[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$')
  ),
  add constraint clients_tan_format_check
  check (
    tan is null or btrim(tan) = '' or
    (tan = upper(btrim(tan)) and tan ~ '^[A-Z]{4}[0-9]{5}[A-Z]$')
  ),
  add constraint clients_cin_llpin_format_check
  check (
    cin_llpin is null or btrim(cin_llpin) = '' or
    (
      cin_llpin = upper(btrim(cin_llpin)) and
      (
        cin_llpin ~ '^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$' or
        cin_llpin ~ '^[A-Z]{3}-[0-9]{4}$'
      )
    )
  );

alter table public.firms
  add constraint firms_gstin_format_check
  check (
    gstin is null or btrim(gstin) = '' or
    (gstin = upper(btrim(gstin)) and gstin ~ '^(0[1-9]|[1-2][0-9]|3[0-8])[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$')
  );

create unique index if not exists clients_firm_pan_unique
  on public.clients (firm_id, upper(btrim(pan)))
  where pan is not null and btrim(pan) <> '';

create unique index if not exists clients_firm_gstin_unique
  on public.clients (firm_id, upper(btrim(gstin)))
  where gstin is not null and btrim(gstin) <> '';
