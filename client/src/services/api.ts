// ════════════════════════════════════════════════════════════════════════════
// Story Builder — HTTP client + CSRF integration (SPEC §4.3)
// Authenticated fetch with x-csrf-token double-submit. Non-2xx → AppError.
// ════════════════════════════════════════════════════════════════════════════

import type {
  Ok,
  ErrorBody,
  SignupRequest,
  SendOtpRequest,
  VerifyOtpRequest,
  LoginRequest,
  AuthMeResponse,
  ResetPasswordRequest,
  CharacterInput,
  CharacterListResponse,
  CharacterResponse,
  AvatarUploadResponse,
  DuplicateResponse,
  AssignGroupsRequest,
  AssignGroupsResponse,
  CharacterGroupListResponse,
  CharacterGroupResponse,
  StoryCreateRequest,
  StoryUpdateRequest,
  StoryListResponse,
  StoryDetailResponse,
  StoryResponse,
  RegenerateChapterRequest,
  ContinueRequest,
  PublishResponse,
  UploadResponse,
  NodeCreateRequest,
  NodeUpdateRequest,
  NodeListResponse,
  NodeResponse,
  ChoiceResponse,
  ChoiceCreateRequest,
  ExploreQuery,
  ExploreResponse,
} from '../types/api';
import { AppError } from '../types/domain';
import type { ID } from '../types/domain';
import type { Chapter } from '../types/domain';
import { streamSSE } from './sse';
import type { SSEHandlers } from './sse';

export const CSRF_COOKIE_NAME = 'csrfToken';

/** Read a cookie by name (document.cookie). */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

/** Strip non-ASCII header characters (cookie values are url-encoded, safe). */
function sanitizeHex(value: string): string {
  return value.replace(/[^\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]/g, '');
}

function csrfToken(): string | null {
  const cookie = getCookie(CSRF_COOKIE_NAME);
  return cookie ? sanitizeHex(cookie) : null;
}

export interface HttpOptions {
  signal?: AbortSignal;
  headers?: Record<string, string>;
  /** Skip attaching the CSRF header — used for public GETs / test seams. */
  noCsrf?: boolean;
}

async function parseError(res: Response): Promise<AppError> {
  let body: ErrorBody | null = null;
  try {
    body = (await res.json()) as ErrorBody;
  } catch {
    body = null;
  }
  if (body?.code) {
    return new AppError(body.code, body.message || res.statusText, body.fields);
  }
  const fallback =
    res.status >= 500 ? 'Something went wrong.' : res.statusText || 'Request failed.';
  return new AppError(String(res.status), fallback);
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  opts?: HttpOptions,
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(opts?.headers ?? {}),
  };
  const isMutating =
    method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
  if (!opts?.noCsrf && isMutating) {
    const token = csrfToken();
    if (token) headers['x-csrf-token'] = token;
  }
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, {
    method,
    headers,
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
    signal: opts?.signal,
  });

  if (!res.ok) {
    throw await parseError(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await res.json()) as T;
  }
  return (await res.text()) as unknown as T;
}

function apiUrl(path: string): string {
  return path.startsWith('/api') || path.startsWith('/s/') ? path : `/api${path}`;
}

export const http = {
  get<T>(path: string, opts?: HttpOptions): Promise<T> {
    return request<T>('GET', apiUrl(path), undefined, opts);
  },
  post<T>(path: string, body?: unknown, opts?: HttpOptions): Promise<T> {
    return request<T>('POST', apiUrl(path), body, opts);
  },
  put<T>(path: string, body?: unknown, opts?: HttpOptions): Promise<T> {
    return request<T>('PUT', apiUrl(path), body, opts);
  },
  patch<T>(path: string, body?: unknown, opts?: HttpOptions): Promise<T> {
    return request<T>('PATCH', apiUrl(path), body, opts);
  },
  del<T>(path: string, opts?: HttpOptions): Promise<T> {
    return request<T>('DELETE', apiUrl(path), undefined, opts);
  },
  raw(path: string, opts?: RequestInit): Promise<Response> {
    return fetch(apiUrl(path), { credentials: 'same-origin', ...opts });
  },
};

