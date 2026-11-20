export type ScriptureMetadata = {
  school?: string;
  tags?: string[];
  edition?: string;
  sourceName?: string;
  sourceUrl?: string;
  license?: string;
  licenseUrl?: string;
  isExcerpt?: boolean;
  sourceVerified?: boolean;
  sourceHeader?: string;
};
export type ScriptureSummary = ScriptureMetadata & {
  id: number;
  slug: string;
  title: string;
  dynasty: string;
  translator: string;
  role: string;
  overlay: string;
  summary: string;
  categorySlug: string;
  categoryName: string;
  publishStatus: string;
};

export type ScripturePassage = {
  id?: number;
  slug: string;
  title: string;
  orderIndex?: number;
  originalText: string;
  plainText: string;
  commentaryText: string;
  audioUrl: string;
  contentTc?: string | null;
  contentSc?: string | null;
  classicalCommentary?: string | null;
  commentarySource?: string | null;
  modernGuide?: string | null;
};

export type ScriptureDetail = ScriptureSummary & {
  passages: ScripturePassage[];
};

export type TopicSummary = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  goal: string;
  schedule: string;
  duration: string;
  participants: number;
  scriptures: Array<{
    topicSlug: string;
    scriptureSlug: string;
    scriptureTitle: string;
  }>;
};

export type DiscussionFilters = {
  scriptureSlug?: string;
  topicSlug?: string;
};

export type ReviewFilters = {
  status?: string;
};

export type DiscussionItem = {
  id: number;
  title: string;
  authorName: string;
  body: string;
  repliesCount: number;
  likesCount: number;
  createdAt: string;
  scriptureSlug: string | null;
  scriptureTitle: string | null;
  topicSlug: string | null;
  topicTitle: string | null;
};

export type AdminDashboardResponse = {
  metrics: {
    userCount: number;
    scriptureCount: number;
    noteCount: number;
    discussionCount: number;
    reviewCount: number;
  };
  queue: Array<{
    id: number;
    title: string;
    type: string;
    submitter: string;
    status: string;
    createdAt: string;
  }>;
  users: Array<{
    id: number;
    name: string;
    role: string;
    createdAt: string;
  }>;
};

export type HomeResponse = {
  announcements: AnnouncementItem[];
  featuredScriptures: Array<{
    slug: string;
    title: string;
    role: string;
    overlay: string;
    category: string;
  }>;
  stats: {
    scriptureCount: number;
    passageCount: number;
    topicCount: number;
    discussionCount: number;
  };
  settings: Record<string, string>;
};

export type AnnouncementItem = {
  id: number;
  title: string;
  detail: string;
  createdAt: string;
};

export type ActivityItem = {
  id: number;
  slug: string;
  title: string;
  summary: string;
  schedule: string;
  location: string;
  format: string;
  status: string;
  createdAt: string;
  participants: number;
};

export type AdminScriptureInput = ScriptureMetadata & {
  title: string;
  slug: string;
  categorySlug: string;
  dynasty: string;
  translator: string;
  role: string;
  overlay: string;
  summary: string;
  passages: ScripturePassage[];
};

export type ReviewItem = {
  id: number;
  title: string;
  type: string;
  submitter: string;
  status: string;
  createdAt: string;
  targetKind?: string | null;
  targetSlug?: string | null;
};
export type AdminUser = AdminDashboardResponse['users'][number] & { status: 'active' | 'disabled' };
export type CategoryItem = {
  id: number;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
};

export type DiscussionDetail = DiscussionItem & {
  replies: Array<{
    id: number;
    authorName: string;
    body: string;
    createdAt: string;
  }>;
};

export type ReadingHistoryItem = {
  id: number;
  viewedAt: string;
  scriptureSlug: string;
  scriptureTitle: string;
  passageSlug: string | null;
  passageTitle: string | null;
};

export async function apiRequest<T>(path: string, init: RequestInit = {}, _token?: string | null): Promise<T> {
  if (init.signal?.aborted) throw new DOMException('请求已取消', 'AbortError');
  const { dispatchLocalApi } = await import('./local-api');
  const result = await dispatchLocalApi(path, init);
  if ((!init.method || init.method.toUpperCase()==='GET') && init.signal?.aborted) throw new DOMException('请求已取消', 'AbortError');
  return result as T;
}

export function getScriptures(query?: string, category?: string) {
  const params = new URLSearchParams();
  if (query?.trim()) {
    params.set('q', query.trim());
  }
  if (category?.trim()) {
    params.set('category', category.trim());
  }

  return apiRequest<ScriptureSummary[]>(`/api/scriptures${params.size ? `?${params.toString()}` : ''}`);
}

export function getScripture(slug: string) {
  return apiRequest<ScriptureDetail>(`/api/scriptures/${slug}`);
}

export function getTopics() {
  return apiRequest<TopicSummary[]>('/api/topics');
}

export function getActivities() {
  return apiRequest<ActivityItem[]>('/api/activities');
}

export function getDiscussions(filters: DiscussionFilters = {}) {
  const params = new URLSearchParams();
  if (filters.scriptureSlug?.trim()) {
    params.set('scripture', filters.scriptureSlug.trim());
  }
  if (filters.topicSlug?.trim()) {
    params.set('topic', filters.topicSlug.trim());
  }

  return apiRequest<DiscussionItem[]>(`/api/discussions${params.size ? `?${params.toString()}` : ''}`);
}

