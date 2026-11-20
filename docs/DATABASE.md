# 本机数据存储

当前应用使用浏览器 IndexedDB：数据库 `fanjin-local-v1`、数据库版本 1、对象仓库 `app`、状态键 `state`。当前数据 schema 的 `version` 为 1。

状态包含：

| 字段 | 内容 |
| --- | --- |
| `profile` | 本机书斋名称 |
| `favorites`、`bookmarks` | 收藏经典与段落书签 |
| `notes` | 心得及保存时的原文快照 |
| `progress` | 每部经典最后阅读位置 |
| `plans`、`logs` | 自修计划与每日记录 |
| `preferences` | 阅读兴趣、时间和方式 |
| `counters` | 本机记录 ID 计数器 |

经典与段落通过稳定 slug 关联，公共内容构建 ID 也由 slug 派生，调整 manifest 顺序不会改变同一本书的身份。

修改必须在单个 readwrite 事务内读取、同步修改并提交；事务抛错、验证失败或取消时不覆盖旧记录。并发写入测试验证多条笔记不会丢失或复用 ID。

完整备份格式为 `{format:"fanjin-local-backup",version:1,exportedAt,data}`。校验拒绝重复 ID、重复同日记录、缺少关联计划的日志、未知版本和非法偏好，并将计数器至少提升到现有最大 ID。无效导入保留当前数据库。

数据不上传服务器。清除网站数据、使用隐私模式或丢失设备可能永久丢失记录，请定期导出。旧 SQLite 模型仅保留参考：[server/DATABASE.md](server/DATABASE.md)。
