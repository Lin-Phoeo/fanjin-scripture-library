# 道家、道教典籍扩刊：来源、范围与复验

日期：2026-11-20。此轮只整理公共古籍数据、来源快照与目录，不改新版 UI、IndexedDB、应用代码或发布 manifest。

## 本轮成果

- 新增 **25 部/版本、777 段、409,771 个原文字符**（含底本注释、题署和标点；不含 JSON 元数据）。
- 现有 `dao-de-jing-selected` 保持 slug，扩充为《道德经》**81 章、6,751 字**；前32章原有 passage 对象及文字逐字保留，仅追加33–81章。该 JSON 标题改为《道德经》，`isExcerpt:false`。
- 原有《太上老君说常清静经》不修改。因此本轮整理后有27个道家/道教阅读条目（25新增 + 道德经 + 既有清静经），不是27部都无注。
- 道藏目录登记 **1,660 个 Kanripo KR5a–KR5i 公开版本仓库**。这是检索范围内的版本仓库元数据，不是1,660部独立经书，更不是“全道教文献已收录”。其中26项本轮/老子已核对收录、1项既有清静经正文、1项第三方版权待核、1,632项正文与权利待核。

## 来源与许可依据

使用 [Kanseki Repository / 漢籍リポジトリ](https://www.kanripo.org/) 的公开 GitHub 仓库。已实际读取仓库压缩包中的编号文本、版本 Readme 和题署；完整原始编号文件及 Readme 保存在 `data/catalog/sources/dao-expansion/{KR编号}/`，每书 `provenance.json` 记录源 URL、SHA-256、原始字节数、版本和整理方式。

官网声明的已有原始响应再次实际查阅于本轮：`data/catalog/sources/kanripo-license-page.txt`。页脚明确：

> (c) Kanseki Repository. All content created by us is licensed under a CC BY SA license.

该链接指向 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)。本次归属说明保留 Kanseki Repository/kanripo，标明具体版本、修改方式、许可链接，并采用相同许可。HFL 指《正统道藏》涵芬楼电子本，WYG 指《四库全书》文渊阁电子本；源文件另有 SOURCE 书目时完整写入 `sourceHeader`。

**没有将官网“我们制作的内容”扩大为一切第三方数据库授权。** 最初取得的 `KR5c0126`《庄子》在原文头中明确标记 `BASEEDITION CHANT`、`WITNESS chant`，因此没有发布该版本，目录状态为 `rights-pending`。替代发布的是 `KR5c0138` 文渊阁郭象注本，并在书名、标签、段落标题和范围说明中明确含注。

本轮新的官网请求得到403后停止；未重试验证码或更换通道规避限制。根代理从公开仓库压缩包和已取得的 GitHub repository metadata 提供源文件；没有登录用户账号、没有抓取私人资料、没有输出令牌。

## 新增书目与明确收录范围

