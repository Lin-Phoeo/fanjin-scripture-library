import json,subprocess,hashlib,threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
plan=json.loads(Path('scripts/cbeta-corpus-plan.json').read_text(encoding='utf-8'))
out=Path('data/catalog/sources');out.mkdir(parents=True,exist_ok=True)
stop=threading.Event()
def get(book):
 p=out/(book['id']+'.xml')
 if p.exists() and '<TEI' in p.read_text(encoding='utf-8',errors='ignore')[:500]:return {'id':book['id'],'status':'cached','bytes':p.stat().st_size}
 if stop.is_set():return {'id':book['id'],'status':'stopped'}
 part=p.with_suffix('.tmp')
 r=subprocess.run(['curl.exe','-L','--max-time','45','--max-filesize','30000000','--fail','-sS','-w','%{http_code}',book['url'],'-o',str(part)],capture_output=True,text=True,timeout=50)
 status=r.stdout.strip()
 if status in ('401','403','429'):stop.set()
 if r.returncode or status!='200':
  if part.exists():part.unlink()
  return {'id':book['id'],'status':status,'error':r.stderr[:200]}
 content=part.read_bytes()
 if b'<TEI' not in content[:500]:part.unlink();return {'id':book['id'],'status':'not-xml'}
 part.replace(p)
 return {'id':book['id'],'status':200,'bytes':len(content),'sha256':hashlib.sha256(content).hexdigest()}
results=[]
with ThreadPoolExecutor(max_workers=3) as executor:
 for future in as_completed([executor.submit(get,book) for book in plan['books']]):
  row=future.result();results.append(row);print(json.dumps(row,ensure_ascii=False),flush=True)
Path('output/research/catalog-expansion/cbeta-download.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
