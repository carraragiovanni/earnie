const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:4000';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token: string | null) {
  if (!token) localStorage.removeItem('token');
  else localStorage.setItem('token', token);
}

type ErrorResponseBody = { error?: string };

function isErrorResponseBody(x: unknown): x is ErrorResponseBody {
  return typeof x === 'object' && x !== null;
}

export async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      ...(opts?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      // ignore
    }
    const apiError = isErrorResponseBody(body) ? (body as ErrorResponseBody).error : undefined;
    const err = new Error(apiError ?? `http_${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }

  return (await res.json()) as T;
}

export type Inbox = {
  id: string;
  name: string;
  aiEnabled: boolean;
  phoneNumbers: { id: string; e164: string }[];
  twilioConfig: { id: string; name: string };
};

export type Conversation = {
  id: string;
  inboxId: string;
  contactId: string;
  aiEnabled: boolean;
  lastMessageAt: string;
  contact: {
    id: string;
    name: string | null;
    primaryPhone: string;
    fieldValues?: Array<{
      id: string;
      fieldDef: { id: string; key: string; label: string; type: 'TEXT' | 'NUMBER' | 'DATE' };
      valueText?: string | null;
      valueNumber?: number | null;
      valueDate?: string | null;
    }>;
  };
  messages: Array<{ id: string; body: string; direction: 'INBOUND' | 'OUTBOUND'; createdAt: string }>;
};

export type Message = {
  id: string;
  conversationId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  from: string;
  to: string;
  body: string;
  mediaJson?: string | null;
  status?: string | null;
  createdAt: string;
};
