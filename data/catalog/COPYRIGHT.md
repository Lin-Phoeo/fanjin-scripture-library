# 梵烬首批古籍来源与许可

核验日期：2026-11-20。本文随数据发行保留。原始文字来自下列实际读取的开放来源，未使用模型续写或补写古文。

## chinese-poetry

《大学》《中庸》《论语》的电子数据来自 [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry)。原文作者处于古代；本次电子数据使用上游明确发布的 MIT 许可，并完整保留其声明。上游 README 说明“数据来源于互联网”，未指明这些作品的具体纸本，因此本站不把它们声称为某一精校纸本。

```text
The MIT License (MIT)

Copyright (c) 2016 JackeyGao

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

## Kanseki Repository

《太上老君说常清静经》正文和《道德经·前32章节选》取自 [漢籍リポジトリ](https://www.kanripo.org/) 的公开仓库。官网页脚实读：

> (c) Kanseki Repository. All content created by us is licensed under a CC BY SA license.

该链接实际指向 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。本站仅删除文件页码、Org 元数据；清静经另从明显缩进的注释区分出正文。保留原字与标点、不添加译文或古注；以上格式整理后的文本沿用 CC BY-SA 4.0。上游许可页原始响应留在 sources/kanripo-license-page.txt。

## CBETA 心经

《般若波罗蜜多心经》取自 CBETA 公布的 [T08n0251.xml](https://github.com/cbeta-git/xml-p5/blob/master/T/T08/T08n0251.xml)。仅提取 type="jing" 中的七个 p 节点，移除排版行号与校勘锚点；未收附序、校勘记，未替换底本文字。XML明确允许：

> Available for non-commercial use when distributed with this header intact.

本网站为公益非商业使用，随数据保留完整 XML（sources/heart-sutra-T08n0251.xml）和以下未改动的 teiHeader。公开发布必须同时让读者访问本声明及原始头信息；若改为商业用途，须另行核验授权。

```xml
<teiHeader><fileDesc>
<titleStmt>
<title>Taisho Tripitaka, Electronic version, No. 0251 般若波羅蜜多心經</title>
<author>唐 玄奘譯</author>
<respStmt>
<resp>Electronic Version by</resp><name>CBETA</name></respStmt></titleStmt>
<editionStmt><edition>$Revision: 1.14 $<date>$Date: 2012/08/27 03:14:21 $</date>新式標點版</edition>
		<respStmt xml:id="resp1"><resp>corrections</resp><name>Taisho</name></respStmt>
		<respStmt xml:id="resp2"><resp>corrections</resp><name>CBETA</name></respStmt></editionStmt>
<extent>1卷</extent>
<publicationStmt><distributor><name>中華電子佛典協會 (CBETA)</name>
<address><addrLine>service@cbeta.org</addrLine></address>
</distributor>
<availability><p>Available for non-commercial use when distributed with this header intact.</p></availability>
<date>$Date: 2012/08/27 03:14:21 $</date></publicationStmt>
<sourceDesc><bibl>Taisho Tripitaka Vol. 08, No. 251</bibl><listWit>
		<witness xml:id="wit1">【大】</witness>
		<witness xml:id="wit2">【宋】</witness>
		<witness xml:id="wit3">【元】</witness>
		<witness xml:id="wit4">【明】</witness>
	</listWit>
	</sourceDesc></fileDesc>
<encodingDesc><projectDesc>
<p xml:lang="en" cb:type="ly">Text as provided by Mr. Zhuang Derming, CBETA OCR Group, Punctuated text as provided by Maha Studio, Others</p>
<p xml:lang="zh" cb:type="ly">莊德明大德提供，CBETA 自行掃瞄辨識，摩訶工作室提供新式標點，其他</p>
</projectDesc>
</encodingDesc>
<profileDesc>
		<langUsage>
			<language ident="en">English</language>
			<language ident="zh">Chinese</language>
		</langUsage>
	</profileDesc>
	<revisionDesc>
		<change when="2013-05-20">
			<name>CW</name><name>Ray Chou 周邦信</name>P4 to P5 conversion by p4top5a.py, intended for publication
		</change>
<change when="1999-07-21T18:35:54">CW (ed.) converted to XML with CBXML.BAT (99/6/30)</change>
<!--
$Log: T08n0251.xml,v $
Revision 1.14  2012/08/27 03:14:21  maha
修訂新標小圓點及著重號

Revision 1.13  2009/04/23 07:57:09  amtbgrace
modified: 檔頭編碼由 big5 改為 cp950。

Revision 1.12  2006/04/12 21:54:27  saywhat
lem 加 wit 屬性，p, lg, item 第二次加 id 屬性

Revision 1.10  2005/12/26 03:03:15  saywhat
修訂檔頭資料提供者，「其它」放在最後

Revision 1.9  2005/07/19 09:32:02  saywhat
新式標點版

Revision 1.8  2004/11/14 03:17:04  maha
將八個M碼(M024261 M040426 M034294 M005505 M010528 M010527 M026945 M006710) 取代為 Big5 系統字(碁 銹 裏 墻 恒 恒 粧 嫺)

Revision 1.7  2004/10/11 10:52:38  saywhat
段落前加入圈點

Revision 1.6  2004/05/19 09:11:57  saywhat
added juan & jhead

Revision 1.5  2004/04/20 08:37:21  maha
「版本日期」標記修訂

Revision 1.4  2004/02/27 05:56:56  ray
add cvs log

-->
 </revisionDesc>
</teiHeader>
```

