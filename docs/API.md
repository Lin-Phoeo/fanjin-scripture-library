# 静态资料与本机操作契约

当前站点没有 HTTP 业务后端。[apiRequest](../src/lib/api.ts) 动态调用 [dispatchLocalApi](../src/lib/local-api.ts)，直接返回 JavaScript 数据或抛错。下面的 `/api/...` 是内部调用标识，不是可用 `curl` 调用的服务器端点；兼容参数 `_token` 不用于认证。旧 HTTP 服务文档见 [server/API.md](server/API.md)。

## 公共只读文件

所有文件路径相对 `import.meta.env.BASE_URL`，由 [build-catalog.mjs](../scripts/build-catalog.mjs) 生成。不要把 `/content/...` 写成域名根路径。

| 文件 | 当前内容 |
| --- | --- |
| `content/index.json` | `version:1`、生成/来源日期、分类、站点设置、公告和 `books` 元数据；不包含段落正文或完整出版头 |
| `content/books/{slug}.json` | 书籍元数据与全部 `passages`，包括稳定 slug、原文、显示字形、注疏及来源 |
| `content/search.json` | `version:2`、简繁规范化 `charMap` 与 `shards` 清单；当前构建不写单体 `items` |
| `content/search/{slug}.json` | `version:2`、该书公共 `book` 元数据及检索 `items` |
| `content/display-maps.json` | `{sc,tc}` 字符映射，用于公开界面文字和标题显示 |
| `content-notices.txt` | 所有收录内容的来源与版权说明 |
| `content-sources/` | OpenCC 许可、可分发的源文件、逐书出版声明；具体链接使用元数据 `sourceFileUrl/sourceHeaderUrl` |

书项除标题、分类等字段，还可含 `titleSc/titleTc`、`wordCount/passageCount`、底本、来源、许可、`isExcerpt/sourceVerified`。详情段落的 `originalText` 是底本原文；`contentSc/contentTc` 是显示变体，`scriptVariants.sc/tc` 取 `source` 或 `converted`。`classicalCommentary/commentarySource`、`modernGuide` 分开保存，不把机器字形转换或现代导读称作古注。完整 `sourceHeader` 原样保留在详情及独立声明文件。

检索分片项保存 `passageSlug/passageTitle`、`original/plain/commentary` 和对应 `normalized` 字段；共同书籍信息放在分片 `book`。搜索清单中的每项包含 `slug/categorySlug/path/passages/bloom/hasPlain/hasCommentary`。检索先进行 NFKC、简体映射和小写规范化，再做包含匹配；原文不被规范化结果覆写。读取器仍兼容旧版 `version:1` 的单体 `items`，这不是当前构建格式。

## 公开资料调用

| 调用标识 | 输入 / 返回 |
| --- | --- |
| `GET /api/scriptures` | 可选 `q`、`category`；返回已发布书目数组。无关键词时不下载全文索引分片 |
| `GET /api/scriptures/:slug`、`GET /api/books/:slug` | 返回已发布经典详情；目录未列出或非 published 的书不可读取 |
| `GET /api/search` | `q` 最多 100 字符；`scope=all/original/plain/commentary`；可选 `category`；`page` 为 1–10000 的整数 |
| `GET /api/categories`、`GET /api/settings` | 返回静态分类和站点配置 |
| `GET /api/home` | 兼容聚合数据：推荐书、公告、真实书目/段落统计；社区计数为 0，不表示存在社区功能 |
| `GET /api/health` | 本地兼容层标识 `{ok:true,service:'fanjin-local',storage:'indexeddb'}`，不验证远程服务健康 |

搜索返回 `{items,total,page,pageSize:10,matchingBookSlugs}`。每项包含经典/段落 slug 与名称、`categoryName/field/excerpt/matchText`。`matchText` 保留命中原文的实际字形，供跨简繁搜索高亮使用。目录页自己的学派筛选、排序及每页 18 部分页在页面层实现，不是 HTTP 分页能力。

## 本机记录调用

`body` 使用 JSON 字符串传入；响应是数据对象。修改失败或未知操作会抛可理解的 `Error`，取消用 `AbortError`；不存在 HTTP 状态码或认证 Cookie。

| 调用标识 | 请求 / 语义 |
| --- | --- |
| `GET /api/me` | 固定本机兼容编号 `id:1`、称呼及收藏/摘录统计，无服务器用户 |
| `GET /api/me/library` | `{items}`：聚合收藏、进度、笔记、书签与未归档计划；下架书保留私人快照并标为 unavailable |
| `GET /api/favorites`；`POST /api/favorites`；`DELETE /api/favorites/:slug` | 添加 body 为 `{scriptureSlug}`，按书幂等 |
| `GET /api/bookmarks?scriptureSlug=...`；`POST /api/bookmarks`；`DELETE /api/bookmarks/:id` | 添加 body 为 `{scriptureSlug,passageSlug}`，同段重复添加幂等 |
| `GET /api/notes`；`POST /api/notes` | 新建 body 为 `{scriptureSlug,passageSlug,note?}`；由本地逻辑读取 `originalText` 形成不可变 `excerpt` |
| `PUT /api/notes/:id`；`DELETE /api/notes/:id` | 更新仅接受 `{note:string}`，可用空字符串清空心得；不改原文快照 |
| `GET /api/notes/export?format=md\|json` | 返回 Markdown 字符串或笔记数组，前端生成下载 Blob；不是带附件响应的远程下载 |
| `GET /api/progress/latest`；`PUT /api/progress` | 返回最近位置或 null；保存 body 为 `{scriptureSlug,passageSlug}`，每书一条 |
| `GET /api/history`；`POST /api/history` | 历史 GET 返回最近最多 20 部；POST 是进度保存的兼容入口 |
| `GET /api/me/preferences`；`PUT /api/me/preferences`；`DELETE /api/me/preferences` | null 或 `{interests,minutes,intention}`；兴趣为佛家/道家/儒家/诸子，分钟为 5/15/30，意向为 quiet/understand/reflect |
| `GET /api/me/study` | `{plans,checkins,stats}`；不返回已归档计划，记录列表最多 100 条；`currentStreak:0` 为兼容字段，不是连续天数产品能力 |
| `POST /api/me/study/plans` | `{scriptureSlug,dailyMinutes}`；每书一个计划，已归档计划可重新启用 |
| `PATCH /api/me/study/plans/:id`；`DELETE /api/me/study/plans/:id` | 修改 active/paused 或每日分钟；DELETE 为归档，保留历史记录 |
| `POST /api/me/study/checkins` | `{planId,passageSlug,minutes,note?,date?}`；设备本地当天及此前三天，同计划同日保留首次记录 |
| `GET /api/local/export`；`POST /api/local/import` | 完整备份对象；导入 body 为 `{backup}`，完整验证后原子替换 |
| `DELETE /api/local/data`；`PUT /api/local/profile` | 清空本机应用状态；或保存 `{name}` |

完整备份与并发替换规则见 [DATABASE.md](DATABASE.md)。`/api/auth*`、`/api/admin*`、密码/恢复码及 `/api/corrections` 操作被明确拒绝。勘误由阅读页生成文本并打开预填 GitHub Issue，仍由用户自行提交。
