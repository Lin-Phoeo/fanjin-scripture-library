export const seedCategories = [
  { slug: 'banruo', name: '般若部', description: '以般若智慧、破相显智为主线的经典。', sortOrder: 1 },
  { slug: 'zushi', name: '祖师语录', description: '祖师开示、见性法门与修学语录。', sortOrder: 2 },
  { slug: 'fahua', name: '法华部', description: '法华系经典与长期精读专题。', sortOrder: 3 },
] as const;

export const seedScriptures = [
  {
    slug: 'diamond',
    title: '金刚般若波罗蜜经',
    categorySlug: 'banruo',
    dynasty: '姚秦',
    translator: '鸠摩罗什译',
    role: '破相显智、照见无住',
    overlay: '从无住与般若智慧开始阅读',
    summary: '以“无住生心”为关键切入口，适合作为般若法门的专题共修入口。',
    passages: [
      {
        slug: 'wuzhu',
        title: '应无所住而生其心',
        originalText:
          '须菩提，菩萨应如是生清净心，不应住色生心，不应住声香味触法生心，应无所住而生其心。',
        plainText:
          '修行人发心时，不要被外在境界束缚。不是离开世界，而是不被色声香味触法牵引，在不执着中生起清净愿心。',
        commentaryText:
          '六祖一系的解法重在“无住”不是断灭，而是心体本自灵明，不黏一法；用时遍一切处，却不被境转，于是般若现前。',
        audioUrl: '',
      },
      {
        slug: 'feixiang',
        title: '凡所有相，皆是虚妄',
        originalText: '凡所有相，皆是虚妄。若见诸相非相，即见如来。',
        plainText:
          '一切我们执为真实不变的形相，其实都在因缘中流转。能看见相而不被相迷，就开始靠近如来智慧。',
        commentaryText:
          '祖师注义多把“非相”解释为不住相、不灭相。不是否定世界存在，而是破除执取，回到见性之明。',
        audioUrl: '',
      },
      {
        slug: 'sanxin',
        title: '过去心不可得',
        originalText: '过去心不可得，现在心不可得，未来心不可得。',
        plainText:
          '烦恼常来自抓住过去、焦虑现在、追逐未来。经文提醒修行者：心若可执，便落分别；放下执持，才能真正安住。',
        commentaryText:
          '与六祖法门合看时，这里可以引导学人直观念念不住，体会“本来无一物”的照见力，而不是把它读成抽象哲学。',
        audioUrl: '',
      },
    ],
  },
  {
    slug: 'platform',
    title: '六祖坛经',
    categorySlug: 'zushi',
    dynasty: '唐代',
    translator: '法海集录',
    role: '顿悟见性、教观并重',
    overlay: '从自性与日常观照开始阅读',
    summary: '适合作为祖师法门入门，配合《金刚经》建立经论互证关系。',
    passages: [
      {
        slug: 'qingjing',
        title: '菩提自性，本来清净',
        originalText: '菩提自性，本来清净，但用此心，直了成佛。',
        plainText:
          '每个人本具清净觉性，修行并不是向外寻找，而是返照自心、把遮蔽放下。',
        commentaryText:
          '放到共修语境里，这一段很适合作为每日晨读引子，再对接《金刚经》中的“无住生心”，形成经论互证。',
        audioUrl: '',
      },
    ],
  },
  {
    slug: 'lotus',
    title: '妙法莲华经',
    categorySlug: 'fahua',
    dynasty: '姚秦',
    translator: '鸠摩罗什译',
    role: '开权显实、会三归一',
    overlay: '循经典原文，逐节研读',
    summary: '适合作为长期精读专题，后续可扩展判教、注疏与讲记体系。',
    passages: [
      {
        slug: 'yidashi',
        title: '诸佛唯以一大事因缘故出现于世',
        originalText: '诸佛世尊，唯以一大事因缘故，出现于世。',
        plainText:
          '佛出现在世间，是为了让众生开启并证入佛之知见，这为整部法华经奠定了核心方向。',
        commentaryText:
          '这一部可放入“深修经藏”路径，后续与判教体系、品目导航结合，会非常适合做长期专题。',
        audioUrl: '',
      },
    ],
  },
] as const;

