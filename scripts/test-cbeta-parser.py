#!/usr/bin/env python3
"""Small semantic regressions for CBETA XML extraction; no network or data writes."""
import importlib.util
import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

spec = importlib.util.spec_from_file_location("import_cbeta_corpus", Path(__file__).with_name("import-cbeta-corpus.py"))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class CbetaParserTest(unittest.TestCase):
    def test_ideographic_mantra_spacing_survives_inline_note_removal(self):
        xml = '''<TEI xmlns="http://www.tei-c.org/ns/1.0"><text><body>
          <p xml:id="p1">甲<note>音義</note>　乙<note>二</note>　丙</p>
          <lg xml:id="lg1"><l>丁<note>譯注</note>　戊</l><l>己　庚</l></lg>
          </body></text></TEI>'''
        root = ET.fromstring(xml)
        parser = module.Parser(root, "TEST")
        parser.walk(root.find("t:text/t:body", module.NS))
        self.assertEqual([p["originalText"] for p in parser.paragraphs], ["甲　乙　丙", "丁　戊\n己　庚"])

    def test_volume_heading_excludes_inline_note_and_preserves_source_key(self):
        xml = '''<TEI xmlns="http://www.tei-c.org/ns/1.0" xmlns:cb="http://www.cbeta.org/ns/1.0">
          <text><body><cb:juan n="001" fun="open"><cb:jhead>首楞嚴經卷第一<note>一名中印度那蘭陀大道場經</note></cb:jhead></cb:juan>
          <cb:div type="jing"><p xml:id="pT19p0106a0101">如是我聞。</p></cb:div></body></text></TEI>'''
        root = ET.fromstring(xml)
        parser = module.Parser(root, "T19n0945")
        parser.walk(root.find("t:text/t:body", module.NS))
        self.assertEqual(parser.paragraphs[0]["title"], "首楞嚴經卷第一 · 第1段")
        self.assertEqual(parser.paragraphs[0]["slug"], "juan-001--pt19p0106a0101")
        self.assertEqual(parser.paragraphs[0]["originalText"], "如是我聞。")
        self.assertEqual(parser.excluded["note"], 1)

    def test_authoritative_reading_and_verse_lines_are_not_duplicated(self):
        xml = '''<TEI xmlns="http://www.tei-c.org/ns/1.0" xmlns:cb="http://www.cbeta.org/ns/1.0">
          <text><body><cb:div type="xu"><p>附序</p></cb:div><cb:div type="jing">
          <p xml:id="p1">甲<note>注釋</note><app><lem>正</lem><rdg>異</rdg></app><choice><sic>誤</sic><corr>訂</corr></choice>乙</p>
          <lg xml:id="lg1"><l>第一句</l><l>第二句</l></lg></cb:div><cb:div type="w"><p>附文</p></cb:div></body></text></TEI>'''
        root = ET.fromstring(xml)
        parser = module.Parser(root, "TEST")
        parser.walk(root.find("t:text/t:body", module.NS))
        self.assertEqual([p["originalText"] for p in parser.paragraphs], ["甲正訂乙", "第一句\n第二句"])


if __name__ == "__main__":
    unittest.main()
