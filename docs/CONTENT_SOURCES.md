# 经典内容来源登记

核对日期：2026-11-20。当前公开范围由 [catalog-manifest.json](../data/catalog/catalog-manifest.json) 决定。本次按清单实际读取各书 JSON 汇总为 **67个典籍版本、37,085段、3,731,710个原文 Unicode 码点**：佛教37个、道家/道教27个、儒家3个。这些数字是当前版本快照，后续扩刊应重新统计，不能作为永远不变的工程约束。

当前产品为 GitHub Pages 纯静态站点。公共原典由源码构建，个人数据保存在浏览器 IndexedDB；本文件不是服务器数据库导入说明。

## 当前来源范围

| 来源组 | 当前收录与范围 | 证据入口 |
| --- | --- | --- |
| CBETA 大正藏 | 原有心经及新增36个所选原典文件，共37个版本；并非整个佛藏 | [佛典覆盖登记](../data/catalog/buddhist-coverage.json)、[佛典扩刊报告](research/2026-11-20-buddhist-catalog-expansion.md) |
| Kanripo 道部 | 原有清静经、已补齐81章的老子及新增25个版本，共27项；含注本有明确标记 | [新增版本登记](../data/catalog/sources/dao-expansion/expansion-report.json)、[道教扩刊报告](research/2026-11-20-daoist-catalog-expansion.md) |
| chinese-poetry | 《大学》《中庸》《论语》三个电子文本；上游没有标明具体纸本底本 | [完整许可汇总](../data/catalog/COPYRIGHT.md)、`data/catalog/sources/*-upstream.json` |

完整来源与许可声明集中在 [COPYRIGHT.md](../data/catalog/COPYRIGHT.md)。每书 `sourceName/sourceUrl/edition/license/licenseUrl/sourceHeader` 说明具体底本和转载条件；涉及源文件摘要的记录还包括 `sourceFile/sourceSha256` 或逐文件 provenance。`sourceVerified:true` 表示实际核对来源与许可声明，不表示已经完成逐字学术校勘，也不自动证明任何其他版本可转载。

## 文本与转换边界

- **底本原文**：`originalText` 与稳定段落 slug 是阅读位置、书签和摘录关联的基础，不因界面换字形、改排版或精简说明而改写。
- **简繁显示**：构建时生成或保留 `contentSc/contentTc`，使用 `scriptVariants` 区分来源字形和机器转换。转换不等于校勘；私人心得、草稿、摘录快照和许可声明不跟随界面自动转换。
- **chinese-poetry**：原有字符串与原数组索引身份保留；新的显示字形来自构建派生字段，不回写源文本。
- **CBETA新增36版**：处理 `text/body` 中的段落、偈颂等结构，排除附序、附文、独立题署、校勘、行内音义/译注与咒句编号；缺字按原文件映射处理并登记。完整XML和未改写的 `teiHeader` 保留。具体范围及例外以每书 `sourceScope`、转换记录和[解析报告](research/2026-11-20-buddhist-catalog-expansion.md)为准，不能再用首批心经的“只取七个p节点”概括所有佛典。
- **清静经原有正文版**：从 KR5i0008 注本中依据确定的正文/注释缩进和首尾边界提取正文，未收八洞合注和附赞；底本无标点，保留此事实。
- **道德经**：KR5c0057 TLS本现已取得001–081全部源文件。保留“恒”等异文、括注字和源本重复句；不是王弼注本。已有前32个 passage 对象与文字不变，追加33–81章。
- **其他道教版本**：按已核对的原文件结构整理；含注版本在书名、标签、说明及段落标题标为“原文含注”，不能冒称纯白文。CHANT《庄子》版本仍为 `rights-pending`，未发布；当前庄子为文渊阁郭象注本。

## 既有六部的连续性

以下为最早六部在**当前版本**中的状态，便于核查旧链接与私人记录兼容性。

| 文件 | 当前收录范围 | 当前段落 | 版本依据 |
| --- | --- | ---: | --- |
| `heart-sutra.json` | 玄奘译心经正文；不含附序、校勘记 | 7 | CBETA T08n0251，完整头信息及XML保留 |
| `qingjing-jing.json` | 清静经正文；不含八洞合注与附赞 | 11 | Kanripo KR5i0008，CK-KZ《重刊道藏辑要》 |
| `dao-de-jing-selected.json` | **第一至八十一章全文**，为兼容保留旧文件名和slug | 81 | Kanripo KR5c0057 TLS；前32章原对象与文字保持 |
| `daxue.json` | 来源文件全部原文 | 16 | chinese-poetry，具体纸本未标明 |
| `zhongyong.json` | 来源文件全部原文 | 39 | 同上 |
| `lunyu.json` | 二十篇来源全文 | 512 | 同上 |

