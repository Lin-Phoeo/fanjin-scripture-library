# CODEX 实施指令书：梵烬网（个人自修驿站）重构与完善

> **使用方式**：将本文件放于项目根目录（或直接全文粘贴给 Codex / Cursor / Claude Code）。  
> **核心原则**：先完整读取仓库现状并输出差异报告，再分步实施修改；严禁把本文档中的建议直接当作仓库既成事实。

---

## 0. 最高执行准则（开始写代码前必读）

1. **先体检，再动手（Mandatory Inspection First）**：
   * 在修改任何一行代码前，必须先扫描整个仓库目录结构、前端路由、后端 Express 路由、现有 SQLite Schema / 迁移脚本以及已有的静态/种子数据。
   * 先向我输出一份 **《现有代码现状与本方案差异分析报告》**，明确指出：哪些模块已有且可直接复用、哪些旧模块需要清理、哪些表结构需要做兼容迁移。获得确认后再按任务序号逐项实施。
2. **绝对数据保护（Zero Data Loss）**：
   * 严禁粗暴 `DROP TABLE` 覆盖现有的用户、经典或笔记数据表。
   * 所有数据库结构升级必须写成可重复、幂等的**增量迁移脚本（Migration）**，先自动备份 `.db` 文件再执行迁移。
3. **严守现有技术栈**：
   * 严格沿用 **`Vite + React + TypeScript + react-router-dom + Express + SQLite (better-sqlite3)`**。
   * 禁止擅自引入 PostgreSQL、Redis、Elasticsearch、消息队列、微服务或重型 UI 框架。

---

## 1. 产品定位与红线清单

### 目标产品形态
* **品牌呈现**：主名保留“梵烬”，页面标题与导航统一呈现副标题——**`梵烬 · 东方经典个人自修驿站`**。
* **核心闭环**：`发现经典` → `静心阅读（记住精确段落）` → `摘录与私人心得（支持导出）` → `温和自修计划与每日定课` → `长期回看积累`。

### 绝对禁止项（发现旧代码残留须清理或下线）
- [ ] **禁止社交与社区**：移除/关闭活动报名、多人共修、论坛发帖、公开评论区、用户关注、排行榜。
- [ ] **禁止商业与焦虑机制**：移除/关闭付费课程、商城入口、积分体系、连续打卡断签惩罚。
- [ ] **禁止虚构运营数据**：禁止在任何页面展示假的“在读人数”“累计修学人次”“点赞数”“热门度”。
- [ ] **禁止混用注释与 AI 幻觉**：严禁将 AI 生成文本写入原文或冒充古人注疏；严禁把不同学派观点强行合并成统一权威结论。

---

## 2. 强制工程、安全与数据铁律

### 2.1 数据库与稳定性约束（SQLite）
* 初始化连接必须开启：
  ```sql
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  ```
* **稳定逻辑主键**：经典、章节、段落必须具备稳定的业务键 `books.slug`、`chapters.chapter_key`（如 `ch-01`）、`paragraphs.para_key`（如 `p-01`），并对 `(book_id, chapter_key)` 与 `(chapter_id, para_key)` 建唯一索引。
* **抗修订快照**：`user_notes` 表保存用户摘录/心得时，**必须冗余写入 `quoted_text_snapshot`**（写入当刻的段落原文）。后台重新导入或勘误典籍时，严格使用逻辑键 `UPSERT` 更新正文，绝不删除重建导致用户笔记、进度与计划断链。
* **三层文本物理分字段**：段落表严格区分为 `content_tc`（规范繁体）、`content_sc`（校对简体）、`classical_commentary` + `commentary_source`（古注及作者书名出处）、`modern_guide`（现代编校导读）。无注疏/导读时直接 `NULL`，前端留空不渲染。
* **防重定课**：`study_logs` 必须建立 `UNIQUE(plan_id, log_date)` 唯一约束，写入接口采用幂等处理（如 `INSERT OR IGNORE`），接收前端本地日历 `YYYY-MM-DD` 并在服务端校验合法区间（允许最近 3 天温和补记，拒绝未来日期）。

