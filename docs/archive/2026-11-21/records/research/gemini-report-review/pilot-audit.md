> 历史研究/过程记录（已脱敏）；不是当前任务或执行授权。以仓库 STATUS 和现行工程规范为准。

# CODEX_PILOT_HANDOFF 安全与可执行性复核

核对日期：2026-11-21。对象为 `extracted.md` 的第二部分 P071–P191，按 P 编号定位。报告中的命令均作为待审文本，没有执行。只读取本地现成资料、仓库配置，运行明确 npm 入口的四个 `--help`；未调用模型、启动服务、安装依赖、改 CLI 配置、创建工作树或修改原 DOCX。

结论：方案可作为探索方向，但**不能按当前交接单直接开跑**。尤其“不到 300 行即可实现确定性恢复、限流、全树清理且 100% 适配 Windows”的断言没有原型或运行证据。以下五项先修正，再决定是否自建调度器。

## 1. 回退命令越过单次任务边界，会删除其他试点成果与凭据

**定位：P164–P165、P186；阻断。**

P186 的 `Remove-Item -Recurse -Force "C:\ma-pilot\wt", "C:\ma-pilot\homes"` 删除的是共享父目录，不是当前 run 的注册资源。它可删除其他 run 的未提交文件、正在运行的工作树，以及两渠道的登录状态。它还违背 P088 的“禁止清理非试点目录/未归档改动”自身约束。先前某个 `git worktree remove` 失败，也不会阻止这条删除命令。

P165 的“worktree list 仅剩主仓库”同样错误：本机当前已有 **2 个**工作树，不属于本试点的检出必须保留；进程列表差集为零也不是合理目标，正常用户操作和现有后台任务会产生新进程。全局 `git worktree prune` 不应作为单次试点的例行清理。

**最小修正：**开始时记录已有工作树；每次 run 使用独立随机目录和创建清单，只对清单中的精确路径、分支和已确认归属的进程操作。规范化绝对路径并检查 reparse point/链接边界；工作树移除失败就保留，禁止随后强删父目录；按 run 归档包含新文件、二进制和文件模式的成果。仅删除本次创建且已归档的精确资源，原有 homes 默认保留，清理验收比较“本次自有资源归零、原有资源未动”。

## 2. 裸 PID + taskkill /T 不是持久的进程归属与停止证明

**定位：P125、P154–P155、P186；阻断。**

`state.json` 保存 PID，再运行 `taskkill /PID ... /T /F`，无法安全处理 PID 复用、根进程先退出、子进程已经脱离、枚举与终止之间的竞态。事后 `Win32_Process` 扫描不能恢复未曾记录的完整归属关系。“10 秒内 cancelled”若只根据发出终止命令，可能让新任务重复执行并删除仍被使用的目录。

已有上游证据并不支持把这个问题压缩为几行命令：HMB 真实发布包 `protocol/owned_process.py` 用挂起创建、私有 Windows Job、身份绑定与停止观察；`process_handle.py` 明确 Windows 只有 PID、没有 held Job 时停止状态为 unknown。T3 的 ACP runtime 对 taskkill 非零返回失败，也注明缺失根进程不足以证明后代退出。

**最小修正：**优先复用已审阅的进程宿主。若确需自建，创建时即持有进程 handle 与 PID/创建时间、唯一 task/attempt 身份，并用适用的 Job Object 控制已归属后代；Job 加入失败时拒绝开始。取消先进入 `cancel_requested/stopping`，有界等待后只有确认拥有的树已空才能标终止；不明就保留 `shutdown_unknown`、工作树、并发占用与证据，不自动重派或清理。测试须含根先退出、取消期间再派生、调度器崩溃和正常已有浏览器并存。

## 3. “200–300 行薄调度”低估了协议、恢复与限流合约，JSON 本身不证明成功

**定位：P095、P111–P113、P125、P129–P131、P136、P158–P161；阻断实现结论。**

本机 `codex exec --help` 明确 `--json` 是 **JSONL events**，不是一个“确定性最终成果对象”；另有 `--output-schema`。Claude `--help` 有 `--json-schema`、JSON/stream-json 形式，输出封装本身不等于代码通过验收。应区分最终原生成功事件、进程退出码、结构化答案校验、Git 成果身份和工程门禁。截断 JSONL、错误结果对象、模型正常结束但测试失败都不能写成 completed。

`state.json + task_id` 也不自动提供幂等。启动成功而状态写入前崩溃、模型已经写代码而回执丢失、completed 状态对应文件后来改变，都要求原子持久化、互斥和执行身份/输入哈希/输出 commit 的核对；不能只跳过 X、重跑 Y。时间戳重叠仅证明调度器记录的区间重叠，不证明两次模型请求同时执行。

P161 的简化 HTTP 429→200 fixture 只能验证调用它的退避函数；若 CLI 自己调用上游，它可能内部重试且不把 Retry-After 交给调度器，空的 200 响应也不符合各厂商协议。不能据此声称端到端 CLI 冷却已通过。P112 的模型字段通常是原生请求、配置回读或供应商报告的标签，不是中转背后物理模型的独立证明。

**最小修正：**删去行数与“100% 可靠”承诺，以可验证的小范围原型定义成本；显式 schema、逐行解析、stderr 分流、截断/失败保守处理。状态采用单写者或锁、原子替换，记录 attempt、spawn intent、session、base/head 和产物哈希，恢复先做 reconciliation。模型证据标 `requested / native-readback / provider-reported / unknown`。429 分“离线退避逻辑通过”和“该 CLI 暴露的真实拒绝通过”，不重试已有副作用却结局不明的任务。

