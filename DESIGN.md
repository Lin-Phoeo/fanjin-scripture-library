---
name: 梵烬 · 以阅读为中心
description: 书架识别、章节定位、连续正文与按需记录各司其职。
colors:
  canvas: "#f7f7f3"
  surface: "#ffffff"
  muted-surface: "#eef1e9"
  ink: "#242924"
  secondary-ink: "#5d665f"
  primary: "#456454"
  secondary: "#8d493e"
  border: "#dde3d9"
typography:
  interface:
    fontFamily: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  controls:
    fontFamily: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  reading:
    fontFamily: '"Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", SimSun, serif'
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.9
  title:
    fontFamily: '"PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
    fontSize: "32px"
    fontWeight: 600
    lineHeight: 1.3
spacing:
  small: "8px"
  related: "12px"
  field: "16px"
  group: "24px"
  section: "32px"
  major: "48px"
rounded:
  control: "8px"
  panel: "12px"
---

# 梵烬阅读设计系统

当前为 GitHub Pages 纯静态应用，私人数据存于 IndexedDB。此次重构仅改变展示和交互组织，不变更备份格式、稳定段落身份和存储范围。

## 设计依据

依据 [一手研究](docs/research/2026-11-20-content-reading-ux-evidence.md) 和 [阅读产品实访](docs/research/2026-11-20-reading-products.md)，把界面分成四种任务：

- 书架和经藏：识别一本书，开始或继续阅读。
- 书籍详情：选章节；版本、来源、许可始终有明确入口，默认不全部展开。
- 阅读：原文连续可读，目录可收起，笔记按需打开。
- 个人工具：笔记优先自己的内容，日课优先记录，设置按偏好/备份/说明分组。

不以“字数少”“有封面”或“留白多”代替用户任务。主要阅读按钮始终可找；原文不因精简文案被删改。

## 单一视觉来源

公开页面仅加载 `src/design-system.css`、`src/reading-tools.css` 与 `src/settings.css`。旧四套 CSS 保留作历史，但不进入当前产物；不再用大批 !important 叠加修补。

- 界面为系统无衬线，14px 控件、16px 说明；原文和书名用中文衬线。
- 主色青黛用于行动与选中，朱红仅用于少量强调。未选中区域以中性色和留白组织。
- 控件、段落、章节采用不同间距；主体不是表格字段的平铺，也不是重复卡片。
- 纸色、古纸、暗色均由同名变量切换。正文默认桌面18px/1.9、手机17px/1.9，用户可调。
- 正文默认最大660px。中文行宽以字身近似和真实长文测量，不能套用英文字母行长；320px优先重排。
- 仅状态变化使用140ms反馈，尊重 reduced-motion。无入场表演或长滚动动画。

## 书封与内容

`BookCover` 为本站原创文字封面；色差帮助区分书目，不冒充历史底本封面。封面没有加入假出版社、版本年代或权威标签。

每本书只显示书名、学派、全文/节选、篇幅和一句短提示。完整作者、底本与许可保留在详情；不得缩减必须保留的出版头。

`LibraryShelf` 被首次书架与经藏复用。回访书架显示真实记录和一次续读行动。兴趣排序保留在经藏排序选择内。

## 阅读界面

48px简洁站头＋56px阅读工具条；阅读页不显示大页脚、重复本机提示或底部全站导航。桌面210px目录可收起；手机按需打开目录。选中原文后只显示一组段落操作，平常不在每段下面重复按钮和说明。

短经全文连续展示，多段作品依稳定 `chapter--paragraph` 标识分组。详情页以章节为单位，段落定位按需展开或直接搜索。文本原样保存，不自动补译注。

笔记编辑保留原文关联，保存后保持所在段落；设置、目录、笔记在窄屏互斥，Escape关闭并返回入口焦点。无内容的古注/导读开关不占位。

## 次级工具

- 摘录为空时只提供开始阅读的动作，不展示无用筛选和导出。
- 有摘录时按书筛选、全文搜索、展开原文、编辑/删除、导出均保留。
- 日课无计划时直接建立计划，不先展示四个零统计。归档、暂停为次级操作。
- 我的页面三个标签：偏好、数据备份、关于数据。导入的完整校验、预览、覆盖确认和清除双确认不得为简洁而省略。
- 本机存储说明在首次书架和数据设置明确呈现，不每页重复警告。

## 响应式与可访问性

宽屏书目3列、中屏2列、手机单列；手机保留紧凑底部导航，阅读页仅阅读工具。核心点击区44px；输入16px避免手机缩放，文字颜色满足对比度目标。允许文字间距覆盖、浏览器放大与键盘操作。

验收截图需同时包含默认态、展开态、空态、有真实长文和已有记录状态。不得把隐藏details子树的几何box当成实际可见内容。图像和DOM结果共同判断。

## 刻意不做

不添加 AI 对话、社交、热度、排行榜或服务器。数据备份依旧由用户持有，不暗示云同步。没有出处的古注不填充。视觉重构不迁移或清空任何本机数据。
