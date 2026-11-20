import { db } from './db.ts';
import type { Migration } from './migrations.ts';

// Exact legacy seed values only: preserve every customized setting and annotation.
export const productMigration: Migration = {
  id: 'product-self-study-20261120-v1',
  up() {
    const replacements = [
      ['site_name','梵烬网','梵烬'],
      ['site_subtitle','佛教共修公益古籍网','东方经典个人自修驿站'],
      ['site_description','用于佛教古籍数字化、公益共修与内容整理，不以商业变现为首要目标。','公益开放阅读，以佛道经典为主，兼读诸子百家。按自己的步调，记录私人修读与心得。'],
      ['footer_notice','欢迎参与经文录入、白话整理、祖师注义锚定与内容校对。','为阅读留一方清净，为自己留一点时间。'],
    ];
    for (const [key, oldValue, newValue] of replacements) db.prepare('UPDATE site_settings SET value=? WHERE key=? AND value=?').run(newValue,key,oldValue);
    db.prepare('UPDATE announcements SET title=?,detail=? WHERE title=? AND detail=?').run('书斋开放阅读','从经典原文开始，建立私人修读计划，保存自己的摘录与心得。','梵烬网首期内测开放','当前开放经藏入口、对照阅读、专题共修和后台演示，便于尽快收集真实修学反馈。');
    const overlays = [
      ['diamond','可并列六祖《金刚经口诀》或白话释义','从无住与般若智慧开始阅读'],
      ['platform','可挂接《金刚经》相关段落，形成祖师注解网','从自性与日常观照开始阅读'],
      ['lotus','后续可加入天台疏义与白话导读','循经典原文，逐节研读'],
    ];
    for (const [slug, oldValue, newValue] of overlays) db.prepare('UPDATE scriptures SET overlay=? WHERE slug=? AND overlay=?').run(newValue,slug,oldValue);
  },
};
