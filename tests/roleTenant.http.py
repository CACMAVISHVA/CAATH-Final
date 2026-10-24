"""Manual isolated-preview role checks. Requires the synthetic SQL fixtures and password file."""
import argparse,json,urllib.request,urllib.error
from pathlib import Path

def main():
 p=argparse.ArgumentParser();p.add_argument('--project-url',required=True);p.add_argument('--publishable-key',required=True);p.add_argument('--password-file',required=True);args=p.parse_args()
 base=args.project_url.rstrip('/')
 if not base.startswith('https://') or 'pxttixtittcmblrbvwph' in base:raise RuntimeError('Use an isolated preview, never production')
 password=json.loads(Path(args.password_file).read_text())['password'];checks=0
 def request(path,token=None,payload=None):
  headers={'apikey':args.publishable_key,'Content-Type':'application/json','Origin':'https://caath.in'}
  if token:headers['Authorization']='Bearer '+token
  req=urllib.request.Request(base+path,headers=headers,data=json.dumps(payload).encode() if payload is not None else None)
  try:r=urllib.request.urlopen(req,timeout=30)
  except urllib.error.HTTPError as e:r=e
  body=r.read();return r.status,json.loads(body) if body else None
 def expect(ok,label):
  nonlocal checks
  if not ok:raise AssertionError(label)
  checks+=1
 for email,role,expected in [('owner@roles.invalid','SuperAdmin',2),('admin@roles.invalid','Admin',2),('staff@roles.invalid','Staff',2),('client@roles.invalid','Client',1),('other@roles.invalid','SecondFirm',1),('platform@roles.invalid','GodAdmin',3)]:
  status,result=request('/auth/v1/token?grant_type=password',payload={'email':email,'password':password});expect(status==200,role+' sign-in failed')
  token=result['access_token']
  status,rows=request('/rest/v1/clients?select=id&id=in.(94000000-0000-4000-8000-000000000001,94000000-0000-4000-8000-000000000002,94000000-0000-4000-8000-000000000003)',token);expect(status==200 and len(rows)==expected,role+' client scope')
  if role not in ['GodAdmin','SecondFirm']:
   for table in ['clients','tasks','documents','notices','gst_return_statuses']:
    status,rows=request('/rest/v1/'+table+'?select=id&firm_id=eq.92000000-0000-4000-8000-000000000002',token)
    expect(status in (401,403) or (status==200 and rows==[]),role+' foreign '+table)
  if role=='SecondFirm':
   status,rows=request('/rest/v1/clients?select=id&firm_id=eq.92000000-0000-4000-8000-000000000001',token);expect(status==200 and rows==[],role+' foreign clients')
  if role in ['Staff','Client']:
   target='Private%20staff%20alert' if role=='Client' else 'Client%20alert'
   status,rows=request('/rest/v1/notifications?select=id&title=eq.'+target,token);expect(status==200 and rows==[],role+' private alert boundary')
  status,result=request('/functions/v1/portal-secrets',token,{'action':'list','clientId':'94000000-0000-4000-8000-000000000001'})
  expect(status==(403 if role in ['Client','GodAdmin','SecondFirm'] else 200),role+' vault boundary')
  print(role+': PASS')
 status,rows=request('/rest/v1/clients?select=id&id=in.(94000000-0000-4000-8000-000000000001,94000000-0000-4000-8000-000000000002,94000000-0000-4000-8000-000000000003)');expect(status in (401,403) or(status==200 and rows==[]),'Anonymous clients')
 print(json.dumps({'result':'PASS','assertions':checks,'scope':'synthetic preview HTTP role/tenant access'}))

if __name__=='__main__':main()
