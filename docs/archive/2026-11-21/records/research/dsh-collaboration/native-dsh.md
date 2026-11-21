> 历史研究/过程记录（已脱敏）；不是当前任务或执行授权。以仓库 STATUS 和现行工程规范为准。

# 现有 DSH 宿主的原生协作能力核对

核验日期：2026-11-20。本文是现有宿主适配证据，不预设最终选择 DSH 类方案；用户所说 DSH 已澄清为既有深度调研链路，最终应与 Hey-my-buddy、T3 Code、Herdr、DS Bot 综合比较。

## 结论

若只看当前已安装 DSH，**in-process spawn 是多模型、可续聊协作的最直接原生能力**：每次调用可使用独立 provider/model，能选择独立 Agent preset，支持同树消息、完成通知与恢复。fork 适合继承已完成对话，但出厂工具不开放换模型；SDK 适合进程独立的一次性任务，但这套委派接口不能续聊。三者均不自动创建 Git worktree。

实际使用前还有两个关键缺口：当前 Host 究竟解析了桌面随附包还是 profile 中旧插件，尚未从运行时确认；模型渠道、额度、实际并发、消息回传和 Windows 写入隔离均未进行真实模型/运行验收。

## 证据来源与版本边界

没有重做环境盘点。本次只读 `D:/Deepseek Harnes/resources/app.asar` 中安装包公开 README、package.json 和编译 JS，不执行归档内程序、不读账号配置。

| 证据 | 实际版本 / 含义 |
| --- | --- |
| 当前桌面安装随附 `dsh-subagent`、`dsh-tool-subagent` | `0.2.2-rc.5`，本报告模板和离线测试的主要依据 |
| 用户 desktop profile 的 `dsh-tool-subagent` | `0.2.1-rc.5`，旧 README / `.d.ts` 使用 `modelSelectionSettings` |
| PATH DSH CLI | 前次已确认 `0.2.1-rc.2`，不能代替当前桌面安装接口 |
| 当前桌面包工具配置 | `modelSelection` 与 `modelDiscovery`；不可照搬旧 `.d.ts` |
| 官方上游 | 包元数据指向 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)，本次 GitHub API 限流，公开 raw 路径请求返回 404；核心结论来自本机同版本公开包，不冒充已核当前远端 main |

桌面归档含公开文档，不代表其中每个模块当前已挂载；profile 旧包存在也不证明其已覆盖桌面包。SDK 项是根代理从官方 Context7 README 交叉核得，本机未确认 SDK backend 安装或启用。

## 三条原生路径

| 能力 | In-process spawn | In-process fork | DSH SDK backend |
| --- | --- | --- | --- |
| 执行位置 | 同 Host 进程、共享 LLM/tool services | 同 Host 进程 | 独立 SDK 子进程 |
| 初始上下文 | 空对话，任务必须自包含 | 父会话已完成轮次的单次快照，不含进行中的轮次 | 空对话 |
| 独立 provider/model | `agentOptions` 静态覆盖；开启路由字段后可按精确授权列表选择 | 底层支持 `agentOptions`，**出厂 fork 工具禁用模型选择** | `agentOptions` 可覆盖 provider/model；有 backend 路由默认 |
| 独立 Agent preset | 支持 `agentPreset` / `allowedAgentPresets` | 不支持 | 不支持 |
| 后续消息/恢复 | 支持，需活跃的树根；冷恢复需持久化与 Session query | 同 spawn | 不支持 follow-up，一次执行 |
| 完成通知 | 自动通知仍在线的创建者 | 同 spawn | 同样有最终结果通知 |
| 深度限制 | 数值 `maxDepth` 可执行 | 数值 `maxDepth` 可执行 | backend 无 depthLimit 能力，工具需 `maxDepth: provider-managed` |
| Git/文件副本 | 不创建 | 不创建 | 不创建 |

来源：桌面公开包 `dsh-subagent`、`dsh-subagent-spawn-in-process`、`dsh-subagent-fork-in-process`、`dsh-tool-subagent` README 和相应 `lib/index.js`。SDK 依据官方 `packages/subagent/subagent-dsh-sdk/README.md`，由根代理提供核对结果。

## provider / model 路由规则

这里有两个不同的 provider：工具配置的 `provider: spawn` 选择**子代理执行后端**；`agentOptions.provider` 或模型调用参数 `provider` 选择**LLM 渠道注册 ID**。两者不能混用，也不是传任意 base URL。

0.2.2-rc.5 的工具 schema 接受 `agentOptions.provider/model/reasoningEffort/maxTokens`。静态值覆盖后端默认，缺省时按兼容规则继承父 Agent 最近一次请求的有效值，首请求之前使用创建选项。`maxTokens` 必须是正安全整数。

