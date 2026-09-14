# 开发与运行说明

## 1. 技术栈

- 前端：`Vite + React + TypeScript + react-router-dom`
- 后端：`Express`
- 数据库：`SQLite + better-sqlite3`
- 脚本运行：`tsx`

## 2. 本地环境要求

- Node.js 18 或以上
- npm
- Windows / macOS / Linux 均可

## 3. 安装依赖

```bash
npm install
```

## 4. 本地启动

项目需要同时启动后端和前端。

### 启动后端 API

```bash
npm run api
```

默认地址：

- `http://127.0.0.1:3001`

### 启动前端开发服务器

```bash
npm run dev
```

默认地址：

- `http://127.0.0.1:5173`

## 5. 构建

```bash
npm run build
```

构建产物位于：

- `dist/`

## 6. 经典导入

### 预检导入

```bash
npm run import:scripture -- data/import-templates/scripture-template.json --dry-run
```

### 正式导入

```bash
npm run import:scripture -- data/import-templates/scripture-template.json
```

### 直接发布导入

```bash
npm run import:scripture -- data/import-templates/scripture-template.json --published
```

## 7. 默认账号

### 管理员

- 账号：`法音法师`
- 密码：`fayin123`

### 审核员

- 账号：`慧安居士`
- 密码：`huian123`

### 普通用户

- 账号：`梵烬用户`
- 密码：`fanjin123`

## 8. 常见开发动作

### 新增前台页面

1. 在 `src/pages/` 中创建页面组件
2. 在 `src/App.tsx` 中补路由
3. 如需前台导航入口，在 `src/data/site.ts` 中补导航

### 新增后台页面

1. 在 `src/pages/` 中创建后台页面组件
2. 在 `src/App.tsx` 中补 `/admin/*` 路由
3. 在 `src/components/AdminLayout.tsx` 中补后台导航

### 新增数据库字段或表

1. 修改 `server/db.ts` 的 `createSchema`
2. 如已有数据库，需要补 `migrateSchema`
3. 如需种子数据，修改 `server/data.ts`
4. 如前端需要读取，补 `server/index.ts` 接口和 `src/lib/api.ts`

## 9. 当前开发重点

当前项目已经具备可运行的前后台与数据库能力，后续开发建议按以下顺序推进：

1. 批量导入真实经典内容
2. 继续补白话导读与祖师注义
3. 完善后台内容治理
4. 完善账号安全与找回密码
5. 补全文检索与内容运营能力
