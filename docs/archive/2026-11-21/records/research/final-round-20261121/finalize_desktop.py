from pathlib import Path
import json, hashlib, re, shutil
from urllib.parse import unquote, urlsplit
from html.parser import HTMLParser

root=Path(__file__).resolve().parent
out=root/'deliverable'
files=list(out.glob('*.md'))
broken=[]
links=0
for p in files:
    for target in re.findall(r'\]\(([^)]+)\)',p.read_text(encoding='utf-8')):
        if urlsplit(target).scheme or target.startswith('#'):
            continue
        links+=1
        rel=unquote(target.split('#')[0])
        if rel and not (p.parent/rel).is_file() and rel!='交付校验.json':
            broken.append({'file':p.name,'target':target})
if broken:
    raise RuntimeError(f'Broken delivery links: {broken}')

manifest=json.loads((out/'evidence'/'manifest.json').read_text(encoding='utf-8'))
for item in manifest['files']:
    p=out/item['file']
    assert p.stat().st_size==item['bytes']
    assert hashlib.sha256(p.read_bytes()).hexdigest()==item['sha256']

reading=json.loads((root/'reading-checks.json').read_text(encoding='utf-8'))
pdf=json.loads((root/'pdf-checks.json').read_text(encoding='utf-8'))
assert reading['browserClosed']
assert all(not c['overflow'] for c in reading['checks'])
assert not reading['checks'][0]['remoteResources']
assert reading['checks'][0]['tocLinks']==14
assert not reading['checks'][0]['brokenAnchors']
assert pdf['rendered_pages']==pdf['page_count']==10
assert pdf['outline_entries']>0
assert all(pdf['fonts_embedded'].values())
assert all(p['text_chars']>100 and not p['replacement_chars'] for p in pdf['pages'])
assert all(pdf['contains'])

# Scan authored reports and machine-readable delivery manifest only. Public source
# examples may contain literal placeholder names for credentials, not actual secrets.
authored='\n'.join(p.read_text(encoding='utf-8') for p in files)
suspicious=re.findall(r'\b(?:sk-[A-Za-z0-9_-]{22,}|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})',authored)
assert not suspicious, 'Unexpected credential-like value in authored report'

destination=Path(r'{USER_HOME}\Desktop\多智能体协作调研-2026-11-21')
if destination.exists():
    raise RuntimeError('Desktop destination already exists; preserve existing contents.')
verification={
    'date':'2026-11-21 Asia/Shanghai',
    'scope':'Research deliverable only; no orchestrator installation or live coding-provider integration',
    'authored_relative_links_checked':links,'broken_authored_links':broken,
    'evidence_files_hashed':len(manifest['files']),
    'html':reading,'pdf':pdf,
    'visual_review':'All 10 PDF pages reviewed as rendered contact sheets; desktop/mobile HTML screenshots reviewed.',
    'credential_pattern_check':'No matching values in authored reports; only public source snapshots included.',
    'browser_cleanup':'Dedicated headless browser and context closed in finally; no user browser or server used.',
    'desktop_copy':'Every delivered file byte-compared after copying.',
    'not_run':['Candidate installation','Live coding-model requests','Concurrent provider integration','Windows orchestrator cancellation/recovery','Speed/cost benchmark','New website release']
}
(out/'交付校验.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2),encoding='utf-8')
shutil.copytree(out,destination)
for p in out.rglob('*'):
    if p.is_file():
        q=destination/p.relative_to(out)
        assert q.read_bytes()==p.read_bytes(), f'Copy mismatch: {p.name}'
print(json.dumps({'desktop':str(destination),'delivered_files':sum(p.is_file() for p in destination.rglob('*')),
                  'total_bytes':sum(p.stat().st_size for p in destination.rglob('*') if p.is_file()),
                  'relative_links':links,'source_files':len(manifest['files']),'pdf_pages':pdf['page_count']},
                 ensure_ascii=False))
