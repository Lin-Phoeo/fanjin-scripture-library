# 本机数据存储

当前应用使用 IndexedDB，不使用服务器用户数据库。权威类型和校验在 [local-store.ts](../src/lib/local-store.ts)，本机业务读写在 [local-api.ts](../src/lib/local-api.ts)。详细操作契约见 [API.md](API.md)；旧 SQLite 模型只保留在 [server/DATABASE.md](server/DATABASE.md)。

## 存储位置与身份

IndexedDB 数据库为 `fanjin-local-v1`，数据库版本 1，对象仓库 `app`。`state` 保存 schema `version:1` 的应用状态，另一个 `replacement-epoch` 键保存导入/清空代次。数据库版本、状态 schema 版本和备份格式版本是不同概念，不应只改其中一个数字来“迁移”数据。

| `state` 字段 | 保存内容与唯一性 |
| --- | --- |
| `profile` | 本机书斋称呼，无账号、密码或会话 |
| `favorites` | 按经典 slug 唯一的收藏与书名快照 |
| `bookmarks` | 本机 ID 及经典/段落 slug；同一段只存一个书签 |
| `notes` | 本机 ID、心得 `note`、不可变原文快照 `excerpt`、书名/段名及创建/修改时间 |
| `progress` | 每部经典最后段落、顺序、总段数、更新时间 |
| `plans` | 每部经典一个计划；active/paused/completed/archived |
| `logs` | 每计划每本地日期一条；段落、时长、心得与创建时间 |
| `preferences` | 主动选择的兴趣、5/15/30 分钟和阅读方式，或 null |
| `counters` | note/bookmark/plan/log 的本机递增 ID |

公开书籍/段落 ID 根据稳定 slug 派生，本机笔记等 ID 由计数器生成，两者不可混用。导入不能以当前公开目录不存在为由删除私人快照；撤下的经典仍可保留摘录和其他历史记录。更改原文或切换字形不能覆写已有 `excerpt`。

阅读主题、字号、行距和正文 original/sc/tc 选择存于 localStorage 的 `fanjin-reading-preferences-v1`；界面语言选择存于 `fanjin-ui-script-v1`。未保存的笔记草稿使用 sessionStorage 的 `fanjin-note-draft:` 前缀。它们不是 `state`，不包含在完整 JSON 备份中。清理时只处理明确列出的本应用键，不调用 `localStorage.clear()`。

## 原子写入与跨标签保护

`changeLocalState` 在单个 readwrite 事务内读取、校验、同步修改和写回。事务回调不可等待网络。AbortSignal 在提交前可取消事务；提交完成后不能报告成“未保存”。存储不可用、配额不足或结构校验失败会抛错，不降级为假保存的临时内存模式。

导入/清空用 `replaceLocalState` 在同一事务写入完整状态并递增 `replacement-epoch`。普通写入在异步读取经典前捕获该代次，在提交时复核，避免旧操作迟到覆盖恢复结果。

替换通过 `BroadcastChannel('fanjin-local-data')` 和 localStorage 的 `fanjin-local-data-signal` 双通道发送去重通知，不携带私人正文。其他标签接收后派发 `fanjin-local-data-changing` / `fanjin-local-data-updated`。界面必须取消未发出的防抖、终止旧请求、关闭旧 ID 对应的笔记编辑，并重新读取记录；旧阅读位置不得仅因重新渲染自动写回。存储事务保护和界面取消缺一不可。

## 备份与恢复

格式为 `{format:"fanjin-local-backup",version:1,exportedAt,data}`。导出不加密，内容包含私人心得；不是云同步或账号迁移服务。

导入先完整校验再预览和确认覆盖：拒绝未知版本、非对象状态、非法字段/日期、重复 ID、重复书签/计划/同日记录和缺少关联计划的日志；计数器至少提升到已有最大 ID。不能只检查顶层 `format` 后直接把未验证字段渲染进界面。替换不依赖旧状态可解析，因此有效备份可以修复损坏的旧 `state`；无效导入保留现有数据库。

当前限制以 UTF-8 编码后的字节数为准：应用状态最多 19,000,000 字节，完整导入最多 20,000,000 字节；每集合最多 100,000 条，心得最多 10,000 字符，摘录快照最多 100,000 字符。不要把界面文件大小预检当作唯一校验。

日课使用设备本地日历，允许今天及前三个自然日补记；同一计划同一天重复请求保留首次记录，不覆盖也不累加。备份导入可恢复更早的历史记录，不能对所有历史日志套用“最近三天”限制。

## 验证与数据生命周期

相关自动化在 [local-state.mjs](../tests/local-state.mjs)、[local-api.mjs](../tests/local-api.mjs)；浏览器还应覆盖真实导出/导入、跨标签替换、旧编辑 ID 复用和待写进度取消，执行入口见 [开发说明](DEVELOPMENT.md)。测试使用 fake-indexeddb、临时目录或隔离浏览器，不能清除用户真实书斋来验证。

记录跟随网站 origin 和浏览器配置，不同设备或域名不会自动共享；同一 origin 下的不同路径也不是天然隔离的数据库。清除网站数据、无痕窗口关闭、存储回收或设备损坏可能永久丢失记录，只有已导出的备份可恢复。普通静态站升级不得清空 `state`，schema 演进必须明确兼容或迁移旧版本。
