# 内容导入准备

这个项目目前已经有真实的 `SQLite` 数据库与前后台结构，下一步如果要批量导入经文、白话、祖师注义，建议先统一内容格式，再写导入脚本。

## 当前适合的导入粒度

建议按“经典 -> 段落”两层来整理：

1. 经典主信息
2. 每段原文
3. 每段白话
4. 每段祖师注义
5. 每段可选音频地址

## 推荐字段

### 经典主信息

- `slug`：唯一英文标识，例如 `diamond-sutra`
- `title`：经典名称
- `categorySlug`：分类标识
- `dynasty`：朝代
- `translator`：译者或整理者
- `role`：修学定位
- `overlay`：经典简介
- `publishStatus`：建议导入时先用 `pending_review`

### 段落信息

- `slug`：段落唯一标识，例如 `chapter-01`
- `title`：段落标题
- `originalText`：原文
- `plainText`：白话导读
- `commentaryText`：祖师注义
- `audioUrl`：可选

## 推荐文件格式

优先推荐 `JSON`，因为一部经典天然就是嵌套结构，后续写导入脚本也更稳。

模板文件：

- [data/import-templates/scripture-template.json](C:/Users/Administrator/Desktop/梵烬网/data/import-templates/scripture-template.json:1)

当前项目内置分类 slug：

- `banruo`：般若部
- `zushi`：祖师语录
- `fahua`：法华部

## 导入建议流程

1. 先在 `data/import-templates/` 里按模板整理一部经典
2. 确认分类 `categorySlug` 在系统里已存在
3. 每段都补齐原文、白话、注义
4. 导入时先写成待审核
5. 审核通过后再发布到前台

## 当前可用导入命令

先预检：

```bash
npm run import:scripture -- data/import-templates/scripture-template.json --dry-run
```

正式导入：

```bash
npm run import:scripture -- data/import-templates/scripture-template.json
```

如果明确要跳过审核直接发布：

```bash
npm run import:scripture -- data/import-templates/scripture-template.json --published
```

## 录入注意

- `slug` 不要重复
- 段落顺序要稳定，避免后续摘录和阅读历史错位
- 白话与注义尽量按段对应，不要整章只塞成一大段
- 如果暂时没有音频，`audioUrl` 留空即可

## 下一步建议

后续可以继续补一套真正的导入脚本，例如：

- `npm run import:scripture data/import-templates/diamond-sutra.json`

目前这份文档的作用是先把内容整理规范定下来，避免后面导入时反复返工。
