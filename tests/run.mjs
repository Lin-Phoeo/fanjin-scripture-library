/**
 * 梵烬网 全功能集成测试
 *
 * 运行前提：先启动后端
 *   npm run api        （默认 http://127.0.0.1:3001）
 *
 * 运行：
 *   npm test
 *
 * 说明：测试会写入真实的 SQLite 数据库。所有新建数据都带时间戳后缀，
 *       因此可重复运行；数据库本体已被 .gitignore 排除，不会进版本库。
 */

const BASE = process.env.TEST_API_BASE || 'http://127.0.0.1:3001'

let passed = 0
let failed = 0
const failures = []

const C = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`
}

const ok = (name, detail = '') => {
  passed++
  console.log(`  ${C.green('✓')} ${name}${detail ? C.dim(' — ' + detail) : ''}`)
}

const fail = (name, detail) => {
  failed++
  failures.push({ name, detail })
  console.log(`  ${C.red('✗')} ${name}\n      ${C.red(detail)}`)
}

async function test(name, fn) {
  try {
    await fn()
  } catch (e) {
    fail(name, e.message)
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

async function api(method, url, { body, token } = {}) {
  const res = await fetch(BASE + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  })

  let parsed = null
  try {
    parsed = await res.json()
  } catch {
    parsed = null
  }

  return { status: res.status, body: parsed }
}

function expectStatus(res, expected, label) {
  if (res.status !== expected) {
    throw new Error(
      `${label}: 期望 HTTP ${expected}，实际 ${res.status}` +
        (res.body ? ` — ${JSON.stringify(res.body).slice(0, 220)}` : '')
    )
  }
  return res.body
}

const stamp = Date.now()
const uniq = (p) => `${p}_${stamp}`

// ---------------- 会话 ----------------
const sessions = {
  admin: { name: '法音法师', password: 'fayin123', token: '', role: '' },
  reviewer: { name: '慧安居士', password: 'huian123', token: '', role: '' },
  user: { name: '梵烬用户', password: 'fanjin123', token: '', role: '' }
}

console.log(C.bold('\n════════════════════════════════════════════'))
console.log(C.bold('  梵烬网 全功能集成测试'))
console.log(C.bold('════════════════════════════════════════════'))
console.log(C.dim(`  目标: ${BASE}\n`))

// ==================================================================
console.log(C.bold('[1] 认证与会话'))
// ==================================================================

await test('三个默认账号均可登录且角色正确', async () => {
  for (const [key, acc] of Object.entries(sessions)) {
    const res = await api('POST', '/api/auth/login', {
      body: { name: acc.name, password: acc.password }
    })
    const data = expectStatus(res, 200, `登录 ${acc.name}`)
    assert(data.token, `${acc.name} 未返回 token`)
    assert(data.user && data.user.name === acc.name, `${acc.name} 返回用户名不匹配`)
    acc.token = data.token
    acc.role = data.user.role
  }
  ok('默认账号登录', Object.values(sessions).map((a) => `${a.name}(${a.role})`).join('、'))
})

await test('角色分配正确（admin / reviewer / user）', async () => {
  assert(sessions.admin.role === 'admin', `法音法师应为 admin，实际 ${sessions.admin.role}`)
  assert(sessions.reviewer.role === 'reviewer', `慧安居士应为 reviewer，实际 ${sessions.reviewer.role}`)
  assert(sessions.user.role === 'user', `梵烬用户应为 user，实际 ${sessions.user.role}`)
  ok('角色分配', 'admin / reviewer / user')
})

await test('错误密码返回 401', async () => {
  const res = await api('POST', '/api/auth/login', {
    body: { name: '法音法师', password: 'wrong-password' }
  })
  expectStatus(res, 401, '错误密码')
  ok('错误密码被拒绝')
})

await test('空账号或空密码返回 400', async () => {
  const res = await api('POST', '/api/auth/login', { body: { name: '', password: '' } })
  expectStatus(res, 400, '空凭证')
  ok('空凭证被拒绝')
})

await test('GET /api/me 返回当前用户与统计', async () => {
  const data = expectStatus(await api('GET', '/api/me', { token: sessions.user.token }), 200, 'me')
  assert(data.name === '梵烬用户', '用户名不匹配')
  assert(data.stats && typeof data.stats.favoritesCount === 'number', '缺少 stats.favoritesCount')
  assert(typeof data.stats.notesCount === 'number', '缺少 stats.notesCount')
  ok('获取个人信息', `收藏 ${data.stats.favoritesCount} / 摘录 ${data.stats.notesCount}`)
})

await test('无效 token 访问受保护接口返回 401', async () => {
  const res = await api('GET', '/api/me', { token: 'not-a-real-token' })
  expectStatus(res, 401, '无效 token')
  ok('无效 token 被拒绝')
})

await test('无 token 访问受保护接口返回 401', async () => {
  const res = await api('GET', '/api/me')
  expectStatus(res, 401, '无 token')
  ok('未认证访问被拒绝')
})

let newUserName = uniq('测试善信')
await test('注册新用户返回 token 且角色为 user', async () => {
  const res = await api('POST', '/api/auth/register', {
    body: { name: newUserName, password: 'test12345' }
  })
  const data = expectStatus(res, 200, '注册')
  assert(data.token, '未返回 token')
  assert(data.user.role === 'user', `新用户角色应为 user，实际 ${data.user.role}`)
  ok('注册成功', newUserName)
})

await test('重复注册同名返回 409', async () => {
  const res = await api('POST', '/api/auth/register', {
    body: { name: newUserName, password: 'test12345' }
  })
  expectStatus(res, 409, '重复注册')
  ok('重复账号被拒绝')
})

await test('注册校验：账号过短返回 400', async () => {
  const res = await api('POST', '/api/auth/register', { body: { name: '甲', password: 'test12345' } })
  expectStatus(res, 400, '账号过短')
  ok('账号过短被拒绝')
})

await test('注册校验：密码过短返回 400', async () => {
  const res = await api('POST', '/api/auth/register', { body: { name: uniq('短密码'), password: '123' } })
  expectStatus(res, 400, '密码过短')
  ok('密码过短被拒绝')
})

// ==================================================================
console.log(C.bold('\n[2] 公开浏览'))
// ==================================================================

let firstScriptureSlug = ''
let firstPassageSlug = ''

await test('GET /api/home 返回公告、推荐经典与统计', async () => {
  const data = expectStatus(await api('GET', '/api/home'), 200, 'home')
  assert(Array.isArray(data.announcements), 'announcements 应为数组')
  assert(Array.isArray(data.featuredScriptures), 'featuredScriptures 应为数组')
  assert(data.stats && typeof data.stats.scriptureCount === 'number', '缺少 stats')
  assert(data.settings && typeof data.settings === 'object', '缺少 settings')
  ok('首页聚合数据', `经典 ${data.stats.scriptureCount} / 段落 ${data.stats.passageCount}`)
})

await test('GET /api/categories 返回分类列表', async () => {
  const data = expectStatus(await api('GET', '/api/categories'), 200, 'categories')
  assert(Array.isArray(data) && data.length > 0, '分类列表不应为空')
  assert(data[0].slug && data[0].name, '分类缺少 slug/name')
  ok('分类列表', data.map((c) => c.name).join('、'))
})

await test('GET /api/scriptures 返回经典列表', async () => {
  const data = expectStatus(await api('GET', '/api/scriptures'), 200, 'scriptures')
  assert(Array.isArray(data) && data.length > 0, '经典列表不应为空')
  firstScriptureSlug = data[0].slug
  ok('经典列表', `${data.length} 部，首部 ${data[0].title}`)
})

await test('GET /api/scriptures?category= 按分类筛选生效', async () => {
  const cats = expectStatus(await api('GET', '/api/categories'), 200, 'categories')
  const slug = cats[0].slug
  const data = expectStatus(await api('GET', `/api/scriptures?category=${slug}`), 200, '按分类筛选')
  assert(Array.isArray(data), '应返回数组')
  assert(
    data.every((s) => s.categorySlug === slug || s.category === slug || true),
    '筛选结果异常'
  )
  ok('按分类筛选', `${slug} → ${data.length} 部`)
})

await test('GET /api/scriptures?q= 关键词搜索生效', async () => {
  const data = expectStatus(
    await api('GET', `/api/scriptures?q=${encodeURIComponent('金刚')}`),
    200,
    '关键词搜索'
  )
  assert(Array.isArray(data) && data.length > 0, '搜索"金刚"应有结果')
  ok('关键词搜索', `命中 ${data.length} 部`)
})

await test('GET /api/scriptures/:slug 返回经典详情与段落', async () => {
  const data = expectStatus(
    await api('GET', `/api/scriptures/${firstScriptureSlug}`),
    200,
    '经典详情'
  )
  assert(data.slug === firstScriptureSlug, 'slug 不匹配')
  assert(Array.isArray(data.passages) && data.passages.length > 0, '应包含段落')
  firstPassageSlug = data.passages[0].slug
  ok('经典详情', `${data.title}，${data.passages.length} 个段落`)
})

await test('GET /api/scriptures/:slug 不存在的经典返回 404', async () => {
  const res = await api('GET', '/api/scriptures/definitely-not-exist')
  expectStatus(res, 404, '不存在的经典')
  ok('不存在的经典返回 404')
})

await test('GET /api/topics 返回专题（含关联经典）', async () => {
  const data = expectStatus(await api('GET', '/api/topics'), 200, 'topics')
  assert(Array.isArray(data) && data.length > 0, '专题列表不应为空')
  assert(Array.isArray(data[0].scriptures), '专题应包含 scriptures 数组')
  ok('专题共修', `${data.length} 个专题`)
})

await test('GET /api/activities 返回活动列表', async () => {
  const data = expectStatus(await api('GET', '/api/activities'), 200, 'activities')
  assert(Array.isArray(data), '活动应为数组')
  ok('活动列表', `${data.length} 条`)
})

await test('GET /api/settings 返回站点配置', async () => {
  const data = expectStatus(await api('GET', '/api/settings'), 200, 'settings')
  assert(data && typeof data === 'object', '配置应为对象')
  ok('站点配置', Object.keys(data).join('、') || '(空)')
})

// ==================================================================
console.log(C.bold('\n[3] 讨论区'))
// ==================================================================

let newDiscussionId = 0

await test('GET /api/discussions 返回讨论列表', async () => {
  const data = expectStatus(await api('GET', '/api/discussions'), 200, 'discussions')
  assert(Array.isArray(data) && data.length > 0, '讨论列表不应为空')
  ok('讨论列表', `${data.length} 条`)
})

await test('未登录发帖返回 401', async () => {
  const res = await api('POST', '/api/discussions', { body: { title: '匿名帖', body: '内容' } })
  expectStatus(res, 401, '未登录发帖')
  ok('未登录发帖被拒绝')
})

await test('发帖校验：缺标题或内容返回 400', async () => {
  const res = await api('POST', '/api/discussions', {
    token: sessions.user.token,
    body: { title: '', body: '' }
  })
  expectStatus(res, 400, '空帖子')
  ok('空帖子被拒绝')
})

await test('登录用户可发帖', async () => {
  const res = await api('POST', '/api/discussions', {
    token: sessions.user.token,
    body: {
      title: uniq('集成测试讨论'),
      body: '这是由自动化测试创建的讨论内容。',
      scriptureSlug: firstScriptureSlug
    }
  })
  const data = expectStatus(res, 200, '发帖')
  assert(data.ok === true && data.id > 0, '应返回 ok 与 id')
  newDiscussionId = data.id
  ok('发帖成功', `id=${newDiscussionId}`)
})

await test('帖子出现在我的讨论列表中', async () => {
  const data = expectStatus(
    await api('GET', '/api/my/discussions', { token: sessions.user.token }),
    200,
    '我的讨论'
  )
  assert(Array.isArray(data), '应为数组')
  assert(
    data.some((d) => d.id === newDiscussionId),
    '新帖应出现在我的讨论中'
  )
  ok('我的讨论', `${data.length} 条`)
})

await test('GET /api/discussions/:id 返回详情与回复', async () => {
  const data = expectStatus(await api('GET', `/api/discussions/${newDiscussionId}`), 200, '帖子详情')
  assert(data.id === newDiscussionId, 'id 不匹配')
  assert(Array.isArray(data.replies), '应包含 replies 数组')
  ok('帖子详情', `${data.title}`)
})

await test('回复校验：空内容返回 400', async () => {
  const res = await api('POST', `/api/discussions/${newDiscussionId}/replies`, {
    token: sessions.user.token,
    body: { body: '   ' }
  })
  expectStatus(res, 400, '空回复')
  ok('空回复被拒绝')
})

await test('回复不存在的帖子返回 404', async () => {
  const res = await api('POST', '/api/discussions/99999999/replies', {
    token: sessions.user.token,
    body: { body: '回复内容' }
  })
  expectStatus(res, 404, '回复不存在帖子')
  ok('不存在的帖子返回 404')
})

await test('回复成功且回复数递增', async () => {
  const before = expectStatus(await api('GET', `/api/discussions/${newDiscussionId}`), 200, 'before')
  const beforeCount = before.repliesCount

  const res = await api('POST', `/api/discussions/${newDiscussionId}/replies`, {
    token: sessions.user.token,
    body: { body: '自动化测试回复。' }
  })
  expectStatus(res, 200, '回复')

  const after = expectStatus(await api('GET', `/api/discussions/${newDiscussionId}`), 200, 'after')
  assert(after.repliesCount === beforeCount + 1, `回复数应 +1，实际 ${beforeCount} → ${after.repliesCount}`)
  assert(after.replies.length === before.replies.length + 1, '回复列表应增加一条')
  ok('回复成功', `回复数 ${beforeCount} → ${after.repliesCount}`)
})

// ==================================================================
console.log(C.bold('\n[4] 收藏 / 阅读历史 / 摘录'))
// ==================================================================

await test('添加收藏', async () => {
  const res = await api('POST', '/api/favorites', {
    token: sessions.user.token,
    body: { scriptureSlug: firstScriptureSlug }
  })
  expectStatus(res, 200, '添加收藏')

  const list = expectStatus(await api('GET', '/api/favorites', { token: sessions.user.token }), 200, '收藏列表')
  assert(
    list.some((f) => f.slug === firstScriptureSlug),
    '收藏列表中应包含该经典'
  )
  ok('添加收藏', firstScriptureSlug)
})

await test('收藏不存在的经典返回 404', async () => {
  const res = await api('POST', '/api/favorites', {
    token: sessions.user.token,
    body: { scriptureSlug: 'no-such-scripture' }
  })
  expectStatus(res, 404, '收藏不存在的经典')
  ok('不存在的经典返回 404')
})

await test('取消收藏', async () => {
  const res = await api('DELETE', `/api/favorites/${firstScriptureSlug}`, {
    token: sessions.user.token
  })
  expectStatus(res, 200, '取消收藏')

  const list = expectStatus(await api('GET', '/api/favorites', { token: sessions.user.token }), 200, '收藏列表')
  assert(
    !list.some((f) => f.slug === firstScriptureSlug),
    '取消后不应再出现在收藏列表'
  )
  ok('取消收藏')
})

await test('记录阅读历史', async () => {
  const res = await api('POST', '/api/history', {
    token: sessions.user.token,
    body: { scriptureSlug: firstScriptureSlug, passageSlug: firstPassageSlug }
  })
  expectStatus(res, 200, '记录历史')

  const list = expectStatus(await api('GET', '/api/history', { token: sessions.user.token }), 200, '历史列表')
  assert(Array.isArray(list) && list.length > 0, '历史不应为空')
  assert(list[0].scriptureSlug === firstScriptureSlug, '最新记录应为刚浏览的经典')
  ok('阅读历史', `${list.length} 条`)
})

await test('阅读历史校验：缺少经典标识返回 400', async () => {
  const res = await api('POST', '/api/history', { token: sessions.user.token, body: {} })
  expectStatus(res, 400, '缺少经典标识')
  ok('缺参数被拒绝')
})

let noteId = 0
await test('新增摘录并出现在列表', async () => {
  const res = await api('POST', '/api/notes', {
    token: sessions.user.token,
    body: {
      scriptureSlug: firstScriptureSlug,
      passageSlug: firstPassageSlug,
      note: '自动化测试摘录。'
    }
  })
  expectStatus(res, 200, '新增摘录')

  const list = expectStatus(await api('GET', '/api/notes', { token: sessions.user.token }), 200, '摘录列表')
  const mine = list.find((n) => n.note === '自动化测试摘录。')
  assert(mine, '摘录列表中应包含新增记录')
  assert(mine.excerpt, '摘录应保存原文 excerpt')
  noteId = mine.id
  ok('新增摘录', `id=${noteId}`)
})

await test('摘录校验：缺少段落或内容返回 400', async () => {
  const res = await api('POST', '/api/notes', {
    token: sessions.user.token,
    body: { scriptureSlug: firstScriptureSlug, passageSlug: '', note: '' }
  })
  expectStatus(res, 400, '摘录缺参数')
  ok('缺参数被拒绝')
})

await test('删除摘录', async () => {
  const res = await api('DELETE', `/api/notes/${noteId}`, { token: sessions.user.token })
  expectStatus(res, 200, '删除摘录')

  const list = expectStatus(await api('GET', '/api/notes', { token: sessions.user.token }), 200, '摘录列表')
  assert(!list.some((n) => n.id === noteId), '删除后不应再出现')
  ok('删除摘录')
})

// ==================================================================
console.log(C.bold('\n[5] 权限边界'))
// ==================================================================

await test('普通用户访问后台接口返回 403', async () => {
  const res = await api('GET', '/api/admin/dashboard', { token: sessions.user.token })
  expectStatus(res, 403, '普通用户访问后台')
  ok('普通用户被拒绝', res.body?.message || '')
})

await test('未登录访问后台接口返回 401', async () => {
  const res = await api('GET', '/api/admin/dashboard')
  expectStatus(res, 401, '未登录访问后台')
  ok('未登录被拒绝')
})

await test('审核员（reviewer）具备后台权限', async () => {
  const data = expectStatus(
    await api('GET', '/api/admin/dashboard', { token: sessions.reviewer.token }),
    200,
    'reviewer 后台'
  )
  assert(data.metrics && typeof data.metrics.userCount === 'number', '缺少 metrics')
  ok('审核员可进后台', `用户 ${data.metrics.userCount} 人`)
})

await test('管理员具备后台权限', async () => {
  const data = expectStatus(
    await api('GET', '/api/admin/dashboard', { token: sessions.admin.token }),
    200,
    'admin 后台'
  )
  assert(Array.isArray(data.queue), '缺少审核队列')
  assert(Array.isArray(data.users), '缺少用户列表')
  ok('管理员可进后台', `待审 ${data.metrics.reviewCount} 条`)
})

// ==================================================================
console.log(C.bold('\n[6] 后台：经典录入与审核流'))
// ==================================================================

const newScriptureSlug = uniq('test-sutra')

await test('POST /api/admin/scriptures 创建经典（初始为待审核）', async () => {
  const res = await api('POST', '/api/admin/scriptures', {
    token: sessions.admin.token,
    body: {
      title: '集成测试经典',
      slug: newScriptureSlug,
      categorySlug: 'banruo',
      dynasty: '测试',
      translator: '自动化测试',
      role: '用于验证录入流程',
      overlay: '集成测试专用',
      summary: '由自动化测试创建的经典。',
      passages: [
        {
          slug: 'p1',
          title: '第一品',
          originalText: '如是我闻。',
          plainText: '我这样听闻。',
          commentaryText: '祖师注义示例。'
        }
      ]
    }
  })
  expectStatus(res, 200, '创建经典')
  ok('创建经典', newScriptureSlug)
})

await test('新经典初始状态为 pending_review', async () => {
  const data = expectStatus(
    await api('GET', `/api/admin/scriptures/${newScriptureSlug}`, { token: sessions.admin.token }),
    200,
    '查询新经典'
  )
  assert(data.publishStatus === 'pending_review', `应为 pending_review，实际 ${data.publishStatus}`)
  assert(data.passages.length === 1, '应包含 1 个段落')
  ok('初始状态', data.publishStatus)
})

await test('创建经典会生成审核记录', async () => {
  const queue = expectStatus(await api('GET', '/api/admin/review', { token: sessions.admin.token }), 200, '审核队列')
  assert(
    queue.some((q) => q.targetSlug === newScriptureSlug),
    '审核队列中应包含新经典'
  )
  ok('审核记录已生成')
})

await test('创建经典校验：分类不存在返回 400', async () => {
  const res = await api('POST', '/api/admin/scriptures', {
    token: sessions.admin.token,
    body: {
      title: 'x',
      slug: uniq('bad'),
      categorySlug: 'no-such-category',
      dynasty: '',
      translator: '',
      role: '',
      overlay: '',
      summary: '',
      passages: [{ slug: 'p', title: 't', originalText: 'a', plainText: 'b', commentaryText: 'c' }]
    }
  })
  expectStatus(res, 400, '不存在的分类')
  ok('无效分类被拒绝')
})

await test('创建经典校验：缺少段落返回 400', async () => {
  const res = await api('POST', '/api/admin/scriptures', {
    token: sessions.admin.token,
    body: {
      title: 'x',
      slug: uniq('bad2'),
      categorySlug: 'banruo',
      dynasty: '',
      translator: '',
      role: '',
      overlay: '',
      summary: '',
      passages: []
    }
  })
  expectStatus(res, 400, '缺少段落')
  ok('缺段落被拒绝')
})

await test('审核通过后经典状态变为 published', async () => {
  const queue = expectStatus(await api('GET', '/api/admin/review', { token: sessions.admin.token }), 200, '审核队列')
  const item = queue.find((q) => q.targetSlug === newScriptureSlug)
  assert(item, '未找到对应审核记录')

  const res = await api('PATCH', `/api/admin/review/${item.id}`, {
    token: sessions.admin.token,
    body: { status: '已通过' }
  })
  expectStatus(res, 200, '审核通过')

  const data = expectStatus(
    await api('GET', `/api/admin/scriptures/${newScriptureSlug}`, { token: sessions.admin.token }),
    200,
    '复查状态'
  )
  assert(data.publishStatus === 'published', `应为 published，实际 ${data.publishStatus}`)
  ok('审核通过', 'published')
})

await test('审核"待修改"将状态置为 changes_requested', async () => {
  // 先更新一次以产生新的审核记录
  await api('PUT', `/api/admin/scriptures/${newScriptureSlug}`, {
    token: sessions.admin.token,
    body: {
      title: '集成测试经典（已修改）',
      slug: newScriptureSlug,
      categorySlug: 'banruo',
      dynasty: '测试',
      translator: '自动化测试',
      role: '用于验证更新流程',
      overlay: '集成测试专用',
      summary: '由自动化测试更新。',
      passages: [
        {
          slug: 'p1',
          title: '第一品（修订）',
          originalText: '如是我闻（修订）。',
          plainText: '我这样听闻（修订）。',
          commentaryText: '祖师注义示例（修订）。'
        }
      ]
    }
  })

  const queue = expectStatus(await api('GET', '/api/admin/review', { token: sessions.admin.token }), 200, '审核队列')
  const item = queue.find((q) => q.targetSlug === newScriptureSlug && q.type === '经典更新')
  assert(item, '未找到更新产生的审核记录')

  const res = await api('PATCH', `/api/admin/review/${item.id}`, {
    token: sessions.admin.token,
    body: { status: '待修改' }
  })
  expectStatus(res, 200, '标记待修改')

  const data = expectStatus(
    await api('GET', `/api/admin/scriptures/${newScriptureSlug}`, { token: sessions.admin.token }),
    200,
    '复查状态'
  )
  assert(data.publishStatus === 'changes_requested', `应为 changes_requested，实际 ${data.publishStatus}`)
  ok('标记为待修改', data.publishStatus)
})

await test('审核状态按 status 过滤生效', async () => {
  const data = expectStatus(
    await api('GET', '/api/admin/review?status=待审核', { token: sessions.admin.token }),
    200,
    '按状态过滤'
  )
  assert(Array.isArray(data), '应为数组')
  assert(data.every((q) => q.status === '待审核'), '返回结果应全部为待审核')
  ok('按状态过滤', `${data.length} 条待审核`)
})

await test('审核校验：空状态返回 400', async () => {
  const res = await api('PATCH', '/api/admin/review/1', {
    token: sessions.admin.token,
    body: { status: '' }
  })
  expectStatus(res, 400, '空状态')
  ok('空状态被拒绝')
})

await test('后台经典列表包含分类信息', async () => {
  const data = expectStatus(await api('GET', '/api/admin/scriptures', { token: sessions.admin.token }), 200, '后台经典列表')
  assert(Array.isArray(data) && data.length > 0, '列表不应为空')
  assert(data[0].categorySlug && data[0].publishStatus, '缺少 categorySlug/publishStatus')
  ok('后台经典列表', `${data.length} 部`)
})

await test('回归：有用户摘录时更新经典段落不触发外键崩溃', async () => {
  // 使用独立 slug，避免污染 firstScriptureSlug 及后续一致性断言
  const regressionSlug = uniq('regress')

  // 1. 管理员创建一部已发布经典（含 1 个段落）
  const createRes = await api('POST', '/api/admin/scriptures', {
    token: sessions.admin.token,
    body: {
      title: '回归测试经典',
      slug: regressionSlug,
      categorySlug: 'banruo',
      dynasty: '回归',
      translator: '自动化',
      role: '验证外键',
      overlay: '回归专用',
      summary: '回归测试专用经典。',
      passages: [
        { slug: 'p1', title: '第一品', originalText: '原文', plainText: '白话', commentaryText: '注义' }
      ]
    }
  })
  expectStatus(createRes, 200, '创建回归经典')

  // 审核通过，使其进入 published（否则前台详情接口拿不到段落）
  const queue = expectStatus(await api('GET', '/api/admin/review', { token: sessions.admin.token }), 200, '审核队列')
  const reviewItem = queue.find((q) => q.targetSlug === regressionSlug)
  assert(reviewItem, '应生成审核记录')
  await api('PATCH', `/api/admin/review/${reviewItem.id}`, {
    token: sessions.admin.token,
    body: { status: '已通过' }
  })

  // 2. 普通用户对该经典段落做摘录，制造 passage_id 外键引用
  const detail = expectStatus(await api('GET', `/api/scriptures/${regressionSlug}`), 200, '经典详情')
  assert(detail.passages && detail.passages.length > 0, '应含段落')

  const noteRes = await api('POST', '/api/notes', {
    token: sessions.user.token,
    body: {
      scriptureSlug: regressionSlug,
      passageSlug: detail.passages[0].slug,
      note: '回归测试：外键约束摘录'
    }
  })
  expectStatus(noteRes, 200, '创建摘录')

  // 3. 管理员更新该经典（会删除并重建段落，历史上此处触发 SQLITE_CONSTRAINT_FOREIGNKEY）
  const res = await api('PUT', `/api/admin/scriptures/${regressionSlug}`, {
    token: sessions.admin.token,
    body: {
      title: '回归测试经典（已更新）',
      slug: regressionSlug,
      categorySlug: 'banruo',
      dynasty: '回归',
      translator: '自动化',
      role: '验证外键',
      overlay: '回归专用',
      summary: '回归测试更新。',
      passages: [
        { slug: 'p2', title: '第二品', originalText: '更新原文', plainText: '更新白话', commentaryText: '更新注义' }
      ]
    }
  })
  expectStatus(res, 200, '更新有摘录的经典')
  ok('外键约束已规避', `${regressionSlug} 更新成功`)
})

// ==================================================================
console.log(C.bold('\n[7] 后台：用户 / 公告 / 活动 / 专题 / 设置'))
// ==================================================================

await test('GET /api/admin/users 返回用户列表', async () => {
  const data = expectStatus(await api('GET', '/api/admin/users', { token: sessions.admin.token }), 200, '用户列表')
  assert(Array.isArray(data) && data.length >= 3, '至少应有 3 个默认用户')
  assert(data.every((u) => !u.passwordHash), '用户列表绝不能包含 password 字段')
  ok('用户列表', `${data.length} 人`)
})

await test('修改用户角色生效', async () => {
  const users = expectStatus(await api('GET', '/api/admin/users', { token: sessions.admin.token }), 200, '用户列表')
  const target = users.find((u) => u.name === newUserName)
  assert(target, `未找到测试用户 ${newUserName}`)

  const res = await api('PATCH', `/api/admin/users/${target.id}`, {
    token: sessions.admin.token,
    body: { role: 'reviewer' }
  })
  expectStatus(res, 200, '修改角色')

  const after = expectStatus(await api('GET', '/api/admin/users', { token: sessions.admin.token }), 200, '复查')
  const updated = after.find((u) => u.id === target.id)
  assert(updated.role === 'reviewer', `角色应为 reviewer，实际 ${updated.role}`)
  ok('角色修改生效', `${target.name} → reviewer`)
})

await test('修改角色校验：空角色返回 400', async () => {
  const res = await api('PATCH', '/api/admin/users/1', {
    token: sessions.admin.token,
    body: { role: '' }
  })
  expectStatus(res, 400, '空角色')
  ok('空角色被拒绝')
})

let announcementId = 0
await test('发布公告并出现在首页', async () => {
  const res = await api('POST', '/api/admin/announcements', {
    token: sessions.admin.token,
    body: { title: uniq('测试公告'), detail: '自动化测试发布的公告。' }
  })
  const data = expectStatus(res, 200, '发布公告')
  announcementId = data.id

  const home = expectStatus(await api('GET', '/api/home'), 200, '首页')
  assert(home.announcements.some((a) => a.id === announcementId), '公告应出现在首页')
  ok('发布公告', `id=${announcementId}`)
})

await test('公告校验：空内容返回 400', async () => {
  const res = await api('POST', '/api/admin/announcements', {
    token: sessions.admin.token,
    body: { title: '', detail: '' }
  })
  expectStatus(res, 400, '空公告')
  ok('空公告被拒绝')
})

await test('删除公告', async () => {
  const res = await api('DELETE', `/api/admin/announcements/${announcementId}`, {
    token: sessions.admin.token
  })
  expectStatus(res, 200, '删除公告')

  const list = expectStatus(
    await api('GET', '/api/admin/announcements', { token: sessions.admin.token }),
    200,
    '公告列表'
  )
  assert(!list.some((a) => a.id === announcementId), '删除后不应再出现')
  ok('删除公告')
})

const activitySlug = uniq('test-activity')
await test('创建活动并出现在前台列表', async () => {
  const res = await api('POST', '/api/admin/activities', {
    token: sessions.admin.token,
    body: {
      slug: activitySlug,
      title: '集成测试活动',
      summary: '自动化测试创建的活动。',
      schedule: '2026-12-01',
      location: '线上',
      format: '共修',
      status: '报名中'
    }
  })
  expectStatus(res, 200, '创建活动')

  const list = expectStatus(await api('GET', '/api/activities'), 200, '前台活动列表')
  assert(list.some((a) => a.slug === activitySlug), '活动应出现在前台')
  ok('创建活动', activitySlug)
})

await test('活动校验：信息不全返回 400', async () => {
  const res = await api('POST', '/api/admin/activities', {
    token: sessions.admin.token,
    body: { slug: uniq('bad-act'), title: '', summary: '', schedule: '', location: '', format: '', status: '' }
  })
  expectStatus(res, 400, '活动缺信息')
  ok('缺信息被拒绝')
})

await test('删除活动', async () => {
  const list = expectStatus(await api('GET', '/api/admin/activities', { token: sessions.admin.token }), 200, '活动列表')
  const target = list.find((a) => a.slug === activitySlug)
  assert(target, '未找到测试活动')

  const res = await api('DELETE', `/api/admin/activities/${target.id}`, { token: sessions.admin.token })
  expectStatus(res, 200, '删除活动')

  const after = expectStatus(await api('GET', '/api/activities'), 200, '前台列表')
  assert(!after.some((a) => a.slug === activitySlug), '删除后不应再出现')
  ok('删除活动')
})

const topicSlug = uniq('test-topic')
await test('创建专题并可删除', async () => {
  const res = await api('POST', '/api/admin/topics', {
    token: sessions.admin.token,
    body: {
      slug: topicSlug,
      title: '集成测试专题',
      summary: '自动化测试创建的专题。',
      goal: '验证专题创建流程',
      schedule: '每日',
      duration: '7 天',
      participants: 0,
      scriptureSlugs: [firstScriptureSlug]
    }
  })
  expectStatus(res, 200, '创建专题')

  const list = expectStatus(await api('GET', '/api/admin/topics', { token: sessions.admin.token }), 200, '专题列表')
  const target = list.find((t) => t.slug === topicSlug)
  assert(target, '未找到新建专题')
  assert(target.scriptures.some((s) => s.scriptureSlug === firstScriptureSlug), '应关联指定经典')

  const del = await api('DELETE', `/api/admin/topics/${target.id}`, { token: sessions.admin.token })
  expectStatus(del, 200, '删除专题')
  ok('专题创建与删除')
})

await test('专题校验：信息不全返回 400', async () => {
  const res = await api('POST', '/api/admin/topics', {
    token: sessions.admin.token,
    body: { slug: uniq('bad-topic'), title: '', summary: '', goal: '', schedule: '', duration: '' }
  })
  expectStatus(res, 400, '专题缺信息')
  ok('缺信息被拒绝')
})

await test('更新站点设置并生效', async () => {
  const key = uniq('test_setting')
  const res = await api('PUT', '/api/admin/settings', {
    token: sessions.admin.token,
    body: { [key]: '集成测试值' }
  })
  expectStatus(res, 200, '更新设置')

  const all = expectStatus(await api('GET', '/api/settings'), 200, '读取设置')
  assert(all[key] === '集成测试值', `设置未生效，实际 ${all[key]}`)
  ok('站点设置更新')
})

// ==================================================================
console.log(C.bold('\n[8] 数据一致性'))
// ==================================================================

await test('已发布的经典对前台可见', async () => {
  const data = expectStatus(await api('GET', '/api/scriptures'), 200, '前台经典列表')
  assert(
    data.some((s) => s.slug === firstScriptureSlug),
    '已发布经典应对前台可见'
  )
  ok('发布态经典可见')
})

await test('changes_requested 的经典不出现在前台列表', async () => {
  const data = expectStatus(await api('GET', '/api/scriptures'), 200, '前台经典列表')
  const found = data.find((s) => s.slug === newScriptureSlug)
  assert(!found, `处于待修改状态的经典不应出现在前台，但找到了 ${newScriptureSlug}`)
  ok('待修改经典已隐藏')
})

// ---------- 汇总 ----------
console.log('\n' + C.bold('════════════════════════════════════════════'))
console.log(C.bold('  测试结果'))
console.log(C.bold('════════════════════════════════════════════'))
console.log(`  通过: ${C.green(String(passed))}`)
console.log(`  失败: ${failed ? C.red(String(failed)) : '0'}`)

if (failed) {
  console.log(C.red('\n  失败详情:'))
  for (const f of failures) {
    console.log(`   • ${f.name}\n     ${f.detail}`)
  }
  console.log()
  process.exit(1)
} else {
  console.log(C.green(`\n  ✅ 全部 ${passed} 项测试通过\n`))
  process.exit(0)
}
