> 历史研究/过程记录（已脱敏）；不是当前任务或执行授权。以仓库 STATUS 和现行工程规范为准。

---
title: linux.do正文读取反复刷新修复与固定标签验证
type: how-to
date: 2026-11-20
tags: [browser, cdp, linuxdo, debugging]
source: 梵烬个人自修驿站开发与设计文章读取
---

## 背景

读取设计参考文章 https://linux.do/t/topic/3202326 时，用户发现浏览器持续刷新。原工具链为 do.sh linuxdo → 按楼循环 bfetch-text.sh → cdp.mjs。

## 内容

根因：bfetch-text.sh 在每一楼请求前调用不带目标参数的 cdp.mjs nav；cdp 默认取 pages[0]。每次导航和读取又分别选择页面，多任务使用浏览器时可能误选 DNS 或本地应用标签。旧逻辑还以正文超过20字节判断成功，会丢掉正常短回复，且不区分验证、登录和限流响应。

先停止旧抓取任务。保留原文件备份后更新 do.sh、bfetch-text.sh、cdp.mjs，新增 browser-text.mjs。统一入口仍为 do.sh。

修复约束：

1. 使用对应文章的专用标签，固定完整CDP标签ID；不存在时至多新建一次，绝不导航默认标签。
2. 同一任务每楼只进行同源GET读取，不调用Page.navigate。请求前后检查URL、文章ID和performance.timeOrigin。
3. 明确楼层范围，缓存续读；合法短回复保留。manifest区分范围扫完、内容齐全、缓存来源是否已验证、缺失和停止原因。
4. 验证、登录页、401、403、429立即停止；普通读取连续失败三次停止。固定标签消失或发生导航也立即停，不回落到其他标签。
5. 缓存曾未验证来源时，重复读取缓存不能自动升级为已验证；原文、凭据和cookie不进入知识沉淀。

运行形式：

```sh
bash ~/.agents/tools/do.sh linuxdo TOPIC OUTPUT_DIR --start 1 --end LAST_POST --target-id EXACT_TAB_ID --delay-ms 1000
```

Windows使用已安装Git Bash，避免默认bash指向未配置的WSL。LAST_POST来自页面可见楼数；帖子后续新增内容不在本次完整性声明内。

验证证据：

- 用假CDP重现旧逻辑：读取3楼导致3次无标签目标导航。
- 16项模拟回归通过：标签固定、至多新建一次、不改其他标签、验证停止、失败阈值、短缓存、范围续读、导航变化停止与来源状态保真。
- 真实固定文章标签先补读41–43楼：3次HTTP200，页面timeOrigin均为1795170312857.3。
- 随后读取页面当时显示的1–60楼：42份缓存、18次补读、0缺失，completed=true；补读前后timeOrigin仍为1795170312857.3。
- 正文完整保存，评论大多为收藏与致谢；涉及移动端参考不足的讨论不被泛化为移动端已覆盖。

结论范围：证实本次刷新由读取链主动导航触发，并在修复后的真实补读中停止。没有据此声称网站自身永远不会刷新。

## 关联

- 全局工具：{USER_HOME}/.agents/tools/
- 原文件备份：{USER_HOME}/.agents/tools/backups/browser-refresh-20261120/
- 审阅补丁与测试：本项目 scripts/tools-fix/
- 读取清单与正文：本项目 output/research/linuxdo-3202326/manifest.json、raw-1.md

复用规则：多代理共享浏览器时，一切有状态操作都应固定标签。正文读取不要为每个请求反复导航。修复读取器后同时验证“不刷新当前页”和“不碰其他页”。
