> 历史研究/过程记录（已脱敏）；不是当前任务或执行授权。以仓库 STATUS 和现行工程规范为准。

# T3 Code 与 Hey-my-buddy：官方资料与关键源码核对

核对日期：2026-11-20。范围：linux.do 主题 3212629 推荐工具中的 T3 Code 与 Hey-my-buddy；关联主题 3192025 的具体帖子内容由主代理核对。本报告只核对官方公开仓库、文档和部分负责实现的源码，没有安装软件、改动本机配置、调用模型、运行原生测试或操作用户浏览器。

官方仓库：[pingdotgg/t3code](https://github.com/pingdotgg/t3code)、[Dsssyc/hey-my-buddy](https://github.com/Dsssyc/hey-my-buddy)。两者 README 均标示 MIT 许可；本次未逐项审计依赖许可。以下是读取时的 `main` 快照；不是对所有已发布版本的保证。

## 结论

两者可解决不同层面的协作问题。T3 Code 更适合把多个已安装的编码代理放进统一桌面/网页/手机控制面，管理线程、模型、审批、工作树和外部 MCP 调度。Hey-my-buddy 更适合继续把现有编码代理作为 Host，由它向不同 harness 派发有边界的小任务，通过持久黑板、封存产物和 Host 验收完成协作。

对当前 Windows、多 CLI、自定义模型服务的环境，最影响选择的不是宣传中的“支持多模型”，而是：

1. **配置传递不同**：T3 支持 provider 实例的环境变量和独立配置目录；Buddy 明确过滤调用者 shell 里的 provider API key、模型 endpoint override，使用各 harness 自己保存的配置与登录。
2. **权限默认不能假设沿用**：T3 文档写明新线程初始默认 **Full access**。Buddy Codex Worker 使用 `approvalPolicy: never`，实际权限由 Host 选择的档位映射；worktree 本身不是安全沙箱。
3. **Gemini CLI 尚无本次核验出的完整支持链**：T3 有通用 ACP 入口，但本次未核到 Gemini CLI 的具体 registry/适配条目；Buddy Worker 注册表只有 DSH、ZCode、Codex、Claude。Antigravity 或 Gemini 的 skill 目录不等于 Gemini CLI Worker 支持。
4. **任务完成不等于资源释放**：T3 的归档、工作树清理、终端动作有各自规则；Buddy 必须区分 cancel 意图、整棵执行树已停止、结果验收和工作树回收。两者都不能保证用户浏览器标签自动按任务归属关闭。

## 对照

| 维度 | T3 Code | Hey-my-buddy |
| --- | --- | --- |
| 产品入口 | 多代理控制面，可本机使用，也可连接远端机器与手机；代理实际跑在所连机器 | 现有代理当 Host；安装 skill、launcher、私有本地服务和黑板 |
| 已核实的 CLI 支持 | Claude Code、Codex，以及 Cursor、OpenCode、Grok、Antigravity、Kiro、Pi、Muse、fx 与通用 ACP；源码有对应 driver 注册 | 原生 Worker 为 DSH、ZCode、Codex、Claude；不是任意 CLI 接一个名字就能工作 |
| 通信/委派 | 线程内可委派；外部 MCP/CLI 可启动、发送、读取、等待、停止线程。外部 MCP 不直接获得线程内 caller-only 的 delegate/subagent 能力 | Host/Worker/Lead/Router 分工；SQLite 持久黑板。Codex、Claude、ZCode 支持运行中询问，DSH 在协作检查点处理询问 |
| 模型服务 | provider 实例可配置环境变量、自定义模型 ID；是否兼容具体服务仍由底层 CLI 协议决定 | Buddy 身份含 harness、provider、model、effort；模型和 provider 由原生 harness 提供，不是独立的万能 API 网关 |
| 账号隔离 | Claude 可设独立 CLAUDE_CONFIG_DIR；Codex 可独立 CODEX_HOME，或明确共享会话/配置的 shadow home 方案；通用 ACP 新实例本身不保证账号独立 | 默认尊重并使用原有 harness 配置/登录；不复制登录凭据。不同 Buddy 元组不等于不同账号、独立凭据或 OS 沙箱 |
| Git 工作区 | 线程可创建工作树；源码控制与线程工具支持审阅、提交、合并等操作 | 可选 managed worktree、existing checkout 或普通目录。Git 输入固定、输出封存，Host 审查/整合后 accept；普通目录修改不封存 |
| 验收 | 有 diff、线程与源码控制流程；本次未发现等价于 Buddy 的强制 sealed-artifact/three-way acceptance 合约 | accept 绑定确切产物、审查说明和目标；Git ≥ 2.40，用 merge-tree 核验三方整合；Host 实际调整须明确记录 |
| 失败与取消 | 停父线程会停委派子代理；发送到忙线程通常排队下一轮。ACP 回滚工作区后无法原地回退代理对话，下轮重新建会话 | cancel 先记停止意图并撤销执行凭据；停止不明时保留资源占用与证据，不把静默、丢 PID 当停止成功；可显式继续或 conclude |
| 回收 | stopOnSettle 只覆盖经相应 action 启动的命令及子进程；scratch 目录在线程删除后保留 | accept/conclude 且停止已证实后，尝试回收确属本系统的 managed checkout；普通目录和 Host existing checkout 不自动删除；私有执行材料另有 3 天规则 |
| Windows | README 与安装文档提供 Windows desktop、winget/scoop/PowerShell 路径；本次没有安装或原生运行验证 | 文档声明 Windows 11 x64/ARM64；真实使用记录明确 Windows Codex、DSH，macOS 四种 harness，Linux 未实用验证；详细 Windows 验证范围存在不同粒度描述 |

## 对现有配置与权限的影响

### T3 Code

官方 [Claude provider](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-claude.md) 明确：只改变 endpoint/API key 的预设应使用实例 **Environment variables**，不要放进 launch arguments；提供 OpenRouter 和本地 router 配置方式。独立配置目录保留正常 HOME/系统 keychain，并不把整台机器完全隔离。

[Codex provider](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-codex.md) 区分两种安排：独立 CODEX_HOME 隔离会话与配置；shadow home 有意共享会话/配置而分离文件凭据。不能把 shadow home 说成完全独立配置，也不应复制整套 Codex home 后认为账号已隔离。

[权限文档](https://github.com/pingdotgg/t3code/blob/main/docs/user/permission-modes.md#L8-L18) 写明初始默认 Full access，可在环境/项目设置覆盖。这不是推荐设置，而是必须在试用前知道的当前产品行为。不同底层 provider 的审批语义仍不同。

[ACP 文档](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-acp.md) 允许 registry 或本地可执行文件。它直接启动程序并传字面参数，不做 shell 展开；原生 agent 自带认证、模型与工具。多个 ACP 实例是否隔离账号取决于 agent 自己的配置。

### Hey-my-buddy

官方 [harness 文档](https://github.com/Dsssyc/hey-my-buddy/blob/main/docs/reference/harnesses.md#L9-L15) 与 [terms](https://github.com/Dsssyc/hey-my-buddy/blob/main/docs/terms.md#L7-L16) 一致声明：

- 原生子进程环境采用白名单，允许配置目录、系统/临时目录、locale、代理和 CA 文件路径。
- API key、模型 endpoint override、继承的 Host 权限不传入 Worker。
- 因而“当前终端能用某自定义接口”不等于 Buddy Worker 能直接使用；尤其仅靠终端环境变量的接法。
- 账号由 harness 自己管理，Buddy 不保存、复制或转发其登录凭据。它仍允许 harness 使用原生配置、skills、MCP、hooks，因此不是与现有账号配置完全断开的运行容器。

`native_environment` 的负责文件已定位为 `buddy/harnesses/discovery.py`，但该文件的读取遇 GitHub 限流，没有完成独立实现核对；这一条结论的证据级别是两份官方文档与集成文档一致，不能说已逐行审计了过滤实现。

已直接读取 [Codex native_run.py](https://github.com/Dsssyc/hey-my-buddy/blob/main/src/hey_my_buddy/buddy/harnesses/codex/native_run.py#L156-L165)：read/web 映射 read-only，write 映射 cwd 限定的 workspace-write 且 networkAccess 为 true，full 映射 danger-full-access。thread/start 与 resume 使用 `approvalPolicy: never`（约 761–773 行）。这是所读取的 **Codex adapter** 行为，不能推广为所有 harness 的等价沙箱。Host 选择权限档位；本次未核到 submit schema 对省略 permission 的默认处理，不猜测其默认值。

安装说明声明不改 PATH、shell 或全局 agent 设置，但会增加 skill、适用的 skill 链接、私有运行时、服务和状态。服务/执行进程沿用启动时权限，后来从更受限的终端附着不会重新约束已经运行的 daemon（operations “Permissions”）。即使不改原有终端，它仍会使用已有账户额度并增加后台进程；Router 选择也可能调用模型。

## 封存、提交与现有工作树

Buddy 的 [workspace lifecycle](https://github.com/Dsssyc/hey-my-buddy/blob/main/docs/reference/workspace-lifecycle.md#L16-L36) 区分：

- sealed evidence 是可核验的固定输出；合成的 evidence commit **不是**推荐直接 merge 的提交。
- integrationSource 才是可整合的 Worker commit 区间或固定累积 patch。
- Host 在自己的目标中整合、测试，再 accept 验证；不是 Worker “完成”便自动把主分支提交合并。
- existing checkout 模式会把现有检出直接作为工作区；none 模式直接使用给定目录且修改不封存。只有选 managed worktree 才有相应的独立工作副本。
- Git worktree 共用仓库对象与 refs，不能当完全隔离仓库或 OS 沙箱。
- accept 要求审查说明，真实 Host 调整须标注 adjusted；只是不需要代码整合的结果需提供 notRequired 原因。

这些机制能减少“模型说做完了就当验收”的问题，但验收仍需要 Host 实际审阅和测试。不能把其证据流程当成质量自动保证。

## Windows 与清理：证据强弱

### T3 Code

读取了 [AcpSessionRuntime.ts](https://github.com/pingdotgg/t3code/blob/main/packages/provider-acp/src/server/AcpSessionRuntime.ts#L1032-L1073)。Windows ACP 进程树终止使用 `taskkill /PID <pid> /T /F`；只把退出码 0 当成功，父进程不存在不足以证明后代已停。其 scope finalizer 也调用终止路径。这证明源码实现存在，不证明本机所有 agent/后台进程都已验证可回收。

读取的 process-tree 测试覆盖身份复用、孤儿/后代、终止竞态、Linux cgroup 等；未在本机运行，亦不能由这个文件宣称 Windows 全部场景绿灯。

[线程文档](https://github.com/pingdotgg/t3code/blob/main/docs/user/thread-sidebar.md) 的 stopOnSettle 仅涵盖对应 action 启动的命令；[ACP 文档](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-acp.md) 还说明：除 Devin 特殊支持外，T3 展示 agent 报告的 terminals，而不替 agent 执行/停止这些 terminal。应区分 native agent 进程树清理与 ACP terminal 管理，不能把两者都写成“全部自动清掉”。

### Hey-my-buddy

[operations](https://github.com/Dsssyc/hey-my-buddy/blob/main/docs/reference/operations.md) 声明 CI 覆盖 Ubuntu、macOS、Windows 11 x64/ARM64。harnesses 开头写 Windows Codex/DSH 已真实使用；operations 的细节段仍把 install.ps1、registry discovery 和 real harness turns 的部分原生验证列为待验证。故本报告采用保守描述：**有 Windows 原生与 CI 证据，但不同 CLI、安装入口和场景的验证完整度不同**。

operations 还公开记录一个未解决边界：调用者 Job 禁止服务脱离时，预期应拒绝启动；经 runtime virtualenv 启动却可能报告成功而仍留在调用者 Job，随后随调用者终止，产品未检测到。不能保证从任何 IDE/代理终端启动都永远常驻。

已直接读取 [process_handle.py](https://github.com/Dsssyc/hey-my-buddy/blob/main/src/hey_my_buddy/protocol/process_handle.py#L141-L209)：Windows 用持有的 Job 观察 active process 数；只有裸 PID 而无 Job 时，停止状态为 unknown。terminate 包含宽限、Job terminate、重新观察；不能确认就返回 false。

已直接读取 [reclamation.py](https://github.com/Dsssyc/hey-my-buddy/blob/main/src/hey_my_buddy/blackboard/tasks/reclamation.py#L16-L33)：候选仅 accepted/concluded 且原始分配类型为 worktree，私有材料保留期常量为三天。workspace 文档另要求原始分配归属、内容、停止证据等成立；被 Worker 附到分支的 checkout 保留，系统不擅自 detach/删分支。

已读取 checkout_processes.py：Windows 回收先尝试同级整体重命名再恢复，以探测仍被进程使用的目录；失败保留并报告。它不以任务结束为由批量杀用户终端。此为源码逻辑，没有执行验证。

## 版本、遗漏与建议

Buddy README 同时出现 `uvx hey-my-buddy@0.69.7 install` 和本地 wheel `0.71.0` 示例，operations 也写 0.71.0 合约。不能把 README 中任一数字未经 release 核对就当成“当前最新稳定版”。本次不安装，也不要求用户为研究提供凭据。

公开 GitHub 代码搜索需要认证；随后内容 API 触发未认证额度限流。未完成的核对包括：Gemini CLI 的具体 ACP registry 条目、Buddy 环境过滤实现全文、提交 schema 的默认权限、当前正式发布标签及 Windows CI 当前 run。以上都不影响已经获得源码/官方文档支持的结论，但禁止据此补写“已全部验证”。

针对现有环境，下一步选择标准可以很具体：

- 需要统一界面、跨 provider 会话、手机/远端控制，优先评估 T3；先明确配置目录与线程权限，保留既有 CLI 配置。
- 需要现有 Host 自动委派、持续跟踪、失败恢复和明确的产物验收，优先评估 Buddy；先确认每个 Worker 在自己的原生配置中可用，并小范围验证取消、服务重启、回收。
- 暂不把两套同时套入同一条任务链。它们都会维护线程/任务/工作树生命周期；叠加是否更可靠没有本次实证。
- 无论选哪套，用户浏览器页的归属和关闭仍需单独设计；现有工程规则中的“只关闭自建资源并复查”仍有效。

## 快照依据

完整下载资料及部分源码位于同目录 `sources/`，补充文件和 SHA 见 `sources/reviewed-source-index.json`。关键 blob SHA：

| 文件 | Git blob SHA |
| --- | --- |
| T3 README | 24dc0f8f7f6669ee439bc13f496e0451239f0e31 |
| T3 permission-modes.md | a8f1cf839122126818281021ef9c0f88501466f0 |
| T3 AcpSessionRuntime.ts | 099cc95e265ec86451eb3ff72da694fefe105413 |
| Buddy README | 861e23d686f350c02bbbf4de5a38ace1f56aa124 |
| Buddy registry.py | 308eecf3dbe464d33c9fc13b83c5af7f93f12e44 |
| Buddy codex/native_run.py | 6098510536e49a1f11959293234875ef0bb01078 |
| Buddy process_handle.py | 5aa89fdbb94a89506f523bf79397e37d5701f86c |
| Buddy reclamation.py | e17a135d387a425450c62acfd6c72ee55329f399 |
