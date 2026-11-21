> 历史研究/过程记录（已脱敏）；不是当前任务或执行授权。以仓库 STATUS 和现行工程规范为准。

# HMB 发布版 0.69.7：多 provider 与 DSH adapter 离线核对

核对日期：2026-11-20。只读公开包与既有官方缓存；未安装、启动 daemon、读取本机凭据、调用 DSH CLI 或发送模型请求。

## 发布版本

主代理取得 [PyPI 官方 JSON](https://pypi.org/pypi/hey-my-buddy/json)，本机保存为 `hmb-pypi.json`。其中当前 version 为 **0.69.7**，wheel 于 **2026-11-17T02:39:21.981403Z** 上传，未 yanked。wheel METADATA 同样是 0.69.7，MIT，要求 Python >=3.12,<3.13。wheel SHA256 已重新核验：

`1d94fdeed44b3bc8e7c08f16d44ce559d51f6e11672a13ae51508b2532ab424b`

main 分支文档出现的 0.71.0 不能当正式已发布版。固定 0.69.7 有现成公开 wheel，可作为今后经过授权的可复现实验对象；这不代表本机运行已通过。

## 已从真实发布包确认的行为

来源为 `hmb-0.69.7/hey_my_buddy/buddy/harnesses/dsh/native_run.py`。

- `run_discovery`（1706 行）启动独立 ACP，initialize、session/new，读取 configOptions，session/close，然后确认进程停止。**不发 prompt、不配置模型**；原生初始化仍会加载 DSH 自己的配置，不能承诺完全零本机写入或底层网络。
- `_catalog`（1778 行）解析 model option 内 JSON 字符串形式的 `[provider, model]`，按 provider 分组。同模型名可同时属于不同 provider。reasoning_effort 是这次 session 提供的公共选项列表，复制给各 model；**per-model effort 支持与 context window 并未由该接口证实**。
- `_configure`（670 行）用目标 provider+model 匹配已声明原生 option 的完整 value，经 `session/set_config_option` 写入 model，再写 reasoning_effort。readback 与请求不同则失败；readback 缺失只标 unknown，仍可能继续 turn，不能把 requested 当作 resolved。
- 每个执行有自己的进程、AcpClient、connection 和 root session；model 选项按 sessionId 设置。源码结构支持不同 Worker 选择不同 provider，不靠反复修改全局默认 provider。但**并发跨 provider 的原生运行、服务限额及商家实际路由没有本次实测**。
- `_launch_agent`（548 行）传入 `--profile acp --patch <本次私有补丁>`。补丁仅固定 session-record 与 storage-json 根目录及工具权限项。HOME、DSH_HOME 保持原生配置，provider/credentials 不复制。
- `_micro_task_binding`（378 行）绑定 taskId、sessionId、cwd、provider/model/effort，不能把另一 provider/task 的旧 session 当同任务继续；权限档位变化也会在业务层重建 session（发布包 workers.md）。
- `discovery.native_environment`（364 行）真实代码已核对：保留 DSH_HOME、其他配置目录、PATH、proxy、CA路径等，排除来自调用 shell 的 API key、endpoint override 与 HMB_AGENT_CREDENTIAL_FILE。DSH 私有桥的本次 credential 是后续明确添加，不是继承 Host 权限。
- `acp/client.py` 的 PermissionPolicy 对升级权限请求优先 reject_once/reject_always，否则 cancelled；这不等于所有工具都受 OS 沙箱约束，强度仍依赖 DSH 版本与所选 scope。

## 版本选择与 Windows 边界

官方现有文档提供 `harness-set {"harness":"dsh","path":"<绝对可执行入口>"}` 作为手动首选，刷新报告会显示 path/command/version/source。它选择的是入口，不是替用户下载或版本锁文件；入口被更新后仍需核实实际版本。Windows .cmd 按受支持的字面 shim 解析，而不作为任意 shell 脚本执行。不应为了让它找到版本而修改用户全局 PATH。

发布包 `_distribution/references/workers.md` 中，早期 DSH 0.1.5-rc.1 的权限/续会话实测来自 macOS；较新 main 文档提及 Windows 11 Codex/DSH 实用与 0.2.1/0.2.2 的特定检查。这些来源的验证对象不同。不能直接得出“0.69.7 + 本机任意 DSH + Windows 全流程已验证”。

上轮 main operations 已记录 Windows caller Job 禁止脱离时，经 virtualenv 启动可能错误报告成功，daemon 随调用方退出，尚未检测到。正式小试点应把“关闭创建它的终端后服务是否存活、取消后自有进程树是否消失”设为独立验收。当前研究没有启动服务，不能作通过声明。

## 实际离线检查

`hmb_offline_checks.py` 从固定 wheel 解压出的真实源码 AST 直接载入指定纯函数，避开缺失依赖和任何包初始化。使用合成 ACP 选项与合成环境，不 mock 出一次“真实模型成功”。七项通过：

1. catalog 同时保留两 provider 的同名模型、去重；
2. selector 必须匹配 provider+model；
3. 未声明 provider 拒绝；
4. effort 必须已声明；
5. 缺失 readback 保持 unknown；
6. 续会话绑定拒绝 provider/task 改变；
7. shell credential/endpoint 被过滤，DSH_HOME/proxy/CA保留。

结果与源码 SHA 在 `hmb-offline-results.json`。这些结果证明 **发布包纯逻辑**，不证明 ACP transport、daemon、调度、Windows Job、真实账号或模型服务可用。未运行官方全套测试；wheel 不带完整测试树，当前 Python 缺 c-two/psutil/portalocker/pywin32 等依赖，未为此安装。

## 建议

HMB 是值得纳入开放比较的现成 CLI 协作层，发布包已具备跨 provider 选择与有身份的 session 逻辑。是否比终端 multiplexer 或更高层控制面合适，应结合 Host 自动派工、结果回传、整合验收、取消清理和本机实际 CLI 配置决定，不能因为 DSH 既有调研链路就自动优先选 DSH Worker。

后续最小原生试点可固定 HMB 0.69.7、一个明确 DSH 入口，先仅做 no-prompt catalog 与停止确认；随后在隔离任务目录用两个明确 provider 各做一个只读有界任务，再测取消/重连/进程回收。任何模型执行与账号调用应由主任务既有授权决定，本报告未执行。
