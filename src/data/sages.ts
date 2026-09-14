export type SageQuote = {
  text: string;
  source: string;
};

export type SageLifeItem = {
  period: string;
  title: string;
  detail: string;
};

export type SageRecord = {
  slug: string;
  name: string;
  honorific: string;
  era: string;
  lineage: string;
  profile: string;
  portraitLine: string;
  studyFocus: string[];
  relatedScriptures: string[];
  relatedTopics: string[];
  sayings: SageQuote[];
  life: SageLifeItem[];
};

export const sages: SageRecord[] = [
  {
    slug: 'huineng',
    name: '六祖慧能',
    honorific: '曹溪六祖',
    era: '唐代',
    lineage: '禅宗',
    profile:
      '六祖慧能以“不立文字，见性成佛”的宗风转动后世佛门修学气象，所示法门直截、简净而不离日用，适合与《金刚经》并观。',
    portraitLine: '风骨简劲，言语不繁，而每一语都直指心地。',
    studyFocus: ['见性', '无念', '无相', '无住'],
    relatedScriptures: ['金刚般若波罗蜜经', '六祖坛经'],
    relatedTopics: ['六祖坛经入门路线', '金刚经七日共修'],
    sayings: [
      {
        text: '菩提自性，本来清净，但用此心，直了成佛。',
        source: '《六祖坛经》',
      },
      {
        text: '外离相即禅，内不乱即定。',
        source: '《六祖坛经》',
      },
    ],
    life: [
      {
        period: '少时闻法',
        title: '闻《金刚经》而启悟缘',
        detail: '以一闻即起信心，显示宿植善根，也开启了“经论与见地相发明”的修学路径。',
      },
      {
        period: '黄梅得法',
        title: '于五祖门下得衣钵',
        detail: '不以文字多寡争高下，而以直下见地相契祖意，成为禅门史上关键转折。',
      },
      {
        period: '曹溪弘化',
        title: '建立南宗宗风',
        detail: '以平实直接的说法，令后学于行住坐卧中体会无住、无念、无相之要。',
      },
    ],
  },
  {
    slug: 'hanshan',
    name: '憨山德清',
    honorific: '憨山大师',
    era: '明代',
    lineage: '禅教兼弘',
    profile:
      '憨山大师兼通经论与宗门，文字清严而有骨力，尤其适合作为古籍精读、注义对照与修学札记的引路人。',
    portraitLine: '气象高古，著述深稳，兼具宗门骨气与教下条理。',
    studyFocus: ['禅教融通', '般若观照', '净心工夫', '古籍疏解'],
    relatedScriptures: ['金刚般若波罗蜜经', '妙法莲华经'],
    relatedTopics: ['法华经长期精读', '金刚经七日共修'],
    sayings: [
      {
        text: '学道之人，第一要生死心切。',
        source: '《憨山老人梦游集》',
      },
      {
        text: '但于一切境缘上不随妄转，即是工夫得力处。',
        source: '憨山法语',
      },
    ],
    life: [
      {
        period: '出家参学',
        title: '广涉经论，兼参诸方',
        detail: '既重实修，也重古籍注解与经论会通，留下大量可供后学研读的整理成果。',
      },
      {
        period: '弘法著述',
        title: '重整古籍学脉',
        detail: '其著述适合现代公益古籍站做对照阅读与义理解说，是研学型内容的重要资源。',
      },
      {
        period: '晚年示导',
        title: '以工夫与行持策励学人',
        detail: '强调切实省察身心，不空谈玄理，形成严整而不板滞的修学风格。',
      },
    ],
  },
  {
    slug: 'ouyi',
    name: '蕅益智旭',
    honorific: '蕅益大师',
    era: '明末清初',
    lineage: '天台、净土兼弘',
    profile:
      '蕅益大师长于判教与注疏，也重净业实行。其文字周密，适合建立“原文—白话—注义”的长期研学结构。',
    portraitLine: '持论精严，义理分明，于经教条贯处尤见功力。',
    studyFocus: ['判教', '净土', '戒律', '注疏体系'],
    relatedScriptures: ['妙法莲华经', '金刚般若波罗蜜经'],
    relatedTopics: ['法华经长期精读', '六祖坛经入门路线'],
    sayings: [
      {
        text: '信愿持名，求生净土。',
        source: '蕅益净土开示',
      },
      {
        text: '名字位中真佛眼，未知毕竟付何人。',
        source: '《灵峰宗论》',
      },
    ],
    life: [
      {
        period: '发心治学',
        title: '由儒入佛，深究经藏',
        detail: '其治学路径极适合现代居士参照，能帮助建立闻思修并进的次第。',
      },
      {
        period: '讲论著作',
        title: '留下大量判教与疏义成果',
        detail: '许多著作都适合古籍站整理为专题研学资料，与经文正典互为参照。',
      },
      {
        period: '弘护净业',
        title: '兼顾教义与持行',
        detail: '在严整义理之外，强调落实于修行实践，使网站内容不流于资料堆积。',
      },
    ],
  },
];
