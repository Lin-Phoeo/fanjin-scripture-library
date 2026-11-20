 > 历史服务器版本参考。当前公开版本使用 GitHub Pages 与本机 IndexedDB，参见 [现行文档](../README.md)。

# 数据库与迁移

数据库为 SQLite，默认路径 `data/fanjin.sqlite`，可用 `FANJIN_DB_PATH` 指定。连接开启 WAL、外键约束和 `busy_timeout=5000`。正式部署使用单实例与持久卷，数据库、WAL、备份及环境文件不进入 Git。

## 当前数据模型

| 表 | 作用与关键约束 |
| --- | --- |
| `categories` | 分类，slug 唯一、排序与说明 |
| `scriptures` | 经典，slug 唯一，包含发布状态、学派/标签、版本、来源、许可和节选标记 |
| `passages` | 有序段落，`(scripture_id,slug)` 唯一，保存原文、繁/简体、古注与出处、现代导读及音频 URL |
| `scripture_search_v2` | FTS5 trigram 索引；通过 normalize_text/OpenCC 将简繁文本归一后索引 |
| `users` | 用户名唯一、scrypt 密码哈希、角色、active/disabled 状态、恢复码哈希 |
| `sessions` | 会话 token 哈希、用户、期限；旧无期限明文 token 升级时作废 |
| `favorites` | 经典收藏，`(user_id,scripture_id)` 唯一 |
| `bookmarks` | 段落书签，`(user_id,passage_id)` 唯一 |
| `notes` | 私人心得与保存时的原文快照，含创建/更新时间 |
| `reading_history` | 最近阅读历史，应用写入时每用户/经典保留最近一项 |
| `reading_progress` | 本人每部经典的当前位置，`(user_id,scripture_id)` 主键 |
| `reading_preferences` | 每个用户一份兴趣、阅读时长和阅读方式 |
| `study_plans` | 私人计划，`(user_id,scripture_id)` 唯一，active/paused/completed/archived |
| `study_logs` | 每日时长和心得，`(plan_id,day)` 唯一，重复提交不累加 |
| `study_checkins` | 段落完成记录，`(plan_id,passage_id,day)` 唯一，独立用于完成度 |
| `correction_reports` | 用户勘误、原文快照、open/resolved/rejected、管理员处理说明 |
| `review_queue` | 公共内容的审核记录，关联经典 slug |
| `content_audit` | 内容审核/下架操作记录 |
| `announcements`、`site_settings` | 公告及允许公开的站点设置 |
| `schema_migrations` | 已应用的迁移 ID 和时间 |

`topics/topic_scriptures/activities/discussions/discussion_replies` 是保留的历史社区表。当前路由将相关 API 返回 410，不为下线功能销毁已有记录；它们不参与个人自修数据归属。

## 数据保护

私人查询必须绑定会话用户 ID；拥有一条记录的数字 ID 不意味着有读取或修改权限。`/api/me/library` 是按本人范围聚合上述数据的查询，不是公开用户动态表。

经典更新以段落 slug 做 upsert，保留既有 ID。涉及摘录、书签、进度、历史、勘误或功课引用的段落不能删除；事务回滚保证错误更新不会留下半套内容。摘录 `excerpt` 是保存时的独立快照，不随原文更新改变。

所有功课日期按北京时间 UTC+8 的自然日解释。`study_logs` 负责日统计，`study_checkins` 负责段落完成；不要对两张表相加计算时长。

## 迁移方式

服务启动和导入 CLI 都调用异步 `initializeDatabase`，按唯一 ID 执行结构迁移。当前包含基础结构、个人摘录/进度、自修、内容索引、产品文案、阅读偏好、书架书签等迁移。

迁移步骤：

1. 从 `schema_migrations` 读取已应用 ID，仅选择未执行项。
2. 如数据库已存在业务表，先使用 SQLite 在线备份复制包含已提交 WAL 页的数据库。
3. 在一个即时事务中执行全部待应用迁移并写账本。
4. 失败时同时回滚结构、数据和账本；备份留存便于恢复。

相同 ID 不重复执行，也不会重复创建备份。新结构变更必须使用新 ID，不能只改旧迁移函数。产品文案迁移仅替换精确匹配的历史默认值，不覆盖用户自定义文字。

旧库升级会保留原用户密码、笔记快照、历史和段落 ID；从已有历史重建最近阅读位置。旧多段同日功课汇总为一条日记录并保留原记录，保证历史心得不丢失。旧 `plain_text/commentary_text` 保留原值，但不会擅自将其认定为已经核验的古注。

## 初始化与备份

生产环境只初始化必要分类/配置和首次管理员，不生成开发样例账户或经典。首次管理员来自 `ADMIN_NAME/ADMIN_PASSWORD`。检测到活跃的公开样例密码账户时拒绝生产启动。

`npm run backup` 使用只读连接做在线备份，再执行完整性检查。备份目录默认为数据库旁的 `backups/`，也可设置 `FANJIN_BACKUP_DIR`。不要只复制运行中的主 `.sqlite` 文件。恢复、权限和异地保留见 [部署说明](DEPLOYMENT.md)。

当前方案适合单实例中小规模服务。音频仅保存 URL，未内置大文件存储。以后若迁移其他数据库，应优先保持经典/段落标识、用户归属、私密快照与迁移可恢复性。