首批交付时只有6部、617段，老子仅前32章；这是**历史阶段数据**，不是当前收录范围。后来通过公开仓库完整归档取得81章。早期请求受限或来源不足的记录不等于现在仍未取得，也不能据此删掉后续有证据的补全。

## 原始版本追踪

最早一批读取所得 Git blob 摘要继续保留，便于复核：

- [daxue.json 上游](https://github.com/chinese-poetry/chinese-poetry/blob/master/%E5%9B%9B%E4%B9%A6%E4%BA%94%E7%BB%8F/daxue.json)：`14cbc1ef8fbab503703b3f6d6edf019abb8b1ff0`。
- [zhongyong.json 上游](https://github.com/chinese-poetry/chinese-poetry/blob/master/%E5%9B%9B%E4%B9%A6%E4%BA%94%E7%BB%8F/zhongyong.json)：`9ef84a1c656f313308cefcbc14dea15d694996e4`。
- [lunyu.json 上游](https://github.com/chinese-poetry/chinese-poetry/blob/master/%E8%AE%BA%E8%AF%AD/lunyu.json)：`5b45b298f4e42917b94a2687399fa8307b044ffc`。
- [心经 T08n0251.xml](https://github.com/cbeta-git/xml-p5/blob/master/T/T08/T08n0251.xml)：`77cf438cc4d91a626c424ff726ba4082b05d46c4`。
- [清静经 KR5i0008_001.txt](https://github.com/kanripo/KR5i0008/blob/master/KR5i0008_001.txt)：`35972c351e4b954e746389fd3f37fa20519a7f01`。

老子前32章原响应在 `sources/dao-de-jing-ch01-ch32-upstream.json`，81章归档与兼容性摘要在 [laozi-provenance.json](../data/catalog/sources/dao-expansion/laozi-provenance.json)。新增佛典原XML及SHA-256见佛典覆盖登记；道教各仓库文件哈希见 `sources/dao-expansion/{KR编号}/provenance.json`。

## 公开发布的许可材料

[build-catalog.mjs](../scripts/build-catalog.mjs) 控制实际公开输出：

- `data/catalog/COPYRIGHT.md` → `content-notices.txt`。
- 每书完整 `sourceHeader` → `content-sources/{slug}-publication.txt`；逐书JSON也保留原头信息，主目录只保留链接。
- 合法且明确指定的 `sourceFile` → `content-sources/{slug}-source.xml` 或 `.txt`；当前新增CBETA原XML通过此机制公开。
- 既有心经原XML继续公开为 `content-sources/heart-sutra-T08n0251.xml`，保持旧链接。
- CBETA版权文本与OpenCC许可分别公开为 `content-sources/cbeta-copyright.txt` 和 `content-sources/opencc-notices.txt`。

所有地址相对 Pages 基础路径，页面和版权入口保持可达。不能泛化为“只公开心经XML”，也不能把整个 `data/` 目录复制到网页。私人备份、SQLite、环境文件和管理员访问文件不属于公开材料。

## 当前整理与验收入口

从已经取得并核验的原始资料生成或修改 `data/catalog/*.json`，核对范围和许可后再显式加入 manifest。当前发布流程是：

```sh
npm run build:catalog
npm run test:static
npm run check:pages
```

`tests/corpus-inventory.mjs` 校验来源哈希、完整出版头、唯一段落锚点、道教含注标记及老子前32章兼容；`tests/static-catalog.mjs` 校验构建前后原文/顺序与字形派生标记。程序一致性检查不能替代人工源文本抽验或许可判断。

旧 `import:scripture`、审核发布和数据库命令只属于保留的服务端实现，参见 [历史服务端导入说明](server/CONTENT_IMPORT.md)，不是当前静态站点的内容发布入口。

## 未收录范围

已登记的CBETA大正藏2,378个XML和Kanripo KR5a–KR5i 1,660个版本仓库只是来源目录元数据。每项是否已经取得正文、核验许可、转换并加入manifest，由对应状态决定；目录数量不能宣传成已收录经典数量，当前67个版本也不等于全部佛道典籍。
