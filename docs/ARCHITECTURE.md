# 静态架构

梵烬是 GitHub Pages 上的 React + TypeScript 应用。公共经典由构建产物提供，个人记录保存在当前浏览器；没有应用账号、HTTP 业务后端或跨设备同步任务。产品范围见 [PRODUCT.md](../PRODUCT.md)，入口与部署步骤分别见 [开发说明](DEVELOPMENT.md) 和 [发布说明](DEPLOYMENT.md)。

```mermaid
flowchart LR
  Source[显式书目 manifest 与经典 JSON] --> Build[构建校验 / 简繁转换 / 索引分片]
  Build --> Assets[GitHub Pages 静态资料]
  Assets --> Catalog[按需读取目录 / 单书 / 搜索分片]
  Catalog --> React[React + HashRouter]
  React --> Adapter[浏览器内部 apiRequest 分派]
  Adapter --> Local[(IndexedDB 本机状态)]
  Local --> Backup[用户下载的版本化 JSON]
  Backup --> Validate[完整校验 / 原子替换]
  Validate --> Local
```

## 构建与公开内容

[scripts/build-catalog.mjs](../scripts/build-catalog.mjs) 只读取 `data/catalog/catalog-manifest.json` 明确选中的书目，复用 [内容校验函数](../server/validation.ts)，不导入数据库模块或初始化 SQLite。源文件、许可审核及发布范围按 [内容导入](CONTENT_IMPORT.md) 和 [来源登记](CONTENT_SOURCES.md) 管理；不能把来源目录内的全部文件视为已发布内容。

构建生成目录 `content/index.json`、逐书详情 `content/books/`、搜索清单 `content/search.json`、逐书搜索分片 `content/search/`、轻量显示映射 `content/display-maps.json`，并复制完整许可及可分发来源文件。格式与版本见 [API 契约](API.md)。这些 `public/` 产物不手改、不提交。

OpenCC 在构建期生成 `contentSc/contentTc` 与标题字形；`originalText` 和原始出版声明保持原样。`scriptVariants` 标明来自输入资料的字形或机器转换。浏览器以预生成正文显示简体、繁体或底本原文，界面使用字符映射与台湾常用词汇，不加载完整 OpenCC 运行库；机器转换不等于人工校勘。

## 浏览器模块边界

| 模块 | 职责 |
| --- | --- |
| [App.tsx](../src/App.tsx) | HashRouter 路由和懒加载页面；旧登录、管理、社区入口仅作重定向 |
| [main.tsx](../src/main.tsx) | 语言与主题初始化；实际加载 `design-system.css`、`reading-tools.css`、`settings.css` |
| [local-catalog.ts](../src/lib/local-catalog.ts) | 按 `BASE_URL` 获取公共 JSON，校验目录/详情，检索与有界内存缓存 |
| [api.ts](../src/lib/api.ts) / [local-api.ts](../src/lib/local-api.ts) | 保留页面使用的 `/api/...` 调用形状，在浏览器内分派读写；不是网络接口 |
| [local-store.ts](../src/lib/local-store.ts) | IndexedDB 事务、备份结构校验、替换代次和跨标签通知 |
| [i18n.ts](../src/lib/i18n.ts) / [reading-preferences.ts](../src/lib/reading-preferences.ts) | 界面语种、阅读字形和外观；不改私人心得、草稿与快照 |
| [AppStateContext.tsx](../src/context/AppStateContext.tsx) | 本机书斋资料与收藏/摘录状态；兼容编号和 token 不代表登录或授权 |

图书详情最多保留 5 个、搜索分片最多保留 8 个内存缓存项；失败条目移出缓存以便重试。搜索先按公开目录、分类、字段和 Bloom 过滤器选分片，再每批最多并行读取 3 片，保留稳定顺序并在批次间检查取消。取消会停止后续批次，不承诺中断已共享的在途静态请求；没有 Service Worker 离线包或后台同步。

## 阅读定位与私人记录

链接以完整的 `scriptureSlug + passageSlug` 定位，适配 Pages 的仓库基础路径与 HashRouter。连续阅读的章节分组是兼容显示层：见 [chapter-groups.ts](../src/lib/chapter-groups.ts) 和 [ReaderPage.tsx](../src/pages/ReaderPage.tsx)。带 `--` 的 slug 按前缀分组；无此前缀且不超过 20 段的书合为全文；其余按段分组。它不是独立的章节数据库模型，不改变段落身份。

本机状态通过 IndexedDB 单事务更新。备份导入/清空递增 `replacement-epoch`，并通知其他标签停止旧写入；界面还需取消未发出的进度防抖和关闭旧编辑器。详细约束集中在 [本机数据](DATABASE.md)，不能以“已通知刷新”代替迟到写入保护。

历史 `server/`、`deploy/` 和 [服务器架构](server/ARCHITECTURE.md) 仅供明确涉及旧实现的任务参考。不要根据这些文件恢复服务器或把它们作为静态站运行前提。
