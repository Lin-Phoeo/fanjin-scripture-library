export const frontNavigation = [
  { label: '首页', to: '/' },
  { label: '经藏', to: '/library' },
  { label: '自修', to: '/study' },
  { label: '搜索', to: '/search' },
  { label: '摘录', to: '/notes' },
] as const;

export const featuredAnnouncements = [
  {
    title: '梵烬网首期内测开放',
    detail: '当前开放经藏入口、对照阅读、专题共修和后台演示，便于尽快收集真实修学反馈。',
  },
  {
    title: '招募古籍整理志工',
    detail: '欢迎参与经文录入、白话整理、祖师注义锚定与内容校对，共同完善公益经藏。',
  },
] as const;

export const discussionThreads = [
  {
    title: '“应无所住而生其心”在共修中如何落地？',
    scripture: '金刚般若波罗蜜经',
    author: '清净行者',
    replies: 18,
  },
  {
    title: '六祖坛经适合作为初学者入门吗？',
    scripture: '六祖坛经',
    author: '明德居士',
    replies: 9,
  },
  {
    title: '法华经长期精读专题如何安排更稳妥？',
    scripture: '妙法莲华经',
    author: '法音共修组',
    replies: 12,
  },
] as const;

export const personalSummary = {
  nickname: '梵烬用户',
  role: '共修学人',
  joinedAt: '2026-04-13',
  stats: [
    { label: '已读经典', value: '6 部' },
    { label: '收藏摘录', value: '23 条' },
    { label: '参与讨论', value: '8 次' },
  ],
};

export const personalNotes = [
  {
    title: '无住生心',
    scripture: '金刚般若波罗蜜经',
    note: '适合放在“参学提示”区域，供后续后台录入时做字段拆分。',
  },
  {
    title: '本来清净',
    scripture: '六祖坛经',
    note: '可与晨读共修专题联动，形成固定修学入口。',
  },
] as const;

export const adminMetrics = [
  { label: '经典条目', value: '128' },
  { label: '注义段落', value: '2,460' },
  { label: '待审核内容', value: '17' },
  { label: '活跃用户', value: '342' },
] as const;

export const reviewQueue = [
  {
    title: '金刚经白话导读补录',
    type: '白话导入',
    submitter: '志工-慧安',
    status: '待审核',
  },
  {
    title: '六祖坛经注义锚点校对',
    type: '祖师注义',
    submitter: '志工-普照',
    status: '待复核',
  },
  {
    title: '法华经音频上传',
    type: '音频资源',
    submitter: '法音共修组',
    status: '待发布',
  },
] as const;

export const adminUsers = [
  {
    name: '法音法师',
    role: '寺院管理员',
    status: '启用',
    lastLogin: '今天 08:15',
  },
  {
    name: '慧安居士',
    role: '内容审核员',
    status: '启用',
    lastLogin: '今天 09:40',
  },
  {
    name: '普照志工',
    role: '录入志工',
    status: '待升级',
    lastLogin: '昨天 21:05',
  },
] as const;
