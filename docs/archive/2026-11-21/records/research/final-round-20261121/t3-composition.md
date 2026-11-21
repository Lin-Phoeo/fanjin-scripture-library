> 历史研究/过程记录（已脱敏）；不是当前任务或执行授权。以仓库 STATUS 和现行工程规范为准。

# T3 组合的核对结论

核对日期：2026-11-21。依据 T3 Code `v0.1.11` 固定标签原文及源码；本节只证明发布文档和接口已存在，没有安装 T3、登录账号或发出编码模型请求。

## 结论

**T3 Code + Codex CLI + Claude Code + OpenCode 可以作为用户长期统一工作台的首选候选，不能写成“已经落地可用”。** 其优势不是把模型图标放在一起，而是已有实例级配置、指定实例委派、工作树和结果生命周期接口。首次落地只启用两个已兼容渠道及两个工作者，先验证再加第三种运行时。缺少原生 CLI 登录或只有任意 OpenAI-compatible API 时，优先验证 OpenCode 的原生 provider 配置，不能假设该端点也兼容 Codex/Claude。

## 精确选择渠道

`orchestrator_capabilities` 返回实例与模型能力。内部 `delegate_task` 的 `target` 支持 `providerInstanceId`、`model`、`options`、`environmentId`、`projectId`；优先显式指定实例及模型，不能仅给 `driverKind`。指定实例不可用会失败；只指定另一个 provider、不指定模型则取其首个公告模型，这不适合可复现试点。依据：`orchestratorMcp.ts:98`、`orchestrator-mcp-server.md:248`。

官方安装文档 `install.md:241` 明确每个实例可有独立环境变量，例如 API key 与自定义 base URL，秘密值可标为 sensitive。但这说明配置承载能力，**不证明所有转售端点兼容运行时协议、工具调用和长输出**。

Claude：`providers-claude.md:9–41` 支持独立 `CLAUDE_CONFIG_DIR`，只变 API key/endpoint 的预设可用实例环境变量。独立目录同时隔离会话；已有线程只在相同配置目录的实例间切换。不应改 `HOME`，也不应把变量赋值塞进 Launch arguments。

Codex：`providers-codex.md:72–107` 的完全独立 `CODEX_HOME` 隔离配置与会话，不能延续另一 home 的线程。shadow home 则共享配置和会话、只区分登录与可用模型；**不能把 shadow 当多端点配置隔离**。不同端点组合应选独立 home，并为每个任务传完整上下文。

OpenCode：原生 catalog 以 `providerID/modelID` 标识模型（`OpenCodeRuntime.ts:259–280`），T3 按项目读取 provider catalog，子进程接收实例环境（同文件 `:514–520`、`:621–631`）。因此可由原生 OpenCode 配多个渠道，再从真实 catalog 选择；密钥/endpoint 是本地配置项，任务正文只写实例代号。外部 Server URL 的服务有自己的配置和环境生命周期，不能假设修改 T3 环境就已更新外部服务器。

## 隔离与调用边界

本地 `delegate_task` 默认 `shared`，会使用父 checkout。两个实现者必须显式 `isolation: "worktree"`；父节点未提交改动不会复制过去。跨机器 `target.environmentId` 的 delegate 在远端项目 checkout 执行并拒绝 worktree 隔离，应改用 `t3_thread_launch` 的远端 `workspaceStrategy`，不可照搬本地委派参数。依据：`orchestrator-mcp-server.md:257–261`。

`delegate_task` 要求 MCP 凭据对应的活跃 T3 父运行。外部 Codex/Claude MCP 客户端应使用 `t3_thread_launch`、`t3_thread_wait/read`，不能把“工具列表可见”当作内部 delegate 可调用。依据：`outside-agents.md:83–95`、`orchestrator-mcp-server.md:279`。因此若坚持留在当前 Codex App，需要外部线程接口的整合流程；在 T3 内发总任务的路径更直接。

## OpenCode 版本边界

`providers-opencode.md:5–21` 要求 1.x 至少 `1.14.19`，标记 Limited support；支持 2.x 至少 `2.0.18`。2.x 是另一个包 `@opencode/cli`，首次运行转换共享数据库，官方明确不要在同一机器并行运行 1.x 与 2.x。T3 更新按钮不会自动跨大版本。试点应固定一个版本，备份后单向迁移，不能同时安排两个版本充当不同工作者。

## 最小验收

两个渠道分别完成只读探针后，主控向两个独立 worktree 下发不同文件的任务；核对实例代号、配置 home、工作目录、关联任务、模型 catalog 和错误归属。随后取消一个自建长任务，验证子进程退出与工作树保留；集成者审查两个差异并跑同一提交的项目门禁。只有这条链路通过，才将该组合从“首选候选”升为“日常默认”。本轮未执行该验收，不承诺加速倍数。

## 可追溯来源

公开入口以固定 tag 为准：

- [安装与实例环境](https://github.com/pingdotgg/t3code/blob/v0.1.11/docs/user/install.md)
- [Codex home](https://github.com/pingdotgg/t3code/blob/v0.1.11/docs/user/providers-codex.md)
- [Claude 配置目录](https://github.com/pingdotgg/t3code/blob/v0.1.11/docs/user/providers-claude.md)
- [OpenCode 版本与服务](https://github.com/pingdotgg/t3code/blob/v0.1.11/docs/user/providers-opencode.md)
- [外部代理](https://github.com/pingdotgg/t3code/blob/v0.1.11/docs/user/outside-agents.md)
- [委派语义](https://github.com/pingdotgg/t3code/blob/v0.1.11/docs/orchestration-v2/orchestrator-mcp-server.md)
- [目标契约](https://github.com/pingdotgg/t3code/blob/v0.1.11/packages/contracts/src/orchestratorMcp.ts)

本地 source 清单：`t3-sources/verified-source-map.json`。7 个原文在线读取成功；4 个快照字节哈希相同，另外3个仅末尾多空行，精确 tag 原件以 `v0.1.11-` 前缀另存，不覆盖已有证据。
