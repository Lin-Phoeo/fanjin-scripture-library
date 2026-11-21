from pathlib import Path
import hashlib, json, shutil, subprocess

ROOT = Path(__file__).resolve().parent
RESEARCH = ROOT.parent
OUT = ROOT / 'deliverable'
EV = OUT / 'evidence'
EV.mkdir(exist_ok=True)
rows = []

def add(src, dest, url, scope, expected=None):
    src = Path(src)
    data = src.read_bytes()
    digest = hashlib.sha256(data).hexdigest()
    if expected and digest != expected:
        raise RuntimeError(f'Source digest differs: {src.name}')
    target = EV / dest
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, target)
    rows.append(dict(file='evidence/' + dest, url=url, scope=scope,
                     bytes=len(data), sha256=digest,
                     original_sha256_checked=bool(expected)))

def manifest_sources(directory, manifest, names, group, scope):
    entries = json.loads((directory / manifest).read_text(encoding='utf-8-sig'))
    for item in entries:
        name = item.get('file', item.get('name'))
        if name not in names:
            continue
        filename = name if (directory/name).is_file() else name + '-README.md'
        add(directory/filename, group+'/'+filename, item['url'], scope, item.get('sha256'))

t3 = ROOT/'t3-sources'
for item in json.loads((t3/'verified-source-map.json').read_text(encoding='utf-8-sig')):
    filename = item.get('exact_tag_file', item['file'])
    add(t3/filename, 't3/'+filename, item['url'], 'T3 v0.1.11 fixed tag',
        item.get('tag_sha256',item['sha256']))

gem = RESEARCH/'gemini-report-review'/'sources'
manifest_sources(gem, 't3-manifest.json', {'t3-v0.1.11-tools.ts'}, 't3', 'T3 v0.1.11 fixed tag')
land = RESEARCH/'multi-agent-open-landscape'/'sources'
manifest_sources(land, 'release-source-manifest.json',
                 {'ao-release-README.md','ao-release-architecture.md','wtk-release-agents.md','omo-release-README.md'},
                 'release-docs','Fixed tag as present in source URL')
manifest_sources(land, 'final-source-manifest.json',
                 {'ao-release-agent-catalog.mdx','ao-release-claude.mdx','ao-release-codex.mdx','openhands-README.md','crewai-README.md'},
                 'release-docs','Tag or HEAD as present in source URL; HEAD is a snapshot, not pinned release')
manifest_sources(land, 'manifest.json',
                 {'vibe-kanban','ccb','dmux','worktree-kanban'},
                 'landscape','HEAD snapshot from earlier research, not release-level verification')
manifest_sources(land, 'followup-manifest.json', {'ccg-README.md','omo-config.md','omo-license.md'},
                 'landscape','Research snapshot; see source URL for branch')
for filename,url in [('ccg-README.md','https://github.com/fengshao1227/ccg-workflow'),
                     ('omo-license.md','https://github.com/code-yeongyu/oh-my-openagent/blob/dev/LICENSE.md')]:
    if not any(r['file'].endswith('/'+filename) for r in rows):
        add(land/filename, 'landscape/'+filename, url, 'Previously retrieved public document snapshot')

for item in json.loads((gem/'manifest.json').read_text(encoding='utf-8-sig')):
    name = item['file']
    if name in {'claude-legal.md','claude-gateway.md','orca-README.md'}:
        add(gem/name,'claims/'+name,item['url'],'Retrieved official document snapshot',item['sha256'])
    elif name in {'dsh-12857.html','t3-36147.html','ao-8495.html'}:
        add(gem/(name+'.txt'),'claims/'+name+'.txt',item['url'],
            'Extracted issue/discussion page text; not a local reproduction')

herdr=RESEARCH/'multi-agent-3212629'/'herdr-official'
for item in json.loads((herdr/'source-manifest.json').read_text(encoding='utf-8-sig')):
    add(herdr/item['file'],'herdr/'+item['file'],item['url'],
        'Official document snapshot; original Git blob '+item.get('blobSha','unknown'))

dsh=RESEARCH/'dsh-collaboration'
add(dsh/'hey_my_buddy-0.69.7-py3-none-any.whl','hmb/hey_my_buddy-0.69.7-py3-none-any.whl',
    'https://pypi.org/project/hey-my-buddy/0.69.7/','Published wheel, preserved without installation',
    '1d94fdeed44b3bc8e7c08f16d44ce559d51f6e11672a13ae51508b2532ab424b')
