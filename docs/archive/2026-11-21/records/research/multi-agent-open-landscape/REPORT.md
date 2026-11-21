> 历史研究/过程记录（已脱敏）；不是当前任务或执行授权。以仓库 STATUS 和现行工程规范为准。

# 跨终端、多模型协作开发：开放式调研与落地建议

用户随后提供的Gemini研究已完成交叉核对。新增事实、版本修正与试点执行边界见 [Gemini报告复核](../gemini-report-review/REVIEW.md)，试点以其链接的修订交接单为最新参考。

交付日期：2026-11-21。主要资料核对于2026-11-20至21日。作者：Codex。本文完成选型研究与试点设计；没有安装候选编排器、修改现有模型配置或向你的模型渠道发送测试请求。

## 结论先行

你的目标可以实现。一个终端会话只选择一个主模型，不意味着一个项目只能由一个模型开发。可行结构是：**一个负责人、多个有明确任务的工作者、独立的修改空间，以及统一验收和集成。** 各工作者可以使用不同模型渠道，但必须各自验证接口协议、工具调用和配置隔离。

本次从帖子线索扩展到原生多模型代理、跨CLI委派、终端编排、项目工作台和开发框架，比较了16个工具或框架。没有把DSH当指定答案：“使用DSH”指复用你已经配置好的研究链路。

建议分两步选：

1. **先验证协作是否真的省事：Hey-my-buddy小试点。** 它允许继续以现有编码助手为Host，派发有边界的任务，并围绕固定输入、输出产物和Host验收组织协作。它最贴近你“不要在多个终端间手工传话”的直接痛点。[S1]
2. **再选择日常工作入口。** 如果你想把许多项目、任务、工作树、PR和CI放在一个看板，优先对照 **Orchestrator.inc**；如果你更看重不同渠道实例与统一会话界面，优先对照 **T3 Code**。两者都是候选，不能根据文档就宣称本机配置全部适配。[S2][S3]

这不是说HMB普遍胜过其他工具。它是基于你已经有Codex/Claude/DSH、希望保留现有工作方式的低迁移成本试点顺序。若希望直接切换为统一项目工作台，AO可以取代这个起点；无需先安装三套再决定。

## 你的需求应拆成哪几层

| 层次 | 要解决的问题 | 不能混为一谈的东西 |
| --- | --- | --- |
| 模型服务 | 不同模型站的地址、协议、凭据、真实模型ID、额度和并发 | 能聊天不等于能执行编码工具；相同模型名不等于相同服务 |
| 编码助手 | 读文件、修改代码、运行测试、维持上下文 | Claude Code、Codex CLI、OpenCode、DSH是程序，不是单个模型 |
| 编排 | 拆任务、派发、等待、回传、失败重试、取消 | 多开窗口、分屏、群聊不自动提供这些能力 |
| 工作区 | 同项目并行修改而不互相覆盖 | Git worktree隔离工作副本，但仍共享部分Git元数据，不是系统沙箱 |
| 交付 | 集成、独立审查、测试、发布与回滚 | 工作者回复“完成”、终端空闲和CI通过是不同事实 |

因此，多个原生桌面App之间互相点击或复制聊天内容并非首选。优先使用它们的CLI、SDK、ACP、MCP或应用原生控制接口；这样任务身份和结束状态更容易核实。

## 方案总表

“支持”指已核对资料所述能力；除后文的纯函数检查外，未在本机逐个运行。Windows列不等于所有适配器都已验证。

