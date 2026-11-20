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

资料空缺就留空，不生成古文或冒充古注。检索时的简繁规范化不改变显示底本，自动转换不能等同校勘。`sourceHeader` 如有上游完整出版声明则逐字保留。

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

分类为 `banruo/zushi/fahua/dao/ru/zhuzi`；学派和分类分别记录。经典 slug 和段落 slug 发布后应保持稳定，否则用户现有书签、摘录与进度无法准确回到原处。`isExcerpt` 默认 true，只有核对全本后才能设 false。

公共许可在构建时复制到 `public/content-notices.txt`，心经原始 XML 与 OpenCC 许可另行复制。不要把私人用户备份、数据库或未经核验的材料加入公共目录。

历史数据库导入 CLI 说明仅供保留源码参考：[server/CONTENT_IMPORT.md](server/CONTENT_IMPORT.md)。
