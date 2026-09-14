import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { db, initializeDatabase } from './db.ts';

type ImportPassage = {
  slug: string;
  title: string;
  originalText: string;
  plainText: string;
  commentaryText: string;
  audioUrl?: string;
};

type ImportScripturePayload = {
  slug: string;
  title: string;
  categorySlug: string;
  dynasty: string;
  translator: string;
  role: string;
  overlay: string;
  publishStatus?: string;
  summary?: string;
  submitter?: string;
  passages: ImportPassage[];
};

function fail(message: string): never {
  throw new Error(message);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const fileArg = args.find((arg) => !arg.startsWith('--'));

  if (!fileArg) {
    fail('请提供导入文件路径，例如：npm run import:scripture -- data/import-templates/scripture-template.json');
  }

  return {
    filePath: resolve(process.cwd(), fileArg),
    dryRun: args.includes('--dry-run'),
    published: args.includes('--published'),
  };
}

function readPayload(filePath: string): ImportScripturePayload {
  const raw = readFileSync(filePath, 'utf8');
  const payload = JSON.parse(raw) as ImportScripturePayload;

  if (!payload.slug?.trim()) fail('缺少经典 slug。');
  if (!payload.title?.trim()) fail('缺少经典标题。');
  if (!payload.categorySlug?.trim()) fail('缺少 categorySlug。');
  if (!payload.dynasty?.trim()) fail('缺少 dynasty。');
  if (!payload.translator?.trim()) fail('缺少 translator。');
  if (!payload.role?.trim()) fail('缺少 role。');
  if (!payload.overlay?.trim()) fail('缺少 overlay。');
  if (!Array.isArray(payload.passages) || payload.passages.length === 0) {
    fail('至少需要一条 passages。');
  }

  const slugSet = new Set<string>();
  payload.passages.forEach((passage, index) => {
    if (!passage.slug?.trim()) fail(`第 ${index + 1} 段缺少 slug。`);
    if (slugSet.has(passage.slug)) fail(`段落 slug 重复：${passage.slug}`);
    slugSet.add(passage.slug);
    if (!passage.title?.trim()) fail(`第 ${index + 1} 段缺少标题。`);
    if (!passage.originalText?.trim()) fail(`第 ${index + 1} 段缺少原文。`);
    if (!passage.plainText?.trim()) fail(`第 ${index + 1} 段缺少白话。`);
    if (!passage.commentaryText?.trim()) fail(`第 ${index + 1} 段缺少祖师注义。`);
  });

  return payload;
}

function enqueueReview(title: string, type: string, submitter: string, targetSlug: string) {
  db.prepare(
    'INSERT INTO review_queue (title, type, submitter, status, target_kind, target_slug) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(title, type, submitter, '待审核', 'scripture', targetSlug);
}

function markReviewPassed(targetSlug: string) {
  db.prepare(
    "UPDATE review_queue SET status = '已通过' WHERE target_kind = 'scripture' AND target_slug = ? AND status != '已通过'",
  ).run(targetSlug);
}

function importScripture(payload: ImportScripturePayload, options: { dryRun: boolean; published: boolean }) {
  const category = db.prepare('SELECT id, name FROM categories WHERE slug = ?').get(payload.categorySlug) as
    | { id: number; name: string }
    | undefined;

  if (!category) {
    const available = (
      db.prepare('SELECT slug, name FROM categories ORDER BY sort_order ASC').all() as Array<{
        slug: string;
        name: string;
      }>
    )
      .map((item) => `${item.slug}(${item.name})`)
      .join('、');
    fail(`未找到分类 ${payload.categorySlug}。当前可用分类：${available}`);
  }

  const existing = db.prepare('SELECT id FROM scriptures WHERE slug = ?').get(payload.slug) as
    | { id: number }
    | undefined;

  const publishStatus = options.published ? 'published' : payload.publishStatus?.trim() || 'pending_review';
  const summary = payload.summary?.trim() || payload.overlay.trim();
  const submitter = payload.submitter?.trim() || '批量导入';
  const operation = existing ? '更新' : '新增';

  const stats = {
    title: payload.title.trim(),
    slug: payload.slug.trim(),
    categoryName: category.name,
    passageCount: payload.passages.length,
    publishStatus,
    operation,
  };

  if (options.dryRun) {
    return stats;
  }

  const transaction = db.transaction(() => {
    let scriptureId = existing?.id ?? 0;

    if (existing) {
      db.prepare(
        `UPDATE scriptures
         SET title = ?, category_id = ?, dynasty = ?, translator = ?, role = ?, overlay = ?, summary = ?, publish_status = ?
         WHERE id = ?`,
      ).run(
        payload.title.trim(),
        category.id,
        payload.dynasty.trim(),
        payload.translator.trim(),
        payload.role.trim(),
        payload.overlay.trim(),
        summary,
        publishStatus,
        existing.id,
      );
      // 更新前先清理引用旧段落的数据，避免外键约束阻止段落删除。
      // notes 与 reading_history 均以 passage_id 引用 passages(id) 且未设级联删除。
      db.prepare('DELETE FROM notes WHERE scripture_id = ?').run(existing.id);
      db.prepare('DELETE FROM reading_history WHERE scripture_id = ?').run(existing.id);
      db.prepare('DELETE FROM passages WHERE scripture_id = ?').run(existing.id);
    } else {
      const result = db
        .prepare(
          `INSERT INTO scriptures
            (slug, title, category_id, dynasty, translator, role, overlay, summary, publish_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          payload.slug.trim(),
          payload.title.trim(),
          category.id,
          payload.dynasty.trim(),
          payload.translator.trim(),
          payload.role.trim(),
          payload.overlay.trim(),
          summary,
          publishStatus,
        );
      scriptureId = Number(result.lastInsertRowid);
    }

    if (!scriptureId) {
      fail('经典写入失败。');
    }

    const insertPassage = db.prepare(
      `INSERT INTO passages
        (scripture_id, slug, title, order_index, original_text, plain_text, commentary_text, audio_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    );

    payload.passages.forEach((passage, index) => {
      insertPassage.run(
        scriptureId,
        passage.slug.trim(),
        passage.title.trim(),
        index + 1,
        passage.originalText.trim(),
        passage.plainText.trim(),
        passage.commentaryText.trim(),
        passage.audioUrl?.trim() ?? '',
      );
    });

    if (!options.published) {
      enqueueReview(payload.title.trim(), existing ? '经典更新' : '经典录入', submitter, payload.slug.trim());
    } else {
      markReviewPassed(payload.slug.trim());
    }
  });

  transaction();
  return stats;
}

function main() {
  initializeDatabase();
  const args = parseArgs();
  const payload = readPayload(args.filePath);
  const result = importScripture(payload, {
    dryRun: args.dryRun,
    published: args.published,
  });

  console.log(`${args.dryRun ? '预检完成' : '导入完成'}：${result.operation}${result.title}`);
  console.log(`slug: ${result.slug}`);
  console.log(`分类: ${result.categoryName}`);
  console.log(`段落数: ${result.passageCount}`);
  console.log(`发布状态: ${result.publishStatus}`);
}

main();