package=dsh/'hmb-0.69.7'/'hey_my_buddy'
for filename in ['timestamps.py','buddy/harnesses/discovery.py','buddy/harnesses/codex/config.py',
                 'buddy/harnesses/codex/native_run.py','buddy/harnesses/claude/config.py',
                 'buddy/harnesses/claude/native_run.py','buddy/harnesses/dsh/protocol.py',
                 'buddy/harnesses/dsh/native_run.py','protocol/windows_process.py',
                 '_distribution/references/workflow.md','_distribution/references/workspace-lifecycle.md',
                 '_distribution/references/operations.md']:
    add(package/filename,'hmb/extracted/'+filename,'https://pypi.org/project/hey-my-buddy/0.69.7/',
        'Exact file extracted from preserved published wheel; source inspection only')
for filename in ['hmb-offline-results.json','native-routing-verification.json','hmb_offline_checks.py',
                 'verify-native-routing.cjs','read-public-package.cjs']:
    add(dsh/filename,'checks/'+filename,'local-generated-evidence',
        'Offline helper test or historical result; no model/runtime integration proof')
add(ROOT/'sources'/'opencode-context7.json','opencode/context7-query.json',
    'https://github.com/anomalyco/opencode','Context7 query result, includes v1 and current doc paths; do not mix configuration generations')
for filename in ['orchestration-search.md','t3-search.md']:
    add(ROOT/filename,'discovery/'+filename,'local-generated-search-output',
        'Discovery only; includes failed SearXNG attempts, not primary conclusion evidence')

(EV/'manifest.json').write_text(json.dumps({'as_of':'2026-11-21 Asia/Shanghai',
    'meaning':'SHA256 proves preserved file identity, not truth or live runtime compatibility.',
    'files':rows},ensure_ascii=False,indent=2),encoding='utf-8')

index = '''# 来源与证据索引

日期：2026-11-21。本文是 [完整报告](01-完整调研报告.md) 的附件。关键结论的公开来源以报告 S01–S21 为准。

## 证据怎么理解

- 固定标签、正式 wheel 和源码说明相关接口/实现确实存在，不证明这台电脑已经联调成功。
- HEAD 和现行网页是抓取时快照，不冒充某个发行版已包含的能力。
- SHA256 证明本包文件身份，不证明来源主张必然正确；issue 也不是本机复现。
- HMB 7 项、DSH 10 项是此前实际完成的纯函数/helper 验证。本次交付保留结果，不把它们写成新的实联。
- 原始 Word 的关键主张已经复核，未把246个引用都标为已核。用户 Word、凭据和浏览器会话不复制到来源包。

## 保存范围

下表列出本包保存的公开原文或离线证据。机器可读哈希和作用域见 [manifest.json](evidence/manifest.json)。来源为 local-generated 的条目是搜索/验证输出，不是外部权威来源。

'''
index += f'共 **{len(rows)} 份文件**，其中 {sum(r["original_sha256_checked"] for r in rows)} 份另与既有来源清单或固定标签哈希比对一致。\n\n'
index += '| 文件 | 核查对象或范围 | 原文入口 |\n| --- | --- | --- |\n'
for r in rows:
    link=f'[来源]({r["url"]})' if r['url'].startswith('https://') else '本地生成的证据'
    index += f'| [{r["file"]}]({r["file"]}) | {r["scope"]} | {link} |\n'
index += '''
## 本包没有保存的全部原文

报告列出的论坛全文、Orca现行结构化编排网页、LangGraph早轮查询及部分源码归档未完整复制；对应结论来自前轮实际读取记录，公开入口见主报告。不可据“未附快照”称本包包含全部原始资料。后续实施遇到版本漂移，应按选定发行版重新定点核实。

## 交付验证

验证输出见 [交付校验](交付校验.json)：报告内部相对链接、来源文件哈希、PDF文字与目录、页面渲染和桌面复制一致性。它验证这份研究交付物，不表示模型渠道已经联通、候选已经安装或网站进行了新发布。
'''
(OUT/'03-来源与证据.md').write_text(index,encoding='utf-8')

