# GitHub Pages 发布与个人备份

当前版本由 GitHub Pages 免费托管静态网页和经典资料，个人数据仅存浏览器。无需服务器、数据库、域名或管理员密码。

## 发布

1. 在仓库 Settings → Pages 将 Source 设为 GitHub Actions。
2. 推送 `main`，或在 Actions 手动运行 `Publish GitHub Pages`。
3. 工作流安装依赖、运行静态版本验收、审计依赖、上传 `dist`，随后调用 Pages 部署。
4. 以 Actions 部署输出的 URL 为最终地址。当前仓库对应 <https://lin-phoeo.github.io/fanjin-scripture-library/>。

工作流具备 `contents:read`、`pages:write` 和 `id-token:write`，不需要额外服务器密钥。默认基础路径根据 `GITHUB_REPOSITORY` 的仓库名生成。构建包只包含前端和所选公共资料，不包含 server、SQLite 或个人备份。

## 本地验收

```sh
npm ci
npm run check:pages
npm audit --audit-level=moderate
```

`npm run build:pages` 默认生成 `/fanjin-scripture-library/` 路径。如需自定义根域名设置 `PAGES_BASE_PATH=/`。Hash 路由可以直接打开和刷新；站点不依赖 `/api` 请求或后端进程。

## 个人数据备份

在书斋设置导出完整 JSON 备份，保存到自己控制的文件夹。换浏览器、设备、站点域名或清理网站数据前先导出，再在目标浏览器导入。备份包含私人心得，分享文件会同时分享这些内容。

导入会校验格式版本、数据类型、记录唯一性及计划关联，校验失败不会替换现有数据。有效备份恢复采用 IndexedDB 单事务，不能部分覆盖。恢复方式以界面确认说明为准；不要用文本编辑器手工改计数器或记录 ID。

当前不提供云同步或远程找回。浏览器数据被清理、隐私窗口关闭、设备损坏或存储被回收时，只有已经导出的备份能用于恢复。普通站点代码升级不清空本机书斋；域名和浏览器用户资料变化则会进入不同存储空间。

## 公共内容与回滚

修改 `data/catalog/` 后通过正常 Git 提交和 Pages 构建发布。构建严格按 manifest 选书，检查来源许可，保留原始出版声明。撤销前端或公共内容版本可回退 Git 提交重新部署，不操作用户本机数据库。不要在回滚中减小已发布的本机数据 schema 版本或重用旧标识。

历史 Azure/Docker 操作材料仅为保留参考：[server/DEPLOYMENT.md](server/DEPLOYMENT.md)。当前发布不执行那些脚本。
