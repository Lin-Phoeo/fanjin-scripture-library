 > 历史服务器版本参考。当前公开版本使用 GitHub Pages 与本机 IndexedDB，参见 [现行文档](../README.md)。

# API 契约

开发默认地址为 `http://127.0.0.1:3001`；生产与网页同源。写入请求使用 JSON 对象，错误返回 `{ "message": "说明" }`。常见状态：400 输入错误、401 未认证或会话失效、403 权限/来源不允许、404 不存在或不属于本人、409 冲突、410 功能退役、429 限流。没有业务需要时不要把内部错误或凭据写入日志。

## 身份与权限

登录、注册返回 `{token,user}` 并设置 HttpOnly Cookie；注册另返回一次性恢复码 `recoveryCode`。浏览器使用 Cookie 会话；测试及受信客户端可发送 `Authorization: Bearer <token>`。会话有效期七天，数据库只保存 token 哈希；生产 Cookie 含 Secure。私人接口均从服务端会话取用户 ID，忽略客户端伪造的归属字段。

**所有 `/api/admin/*` 仅允许 `admin`。** `user` 和保留的 `reviewer` 角色均为 403。用户停用或角色变更会注销相关会话；最后一名活跃管理员不能被降级或停用。

| 方法与路径 | 请求或返回 |
| --- | --- |
| `POST /api/auth/register` | `{name,password}`；名字 2–40 字符、密码 8–128 字符 |
| `POST /api/auth/login` | `{name,password}`；返回会话与用户 |
| `POST /api/auth/logout` | 注销当前会话、清 Cookie |
| `POST /api/auth/recover` | `{name,recoveryCode,newPassword}`；注销所有会话并返回新恢复码 |
| `GET /api/me` | 当前用户与本人收藏/摘录计数 |
| `PUT /api/me/password` | `{currentPassword,newPassword}`；撤销旧会话、返回新会话 |
| `POST /api/me/recovery-code` | `{currentPassword}`；生成新恢复码，旧码失效 |

写请求有来源检查。一般 API 保留总量限制；登录与账号恢复按规范化账号名及可信对端分别限流，改密码和重置恢复码按已认证用户 ID 限流。注册默认每对端每小时 10 次，可由 `AUTH_REGISTER_LIMIT` 设置；东京 SNI 入口没有原访客 IP，配置为共享每小时 60 次。429 携带 `Retry-After`。恢复码无法由服务端找回，应由用户离线保存。

## 公开阅读与搜索

| 方法与路径 | 查询或返回 |
| --- | --- |
| `GET /api/health` | `{ok:true,service:"fanjin"}` |
| `GET /api/home` | 公告、推荐经典、实际内容计数与站点设置 |
| `GET /api/categories` | 分类列表 |
| `GET /api/scriptures` | 可选 `q`、`category`、`school`、`tag`；只列已发布经典 |
| `GET /api/scriptures/:slug` | 经典元数据及有序段落；未发布返回 404 |
| `GET /api/search` | `q`、`scope=all|original|plain|commentary`、`category`、`page`；返回 `{items,total,page,pageSize:10}` |
| `GET /api/settings` | 公开站点设置 |

搜索 `original` 包含原文及繁/简体字段，`plain` 对应 `modernGuide`，`commentary` 对应 `classicalCommentary`。支持简繁互查和段落定位，不把旧的未核验解释自动当作古注或现代导读。返回项含经典/段落标识、命中层、摘要及匹配文本。空查询返回空结果；非法范围或页码返回 400。

经典元数据包括 `slug/title/categorySlug/dynasty/translator/summary/school/tags`，以及 `edition/sourceName/sourceUrl/license/licenseUrl/sourceVerified/isExcerpt`。`isExcerpt` 默认 true；只有确认完整时才设 false。段落包括稳定 `slug`、顺序、原文 `originalText`、可选 `contentTc/contentSc`、古注 `classicalCommentary/commentarySource`、导读 `modernGuide` 和 `audioUrl`。历史 `plainText/commentaryText` 保留兼容，新增整理使用明确的三层字段。

## 私人书架、进度和书签

| 方法与路径 | 请求或返回 |
| --- | --- |
| `GET /api/me/library` | `{items}`；聚合本人收藏、进度、计划、摘录和书签，含 `publishStatus` |
| `GET /api/favorites` | 本人收藏 |
| `POST /api/favorites` | `{scriptureSlug}`，重复收藏幂等 |
| `DELETE /api/favorites/:scriptureSlug` | 移除本人收藏 |
| `GET /api/progress/latest` | 最近可公开阅读的进度或 null |
| `PUT /api/progress` | `{scriptureSlug,passageSlug}`，按本人/经典覆盖当前位置 |
| `GET /api/history` | 本人最近阅读历史 |
| `POST /api/history` | `{scriptureSlug,passageSlug?}`，每部经典保留最近访问 |
| `GET /api/bookmarks` | 本人书签，可用 `scriptureSlug` 过滤 |
| `POST /api/bookmarks` | `{scriptureSlug,passageSlug}`，重复保存返回相同 `{ok,id}` |
| `DELETE /api/bookmarks/:id` | 只能删除本人书签，他人 ID 返回 404 |

