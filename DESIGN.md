---
name: 梵烬 · 阅读工作台
description: 以真实书架、连续阅读、段落书签与同屏私人笔记完成日常阅读。
colors:
  cinnabar: "#9B3B31"
  ink-teal: "#3E5C58"
  paper: "#FAF8F5"
  paper-surface: "#F3EFEA"
  ink: "#24211E"
  secondary-ink: "#68625D"
  rule: "#E5E0D8"
  sepia-paper: "#F2EBD9"
  sepia-surface: "#E9E0CA"
  sepia-ink: "#2A241E"
  sepia-secondary: "#6E6354"
  sepia-accent: "#8F342A"
  sepia-rule: "#DCD1BA"
  night-paper: "#161616"
  night-surface: "#1F1F1E"
  night-ink: "#D5CFC7"
  night-secondary: "#8A847C"
  night-accent: "#C1594D"
  night-teal: "#95B9B0"
  night-rule: "#2B2A28"
typography:
  display:
    fontFamily: '"Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", "SimSun", Georgia, serif'
    fontSize: "29px"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: "0.015em"
  reading:
    fontFamily: '"Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", "SimSun", Georgia, serif'
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.9
    letterSpacing: "0.015em"
  interface:
    fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.8
rounded:
  control: "4px"
  primary-button: "3px"
spacing:
  option-gap: "8px"
  group-gap: "25px"
  page-gutter-mobile: "20px"
  section-gap: "43px"
components:
  button-primary:
    backgroundColor: "{colors.cinnabar}"
    textColor: "#FFFFFF"
    rounded: "{rounded.primary-button}"
    padding: "11px 21px"
    height: "44px"
  option-selected:
    backgroundColor: "{colors.ink-teal}"
    textColor: "{colors.paper}"
    rounded: "{rounded.control}"
    padding: "9px 15px"
  reading-page:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    width: "680px"
---

# Design System: 梵烬 · 阅读工作台

## Overview

**Creative North Star: "阅读工作台"**

用户明确拒绝空泛的展示页和首屏偏好问卷。当前界面以真实书目和直接阅读操作开始；已有本机记录时优先显示继续阅读、收藏/在读书架与近期摘录。阅读区同时容纳固定目录、连续正文与可编辑私人笔记，减少短段频繁翻页与跨页面往返。

**Key Characteristics:**
- 首次打开直接搜索、筛选、选择真实经典；已有本机记录时使用本机聚合书架，不展示假统计。
- 桌面常驻目录与书签索引，正文最大680px；笔记侧栏同屏新增、编辑与回跳。手机目录按需展开、笔记使用抽屉。
- 兴趣与时间是折叠辅助，只有选择“适合这次阅读”时改变目录排序；偏好可清除，通过完整备份手动迁移。

## Colors

纸、墨、青黛与朱红。朱红给主行动与私人笔记印记，青黛表示选择、链接与阅读辅助。主题值由 `src/reading.css` 的 `data-theme` 定义；`src/personal.css` 消费同一套变量。

素宣用于一般室内阅读，古纸降低明暗刺激，松烟用于低照度场景。不要在页面局部硬写浅色底或灰字；所有公开页面都应跟随三主题。

## Typography

正文与标题使用已确认的中文系统衬线栈，无远程 Webfont 首屏阻塞。控件、标签和说明使用系统中文无衬线。正文桌面默认 18px、手机默认 17px；允许 16/17/18/20/23px；行距 1.85/1.9/1.95。古注与导读比正文小 2px、行距 1.7。

工作台标题29px、手机27px；书目标题23px、正文标题29px。不得在标题上方增加空泛眉题，也不以编号制造虚构顺序。

## Layout

首页最大1320px，桌面左右32px；目录采用书名、阅读位置、私人记录与操作的紧凑行。740px以下改为书名/位置与阅读按钮的两列堆叠，左右20px。阅读区最大1560px，常驻目录190–210px，正文最大680px，笔记侧栏310px；1200px以下笔记改抽屉。阅读正文最大680px，段间1.4em。导航使用熟悉的顶部链接，手机保留底部首页/经藏/自修/我的。所有关键按钮点击区至少 44px。

## Elevation & Depth

无装饰阴影。原文推荐页靠纸面色阶与 1px 边线区别，书目、注解和私人心得靠留白与细线组织。没有光晕、玻璃或仿古纹理。

## Shapes

按钮 3–4px 圆角，主体内容平直。时间采用三段分组控件，兴趣为可多选按钮，阅读意向为小型选项。边注和引用的侧线最多 1px。

## Components

- `PreferenceChoices`：兴趣多选、5/15/30 分钟、安静/理解/心得意向。`aria-pressed` 暴露选中态，保存状态与重设控制就近呈现。
- 工作台书架：真实聚合收藏、进度、计划、摘录与书签。章节位置不冒充阅读完成百分比；下架书保留本人记录但不显示可读链接。
- 同屏笔记：段落点击决定引用、书签与笔记范围；侧栏可查看当前段/全书摘录并直接编辑。三个辅助开头收进编辑器，不代写答案。
- 本机数据：无需账号。IndexedDB保存收藏、书签、摘录、阅读位置、日课和兴趣偏好；完整JSON可导出、预览导入并确认覆盖。清除浏览器数据会丢失记录，无云端找回或自动同步。阅读外观单独保存，备份文案明确不包含外观。
- 设置与错误：不弹出无必要模态；错误保留当前选择并提供重试。

实际参考：Minimal Gallery 的内容层级和筛选；Navbar Gallery 的静态导航与明确当前位置；Animate UI 的状态变更反馈。三站已通过独立浏览器标签实际查看，页面文本与截图存 `output/design-reference/`。未复制其订阅转化、巨型卡片和滚动数字。

## Do's and Don'ts

- Do 让主动选择改变真实推荐，并说明原因。
- Do 将选择、原文、心得组织为一个连续的私人流程。
- Do 保留版本来源与三层文本边界。
- Don't 生成或冒充经典原文、古人注解与用户心得。
- Don't 隐蔽推断信仰、情绪或上传私人记录或假称云端同步。
- Don't 用眉题、均等卡片、排行和炫技动画替代内容。

连续阅读兼容规则：现有稳定 passage slug 含 `--` 时，以前缀（如 `ch-01`）聚合章节；无前缀且整书不超过20段时以全篇连续阅读；其余保留单段作为章节。当前论语512段聚合20篇，心经7段与清静经11段整篇呈现。这是对既有数据的兼容分组，不声称拥有独立章节/段落表模型。URL、书签、进度、摘录仍绑定原始完整slug。滚动定位更新段级进度；编辑笔记或打开移动目录期间不自动切段。

实际工作台层级：辅助信息10/11/12px，说明13/14px，正文17/18/20/23px，书名22/23/24px，标题27/29/30px。现有余留非激活样式不代表当前首屏策略。
