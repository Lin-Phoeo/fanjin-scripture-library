# 静态经典整理与发布

正式内容在 `data/catalog/`，由 `catalog-manifest.json` 显式列出发布文件。新增经典不是写数据库，而是提交经过核验的 JSON，再构建和发布 GitHub Pages。

```sh
npm run build:catalog
npm run test:static
npm run build:pages
```

未登记在 manifest 的 JSON 不会公开。构建拒绝未核验来源、缺少底本/来源/许可、重复 slug、非法文件名或未知分类，避免把临时材料顺带发布。

## 三层正文

| 层次 | 字段 |
| --- | --- |
| 原文 | `originalText`，可选 `contentTc/contentSc` |
| 古注 | `classicalCommentary` 和必需的 `commentarySource` |
| 现代导读 | `modernGuide` |

资料空缺就留空，不生成古文或冒充古注。`originalText` 保持底本，构建对缺少对应字形的 `contentSc/contentTc` 生成简繁显示副本，并用 `scriptVariants` 标记 `source` 或 `converted`；机器转换不能等同校勘。私人心得、草稿和摘录快照不能随字形切换改写。`sourceHeader` 如有上游完整出版声明则逐字保留。

如果所选版本本身经注合刻且没有可靠结构可分离，必须在书名/范围、标签及段落标题明确“原文含注”，不得把混合文本宣称为纯白文。每书还应明确全文、节选、附序/附文及行内注释的纳入或排除范围；解析范围与实际源节点处理一致。来源及版本状态见 [内容来源登记](CONTENT_SOURCES.md)。

```json
{
  "slug": "new-classic",
  "title": "待整理经典",
  "categorySlug": "dao",
  "dynasty": "待核对",
  "translator": "待核对作者或译者",
  "school": "道家",
  "tags": ["原文"],
  "summary": "说明收录范围",
  "edition": "具体底本版本",
  "sourceName": "数字资料来源",
  "sourceUrl": "https://example.org/source",
  "license": "实际许可说明",
  "licenseUrl": "https://example.org/license",
  "sourceVerified": false,
  "isExcerpt": true,
  "passages": [{
    "slug": "chapter-01",
    "title": "第一章",
    "originalText": "这里替换为已经核对的原文",
    "contentTc": null,
    "contentSc": null,
    "classicalCommentary": null,
    "commentarySource": null,
    "modernGuide": null,
    "audioUrl": ""
  }]
}
```

此模板刻意保持 `sourceVerified:false`，不能直接通过发布构建。example.org 是占位链接，必须替换并人工核对。作品处于公有领域，不自动表示现代标点、译注、数字整理或录音也可随意转载。

当前分类为 `banruo/zushi/fahua/jingtu/fojing/ahan/dao/ru/zhuzi`，以 [build-catalog.mjs](../scripts/build-catalog.mjs) 的实际分类表为准；学派和分类分别记录。经典 slug 和段落 slug 发布后应保持稳定，否则用户现有书签、摘录与进度无法准确回到原处。扩充内容不得改写已有段落来复用其标识；现有老子文件名虽含 selected，已是81章全文，这是保留旧链接的兼容决定。

`isExcerpt` 默认 true，只有核对所声明范围完整后才能设 false。“某一来源文件正文完整”不等于全部附序、校勘区、各版本或全藏完整；以 `sourceScope` 和 `summary/overlay` 明确说明。

## 构建产物与来源材料

构建生成的 `public/content/index.json` 只含元数据；正文在 `content/books/{slug}.json` 按需加载。`content/search.json` 为版本2检索清单，实际检索文本在 `content/search/{slug}.json` 分片；不得为了新增内容让首页加载全部原文。

公共许可汇总复制为 `public/content-notices.txt`。每书完整出版头同时在逐书JSON和 `content-sources/{slug}-publication.txt` 保留。若需随书公开原文件，登记 `sourceFile`（相对 `data/catalog/` 的受限 `sources/...` 路径）与 `sourceSha256`，构建复制到 `content-sources/{slug}-source.xml` 或 `.txt`；现有心经原XML旧地址继续保留。CBETA版权正文与OpenCC许可也各自公开。实际发布清单以构建脚本为准，不等于整个 sources 目录自动公开。

新增内容应一并维护许可汇总、来源登记、源文件摘要和覆盖状态，再执行静态回归。`sourceVerified:true` 是人工核验记录，不是可以略过来源与授权核对的开关。不要把私人用户备份、数据库、环境变量或未经核验的材料加入公共目录。

历史数据库导入 CLI 说明仅供保留源码参考：[server/CONTENT_IMPORT.md](server/CONTENT_IMPORT.md)。