// ── Domain API wrappers ──────────────────────────────────────────────────────

export const authApi = {
  csrf: (): Promise<{ csrfToken: string }> => http.get('/auth/csrf'),
  signup: (req: SignupRequest): Promise<Ok> => http.post<Ok>('/auth/signup', req),
  sendOtp: (req: SendOtpRequest): Promise<Ok> => http.post<Ok>('/auth/send-otp', req),
  verifyOtp: (req: VerifyOtpRequest): Promise<Ok> => http.post<Ok>('/auth/verify-otp', req),
  login: (req: LoginRequest): Promise<Ok> => http.post<Ok>('/auth/login', req),
  logout: (): Promise<Ok> => http.post<Ok>('/auth/logout'),
  me: (): Promise<AuthMeResponse> => http.get<AuthMeResponse>('/auth/me'),
  resetPassword: (req: ResetPasswordRequest): Promise<Ok> =>
    http.post<Ok>('/auth/reset-password', req),
};

export const charactersApi = {
  list: (): Promise<CharacterListResponse> => http.get<CharacterListResponse>('/characters'),
  create: (input: CharacterInput): Promise<CharacterResponse> =>
    http.post<CharacterResponse>('/characters', input),
  update: (id: ID, input: Partial<CharacterInput>): Promise<CharacterResponse> =>
    http.put<CharacterResponse>(`/characters/${id}`, input),
  remove: (id: ID): Promise<Ok> => http.del<Ok>(`/characters/${id}`),
  duplicate: (id: ID): Promise<DuplicateResponse> =>
    http.post<DuplicateResponse>(`/characters/${id}/duplicate`),
  uploadAvatar: (id: ID, file: File): Promise<AvatarUploadResponse> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', 'avatars');
    return http.post<AvatarUploadResponse>(`/characters/${id}/avatar`, fd, {
      headers: {},
    });
  },
  setGroups: (id: ID, groupIds: ID[]): Promise<AssignGroupsResponse> =>
    http.put<AssignGroupsResponse>(`/characters/${id}/groups`, {
      groupIds,
    } satisfies AssignGroupsRequest),
};

export const characterGroupsApi = {
  list: (): Promise<CharacterGroupListResponse> =>
    http.get<CharacterGroupListResponse>('/characters/groups'),
  create: (name: string): Promise<CharacterGroupResponse> =>
    http.post<CharacterGroupResponse>('/characters/groups', { name }),
  rename: (id: ID, name: string): Promise<CharacterGroupResponse> =>
    http.put<CharacterGroupResponse>(`/characters/groups/${id}`, { name }),
  remove: (id: ID): Promise<Ok> => http.del<Ok>(`/characters/groups/${id}`),
};

export const uploadApi = {
  upload: (file: File, folder: 'avatars' | 'covers'): Promise<UploadResponse> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', folder);
    return http.post<UploadResponse>('/upload', fd, { headers: {} });
  },
};

// Chapter-content autosave (TICKET-58) — PUT /api/stories/:storyId/chapters/:chapterId.
// `baseVersion` is the optimistic-concurrency guard against the chapter.version;
// the server replies 409 CONFLICT when a stale version is sent.
export interface ChapterSavePatch {
  content?: string;
  summary?: string;
  baseVersion?: number;
}
export type ChapterSaveResponse = { chapter: Chapter };

