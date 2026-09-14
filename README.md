# 梵烬网

佛教共修公益古籍网站，当前为可运行的前后端一体化版本。

技术栈：

- 前端：`Vite + React + TypeScript + react-router-dom`
- 后端：`Express`
- 数据库：`SQLite + better-sqlite3`

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动后端

```bash
npm run api
```

后端默认地址：

- [http://127.0.0.1:3001](http://127.0.0.1:3001)

### 启动前端

```bash
npm run dev
```

前端默认地址：

- [http://127.0.0.1:5173](http://127.0.0.1:5173)

### 构建

```bash
npm run build
```

## 常用命令

```bash
npm run api
npm run dev
npm run build
npm run import:scripture -- data/import-templates/scripture-template.json --dry-run
```

### 导入经典 JSON

```bash
# 预检（不写库）
npm run import:scripture -- data/import-templates/diamond-sutra-full.json --dry-run

# 正式导入（默认进入待审核状态）
npm run import:scripture -- data/import-templates/diamond-sutra-full.json

# 导入并直接发布（跳过审核）
npm run import:scripture -- data/import-templates/diamond-sutra-full.json --published
```

> 提示：默认导入后经典进入「待审核」，需在后台 `/admin/review` 审核通过后前台才可见；
> 使用 `--published` 可直接发布。导入的完整说明见 [docs/CONTENT_IMPORT.md](docs/CONTENT_IMPORT.md)。

## 默认账号

管理员：

- 账号：`法音法师`
- 密码：`fayin123`

审核员：

- 账号：`慧安居士`
- 密码：`huian123`

普通用户：

- 账号：`梵烬用户`
- 密码：`fanjin123`

## 当前已实现模块

- 经藏分类浏览
- 经文阅读
- 原文 / 白话 / 祖师注义对照
- 收藏、摘录、阅读历史
- 专题共修
- 活动模块
- 讨论发帖、回帖、筛选
- 用户注册、登录、个人中心
- 后台经文录入
- 后台审核与发布状态控制
- 后台公告管理
- 后台活动管理
- 经典 JSON 导入脚本

## 主要访问入口

### 前台

- 首页：`/`
- 经藏：`/canon`
- 阅读：`/reader/:scriptureId`
- 专题：`/topics`
- 活动：`/activities`
- 搜索：`/search`
- 讨论：`/discussion`
- 登录/注册：`/auth`
- 个人中心：`/profile`
- 收藏摘录：`/notes`

### 后台

- 后台首页：`/admin`
- 经文录入：`/admin/editor`
- 内容审核：`/admin/review`
- 专题管理：`/admin/topics`
- 活动管理：`/admin/activities`
- 用户权限：`/admin/users`
- 系统配置 / 公告管理：`/admin/settings`

## 数据库

当前数据库文件：

- `data/fanjin.sqlite`

## 文档入口

完整文档请看：

- [docs/README.md](docs/README.md)
- [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DATABASE.md](docs/DATABASE.md)
- [docs/API.md](docs/API.md)
- [docs/CONTENT_IMPORT.md](docs/CONTENT_IMPORT.md)

## 目录说明

- `src/`：前端页面、组件、路由、样式
- `server/`：Express API、数据库初始化、导入脚本
- `data/`：SQLite 数据库与导入模板
- `docs/`：开发、架构、数据库、接口与内容文档

## 当前仍待继续补强的部分

- 更完整的账号安全能力
- 更完整的后台内容治理能力
- 更完善的全文检索
- 更完善的音频资源管理
- 更多真实经典、白话和祖师注义内容
