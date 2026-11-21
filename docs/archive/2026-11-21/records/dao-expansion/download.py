import json,subprocess,threading
from concurrent.futures import ThreadPoolExecutor,as_completed
from pathlib import Path
ids='KR5c0124 KR5c0118 KR5c0022 KR5d0059 KR5b0084 KR5f0001 KR5c0138'.split();out=Path('output/dao-expansion');stop=threading.Event()
def get(name):
 p=out/(name+'.zip')
 if p.exists() and p.read_bytes()[:2]==b'PK':return {'repo':name,'cached':True}
 if stop.is_set():return {'repo':name,'status':'stopped'}
 r=subprocess.run(['curl.exe','-L','--max-time','35','--max-filesize','15000000','--fail','-sS','-w','%{http_code}','https://codeload.github.com/kanripo/'+name+'/zip/refs/heads/master','-o',str(p)],capture_output=True,text=True,timeout=40)
 if r.stdout.strip() in ('401','403','429'):stop.set()
 return {'repo':name,'status':r.stdout,'bytes':p.stat().st_size if p.exists() else 0,'error':r.stderr[:100]}
with ThreadPoolExecutor(max_workers=3) as pool:
 for f in as_completed([pool.submit(get,n) for n in ids]):print(json.dumps(f.result()),flush=True)