| 本机文件 / 稳定 slug | 来源仓库与版本 | 收录范围 | 段落 |
| --- | --- | --- | ---: |
| `yuhuang-xinyin-jing` 高上玉皇心印经 | [KR5a0013](https://github.com/kanripo/KR5a0013)，HFL | 一卷正文，保留四言字组与源题记 | 1 |
| `yuhuang-taixi-jing` 高上玉皇胎息经 | [KR5a0014](https://github.com/kanripo/KR5a0014)，HFL | 仅首尾同名题记之间正文；排除源文件之后误连的谢雷经与赞诗 | 1 |
| `yushu-baojing` 九天应元雷声普化天尊玉枢宝经 | [KR5a0016](https://github.com/kanripo/KR5a0016)，HFL | 一卷经文、偈颂与咒语 | 6 |
| `xuhuang-sishijiu-jing` 太上虚皇天尊四十九章经 | [KR5a0018](https://github.com/kanripo/KR5a0018)，HFL | 源文件49章题逐一提取，49章齐全 | 49 |
| `xiaozai-huming-jing` 太上升玄消灾护命妙经 | [KR5a0019](https://github.com/kanripo/KR5a0019)，HFL | 三经合卷中的本经正文，排除卷首别经目录 | 1 |
| `changsheng-jifude-jing` 太上长生延寿集福德经 | [KR5a0021](https://github.com/kanripo/KR5a0021)，HFL | 一卷正文与原有偈颂 | 1 |
| `shengtian-dedao-jing` 元始天尊说生天得道经 | [KR5a0024](https://github.com/kanripo/KR5a0024)，HFL | 二经合卷中的本经正文，排除另一经目录 | 1 |
| `dedao-liaoshen-jing` 元始天尊说得道了身经 | [KR5a0025](https://github.com/kanripo/KR5a0025)，HFL | 一卷经文 | 2 |
| `huangdi-yinfu-jing` 黄帝阴符经 | [KR5a0031](https://github.com/kanripo/KR5a0031)，HFL | 原文件上中下三章；保留题名异字与疑讹 | 3 |
| `qingjing-shenxin-jing` 太上玄都妙本清静身心经 | [KR5a0035](https://github.com/kanripo/KR5a0035)，HFL | 一卷正文与偈颂 | 3 |
| `shouyi-zhending-jing` 太上内丹守一真定经 | [KR5c0025](https://github.com/kanripo/KR5c0025)，HFL | 一卷正文与源题署 | 1 |
| `taiqing-daoyin-jing` 太清导引养生经 | [KR5c0215](https://github.com/kanripo/KR5c0215)，HFL | 一卷底本文字，**含夹注与导引题名** | 9 |
| `taixi-baoyi-ge` 胎息抱一歌 | [KR5c0224](https://github.com/kanripo/KR5c0224)，HFL | 本篇及原序，不把同卷另书目录算入正文 | 2 |
| `fuqi-jingyi-lun` 服气精义论 | [KR5c0227](https://github.com/kanripo/KR5c0227)，HFL | 司马承祯题署一卷，**含原有说明及夹注** | 6 |
| `cunshen-lianqi-ming` 存神炼气铭 | [KR5c0231](https://github.com/kanripo/KR5c0231)，HFL | 题孙思邈传本一卷 | 2 |
| `baopu-yangsheng-lun` 抱朴子养生论 | [KR5c0239](https://github.com/kanripo/KR5c0239)，HFL | 一卷传本，**含夹注**；不是《抱朴子内篇》全书 | 1 |
| `dongling-zhenjing` 洞灵真经（庚桑子） | [KR5c0050](https://github.com/kanripo/KR5c0050)，HFL | 九篇及源小序，**原有音注保留** | 20 |
| `liezi` 列子 | [KR5c0124](https://github.com/kanripo/KR5c0124)，TLS | 天瑞、黄帝、周穆王、仲尼、汤问、力命、杨朱、说符八篇全 | 60 |
| `wenzi` 文子 | [KR5c0118](https://github.com/kanripo/KR5c0118)，WYG | 上下卷十二篇，提要单列；**少量音注保留** | 71 |
| `laojun-neiguan-jing` 太上老君内观经 | [KR5c0022](https://github.com/kanripo/KR5c0022)，HFL | 七经同卷的本经正文，不收其他六经目录 | 3 |
| `zuowang-lun` 坐忘论 | [KR5d0059](https://github.com/kanripo/KR5d0059)，HFL | 七篇及附枢翼、底本序文 | 14 |
| `dingguan-jing-zhu` 洞玄灵宝定观经注 | [KR5b0084](https://github.com/kanripo/KR5b0084)，HFL | **经文与古注连续文本**及卷末跋，未冒充纯白文 | 3 |
| `taishang-ganying-pian-zhu` 太上感应篇（李昌龄注本） | [KR5f0001](https://github.com/kanripo/KR5f0001)，HFL | **30卷注本及原序**，不是千余字纯《感应篇》 | 205 |
| `zhuangzi-guoxiang-zhu` 庄子（郭象注本） | [KR5c0138](https://github.com/kanripo/KR5c0138)，WYG | **33篇郭象注及音义夹注**；提要原序另组 | 293 |
| `wenshi-zhenjing` 无上妙道文始真经（关尹子） | [KR5c0048](https://github.com/kanripo/KR5c0048)，HFL | 三卷及原序，源本夹注/缺字保留，不据题署强断作者时代 | 19 |

原典中的养生、导引、炼气和宗教功效表述是历史文本，不是本站生成的现实操作建议。本次没有撰写导读、治疗指导或功效承诺。年代与作者有争议者，元数据明确“题署/托名/传本/待考”。

## 道德经兼容性

来源为 [KR5c0057](https://github.com/kanripo/KR5c0057) 的81个编号文件。源文件集已检查恰为001–081。解析仅去 `#` 元数据、`**` 标题标记、`<pb:...>` 和 `¶`，不修订“恒”等异文，也不删除源本重复句。

`expand_laozi()` 对原有32个 passage 的 `originalText` 与重新解析的对应原始文件逐字比较；不一致即中止，不覆盖旧文。保存时直接保留前32个完整对象，新增 `chapter-33` 至 `chapter-81`。前32个对象规范序列的 SHA-256 存在 `laozi-provenance.json`。原 URL、书签和私人摘录仍指向相同 slug。

## 整理方式与限制

1. 只读下载归档，导入脚本**没有网络访问**。每书源文件和版本 Readme 保存，哈希可复核。
2. 删除文件头元数据、页码和 `¶`，连接物理换行。对无标点古籍不自动加标点，不做繁简转换，不补缺字，`⬤/□`等源缺字保留。
3. 按源章节题、卷或页块划分稳定段落。长页块确定性分段，最多1000字；这不是创造新的古籍章节。段落标题明确来自底本范围。
4. 含注版本在书名或范围、`原文含注`标签以及每段标题中明确说明；古注仍在该底本连续文本中，没有伪装成无注“纯原文”，也未复制到独立现代导读字段。
5. 郭象注本的33篇题全部按源文件匹配计数；《列子》核验8文件8篇；四十九章经核验49章题。脚本对数量不符直接失败。
6. 《胎息经》《护命经》《生天得道经》《内观经》根据原文两次同名**不缩进题记**限定范围，避免把合卷书目或另一经典串入正文。
7. 未完成逐字校勘；源电子本的疑讹、缺字、异常异体保留并披露，不宣称“精校权威定本”。读者仍可回原仓库核对。

## 目录覆盖

完整状态表：`data/catalog/sources/dao-expansion/inventory.json`。

根代理按 KR5a–KR5i 分组取得的 GitHub repository metadata 共1660项，避免单一宽泛查询1000项限制。表中 `catalogComplete:true` 只表示**该日期、该公开KR5版本仓库检索范围的目录元数据齐备**；正文覆盖由每项 status 单独表示。

- `collected-reviewed`：26项，含25新增和81章老子。
- `existing-reviewed-body-only`：1项，既有清静经正文提取版。
- `rights-pending`：1项，CHANT《庄子》源，未发布。
- `not-collected`：1632项，尚未取得/逐本核验正文与权利，不能显示为已可读。

不将注本/不同版本合并成虚假的“独立经书总量”，不宣称道藏全本已经入站。

## 可复现命令与验证

```powershell
& 'C:/Users/Administrator/AppData/Local/Python/bin/python3.14.exe' -X utf8 scripts/import-dao-corpus.py --laozi
& 'C:/Users/Administrator/AppData/Local/Python/bin/python3.14.exe' -X utf8 scripts/import-dao-corpus.py --all
```

前提为 `output/dao-expansion/{repo}.zip` 已取得，`dao-repository-inventory.json` 已下载。脚本不更改 `catalog-manifest.json`，由总集成确认各版本名称、范围与许可后逐一加入。

已完成：25部新增JSON通过当前 `validateScripture`；无 `<pb:`、`#+PROPERTY`、`¶`或未去除的Org图片/链接标记；每部 sourceHeader/许可和元数据齐全；老子81章与前32兼容性检查通过；重新运行生成结果稳定；`git diff --check`通过。

建议总集成同步：manifest、版权汇总和来源登记中的旧“前32节选”描述；首页和搜索的数据总数由实际构建生成，不再硬编码6部/617段。当前新版UI与本机数据库不需因此更换。