### 2.2 安全与权限隔离（零容忍）
* **IDOR 越权防护**：所有涉及个人进度、笔记、自修计划与定课记录的接口，**必须在 SQL `WHERE` 子句中死锁 `AND user_id = req.user.id`**（来自经服务端验证的会话/JWT，严禁信任前端传入的 `user_id`）。
* **草稿与下架绝对隔离**：所有公开接口（`/api/books`、`/api/books/:slug`、`/api/books/:slug/chapters/:key`、`/api/search`）必须在 SQL `WHERE` 中死锁 `AND books.status = 'published'`。
* **认证安全**：密码必须使用 `bcrypt` / `argon2` / `scrypt` 加盐哈希；登录态优先采用 `HttpOnly + Secure + SameSite=Lax` Cookie。管理员接口（`/api/admin/*`）强制校验 `req.user.role === 'admin'`。
* **全文搜索**：基于 `content_tc` 与 `content_sc` 实现简繁同搜（SQLite FTS5 或单双字降级 `INSTR`），所有用户输入必须参数化绑定并转义通配符，杜绝 SQL 注入。

---

## 3. 视觉与中文阅读体验硬参数（“宣纸斋墨”）

前端样式请通过 CSS Variables 统一管理三套主题，严禁堆砌装饰背景图、泛化禅意插画与耗时超过 `180ms` 的动画（且需尊重 `prefers-reduced-motion: reduce`）：

```css
/* 默认亮色：素宣 */
:root, [data-theme="paper"] {
  --bg-canvas: #FAF8F5;
  --bg-surface: #F3EFEA;
  --text-primary: #24211E;
  --text-secondary: #68625D;
  --accent-primary: #9B3B31;   /* 印泥朱红，克制用于主按钮/笔记印记 */
  --accent-secondary: #3E5C58; /* 青黛辅色 */
  --border-subtle: #E5E0D8;
}

/* 低刺激护眼：古纸 */
[data-theme="sepia"] {
  --bg-canvas: #F2EBD9;
  --bg-surface: #E9E0CA;
  --text-primary: #2A241E;
  --text-secondary: #6E6354;
  --accent-primary: #8F342A;
  --border-subtle: #DCD1BA;
}

/* 暗黑静夜：松烟 */
[data-theme="dark"] {
  --bg-canvas: #161616;
  --bg-surface: #1F1F1E;
  --text-primary: #D5CFC7;
  --text-secondary: #8A847C;
  --accent-primary: #C1594D;
  --border-subtle: #2B2A28;
}
```

* **阅读栏排版铁律**：
  * 桌面主阅读容器最大宽度：`660px–700px`（每行约 32–38 汉字）。
  * 正文字体栈（零 Webfont 首屏阻塞）：`"Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", "SimSun", Georgia, serif`。
  * 字号档位：`16px` / `18px（桌面默认）` / `17px（手机默认）` / `20px` / `23px`。
  * 正文行高：`1.85–1.95`；段间距：`1.25em–1.5em`；注疏与导读小 `2px`、行高 `1.7`。
  * 移动端左右留白 `20px–24px`，按钮点击热区 `≥ 44px × 44px`，全站保留清晰 `:focus-visible`。

---

## 4. MVP 分步实施 Checklist（按序推进，每完成一项运行校验）

### Phase 0：仓库核对与计划确认
- [ ] **T-00 代码体检**：读取目录、路由、表结构与现有 API，列出与本任务书的精确差异及迁移方案。

### Phase 1：最小完整闭环（P0）
- [ ] **T-01 清理旧模块与导航重构**
  * 移除/下线活动、社区、排行、虚构热度组件与路由；建立极简顶部导航（桌面）与底部导航（手机）。
  * *验收*：全站无冗余社区/商业入口，无死链。
