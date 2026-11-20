#!/usr/bin/env python3
"""Build source-grounded Daoist catalog JSON from previously downloaded Kanripo ZIPs.

No network access. It never changes catalog-manifest.json, application files or user data.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVES = ROOT / "output" / "dao-expansion"
CATALOG = ROOT / "data" / "catalog"
SOURCES = CATALOG / "sources" / "dao-expansion"
TODAY = "2026-11-20"

# Each entry was selected from retrieved Kanripo repository metadata and checked in its source file.
SELECTION = [
    ("KR5a0013", "yuhuang-xinyin-jing", "高上玉皇心印经", "成书年代待考", "佚名", "page", False, "一卷正文，保留原有四言分组。"),
    ("KR5a0014", "yuhuang-taixi-jing", "高上玉皇胎息经", "成书年代待考", "佚名", "taixi", False, "仅取首尾同名题记之间的胎息经正文；源文件随后混入的谢雷经及赞诗不收。"),
    ("KR5a0016", "yushu-baojing", "九天应元雷声普化天尊玉枢宝经", "成书年代待考", "佚名", "page", False, "一卷经文，含原有偈颂与咒语。"),
    ("KR5a0018", "xuhuang-sishijiu-jing", "太上虚皇天尊四十九章经", "成书年代待考", "佚名", "fortynine", False, "依源文四十九章题分章，保留底本文字。"),
    ("KR5a0019", "xiaozai-huming-jing", "太上升玄消灾护命妙经", "唐代流传", "佚名", "huming", False, "三经同卷中的本经正文，排除卷首其他经名列表。"),
    ("KR5a0021", "changsheng-jifude-jing", "太上长生延寿集福德经", "唐代流传", "佚名", "page", False, "一卷正文，保留经文中的偈颂。"),
    ("KR5a0024", "shengtian-dedao-jing", "元始天尊说生天得道经", "唐代流传", "佚名", "shengtian", False, "二经同卷中的本经正文，排除卷首其他经名列表。"),
    ("KR5a0025", "dedao-liaoshen-jing", "元始天尊说得道了身经", "成书年代待考", "佚名", "page", False, "一卷经文；按历史宗教文献保存，不作现代功效解释。"),
    ("KR5a0031", "huangdi-yinfu-jing", "黄帝阴符经", "成书年代待考", "托名黄帝", "yinfu", False, "依原文件上中下三章题分组，保留原字及疑讹。"),
    ("KR5a0035", "qingjing-shenxin-jing", "太上玄都妙本清静身心经", "唐代流传", "佚名", "page", False, "一卷正文及原有偈颂。"),
    ("KR5c0025", "shouyi-zhending-jing", "太上内丹守一真定经", "成书年代待考", "源题南岳七金宝山庆华紫光天母传", "page", False, "一卷正文，保留源本题署。"),
    ("KR5c0215", "taiqing-daoyin-jing", "太清导引养生经", "古代养生文献，成书年代待考", "佚名", "page", True, "收录一卷底本文字，含原有夹注和导引题名；作为养生史文献，不补现代操作指导。"),
    ("KR5c0224", "taixi-baoyi-ge", "胎息抱一歌", "宋以前流传，年代待考", "佚名", "baoyi", False, "收本篇及原序；不把同卷目录列出的另一书误当本篇正文。"),
    ("KR5c0227", "fuqi-jingyi-lun", "服气精义论", "唐", "司马承祯（源题天台白云子）", "page", True, "一卷底本文字，含原有说明和夹注；按历史文献原样保留，不生成修炼指导。"),
    ("KR5c0231", "cunshen-lianqi-ming", "存神炼气铭", "唐代传本", "源题孙思邈", "page", False, "一卷传本正文，保留五时七候等原文结构。"),
    ("KR5c0239", "baopu-yangsheng-lun", "抱朴子养生论", "唐代传本", "源题抱朴子", "page", True, "一卷传本文字，含原有夹注；不与《抱朴子内篇》全书等同。"),
    ("KR5c0050", "dongling-zhenjing", "洞灵真经（庚桑子）", "唐以前传本，成书问题待考", "托名庚桑楚", "dongling", True, "九篇正文及源本小序，原有音注保留，不能称无注定本。"),
    ("KR5c0124", "liezi", "列子", "战国题署、晋代传本，成书有争议", "题列御寇", "tls", False, "TLS本天瑞、黄帝、周穆王、仲尼、汤问、力命、杨朱、说符八篇全文。"),
    ("KR5c0118", "wenzi", "文子", "先秦题署，传本成书有争议", "源题辛钘", "wenzi", True, "文渊阁本上下卷十二篇，提要另作附录；源文少量音注保留，不新增注释。"),
    ("KR5c0022", "laojun-neiguan-jing", "太上老君内观经", "唐代流传", "佚名", "neiguan", False, "七经同卷中的本经正文；不收入卷首其他六经名目。"),
    ("KR5d0059", "zuowang-lun", "坐忘论", "唐", "司马承祯", "zuowang", False, "正文七篇与附枢翼，底本序文单列，原字不改。"),
    ("KR5b0084", "dingguan-jing-zhu", "洞玄灵宝定观经注", "唐代传本", "注者未署名", "page", True, "本经与古注完整同收，含卷末跋；原文栏是该注本连续文本，不冒称纯经文。"),
    ("KR5f0001", "taishang-ganying-pian-zhu", "太上感应篇（李昌龄注本）", "宋代注本", "李昌龄注", "page", True, "三十卷经文与注释、事例及原序同收，不与千余字白文等同。"),
    ("KR5c0138", "zhuangzi-guoxiang-zhu", "庄子（郭象注本）", "先秦原典、晋代注本", "庄周及后学；郭象注", "zhuangzi", True, "内篇七、外篇十五、杂篇十一，共三十三篇；文渊阁本郭象注与音义夹注同收，提要和原序单列。"),
    ("KR5c0048", "wenshi-zhenjing", "无上妙道文始真经（关尹子）", "古代传本，成书问题待考", "托名尹喜", "page", True, "依道藏底本完整收录，保留源本序跋及夹注；作者题署不作为断代定论。"),
]


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def archive_files(repo: str):
    if not re.fullmatch(r"KR\d[a-z]\d{4}", repo):
        raise ValueError(f"Invalid repository identifier: {repo}")
    archive = ARCHIVES / f"{repo}.zip"
    with zipfile.ZipFile(archive) as source:
        files = [(name.rsplit("/", 1)[-1], source.read(name)) for name in source.namelist()
                 if re.search(rf"/{repo}_\d+\.txt$", name)]
    if not files:
        raise ValueError(f"{repo}: no numbered source files")
    return archive, sorted(files)


def tls_text(text: str) -> tuple[str, str]:
    heading = ""
    lines = []
    for line in text.splitlines():
        if line.startswith("#"):
            continue
        if line.startswith("*"):
            heading = re.sub(r"^\*+\s*(?:\d+\s+)?", "", line).strip()
            continue
        line = re.sub(r"<pb:[^>]*>", "", line).replace("¶", "")
        lines.append(line.strip())
    return heading, "".join(lines)


def source_blocks(text: str) -> list[str]:
    """Strip only machine metadata/folio markers; retain every textual character in each block."""
    cleaned = "\n".join(line for line in text.splitlines() if not line.startswith("#"))
    cleaned = re.sub(r"<pb:[^>]*>", "\n\n", cleaned).replace("¶", "")
    return [re.sub(r"[ \t\r\n\u3000]+", "", block) for block in re.split(r"\n\s*\n", cleaned) if re.sub(r"\s", "", block)]


def named_boundaries(text: str, title: str) -> str:
    """Use two exact unindented source title lines to exclude adjacent compiled works."""
    lines = text.splitlines()
    markers = [i for i, line in enumerate(lines) if line.replace("¶", "").rstrip() == title]
    if len(markers) < 2:
        raise ValueError(f"Cannot verify textual boundaries for {title}")
    return "\n".join(lines[markers[0] + 1:markers[1]])


def sections_from_heading(text: str, expression: str, fallback: str, include_heading=True):
    pattern = re.compile(expression, re.MULTILINE)
    matches = list(pattern.finditer(text))
    if not matches:
        return [(fallback, text)]
    sections = []
    prefix = text[:matches[0].start()]
    if sum(len(block) for block in source_blocks(prefix)) > 25:
        sections.append((fallback + " · 卷首", prefix))
    for index, match in enumerate(matches):
        label = match.group(1).replace("¶", "").strip()
        section = text[match.start() if include_heading else match.end():matches[index + 1].start() if index + 1 < len(matches) else len(text)]
        sections.append((label, section))
    return sections


def add_passages(passages: list, label: str, text: str, chapter: int, mixed: bool):
    blocks = source_blocks(text)
    if not blocks:
        return
    merged = []
    current = ""
    for block in blocks:
        if len(current) + len(block) > 700 and current:
            merged.append(current)
            current = ""
        current += block
    if current:
        merged.append(current)
    # Long source pages are split deterministically by character, without inserting punctuation.
    chunks = [chunk[i:i + 1000] for chunk in merged for i in range(0, len(chunk), 1000)]
    for index, content in enumerate(chunks, 1):
        title = f"{label}{'（原文含注）' if mixed else ''} · 第{index}段"
        passages.append({"slug": f"ch-{chapter:02d}--p-{index:03d}", "title": title, "originalText": content, "contentTc": content, "audioUrl": ""})


def import_book(selection: tuple) -> dict:
    repo, slug, title, dynasty, author, mode, mixed, scope = selection
    archive, files = archive_files(repo)
    with zipfile.ZipFile(archive) as zipped:
        for name in zipped.namelist():
            if name.rsplit("/", 1)[-1].lower() in {"readme.org", "readme.md", "license", "license.txt"}:
                destination = SOURCES / repo / name.rsplit("/", 1)[-1]
                destination.parent.mkdir(parents=True, exist_ok=True)
                destination.write_bytes(zipped.read(name))
    evidence, passages, base_editions, origins = [], [], set(), set()
    all_text = []
    for filename, raw in files:
        text = raw.decode("utf-8")
        base_editions.update(re.findall(r"^#\+PROPERTY: BASEEDITION\s+(\S+)", text, re.MULTILINE))
        origins.update(re.findall(r"^#\+PROPERTY: SOURCE\s+(.+)", text, re.MULTILINE))
        destination = SOURCES / repo / filename
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(raw)
        evidence.append({"file": filename, "url": f"https://github.com/kanripo/{repo}/blob/master/{filename}", "sha256": sha256(raw), "bytes": len(raw)})
        all_text.append((filename, text))
    if any(value.upper() == "CHANT" for value in base_editions):
        raise ValueError(f"{repo}: CHANT third-party rights not cleared; do not publish")
    numbered_sections = []
    for filename, text in all_text:
        number = int(re.search(r"_(\d+)\.txt$", filename).group(1))
        if not source_blocks(text):
            continue
        if mode == "tls":
            label = re.search(r"^\*+\s*\d+\s+(.+)", text, re.MULTILINE)
            text = "\n".join(line for line in text.splitlines() if not line.startswith("*"))
            numbered_sections.append((label.group(1).strip() if label else f"第{number}篇", text))
        elif mode in {"taixi", "huming", "shengtian", "neiguan"}:
            exact = {"taixi": "高上玉皇胎息經", "huming": "太上昇玄消災護命妙經", "shengtian": "元始天尊說生天得道經", "neiguan": "太上老君内觀經"}[mode]
            numbered_sections.append(("正文", named_boundaries(text, exact)))
        elif mode == "baoyi":
            begin, end = text.find("胎息抱一歌(并序)"), text.find("胎息抱一歌(終)")
            if begin < 0 or end < begin:
                raise ValueError("胎息抱一歌 source boundaries missing")
            numbered_sections.append(("正文与原序", text[begin:end]))
        elif mode == "fortynine":
            numbered_sections.extend(sections_from_heading(text, r"^[　 ]{2,}([^\n¶]+章第[一二三四五六七八九十]+)¶?\s*$", "卷首"))
        elif mode == "yinfu":
            numbered_sections.extend(sections_from_heading(text, r"^[　 ]{2,}([^\n¶]+[上中下])¶?\s*$", "卷首"))
        elif mode == "dongling":
            numbered_sections.extend(sections_from_heading(text, r"^[　 ]{2,}([^\n¶]+篇第[一二三四五六七八九十]+)¶?\s*$", "原序"))
        elif mode == "wenzi":
            if number == 0:
                numbered_sections.append(("四库提要（附录）", text))
            else:
                numbered_sections.extend(sections_from_heading(text, r"^[　 ]{3}(道原|精誠|九守|符言|道徳|上徳|微明|自然|下德|上仁|上義|上禮)¶?\s*$", "卷首"))
        elif mode == "zuowang":
            if number == 0:
                numbered_sections.append(("底本序文", text))
            else:
                numbered_sections.extend(sections_from_heading(text, r"^[　 ]{2,}([^\n¶]{1,12}[一二三四五六七])¶?\s*$", "序说与附录"))
        elif mode == "zhuangzi":
            if number == 0:
                numbered_sections.append(("四库提要与郭象原序（附录）", text))
            else:
                numbered_sections.extend(sections_from_heading(text, r"^[　 ]{2,4}([^\n¶(（　]{1,20}第[一二三四五六七八九十]+)", "卷首"))
        else:
            numbered_sections.append(("正文" if len(files) == 1 else ("原序" if number == 0 else f"卷{number}"), text))
    for index, (label, text) in enumerate(numbered_sections, 1):
        add_passages(passages, label, text, index, mixed)
    if mode == "tls" and len(numbered_sections) != 8:
        raise ValueError("Liezi must contain eight chapters")
    if mode == "fortynine" and sum("章第" in label for label, _ in numbered_sections) != 49:
        raise ValueError("Forty-nine chapters were not found")
    if mode == "zhuangzi" and sum(bool(re.search(r"第[一二三四五六七八九十]+$", label)) for label, _ in numbered_sections) != 33:
        raise ValueError("Zhuangzi must contain thirty-three source chapter headings")
    if not passages or len(passages) > 2000:
        raise ValueError(f"Invalid passage count for {slug}: {len(passages)}")
    edition_names = {"HFL": "《正统道藏》涵芬楼电子本", "WYG": "《四库全书》文渊阁电子本", "tls": "TLS电子本"}
    edition = "、".join(edition_names.get(value, value) for value in sorted(base_editions))
    edition += f"；Kanripo {repo}；" + ("含原有古注或音注" if mixed else "底本正文")
    transform = "仅去除文件元数据、页码与段落标记，连接原物理行并按来源章节/页块分段；原字、疑讹、缺字及夹注符号均保留，不加现代标点、译文或解释。"
    book = {"slug": slug, "title": title, "categorySlug": "dao", "dynasty": dynasty, "translator": author,
            "role": "道家道教历史典籍阅读", "overlay": scope, "summary": scope + transform,
            "school": "道家", "tags": ["道家", "道教典籍", "原文含注" if mixed else "原文"],
            "edition": edition, "sourceName": "漢籍リポジトリ Kanseki Repository / kanripo",
            "sourceUrl": f"https://github.com/kanripo/{repo}",
            "license": "古典原作属公有领域；Kanripo官网声明其制作内容按CC BY-SA 4.0共享。本次按所列底本格式整理，保留来源、署名与修改说明，衍生文本沿用CC BY-SA 4.0。第三方CHANT版未纳入此授权判断。",
            "licenseUrl": "https://creativecommons.org/licenses/by-sa/4.0/", "isExcerpt": False, "sourceVerified": True,
            "sourceHeader": f"来源仓库：kanripo/{repo}\n底本：{edition}\n源文件SOURCE：{'；'.join(sorted(origins)) or '见原始文件元数据'}\n收录范围：{scope}\n整理方式：{transform}\n许可：CC BY-SA 4.0；https://creativecommons.org/licenses/by-sa/4.0/\n版权依据：Kanripo官网页脚“All content created by us is licensed under a CC BY SA license.”\n获取与核验日期：{TODAY}\n逐文件哈希：data/catalog/sources/dao-expansion/{repo}/provenance.json",
            "passages": passages}
    write_json(CATALOG / f"{slug}.json", book)
    write_json(SOURCES / repo / "provenance.json", {"repo": repo, "slug": slug, "retrievedAt": TODAY, "archiveSha256": sha256(archive.read_bytes()), "baseEditions": sorted(base_editions), "scope": scope, "transform": transform, "chapters": [label for label, _ in numbered_sections], "files": evidence})
    return {"repo": repo, "slug": slug, "title": title, "passages": len(passages), "sourceUnits": len(files), "chapters": len(numbered_sections), "characters": sum(len(p["originalText"]) for p in passages), "scope": scope, "containsNotes": mixed}


def import_all():
    results, pending = [], []
    for selection in SELECTION:
        if not (ARCHIVES / f"{selection[0]}.zip").exists():
            pending.append({"repo": selection[0], "title": selection[2], "status": "awaiting-source"})
            continue
        results.append(import_book(selection))
    inventory = {}
    complete_path = ARCHIVES / "dao-repository-inventory.json"
    if complete_path.exists():
        complete = json.loads(complete_path.read_text(encoding="utf-8-sig"))
        for row in complete.get("items", []):
            if re.fullmatch(r"KR5[a-i]\d{4}", row.get("id", "")):
                inventory[row["id"]] = {"repo": row["id"], "title": row["title"], "url": row["url"], "updatedAt": row.get("updatedAt"), "status": "not-collected"}
    primary_count = len(inventory)
    for path in ARCHIVES.glob("*.json"):
        try:
            metadata = json.loads(path.read_text(encoding="utf-8-sig"))
            rows = metadata.get("items", []) if isinstance(metadata, dict) else metadata
            for row in rows:
                if isinstance(row, dict) and re.fullmatch(r"KR5[a-z]\d{4}", row.get("name", "")):
                    inventory.setdefault(row["name"], {"repo": row["name"], "title": row.get("description", ""), "url": row.get("html_url", f"https://github.com/kanripo/{row['name']}"), "status": "not-collected"})
        except (ValueError, TypeError):
            continue
    for row in results:
        inventory[row["repo"]] = {**inventory.get(row["repo"], {}), **row, "status": "collected-reviewed"}
    inventory["KR5c0057"] = {**inventory.get("KR5c0057", {}), "repo": "KR5c0057", "title": "老子", "slug": "dao-de-jing-selected", "status": "collected-reviewed", "passages": 81}
    inventory["KR5i0008"] = {"repo": "KR5i0008", "title": "太上老君说常清静经", "slug": "qingjing-jing", "status": "existing-reviewed-body-only", "passages": 11}
    inventory["KR5c0126"] = {**inventory.get("KR5c0126", {}), "repo": "KR5c0126", "title": "莊子 CHANT本", "status": "rights-pending", "reason": "源文件标注BASEEDITION/WITNESS CHANT，未单独核验第三方数据库许可，未发布；已提供郭象注WYG本。"}
    write_json(SOURCES / "inventory.json", {"updatedAt": TODAY, "scope": "Kanripo public KR5a–KR5i version repositories as returned by dated repository search; not 1660 distinct works or all historical Daoist literature", "catalogComplete": primary_count == 1660, "count": len(inventory), "publicCatalogMetadataCount": primary_count, "coverageMeaning": "Directory metadata coverage only; full texts are published only for collected-reviewed entries. not-collected means content and rights still await review.", "items": [inventory[key] for key in sorted(inventory)]})
    write_json(SOURCES / "expansion-report.json", {"date": TODAY, "books": results, "pending": pending, "newBooks": len(results), "newPassages": sum(r["passages"] for r in results)})
    return {"newBooks": len(results), "newPassages": sum(r["passages"] for r in results), "inventory": len(inventory), "pending": pending}


def expand_laozi() -> dict:
    repo = "KR5c0057"
    archive, files = archive_files(repo)
    by_number = {int(re.search(r"_(\d+)\.txt$", name).group(1)): (name, raw) for name, raw in files}
    if set(by_number) != set(range(1, 82)):
        raise ValueError("Laozi archive must contain chapters 1–81 exactly")
    path = CATALOG / "dao-de-jing-selected.json"
    book = json.loads(path.read_text(encoding="utf-8"))
    original = book["passages"][:32]
    if len(original) != 32:
        raise ValueError("Existing chapter 1–32 baseline is missing")
    baseline = json.dumps(original, ensure_ascii=False, separators=(",", ":"))
    book["passages"] = list(original)
    evidence = []
    for number in range(1, 82):
        filename, raw = by_number[number]
        heading, content = tls_text(raw.decode("utf-8"))
        if not content:
            raise ValueError(f"Empty Laozi chapter {number}")
        if number <= 32:
            if original[number - 1]["slug"] != f"chapter-{number:02d}" or original[number - 1]["originalText"] != content:
                raise ValueError(f"Upstream chapter {number} differs from preserved public baseline")
        else:
            book["passages"].append({"slug": f"chapter-{number:02d}", "title": heading, "originalText": content, "contentTc": content, "audioUrl": ""})
        destination = SOURCES / repo / filename
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(raw)
        evidence.append({"file": filename, "sourceUrl": f"https://github.com/kanripo/{repo}/blob/master/{filename}", "sha256": sha256(raw), "characters": len(content)})
    assert json.dumps(book["passages"][:32], ensure_ascii=False, separators=(",", ":")) == baseline
    book.update({
        "title": "道德经", "isExcerpt": False,
        "overlay": "收录第一至八十一章全文。Kanripo TLS电子本保留‘恒’等底本异文、括注字、重复句及标点；未混入王弼注或英语译文。",
        "summary": "《老子》八十一章原文。依Kanripo KR5c0057逐章整理，仅删除文件元数据、页码与段落标记。原有前32章文字和稳定链接保持不变。",
        "edition": "Kanripo KR5c0057 老子 TLS 电子本（2016-08-10），八十一章全文；保留上游异文，非王弼注本",
        "tags": ["道家", "老子", "道德经", "原文"],
    })
    write_json(path, book)
    report = {"repo": repo, "slug": book["slug"], "scope": "chapters 1–81", "retrievedAt": TODAY, "archiveSha256": sha256(archive.read_bytes()), "preservedFirst32Sha256": sha256(baseline.encode("utf-8")), "files": evidence}
    write_json(SOURCES / "laozi-provenance.json", report)
    return {"slug": book["slug"], "passages": len(book["passages"]), "characters": sum(len(p["originalText"]) for p in book["passages"]), "preservedFirst32": True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--laozi", action="store_true")
    parser.add_argument("--all", action="store_true")
    arguments = parser.parse_args()
    if arguments.laozi:
        print(json.dumps(expand_laozi(), ensure_ascii=False))
    elif arguments.all:
        print(json.dumps(import_all(), ensure_ascii=False))
    else:
        parser.error("Select --laozi or a supported import action")


if __name__ == "__main__":
    main()
