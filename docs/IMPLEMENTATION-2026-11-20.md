# 梵烬个人自修驿站：现状核对与实施记录

> 历史实施记录。用户随后明确改为 GitHub Pages 纯静态版，本机 IndexedDB 保存个人数据，无需登录与服务器。下面的 Express/SQLite 说明仅用于保留旧实现；当前使用与发布以 README 和 docs/DEPLOYMENT.md 为准。

用户方向：公益阅读与个人自修，佛道为主，兼收儒家和诸子。保留梵烬名称；活动、多人共修和社区退出产品范围。

## 方案依据

用户提供的研究与任务书原件保存在 `docs/plans/`，作为参考资料，不覆盖仓库实际事实。报告中的版权概括、价格估算与“已核实”标签需要逐项核验。部署以实际主机检查为准。

## T-00 核对结论

| 领域 | 实际情况 | 实施选择 |
|---|---|---|
| 技术栈 | React 18、Vite、TypeScript、Express 5、better-sqlite3 | 沿用，无新数据库或重型服务 |
| 经典身份 | scriptures.slug、passages(scripture_id,slug) 已稳定 | 保留表与ID；章节式导入转换为 chapter_key--para_key，检测重复 |
| 摘录快照 | notes.excerpt 已保存摘录当刻原文 | 复用，不重复建立 user_notes 表；更新心得不改快照 |
| 内容更新 | 原实现删除全部摘录和阅读历史再重建段落 | 改为 UPSERT 保留ID；有个人记录引用的段落不可删除 |
| 认证 | 原会话无过期、令牌落localStorage、审核员可管用户 | Cookie、会话过期和撤销、恢复码、限流、管理员权限 |
| 阅读 | 原有分类、段落及对照界面 | 增版本详情、三主题、来源分层、精确续读和本地回退 |
| 自修 | 新增计划与段落记录，最初按段/日计时 | 改为每日账本 UNIQUE(plan_id,day)，保留原段落记录并迁移汇总 |
| 检索 | 原始 LIKE 仅返回书名 | FTS5 trigram + 短词 INSTR，OpenCC规范化检索；原文不自动改写 |
| 来源 | 旧示例缺底本与许可，注义无出处 | 新增来源字段和发布前校验；旧文本不冒称可信古注 |
| 测试 | 原 npm test 写默认数据库且部分断言永真 | 改为临时数据库、随机端口、自启API与自动清理 |
| 部署 | 东京 Azure Arm64、约1GB内存，已有其他服务 | 独立目录、容器/数据卷及域名入口，复用现有网关 |

## 数据升级约定

迁移前用 SQLite online backup 获取含 WAL 的一致备份。迁移编号写入 schema_migrations，事务失败回滚，重复启动不重复迁移。禁止以复制运行中主数据库文件代替在线备份。

不重命名或删除既有用户业务表。原活动、讨论数据可保留归档，但接口返回410，页面重定向至个人自修；已有记录不得为下线功能而销毁。

新结构包括 reading_progress、correction_reports、study_plans、study_checkins、study_logs 和来源字段。study_logs 控制每日一次计时；study_checkins 保存已读段落集合。日期按北京时间验证，可补最近3天，未来日期不接受；重复提交保留首次当日记录。

## 内容约定

- originalText 是保留的底本文字；contentTc/contentSc 仅在有对应文本时填写，缺失返回 null。
- classicalCommentary 必须有 commentarySource；现代导读单独使用 modernGuide。
- 旧 plainText/commentaryText 保留兼容，不直接升级为已核实古注。
- 发布须具备 edition/sourceName/sourceUrl/license/licenseUrl 与已核对标记。
- 原文来源、数字整理许可、版本和全文/节选分别登记；默认节选。
- 本地演示种子只用于开发测试；生产禁止创建演示账号和导入演示社区数据。

## 交付验证

以自动化测试、浏览器验证和部署后读回为准。构建通过不能替代生产验证；各项结果将在最终验收记录中注明，不把参考方案的目标当作实测结果。