动态路由使用两层控制：

1. 工具 `modelSelection: true` 才暴露 `provider`、`model`、`reasoning_effort`；`modelDiscovery: true` 单独注册 `list_subagent_models`，同一 tool scope 只允许一个 discovery owner。出厂 Web/Desktop spawn 开启两项，fork 均关闭。
2. Host 的 `subagent-model-selection` 设置包含 `enabled` 与 `allowedModels: [{provider, model}]`。开启必须至少一条精确路由；新顶层 Session 创建时记录，子 Session 继承，恢复保留，之后设置变更只影响新 Session。

没有记录路由 policy 的老 Session，显式选择和发现只允许父 Agent **当前有效** provider/model；在旧对话里打开设置不等于获得新渠道授权，应新建 Session。精确 allowlist 控制模型显式选路，不是对部署者已配置的静态 `agentOptions` 做总拦截：省略三个选择字段时仍保留静态默认。

新版源码要求 `provider` 和 `model` 同时出现；`reasoning_effort` 也必须与二者同次提交，单独 effort 会在查询 adapter 或创建 child 前失败。显式给 provider/model 而省略 effort 会清除旧 effort，使用目标模型默认，即使模型路由没有变化。旧 `0.2.1-rc.5` 文档允许 effort-only 的表述不能用于新版。

工具会调用当前 LLM adapter 的 `resolveCallConfig` 验证有效路由；目录广告不是最终支持保证。离线验证没有调用此 adapter，也没有验证任何实际上游。

## 并发、完成与续聊

并发字段叫 **`maxActiveSubagents`**，不是 `maxConcurrency`。默认 8，取正安全整数；按同一顶层 Agent 的子代理树共享槽位，根 Agent 不占槽位。所有层级、本地和外部 child、正在启动、待处理输入及停止清理中的 activation 都计数。向 resident child 发消息复用槽位，冷恢复重新申请。

达到上限立即返回 `ACTIVATION_LIMIT_REACHED`，**不排队**。调整上限在下一次新建/冷恢复时读取；降低不杀当前任务。槽位是当前进程内控制，不是跨 Host 全局限制，也不是累计 token 预算。深度另外控制，默认 `maxDepth: 1` 只允许主 Agent 直接分派；显式工具深度覆盖 Host 默认。

工具 start 先返回 `started subagent <name>`，不是任务结果。运行时清理资源后通知仍在线的创建者；若 child 刚给创建者发过消息，完成通知可能不再重复最终答案。程序调用可用 `startActivation({delivery:'caller'})` 的 `result` 等待，不会同时发 parent 通知。

`dsh-tool-subagent-control` 默认注册四个工具：

- `send_message({agent, message})`：同树 root / resident continuable child 互发；忙碌者下一步收到 steer，闲置者启动或恢复。返回 inbox 接收，不返回答复。
- `list_agents({})`：发现 root 和可续聊后代，外部一次性节点不列为可续聊成员。`running/inactive` 只表示活动状态，不表示成功/失败。
- `interrupt_agent({agent})`：祖先可打断后代；本地仅停当前轮、后续可续聊；外部执行终止后不能续聊。后代不会因此自动全部停下。
- `wait_agent({timeout_ms})`：只等待调用者自己的下一步 inbox，默认 30 秒；消息、完成通知或用户 steering 可唤醒，不提供独立任务成功判定。

本地消息需树根仍在线；中间创建者可以离线，冷恢复只恢复目标。一般关闭父运行不能据此推定所有后代已停止，Host 应执行对应 drain 生命周期。

## 工作目录与写入隔离

**不同 Agent 的 cwd、scope 或 preset，不等于不同工作副本或完整安全沙箱。**

源码 `childSessionMeta()` 继承父 Session header 的 workspace cwd；另由 `workingDirectory.set(child, requestedCwd)` 设置子代理当前工作目录。因此调用时的 `cwd` 可以变化且与父后续 cwd 变化独立，但不会自动把写权限边界收缩成该 cwd。子代理保留父 permission roots，授权在创建时固定，要求新审批的操作自动拒绝，不能从子会话自行扩大。

`dsh-scope` 仅隔离工具、提示、事件等注册贡献，README 明确不是 sandbox 或权限边界。独立 preset 控制工具组合，但 YAML/plugin 可执行 Host 代码；父 Agent 临时 tool restrictions 不自动导入 child，应使用明确的 child preset。

若 Host 实际挂载 enforcing consumers：

