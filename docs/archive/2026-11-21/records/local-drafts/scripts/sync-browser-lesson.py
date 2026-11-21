"""One-shot user-authorized incident capture; no credentials are printed or accepted as arguments."""
from pathlib import Path
import importlib.util
import json
import os
import sys

root = Path(__file__).resolve().parent.parent
source = root / 'docs/BROWSER-READING-FIX-2026-11-20.md'
title = 'linux.do正文读取反复刷新修复与固定标签验证'
destination = Path(os.environ['USERPROFILE']) / 'Documents/Obsidian Vault/AI沉淀/how-to/2026-11-20-linuxdo正文读取反复刷新修复.md'
destination.parent.mkdir(parents=True, exist_ok=True)
destination.write_text(source.read_text(encoding='utf-8'), encoding='utf-8')
print('Obsidian note saved.')

spec = importlib.util.spec_from_file_location('notion_sync', Path(os.environ['USERPROFILE']) / '.agents/tools/notion_sync.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
sys.argv = [sys.argv[0]]
token = module.resolve_token()
parent = '40051dd8-4bf2-815b-aed5-f4507e9dc9fd'
found = module.call(token, 'POST', '/search', {'query': title, 'filter': {'value': 'page', 'property': 'object'}, 'page_size': 100})
existing = []
for item in found.get('results', []):
    props = item.get('properties', {})
    name = ''.join(t.get('plain_text', t.get('text', {}).get('content', '')) for prop in props.values() if prop.get('type') == 'title' for t in prop.get('title', []))
    if name == title and item.get('parent', {}).get('page_id', '').replace('-', '') == parent.replace('-', ''):
        existing.append(item)
if existing:
    print(json.dumps({'notion': existing[0].get('url'), 'action': 'existing'}, ensure_ascii=False))
else:
    blocks = module.md_to_blocks(source.read_text(encoding='utf-8'))
    page = module.call(token, 'POST', '/pages', {'parent': {'page_id': parent}, 'properties': {'title': {'title': [{'text': {'content': title}}]}}, 'children': blocks[:8]})
    for offset in range(8, len(blocks), 8):
        module.call(token, 'PATCH', '/blocks/' + page['id'] + '/children', {'children': blocks[offset:offset+8]})
    print(json.dumps({'notion': page.get('url'), 'action': 'created', 'blocks': len(blocks)}, ensure_ascii=False))
