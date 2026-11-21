> 历史研究/过程记录（已脱敏）；不是当前任务或执行授权。以仓库 STATUS 和现行工程规范为准。

# HMB 与 AO 组合的最后核对

核验日：2026-11-21。对象为已下载的 HMB 0.69.7 真实 PyPI wheel、AO v0.15.3 固定标签文档及已保存的 Issue 正文；本轮只读核对，没有安装、发模型请求、改账户或启动服务。

## HMB：跨 CLI 成立，不应自动解释为任意多端点实例池

**可以推荐「现有 Host + HMB + 不同原生 CLI + worktree + 独立验收」；若需求是同一 Codex/Claude 同时接三个 API 商家，不能仅凭 buddy 的 provider 字段承诺已实现。**

- Codex 的 `harnesses/codex/config.py:14` 从 `config/read.model_provider` 取当前 provider；`native_run.py:2010–2036` discovery 读取它并交给 `_catalog`，`529–579` 将本次 model/list 放进一个 provider bucket。默认发现流程没有遍历所有 `model_providers`。
- **执行确实传 provider，不能说它完全不支持 provider 选择。** `native_run.py:755/764/795/845` 给 thread/start 或 resume 传 `modelProvider=requested.provider`，并检查回读；但发现和可派发目录是另一层。`blackboard/catalog/catalog.py:486` 按 harness/provider/model 查目录，缺失/不可用拒绝；`tasks/workflow.py:2553` 还要求用户启用该 buddy。因此，“协议允许传 modelProvider”不足以证明标准 Host 流程已经提供同一 harness 多 home/多端点实例注册。
- Claude 的 `harnesses/claude/native_run.py:155–193` 用 initialize.account.apiProvider 建一个 bucket；`claude/config.py:87–135` 执行参数有 `--model`、可选 `--effort`，没有每任务 endpoint、配置目录选择参数。这里的 provider 是当前原生账户事实，不是任意商家切换器。
- `harnesses/discovery.py:364–397` 保留 CODEX_HOME、CLAUDE_CONFIG_DIR、DSH_HOME、代理与 CA 路径，过滤调用 shell 的 API key/endpoint 环境变量。它支持继承选定环境，**不等于每个任务拥有独立的渠道环境映射**。不能为接商家而临时反复改全局环境，或承诺 Host 的 key 会自动传给 Worker。

稳妥组合是 Codex 当前原生渠道 A + Claude 当前原生渠道 B；模型和 effort 取刷新后的可用目录。需要大量 API 渠道时，优先评估明确声明多个 provider 的 DSH/OpenCode 路径，或先验证平台实例隔离能力。

## DSH：有明确的 session 级多渠道声明与选择

同一 wheel 的 `harnesses/dsh/native_run.py:1778–1815` 从 ACP configOptions 的 JSON `[provider,model]` 生成多个 provider bucket；`670–712` 用完整声明值调用 `session/set_config_option`，按 sessionId 选 model 与 effort；回读不一致拒绝，缺失保留 unknown。`548` 的私有补丁固定记录根目录和权限，不复制用户 provider/credentials。各 Worker 有自己的进程和 ACP session，因此设计上可以避免抢改全局默认渠道。

这比 Codex/Claude 当前 discovery 的单 bucket 明确，但仍只证明发布包逻辑。既有七项真实纯函数检查通过，不证明本机 ACP、并发商家、Windows 生命周期、限额或服务商上游模型身份已实联通过。尤其 effort 目录是 session 选项复制，不能称逐模型能力已经核实。

## AO：适合 GitHub 交付闭环，能力表和重试上限须拆开

AO v0.15.3 README 明确项目主助手拆任务，每 Worker 独立 branch/worktree，CI 失败、review comment 和 merge conflict 回到所属 Worker。固定标签 agent catalog 明确区分 Terminal UI、Chat、Reviewer；不是列出某 CLI，就三种模式全具备。其 Codex 指南说明使用原生 app-server、现有认证，以及独立账户登录 home；后者刻意共享 conversations/history，不能当完整配置隔离。

已保存的 `ao-cli.md:139–149` 说明 `claim-pr --review` 会关闭该 session 的自动 CI/review 注入及 auto-review，避免只读审阅者接管修复；merge 要 PR URL 和 reviewed head SHA（262–270）。这是有用的职责边界。**本轮没有核实固定版本对所有失败类型的统一重试次数、硬 token/金额上限**，不要把“会回传 CI”写成“已证明有严格预算的自动修复循环”。试点应另设两轮修复、并发 2、超时停机及人工升级规则，并检查产品可执行的停止路径。

Windows #8495 的报告环境是 0.15.1；维护者在 11 月 16 日表示 Win11 同 build 和当时 main 均未复现，给出的保留工作会话重试方式是 Stop 后重新发送。它应进入“pending approval 时 steering、Allow once 是否继续”的试点用例，不能据此说 0.15.3 必然不可用，也不能反向说本机已修复。

## 可追溯来源

- [HMB PyPI 0.69.7](https://pypi.org/project/hey-my-buddy/0.69.7/)；[公开仓库](https://github.com/Dsssyc/hey-my-buddy)。本次行为以 wheel 为准，不能用 main 文档版本替代。wheel SHA256：`1d94fdeed44b3bc8e7c08f16d44ce559d51f6e11672a13ae51508b2532ab424b`。
- 本地 wheel 解压代码：`../dsh-collaboration/hmb-0.69.7/hey_my_buddy/`；[DSH 核对与七项检查说明](../dsh-collaboration/hmb-dsh.md)。以上行号均相对本段解压根目录。
- [AO v0.15.3 README](https://github.com/OrchestratorInc/agent-orchestrator/blob/v0.15.3/README.md)、[agent catalog](https://docs.orchestrator.inc/plugins/agents)、[Codex](https://docs.orchestrator.inc/plugins/agents/codex)、[Windows #8495](https://github.com/OrchestratorInc/agent-orchestrator/issues/8495)。固定标签缓存与 SHA 在 `../multi-agent-open-landscape/sources/release-source-manifest.json`；CLI 缓存是后续 HEAD 文档，未独立确认其每条能力均在 0.15.3，报告须保留这个版本差异。
