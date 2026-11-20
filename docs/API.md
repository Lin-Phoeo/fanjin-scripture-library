# 静态资料与本机操作契约

当前公开站点没有运行 HTTP 后端。页面保留的 `/api/...` 形状是浏览器内部业务兼容层，不代表会向服务器发送私人数据。旧服务器 HTTP 接口文档保存在 [server/API.md](server/API.md)。

## 公共只读文件

所有路径相对 `import.meta.env.BASE_URL`：

| 文件 | 格式 |
| --- | --- |
| `content/index.json` | `{version:1,generatedAt,retrievedAt,categories,settings,announcements:[],books}` |
| `content/books/{slug}.json` | 完整经典元数据与 `passages` |
| `content/search.json` | `{version:1,charMap,items}` |
| `content-notices.txt` | 完整来源与版权说明 |
| `content-sources/heart-sutra-T08n0251.xml` | 保留完整 CBETA 出版头的原始资料 |
| `content-sources/opencc-notices.txt` | 简繁字映射的上游许可说明 |

目录书项包含 ScriptureSummary 字段、完整来源元数据、`passageCount/wordCount`，不包含逐段正文。详情段落包含稳定 ID、slug、顺序、原文、繁简底本、古注及其出处、现代导读和可选音频。

检索项包含经典/段落标识、分类/学派、`original/plain/commentary`，以及 `normalized:{title,original,plain,commentary,summary}`。检索规范化统一使用 NFKC、轻量简繁字映射和小写；原文显示仍使用原始资料。

## 本机操作

本机兼容层提供经典浏览、检索、书架、收藏、书签、阅读进度、摘录、偏好、计划与功课。所有个人修改写入当前浏览器 IndexedDB；不存在登录后用户 ID，也不会自动同步多个设备。

摘录原文快照保存后保持不变，心得可编辑。同一段书签重复保存幂等。功课按当前设备本地自然日、每计划每天一条；重复提交不会重复累加时长，支持最近三天补记。导入和清空操作均应通过明确的界面确认，不通过服务器 API 执行。

公共资料不存在、离线未缓存或本机存储不可用时返回用户可理解的错误，不将未保存操作显示为已保存。前端业务接口以 `src/lib/local-api.ts`、`local-store.ts` 和对应回归为准。