| 方案 | 协作方式与适用场景 | 模型渠道与代码隔离 | 对你当前的判断 |
| --- | --- | --- | --- |
| **Hey-my-buddy** [S1] | 现有Host通过skill/CLI向Worker派微任务，持久黑板、交付封存、验收/继续/取消 | Worker为Codex/Claude/DSH/ZCode；用原生配置，managed worktree可选 | 优先做小试点；Windows生命周期与真实渠道仍需验收 |
| **Orchestrator.inc** [S2] | 负责人管理工作者，项目看板串联分支、PR、CI失败与审查反馈 | Git项目工作者有分支/worktree；复用各CLI，能力按适配器区分 | 长期多项目工作台候选，尤其适合多个网站持续开发 |
| **T3 Code** [S3] | 桌面/网页/移动端统一会话，支持多provider和外部控制 | Claude实例可设独立配置目录或环境变量；有worktree与diff流程 | 多渠道配置清晰，适合作为AO/HMB的对照；不是自动完整账号隔离 |
| **Worktree Kanban** [S4] | 可视流程图：实现、审阅、条件分支、循环、并行；人决定合并 | 一任务一worktree；复用CLI登录与设置，可管理多个仓库 | 想看见执行流程并保留关键决策时合适；自定义渠道须核底层CLI |
| **Herdr / hc** [S5] | 长驻终端、跨CLI派活、SSH多机、人可接管 | CLI自行处理渠道；模板和session不等于文件权限隔离 | 强在终端与多机；需要另外约定任务验收和集成 |
| **CCB** [S6] | `ask/back`、回调和FIFO消息队列，保持多个CLI上下文 | 工作区角色可配worktree，模型配置仍依各CLI | 真有协作机制；原生Windows为beta且依赖较多，初次优先级较低 |
| **CCG** [S7] | 主代理按策略做多模型分析、实现与审查，hook维护流程 | 外部后端与Agent Teams按配置工作；提供worktree入口 | 适合喜欢既定开发方法的人；默认某些流程有计划确认，与少打断偏好需协调 |
| **dmux** [S8] | tmux面板、每任务worktree、人工菜单合并/PR | 支持多种CLI；内部inference配置主要用于命名、摘要等 | 适合熟悉终端的人；你当前没有可直接复用的WSL/tmux，不是最低成本起点 |
| **OpenCode原生** [S9] | 同一助手内为不同agent指定provider/model | 可定义兼容API provider；工具权限和worktree需分别安排 | 若只需要不同模型合作，可减少跨CLI复杂度；不必强求多个品牌终端 |
| **DSH原生** [S10] | in-process spawn可独立选路、消息/续聊；fork继承上下文 | 路由须已注册并获Session授权；不自动建worktree | 已有宿主可用的备选，不因研究链路来自DSH就优先选它 |
| **OmO 5.x** [S11] | 独立原生运行环境、任务分类和模型路由、并行任务图 | 最新路线基于senpi；有provider并发设置，配置/许可与旧版不同 | 适合愿意更换主工作流的人；不能照旧教程当OpenCode插件安装 |
| **DS Bot** [S12] | Bot各选模型，群管理员和成员共同处理任务 | 原生DSH会话可独立模型；群共享目录不是worktree | 群聊体验有价值，但代码冲突、取消与验收仍需补工程流程 |
| **Vibe Kanban** [S13] | 曾提供多CLI看板、工作树、review与PR | 官方README已公告sunsetting | 不作为新长期部署首选；不能被旧“十大推荐”文章误导 |
| **OpenHands Agent Canvas** [S14] | 自托管代理工作台、ACP后端和自动化，可本地/容器/远程 | 带自有agent与第三方agent入口；本机直接运行与容器边界不同 | 后续需要常驻自动化/远端执行时再评估，当前引入成本较高 |
| **LangGraph** [S15] | 可编程状态图、checkpoint、恢复、中断和多agent路由 | Git、CLI、凭据、工具执行和界面须自行集成 | 是自建平台的构件，不是装上就能接管多个终端 |
| **CrewAI** [S16] | 角色、任务和流程框架 | 编码执行、工作树、审查发布等仍需选工具与实现 | 暂不建议为提速现有网站先开发一套新编排系统 |

另外搜索发现TEAMYRA、agenthub、sterium-ai/agent-orchestrator等项目，当前仅保留为发现线索，没有同等深度的原文/实现核查，不用于排名。开放式调研不等于穷尽所有仓库；本轮覆盖了与你目标有关的主要方案类型。

## 哪些发现真正改变了推荐

### 1. 第三方模型渠道多，不等于能直接多开同一个CLI

多个终端可能共读一份全局配置。反复在CC Switch里更换“当前渠道”，并不证明运行中的每个Worker被隔离。应固定每个进程或provider实例的配置来源，再读取实际生效的provider/model，不只看任务书中请求的名称。

T3的正式发布标签文档已明确支持实例环境变量、独立Claude配置目录；只更换接口或密钥的预设与独立账号目录是不同方案。[S3] AO复用各CLI认证，适配器登记不等于每个自定义API渠道就绪；Codex账号实例也不应被说成任意API路由实例。[S2]

### 2. HMB有工程交付约束，但渠道配置有前提

