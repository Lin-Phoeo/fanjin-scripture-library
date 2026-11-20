 > 历史服务器版本参考。当前公开版本使用 GitHub Pages 与本机 IndexedDB，参见 [现行文档](../README.md)。

# 开发与验证

## 环境

Node.js >= 22.14、npm，以及可安装 better-sqlite3 的系统环境。项目通过锁文件安装，推荐 `npm ci`。本地未提供 `.env` 时非生产模式可生成开发样例；如需不含样例的新库，设置 `SEED_DEMO=0` 和独立 `FANJIN_DB_PATH`。正式管理员初始化只在生产模式按环境变量执行。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run api` | 读取 `.env` 后启动后端，默认 127.0.0.1:3001 |
| `npm run dev` | 前端开发，默认 127.0.0.1:5173 |
| `npm run typecheck` | 前端、后端和 Vite 配置严格类型检查 |
| `npm run lint` | ESLint |
| `npm run build` | 类型检查并构建 `dist/` |
| `npm test` | 自建临时库/端口的功能、迁移与旧库升级验证 |
| `npm run test:production` | 使用现有 `dist` 的临时生产环境验证 |
| `npm run check` | 上述验证串行运行 |
| `npm start` | 强制生产模式，同源提供前端与 API |
| `npm run backup` | 在线备份指定数据库，校验备份完整性 |

测试不需要预先运行后端，不支持指向任意已有服务的 `TEST_API_BASE`。测试入口会覆盖数据库、端口和种子配置，结束后关闭子进程并清理临时目录。不要改为测试正式数据库。

开发前后端端口不同时，设置 `API_PROXY_TARGET` 指向后端。Cookie 与写请求来源必须匹配；不要通过放宽鉴权或关闭来源检查解决端口配置错误。

## 修改模块

- 页面与路由：`src/pages/`、`src/App.tsx`；主站与后台布局在 `src/components/`。
- 数据请求：`src/lib/api.ts` 及对应业务 API 模块；账号会话由 `src/context/AppStateContext.tsx` 管理。
- 内容与搜索：`server/content.ts`、`server/validation.ts`。
- 私人摘录、进度和勘误：`server/personal.ts`。
- 私人书架和书签：`server/bookshelf.ts`；阅读偏好：`server/preferences.ts`。
- 计划与功课：`server/study.ts`。
- 认证与边界：`server/auth.ts`、`server/security.ts`。

新增数据库结构必须通过具有唯一版本 ID 的迁移注册。不能改写已经执行过的迁移来期待旧库重新执行。迁移统一经过 `runMigrations` 的备份与事务，在服务启动和导入 CLI 都需挂载。为会影响旧记录的变更补旧库升级验收。

内容编辑应保留经典及段落标识，保护私人摘录快照和关联记录。新增私人接口必须从服务端会话取得用户 ID，查询和写入都按该 ID 过滤。后台统一仅允许 `admin`，旧 `reviewer` 不拥有后台访问权。

## 发布前

运行 `npm run check` 和 `npm audit --audit-level=moderate`。如代码继续变动，针对变动重新验收；已完成测试不能自动代表后续版本。Docker/目标服务器仍需健康检查、TLS、深链接、登录和恢复演练，详见 [部署说明](DEPLOYMENT.md)。
