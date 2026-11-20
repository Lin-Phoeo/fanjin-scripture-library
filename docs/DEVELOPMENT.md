# 静态应用开发

当前开发目标是 React + Vite + TypeScript 的纯静态应用，公共资料来自构建生成的 JSON，个人记录来自浏览器 IndexedDB。环境要求 Node.js **22.14.0 或更新版本**、npm 和 Python 3；CI 使用 Python 3.12。以 [package.json](../package.json) 的 `engines` 和脚本为准；不要启动旧 Express API 来满足页面请求。

## 从干净检出启动

```sh
npm ci
npm run dev
```

`dev` 先执行内容构建，再启动 Vite；实际地址以终端输出为准，默认是 `http://localhost:5173/`。首次生成内容需要读取 manifest 中的来源文件。修改经典 JSON、书目清单或构建脚本后重新运行 `npm run build:catalog`；已有 Vite 进程不会自动重建这批生成文件。

首次运行完整检查前，确认 `python --version` 指向 Python 3。`test:parser` 调用的是 PATH 上的 `python` 并附带 `-X utf8`；不能把装有某个解释器误当作该命令已可用。首次运行浏览器回归还需安装仓库锁定版本对应的 Chromium：

```sh
npx playwright install chromium
```

Linux CI 使用 `npx playwright install --with-deps chromium` 补齐系统依赖。该安装属于测试环境准备，不修改用户现用浏览器或要求复用登录会话。

## 命令与检查范围

| 命令 | 用途 |
| --- | --- |
| `npm run build:catalog` | 校验显式书目，生成目录、逐书详情、简繁显示、分片检索与许可文件 |
| `npm run build` | 内容构建、类型检查和默认根路径的 Vite 构建；不是 Pages 子路径验收的替代 |
| `npm run build:pages` | 内容构建、类型检查和 Pages 基础路径的 `dist/` |
| `npm run check:docs` | 检查现行操作文档链接、命令和共享智能体入口，再验证检查器自身回归 |
| `npm run check:pages`、`npm run check` | 日常静态版验收：文档 → lint → Pages 内容/类型/构建 → 静态测试 → Python 解析测试 |
| `npm run check:release` | 完整发布验收：`check:pages` 后运行隔离浏览器回归 |
| `npm test`、`npm run test:static` | 静态目录、本机状态/API、来源清单和简繁规则测试；不启动 HTTP 业务后端 |
| `npm run test:parser` | 使用 Python 3 的 UTF-8 模式验证 CBETA 解析语义，不抓取网络内容 |
| `npm run test:e2e` | Playwright 验证**已有** `dist/`；不自动构建，须先生成与测试基础路径一致的最新产物 |
| `npm run typecheck` | 分别检查应用、Vite 配置及保留的服务端 TypeScript；不启动服务 |
| `npm run lint` | 检查 `src/`、`server/`、`scripts/`、`tests/` 与 Vite 配置 |
| `npm run check:server` | 仅为明确修改旧服务端源码的任务保留，不是静态站运行前提 |

`test:static` 中的内容构建和来源清单测试会读取实际收录资料；状态/API 测试使用 fake-indexeddb 和受控静态文件读取。`test:e2e` 的用例在 [tests/e2e/reading.spec.ts](../tests/e2e/reading.spec.ts)，覆盖 Pages 路由/来源/搜索、简繁与私人数据恢复、320px 阅读与键盘工具。它是持续回归，不代表已穷尽全部浏览器、辅助技术或跨标签场景；按实际改动补证据见 [工程流程](agents/WORKFLOW.md)。

只改文档可运行 `npm run check:docs` 并检查差异，不启动完整构建或浏览器。日常代码改动运行 `check:pages`；发布前或修改核心 UI 流程时运行 `check:release`。若只是重跑浏览器且源码/产物未变，可直接 `test:e2e`，不要重复构建。

Playwright 使用自己管理的无头 Chromium、隔离 context 和临时个人数据，并启动 `127.0.0.1:4178` 的静态预览；不会连接用户 Chrome/CDP，也不会复用已有服务。端口冲突时可使用 `E2E_PORT` 指定未占用的本机高位端口，不停止无关进程。基础路径由 [playwright.config.ts](../playwright.config.ts) 按相同 `GITHUB_REPOSITORY/PAGES_BASE_PATH` 解析，须与 `dist/` 匹配。失败截图和 trace 在忽略的 `test-results/e2e/`。

测试结束由 runner 关闭其 context、浏览器和自建预览。若另行手工启动专用测试标签或服务，也要在验收后关闭这些自己创建的资源；保留用户原有页面、浏览器资料和无关服务。异常中断后先确认资源归属再清理。

## 验证 Pages 构建产物

```sh
npm run build:pages
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort --base /fanjin-scripture-library/
```

打开 `http://127.0.0.1:4173/fanjin-scripture-library/#/`。预览的 `--base` 必须与本次构建相同；自定义仓库名或设置 `PAGES_BASE_PATH` 后同步修改此参数。不要只检查页面 HTTP 200：错误的基础路径可能让 JavaScript URL 回退为 `index.html`。检查静态脚本 MIME、真实页面加载、Hash 深链刷新和网络中没有 `/api` 请求。

默认 Pages 基础路径由 `GITHUB_REPOSITORY` 的仓库名推导；本地未设置时为 `/fanjin-scripture-library/`。根域名产物可用 `PAGES_BASE_PATH=/`，这只影响构建，不自动修改 DNS、Pages 设置或用户数据来源。

## 修改入口与边界

- 功能路由看 [App.tsx](../src/App.tsx)；当前样式入口看 [main.tsx](../src/main.tsx)，只沿用实际加载的三份样式，不因旧文件存在再次叠加样式层。
- 公共内容格式和本机操作见 [API.md](API.md)，模块关系见 [ARCHITECTURE.md](ARCHITECTURE.md)。个人记录修改前读 [DATABASE.md](DATABASE.md)，保留不可变快照、原子恢复和跨标签替换保护。
- 所有静态资料使用 `import.meta.env.BASE_URL`。HashRouter 是 Pages 深链前提；不得以开发服务器回退或遗留 `/api` 代理证明生产可用。
- `public/content/`、`public/content-sources/`、`public/content-notices.txt`、`public/.nojekyll` 与 `dist/` 是生成产物，不手改、不提交。来源文件与审核边界按 [CONTENT_IMPORT.md](CONTENT_IMPORT.md)；用户备份、`.env`、SQLite 不得进入发布目录。
- 当前 `npm start`、`npm run api`、`npm run backup` 和 `npm run import:scripture` 属于保留的服务器路径；本机书斋备份在网页设置页导出，不运行 SQLite 备份命令。

旧服务端操作历史见 [server/DEVELOPMENT.md](server/DEVELOPMENT.md)。发布步骤与对应提交验收见 [DEPLOYMENT.md](DEPLOYMENT.md)。
