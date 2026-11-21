# 梵烬 · 本机书斋

公益东方经典阅读与个人自修应用，以佛、道为主，兼读儒家与诸子。当前版本发布到 **GitHub Pages**，是无需服务器、无需注册的静态网站。

经典原文、出处与许可随站点发布；个人书架、阅读进度、书签、摘录、偏好和功课保存在当前设备浏览器的 IndexedDB 中，不上传到项目服务器。不同设备、浏览器或网站域名之间不会自动同步；换设备前请导出备份。

站点地址：<https://lin-phoeo.github.io/fanjin-scripture-library/>。

智能体参与开发前遵循 [AGENTS.md](AGENTS.md)。接续任务查看 [当前状态](docs/agents/STATUS.md)，按任务查找 [文档路由](docs/README.md)；Claude、Gemini 等入口引用同一份规范。

项目以本 GitHub 仓库作为交接来源，不依赖某台电脑的工作区。新接手者克隆 `main` 后按 [开发说明](docs/DEVELOPMENT.md) 准备环境并验收；旧分支、未提交成果的归档及脱敏过程资料见 [开发归档](docs/archive/2026-11-21/README.md)。多工具/多模型联合开发目前暂停，不是恢复项目的前提。

## 使用

- 经藏按学派浏览与分页，支持简繁关键词检索和段落定位。
- 顶栏简/繁切换适配大陆与台湾读者；正文提供底本原文、简体、繁体，机器字形转换明确标注，个人心得不自动转换。
- 阅读器区分原文、古注与现代导读，提供字号、阅读主题、段落书签和摘录。
- 本机书架汇总实际收藏、阅读位置、书签和摘录。
- 个人定课记录每日修读时长与心得，没有活动报名、社区、排行或虚构人数。
- 书斋设置提供完整 JSON 备份导出、备份恢复及本机数据清理；摘录可单独导出。

清除网站数据、无痕会话结束或浏览器存储被回收可能丢失本机记录。建议定期下载备份到自己的文件夹。静态网站不能替你找回删除后的记录，也不提供账号或云同步。

## 本地开发

需要 Node.js >= 22.14，推荐 22 或 24 LTS。

```sh
npm ci
npm run dev
```

打开 <http://127.0.0.1:5173> 即可，**不需要启动 API 或数据库服务**。

```sh
npm run check:docs   # 仅文档：链接、命令与共享智能体入口
npm run check:pages  # 日常：文档、lint、类型、Pages构建、静态数据、本机存储与解析验证
npm run check:release # 发布：上述检查 + 隔离浏览器回归
npm run build:pages  # 输出 dist/，默认基础路径 /fanjin-scripture-library/
npm run test:static  # 目录、简繁检索、IndexedDB并发与备份验证
npm audit --audit-level=moderate
```

完整检查需要 PATH 上可用的 Python 3；首次浏览器验收运行 `npx playwright install chromium`。测试使用自有无头浏览器与临时预览，结束后自动释放，不复用个人 Chrome。环境准备与日常/发布流程见 [开发说明](docs/DEVELOPMENT.md)。

页面使用 Hash 路由，例如 `/#/library`、`/#/read/heart-sutra`，可直接刷新或分享，不依赖服务器重写。

## GitHub Pages 发布

仓库 Settings → Pages → Source 选择 **GitHub Actions**。推送 `main` 或手动执行 `Publish GitHub Pages` 工作流，将构建并发布 `dist/`。工作流根据仓库名设置资源基础路径，不绑定某个 GitHub 用户。

`PAGES_BASE_PATH` 可覆盖基础路径；若迁移到自定义域名根目录，设为 `/`。更换域名会改变浏览器存储作用域，必须先导出、再在新地址导入本机备份。

当前发布不需要 Azure、Docker、Caddy、Nginx、数据库凭据或付费服务器。[部署与备份说明](docs/DEPLOYMENT.md) 包含完整步骤。

## 经典内容

`data/catalog/catalog-manifest.json` 显式列出要发布的经典。当前为67个典籍版本，约373万字；佛教37个、道家/道教27个、儒家3个。《道德经》已补齐81章，旧前32章链接与原文保留。来源、许可、完整出版声明与选定原始 XML 一并公开。未补写古文，也没有将模型解释冒充古注。

```sh
npm run build:catalog
```

构建生成 `public/content/index.json`、逐书 JSON 和静态检索索引；生成物由构建流程重新产出，不包含用户数据。来源未核验、缺许可或重复标识会使构建失败。详见 [内容格式](docs/CONTENT_IMPORT.md)。

## 目录

- `src/`：React 应用、静态目录读取和 IndexedDB 本机数据逻辑。
- `data/catalog/`：公共经典、来源证据与许可。
- `scripts/build-catalog.mjs`、`scripts/build-pages.mjs`：静态数据和 Pages 构建。
- `tests/`：静态目录、本机存储及保留的旧服务端测试。
- `.github/workflows/pages.yml`：免费 Pages 发布。
- `server/`、`deploy/`：保留的历史服务器实现，当前站点不运行这些代码。

文档入口：[docs/README.md](docs/README.md)。旧服务器文档保留在 `docs/server/`，不能用于描述当前纯静态站点的数据保存方式。
