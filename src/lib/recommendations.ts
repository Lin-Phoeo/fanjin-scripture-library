import type { ScriptureSummary } from './api';
import type { BookMetadata } from './books';
import type { PersonalPreferences } from './personal-preferences';
export type RecommendationBook = ScriptureSummary & BookMetadata;
export function bookSchool(book: RecommendationBook) {
  if (book.school) return book.school.replace('诸子百家', '诸子');
  if (['banruo', 'zushi', 'fahua', 'buddhism'].includes(book.categorySlug)) return '佛家';
  return ({ dao: '道家', ru: '儒家', zhuzi: '诸子' } as Record<string, string>)[book.categorySlug] || book.categoryName;
}
export function rankBooks(books: RecommendationBook[], preferences: PersonalPreferences) {
  const budget = preferences.minutes * 160;
  const matching = books.filter((book) => !preferences.interests.length || preferences.interests.includes(bookSchool(book)));
  const pool = matching.length ? matching : books;
  return [...pool].sort((a, b) => {
    const length = (book: RecommendationBook) => book.wordCount || 500;
    if (preferences.intention === 'quiet') return length(a) - length(b) || a.id - b.id;
    return Math.abs(length(a) - budget) - Math.abs(length(b) - budget) || a.id - b.id;
  });
}
