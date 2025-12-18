import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, type Conversation, type Inbox, type Message } from '../api';
import { getSocket } from '../socket';

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function Bubble({ msg }: { msg: Message }) {
  const mine = msg.direction === 'OUTBOUND';
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={
          mine
            ? 'max-w-[78%] rounded-2xl bg-bubbleBlue px-3 py-2 text-sm text-white'
            : 'max-w-[78%] rounded-2xl bg-neutral-200 px-3 py-2 text-sm text-neutral-900'
        }
      >
        <div className="whitespace-pre-wrap break-words">{msg.body}</div>
        <div className={`mt-1 text-[10px] ${mine ? 'text-white/80' : 'text-neutral-600'}`}>
          {formatTime(msg.createdAt)}{mine && msg.status ? ` · ${msg.status}` : ''}
        </div>
      </div>
    </div>
  );
}

export default function InboxPage() {
  const qc = useQueryClient();
  const inboxes = useQuery({
    queryKey: ['inboxes'],
    queryFn: () => apiFetch<{ inboxes: Inbox[] }>('/api/inboxes')
  });

  const [activeInboxId, setActiveInboxId] = React.useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null);
  const [composer, setComposer] = React.useState('');
  const [draft, setDraft] = React.useState<string>('');

  React.useEffect(() => {
    const first = inboxes.data?.inboxes?.[0]?.id ?? null;
    if (!activeInboxId && first) setActiveInboxId(first);
  }, [activeInboxId, inboxes.data]);

  const conversations = useQuery({
    queryKey: ['conversations', activeInboxId],
    queryFn: () => apiFetch<{ conversations: Conversation[] }>(`/api/conversations/inbox/${activeInboxId}`),
    enabled: !!activeInboxId
  });

  const messages = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: () => apiFetch<{ messages: Message[] }>(`/api/conversations/${activeConversationId}/messages`),
    enabled: !!activeConversationId
  });

  React.useEffect(() => {
    const socket = getSocket();

    socket.on('message:new', (msg: Message) => {
      qc.setQueryData<{ messages: Message[] }>(['messages', msg.conversationId], (prev) => {
        if (!prev) return prev;
        return { messages: [...prev.messages, msg] };
      });

      qc.invalidateQueries({ queryKey: ['conversations'] });
    });

    socket.on('message:updated', (msg: Message) => {
      qc.setQueryData<{ messages: Message[] }>(['messages', msg.conversationId], (prev) => {
        if (!prev) return prev;
        return { messages: prev.messages.map((m) => (m.id === msg.id ? msg : m)) };
      });
    });

    return () => {
      socket.off('message:new');
      socket.off('message:updated');
    };
  }, [qc]);

  React.useEffect(() => {
    const socket = getSocket();
    if (activeConversationId) socket.emit('join:conversation', activeConversationId);
    return () => {
      if (activeConversationId) socket.emit('leave:conversation', activeConversationId);
    };
  }, [activeConversationId]);

  React.useEffect(() => {
    const first = conversations.data?.conversations?.[0]?.id ?? null;
    if (!activeConversationId && first) setActiveConversationId(first);
  }, [activeConversationId, conversations.data]);

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeConversationId) throw new Error('no_conversation');
      return apiFetch<{ message: Message }>(`/api/conversations/${activeConversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: composer })
      });
    },
    onSuccess: () => {
      setComposer('');
      setDraft('');
      qc.invalidateQueries({ queryKey: ['messages', activeConversationId] });
      qc.invalidateQueries({ queryKey: ['conversations', activeInboxId] });
    }
  });

  const draftMutation = useMutation({
    mutationFn: async () => {
      if (!activeConversationId) throw new Error('no_conversation');
      const res = await apiFetch<{ draft: string }>(`/api/ai/conversations/${activeConversationId}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      return res.draft;
    },
    onSuccess: (d) => {
      setDraft(d);
      setComposer(d);
    }
  });

  const activeInbox = inboxes.data?.inboxes?.find((i) => i.id === activeInboxId) ?? null;
  const activeConversation = conversations.data?.conversations?.find((c) => c.id === activeConversationId) ?? null;

  if (inboxes.isLoading) return <div className="p-6 text-neutral-600">Loading…</div>;

  if (inboxes.data?.inboxes?.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-2xl border bg-white p-6">
          <div className="text-lg font-semibold">No inboxes yet</div>
          <div className="mt-2 text-sm text-neutral-600">
            Create a Twilio config + inbox in Settings, then attach at least one phone number.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-12 gap-4 px-4 py-4">
      <aside className="col-span-3 rounded-2xl border bg-white">
        <div className="border-b p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-neutral-600">Inbox</div>
            <button
              className="rounded-md border px-2 py-1 text-xs hover:bg-neutral-50 disabled:opacity-50"
              disabled={!activeInboxId}
              onClick={async () => {
                if (!activeInboxId) return;
                const toPhone = window.prompt('Start a new conversation. Enter phone number (E.164):');
                if (!toPhone) return;
                const res = await apiFetch<{ conversation: Conversation }>(`/api/conversations/inbox/${activeInboxId}/start`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ toPhone })
                });
                await qc.invalidateQueries({ queryKey: ['conversations', activeInboxId] });
                setActiveConversationId(res.conversation.id);
              }}
              title="Start a new conversation"
            >
              New
            </button>
          </div>
          <select
            className="mt-2 w-full rounded-lg border px-2 py-2 text-sm"
            value={activeInboxId ?? ''}
            onChange={(e) => {
              setActiveInboxId(e.target.value);
              setActiveConversationId(null);
            }}
          >
            {inboxes.data?.inboxes?.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
          <div className="mt-2 text-xs text-neutral-500">
            {activeInbox?.phoneNumbers?.length ? (
              <div>
                Numbers: {activeInbox.phoneNumbers.map((n) => n.e164).join(', ')}
              </div>
            ) : (
              <div className="text-red-600">No numbers assigned (can’t send/receive).</div>
            )}
          </div>
        </div>

        <div className="max-h-[calc(100vh-180px)] overflow-auto">
          {conversations.isLoading ? (
            <div className="p-3 text-sm text-neutral-600">Loading conversations…</div>
          ) : conversations.data?.conversations?.length ? (
            conversations.data.conversations.map((c) => {
              const selected = c.id === activeConversationId;
              const title = c.contact.name ?? c.contact.primaryPhone;
              const last = c.messages?.[0]?.body ?? '';
              return (
                <button
                  key={c.id}
                  className={
                    selected
                      ? 'w-full border-b bg-neutral-50 p-3 text-left'
                      : 'w-full border-b p-3 text-left hover:bg-neutral-50'
                  }
                  onClick={() => {
                    setActiveConversationId(c.id);
                    setDraft('');
                    setComposer('');
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="truncate text-sm font-medium">{title}</div>
                    <div className="ml-2 shrink-0 text-[10px] text-neutral-500">{formatTime(c.lastMessageAt)}</div>
                  </div>
                  <div className="mt-1 truncate text-xs text-neutral-600">{last}</div>
                </button>
              );
            })
          ) : (
            <div className="p-3 text-sm text-neutral-600">No conversations yet.</div>
          )}
        </div>
      </aside>

      <main className="col-span-9 flex h-[calc(100vh-110px)] flex-col rounded-2xl border bg-white">
        <div className="border-b p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">
                {activeConversation ? activeConversation.contact.name ?? activeConversation.contact.primaryPhone : 'Select a conversation'}
              </div>
              {activeConversation ? (
                <div className="mt-1 text-xs text-neutral-500">
                  {activeConversation.contact.primaryPhone}
                  {activeConversation.contact.fieldValues?.length ? (
                    <span className="ml-2 text-neutral-400">
                      ·{' '}
                      {activeConversation.contact.fieldValues
                        .slice(0, 3)
                        .map((fv) => {
                          const v =
                            fv.valueText ??
                            (fv.valueNumber !== null && fv.valueNumber !== undefined ? String(fv.valueNumber) : null) ??
                            (fv.valueDate ? new Date(fv.valueDate).toLocaleDateString() : null) ??
                            '';
                          return `${fv.fieldDef.label}: ${v}`;
                        })
                        .join(' · ')}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {activeConversation ? (
              <label className="flex items-center gap-2 text-xs text-neutral-600">
                <input
                  type="checkbox"
                  checked={activeConversation.aiEnabled}
                  onChange={async (e) => {
                    await apiFetch<{ conversation: Conversation }>(`/api/conversations/${activeConversation.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ aiEnabled: e.target.checked })
                    });
                    await qc.invalidateQueries({ queryKey: ['conversations', activeInboxId] });
                  }}
                />
                AI drafts
              </label>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {messages.isLoading ? (
            <div className="text-sm text-neutral-600">Loading messages…</div>
          ) : messages.data?.messages?.length ? (
            <div className="space-y-2">
              {messages.data.messages.map((m) => (
                <Bubble key={m.id} msg={m} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-neutral-600">No messages yet.</div>
          )}
        </div>

        <div className="border-t p-3">
          <div className="flex items-end gap-2">
            <textarea
              className="h-12 flex-1 resize-none rounded-xl border px-3 py-2 text-sm"
              value={composer}
              onChange={(e) => setComposer(e.target.value)}
              placeholder="Message"
            />
            <button
              className="rounded-xl border px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
              disabled={!activeConversationId || draftMutation.isPending}
              onClick={() => draftMutation.mutate()}
              title="Generate AI draft (if enabled)"
            >
              {draftMutation.isPending ? 'Draft…' : 'AI draft'}
            </button>
            <button
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              disabled={!activeConversationId || composer.trim().length === 0 || sendMutation.isPending}
              onClick={() => sendMutation.mutate()}
            >
              Send
            </button>
          </div>
          {sendMutation.isError ? (
            <div className="mt-2 text-xs text-red-600">{(sendMutation.error as Error).message}</div>
          ) : null}
          {draft && !draftMutation.isPending ? (
            <div className="mt-2 text-xs text-neutral-500">AI draft loaded into composer.</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
