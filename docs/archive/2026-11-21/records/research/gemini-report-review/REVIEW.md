> 历史研究/过程记录（已脱敏）；不是当前任务或执行授权。以仓库 STATUS 和现行工程规范为准。

# Gemini调研报告复核：可采纳部分、事实修正与下一步

核验日期：2026-11-21。输入为用户提供的《多编码智能体协作落地调研.docx》，文件SHA256：`6a66f9ef912bd79998b70ac9944f3a89a349b4b93c56d4663db8c0ab50d41b1b`。已读研究正文、试点交接、9张表及3幅图，提取385个顶层段落、246个外链引用项。本文定点核对影响选型和实施的主张，不宣称246个引用全部独立核实。

## 结论

**采纳分层思路与对照试点，撤回“200–300行自写调度器最稳、近零维护、100%适配”的结论；原交接单须修订后才能作为执行依据。**

这份研究提供了有价值的补充：协议与订阅分开看、每个工作者独立配置、固定工作副本、独立审阅、控制成本，并补入Orca和具体Windows故障线索。但它把尚不存在的自写方案按理想能力评分，同时按真实产品的公开问题扣分，比较不对称。评分算术没有明显错误，问题在证据和赋分依据。

当前建议是条件化选择：

- **保留现有主助手、自动派发和验收**：HMB恢复小试点资格。已有正式发行包与实现证据，不能因一次网页访问失败或star数量淘汰；仍需验证Windows后台、实际渠道和资源回收。
- **统一桌面、多个渠道实例和会话管理**：T3继续作为优先候选，但区分运行在T3内部的主代理与外部Codex接入，不能假设外部MCP拥有内部delegate能力。
- **多项目、PR、CI反馈驱动**：AO作为长期工作台候选，按所选版本及实际适配器验收。
- **原生CLI薄脚本**：保留为一次性基准探针，暂不扩张成新的可靠编排平台。是否升级为自建方案，要以现成工具无法满足的具体需求为依据。

不因为Gemini与此前推荐不同就全盘否定，也不因为报告很长就直接执行。后续采用 [修订试点交接](CODEX_PILOT_HANDOFF.revised.md)，原DOCX保持不变。

## 可以直接采用的工程原则

1. 模型渠道、编码运行时、编排和验收分层；独立配置与文件隔离分别设计。
2. 一个负责人、最多两个并行工作者、一个独立审阅阶段；精简任务简报，不复制全部长对话。
3. 写入任务各自worktree，共享接口、依赖锁文件与最终集成由负责人管理。
4. 单代理与多代理做同范围对照，计入协调、返工、检查和整合时间，不只看生成速度。
5. 区分请求的模型、原生客户端读回值、服务端报告值和未知；不能凭中转回显证明背后的物理模型。
6. 固定7890，保护现有会话和用户浏览器，按任务归属清理，限流与网络故障分别处理。

## 会影响选型的事实纠正

| 原报告定位 | 复核结果 | 对决策的影响 |
| --- | --- | --- |
| P005/P095/P125：不足300行、1–2小时即可实现确定性恢复、限流和全树清理 | 没有给出实现、故障注入或运行证据。JSONL、原子状态、重复派发、跨CLI错误、Job归属和恢复是独立问题 | 自写路线只能算待验证假设，不能先给可靠性和维护高分 |
| P025/表2：HMB源码不可达、缺Windows/隔离证据 | 已有PyPI 0.69.7完整wheel、SHA、worktree封存与Windows Job实现；7项纯逻辑检查通过 | 恢复候选资格；上述证据也不等于本机端到端成功 |
| 表2：Worktree Kanban仅5款CLI | v0.2.18文档列10款，并区分审批、续聊与ACP能力 | 撤回基于过时数量的淘汰理由；许可条件单独评估 |
| P006/表4：T3 v0.1.11有delegate_task.outputSchema与t3_submit_output | 固定标签contract无outputSchema，工具注册无t3_submit_output。worktree与clientRequestId确实存在 | 撤回“已内置任意成果Schema强校验”的加分 |
| P006/表4：现有外部Codex可通过MCP直接delegate_task | v0.1.11外部入口明确不具caller-only工具身份；外部用t3_thread_launch/read/wait。内部delegate默认shared | 试点必须选主入口位置，写入任务显式隔离，不能照搬接口 |
| P053：等待T3 #36147关闭再提高排序 | 该Issue实际已于11月19日作为completed在#39297关闭；最初报告版本是0.1.10-nightly.20261113.4616 | 不能当持续未关闭故障扣分；关闭不证明修复已进入每个安装版，需映射发布版本再复验 |
| P007/表5：AO Windows审批问题 | #8495真实存在，报告对象0.15.1，维护者表示在同build及main的Win11未复现 | 保留试点场景；不能外推为所有0.15.3 Windows必然卡住 |
| P008/表5：DSH rc.5已证实永久污染全局pnpm硬链库 | 原讨论#12857的环境是0.2.2-rc.1；其受控实验明确已有硬链未被grant重标，store的Low标签来源保留两种可能 | 这是值得专项核查的风险线索，不能冒充对本机rc.5的复现，更不能未经诊断批量改ACL |
| P003/表1：第三方框架全面不能使用用户订阅，因此必须跨CLI | 当前Anthropic官方规则区分第三方收集/中介凭据与用户在未修改原厂Claude Code中自行登录；后者明确允许特定托管形态 | 应核具体认证路径，不能把所有包装原生CLI的工作台一概排除 |
| P003/表1：异构协议或独立审查需求意味着必须跨CLI | 是过强推论。同一运行时若原生支持这些协议和角色权限，也可满足；跨harness只是额外独立性选择 | 仍保留OpenCode/DSH原生多模型基线，不预设跨CLI才正确 |
| P043/表4：网关resolved model可“确切证明实际模型” | 通常能证明路由选择或服务端声明，不独立证明中转背后的真实模型 | 结果标明证据层次，unknown保留，不伪造确定性 |

