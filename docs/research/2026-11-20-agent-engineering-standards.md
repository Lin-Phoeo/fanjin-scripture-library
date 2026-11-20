# 两篇原文的工程规范落地

## 任务与范围

用户要求将适合本项目的工程约定持久化，让 Claude、Codex 等智能体接手时可遵循，并明确要求复用已有 DSH 原文工具。此次只改工程文档、入口及关联导航，保持已经认可的产品和页面。

## 原文证据

2026-11-20 使用现有 `do.sh linuxdo`，分别读取两篇主题的第1楼：每篇1次正文请求，HTTP 200，manifest 显示完成且无缺失。工具创建专用标签，固定标签读取；没有逐楼刷新用户正在阅读的页面，没有改造抓取器。

| 来源 | 已读取范围 | 核对结果 |
| --- | --- | --- |
| [【vibe coding教程】如何正确的开始vibe coding](https://linux.do/t/topic/2993279)，往事随风k（gpt1） | 楼主首帖完整 Markdown，15,414 bytes | 涵盖先复用、先对齐、项目文档、按需读写、跨模型接续和持续改进；作者明确声明为个人观点 |
| [Vibe Coding美化方案参考](https://linux.do/t/topic/3202326)，卖女孩的小火柴（serenalee） | 楼主首帖完整 Markdown，4,512 bytes | 27个设计参考站点，按整站、局部、实现和其他风格分类；与本项目此前缓存逐字节一致 |

此次不宣称读遍整个评论区，也没有遍访第二篇的全部27个站点。标题、作者与首帖范围可在主题页面复核；首帖中的配图不纳入文字规则提取。论坛经验与示例提示词不代替平台官方行为或本项目用户决定。

第一篇另用同一工具指定读取作者的 [第10楼](https://linux.do/t/topic/2993279/10)、[第25楼](https://linux.do/t/topic/2993279/25)、[第33楼](https://linux.do/t/topic/2993279/33)：补充强调更新过时文档、按需读取、项目结构不必照搬。定期集中整理是作者个人做法，本项目没有据此新增定时任务或要求全量读取历史。

完整原文及抓取 manifest 仅保存在本地忽略目录：

- `output/research/agent-standards/2993279/raw-1.md` 与同目录 `manifest.json`。
- `output/research/agent-standards/3202326/raw-1.md` 与同目录 `manifest.json`。

新克隆不包含上述缓存。原文文件的 SHA256：

```text
2993279 C2439390A76C36628BB9DFB8397246EF68724045D4F4AEF8B6DA2B5D3C49F084
3202326 8866BFD3CE9763973F6D8EEBF82CEC1EDE37F6C7CB68DBD467AB46685762DD79
```

## 采用与项目化处理

| 原文建议 | 本项目落地 | 适用边界 |
| --- | --- | --- |
| 先寻找成熟项目与工具，避免重复建设 | 先检查仓库代码、依赖及已有 DSH 链路，再考虑新依赖 | star 数只作线索；核维护、许可、真实收益及静态架构适配 |
| 开工前充分讨论、确定阶段方案 | 多步骤任务先明确交付物、边界和可观察验收条件 | 用户已授权常规自主推进，不把原文的反复问询提示词变成审批要求 |
| 基础文档帮助不同模型接手 | AGENTS 共享规则、智能体短入口、文档路由、当前状态 | 原文允许沿用等价文件，不机械创建所有建议文件名 |
| 索引、命中片段、必要上下文逐级读取 | 写入 AGENTS 的读取顺序与停止条件 | 适用规则完整阅读；证据不足时扩大，不为省上下文断章取义 |
| 每类事实唯一、当前状态直接修订 | 产品/设计/架构/步骤沿用既有权威文档 | 不新建平行事实副本，不用追加日志堆积相互矛盾的快照 |
| 区分代码、测试、验收和发布 | 验收矩阵与状态页分别记录实际观察 | 历史通过、脚本存在和子代理结论不自动等于当前验证成功 |
| 从真实任务与返工改进规范 | 有价值的问题、根因和验证写研究/实施记录 | 不收集无关聊天或私密记录，不编造用户满意度数据 |
| 整站、局部、实现分层找设计参考 | 已认可整站优先做局部改进；具体任务再查相关案例 | 设计帖是资源目录，不是要求更换技术栈或安装全部组件库 |
| 从 demo/源码理解实现 | 查源码与许可，再结合手机、键盘和性能验证 | 不复制装饰性动效、品牌素材或付费组件，不以效果替代阅读功能 |

第一篇的前后端描述、模型排名和个人模型选择不作为本项目技术事实；本项目业务逻辑可在浏览器本机运行，不因此恢复服务器。其示例中的“只处理文档、不提交”等限制属于作者示例任务，不能覆盖用户在本会话给出的实际授权。第二篇未提出 AI 聊天、隐蔽画像或个性化建议的工程规范，不将这些需求归到作者名下。

## 文件职责

| 原文中的职责 | 本仓库承载位置 |
| --- | --- |
| 长期工程规则 | [AGENTS.md](../../AGENTS.md) |
| 项目定位与条件路由 | [README.md](../../README.md)、[docs/README.md](../README.md) |
| NOW：当前目标与接续 | [STATUS.md](../agents/STATUS.md) |
| MAP：模块、数据、部署关系 | [ARCHITECTURE.md](../ARCHITECTURE.md)、[DATABASE.md](../DATABASE.md)、[DEPLOYMENT.md](../DEPLOYMENT.md) |
| RUNBOOK：操作与验收 | [DEVELOPMENT.md](../DEVELOPMENT.md)、[工程流程](../agents/WORKFLOW.md)、[内容导入](../CONTENT_IMPORT.md) |
| 决策与风险 | [PRODUCT.md](../../PRODUCT.md)、[DESIGN.md](../../DESIGN.md) 及对应专题文档；当前阻塞进入状态页 |
| 有价值的历史证据 | 现有 `docs/research/`、实施记录；按问题检索，不新增操作流水账 |

关联修正：内容来源文档原来顶部写新范围、下文却保留旧32章和服务器导入流程；本次统一标明当前静态入口与历史范围，并补齐完整来源发布、简繁派生及含注版本的说明。没有改变经典数据。

## 智能体入口与限制

所有入口指向 AGENTS，只有这一份共享规则；工具入口文件不重复粘贴规则正文。

| 工具 | 仓库入口 | 行为边界 |
| --- | --- | --- |
| Codex | 根目录 `AGENTS.md` | 按工具的目录规则发现；更深层规则或环境配置仍可能影响最终上下文 |
| Claude Code | 根目录 `CLAUDE.md` 的 `@AGENTS.md` | 使用文件导入语法；保留短入口以兼容以 CLAUDE 为入口的版本 |
| Gemini CLI | 根目录 `GEMINI.md` 的 `@./AGENTS.md` | 使用其 Markdown 文件导入能力 |
| Cursor | 根目录 `AGENTS.md` | 采用原生项目规则入口，不另建重复 `.mdc` 副本 |
| GitHub Copilot | `.github/copilot-instructions.md` | 明确要求读取 AGENTS；Markdown 链接不等于正文自动内联，支持范围随客户端而异 |

入口机制依据官方文档核对；没有分别启动全部编码客户端执行任务，也不保证任何模型绝不偏离指令。若客户端关闭项目指令或不支持这些入口，应显式要求它读取根 AGENTS；不要通过关闭安全机制解决加载问题。

官方依据（核对日期2026-11-20）：

- Codex：[官方仓库指令加载实现](https://github.com/openai/codex/blob/main/codex-rs/core/src/agents_md.rs)，通过 Context7 官方仓库索引核对；同目录的 `AGENTS.override.md` 可影响所选文件。
- Claude Code：[Memory 文档](https://code.claude.com/docs/en/memory)，通过 Context7 官方文档索引核对文件导入。
- Gemini CLI：[GEMINI.md 文档](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md)、[文件导入说明](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/memport.md)，通过 GitHub 连接器读取官方原文。
- GitHub Copilot：[客户端支持矩阵](https://docs.github.com/en/copilot/reference/custom-instructions-support)、[CLI 指令说明](https://github.com/github/docs/blob/main/content/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions.md)，通过 GitHub 连接器读取官方 docs 仓库原文。CLI 支持的直接导入不能泛化到全部 IDE。
- Cursor：[Rules](https://cursor.com/docs/rules)、[CLI 使用说明](https://cursor.com/docs/cli/using)，通过 Context7 官方文档索引核对。

官方站点直连读取受当前网络解析限制，改用上述官方仓库原文或官方文档索引，没有把搜索摘要当作已读原文。所有支持说明均是当前文档所述能力，不是对任意旧客户端的保证。

## 验证范围

本次是文档改动。检查范围为新旧差异、关联相对路径、工具入口与共享文件的引用、示例 npm 命令存在、内容说明与 manifest/构建代码一致，以及未纳入原文缓存、秘密或个人设备路径。提交前依赖审计无漏洞。

没有为文档启动应用、修改依赖或重跑本地业务测试；本次不把先前产品验收数字当作新的结果。推送后由仓库已有 Pages 工作流执行其构建与静态回归，是否发布成功以对应提交的 Actions 结果为准。