export const seedTopics = [
  {
    slug: 'diamond-7days',
    title: '金刚经七日共修',
    summary: '围绕无住生心、破相显智建立逐段共修节奏，适合初入般若门径。',
    goal: '帮助初学者通过七日节奏进入般若阅读与祖师注义对照。',
    schedule: '每日 1 段经文 + 1 段白话 + 1 次讨论',
    duration: '7 日',
    participants: 68,
    scriptureSlugs: ['diamond'],
  },
  {
    slug: 'platform-intro',
    title: '六祖坛经入门路线',
    summary: '以祖师语录串联见性、无念、无相、无住的修学骨架。',
    goal: '帮助读者建立祖师法门的整体理解，并与般若系经典互证。',
    schedule: '14 日导读 + 每周讨论',
    duration: '14 日',
    participants: 41,
    scriptureSlugs: ['platform', 'diamond'],
  },
  {
    slug: 'lotus-longterm',
    title: '法华经长期精读',
    summary: '面向已有基础的长期专题，后续可接疏义、判教与讲记。',
    goal: '为长期深入修学者建立法华专题入口。',
    schedule: '长期专题，每月更新',
    duration: '长期',
    participants: 23,
    scriptureSlugs: ['lotus'],
  },
] as const;

export const seedAnnouncements = [
  {
    title: '书斋开放阅读',
    detail: '从经典原文开始，建立私人修读计划，保存自己的摘录与心得。',
  },
  {
    title: '招募古籍整理志工',
    detail: '欢迎参与经文录入、白话整理、祖师注义锚定与内容校对，共同完善公益经藏。',
  },
] as const;

export const seedActivities = [
  {
    slug: 'qingming-copying',
    title: '清明抄经共修日',
    summary: '围绕《金刚经》与《六祖坛经》开展半日抄经与静坐共修，适合线下寺院或居士点同步进行。',
    schedule: '2026-04-28 09:00',
    location: '线上直播 + 线下共修点',
    format: '线上 / 线下',
    status: '报名中',
  },
  {
    slug: 'weekend-audio-proofread',
    title: '周末音频校对志工活动',
    summary: '集中整理已上传诵读音频，对齐段落锚点、标题与音频地址，补全经文诵读资源。',
    schedule: '2026-05-03 14:00',
    location: '线上协作',
    format: '线上',
    status: '招募中',
  },
  {
    slug: 'lotus-reading-meet',
    title: '法华经长期读书会',
    summary: '面向已有基础的长期活动，每两周一次，围绕法华经章节精读与疏义互参展开。',
    schedule: '2026-05-10 19:30',
    location: '共修教室',
    format: '线下',
    status: '长期进行',
  },
] as const;

export const seedDiscussions = [
  {
    title: '“应无所住而生其心”在共修中如何落地？',
    scriptureSlug: 'diamond',
    topicSlug: 'diamond-7days',
    authorName: '清净行者',
    body: '大家在共修时，如何把“无住”从概念落实到日用功课中？欢迎结合自己读经的体会来交流。',
    repliesCount: 18,
    likesCount: 26,
  },
  {
    title: '六祖坛经适合作为初学者入门吗？',
    scriptureSlug: 'platform',
    topicSlug: 'platform-intro',
    authorName: '明德居士',
    body: '我想知道如果完全没基础，是先读坛经还是先配合金刚经更稳妥？',
    repliesCount: 9,
    likesCount: 15,
  },
  {
    title: '法华经长期精读专题如何安排更稳妥？',
    scriptureSlug: 'lotus',
    topicSlug: 'lotus-longterm',
    authorName: '法音共修组',
    body: '如果面向长期学习者，法华经专题在结构上应该先做品目导览还是直接做章节精读？',
    repliesCount: 12,
    likesCount: 19,
  },
] as const;

export const seedReviewQueue = [
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

export const defaultUsers = [
  { name: '法音法师', password: 'fayin123', role: 'admin' },
  { name: '慧安居士', password: 'huian123', role: 'reviewer' },
  { name: '梵烬用户', password: 'fanjin123', role: 'user' },
] as const;

export const seedSettings = [
  { key: 'site_name', value: '梵烬' },
  { key: 'site_subtitle', value: '东方经典个人自修驿站' },
  { key: 'site_description', value: '公益开放阅读，以佛道经典为主，兼读诸子百家。按自己的步调，记录私人修读与心得。' },
  { key: 'footer_notice', value: '为阅读留一方清净，为自己留一点时间。' },
] as const;