css='''
:root{color-scheme:light;--ink:#1b2c36;--muted:#5d6e77;--accent:#08696b;--line:#d9e4e6;--paper:#fff;--wash:#f3f6f7}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--wash);color:var(--ink);font:16px/1.9 "Microsoft YaHei","Noto Sans CJK SC",sans-serif}
body{padding:42px max(24px,calc((100vw - 1040px)/2)) 90px}header{border-top:6px solid var(--accent);padding:28px 0 24px}h1{font-size:36px;line-height:1.4;margin:0 0 14px;letter-spacing:-.025em}.subtitle{font-size:19px;color:var(--muted);margin:0 0 12px}.author,.date{display:inline-block;margin:0 22px 0 0;color:var(--muted)}
nav{background:#e9f0f1;border:1px solid var(--line);border-radius:10px;padding:20px 28px;margin:0 0 36px}nav>ul{columns:2;column-gap:35px;margin:0;padding-left:22px}nav li{break-inside:avoid;margin:.3em 0}nav ul ul{display:none}
h2{font-size:25px;line-height:1.5;color:var(--accent);padding-top:28px;margin-top:24px;border-top:1px solid var(--line)}h3{font-size:20px;line-height:1.6;margin:30px 0 12px}p{margin:13px 0}a{color:var(--accent);text-decoration-thickness:1px;text-underline-offset:3px}strong{font-weight:700}table{border-collapse:collapse;width:100%;font-size:14px;line-height:1.75;margin:23px 0;table-layout:auto;background:white}th{text-align:left;background:#e3eeef;color:#184d50;padding:11px 13px}td{padding:11px 13px;vertical-align:top;border-bottom:1px solid var(--line)}tr:nth-child(even) td{background:#f8fafb}code{font: .9em "Cascadia Mono",Consolas,"Microsoft YaHei",monospace;background:#e9eef1;padding:2px 5px;border-radius:3px;overflow-wrap:anywhere}pre{background:#e9f0f1;padding:20px;overflow:auto;border-left:3px solid var(--accent);font-size:14px;line-height:1.8}pre code{padding:0;background:transparent;white-space:pre}li{margin:.5em 0}blockquote{border-left:3px solid var(--accent);margin:20px 0;padding:5px 20px;background:#e9f0f1}section{min-width:0}
@media(max-width:650px){body{padding:20px 18px 60px;font-size:15px}h1{font-size:28px}h2{font-size:22px}nav>ul{columns:1}table{font-size:12px}td,th{padding:8px}pre{font-size:12px}}
@media print{body{padding:0;background:white;font-size:10pt}a{color:#184d50}h2,h3{break-after:avoid}table{font-size:8pt}tr{break-inside:avoid}nav{break-after:page}nav>ul{columns:1}pre{white-space:pre-wrap}p{orphans:3;widows:3}}
'''
(ROOT/'report.css').write_text(css,encoding='utf-8')
pandoc=Path(r'{USER_HOME}\AppData\Local\Pandoc\pandoc.exe')
subprocess.run([str(pandoc),str(OUT/'01-完整调研报告.md'),'-s','--toc','--toc-depth=2',
    '--css',str(ROOT/'report.css'),'--embed-resources','-o',str(OUT/'阅读版.html')],check=True)

header='''#show heading.where(level: 1): set text(fill: rgb("08696b"), size: 16pt)
#show heading.where(level: 2): set text(fill: rgb("08696b"), size: 16pt)
#show heading.where(level: 3): set text(fill: rgb("184d50"), size: 12pt)
#set table(inset: 5pt, stroke: (bottom: 0.35pt + rgb("d9e4e6")))
#show raw: set text(font: ("Cascadia Mono", "Microsoft YaHei"), size: 8pt)
#show link: set text(fill: rgb("08696b"))
'''
(ROOT/'pdf-header.typ').write_text(header,encoding='utf-8')
(ROOT/'pdf-metadata.yaml').write_text('margin:\n  left: 18mm\n  right: 18mm\n  top: 18mm\n  bottom: 18mm\ntoc-title: 目录\n', encoding='utf-8')
subprocess.run([str(pandoc),str(OUT/'01-完整调研报告.md'),'-s','--toc','--toc-depth=2',
    '--pdf-engine=typst','-V','mainfont=Microsoft YaHei','-V','codefont=Microsoft YaHei',
    '-V','fontsize=9.5pt','-V','linestretch=1.32','-V','papersize=a4',
    '--metadata-file',str(ROOT/'pdf-metadata.yaml'),'-V','page-numbering=1','-H',str(ROOT/'pdf-header.typ'),
    '-o',str(OUT/'完整报告.pdf')],check=True)
print(json.dumps({'source_files':len(rows),'source_bytes':sum(r['bytes'] for r in rows),
                  'report_chars':len((OUT/'01-完整调研报告.md').read_text(encoding='utf-8')),
                  'outputs':[p.name for p in OUT.iterdir() if p.is_file()]},ensure_ascii=False))
