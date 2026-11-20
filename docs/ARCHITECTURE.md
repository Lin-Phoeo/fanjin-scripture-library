# 静态架构

```mermaid
flowchart LR
  Catalog[经典 JSON 与许可] --> Build[构建期校验与简繁规范化]
  Build --> Pages[GitHub Pages 静态文件]
  Pages --> Browser[React 阅读应用]
  Browser --> Local[(浏览器 IndexedDB)]
  Local --> Backup[用户下载的 JSON 备份]
  Backup --> Local
```

公共内容与个人记录有不同存储位置。公共经典属于随站点发布的只读资料；个人阅读进度、书签、摘录、偏好和功课在当前浏览器保存，没有服务器账户或同步任务。

`build-catalog.mjs` 根据显式 manifest 读取来源文件，复用纯内容校验函数，不导入或初始化 SQLite。构建产物包括目录、每部经典详情、检索文本及 4 千余项轻量简繁字映射。OpenCC 在构建期运行，浏览器不需要加载完整转换库。原始古文和出版声明不经过检索规范化改写。

`local-catalog.ts` 按部署基础路径读取公共 JSON。`local-store.ts` 用 IndexedDB readwrite 事务完成原子更新，并验证存储结构。浏览器请求兼容层保留阅读页面使用的业务调用形状，在本地分派操作，不向 `/api` 发送私人数据。

备份格式具有独立版本；导入先完整校验，再一次性替换。本机数据与网站 origin 绑定，不同域名、设备和浏览器资料之间不自动共享。HashRouter 支持 Pages 子路径和刷新深链接。

历史 Express/SQLite 源码仍保存在仓库，单独测试；不会打入当前静态应用的执行链路。历史架构见 [server/ARCHITECTURE.md](server/ARCHITECTURE.md)。
