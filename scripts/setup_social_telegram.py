import hashlib,json,os,subprocess,sys,urllib.request,urllib.error
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def derived(token,purpose):return hashlib.sha256((purpose+':'+token).encode()).hexdigest()
def api(url,token=None,data=None,method=None):
 req=urllib.request.Request(url,data=json.dumps(data).encode() if data is not None else None,method=method,headers={'Content-Type':'application/json',**({'Authorization':'Bearer '+token} if token else {})})
 try:
  with urllib.request.urlopen(req,timeout=40) as r:return json.load(r)
 except urllib.error.HTTPError as e:raise RuntimeError('API request rejected (HTTP '+str(e.code)+'); credentials and response suppressed') from None
 except Exception:raise RuntimeError('API request failed; credentials and response suppressed') from None
def tg(token,method,data=None):
 result=api('https://api.telegram.org/bot'+token+'/'+method,data=data)
 if not result.get('ok'):raise RuntimeError('Telegram API rejected '+method)
 return result['result']
def main():
 token=os.environ['TELEGRAM_BOT_TOKEN'];cf=os.environ['CLOUDFLARE_API_TOKEN'];account=os.environ['CLOUDFLARE_ACCOUNT_ID']
 print('Checking bot identity',flush=True)
 me=tg(token,'getMe')
 if me.get('username')!='DrShemMYubot':raise RuntimeError('Unexpected bot username')
 print('Checking channel access',flush=True)
 member=tg(token,'getChatMember',{'chat_id':'@DrShemMYu','user_id':me['id']})
 if member.get('status') not in ('administrator','member','creator'):raise RuntimeError('Bot has no channel access')
 base='https://api.cloudflare.com/client/v4/accounts/'+account
 print('Checking Cloudflare worker subdomain',flush=True)
 sub=api(base+'/workers/subdomain',cf)
 if not sub.get('success'):raise RuntimeError('Cannot read Cloudflare workers subdomain')
 endpoint='https://shemyakin-social-feed.'+sub['result']['subdomain']+'.workers.dev'
 current=tg(token,'getWebhookInfo').get('url','')
 if current and current!=endpoint+'/telegram':raise RuntimeError('Existing unrelated webhook: no changes made')
 config=ROOT/'workers/social-feed/runtime.json'
 config.write_text(json.dumps({'name':'shemyakin-social-feed','main':'worker.mjs','compatibility_date':'2026-10-05','workers_dev':True,'durable_objects':{'bindings':[{'name':'POSTS','class_name':'SocialFeedStore'}]},'migrations':[{'tag':'v1','new_sqlite_classes':['SocialFeedStore']}]}))
 subprocess.run(['npx','wrangler','deploy','--config',str(config)],check=True)
 for name,purpose in [('WEBHOOK_SECRET','webhook'),('EXPORT_SECRET','export')]:
  result=subprocess.run(['npx','wrangler','secret','put',name,'--config',str(config)],input=derived(token,purpose)+'\n',text=True,capture_output=True)
  if result.returncode:raise RuntimeError('Worker secret setup failed: '+name)
 if not current:
  tg(token,'setWebhook',{'url':endpoint+'/telegram','secret_token':derived(token,'webhook'),'allowed_updates':['channel_post','edited_channel_post'],'drop_pending_updates':False})
 health=api(endpoint+'/health')
 if health.get('ok') is not True:raise RuntimeError('Worker health check failed')
 check=tg(token,'getWebhookInfo')
 if check.get('url')!=endpoint+'/telegram':raise RuntimeError('Webhook verification failed')
 print('Telegram webhook configured for DrShemMYubot and DrShemMYu')
 with open(os.environ['GITHUB_OUTPUT'],'a') as f:f.write('endpoint='+endpoint+'\n')
if __name__=='__main__':
 try:main()
 except Exception as e:print('Setup failed: '+(str(e) if isinstance(e,RuntimeError) else type(e).__name__),file=sys.stderr);sys.exit(1)