已下载并校验PyPI正式包 **0.69.7**，要求Python `>=3.12,<3.13`。仓库main材料出现0.71.0，不能把main所有能力视作0.69.7已发布能力。针对正式包源码做了7项纯函数验证，证明：同名模型按provider区分、未知选择拒绝、旧session不能跨provider/task复用、shell中的密钥与endpoint覆盖被过滤。[S1]

所以HMB适合试点，却不能直接承诺“现有终端能调用的任何模型站都自动接入”。原生harness配置须先可用；真实Windows后台服务存活、并发路由与取消回收仍未实测。它的输入/输出封存、Host验收合约很适合避免“模型说完成就算完成”，但不能替代Host跑测试。

### 3. AO比单纯分屏更接近你长期需要的工程中心

已核到正式标签 **v0.15.3** 的README、架构及adapter目录：有Windows发行包、Git项目worktree、负责人派工、PR/CI/审查反馈的工作流。它值得进入主候选，已经超出原帖四种工具的范围。[S2]

能力有明确区别：此标签Gemini是TUI，不能据总列表宣称也支持Chat或Reviewer；DSH有TUI/Chat而没有同等Reviewer。projectless任务使用普通受管目录，不是Git工作树。自己的模型服务、hooks配置与后台恢复需用实际发行包验收。

### 4. 有些“自动化”会带来你不想要的交互

CCB所述人机队列模式中，输入草稿持续非空达到180秒后可能被清除再投递；文档还承认最终检查与键入不是原子操作。这个行为仅对应所述模式与适配范围，不代表所有provider都如此，但足以让它在你重视阅读与不中断操作时降低优先级。[S6]

CCG的full-collaborate示例在计划后设置HARD STOP；DSH扩展部分还要求每次hire确认。它有方法论价值，但不能不审流程便宣称完全符合你“少打断”的偏好。[S7]

### 5. 原生多模型值得作为基线，不一定必须跨终端

OpenCode可在一个运行环境中为角色配置不同 `provider/model`；DSH spawn也能按已登记路由选模型。这样减少CLI之间的状态翻译，但仍需要工作区隔离和统一验收。[S9][S10]

本机DSH存在桌面随附0.2.2-rc.5、profile插件0.2.1-rc.5和PATH入口0.2.1-rc.2的差异。实际Host加载哪个包未从运行时核实，不能盲套配置。其10项离线路由检查通过，证明的是随附helper逻辑，不是实际模型服务可用。

### 6. 版本和许可不能用旧榜单代替

- Vibe Kanban官方明确sunsetting。[S13]
- OmO 5.x已经基于senpi独立运行，发布标签读取为v5.1.79；旧OpenCode版与新原生版的路由、配置不能混用。其SUL许可允许内部业务或个人/非商业用途，但不等同MIT/Apache自由再发行条件。[S11]
- Worktree Kanban显示FSL-1.1-ALv2，作为内部开发工具与对外再分发平台需要分别看许可。[S4]
- 软件开源或可免费使用不代表模型推理免费；本轮没有把赞助商宣传的价格/可用性当验证结果。

## 对你最合适的组合方式

### 路线A：保留现在的主助手，先解决派工与验收

**一个现有Host + HMB + 2个明确指定的Worker + 统一集成。** 首次不启用自动Router，先让两个不同渠道各完成一个只读、可验收任务。通过后再让它们在各自worktree里改代码。

这个起点改变较少，能直接回答：是否省掉你在终端之间传任务、取结果的时间。它不把你锁进某个模型品牌，也不要求先更换整个桌面环境。

### 路线B：以多项目工作台管理持续开发

**AO作为唯一编排器 + 各项目worktree/分支 + 原生CLI + 现有GitHub CI。** 对你同时维护许多项目，这比只增加子代理数量更重要：任务有归属、失败能退回原负责人、审查与发布有统一位置。

先对照AO正式版的实际模型配置能力。如果你的主要痛点是“同一个CLI接入多个站点且不能互相覆盖”，把T3作为同一试点的替代候选，核其provider实例隔离。不要让AO、T3、HMB三者同时拥有同一任务的创建/取消/回收权。

### 路线C：只关心不同模型的能力互补

若无需保留多个CLI特色，可以在OpenCode或已验证的DSH里配置不同角色路由，减少跨终端桥接。此路线也需要独立worktree或明确文件所有权；不能让多个写入者自由修改同一checkout。

### 暂缓的路线

