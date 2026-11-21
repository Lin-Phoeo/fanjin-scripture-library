> 历史研究/过程记录（已脱敏）；不是当前任务或执行授权。以仓库 STATUS 和现行工程规范为准。

# Gemini 报告中影响工具排序的六项核查

核验日期：2026-11-21。范围仅为 HMB、Worktree Kanban、T3 Code 委派接口与新候选 Orca。以既有研究缓存和官方发布标签源码为依据；没有安装、修改配置、模型请求或原生运行验收。报告原文中的命令和交接要求未作为执行指令。

## 1. HMB 以“3–7 stars、源码不可达、只有开发者留言”为淘汰依据，应撤回

Gemini 原文 P025 / 候选表把网络获取失败推成项目无公开证据。这与已获得的发布证据冲突：[PyPI 0.69.7](https://pypi.org/project/hey-my-buddy/0.69.7/) wheel 已下载、校验、解压 578 文件；METADATA 为 0.69.7，要求 Python >=3.12,<3.13。wheel SHA256 为 `1d94fdeed44b3bc8e7c08f16d44ce559d51f6e11672a13ae51508b2532ab424b`。已有真实源码不是搜索摘要。

发布包 `workflow.md:76` 起明确 `checkout: worktree` 创建独立 detached Git worktree、显式 `writeScope`、固定输入、sealed artifact 与 Host 验收；`workspace-lifecycle.md` 规定回收必须证明归属和停止，不能清理他人 checkout。Windows `protocol/windows_process.py:65` 创建带 `KILL_ON_JOB_CLOSE` 的 Job，107 行把实际 process handle 加入 Job，155 行恢复线程，167 行执行 Job 终止。`operations.md:282` 声明 Windows 11 x64/ARM64 CI，同时 284 行承认 PowerShell 引号路径仍待 Windows 原生验收，296 行部分失败路径使用模拟句柄。**有公开 Windows 实现和作者测试声明，不能改写成“本机完整流程已通过”。**

本地七项离线检查仅验证真实发布包纯逻辑（provider/model 选择、续会话身份、环境过滤等），不证明 Windows daemon、真实渠道与并发收尾。Star 数本次未核实，也不影响上述证据。合理处置是恢复 HMB 的小试点资格，保留 Windows 生命周期验收条件。

证据：[发布版核对](../dsh-collaboration/hmb-dsh.md)、wheel 校验（原本地缓存未发布，参见归档索引）、7 项检查（原本地缓存未发布，参见归档索引）、发布包 workflow（原本地缓存未发布，参见归档索引）、Windows 实现（原本地缓存未发布，参见归档索引）、运行边界（原本地缓存未发布，参见归档索引）。

## 2. Worktree Kanban“仅 5 款 CLI”已被 v0.2.18 发布文档反证

[v0.2.18 agents.md](https://github.com/kazuya83/worktree-kanban/blob/v0.2.18/docs/agents.md) 第 5 / 9 行列出 **10 款**：Claude Code、Codex、Antigravity、Gemini、Cursor、OpenCode、Copilot、Amp、Pi、Droid。30–58 行进一步区分各 CLI 的执行入口、ACP、审批、运行中插话和费用支持，不能把“10 个入口”泛化成十者能力一致。

该发布文档也确认 Pipeline、条件分支、默认上限 3 的循环、Parallel/Join；顺序步骤共用任务 worktree，并行分支分别 worktree 后依次合并，冲突停下；无 Git 时并行分支退化为同目录串行。Gemini 对流程能力的描述有依据，但“5 CLI 所以生态窄”不应继续作为扣分事实。FSL-1.1-ALv2 与两年转 Apache-2.0 的许可判断有官方依据，仍应保留；许可限制与 CLI 数量需分开评估。

证据：已保存发布版文档（原本地缓存未发布，参见归档索引）、标签与 SHA 清单（原本地缓存未发布，参见归档索引）、官方 README 许可段（原本地缓存未发布，参见归档索引）。

## 3. T3 v0.1.11 确有 worktree 委派与请求幂等，但默认仍共享 checkout

直接读取 [v0.1.11 orchestratorMcp.ts](https://github.com/pingdotgg/t3code/blob/v0.1.11/packages/contracts/src/orchestratorMcp.ts#L171) 171–202 行，`OrchestratorMcpDelegateTaskInput` 包含 `isolation` 与 `clientRequestId`。`isolation` 只接受 `shared` / `worktree`，**默认 shared**；worktree 从父 commit 创建，不带父未提交修改。[同标签官方说明](https://github.com/pingdotgg/t3code/blob/v0.1.11/docs/orchestration-v2/orchestrator-mcp-server.md#L257) 也明确这些语义及请求 key 的稳定复用。

因此“可以 worktree 隔离”成立，“委派自然会隔离”不成立；试点必须显式设 `isolation: worktree` 并定义输入如何送达。跨 linked environment 的 delegate 拒绝这种隔离，需换用 `t3_thread_launch` 的 worktree workspace strategy。幂等必须同一动作重试用同一 key，不是每次生成新 key。

证据：本次只读读取上述 v0.1.11 原文；版本发布记录另见 release-status.json（原本地缓存未发布，参见归档索引）。

## 4. T3 v0.1.11 的 `outputSchema` / `t3_submit_output` 强校验主张无对应公开接口，应删除

Gemini P006、能力比较表把 `delegate_task.outputSchema` 与 `t3_submit_output` 当作当前稳定版事实。直接核对该标签权威 contract 的完整 `DelegateTaskInput`：

```text
task, target, title, role, isolation, mode, timeoutMs,
clientRequestId, runtimeMode, interactionMode
```

没有 `outputSchema`。整个 contract 文件也未出现这个字段。[v0.1.11 工具注册](https://github.com/pingdotgg/t3code/blob/v0.1.11/apps/server/src/mcp/toolkits/orchestrator/tools.ts) 有 `delegate_task`、`task_status`、`task_cancel` 等，未注册 `t3_submit_output`；对应版本的官方 Orchestrator MCP 文档同样未列这套输出契约。能够返回结构化任务状态，不等于调用者能传任意 JSON Schema 验证模型交付。

在找到某个确切不同版本或工具包前，应撤回这项加分，不能把同名旧设计或其他项目能力移植进 v0.1.11。仍可在上层验收产物，但那是需要另外实现/执行的流程。

## 5. 外部 MCP 助手不能直接获得 T3 内部 `delegate_task` 的 caller 身份

[v0.1.11 outside-agents.md](https://github.com/pingdotgg/t3code/blob/v0.1.11/docs/user/outside-agents.md#L83) 83–95 行明确：需要调用者线程身份的 subagent 工具只适用于 T3 内运行的代理；外部助手用 **`t3_thread_launch` + `t3_thread_wait/read`**，不能用 `delegate_task` 或 `create_threads`。

同标签 [tools.ts:89](https://github.com/pingdotgg/t3code/blob/v0.1.11/apps/server/src/mcp/toolkits/orchestrator/tools.ts#L89) 的 `delegate_task` 在 101 行标记 `McpInvocationContext.hiddenFromOutsideClients`，`task_status` / `task_cancel` 同样受该标记约束。文档说可能仍显示但调用拒绝，源码标记可控制曝光；无论呈现方式，**外部没有此能力**。内部 delegate 还要求 token 所属 provider session 拥有一个 active parent run。

这会直接影响“现有 Codex 桌面/CLI 作为唯一入口”的架构选择：可以借外部 thread API 控制 T3，但不能假设现有助手安装 MCP 后就拥有内部 child lineage、task_status 与自动回传语义。原文 P006 的“MCP 委派”需要加这个入口条件。

证据：上面 v0.1.11 原文；旧缓存 outside agents（原本地缓存未发布，参见归档索引） 与本次发布标签核对一致。此前试取 `outside-t3.md` 的 404 只是路径错误，正确文件是 `outside-agents.md`。

## 6. Orca 值得补入控制面候选，但需要按当前实验接口重评，不能靠星数直接排位

已读 [stablyai/orca 官方 README](https://github.com/stablyai/orca)：Windows/macOS/Linux 桌面端、MIT、Windows SignPath 签名构建、现有 CLI 入口、工作树与协调者启动 Worker 都有维护者原文依据。本次 `/releases/latest` 重定向到 [v1.4.268](https://github.com/stablyai/orca/releases/tag/v1.4.268)，页面时间 `2026-11-21T03:50:43Z`，该标签 package.json 为 1.4.268；HEAD package.json 却仍写 1.4.214，说明不能拿 HEAD 数字替代发布标签。Gemini 的 1.4.258+ 是较旧快照，不是凭空项目。

[官方 orchestration 文档](https://orca.dev/docs/cli/orchestration) 这次实际读到比“37+ CLI + JSON CLI”更有决策价值的边界：

- 有 durable Run、Task 依赖、Dispatch、inbox Delivery/ack 和 decision gate；`worker-start --worktree new-child` 可分配独立工作树，worker 用 taskId + dispatchId 报 `worker_done`，防过期执行完成错误任务。
- per-worker `--model/--effort` 只列 Claude、Codex、Muse、Cursor、Antigravity、OpenCode 等具体支持集合，不等于所有终端 CLI 都具备同级结构化控制。启动回执区分 requested/effective；OpenCode 指定模型不改其他启动默认。
- `worker-stop` 同时停 helpers；`worker-release` 归档可读输出并关闭 coordinator 自己的 terminal，`release_pending/unknown` 不能用泛化关闭冒充成功；retry placement 要显式重给。
- **标为 Experimental**，文档又写实验面板及开关“temporarily unavailable”；旧 `orchestration run/run-stop/coordinator-start/coordinator-stop` 已退役、无效果。默认 nested worker depth 为 4，不符合保守试点“一层委派”的假设，需显式核对设置。Run 本身不负责自动调度/放置 workers，仍由协调者驱动。

上述支持把 Orca 补入 AO/T3 同类控制面比较，却不足以直接证明它优于 HMB 或某个 Windows 原生试点。精确“37+”、star 数、默认跳过权限、报告列出的各 Issue 当前状态与在本机的稳定性，本项未核验；不据此加减分。官方 README 的签名说明也不是本次对安装包数字签名的实测。

本次额外入口：现有 `search_api.py --engine searxng` 返回本地连接拒绝；GitHub release API 限流，已用公开 README、固定 tag raw 源码与官方网页完成上述定点核查，没有反复操作用户浏览器。