工具细节与固定源码位置见 [工具事实复核](tool-claims.md)。Orca是有效新增候选，但现行结构化编排文档有Experimental状态、部分界面暂不可用及命令代际差异，暂不能靠CLI数量或star直接提升排序。

### 两项值得保留但必须限定的外部风险证据

报告引用的 [Codex #59236](https://github.com/openai/codex/issues/59236) 原文确实记载460,308,416 logged tokens及26小时38分跨度，主要讨论任务扩张与用量误报。这是个案报告，不能当一般多代理成本或效率基准，也不能将总token直接换算成某个固定账单。

[Anthropic gateway文档](https://code.claude.com/docs/en/llm-gateway)确实声明不支持经网关把Claude Code路由到非Claude模型。应按其支持边界选择原生工具；但这不推出“多协议必须用多CLI”，也不表示任何协议转换后的请求都必然失败。

## 原试点交接的执行阻断

**清理范围越界。** P186递归删除共享 `wt` 与 `homes` 父目录，可跨run删掉成果、活跃checkout和认证资料；P165要求只剩主工作树会误伤当前已有的第二个worktree。应按本次创建清单逐一清理，移除失败就保留，不能再强删父目录。

**进程归属不足。** 裸PID与taskkill/T不是持久归属证据，无法安全覆盖PID复用、父进程先退或子进程脱离。取消须经历cancel_requested/stopping，只有确认自有执行树已停才标终止；不明则shutdown_unknown，保留产物和占用，不能自动重派。

**结果与重试合约不足。** `codex exec --json`是JSONL事件，不是一个最终成功对象；进程退出、模型结束、答案schema、文件产物和测试要分别判断。state.json+task_id不自动实现幂等。HTTP mock的429→200只证明退避函数，不能证明原生CLI会暴露Retry-After或没有内部重试。

**隔离概念混用。** home目录和worktree不等于OS沙箱；allowedTools不独立证明严格只读。P110所谓“只读预检”执行沙箱探针却没有先隔离配置，可能初始化宿主状态。新home也不自动继承已有登录，不能同时承诺完全独立和零迁移。

**门禁与基线不准确。** 本仓库完整入口是 `npm run check:release`，包含构建和Python解析回归。报告的“五类命令”可能验证旧dist。使用固定base SHA，检查提交、暂存、未暂存、新文件，不能只对不断变化的main...HEAD比较。

完整说明与本机CLI帮助核验见 [交接审查](pilot-audit.md)。本次没有执行报告的sandbox、taskkill、Remove-Item、建工作树或模型请求命令。

## 试点顺序的修订

1. **先做无模型请求的预检**：精确版本、入口、现有工作树、配置归属、接口契约、7890、固定基线与预算字段。检查通过只表示可准备试点。
2. **按目标选一条候选**：保留现有Host就试HMB；切统一桌面并重视多渠道实例就试T3；PR/CI驱动就试AO。不同时叠三套，也不先写全能调度器。
3. **最小原生往返**：在明确指定的两个渠道各做一次有界只读任务，记录实际证据层次、费用/用量与状态。该阶段尚未运行。
4. **再做并行与失败场景**：独立checkout、固定输入、错误返回/取消/恢复/清理；条件不满足时停在对应阶段，保留成果。
5. **最后才比较实际收益**：没有数据前不填写4.53等评分，不把“代码量短”当维护成本低。

两个不同服务地址不必然代表不同物理上游；不同品牌也不自动带来独立审阅。初始每渠道并发1是保守试点设置，不是所有公益站都必须的行业结论。时间、费用与返工上限按具体任务定义；报告建议的200万token、3倍成本不能冒充用户已批准预算。

## 已核来源与限制

- [T3 v0.1.11 contract](https://github.com/pingdotgg/t3code/blob/v0.1.11/packages/contracts/src/orchestratorMcp.ts)、[工具注册](https://github.com/pingdotgg/t3code/blob/v0.1.11/apps/server/src/mcp/toolkits/orchestrator/tools.ts)、[外部助手说明](https://github.com/pingdotgg/t3code/blob/v0.1.11/docs/user/outside-agents.md)，原文及SHA见 `sources/t3-manifest.json`。
- [HMB PyPI 0.69.7](https://pypi.org/project/hey-my-buddy/0.69.7/)与已校验发行包；[此前发布包核对](../dsh-collaboration/hmb-dsh.md)。
- [Worktree Kanban v0.2.18 agents](https://github.com/kazuya83/worktree-kanban/blob/v0.2.18/docs/agents.md)。
- [T3 #36147](https://github.com/pingdotgg/t3code/issues/36147)、[AO #8495](https://github.com/OrchestratorInc/agent-orchestrator/issues/8495)、[DSH #12857](https://github.com/deepseek-ai/deepseek-harness/discussions/12857)、[Orca #16527](https://github.com/stablyai/orca/issues/16527)，本次实际读取正文与讨论，网页快照见sources。
- [Anthropic法律与认证](https://code.claude.com/docs/en/legal-and-compliance)、[网关说明](https://code.claude.com/docs/en/llm-gateway)，本次实际读取现行文档；本文不是法律认证。
- [Orca官方](https://github.com/stablyai/orca)、[结构化编排说明](https://orca.dev/docs/cli/orchestration)，来源与版本限定见tool-claims。

报告其余大量日期、收费、漏洞、issue编号未在本次逐条验证。它们可作下一阶段线索，不能无条件进入实施脚本。原始Word未修改；提取文本和三图保存在同目录。没有向公开GitHub提交用户报告，现有网站和系统代理配置未改变。