第一次部署先不自建LangGraph/CrewAI平台，不引入大规模tmux/WSL依赖，也不同时安装全部候选。它们在特定场景有价值，但当前收益应先来自缩短实际任务交付时间，而不是维护更多编排软件。

## 一套可衡量的试点，而非凭感觉选模型

初始规模：一个负责人、最多两个同时写代码的Worker、一个独立审阅步骤。实现与审阅不要默认来自同一会话；公共接口、依赖锁文件和发布由负责人管理。

选三类小任务，每种候选跑相同任务和验收：

1. **只读设计协作**：一个Worker检查梵烬大经加载/检索，另一个检查阅读状态与书签兼容，负责人整合成数据契约，Reviewer找遗漏。
2. **两个互不重叠的修改**：分别处理数据加载与对应UI，先冻结共用接口，再各自worktree实现，集成后运行 `npm run check:release`。
3. **失败路径**：中途改变一个子任务的要求，取消另一个；确认没有重复请求、遗留进程或越界改动，并能从保留成果恢复。

每次记录：总耗时、人工介入次数、首次验收通过率、返工轮数、模型实际用量、失败/取消后遗留资源，以及指定模型是否真正生效。不能用“启动了几个模型”衡量提速。

验收必须全部满足：

- 每个Worker的实际渠道与模型能核实；没有悄悄退回默认模型。
- 两个Worker不会改同一份全局渠道配置；不同工作副本的提交和产物可追踪。
- 负责人能发起、读取、继续或取消任务；取消意图与实际停止分别验证。
- 结果交给负责人后能独立审阅、测试、集成；发布只由一个位置执行。
- 任务结束释放自建浏览器/临时服务；保护用户原有标签和运行中的其他任务。
- 达到预设用量/时间上限即停止派发；429限流不无限重试，未知请求结果不盲目重发。

详细任务书见 [PILOT.md](PILOT.md)。此处没有承诺任何加速倍数。可并行部分、沟通成本、共同上游限额和合并返工共同决定实际收益。

## 模型服务接入前的检查

每个渠道记录：原生harness、provider ID、真实model ID、API协议、凭据来源、工具调用/结构化输出能力、上下文限制、并发限制和请求超时。只把无秘密的配置身份放进任务板；密钥不进入提示词、Git或共享研究文件。

Codex可用的接口能力不能由“OpenAI兼容聊天”直接推导，Claude/Gemini同理。支持列表、模型名或套餐登录也不等于自定义站点已认证。先用你已有原生配置验证，再接编排器。

本机代理遵循刚确认的7890规则。普通HTTP代理固定7890，宿主内部ALL_PROXY另行识别。网络连接失败与上游429分开处理；旧进程环境不能靠改注册表自动刷新。本轮没有为了研究改任何模型配置、令牌或后台服务。

## 本轮如何复用DSH研究链路

- 使用既有 `search_api.py` 的Perplexity/Firecrawl做多角度发现，涵盖开放式候选、工作台、原生模型路由、终端桥接和社区经验；复用已有 `research_router.py`、`fetch_verify.py`、`evidence_gate.py` 做路由与核验辅助。
- 已读原帖当时1–10楼及两个明确相关主题，随后读取官方README、文档、部分关键源码、PyPI/npm元数据和正式发布标签。
- 官方原文保存于 `sources/`，各 `*-manifest.json` 记录URL、字节数和SHA256；不会把标题或搜索摘要当作原文结论。
- 没有直接运行旧 `content_chain.sh` 总入口：它无条件调用 `cdp_clean.sh 2`，按位置保留少数标签并关闭其余页面，与用户保护阅读标签的要求冲突，还可能启动额外基础服务。此次复用它已有组件完成研究，没有新建搜索系统，也没有修改全局链路。
- 本地SearXNG未运行；GitHub部分API限流，改读官方raw/codeload与公开包。Context7用于官方文档核对，搜索用于发现。缺失项明确保留，未声称14通道全绿。
- `fetch_verify`抽核8份原文得到6个verified、2个mismatch；后两项是使用本地文件名作标题导致的词重合误判，已人工核对其正文与官方URL。`evidence_gate`对只含文件名的索引给出低分，不当作产品质量分或研究完成证明。
- HMB正式包纯逻辑7项、DSH随附路由纯逻辑10项通过；它们不证明真实多模型并发、Windows后台持久性或服务商路由已通过。
- 子代理在扩展调研后阶段遭遇429，主代理继续完成原文核对；没有把未返回的子任务声称为已独立审阅。最后已有子代理对推荐边界做了本地只读复核。

