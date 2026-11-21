import subprocess,json,time
from pathlib import Path
out=Path('output/dao-expansion');results=[]
for section in 'abcdefghi':
 page=1
 while True:
  r=subprocess.run(['gh','api','search/repositories?q=org%3Akanripo+KR5'+section+'+in%3Aname&per_page=100&page='+str(page)],capture_output=True,encoding='utf-8',timeout=30)
  if r.returncode:
   print('STOP',section,r.stderr[:150]);raise SystemExit(1)
  data=json.loads(r.stdout);items=data['items'];results.extend({'id':x['name'],'title':x.get('description'),'url':x['html_url'],'updatedAt':x['updated_at']} for x in items if x['name'].startswith('KR5'+section))
  print(section,page,'items',len(items),'total',data['total_count'],flush=True)
  if len(items)<100 or page*100>=data['total_count']:break
  page+=1;time.sleep(2)
 time.sleep(2)
(out/'dao-repository-inventory.json').write_text(json.dumps({'retrievedAt':'2026-11-20','queryRange':'kanripo KR5a through KR5i','items':results},ensure_ascii=False,indent=2),encoding='utf-8')
print('TOTAL',len(results))