- `dsh-fs-sandbox` 约束 write/edit/patch/delete/move；read/list 仍不受此写栅栏限制。它是可信代码路径策略，不是内核隔离。
- `dsh-sandbox-policy` 的 `workspace-write` 以 Session 不可变 workspace 为界；`registerWritableRoot(session, dir)` 是当前 Session 注册，不被子 Session 自动继承，不持久化。
- Windows ACL sandbox 报 `enforcement: partial`，有 NTFS hard-link、未限制读取及 AppContainer ACL 边界；共享同一 workspace 的 Session 共享其写权限，只有私有临时目录分开。
- Windows `additionalWritableRoots` 对 file write/edit 生效，**不扩展 PowerShell、terminal、PTC 等沙箱进程的 ACL**。Git linked worktree 的共享 Git 目录因此可能出现“能编辑源码但 git 写操作失败”；应由统一主控整合，不能把扩大 file-tool grants 当作 shell 权限已解决。

文件冲突的实际防线仍是主控准备各自 worktree/分支、划分文件所有权、统一集成。当前研究未创建 worktree，也未启动 Windows sandbox；没有声称本机实测隔离已通过。

## 最小配置参考（0.2.2-rc.5）

以下为 **已有 Host 服务之上的 composition 片段**，不是可直接替换用户 cordis.yml 的完整部署文件。现有 Desktop 已有同名服务时应更新其现有条目，不能复制挂载第二份；provider/model 占位符必须替换成 Host 中已注册渠道及真实模型 ID。

### 固定两个角色路由，先避免动态配置复杂度

```yaml
- name: '@deepseek-ai/dsh-subagent'
  config:
    maxDepth: 1
    maxActiveSubagents: 2
- name: '@deepseek-ai/dsh-subagent-spawn-in-process'
- name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: spawn
    toolName: delegate_implementation
    agentOptions:
      provider: '<registered-provider-a>'
      model: '<model-a>'
- name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: spawn
    toolName: delegate_review
    agentOptions:
      provider: '<registered-provider-b>'
      model: '<model-b>'
- name: '@deepseek-ai/dsh-tool-subagent-control'
```

两个工具独立固定路由，模型不会直接得到任意渠道选择权。静态 role/prompt 可写在任务中；若需要工具级只读 reviewer，应先声明独立 preset，再添加 `agentPreset: <declared-review-preset>`，不能仅靠名字假定只读。

### 同一 spawn 工具按已授权列表动态选模型

```yaml
- name: '@deepseek-ai/dsh-tool-subagent/model-selection-settings'
  config:
    enabled: true
    allowedModels:
      - provider: '<registered-provider-a>'
        model: '<model-a>'
      - provider: '<registered-provider-b>'
        model: '<model-b>'
- name: '@deepseek-ai/dsh-tool-subagent'
  config:
    provider: spawn
    toolName: subagent
    modelSelection: true
    modelDiscovery: true
```

要求上面的 subagent service / spawn backend / control 工具及 Host 标准服务已存在。Desktop 更直接的配置入口是 **Plugins → Official → Subagent**，设置深度、并发与模型授权；保存后新建会话。不要把这个片段中的新字段应用于 profile 的旧 0.2.1-rc.5 插件。

### SDK 仅作为后续外部执行候选

官方 SDK backend 的已核字段：`providerName: dsh-sdk`、`profile: sdk`、`patches: []`、必填独立绝对路径 `dshHome`、`provider/model/maxTokens`、`env`、`shutdownTimeout: 1000`、`disposeEofGrace: 6000`、`disposeGrace: 3000`。环境为清除已知凭据后的基线加显式 `env` 覆盖，不能视作继承桌面所有 provider 已自动可用。工具需 `maxDepth: provider-managed`。本次没有安装或给出未经本机验证的可运行 SDK 部署文件。

## 离线验证与未验证部分

`verify-native-routing.cjs` 从当前桌面 0.2.2-rc.5 公开编译 JS 精确提取纯路由 helper，在隔离 Node vm 中执行，**10 项通过**。结果见 `native-routing-verification.json`：

1. 省略动态参数保留静态路由/预算。
2. 动态选择关闭时拒绝显式路由。
3. 单 provider 拒绝。
4. 单 effort 拒绝。
5. 无 Session policy 拒绝非父路由。
6. 无 policy 接受父路由且清除旧 effort。
7. 允许 provider 下的未授权 model 仍被拒绝。
8. 精确授权路由通过且保留 maxTokens。
9. 重复路由被拒绝。
10. 空 provider/model 被拒绝。

这些测试验证实际随附代码的纯路由语义，**不验证运行中的 Host 使用哪份包、完整 composition 加载、真实 adapter preflight、模型调用、通知回传、吞吐量或沙箱写入**。没有导入/启动 DSH，没有运行 `--dump-config-schema`，没有更改 provider、凭据、全局配置、账号或已有进程。

可复核脚本仅读取公开安装归档并将验证结果写在本研究目录。全部配置片段保持未安装状态。本项研究到此冻结。
