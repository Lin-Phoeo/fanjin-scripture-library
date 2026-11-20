# CBETA 佛典扩充记录 · 2026-11-20

本轮从 CBETA 官方公开 XML 仓库取得并转换 **36 部所选大正藏原文文件**，共 **35,642 段、3,286,317 个 Unicode 码点**，保留原始 XML 34,787,389 字节。这里的“全集”仅指每个所选来源文件的正文完整范围，**不是全藏、不是全部佛经，也不表示各历史版本已齐备**。现有心经 slug 和段落键未修改。

## 来源与授权核对

- 原文仓库：[cbeta-git/xml-p5](https://github.com/cbeta-git/xml-p5)，GitHub当前可重定向到CBETA官方组织。每部精确路径、SHA-256见下表及 `data/catalog/buddhist-coverage.json`。
- [CBETA 官方版权宣告](https://cbeta.org/copyright)，本次已保存完整网页正文于 `data/catalog/licenses/cbeta-copyright-2026-11-20.txt`。官方说明其基金会接续旧协会权利；大正藏1–85册属于A类，核心授权为 **CC BY-NC-SA 4.0**；再传播、节录及再加工应不改变实质内容，并附本说明和版本信息。
- XML自身的出版声明另写明：`Available for non-commercial use when distributed with this header intact.`；每部JSON内保留未经改写的完整teiHeader，原XML也随仓库保留。
- 本轮仅选大正古典，未纳入官方B类例外的印顺、吕澂、太虚、演培现代著作集。
- 网站发布时必须把上述官方版权正文、各书header和原始XML路径同时提供，不能只保存一个许可证名称。根任务负责build复制/manifest集成，本脚本不发布网站。

## 可重跑流程

```powershell
& "<Python 3 executable>" -X utf8 scripts/import-cbeta-corpus.py --max-passages 50000
```

脚本只用Python标准库。默认复用 `data/catalog/sources/<id>.xml` 或 `output/cbeta-corpus/<id>.xml`，缺文件报告失败；显式加 `--download` 才下载。单请求默认30秒，遇403/429立即停止后续下载，不改通道规避。`--only T08n0235 T12n0366`可限定文件。输出每部JSON及 `output/cbeta-corpus/conversion-report.json`，不会修改发布manifest。

本机Windows的py启动器指向不可执行的Store安装，本轮使用Codex bundled Python全路径执行，未更改系统Python。根代理下载36部后，脚本可离线完整重跑。

## 正文与稳定键处理

1. 使用ElementTree与TEI/CBETA命名空间。只处理text/body，排除back校勘区；按结构排除`cb:div type=xu`附序和`type=w`附文，以及独立byline、mulu、jhead、卷题。
2. 保留body内p、lg、item；偈颂按l换行。源正文节点内的摄颂、经记和叙事保留，例如《四十二章经》开头汉明帝梦佛叙事属于该底本jing节点，《中阿含》经末字数/摄颂也随底本保留，不伪装删除后的“纯佛说”。
3. note/rdg不混入正文；note包括校勘、行内音义、译注和咒句编号（例如楞严咒的行内注），不是只有校勘。咒文正文及全角间隔保留；app只选lem；choice优先corr、reg，未提供时才回到orig、sic，绝不把异文叠写两次。
4. g缺字优先使用原charDecl的Unicode，其次原有通行字映射；仍无Unicode的以`〔组字式〕`可见保留。无法解析的缺字让该部转换失败，不静默删除。
5. 每段取源xml:id，章键取原heading id或首段id；无标题时按卷分组。36部本轮没有使用内容hash后备段键（fallback=0）。修改段落正文不会改源键。
6. 仅去物理排版换行/ASCII排版空白；原文标点和全角空白保留，不自动添现代标点、白话或“古注”。标题采用XML实际titleStmt，候选人工清单不能覆盖真实题名。

## 本轮书目

| 藏经编号 | 来源实际题名 | 文件 | 卷数 | 段数 | 字符数 | 通行字映射 | 组字式 |
|---|---|---|---|---:|---:|---:|---:|
| [T08n0235](https://github.com/cbeta-git/xml-p5/blob/master/T/T08/T08n0235.xml) | 金剛般若波羅蜜經 | diamond-sutra.json | 1卷 | 126 | 6459 | 0 | 0 |
| [T12n0366](https://github.com/cbeta-git/xml-p5/blob/master/T/T12/T12n0366.xml) | 佛說阿彌陀經 | amitabha-sutra.json | 1卷 | 20 | 2222 | 0 | 0 |
| [T12n0360](https://github.com/cbeta-git/xml-p5/blob/master/T/T12/T12n0360.xml) | 佛說無量壽經 | infinite-life-sutra.json | 2卷 | 190 | 21044 | 1 | 0 |
| [T12n0365](https://github.com/cbeta-git/xml-p5/blob/master/T/T12/T12n0365.xml) | 佛說觀無量壽佛經 | contemplation-sutra.json | 1卷 | 46 | 8922 | 4 | 0 |
| [T14n0450](https://github.com/cbeta-git/xml-p5/blob/master/T/T14/T14n0450.xml) | 藥師琉璃光如來本願功德經 | medicine-buddha-sutra.json | 1卷 | 38 | 5985 | 0 | 0 |
| [T13n0412](https://github.com/cbeta-git/xml-p5/blob/master/T/T13/T13n0412.xml) | 地藏菩薩本願經 | ksitigarbha-sutra.json | 2卷 | 150 | 20837 | 0 | 0 |
| [T12n0389](https://github.com/cbeta-git/xml-p5/blob/master/T/T12/T12n0389.xml) | 佛垂般涅槃略說教誡經 | buddha-last-teaching.json | 1卷 | 21 | 2753 | 0 | 0 |
| [T17n0784](https://github.com/cbeta-git/xml-p5/blob/master/T/T17/T17n0784.xml) | 四十二章經 | forty-two-chapters.json | 1卷 | 51 | 3153 | 0 | 0 |
| [T17n0779](https://github.com/cbeta-git/xml-p5/blob/master/T/T17/T17n0779.xml) | 佛說八大人覺經 | eight-realizations.json | 1卷 | 11 | 462 | 0 | 0 |
| [T15n0600](https://github.com/cbeta-git/xml-p5/blob/master/T/T15/T15n0600.xml) | 十善業道經 | ten-virtuous-actions.json | 1卷 | 19 | 2925 | 0 | 0 |
| [T17n0842](https://github.com/cbeta-git/xml-p5/blob/master/T/T17/T17n0842.xml) | 大方廣圓覺修多羅了義經 | perfect-enlightenment-sutra.json | 1卷 | 123 | 14001 | 0 | 0 |
| [T14n0475](https://github.com/cbeta-git/xml-p5/blob/master/T/T14/T14n0475.xml) | 維摩詰所說經 | vimalakirti-sutra.json | 3卷 | 330 | 33453 | 0 | 0 |
| [T09n0262](https://github.com/cbeta-git/xml-p5/blob/master/T/T09/T09n0262.xml) | 妙法蓮華經 | lotus-sutra.json | 7卷 | 504 | 89409 | 0 | 0 |
| [T16n0670](https://github.com/cbeta-git/xml-p5/blob/master/T/T16/T16n0670.xml) | 楞伽阿跋多羅寶經 | lankavatara-sutra.json | 4卷 | 377 | 53514 | 3 | 0 |
| [T16n0663](https://github.com/cbeta-git/xml-p5/blob/master/T/T16/T16n0663.xml) | 金光明經 | golden-light-sutra.json | 4卷 | 135 | 35616 | 1 | 0 |
| [T16n0665](https://github.com/cbeta-git/xml-p5/blob/master/T/T16/T16n0665.xml) | 金光明最勝王經 | golden-light-supreme-sutra.json | 10卷 | 432 | 78010 | 0 | 1 |
| [T19n0945](https://github.com/cbeta-git/xml-p5/blob/master/T/T19/T19n0945.xml) | 大佛頂如來密因修證了義諸菩薩萬行首楞嚴經 | surangama-sutra.json | 10卷 | 504 | 72609 | 1 | 3 |
| [T09n0277](https://github.com/cbeta-git/xml-p5/blob/master/T/T09/T09n0277.xml) | 佛說觀普賢菩薩行法經 | samantabhadra-contemplation.json | 1卷 | 72 | 8074 | 0 | 0 |
| [T09n0276](https://github.com/cbeta-git/xml-p5/blob/master/T/T09/T09n0276.xml) | 無量義經 | innumerable-meanings-sutra.json | 1卷 | 42 | 9032 | 0 | 0 |
| [T16n0685](https://github.com/cbeta-git/xml-p5/blob/master/T/T16/T16n0685.xml) | 佛說盂蘭盆經 | filial-piety-ullambana.json | 1卷 | 9 | 939 | 0 | 0 |
| [T17n0780](https://github.com/cbeta-git/xml-p5/blob/master/T/T17/T17n0780.xml) | 佛說十力經 | ten-powers-sutra.json | 1卷 | 13 | 1535 | 0 | 0 |
| [T01n0001](https://github.com/cbeta-git/xml-p5/blob/master/T/T01/T01n0001.xml) | 長阿含經 | long-agama.json | 22卷 | 2221 | 246120 | 18 | 18 |
| [T01n0026](https://github.com/cbeta-git/xml-p5/blob/master/T/T01/T01n0026.xml) | 中阿含經 | middle-agama.json | 60卷 | 6216 | 641135 | 124 | 11 |
| [T02n0099](https://github.com/cbeta-git/xml-p5/blob/master/T/T02/T02n0099.xml) | 雜阿含經 | mixed-agama.json | 50卷 | 12070 | 588891 | 37 | 4 |
| [T02n0125](https://github.com/cbeta-git/xml-p5/blob/master/T/T02/T02n0125.xml) | 增壹阿含經 | increased-agama.json | 51卷 | 7144 | 452189 | 4 | 7 |
| [T17n0762](https://github.com/cbeta-git/xml-p5/blob/master/T/T17/T17n0762.xml) | 佛說決定義經 | definitive-meaning-sutra.json | 1卷 | 88 | 5554 | 0 | 0 |
| [T17n0721](https://github.com/cbeta-git/xml-p5/blob/master/T/T17/T17n0721.xml) | 正法念處經 | true-law-mindfulness.json | 70卷 | 2760 | 652467 | 14 | 6 |
| [T15n0602](https://github.com/cbeta-git/xml-p5/blob/master/T/T15/T15n0602.xml) | 佛說大安般守意經 | anapanasati-sutra.json | 2卷 | 99 | 16580 | 0 | 0 |
| [T15n0614](https://github.com/cbeta-git/xml-p5/blob/master/T/T15/T15n0614.xml) | 坐禪三昧經 | seated-meditation-sutra.json | 2卷 | 203 | 26987 | 2 | 5 |
| [T17n0725](https://github.com/cbeta-git/xml-p5/blob/master/T/T17/T17n0725.xml) | 佛說六道伽陀經 | six-realms-verses.json | 1卷 | 11 | 2852 | 1 | 0 |
| [T16n0657](https://github.com/cbeta-git/xml-p5/blob/master/T/T16/T16n0657.xml) | 佛說華手經 | avatamsaka-manifestation-sutra.json | 10卷 | 1285 | 127070 | 0 | 1 |
| [T16n0666](https://github.com/cbeta-git/xml-p5/blob/master/T/T16/T16n0666.xml) | 大方等如來藏經 | tathagata-garbha-sutra.json | 1卷 | 42 | 5128 | 0 | 0 |
| [T14n0454](https://github.com/cbeta-git/xml-p5/blob/master/T/T14/T14n0454.xml) | 佛說彌勒下生成佛經 | maitreya-descent-sutra.json | 1卷 | 17 | 3627 | 0 | 0 |
| [T14n0452](https://github.com/cbeta-git/xml-p5/blob/master/T/T14/T14n0452.xml) | 佛說觀彌勒菩薩上生兜率天經 | maitreya-ascent-sutra.json | 1卷 | 28 | 4036 | 0 | 0 |
| [T14n0426](https://github.com/cbeta-git/xml-p5/blob/master/T/T14/T14n0426.xml) | 佛說千佛因緣經 | thousand-buddhas-causality.json | 1卷 | 156 | 10195 | 0 | 0 |
| [T16n0681](https://github.com/cbeta-git/xml-p5/blob/master/T/T16/T16n0681.xml) | 大乘密嚴經 | ghanavyuha-sutra.json | 3卷 | 89 | 32532 | 0 | 0 |

## 源文件校验摘要

| 文件 | SHA-256 |
|---|---|
| data\catalog\sources\T08n0235.xml | `75377c5365a827cba36da7fbc8d4d79909e1a7bc1889367a5090dd6bbdcfdcdd` |
| data\catalog\sources\T12n0366.xml | `8aa85d696e60f07dcf6e4304130e2c6dae9aadb51a78a46aa3f7f639bb4f744f` |
| data\catalog\sources\T12n0360.xml | `02fbf43cbd8d8e168ab7c620a26d399c3d46cbad09c947d7c26120aa5e9f7111` |
| data\catalog\sources\T12n0365.xml | `4ddf41ba5f835f20657a9034df34db1da4d4aeede4800c5767e16e61dec0a69c` |
| data\catalog\sources\T14n0450.xml | `a4811c0496f255ecc3cb4d81334e691da3d245d25c575ea9c150c5add523a393` |
| data\catalog\sources\T13n0412.xml | `f59e7cccb74af4a0947307b430ce80b8d27353b9463abc9e3065aa5b8da772d4` |
| data\catalog\sources\T12n0389.xml | `e9e190049d61b0a64f3a710a9884300dd24a500e7804d50aca2311781385e5b4` |
| data\catalog\sources\T17n0784.xml | `cf63f7387a39703e41ec870aeee327e72bec1825b113e6e1503d821b0f11b439` |
| data\catalog\sources\T17n0779.xml | `7fb56533b7c39a703f3b3c8716a36264486008c677efc6abee7e0427617cba1e` |
| data\catalog\sources\T15n0600.xml | `7de3c93f50a27a071fda62628d68f0bedd33408d150b28b6bc430c47d6b58036` |
| data\catalog\sources\T17n0842.xml | `afc1b6d4317c2f650afbd1f24fc6fa20d38d45f757e2afb48594def2b1086e9a` |
| data\catalog\sources\T14n0475.xml | `cad2c015853fb6a44943ff4b8b17f868f1c7405e23aa247deb98398f62bdc0a7` |
| data\catalog\sources\T09n0262.xml | `0e07bd5e55f7b3fed9bce6ed50ddc721fb7f1e94d1c87cfc84e55709d979f560` |
| data\catalog\sources\T16n0670.xml | `c62e411be1887bc616270146e3ae2888b3a4aa4f1f43482ad23def07c71f0b3a` |
| data\catalog\sources\T16n0663.xml | `9ee1cd1e53c3288a5aa01e4fb5c7381f92027e9e4e29fdcf1300cc81593e6ffd` |
| data\catalog\sources\T16n0665.xml | `48762dc6c77ebec8879159ed2812a2fc39a236eeec9ab3c334e2bbbcc6ce1dfd` |
| data\catalog\sources\T19n0945.xml | `731ecbce5e0200e25d38dd96117203f27e380220a027cde879cf2576db4e7b8a` |
| data\catalog\sources\T09n0277.xml | `92ec34566d61121e08e0b743bf3b5ed7837c7e01cdfb76fe2d74537abe147906` |
| data\catalog\sources\T09n0276.xml | `39566fc19f5d702d56365c615bbe729d276f6baf968fedb4f0c6c1e2c585e503` |
| data\catalog\sources\T16n0685.xml | `028187c41ffd0ab1a5b3a3c9a6fc98d4b4712a21ed90fd1b2f4efe0c37cd098d` |
| data\catalog\sources\T17n0780.xml | `b2403cea554df854e5e3863087567a146ce53f2f6ce5b53f516ad69e7c82e7c3` |
| data\catalog\sources\T01n0001.xml | `c785f3b5fbb0eeae0a1a02d8ce824c64c5745a2dba8cb49a85445a1bad799529` |
| data\catalog\sources\T01n0026.xml | `99403de985bdb2cda69b5733e4c903df47664426fec3dc9add0ae6394da60f5c` |
| data\catalog\sources\T02n0099.xml | `f71ac529fe0c49ea1c28794cf2f4571c69da17575c02b1780d5f4f79495f4814` |
| data\catalog\sources\T02n0125.xml | `a23b95d7dd8125f349f091e54b0805df132eb3e94767c42ff54c0bc1ad02eb0d` |
| data\catalog\sources\T17n0762.xml | `9c73ccc51141a3041ae2b482d858c5b91dfc709fdf235349d243a0a7a29919ff` |
| data\catalog\sources\T17n0721.xml | `240b5d6803f8944a6dce3fb9b804abfce2096463be0613d7a24d80a4eb00d78c` |
| data\catalog\sources\T15n0602.xml | `9d28ef0ed59a684f8ca4e5a3ab3b21d54181b13c2651d2d222d500b17277cc60` |
| data\catalog\sources\T15n0614.xml | `71e155e69cc07f1ec7a14824b502cdebe774930bfacba611958052eb1c393f8a` |
| data\catalog\sources\T17n0725.xml | `6ebf69c8af63d18f3f918890b881f4b4c9a94b8c0807b6e29e1e1a69d838a51b` |
| data\catalog\sources\T16n0657.xml | `95561e687d222c327445ccf380598aea6715841a8f9f7d2d12e6e4880e856333` |
| data\catalog\sources\T16n0666.xml | `1d3f6f9ed9a2a7266c9d0d195c56c2372c44159ad6ba690b1b3f08df3f4aef03` |
| data\catalog\sources\T14n0454.xml | `8d5ffb21f7c95296e77918aed1fb670968c4fc039d034b4d53327dc2f0995954` |
| data\catalog\sources\T14n0452.xml | `9b54f8ec8eaf1b54bc6f1b2b9117a2d5bd4745ccb8f24bcf6c5b0acf2ffa0ce2` |
| data\catalog\sources\T14n0426.xml | `24d1763a5d3fe85d4c10bed260df522e30152dca16de0e94d0fadd41869cbeff` |
| data\catalog\sources\T16n0681.xml | `16a9ec2dbcc19ff11916fab02124612d768ef23adf02e8686f893c428849664e` |

## 核验结果与限制

- 36部通过当前 `validateScripture`；最大12,070段（杂阿含），需段数上限50,000；完整header最大41,814字符，最大原文段不足4,000字符。
- 36部原始XML SHA-256、JSON完整header逐字包含关系、稳定键唯一性、未解析缺字标记缺失已检查通过。
- 解析器独立样例检查通过：序/附文/注排除、lem/corr选择、Unicode/通行字/组字式保留、缺字失败、偈颂换行。
- 全部书目首尾抽样核对；金刚经以“如是我闻”开始，以大众“信受奉行”结束；阿弥陀经排除了w内拔业障等附文，避免把附咒混称经文正文；法华后序、金光明附传等均按XML结构排除。
- 最初候选有6处编号与书名误配，已经采用XML真实题名修正为十力经、决定义经、六道伽陀经、如来藏经、千佛因缘经、密严经；错误命名的暂存JSON已删除。盂兰盆经卷册路径从T17修正为T16。
- 部分篇目仍包含底本异体字、〔组字式〕以及历史摄颂；不能声称逐字学术校勘完成。来源核验与程序一致性不等于完整人工审定。
- 简体展示由根任务的OpenCC派生方案处理，源繁体不改；派生简体应明确标注自动转换而非人工校订，不声称所有多音多义字映射无误。
- 全藏目录尚未登记为全量库存。本轮只提供36部覆盖清单，后续应继续分批获取、校验并扩展，不伪造全藏覆盖率。

## 后续解析回归修复

- 卷题改用同一render规则过滤jhead内note，避免“卷第一”后紧接别名注而误成“卷第十一名…”；36部35,642段对比仅573个title修正，段落slug/sourceAnchor/原文不变。
- clean_text与render仅剥离ASCII排版空白，不再调用会吞U+3000的无参strip。重跑恢复44段中的666个原有全角间隔；逐字比较确认除此之外原文、contentTc无变更，所有title/slug/sourceAnchor不变。
- 每部scope、overlay与summary均明确排除校勘、行内音义、译注和咒句编号，保留咒文正文；完整源XML供读者核对被排除的注释。
- scripts/test-cbeta-parser.py三项回归通过，包含“甲<note>音義</note>　乙”必须输出“甲　乙”。源XML SHA256与完整header再次核验通过。
