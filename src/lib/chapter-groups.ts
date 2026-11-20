import type { ScripturePassage } from './api';
export type ChapterGroup = { key: string; title: string; passages: ScripturePassage[]; start: number };
export function groupChapters(passages: ScripturePassage[], bookTitle: string): ChapterGroup[] {
  const result: ChapterGroup[] = [];
  const lookup = new Map<string, ChapterGroup>();
  for (const [index, passage] of passages.entries()) {
    const key = passage.slug.includes('--') ? passage.slug.split('--')[0] : passages.length <= 20 ? 'whole-book' : passage.slug;
    let group = lookup.get(key);
    if (!group) {
      group = { key, title: key === 'whole-book' ? '全文' : passage.title.split(' · ')[0] || bookTitle, passages: [], start: index };
      result.push(group); lookup.set(key, group);
    }
    group.passages.push(passage);
  }
  return result;
}
