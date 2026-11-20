# 经典内容来源登记

核验日期：2026-11-20。当前共67个版本、37,085段、3,731,710个原文字符。佛教37个、道家/道教27个、儒家3个。全部来自明确记录的原始文件，不由模型补写古文。

新增36部佛典见[佛典扩刊报告](research/2026-11-20-buddhist-catalog-expansion.md)，25个道教新增版本及老子81章见[道教扩刊报告](research/2026-11-20-daoist-catalog-expansion.md)。完整公开书目由 data/catalog/catalog-manifest.json 控制。下表保留最初6部的来源记录；其中老子已从32章节选扩至81章全本，原32章不变。

| 文件 | 收录范围 | 段落 | 来源与版本 | 许可核验 |
|---|---|---:|---|---|
| heart-sutra.json | 玄奘译心经正文全文；不含两篇附序、校勘记 | 7 | CBETA T08n0251；Revision 1.14，新式标点，2012-08-27 | XML自带非商业分发条款，要求完整保留header |
| qingjing-jing.json | 清静经正文全文；不含八洞合注和附赞 | 11 | Kanripo KR5i0008，CK-KZ《重刊道藏辑要》 | 官网页脚链接 CC BY-SA 4.0 |
| dao-de-jing-selected.json | **第一至三十二章连续节选，不是81章全文** | 32 | Kanripo KR5c0057，TLS本 | 官网页脚链接 CC BY-SA 4.0 |
| daxue.json | 上游完整《大学》原文 | 16 | chinese-poetry，纸本版本未标明 | 仓库README及LICENSE明确MIT |
| zhongyong.json | 上游完整《中庸》原文 | 39 | 同上 | 同上 |
| lunyu.json | 二十篇完整原文 | 512 | chinese-poetry简体分发文本，纸本版本未标明 | 同上 |

共617段，31,563个字符（含原文标点，按JSON文字长度统计）。没有导入人数、点赞或其他运营数据。

## 出处追踪

原始响应和版本摘要保存在 data/catalog/sources；完整许可和署名集中在 [COPYRIGHT.md](../data/catalog/COPYRIGHT.md)。本地源文件及导入文本之间应只存在以下确定性变换：

- chinese-poetry：保持字符串原样，依据原数组索引建立稳定章节/段落slug；不加注、不做繁简机器转换。
- CBETA：提取 XML 中 type="jing" 的 p 节点，去掉 lb/anchor 等标记和物理换行；保留原字。咒文沿底本为“揭帝”“般羅”“僧莎訶”，与常见流通本有异文。
- 清静经：原文件正文无缩进、注释有全角缩进；只提取“老君曰大道…”至“得悟道者常淸靜矣”的正文行，删页码/段落标记。没有把古注混入原文。此底本无标点，本站保留此事实。
- 道德经：逐章去掉以 #、**、<pb: 开头的元数据行，以及 ¶ 标记。TLS本不是王弼注本；其“恒”、括注字及第20/28章重复句均保留上游形态，不擅自校改，不冒称权威定本。

### 文件版本

- [四书五经/daxue.json](https://github.com/chinese-poetry/chinese-poetry/blob/master/%E5%9B%9B%E4%B9%A6%E4%BA%94%E7%BB%8F/daxue.json)：Git blob 14cbc1ef8fbab503703b3f6d6edf019abb8b1ff0
- [四书五经/zhongyong.json](https://github.com/chinese-poetry/chinese-poetry/blob/master/%E5%9B%9B%E4%B9%A6%E4%BA%94%E7%BB%8F/zhongyong.json)：Git blob 9ef84a1c656f313308cefcbc14dea15d694996e4
- [论语/lunyu.json](https://github.com/chinese-poetry/chinese-poetry/blob/master/%E8%AE%BA%E8%AF%AD/lunyu.json)：Git blob 5b45b298f4e42917b94a2687399fa8307b044ffc
- [T/T08/T08n0251.xml](https://github.com/cbeta-git/xml-p5/blob/master/T/T08/T08n0251.xml)：Git blob 77cf438cc4d91a626c424ff726ba4082b05d46c4
- [KR5i0008_001.txt](https://github.com/kanripo/KR5i0008/blob/master/KR5i0008_001.txt)：Git blob 35972c351e4b954e746389fd3f37fa20519a7f01

道德经逐章blob摘要见 sources/dao-de-jing-ch01-ch32-upstream.json。

## 公开发布时的许可呈现

经典介绍页保留 sourceName/sourceUrl/edition/license/licenseUrl 与 sourceHeader。当前 GitHub Pages 构建把 data/catalog/COPYRIGHT.md 发布为基础路径下的 content-notices.txt，把完整原始XML发布为 content-sources/heart-sutra-T08n0251.xml；书籍详情和页脚提供链接。只公开这两类明确选定的资料，不开放整个 data 目录。构建回归校验原始出版声明与XML完整保留。

## 导入命令

从仓库根目录执行；先预检，再按需要导入审核。manifest仅清单，不是书籍JSON，不应作为经典导入。

```powershell
$catalogFiles = @('heart-sutra.json', 'qingjing-jing.json', 'dao-de-jing-selected.json', 'daxue.json', 'zhongyong.json', 'lunyu.json')
foreach ($catalogFile in $catalogFiles) { npm run import:scripture -- (Join-Path 'data/catalog' $catalogFile) --dry-run; if ($LASTEXITCODE -ne 0) { throw "预检失败：$catalogFile" } }
foreach ($catalogFile in $catalogFiles) { npm run import:scripture -- (Join-Path 'data/catalog' $catalogFile); if ($LASTEXITCODE -ne 0) { throw "导入失败：$catalogFile" } }
```

明确允许公开发布且已完成上述许可呈现后，可在第二个循环参数加 --published。此任务只交付内容文件，未代替最终发布审核。

## 已知限制

- Wikisource三个读取请求受fake-IP拒绝，未取得可用原文；没有使用其文本，也没有替它作授权判断。
- GitHub公开API在道德经后续读取时返回速率限制；停止继续获取。仅收录已完整取得的前32章。失败的raw请求没有产生有效文件，不作为来源证据。
- 未取得可与现有金刚经32品模板逐字交叉核对的新来源，现有模板没有因此被标记为已核验。
- sourceVerified=true表示已核对实际公开来源、文本与许可声明，不表示经过人工学术校勘。三部儒家电子本底本版本仍不详，应持续对照扫描底本改进。
