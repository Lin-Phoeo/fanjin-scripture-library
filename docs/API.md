# 接口说明

后端入口：

- `server/index.ts`

默认本地地址：

- `http://127.0.0.1:3001`

## 1. 公开接口

### 首页

- `GET /api/home`

返回：

- 公告
- 推荐经典
- 统计信息
- 站点配置

### 分类

- `GET /api/categories`

### 经典列表

- `GET /api/scriptures`

查询参数：

- `q`：关键词
- `category`：分类 slug

### 经典详情

- `GET /api/scriptures/:slug`

说明：

- 只返回 `published` 的经典

### 专题列表

- `GET /api/topics`

### 活动列表

- `GET /api/activities`

### 站点配置

- `GET /api/settings`

### 讨论列表

- `GET /api/discussions`

查询参数：

- `scripture`：经典 slug
- `topic`：专题 slug

### 讨论详情

- `GET /api/discussions/:id`

## 2. 用户接口

### 登录

- `POST /api/auth/login`

请求体：

```json
{
  "name": "梵烬用户",
  "password": "fanjin123"
}
```

### 注册

- `POST /api/auth/register`

### 当前用户信息

- `GET /api/me`

### 收藏列表

- `GET /api/favorites`

### 新增收藏

- `POST /api/favorites`

### 删除收藏

- `DELETE /api/favorites/:scriptureSlug`

### 摘录列表

- `GET /api/notes`

### 新增摘录

- `POST /api/notes`

### 删除摘录

- `DELETE /api/notes/:id`

### 阅读历史

- `GET /api/history`

### 写入阅读历史

- `POST /api/history`

### 我的讨论

- `GET /api/my/discussions`

### 新建讨论

- `POST /api/discussions`

### 回复讨论

- `POST /api/discussions/:id/replies`

## 3. 后台接口

后台接口需要管理员或审核员权限。

### 后台看板

- `GET /api/admin/dashboard`

### 后台经典列表

- `GET /api/admin/scriptures`

### 后台经典详情

- `GET /api/admin/scriptures/:slug`

### 新增经典

- `POST /api/admin/scriptures`

### 更新经典

- `PUT /api/admin/scriptures/:slug`

### 审核列表

- `GET /api/admin/review`

查询参数：

- `status`

### 更新审核状态

- `PATCH /api/admin/review/:id`

### 用户列表

- `GET /api/admin/users`

### 更新用户角色

- `PATCH /api/admin/users/:id`

### 后台配置

- `GET /api/admin/settings`
- `PUT /api/admin/settings`

### 公告管理

- `GET /api/admin/announcements`
- `POST /api/admin/announcements`
- `DELETE /api/admin/announcements/:id`

### 活动管理

- `GET /api/admin/activities`
- `POST /api/admin/activities`
- `DELETE /api/admin/activities/:id`

### 专题管理

- `GET /api/admin/topics`
- `POST /api/admin/topics`
- `DELETE /api/admin/topics/:id`

## 4. 鉴权方式

当前采用 Bearer Token。

前端登录后会拿到：

```json
{
  "token": "xxxxx",
  "user": {
    "id": 1,
    "name": "法音法师",
    "role": "admin"
  }
}
```

后续请求通过：

```http
Authorization: Bearer <token>
```

## 5. 当前接口特点

- 公开接口只展示已发布经典
- 后台接口可访问待审核或未发布内容
- 经典更新会走审核发布链路
- 讨论、收藏、摘录、历史都是真实落库

## 6. 后续接口扩展建议

- 增加批量导入接口
- 增加找回密码接口
- 增加附件上传接口
- 增加评论审核与操作日志接口