- [ ] **T-02 数据库增量迁移与安全初始化**
  * 补齐 `books`（含来源/许可/状态/是否节选）、`chapters`（`chapter_key`）、`paragraphs`（`para_key` + 繁简 + 三层文本）、`reading_progress`、`user_notes`（含 `quoted_text_snapshot`）、`study_plans`、`study_logs`（`UNIQUE(plan_id, log_date)`）、`correction_reports`。
  * *验收*：在现有数据副本上执行迁移零报错、零丢数据，WAL 模式生效。
- [ ] **T-03 经藏目录、详情页与“宣纸斋墨”核心阅读器**
  * 实现 `/library`（学派/标签筛选）、`/book/:slug`（底本与版权声明清晰展示）、`/read/:slug/:chapterKey`（3 主题、字号/行距/繁简/注疏开关持久化至 `localStorage`，段级点击触发“复制带出处/摘录写心得/勘误”）。
  * *验收*：桌面与移动端排版符合第 3 节参数，切换样式无闪烁，未登录可无阻试读。
- [ ] **T-04 账号安全与精准续读闭环**
  * 加固注册/登录/改密；实现 `PUT /api/progress`（前端 2 秒防抖上报，失败静默落本地）与 `GET /api/progress/latest`；首页顶部上线“继续上次阅读”直达上次停留段落。
  * *验收*：登录后刷新或次日打开首页，一键精准滚动回上次段落。
- [ ] **T-05 简繁全文检索与段内高亮跳转**
  * 实现 `GET /api/search?q=`（仅查 `published`，支持简繁等价与短词精准命中）及 `/search` 页面；点击结果跳至 `/read/:slug/:chapterKey#p-:paraKey` 并柔和闪烁高亮 2 秒。
  * *验收*：搜索“无”和“無”均能命中；草稿书零泄露；特殊字符不报错。
- [ ] **T-06 私人摘录、心得流与 Markdown 导出**
  * 实现 `/api/notes` CRUD（严格 `user_id` 隔离 + 快照保存）与 `GET /api/notes/export?format=md|json`；完善 `/notes` 页面（按经典筛选、编辑删除、回跳原段、一键导出）。
  * *验收*：越权测试返回 `403/404`；修改正文错字后既有笔记快照完好；导出 `.md` 结构规范。
- [ ] **T-07 私人自修计划与温和定课记录**
  * 实现 `/api/study-plans` 与 `/api/study-plans/:id/logs`（幂等防重 + 3 天内补记）；完善 `/study` 页面与阅读页尾部快捷定课确认。
  * *验收*：1 秒连点 5 次定课仅产生 1 条记录；全页面无任何连续断签惩罚文案。
- [ ] **T-08 管理员导入、上下架与勘误后台**
  * 实现 `/admin`（仅 `admin` 角色访问）：标准 JSON 校验与基于逻辑键的 `UPSERT` 导入、草稿预览、`draft/published/archived` 切换、勘误工单查看与单段在线修补。
  * *验收*：上传标准 JSON 典籍可预览发布，在线修错字不破坏旧笔记与进度。

---

## 5. 最终交付前必做自动化/手工验证清单

请你在每个核心阶段完成及整体交付前，提供以下验证结果（不得跳过或口头假设通过）：
1. **权限越权验证**：构造双账号（A / B），验证 B 无法读取/修改/删除 A 的进度、笔记与计划。
2. **草稿隔离验证**：将测试书设为 `draft` / `archived`，验证 `/api/books`、`/api/books/:slug`、`/api/search` 均不可见。
3. **抗修订验证**：对已有用户笔记的段落执行 JSON 重新导入微调错字，验证 `user_notes` 记录仍在且 `quoted_text_snapshot` 保持原样。
4. **并发幂等验证**：同日连续多次提交同一自修计划打卡，验证数据库仅 1 条记录且无 500 报错。
5. **构建与体积检查**：运行 `npm run build`（及现有 TypeScript 类型检查与测试），报告前端产物体积与无报错确认。

---

**现在，请执行 `T-00`：先检查当前代码仓库的目录结构、路由、数据库现状与安全基线，向我汇报现状与差异清单，等待确认后开始 `T-01`。**