> 历史研究/过程记录（已脱敏）；不是当前任务或执行授权。以仓库 STATUS 和现行工程规范为准。

# Herdr 官方能力核对

核查日期：2026-11-20。本文只读核对官方仓库文档，没有安装、运行 Herdr、执行官方安装命令、修改任何模型/终端配置或控制用户会话。

## 1. 核查来源与版本边界

本轮 `herdr.dev` 的 crw 读取返回 `Access to {SERVER_IP} is not allowed`，因此没有假称访问成功；改用该产品明确链接的官方 GitHub 仓库文档。已把实际读取的13份文件及URL/blob SHA保存于 `herdr-official/`，索引是 `herdr-official/source-manifest.json`。

主要来源：

- [Herdr 主项目 README](https://github.com/herdrdev/herdr/blob/master/README.md)
- [官方版本清单](https://github.com/herdrdev/herdr/blob/master/docs/versions/manifest.json)：当次 `current: 0.9.5`、稳定源码提交 `2ecf19a92fc3a7fff75b6ce3655ef04f4625ec01`。
- [0.9.5 Agents](https://github.com/herdrdev/herdr/blob/master/docs/versions/0.9.5/website/src/content/docs/agents.mdx)
- [0.9.5 Agent automation](https://github.com/herdrdev/herdr/blob/master/docs/versions/0.9.5/website/src/content/docs/agent-automation.mdx)
- [0.9.5 Configuration / Worktrees](https://github.com/herdrdev/herdr/blob/master/docs/versions/0.9.5/website/src/content/docs/configuration.mdx)
- [0.9.5 Windows support](https://github.com/herdrdev/herdr/blob/master/docs/versions/0.9.5/website/src/content/docs/windows-beta.mdx)
- [0.9.5 Integrations](https://github.com/herdrdev/herdr/blob/master/docs/versions/0.9.5/website/src/content/docs/integrations.mdx)
- [herdr-core（hc）README](https://github.com/herdrdev/herdr-core/blob/master/README.md)
- [hc templates](https://github.com/herdrdev/herdr-core/blob/master/docs/templates.md)
- [hc machines](https://github.com/herdrdev/herdr-core/blob/master/docs/machines.md)
- [hc security](https://github.com/herdrdev/herdr-core/blob/master/docs/security.md)
- [herdr-app README](https://github.com/herdrdev/herdr-app/blob/master/README.md)
- [herdr-app security/privacy](https://github.com/herdrdev/herdr-app/blob/master/docs/security.md)

不能把主项目稳定0.9.5、独立hc当前master、独立herdr-app当前master当成完全同一套命令/限制。特别是状态识别、Windows attach和恢复语义有差异。实际选型时应先选具体产品与版本，再用它随附的help/skill，不能拼接不同版本的安装与控制命令。

## 2. 能解决什么

主项目自述为“the runtime your coding agents live on”，保留真实终端与现有编码CLI。官方明确说不会包裹或替换Claude Code、Codex等，它拥有这些程序的终端。

| 需求 | 官方已支持的机制 | 不能据此推断 |
|---|---|---|
| 多终端集中管理 | workspace/tab/pane，键鼠分屏，工作/阻塞/空闲列表 | 自动确定各模型谁更擅长某任务 |
| 一个代理派活给另一个 | 主项目 `agent start/prompt/read/wait`；hc `run/send/read/wait --children`、父子通知 | 已有强制项目管理器、完整DAG调度、交付正确性判断 |
| 人接管代理终端 | 主项目可按面板交互；hc attach；桌面app可peek子终端 | 接管行为自动继承当前平台的批准范围 |
| 断开后继续跑 | 后台core/server托管终端；关viewer/SSH断开时运行进程可继续 | 重启机器后原进程仍活着；官方明确原进程不跨机器重启存活 |
| 多服务器 | SSH或明确自定义连接，远端core拥有程序和文件 | 自动把项目文件同步到所有机器或自动处理分支冲突 |
| 工作树 | 0.9.5侧栏new/open worktree创建独立checkout和workspace | 自动merge/rebase、自动解决冲突、质量门禁自动通过 |

### hc 的真实编排方式

当前hc README中，`hc run --bg --name review reviewer <task>` 可按模板启动代理；`hc send`发送任务，`hc read`读输出，`hc wait --children all`等待子代理。在hc终端内启动的代理成为其子节点，父代理可收到子代理需处理或结束的通知。子终端默认随父结束，除非显式outlive-parent。模板只定义已安装的启动命令和角色文本，不会安装编码助手、不会配置其状态上报，也不是隔离规则。

官方还明确生命周期边界：Unix上结束终端向程序和前台job挂断，故意nohup/setsid脱离的后台服务可能继续占端口；Windows使用job-object cleanup。不能把“关掉面板”直接当作任何子服务都已释放，仍应核对任务资源。

## 3. 模型与自定义provider

**Herdr不是统一模型API中转器。** 依据README的“不替代现有CLI”及hc模板页：模型选择和其他助手参数放在该CLI的启动command中。主项目`agent start --kind ... -- <args>`会把`--`后参数原样传给所选可执行程序。

因此：

- 如果用户已有Claude、Codex、Gemini、Grok CLI各自可用的登录或provider配置，可以把对应命令放进不同终端/模板。
- 自定义base URL、API key、模型别名、订阅登录是否可用，取决于具体编码CLI本身；本轮文档没有支持“只要能调用OpenAI兼容API就能被Herdr无差别接入”的保证。
- 未被Herdr识别的工具仍可作为普通终端运行，但可能没有可靠agent状态；hc可用`ready: quiet`等候输出安静，官方明确**安静不证明准备好**，也不会赋予语义agent状态。
- 论坛设想“Gemini负责指挥，GPT/Grok负责执行”在终端派活这一层有可行机制，但前提是这些CLI确实安装、认证成功、参数正确、能被控制并回报；本轮未在用户机器上验证这些前提。

### 状态识别必须分版本

- **Herdr 0.9.5**：内建支持列表覆盖Claude Code、Codex、Grok CLI等；Gemini CLI标注 `state only, less tested`。一部分工具靠屏幕规则识别工作/空闲/阻塞，一部分integration直接上报；Claude/Codex/Grok的会话hook主要提供session身份，状态仍依赖屏幕检测。
- **当前独立hc**：README说状态来自程序OSC 7501上报，core不根据屏幕文字或品牌猜测；不报告的程序没有状态。
- 0.9.5官方说明未识别的新许可提示可能被当作idle；idle不是批准。Grok/Antigravity返回prompt时，后台任务或subagents仍可能运行。wait只能证明观察到某状态，不证明项目任务成功。
- prompt timeout或stalled不证明输入没送出；重试前须读输出，避免重复派任务。使用真实返回的终端/代理ID，不猜测ID。

## 4. Windows与中文输入

| 层 | 已核实Windows范围 | 重要限制 |
|---|---|---|
| Herdr 0.9.5终端界面 | 官方页写native Windows generally available；ConPTY、Windows Terminal/PowerShell、持续会话、SSH多机、常见agent集成、worktree detection | 直接`herdr terminal attach`和live handoff不支持；plugins为preview；中文IME候选框位置可能受绘制光标影响；后续cd路径检测部分支持 |
| 独立herdr-core hc | README列Windows x86_64发行版；默认pwsh可用则选pwsh，否则Windows PowerShell | 模板和quoted shell command需要PATH中的`sh`，例如Git for Windows；Windows远端认证建议SSH key/agent，不共享交互password登录 |
| 独立herdr-app | README列x64 Windows、curl+tar（Windows10 1803+）；安装器可装/更新core | 是另一桌面应用，不能把主Herdr“no electron”的文案误当成该app具体技术或所有平台承诺；应单独验当前发行包 |

0.9.5关于IME的具体说明：默认绘制光标可减轻闪烁，但不为中文/日文/韩文输入法定位候选UI；可选原生光标恢复IME锚点，代价可能是闪烁。prefix自动切ASCII输入仅韩文IME支持，不能说中文切换已解决。

这些是官方文档能力，不是本机安装验收。当前用户浏览器启动问题不能据此归因于Herdr，本轮没有安装它。

## 5. 工作树与协作交付

0.9.5文档明确支持在Git workspace的侧栏创建/打开worktree；已有本地分支则检出，没有则创建。关闭父workspace组不会删除checkout或分支。删除checkout先请求Git安全移除，modified/untracked导致拒绝时会再次确认后才能强制移除；分支不删除。

这适合让多个写代码代理各自拥有checkout，配合一位负责人整合。但不是自动冲突解决。仓库仍需要明确：每个子任务负责哪些文件、基于哪个提交、验收命令、返回产物、由谁合并和发布。只读审查可以共享checkout；并行编辑同一文件仍需所有权或隔离工作树。

hc的`HC_SESSION`把终端与状态分开，**不构成文件/权限沙箱**；同账户客户端仍有访问能力。不要把不同session等同Git工作树或系统隔离。

## 6. 费用、隐私和配置改动

### 费用

Herdr主README与hc README都声明Apache-2.0许可。已读资料没有提供统一模型计价、包月包含额度或模型代付承诺。可以认定它是开源终端/编排软件；不能据此说Claude/GPT/Gemini/Grok推理免费。每个CLI的订阅或API调用仍应按其自身服务核验；增加并行worker会增加实际请求量。SSH/VPS等基础设施也不因Herdr免费。

### 权限与隐私

hc官方security页明确：以当前账户权限运行，不是sandbox或permission broker。能连API的同信任边界客户端可以执行命令、改文件和控制终端；配置模板没有执行权限隔离。Windows named pipe限制当前账户与SYSTEM，低完整性进程不能控制已提权core；这仍不等于每个代理单独批准。

原始终端历史、屏幕、状态文件可能含秘密，core不加密这些文件。远端SSH负责认证和加密，连接远端就是给本机客户端相应远端账户的终端与文件能力。

独立herdr-app官方声明：发行版使用遥测默认开启，可在Privacy关闭；报告包含安装ID、版本、OS、分桶用量、已知agent名称等，不包含终端文字、prompt、文件内容/路径。mods为可信JavaScript，能读文件、发网络、运行本机/远端命令，不是沙箱插件。这些是选型需要知道的事实，不表示本轮已改变用户设置。

### 安装integration不是无副作用

0.9.5 integrations页明确Claude integration写用户hook与settings；Codex integration写hook文件、hooks.json及config.toml相关feature字段；其他CLI也有各自plugin/hook改动。本轮只读其文档，没有执行任何安装。今后若评估应先做可审查的变更清单和备份，不把论坛“装一下”当作修改所有模型配置的授权。

## 7. 对本项目的建议（建议，不是已执行决定）

1. **先做最小验证，不先全量换平台。** 只读reviewer是最小任务：一个现有主代理，另一个已安装CLI，在隔离checkout读指定diff、产出文件，不提交不部署。验证launch、状态、失败、恢复、回报、收尾。
2. **先选单一Herdr控制体系。** 使用主0.9.5的`herdr agent/pane`，或当前hc的`run/send/wait`；文档和脚本与实际binary匹配，不混用命令。
3. **不改变已认可产品架构。** Herdr是开发工具候选；不把它放进梵烬静态网站依赖、不添加账号后端、也不作为用户浏览器必须安装的组件。
4. **继续以仓库规范和测试为验收。** 子代理done或终端空闲只代表状态；合并前仍审diff并运行现有release门禁，最终负责代理汇总真实证据。
5. **候选的价值定位**：它对“跨CLI、跨机器、长期终端保活、人能随时接管”的需求比较贴切。若当前主要工作已经在一个Codex会话内部协作，先量化缺失能力再增加工具；不能因为论坛多人推荐就自动迁移。

## 8. 本轮操作收尾

本子任务最初尝试读取linux.do时，9223端口无法稳定连接，失败manifest已留存且targetId始终null；没有拿到或创建可归属的研究网页ID。随后根代理明确接管浏览器，成功通过内置浏览器阅读帖子；本子任务之后只用GitHub读取官方资料，没有操作任何浏览器、没有新增官方网页标签，因此没有需要本子任务关闭的自建研究标签。根代理负责其自建帖子标签的最终关闭与二次核验。两次返回started但随后无监听的launcher结果未当成成功抓取证据。