## 来源索引

以下为已读的一手资料；精确发布标签见本地 release-status.json（原本地缓存未发布，参见归档索引）。这些版本是本轮读取时的快照，安装时再确认所选版本，不自动追随main。

- **S1**：[HMB仓库](https://github.com/Dsssyc/hey-my-buddy)、[PyPI 0.69.7](https://pypi.org/project/hey-my-buddy/0.69.7/)。正式包核对与7项结果见 [发布版报告](../dsh-collaboration/hmb-dsh.md)。
- **S2**：[AO v0.15.3](https://github.com/OrchestratorInc/agent-orchestrator/tree/v0.15.3)、[该版本适配器矩阵](https://github.com/OrchestratorInc/agent-orchestrator/blob/v0.15.3/frontend/src/docs/content/plugins/agents/index.mdx)、[架构](https://github.com/OrchestratorInc/agent-orchestrator/blob/v0.15.3/docs/architecture.md)。
- **S3**：[T3 Code v0.1.11](https://github.com/pingdotgg/t3code/tree/v0.1.11)、[该版本Claude实例配置](https://github.com/pingdotgg/t3code/blob/v0.1.11/docs/user/providers-claude.md)。其余实现边界见 [T3/HMB核对报告](../multi-agent-3212629/t3-buddy-review.md)。
- **S4**：[Worktree Kanban](https://github.com/kazuya83/worktree-kanban)、[v0.2.18代理与Pipeline说明](https://github.com/kazuya83/worktree-kanban/blob/v0.2.18/docs/agents.md)。
- **S5**：[Herdr](https://github.com/herdrdev/herdr)、[hc](https://github.com/herdrdev/herdr-core)。代际差异见 [官方核对报告](../multi-agent-3212629/HERDR-OFFICIAL-REPORT.md)。
- **S6**：[CCB](https://github.com/SeemSeam/claude_codex_bridge)、[v8.7.24](https://github.com/SeemSeam/claude_codex_bridge/releases/tag/v8.7.24)。README包含Windows beta和消息队列草稿行为，不能泛化适配器覆盖。
- **S7**：[CCG](https://github.com/fengshao1227/ccg-workflow)，已读README中的策略、Hook、OpenCode后端及DSH扩展，不把赞助商数据当验证。
- **S8**：[dmux](https://github.com/standardagents/dmux)，README中的tmux依赖、worktree与inference用途。
- **S9**：[OpenCode Agents](https://opencode.ai/docs/agents/)、[官方仓库](https://github.com/anomalyco/opencode)，官方文档经Context7核对。不同大版本配置字段必须重新对齐。
- **S10**：[DSH子代理工具](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/subagent/tool-subagent)，本机同版本公开包与10项验证见 [宿主核对](../dsh-collaboration/native-dsh.md)。
- **S11**：[OmO v5.1.79](https://github.com/code-yeongyu/oh-my-openagent/tree/v5.1.79)、[许可](https://github.com/code-yeongyu/oh-my-openagent/blob/dev/LICENSE.md)，README及配置参考均已读取。
- **S12**：[DS Bot](https://github.com/Fei2411/DS-Bot)。下载源码归档commit `5e9b7da8882da3b68d8a0624342708c2150a9156`、npm读取0.3.8。`models.js`会按Session选模型并恢复profile默认；任务状态取消与停止room执行是不同入口。未进行原生并发测试。
- **S13**：[Vibe Kanban README](https://github.com/BloopAI/vibe-kanban)、[停止运营公告](https://www.vibekanban.com/blog/shutdown)。
- **S14**：[OpenHands Agent Canvas](https://github.com/OpenHands/OpenHands)，当前README已包含ACP多agent与本机/容器后端，不能只用旧版单agent印象归类。
- **S15**：[LangGraph](https://github.com/langchain-ai/langgraph)，官方checkpoint/interrupt行为经Context7核对。
- **S16**：[CrewAI](https://github.com/crewAIInc/crewAI)，已读官方README，属于框架级候选，未做部署验证。

原帖与第一轮资料见 [上一轮范围较窄的比较](../multi-agent-3212629/COMPARISON.md)。本报告在候选范围、版本验证和推荐层次上补充它；没有更改梵烬产品、线上部署或现有智能体运行状态。
