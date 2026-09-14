export type Passage = {
  id: string;
  title: string;
  original: string;
  plain: string;
  commentary: string;
};

export type Scripture = {
  id: string;
  title: string;
  category: string;
  dynasty: string;
  role: string;
  overlay: string;
  passages: Passage[];
};

export const canonFamilies = [
  {
    title: '十二部经编目',
    description:
      '从长行、重颂到因缘、譬喻，建立清晰的经藏分层，让初学与深入整理都能找到入口。',
  },
  {
    title: '白话文并列阅读',
    description:
      '每一段原文都可以挂接现代白话解释，保留原味的同时降低阅读门槛。',
  },
  {
    title: '祖师注义导入',
    description:
      '支持将六祖、憨山、蕅益等祖师注解绑定到具体段落，以修学脉络来读经。',
  },
  {
    title: '公益共修编次',
    description:
      '把经文阅读、每日定课、回向与笔记组织成共修流程，方便道场与个人同步精进。',
  },
] as const;

export const scriptures: Scripture[] = [
  {
    id: 'diamond',
    title: '金刚般若波罗蜜经',
    category: '般若部',
    dynasty: '姚秦 鸠摩罗什译',
    role: '破相显智、照见无住',
    overlay: '可并列六祖《金刚经口诀》或白话释义',
    passages: [
      {
        id: 'diamond-1',
        title: '应无所住而生其心',
        original:
          '须菩提，菩萨应如是生清净心，不应住色生心，不应住声香味触法生心，应无所住而生其心。',
        plain:
          '修行人发心时，不要被外在境界束缚。不是离开世界，而是不被色声香味触法牵引，在不执着中生起清净愿心。',
        commentary:
          '六祖一系的解法重在“无住”不是断灭，而是心体本自灵明，不黏一法；用时遍一切处，却不被境转，于是般若现前。',
      },
      {
        id: 'diamond-2',
        title: '凡所有相，皆是虚妄',
        original:
          '凡所有相，皆是虚妄。若见诸相非相，即见如来。',
        plain:
          '一切我们执为真实不变的形相，其实都在因缘中流转。能看见相而不被相迷，就开始靠近如来智慧。',
        commentary:
          '祖师注义多把“非相”解释为不住相、不灭相。不是否定世界存在，而是破除执取，回到见性之明。',
      },
      {
        id: 'diamond-3',
        title: '过去心不可得',
        original:
          '过去心不可得，现在心不可得，未来心不可得。',
        plain:
          '烦恼常来自抓住过去、焦虑现在、追逐未来。经文提醒修行者：心若可执，便落分别；放下执持，才能真正安住。',
        commentary:
          '与六祖法门合看时，这里可以引导学人直观念念不住，体会“本来无一物”的照见力，而不是把它读成抽象哲学。',
      },
    ],
  },
  {
    id: 'platform',
    title: '六祖坛经',
    category: '祖师语录',
    dynasty: '唐代法海集录',
    role: '顿悟见性、教观并重',
    overlay: '可挂接《金刚经》相关段落，形成祖师注解网',
    passages: [
      {
        id: 'platform-1',
        title: '菩提自性，本来清净',
        original:
          '菩提自性，本来清净，但用此心，直了成佛。',
        plain:
          '每个人本具清净觉性，修行并不是向外寻找，而是返照自心、把遮蔽放下。',
        commentary:
          '放到共修语境里，这一段很适合作为每日晨读引子，再对接《金刚经》中的“无住生心”，形成经论互证。',
      },
    ],
  },
  {
    id: 'lotus',
    title: '妙法莲华经',
    category: '法华部',
    dynasty: '姚秦 鸠摩罗什译',
    role: '开权显实、会三归一',
    overlay: '后续可加入天台疏义与白话导读',
    passages: [
      {
        id: 'lotus-1',
        title: '方便品导读',
        original:
          '诸佛世尊，唯以一大事因缘故，出现于世。',
        plain:
          '佛出现在世间，是为了让众生开启并证入佛之知见，这为整部法华经奠定了核心方向。',
        commentary:
          '这一部可放入“深修经藏”路径，后续与判教体系、品目导航结合，会非常适合做长期专题。',
      },
    ],
  },
];

export const roadmap = [
  '经藏录入：支持原文、校勘、白话、注疏、音频与图像版本并存。',
  '双栏阅读：原文在左，白话或祖师注义在右，适合共修时逐段研读。',
  '义注导入：为每段文本建立唯一锚点，后续可从 CSV、Markdown 或数据库批量导入。',
  '修学组织：增加课程单元、回向单、每日定课与摘记收藏。',
] as const;

export const technologyStack = [
  '前端：React + TypeScript + Vite，适合快速搭站与后续组件化扩展。',
  '样式：CSS 变量驱动的主题系统，便于后续沉淀佛典站自己的视觉规范。',
  '数据层：先用静态结构建模，后续可升级到 PostgreSQL / Supabase 存放经藏与注义。',
  '内容录入：后续可接 CMS 或自建后台，支持志工录入、校对、审核与版本追踪。',
] as const;

export const featuredTopics = [
  {
    title: '金刚经七日共修',
    summary: '围绕无住生心、破相显智建立逐段共修节奏，适合初入般若门径。',
    duration: '7 日',
  },
  {
    title: '六祖坛经入门路线',
    summary: '以祖师语录串联见性、无念、无相、无住的修学骨架。',
    duration: '14 日',
  },
  {
    title: '法华经长期精读',
    summary: '面向已有基础的长期专题，后续可接疏义、判教与讲记。',
    duration: '长期',
  },
] as const;

export const communityStats = [
  { label: '首批经藏方向', value: '12 部经类' },
  { label: '对照阅读模式', value: '原文 / 白话 / 注义' },
  { label: '共修组织形态', value: '个人 + 寺院 + 志工' },
] as const;

export const scriptureTracks = [
  {
    title: '初学入门',
    description: '从短篇经典、白话导读和每日一段开始，降低初学门槛。',
  },
  {
    title: '专题共修',
    description: '按七日、十四日、长期路线编排经典与讨论，形成有节奏的修学流程。',
  },
  {
    title: '古籍整理',
    description: '支持志工录入校对、注义导入与版本管理，逐步把经藏沉淀完整。',
  },
] as const;
