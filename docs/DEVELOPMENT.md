# 静态应用开发

默认应用是 React + Vite + TypeScript，公共内容来自静态 JSON，个人数据来自浏览器 IndexedDB。开发与 Pages 发布都不需要 Express API、账号或 SQLite。

| 命令 | 用途 |
| --- | --- |
| `npm ci` | 按锁文件安装依赖 |
| `npm run dev` | 先生成公共经典文件，再启动本地网页 |
| `npm run build:catalog` | 验证 manifest 内容并生成静态目录、逐书详情和检索索引 |
| `npm run build:pages` | 类型检查并构建 Pages 基础路径的 dist |
| `npm run check:pages`、`npm run check` | 静态版本默认验收 |
| `npm run test:static` | 无浏览器网络的静态目录和 fake-indexeddb 回归 |
| `npm run typecheck`、`npm run lint` | 类型与静态检查 |
| `npm run check:server` | 保留旧服务器实现的独立回归，不是 Pages 发布前置服务 |

`src/lib/local-catalog.ts` 读取 `import.meta.env.BASE_URL` 下的公共资料；`local-store.ts` 维护本机版本化状态；兼容请求层在浏览器内部处理个人读写。新增行为应通过 IndexedDB 单个 readwrite 事务完成读取、修改和提交，避免多个标签或并发操作丢记录。

所有静态资源必须使用 Vite 基础路径，不要写死 `/content/...` 或部署者用户名。路由使用 HashRouter，GitHub Pages 不提供服务器重写。可用 `PAGES_BASE_PATH=/` 构建根域名部署，默认是仓库项目路径。

`public/content/` 及许可复制件由脚本生成，不提交；真实来源保存在 `data/catalog/`。严禁把浏览器用户备份、`.env`、SQLite 或管理员访问文件复制进 public/dist。

旧后端修改、迁移与独立部署的历史说明见 [server/DEVELOPMENT.md](server/DEVELOPMENT.md)。