export const storiesApi = {
  list: (): Promise<StoryListResponse> => http.get<StoryListResponse>('/stories'),
  create: (req: StoryCreateRequest): Promise<StoryResponse> =>
    http.post<StoryResponse>('/stories', req),
  get: (id: ID, opts?: { withVersions?: boolean }): Promise<StoryDetailResponse> => {
    const q = opts?.withVersions ? '?withVersions=1' : '';
    return http.get<StoryDetailResponse>(`/stories/${id}${q}`);
  },
  update: (id: ID, patch: StoryUpdateRequest): Promise<StoryResponse> =>
    http.put<StoryResponse>(`/stories/${id}`, patch),
  saveChapter: (
    storyId: ID,
    chapterId: ID,
    patch: ChapterSavePatch,
  ): Promise<ChapterSaveResponse> =>
    http.put<ChapterSaveResponse>(`/stories/${storyId}/chapters/${chapterId}`, patch),
  remove: (id: ID): Promise<Ok> => http.del<Ok>(`/stories/${id}`),
  regenerateChapter: (storyId: ID, req: RegenerateChapterRequest): void => {
    void http.post<unknown>(`/stories/${storyId}/regenerate-chapter`, req);
  },
  continue_: (storyId: ID, req: ContinueRequest): void => {
    void http.post<unknown>(`/stories/${storyId}/continue`, req);
  },
  publish: (id: ID, isPublic: boolean): Promise<PublishResponse> =>
    http.post<PublishResponse>(`/stories/${id}/publish`, { isPublic }),
  generateCover: (
    storyId: ID,
    description: string,
  ): Promise<{ imageUrl: string; altText: string }> =>
    http.post<{ imageUrl: string; altText: string }>('/ai/generate-cover', {
      storyId,
      description,
    }),
  getShare: (token: string): Promise<StoryDetailResponse> =>
    http.get<StoryDetailResponse>(`/s/${token}`),
  exportPdf: async (id: ID): Promise<Blob> => {
    const res = await fetch(`/api/stories/${id}/export/pdf`, {
      credentials: 'same-origin',
    });
    if (!res.ok) throw await parseError(res);
    return res.blob();
  },
  exportEpub: async (id: ID): Promise<Blob> => {
    const res = await fetch(`/api/stories/${id}/export/epub`, {
      credentials: 'same-origin',
    });
    if (!res.ok) throw await parseError(res);
    return res.blob();
  },
};

// Public discovery — GET /api/explore (no auth). Query is URL-encoded; empty
// values are dropped so the server applies its schema defaults.
export const exploreApi = {
  list: (query: ExploreQuery = {}): Promise<ExploreResponse> => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
    }
    const qs = params.toString();
    return http.get<ExploreResponse>(`/explore${qs ? `?${qs}` : ''}`, { noCsrf: true });
  },
};

export const nodesApi = {
  list: (storyId: ID): Promise<NodeListResponse> =>
    http.get<NodeListResponse>(`/stories/${storyId}/nodes`),
  create: (storyId: ID, req: NodeCreateRequest): Promise<NodeResponse> =>
    http.post<NodeResponse>(`/stories/${storyId}/nodes`, req),
  update: (nodeId: ID, req: NodeUpdateRequest): Promise<NodeResponse> =>
    http.put<NodeResponse>(`/nodes/${nodeId}`, req),
  remove: (nodeId: ID, opts?: { cascade?: boolean }): Promise<Ok> => {
    const q = opts?.cascade ? '?cascade=1' : '?cascade=0';
    return http.del<Ok>(`/nodes/${nodeId}${q}`);
  },
  addChoice: (nodeId: ID, req: ChoiceCreateRequest): Promise<ChoiceResponse> =>
    http.post<ChoiceResponse>(`/nodes/${nodeId}/choices`, req),
  removeChoice: (nodeId: ID, choiceId: ID): Promise<Ok> =>
    http.del<Ok>(`/nodes/${nodeId}/choices/${choiceId}`),
  generateNode: (
    storyId: ID,
    parentNodeId: ID | null,
    handlers: SSEHandlers,
    signal: AbortSignal,
  ): Promise<void> =>
    streamSSE(
      '/api/ai/generate-node',
      { storyId, ...(parentNodeId ? { parentNodeId } : {}) },
      handlers,
      signal,
    ),
};

export { apiUrl };
