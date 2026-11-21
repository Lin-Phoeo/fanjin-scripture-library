from pathlib import Path
import json
from PIL import Image, ImageDraw
from pypdf import PdfReader

root=Path(__file__).resolve().parent
r=PdfReader(root/'deliverable'/'完整报告.pdf')
pages=[]
for i,p in enumerate(r.pages):
    text=p.extract_text() or ''
    pages.append({'page':i+1,'text_chars':len(text),'replacement_chars':text.count('\ufffd')})
alltext='\n'.join(p.extract_text() or '' for p in r.pages)
(root/'pdf-extracted.txt').write_text(alltext,encoding='utf-8')
fonts={}
for p in r.pages:
    for _,ref in p.get('/Resources',{}).get('/Font',{}).items():
        f=ref.get_object()
        descendants=f.get('/DescendantFonts')
        desc=(descendants[0].get_object() if descendants else f).get('/FontDescriptor')
        desc=desc.get_object() if desc else {}
        fonts[str(f.get('/BaseFont'))]=any(k in desc for k in ['/FontFile','/FontFile2','/FontFile3'])
images=sorted(root.glob('pdf-page-*.png'))
for batch in range(0,len(images),6):
    sheet=Image.new('RGB',(3*500,2*740),'#dfe6e8')
    draw=ImageDraw.Draw(sheet)
    for j,p in enumerate(images[batch:batch+6]):
        im=Image.open(p).convert('RGB')
        im.thumbnail((480,700))
        x=(j%3)*500+10;y=(j//3)*740+30
        sheet.paste(im,(x,y))
        draw.text((x,y-22),p.stem,fill='black')
    sheet.save(root/f'pdf-contact-{batch//6+1}.png')
result={'page_count':len(r.pages),'outline_entries':len(r.outline),'metadata_title':str(r.metadata.title),
        'pages':pages,'fonts_embedded':fonts,
        'contains':['T3 Code' in alltext,'HMB' in alltext,'providerInstanceId' in alltext,'17' in alltext],
        'rendered_pages':len(images),'tagged':bool(r.trailer['/Root'].get('/StructTreeRoot'))}
(root/'pdf-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(result,ensure_ascii=False))