新增收藏、进度、书签只接受公开经典和匹配段落。已下架经典仍可作为本人书架记录显示其状态，不能从公开详情继续读取；保存过的私人记录不会因下架被删除。

## 私人摘录与勘误

| 方法与路径 | 请求或返回 |
| --- | --- |
| `GET /api/notes` | 本人的摘录与心得 |
| `POST /api/notes` | `{scriptureSlug,passageSlug,note?}`；返回 `{ok,id}`，心得允许空 |
| `PUT /api/notes/:id` | `{note}`；只改本人心得，原文快照不能改 |
| `DELETE /api/notes/:id` | 本人记录删除；他人 ID 返回 404 |
| `GET /api/notes/export?format=md|json` | 仅导出本人的摘录，附件响应 |
| `POST /api/corrections` | `{scriptureSlug,passageSlug,message}`，保存反馈及原文快照 |

摘录的 `excerpt` 由服务端从段落读取，客户端提供的 excerpt 无效；后续经典修订不会覆盖它。JSON 导出返回数组，Markdown 导出包含文字转义与返回原段链接。勘误由管理员处理，不是公开评论。

## 阅读偏好

`GET /api/me/preferences` 返回 null 或 `{interests,minutes,intention}`；`PUT` 保存同形对象；`DELETE` 删除本人偏好。

- `interests`：最多四项，从 `佛家/道家/儒家/诸子` 选择，重复项去重。
- `minutes`：5、15、30 中一个整数。
- `intention`：`quiet/understand/reflect` 中一项。

非法值返回 400，并保留之前设置。该偏好是阅读推荐输入，与某个计划可以设置的 1–240 分钟时长范围不同。

## 个人自修

| 方法与路径 | 请求或返回 |
| --- | --- |
| `GET /api/me/study` | `{plans,checkins,stats}`，只含本人数据 |
| `POST /api/me/study/plans` | `{scriptureSlug,dailyMinutes?}`，默认 15；重复活跃计划 409 |
| `PATCH /api/me/study/plans/:id` | `{status?,dailyMinutes?}`；本人计划调整 |
| `DELETE /api/me/study/plans/:id` | 归档本人计划，保留功课；归档后可重建启用 |
| `POST /api/me/study/checkins` | `{planId,passageSlug,minutes,note?,date?}` |

时长为 1–240 的整数；日界以北京时间 UTC+8 计算。`date` 可省略为今天，仅可补记今天之前最近三天，未来或更早日期返回 400。

`study_logs` 按 `(plan_id,day)` 唯一，**同计划同日重复提交保留第一条时长和心得，不重复累加**。逐段完成记录单独维护，可在同一天记录另一段，但不会增加每日统计时长。全部段落都有完成记录后计划自动完成，不能直接从未完成手工标为完成。暂停或内容下架后不能新增功课。他人计划 ID 返回 404。

## 管理员内容与治理

| 方法与路径 | 请求或返回 |
| --- | --- |
| `GET /api/admin/dashboard` | 看板 |
| `GET /api/admin/scriptures`、`GET /api/admin/scriptures/:slug` | 含待审/未发布内容 |
| `POST /api/admin/scriptures`、`PUT /api/admin/scriptures/:slug` | [经典 JSON](CONTENT_IMPORT.md)，保存后待审核 |
| `GET /api/admin/review?status=...` | 审核记录 |
| `PATCH /api/admin/review/:id` | `{status:"已通过"|"待修改"}`；仅最新可处理记录 |
| `POST /api/admin/scriptures/:slug/unpublish` | 下架，并使旧审核记录失效 |
| `GET /api/admin/corrections` | `status=open|resolved|rejected`、`page`，返回分页列表 |
| `PATCH /api/admin/corrections/:id` | `{status,response?}` |
| `GET /api/admin/audit` | 最近内容操作记录 |
| `GET /api/admin/users` | 不包含密码、会话或恢复码 |
| `PATCH /api/admin/users/:id` | `{role?,status?}`；role 为 admin/reviewer/user，status 为 active/disabled |
| `GET/PUT /api/admin/settings` | 允许 site_name、site_subtitle、site_description、footer_notice |
| `GET/POST /api/admin/announcements` | 列表/新建 `{title,detail}` |
| `PUT/DELETE /api/admin/announcements/:id` | 编辑/删除 |

发布必须包含底本、来源链接、许可说明和许可链接，并设 `sourceVerified:true`。此字段只记录管理员核验，不自动证明授权成立。缺项返回 409。经典 slug 创建后不可改；相同段落 slug 更新保留 ID，被书签、摘录、进度、勘误或功课引用的段落删除返回 409。旧审核记录审批新版本也返回 409。

## 已退役接口

`/api/topics`、`/api/activities`、`/api/discussions`、`/api/my/discussions` 及相应 `/api/admin/topics|activities|discussions|replies` 均返回 410。后台仍先执行管理员鉴权，普通用户得到 403。保留历史表是为了数据完整性，不表示这些功能仍在使用。