export function getAdminDashboard(token: string) {
  return apiRequest<AdminDashboardResponse>('/api/admin/dashboard', {}, token);
}

export function getHomeData() {
  return apiRequest<HomeResponse>('/api/home');
}

export function getPublicSettings() {
  return apiRequest<Record<string, string>>('/api/settings');
}

export function getCategories() {
  return apiRequest<CategoryItem[]>('/api/categories');
}

export function getAdminScriptures(token: string) {
  return apiRequest<ScriptureSummary[]>('/api/admin/scriptures', {}, token);
}

export function getAdminScripture(slug: string, token: string) {
  return apiRequest<ScriptureDetail>(`/api/admin/scriptures/${slug}`, {}, token);
}

export function createAdminScripture(input: AdminScriptureInput, token: string) {
  return apiRequest<{ ok: boolean; slug: string }>(
    '/api/admin/scriptures',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  );
}

export function updateAdminScripture(slug: string, input: AdminScriptureInput, token: string) {
  return apiRequest<{ ok: boolean; slug: string }>(
    `/api/admin/scriptures/${slug}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
    token,
  );
}

export function getAdminReview(token: string) {
  return apiRequest<ReviewItem[]>('/api/admin/review', {}, token);
}

export function getAdminReviewByFilter(filters: ReviewFilters, token: string) {
  const params = new URLSearchParams();
  if (filters.status?.trim()) {
    params.set('status', filters.status.trim());
  }
  return apiRequest<ReviewItem[]>(`/api/admin/review${params.size ? `?${params.toString()}` : ''}`, {}, token);
}

export function updateReviewStatus(id: number, status: string, token: string) {
  return apiRequest<{ ok: boolean }>(
    `/api/admin/review/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    },
    token,
  );
}

export function getAdminUsers(token: string) {
  return apiRequest<AdminUser[]>('/api/admin/users', {}, token);
}

export function updateAdminUserRole(id: number, role: string, token: string) {
  return apiRequest<{ ok: boolean }>(
    `/api/admin/users/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    },
    token,
  );
}

export function getAdminSettings(token: string) {
  return apiRequest<Record<string, string>>('/api/admin/settings', {}, token);
}

export function getAdminAnnouncements(token: string) {
  return apiRequest<AnnouncementItem[]>('/api/admin/announcements', {}, token);
}

export function getAdminActivities(token: string) {
  return apiRequest<ActivityItem[]>('/api/admin/activities', {}, token);
}

export function getAdminTopics(token: string) {
  return apiRequest<TopicSummary[]>('/api/admin/topics', {}, token);
}

export function createAdminTopic(
  input: {
    slug: string;
    title: string;
    summary: string;
    goal: string;
    schedule: string;
    duration: string;
    participants: number;
    scriptureSlugs: string[];
  },
  token: string,
) {
  return apiRequest<{ ok: boolean }>(
    '/api/admin/topics',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  );
}

export function deleteAdminTopic(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(
    `/api/admin/topics/${id}`,
    {
      method: 'DELETE',
    },
    token,
  );
}

export function createAdminActivity(
  input: Omit<ActivityItem, 'id' | 'createdAt' | 'participants'>,
  token: string,
) {
  return apiRequest<{ ok: boolean }>(
    '/api/admin/activities',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  );
}

export function deleteAdminActivity(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(
    `/api/admin/activities/${id}`,
    {
      method: 'DELETE',
    },
    token,
  );
}

export function createAdminAnnouncement(input: { title: string; detail: string }, token: string) {
  return apiRequest<{ ok: boolean; id: number }>(
    '/api/admin/announcements',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  );
}

export function deleteAdminAnnouncement(id: number, token: string) {
  return apiRequest<{ ok: boolean }>(
    `/api/admin/announcements/${id}`,
    {
      method: 'DELETE',
    },
    token,
  );
}

export function updateAdminSettings(settings: Record<string, string>, token: string) {
  return apiRequest<{ ok: boolean }>(
    '/api/admin/settings',
    {
      method: 'PUT',
      body: JSON.stringify(settings),
    },
    token,
  );
}

export function getDiscussion(id: number) {
  return apiRequest<DiscussionDetail>(`/api/discussions/${id}`);
}

export function createDiscussion(
  input: { title: string; body: string; scriptureSlug?: string; topicSlug?: string },
  token: string,
) {
  return apiRequest<{ ok: boolean; id: number }>(
    '/api/discussions',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  );
}

export function createDiscussionReply(id: number, body: string, token: string) {
  return apiRequest<{ ok: boolean }>(
    `/api/discussions/${id}/replies`,
    {
      method: 'POST',
      body: JSON.stringify({ body }),
    },
    token,
  );
}

export function getMyDiscussions(token: string) {
  return apiRequest<DiscussionItem[]>('/api/my/discussions', {}, token);
}

export function getReadingHistory(token: string) {
  return apiRequest<ReadingHistoryItem[]>('/api/history', {}, token);
}

export function createReadingHistory(input: { scriptureSlug: string; passageSlug?: string }, token: string) {
  return apiRequest<{ ok: boolean }>(
    '/api/history',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    token,
  );
}
