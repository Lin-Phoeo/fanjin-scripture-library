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



## 2026-11-20 扩刊与简繁展示说明

本轮经藏共67个版本，含37个佛教版本、27个道家/道教版本与3个儒家文本。新增36部佛典按CBETA现行A类版权说明及各原XML头信息发布；25个道教新增版本按各书Kanripo底本与CC BY-SA4.0信息发布。完整书目见 catalog-manifest.json；这不是全佛藏或全道藏覆盖声明。

公开网页上的简体与繁体栏使用OpenCC生成字形转换版本，原有底本字段优先。转换仅方便阅读，不称人工校勘本；底本原文、标点、缺字说明和完整出版头另保留，不因显示语种覆盖用户摘录快照或心得。此转换版保留相应来源的相同许可，CBETA文本仍限非商业使用。

佛典完整原始XML与每书出版声明在书籍“版本与来源”入口提供。现行CBETA版权说明原文为 content-sources/cbeta-copyright.txt。

道教含注本明确标在书名、版本与收录范围，原有注释不是本站生成解读；第三方CHANT本未核许可，未纳入。历史养生、方术内容仅作古籍文献阅读，不代表本站验证其效果或作为现代医学建议。

### CBETA现行版权说明（原文快照）

```text
版權宣告 - CBETA 電子佛典基金會
跳至主要內容
財團法人佛教電子佛典基金會
認識 CBETA
簡介
宗旨
沿革
組織架構
相關單位
電子佛典集成
下載電子佛典集成
下載電子書
眾緣閱藏隨身碟
CBETA 版電子佛典部類目錄
經文格式說明
CBETA 待收錄清單
開放資料 (Github)
文獻校訂手冊 (Google docs)
公布欄
新聞與公告
推廣專區
隱私權政策
規章制度
CBETA 歷年各項作業成果統計表
問題與支援
常見問答
討論區
CBETA 許願池
聯絡我們
護持贊助
DONATE
捐款贊助
募款說明
《演培法師全集》數位化專案
收據法雨
捐款大德徵信名錄
捐款大德芳名錄
參與新式標點專案
「捐款者不同意公開聲明書」說明
相關連結
CBETA 官網（舊版 ~2025.06.30）
CBETA Online
CBETA Online (Mobile)
修訂歷史一覽
校訂考證資料庫
漢文字詞資訊網
佛教藏經目錄數位資料庫
漢文大藏經（舊版）
版權宣告
DONATE
繁體中文
English
(
英語
)
搜尋關鍵字:
搜尋
搜尋
財團法人佛教電子佛典基金會
認識 CBETA
簡介
宗旨
沿革
組織架構
相關單位
電子佛典集成
下載電子佛典集成
下載電子書
眾緣閱藏隨身碟
CBETA 版電子佛典部類目錄
經文格式說明
CBETA 待收錄清單
開放資料 (Github)
文獻校訂手冊 (Google docs)
公布欄
新聞與公告
推廣專區
隱私權政策
規章制度
CBETA 歷年各項作業成果統計表
問題與支援
常見問答
討論區
CBETA 許願池
聯絡我們
護持贊助
DONATE
捐款贊助
募款說明
《演培法師全集》數位化專案
收據法雨
捐款大德徵信名錄
捐款大德芳名錄
參與新式標點專案
「捐款者不同意公開聲明書」說明
相關連結
CBETA 官網（舊版 ~2025.06.30）
CBETA Online
CBETA Online (Mobile)
修訂歷史一覽
校訂考證資料庫
漢文字詞資訊網
佛教藏經目錄數位資料庫
漢文大藏經（舊版）
版權宣告
DONATE
繁體中文
English
(
英語
)
版權宣告
「財團法人佛教電子佛典基金會」（Comprehensive Buddhist Electronic Text Archive
Foundation，簡稱 CBETA Foundation 或 CBETA 基金會），自 2023 年 8 月 7 日起接續「
中華電子佛典協會」（Chinese Buddhist Electronic Text Association，簡稱 CBETA）之所有業務與文獻維護，並完整承接其相關權利與數位成果。
一、 CBETA 電子佛典資料庫（以下簡稱本資料庫）使用說明
非營利使用
：本資料庫之使用限定於個人或團體非營利性用途。
再傳播規範
：將本資料庫以網路、光碟或其它媒體再傳播、節錄引用及再加工發行時，以不改變實質內容為原則，並需於成品附上本說明及版本資訊，以利使用者查詢相關修訂資訊。
錯誤回報
：若發現本資料庫中任何錯誤之處，請與本會聯絡。
免責聲明
：若因使用本資料庫所產生之任何損害，本會一概不負任何責任。
核心授權
：除下方「二、底本來源與授權分類」中特別註明不適用之文獻外，本資料庫未特別說明處皆採用「Creative Commons 姓名標示-非商業性-相同方式分享 4.0 國際授權條款」釋出。
二、 底本來源與授權分類
本資料庫之底本文獻依授權性質區分為以下兩大類。若您有超出本站 CC 授權範圍之外的利用需求（如商業利用或改作），請逕洽各著作權人或原出版單位：
類別 A：隨本站以創用 CC 條款共同開放之文獻
《大正新脩大藏經》（大藏出版株式會社 ©） 第一冊至第八十五冊
《卍新纂續藏經》（株式會社國書刊行會 ©）第一冊至第九十冊
歷代藏經補輯
《嘉興大藏經》（新文豐出版公司）第一冊至第四十冊
《房山石經》、《趙城金藏》、《永樂北藏》等等
「國家圖書館善本佛典」（國家圖書館 ©）
《漢譯南傳大藏經》（元亨寺 ©）第一冊至第七十冊
近代新編文獻
《藏外佛教文獻》（方廣錩 ©）第一輯至第十二輯
《正史佛教資料類編》（杜斗城 ©）
《北朝佛教石刻拓片百品》（中央研究院歷史語言研究所 ©）
《大藏經補編》（藍吉富 ©）第一冊至第三十六冊
《中國佛寺史志彙刊》（杜潔祥主編，「中國佛教寺廟志數位典藏」專案提供數位版本）
《中國佛寺志叢刊》（張智等編輯，「中國佛教寺廟志數位典藏」專案提供數位版本）
類別 B：不屬於
創用 CC 條款
授權之文獻
《印順法師佛學著作集》（印順文教基金會 ©）
《呂澂佛學著作集》（呂應中等 ©）
《太虛大師全書》（印順文教基金會 ©）
《演培法師全集》（演培法師全集出版委員會 ©）
本資料庫之建置與流通，承蒙上述各著作權人、出版單位、學術研究機構及相關單位之授權與支持，並蒙眾多佛教團體及志工鼎力協助，方得成就。
CBETA 基金會於此謹致上最深切的謝意。
※
底本詳細資訊請見
藏經代碼
說明
財團法人佛教電子佛典基金會
Comprehensive Buddhist Electronic Text Archive Foundation
非賣品‧非營利性使用
Priceless, not to be sold‧
No Commercial Used Allowed
Comprehensive Buddhist Electronic Text Archive Foundation (CBETA Foundation)
[email protected]
+886-2-2383-2182 (ext. 12)
8F, R812, No. 77, Yanping S. Rd., Zhongzheng Dist., Taipei City 100011, Taiwan
Email
Copyright © 2026 CBETA Foundation
```
