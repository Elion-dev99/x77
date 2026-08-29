const API_BASE = '/api';

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  role: 'viewer' | 'streamer' | 'admin';
  points: number;
  followers_count: number;
  is_verified: number;
  region: string;
}

export interface Stream {
  id: string;
  streamer_id: string;
  title: string;
  description: string;
  category: string;
  is_live: number;
  is_private: number;
  private_password?: string | null;
  price_per_minute: number;
  scheduled_at: string | null;
  started_at: string | null;
  viewer_count: number;
  peak_viewers: number;
  total_tips: number;
  tags: string;
  streamer_name?: string;
  streamer_username?: string;
  streamer_avatar?: string | null;
  streamer_verified?: number;
  streamer_region?: string;
  streamer_bio?: string;
  streamer_followers?: number;
}

export interface Gift {
  id: string;
  name: string;
  name_ja: string;
  icon: string;
  points_cost: number;
  animation: string;
  category: string;
}

export interface ChatMessage {
  id: string;
  stream_id: string;
  user_id: string;
  username: string;
  content: string;
  type: 'message' | 'gift' | 'system' | 'tip';
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  is_read: number;
  created_at: string;
}

function getToken(): string | null {
  return localStorage.getItem('livenova_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  login: (username: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  register: (data: { username: string; email: string; password: string; display_name: string; role?: string }) =>
    request<{ user: User; token: string }>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  me: () => request<{ user: User }>('/auth/me'),

  getStreams: (params?: { category?: string; live?: boolean; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.live) qs.set('live', 'true');
    if (params?.search) qs.set('search', params.search);
    return request<{ streams: Stream[] }>(`/streams?${qs}`);
  },

  getStream: (id: string) => request<{ stream: Stream }>(`/streams/${id}`),

  createStream: (data: Record<string, unknown>) =>
    request<{ stream: Stream }>('/streams', { method: 'POST', body: JSON.stringify(data) }),

  goLive: (id: string) => request<{ stream: Stream }>(`/streams/${id}/go-live`, { method: 'POST' }),

  endStream: (id: string) => request<{ ok: boolean }>(`/streams/${id}/end`, { method: 'POST' }),

  verifyStreamPassword: (id: string, password: string) =>
    request<{ ok: boolean }>(`/streams/${id}/verify-password`, { method: 'POST', body: JSON.stringify({ password }) }),

  startWatch: (id: string) => request<{ session_id: string; price_per_minute: number }>(`/streams/${id}/watch/start`, { method: 'POST' }),

  billWatch: (id: string) => request<{ ok: boolean; charged: number; points: number; ended?: boolean }>(`/streams/${id}/watch/bill`, { method: 'POST' }),

  getGifts: () => request<{ gifts: Gift[] }>('/gifts'),

  sendGift: (streamId: string, giftId: string, message?: string) =>
    request<{ transaction: unknown; remaining_points: number }>(`/streams/${streamId}/gift`, {
      method: 'POST', body: JSON.stringify({ gift_id: giftId, message }),
    }),

  getChat: (streamId: string) => request<{ messages: ChatMessage[] }>(`/streams/${streamId}/chat`),

  follow: (userId: string) => request<{ ok: boolean }>(`/users/${userId}/follow`, { method: 'POST' }),

  unfollow: (userId: string) => request<{ ok: boolean }>(`/users/${userId}/follow`, { method: 'DELETE' }),

  getFollowingStatus: (userId: string) => request<{ following: boolean }>(`/users/${userId}/following-status`),

  getUserProfile: (username: string) =>
    request<{ user: User; streams: Stream[] }>(`/users/${username}`),

  updateProfile: (data: { display_name?: string; bio?: string; region?: string }) =>
    request<{ user: User }>('/users/me', { method: 'PATCH', body: JSON.stringify(data) }),

  chargePoints: (amount: number) =>
    request<{ points: number }>('/points/charge', { method: 'POST', body: JSON.stringify({ amount }) }),

  getStats: () => request<{ liveCount: number; streamerCount: number; totalViewers: number }>('/stats'),

  getAnalytics: () =>
    request<{ streams: Stream[]; totalTips: number; giftBreakdown: { name: string; icon: string; count: number; total: number }[] }>('/analytics'),

  getNotifications: () => request<{ notifications: Notification[]; unread: number }>('/notifications'),

  markNotificationsRead: () => request<{ ok: boolean }>('/notifications/read-all', { method: 'POST' }),

  requestTwoShot: (streamerId: string) =>
    request<{ session: { id: string; status: string } }>('/two-shot/request', {
      method: 'POST', body: JSON.stringify({ streamer_id: streamerId }),
    }),

  getTwoShotInbox: () => request<{ sessions: unknown[] }>('/two-shot/inbox'),

  getMyTwoShots: () => request<{ sessions: unknown[] }>('/two-shot/my'),

  acceptTwoShot: (id: string) => request<{ ok: boolean }>(`/two-shot/${id}/accept`, { method: 'POST' }),

  rejectTwoShot: (id: string) => request<{ ok: boolean }>(`/two-shot/${id}/reject`, { method: 'POST' }),

  endTwoShot: (id: string) => request<{ ok: boolean }>(`/two-shot/${id}/end`, { method: 'POST' }),

  report: (data: { target_user_id?: string; stream_id?: string; reason: string }) =>
    request<{ ok: boolean }>('/reports', { method: 'POST', body: JSON.stringify(data) }),
};

export function getWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}