帮助差异也须保留：本机 `exec resume` 支持精确 SESSION_ID，但其帮助不列 `exec` 的 `-C/--sandbox`，不能原样拼同一组参数；当前两个帮助里未确认报告的通用 `max_turns` 参数，不能先宣称跨 CLI 硬上限。记录同一 home、cwd、harness/provider、session 绑定后才续会话；不使用 `--last` 或跨 home 猜测。

## 4. 配置目录和 worktree 不构成完整安全隔离；只读校验不能用 git status 替代

**定位：P075、P084、P098–P110、P126、P139、P144、P148。**

独立 CODEX_HOME/CLAUDE_CONFIG_DIR 是合理的配置与会话分离方式，但不保证系统 keychain、共享 .git、项目 hooks/MCP、插件、shell 及其它文件不可访问。独立 home 也不会自动继承现有登录和全部项目规则，不能同时承诺“零迁移保留现有登录”与“完全独立凭据目录”。T3 官方 Claude 文档明确自定义目录保留 HOME 与系统 keychain 位置；Codex 文档明确完全独立 home 不能继续另一 home 的会话。

`--allowedTools` 是允许列表配置，不能单独证明其余工具不可用；本机 Claude 帮助另外区分 `--tools`（实际可用内置工具集）、`--restricted`、`--strict-mcp-config`、设置来源。具体组合仍需在选定版本验证，不能把 `Bash(git *)` 当安全只读。工作树内 `git status` 为空看不见忽略文件、仓库外写入、网络副作用或共享 refs 变化。

P110 被放在“只读预检”，但示例没有设置独立 CODEX_HOME；执行 sandbox 命令不是单纯 --help，可能触发当前全局配置/沙箱初始化。当前 help 只能确认参数入口存在，不能确认 `windows.sandbox=mxc` 的值有效或不会改机器状态。P103 的建目录本身也不是只读。

**最小修正：**把预检拆成纯读取与显式试运行。每个 child 用独立环境字典传入 home、固定代理和渠道变量，不在并发父进程反复改共享 `$env:`；PowerShell 5.1 下不要假定有新版 Start-Process 的环境参数。只读 Reviewer 选择已验证的工具/权限配置，去掉 shell/写入/无关 MCP，或使用可靠 OS 限制；将工作树/配置隔离与权限限制分别验收。测试不读取或复制真实秘密；不把清理 homes 当例行回退。

## 5. Git 与质量门禁契约需要对齐本仓库，避免验证旧构建或漏掉越界成果

**定位：P106、P117–P123、P133–P150、P163–P165。**

交接单把“文档、lint、类型、静态数据、Playwright”称全量门禁，但本仓库还要求 Pages 内容/构建与 Python 解析测试。`test:e2e` 只测试已有 `dist/`，五个命令若没有先构建，可能测试过期结果；测试也会创建产物、临时服务和浏览器，不应标成“主目录只读运行”。当前 `playwright.config.ts` 已支持 `E2E_PORT`、strictPort、reuseExistingServer=false、隔离 context 和 Playwright 自有 preview，不必先改这些架构。

`git diff --name-only main...HEAD` 假定 main 是正确固定基线；当前工作分支实际是 `codex/pages-personal-library`。提交比较不包括未提交、未跟踪、被忽略文件，也不足以证明 Worker 白名单无越界。普通 `git diff` 导出的 patch 默认漏新未跟踪文件，删除试点前必须证明产物完整。不同渠道也不必然是不同底层模型或真正独立审阅者。

**最小修正：**冻结用户确认的确切 base SHA，不要求为试点清空用户工作区；各 worker、baseline、integrate 绑定同一 SHA。按精确允许路径核对 staged/unstaged/untracked 及提交后的完整 tree delta，保留 binary-safe patch 或已核验 commit 引用。只由 Lead 在**本次集成工作树**对固定 commit 做 merge/cherry-pick/apply，并检查冲突与越界；结构化审阅结论不得自动授权改默认分支、push 或发布。完整验收用本仓库 `npm run check:release`（含 build 与 parser）并绑定同一构建，临时端口冲突应失败或重新选端口，不能停用户服务。

## 本次实际证据

- `codex-exec-help.txt`、`codex-resume-help.txt`、`codex-sandbox-help.txt`、`claude-help.txt`：本机当前 npm shim 的只读帮助输出。没有执行 sandbox 示例或模型 turn，没有据帮助宣称原生运行成功。
- 当前仓库 `package.json`、`playwright.config.ts`、`docs/DEVELOPMENT.md`、`docs/agents/WORKFLOW.md`；只读 Git 得到当前分支及 2 个现有 worktree。
- 上轮官方资料缓存：`../multi-agent-open-landscape/sources/t3-release-providers-claude.md`；`../multi-agent-3212629/sources/t3-codex.md` 与 `runtime-excerpts.txt`。
- 已核 SHA 的公开 HMB 0.69.7 wheel 解压源码：`../dsh-collaboration/hmb-0.69.7/hey_my_buddy/protocol/owned_process.py`、`process_handle.py`。这里只作为已实现进程归属机制的对照，未安装或运行 HMB。
- 官方链接：[Claude provider 配置边界](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-claude.md)、[Codex provider/home 边界](https://github.com/pingdotgg/t3code/blob/main/docs/user/providers-codex.md)、[HMB 进程归属实现](https://github.com/Dsssyc/hey-my-buddy/blob/main/src/hey_my_buddy/protocol/owned_process.py)。链接的 main 会变化，本次结论以已保存快照和发布包为准。

此审查不否定薄脚本探索，也未决定替用户实施哪条方案。它指出当前交接单需改成有明确失败状态、归属边界和验收证据的试点规范，不能把外部报告的“执行说明”当作用户授权。
