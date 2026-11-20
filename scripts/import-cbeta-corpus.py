#!/usr/bin/env python3
"""Convert a bounded CBETA Taisho manifest to traceable catalogue JSON.

Only standard-library modules are used. Existing XML files are reused. Missing
sources are reported unless --download is explicit. A 403/429 stops downloads.
This tool does not modify catalog-manifest.json or publish to any application.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path

TEI = "http://www.tei-c.org/ns/1.0"
CB = "http://www.cbeta.org/ns/1.0"
XML_ID = "{http://www.w3.org/XML/1998/namespace}id"
NS = {"t": TEI, "cb": CB}
REPO_ROOT = Path(__file__).resolve().parents[1]
SKIP_INLINE = {"note", "rdg", "anchor", "lb", "pb", "milestone", "mulu", "docNumber", "figDesc", "figure", "graphic"}
SKIP_BLOCK = {"teiHeader", "back", "byline", "docNumber", "jhead", "mulu", "note", "rdg", "trailer"}
SKIP_DIV = {"xu", "xu2", "w", "preface", "postface", "apparatus", "cbeta-notes", "taisho-notes"}


def local_name(element: ET.Element) -> str:
    return element.tag.rsplit("}", 1)[-1] if isinstance(element.tag, str) else ""


def text_content(element: ET.Element | None) -> str:
    return "".join(element.itertext()).strip() if element is not None else ""


def clean_text(value: str) -> str:
    # Source line wraps are physical Taisho lines, not paragraph boundaries.
    # U+3000 is meaningful in mantra segmentation, including immediately after notes.
    return re.sub(r"[\t\r\n ]+", "", value).strip(" \t\r\n")


def slug(value: str) -> str:
    result = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not result:
        raise ValueError(f"Cannot build stable slug from {value!r}")
    return result


class Parser:
    def __init__(self, root: ET.Element, source_id: str):
        self.root = root
        self.source_id = source_id
        self.glyphs: dict[str, tuple[str, str]] = {}
        self.glyph_uses: Counter[str] = Counter()
        self.warnings: list[str] = []
        self.missing: set[str] = set()
        self.inline_choices: Counter[str] = Counter()
        self.excluded: Counter[str] = Counter()
        self.paragraphs: list[dict] = []
        self.juan = "001"
        self.chapter = "正文"
        self.chapter_key = "juan-001"
        self.pending_chapter_anchor = False
        self.chapter_ordinals: Counter[str] = Counter()
        self.page = ""
        self.fallback_count = 0
        self.block_tags: Counter[str] = Counter()
        for char in root.findall(".//t:charDecl/t:char", NS):
            name = char.get(XML_ID, "")
            properties = {
                text_content(prop.find("t:localName", NS)): text_content(prop.find("t:value", NS))
                for prop in char.findall("t:charProp", NS)
            }
            mappings = {m.get("type", ""): text_content(m) for m in char.findall("t:mapping", NS)}
            resolved = None
            for kind in ("unicode", "normal_unicode"):
                mapping = mappings.get(kind)
                if mapping and re.fullmatch(r"U\+[0-9A-Fa-f]+(?:\s+U\+[0-9A-Fa-f]+)*", mapping):
                    points = [int(code[2:], 16) for code in mapping.split()]
                    if all(not (0xE000 <= point <= 0xF8FF or 0xF0000 <= point <= 0xFFFFD or 0x100000 <= point <= 0x10FFFD) for point in points):
                        resolved = ("".join(chr(point) for point in points), kind)
                        break
            if resolved is None and properties.get("normalized form"):
                resolved = (properties["normalized form"], "normalized form")
            if resolved is None and properties.get("composition"):
                # Visible IDS preserves information when no Unicode equivalent exists.
                resolved = ("〔" + properties["composition"] + "〕", "composition")
            if resolved is not None:
                self.glyphs[name] = resolved

    def render(self, element: ET.Element) -> str:
        name = local_name(element)
        if name in SKIP_INLINE:
            self.excluded[name] += 1
            return ""
        if name == "g":
            key = element.get("ref", "").lstrip("#")
            value = self.glyphs.get(key)
            if value:
                self.glyph_uses[f"{key}:{value[1]}:{value[0]}"] += 1
                return value[0]
            existing = clean_text(text_content(element))
            if existing:
                return existing
            self.missing.add(key or "(unnamed glyph)")
            return "〔未解析缺字:" + key + "〕"
        if name in {"app", "choice"}:
            preference = ("lem",) if name == "app" else ("corr", "reg", "orig", "sic")
            chosen = next((child for tag in preference for child in element if local_name(child) == tag), None)
            if chosen is None:
                raise ValueError(f"No authoritative reading in <{name}>")
            self.inline_choices[f"{name}/{local_name(chosen)}"] += 1
            return self.render(chosen)
        if name == "space":
            quantity = element.get("quantity", "1")
            return "　" * min(int(quantity), 10) if quantity.isdigit() else "　"
        if name == "gap":
            self.warnings.append("Source includes gap: " + str(element.attrib))
            return "〔原本缺文〕"
        parts = [clean_text(element.text or "")]
        for child in element:
            parts.append(self.render(child))
            if local_name(child) == "l":
                parts.append("\n")
            parts.append(clean_text(child.tail or ""))
        return "".join(parts).strip(" \t\r\n")

    def walk(self, element: ET.Element) -> None:
        name = local_name(element)
        if name == "div" and element.get("type", "") in SKIP_DIV:
            self.excluded["div:" + element.get("type", "")] += 1
            return
        if name in SKIP_BLOCK:
            self.excluded[name] += 1
            return
        if name == "milestone" and element.get("unit") == "juan":
            self.juan = element.get("n", self.juan).zfill(3)
            self.chapter_key = "juan-" + slug(self.juan)
            self.chapter = "卷" + str(int(self.juan)) if self.juan.isdigit() else "卷" + self.juan
            self.pending_chapter_anchor = False
            return
        if name == "juan":
            if element.get("fun") == "open":
                self.juan = element.get("n", self.juan).zfill(3)
                self.chapter_key = "juan-" + slug(self.juan)
                jhead = element.find("cb:jhead", NS)
                self.chapter = self.render(jhead) if jhead is not None else ""
                self.chapter = self.chapter or "卷" + self.juan
                self.pending_chapter_anchor = False
            return
        if name == "pb":
            self.page = element.get("n", "")
            return
        if name == "head":
            heading = self.render(element)
            if heading:
                self.chapter = heading
                # A heading without an ID inherits its first source paragraph ID,
                # not a hash of mutable heading text.
                if element.get(XML_ID):
                    self.chapter_key = slug(element.get(XML_ID))
                    self.pending_chapter_anchor = False
                else:
                    self.pending_chapter_anchor = True
            return
        if name in {"p", "lg", "item"}:
            value = self.render(element)
            if value:
                source_key = element.get(XML_ID)
                if not source_key:
                    self.fallback_count += 1
                    source_key = f"{self.source_id}-{self.page or self.juan}-{name}-{hashlib.sha256(value.encode()).hexdigest()[:12]}"
                if self.pending_chapter_anchor:
                    self.chapter_key = "chapter-" + slug(source_key)
                    self.pending_chapter_anchor = False
                identifier = self.chapter_key + "--" + slug(source_key)
                self.chapter_ordinals[self.chapter_key] += 1
                self.block_tags[name] += 1
                self.paragraphs.append({
                    "slug": identifier,
                    "title": f"{self.chapter} · 第{self.chapter_ordinals[self.chapter_key]}段",
                    "originalText": value,
                    "contentTc": value,
                    "audioUrl": "",
                    "sourceAnchor": element.get(XML_ID) or source_key,
                })
            return
        for child in element:
            self.walk(child)


def source_path(book: dict, args: argparse.Namespace) -> Path:
    candidates = [args.source_dir / (book["id"] + ".xml"), args.cache_dir / (book["id"] + ".xml")]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    if not args.download:
        raise FileNotFoundError(f"Missing source {book['id']}.xml")
    args.cache_dir.mkdir(parents=True, exist_ok=True)
    target = candidates[1]
    request = urllib.request.Request(book["url"], headers={"User-Agent": "Fanjin-CBETA-Catalog/1.0 (non-commercial text verification)"})
    with urllib.request.urlopen(request, timeout=args.timeout) as response:
        payload = response.read(80 * 1024 * 1024 + 1)
    if len(payload) > 80 * 1024 * 1024:
        raise ValueError("Source exceeds 80 MiB")
    if b"<TEI" not in payload[:1000]:
        raise ValueError("Response is not a CBETA TEI document")
    temporary = target.with_suffix(".xml.tmp")
    temporary.write_bytes(payload)
    temporary.replace(target)
    return target


def convert(book: dict, path: Path, args: argparse.Namespace) -> dict:
    raw = path.read_bytes()
    xml = raw.decode("utf-8-sig")
    root = ET.fromstring(xml)
    header_match = re.search(r"<teiHeader\b[^>]*>[\s\S]*?</teiHeader>", xml)
    if not header_match:
        raise ValueError("Source has no intact publication header")
    header = header_match.group(0)
    availability = text_content(root.find("t:teiHeader/t:fileDesc/t:publicationStmt/t:availability", NS))
    if "Available for non-commercial use when distributed with this header intact." not in availability:
        raise ValueError("Source publication license does not match the reviewed non-commercial redistribution terms")
    source_title = text_content(root.find("t:teiHeader/t:fileDesc/t:titleStmt/t:title", NS))
    title = re.sub(r"^.*?No\.\s*[\dA-Za-z]+\s*", "", source_title).strip()
    if not title or title == source_title:
        raise ValueError(f"Unrecognized source title: {source_title}")
    author = text_content(root.find("t:teiHeader/t:fileDesc/t:titleStmt/t:author", NS)) or "原文未署譯者"
    extent = text_content(root.find("t:teiHeader/t:fileDesc/t:extent", NS))
    edition = text_content(root.find("t:teiHeader/t:fileDesc/t:editionStmt/t:edition", NS))
    body = root.find("t:text/t:body", NS)
    if body is None:
        raise ValueError("No body in source")
    parser = Parser(root, book["id"])
    parser.walk(body)
    if parser.missing:
        raise ValueError("Unresolved glyphs: " + ", ".join(sorted(parser.missing)))
    if not parser.paragraphs:
        raise ValueError("No body paragraphs extracted")
    seen: set[str] = set()
    for paragraph in parser.paragraphs:
        if paragraph["slug"] in seen:
            raise ValueError("Duplicate stable paragraph key: " + paragraph["slug"])
        seen.add(paragraph["slug"])
        if len(paragraph["slug"]) > 100 or len(paragraph["originalText"]) > 100000:
            raise ValueError("Paragraph exceeds current validator limits")
    if len(parser.paragraphs) > args.max_passages:
        raise ValueError(f"{len(parser.paragraphs)} paragraphs exceed --max-passages {args.max_passages}; do not silently truncate")
    source_url = f"https://github.com/cbeta-git/xml-p5/blob/master/{book['path']}"
    fallback_glyphs = sum(count for key, count in parser.glyph_uses.items() if ":composition:" in key)
    normalized_glyphs = sum(count for key, count in parser.glyph_uses.items() if ":normalized form:" in key or ":normal_unicode:" in key)
    scope = "所選CBETA來源檔正文全集；依XML結構排除標作xu的附序、w附文、獨立題署與卷題；排除note中的校勘、行內音義、譯注及咒句編號，保留咒文正文與原有全角間隔。經文節點內原有的攝頌、經記及敘事保留，不含本站新增白話或生成古注。"
    data = {
        "slug": book["slug"], "title": title, "categorySlug": book.get("categorySlug", "fojing"),
        "dynasty": author.split(" ", 1)[0] if " " in author else "依原本題署", "translator": author,
        "role": "依原典逐段閱讀，保留自己的摘錄與理解。", "overlay": scope,
        "summary": f"{title}，{author}。本次依 CBETA 大正藏 {book['id']} 收錄{extent or '原檔正文'}；保留正文、偈頌及咒文，排除校勘、行內音義、譯注和咒句編號。完整原XML可供核對，不添加白話導讀或注疏。",
        "school": "佛家", "tags": ["佛家", "原典", *book.get("tags", [])],
        "edition": f"大正新脩大藏經 {book['id']}；{edition}"[:500],
        "sourceName": "中華電子佛典協會 CBETA / 大正新脩大藏經", "sourceUrl": source_url,
        "license": "CBETA A類古典佛典：CC BY-NC-SA 4.0（非商業、署名、相同方式共享）。此XML另載明非商業分發須完整保留檔頭；本資料保留全部teiHeader與來源XML。公益閱讀不代表免除署名、版本及相同方式共享要求。",
        "licenseUrl": "https://cbeta.org/copyright", "sourceHeader": header,
        "isExcerpt": False, "sourceVerified": True, "passages": parser.paragraphs,
        "sourceFile": "sources/" + book["id"] + ".xml", "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "sourceScope": scope,
    }
    if fallback_glyphs or normalized_glyphs:
        data["overlay"] += f" 缺字依原檔Unicode/通行字映射處理；{normalized_glyphs}處使用原檔通行字，{fallback_glyphs}處以〔組字式〕保留。"
    args.output_dir.mkdir(parents=True, exist_ok=True)
    output = args.output_dir / (book["slug"] + ".json")
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    args.source_dir.mkdir(parents=True, exist_ok=True)
    retained = args.source_dir / (book["id"] + ".xml")
    if path.resolve() != retained.resolve():
        shutil.copyfile(path, retained)
    return {
        "id": book["id"], "slug": book["slug"], "title": title, "candidateTitle": book["title"],
        "source": source_url, "filename": output.name, "sourceFile": str(retained.relative_to(REPO_ROOT)),
        "sha256": data["sourceSha256"], "sourceBytes": len(raw), "extent": extent,
        "passages": len(parser.paragraphs), "characters": sum(len(p["originalText"]) for p in parser.paragraphs),
        "blockTags": dict(parser.block_tags), "excludedNodes": dict(parser.excluded),
        "glyphMappings": dict(parser.glyph_uses), "compositionGlyphOccurrences": fallback_glyphs,
        "normalizedGlyphOccurrences": normalized_glyphs, "unresolvedGlyphs": [],
        "inlineReadings": dict(parser.inline_choices), "fallbackStableIds": parser.fallback_count,
        "scope": scope, "warnings": parser.warnings, "status": "converted",
    }


def main() -> int:
    arg = argparse.ArgumentParser(description=__doc__)
    arg.add_argument("--plan", type=Path, default=REPO_ROOT / "scripts/cbeta-corpus-plan.json")
    arg.add_argument("--source-dir", type=Path, default=REPO_ROOT / "data/catalog/sources")
    arg.add_argument("--cache-dir", type=Path, default=REPO_ROOT / "output/cbeta-corpus")
    arg.add_argument("--output-dir", type=Path, default=REPO_ROOT / "data/catalog")
    arg.add_argument("--report", type=Path, default=REPO_ROOT / "output/cbeta-corpus/conversion-report.json")
    arg.add_argument("--download", action="store_true")
    arg.add_argument("--only", nargs="*", help="Source IDs to process, such as T08n0235")
    arg.add_argument("--timeout", type=int, default=30)
    arg.add_argument("--max-passages", type=int, default=2000)
    args = arg.parse_args()
    plan = json.loads(args.plan.read_text(encoding="utf-8-sig"))
    selected = [book for book in plan["books"] if not args.only or book["id"] in args.only]
    if not selected:
        raise ValueError("No books selected")
    records = []
    for book in selected:
        try:
            path = source_path(book, args)
            result = convert(book, path, args)
            records.append(result)
            print(f"OK {book['id']} {result['title']} {result['passages']}段 {result['characters']}字", flush=True)
        except urllib.error.HTTPError as error:
            records.append({"id": book["id"], "status": "failed", "error": f"HTTP {error.code}"})
            print(f"FAIL {book['id']} HTTP {error.code}", flush=True)
            if error.code in {403, 429}:
                print("STOP: access/rate-limit response; no alternate route or retry.", flush=True)
                break
        except (OSError, ValueError, ET.ParseError) as error:
            records.append({"id": book["id"], "status": "failed", "error": str(error)})
            print(f"FAIL {book['id']} {error}", flush=True)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    report = {"retrievedAt": plan.get("retrievedAt"), "repository": plan["repository"], "records": records,
              "converted": sum(r["status"] == "converted" for r in records), "failed": sum(r["status"] == "failed" for r in records)}
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Report: {args.report} ({report['converted']} converted, {report['failed']} failed)")
    return 1 if report["failed"] else 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (ValueError, OSError) as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
