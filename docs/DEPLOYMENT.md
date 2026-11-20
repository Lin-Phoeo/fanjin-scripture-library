# GitHub Pages 发布与个人备份

当前产品由 GitHub Pages 托管静态网页和经典资料，个人数据只存浏览器。不需要应用服务器、云数据库或管理员密码；本文件不授权恢复历史 Azure/Docker 服务。

## 发布链路

仓库的 [Verify](../.github/workflows/check.yml) 处理 pull request，[Publish GitHub Pages](../.github/workflows/pages.yml) 处理 `main` 推送与 `workflow_dispatch`。检查项目与依赖版本以这两份工作流和 [package.json](../package.json) 为准。

1. 仓库 Settings → Pages 的 Source 应为 GitHub Actions。
2. 在已授权发布范围内推送目标提交到 `main`，或手动调度 Pages 工作流。
3. build job 使用 Node 22、Python 3.12，安装锁定依赖与 Chromium，执行 `npm run check:release` 和依赖审计，再上传 `dist/`。
4. deploy job 必须等待 build 成功，使用 `actions/deploy-pages` 发布同一构建产物。
5. 等待**目标提交**对应的部署结果，再核对工作流返回的 URL。当前仓库入口为 [梵烬](https://lin-phoeo.github.io/fanjin-scripture-library/)。

工作流使用 `contents: read`、`pages: write`、`id-token: write`，不需要服务器 SSH 密钥。Pages 部署队列不取消进行中的发布；看到其他提交的绿灯不代表当前提交已上线。`npm run check:pages` 通过、提交成功、推送成功、线上验收通过应分别记录。

PR 与 Pages 工作流执行相同的 `check:release`，包含文档、lint、内容/类型/Pages 构建、静态数据、Python 解析与隔离浏览器检查。检查失败不部署；失败时保留 `test-results/` 为 Actions artifact，期限 7 天。下载 trace 或截图前确认它来自本次目标提交，不把历史报告当作本次成功证据。

## 发布前验证

本地环境、Python/Chromium 首次安装与带基础路径的预览步骤集中在 [DEVELOPMENT.md](DEVELOPMENT.md)。发布前运行完整门禁，并在提交前审计：

```sh
npm run check:release
npm audit --audit-level=moderate
```

日常 `check:pages` 不含浏览器；`test:e2e` 只检查现有 `dist/`。不要绕开最新构建，拿旧产物的浏览器结果批准新代码。纯文档本地任务仍按 `check:docs` 和差异检查处理，CI 发布门禁保持完整。

产物中不能含 `.env`、SQLite、本机 JSON 备份或管理凭据。`server/` 不在浏览器执行链路内；依赖安装仍可能包含历史服务端使用的包，不应因此声称仓库已无服务器依赖。

线上按实际变更抽核：

- 首页和 `#/library` 可加载，静态 JS/CSS/JSON 使用仓库基础路径，不能以 HTML 回退的 HTTP 200 代替成功。
- 书籍详情、真实长篇和 `#/read/:slug/:passageSlug#p-...` 深链可直接打开、刷新并定位；必要时核对简体、繁体、底本原文。
- 内容发布核对 manifest 选中范围、来源/出版声明链接和实际搜索命中，不把资料目录数量当作收录数量。
- 个人功能在隔离浏览器验证，网络中不存在 HTTP `/api` 调用；不覆盖用户真实记录来做线上冒烟。
- 纯文档变更只核部署状态与站点可达性，不重跑无关业务操作。

默认 Pages 基础路径由 `GITHUB_REPOSITORY` 的仓库名生成，本地默认 `/fanjin-scripture-library/`；`PAGES_BASE_PATH=/` 可生成根路径产物，但不能自动完成自定义域名配置。更换域名或 origin 前须向使用者说明导出个人备份。

## 个人备份与站点版本

用户通过“我的 → 数据备份”导出完整 JSON，并自行保管。换设备、浏览器、站点 origin 或清理网站数据前先导出，再在目标环境导入。备份包含私人心得且未加密；个人数据不在 Pages 发布包或 Git 仓库中。

导入是完整校验后的原子替换，不是合并；无效文件不改旧数据。备份范围、外观/语言设置的区别和跨标签取消要求集中在 [DATABASE.md](DATABASE.md)。当前没有云同步或远程找回；普通站点升级不清空本机状态。

公共版本需要回退时，在现有发布授权范围内提交相应回退并重新走同一流水线，保留可追溯提交和来源材料。静态文件回退不会恢复或回退用户的 IndexedDB；不要降低已发布 schema 版本、复用旧 ID 或修改稳定书籍/段落 slug 来模拟回滚。

历史操作材料仅作参考：[server/DEPLOYMENT.md](server/DEPLOYMENT.md)。
