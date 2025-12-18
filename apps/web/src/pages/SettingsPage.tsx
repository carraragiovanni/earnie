import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch, type Inbox } from '../api';

type TwilioConfig = { id: string; name: string; createdAt: string };

export default function SettingsPage() {
  const qc = useQueryClient();
  const configs = useQuery({
    queryKey: ['twilio-configs'],
    queryFn: () => apiFetch<{ configs: TwilioConfig[] }>('/api/twilio-configs')
  });

  const inboxes = useQuery({
    queryKey: ['inboxes'],
    queryFn: () => apiFetch<{ inboxes: Inbox[] }>('/api/inboxes')
  });

  const [cfgName, setCfgName] = React.useState('');
  const [accountSid, setAccountSid] = React.useState('');
  const [authToken, setAuthToken] = React.useState('');
  const [messagingServiceSid, setMessagingServiceSid] = React.useState('');

  const createCfg = useMutation({
    mutationFn: () =>
      apiFetch<{ config: TwilioConfig }>('/api/twilio-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cfgName,
          accountSid,
          authToken,
          messagingServiceSid: messagingServiceSid.trim() ? messagingServiceSid.trim() : undefined
        })
      }),
    onSuccess: () => {
      setCfgName('');
      setAccountSid('');
      setAuthToken('');
      setMessagingServiceSid('');
      qc.invalidateQueries({ queryKey: ['twilio-configs'] });
    }
  });

  const [inboxName, setInboxName] = React.useState('');
  const [inboxCfgId, setInboxCfgId] = React.useState<string>('');
  const [inboxAi, setInboxAi] = React.useState(false);

  React.useEffect(() => {
    const first = configs.data?.configs?.[0]?.id;
    if (!inboxCfgId && first) setInboxCfgId(first);
  }, [configs.data, inboxCfgId]);

  const createInbox = useMutation({
    mutationFn: () =>
      apiFetch<{ inbox: Inbox }>('/api/inboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: inboxName, twilioConfigId: inboxCfgId, aiEnabled: inboxAi })
      }),
    onSuccess: () => {
      setInboxName('');
      setInboxAi(false);
      qc.invalidateQueries({ queryKey: ['inboxes'] });
    }
  });

  const [phoneInboxId, setPhoneInboxId] = React.useState<string>('');
  const [phoneE164, setPhoneE164] = React.useState('');

  React.useEffect(() => {
    const first = inboxes.data?.inboxes?.[0]?.id;
    if (!phoneInboxId && first) setPhoneInboxId(first);
  }, [inboxes.data, phoneInboxId]);

  const addNumber = useMutation({
    mutationFn: () =>
      apiFetch<{ phoneNumber: { id: string; e164: string } }>(`/api/inboxes/${phoneInboxId}/phone-numbers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ e164: phoneE164 })
      }),
    onSuccess: () => {
      setPhoneE164('');
      qc.invalidateQueries({ queryKey: ['inboxes'] });
    }
  });

  const webhookBase = (import.meta.env.VITE_API_BASE ?? 'http://localhost:4000') + '/twilio';

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm font-semibold">Twilio credentials</div>
          <div className="mt-1 text-sm text-neutral-600">
            Stored encrypted at rest; used only for sending and webhook signature validation.
          </div>

          <div className="mt-4 space-y-3">
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Name</div>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={cfgName} onChange={(e) => setCfgName(e.target.value)} />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Account SID</div>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={accountSid} onChange={(e) => setAccountSid(e.target.value)} />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Auth Token</div>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={authToken} onChange={(e) => setAuthToken(e.target.value)} type="password" />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Messaging Service SID (optional)</div>
              <input
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={messagingServiceSid}
                onChange={(e) => setMessagingServiceSid(e.target.value)}
              />
            </label>

            {createCfg.isError ? <div className="text-xs text-red-600">{(createCfg.error as Error).message}</div> : null}

            <button
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              disabled={createCfg.isPending || !cfgName || !accountSid || !authToken}
              onClick={() => createCfg.mutate()}
            >
              {createCfg.isPending ? 'Saving…' : 'Save Twilio config'}
            </button>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-neutral-600">Saved configs</div>
            <div className="mt-2 space-y-2">
              {configs.data?.configs?.length ? (
                configs.data.configs.map((c) => (
                  <div key={c.id} className="rounded-lg border px-3 py-2 text-sm">
                    {c.name}
                  </div>
                ))
              ) : (
                <div className="text-sm text-neutral-500">No configs yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <div className="text-sm font-semibold">Inboxes</div>
          <div className="mt-1 text-sm text-neutral-600">
            An inbox groups one or more phone numbers and maps them to a Twilio config.
          </div>

          <div className="mt-4 space-y-3">
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Inbox name</div>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={inboxName} onChange={(e) => setInboxName(e.target.value)} />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Twilio config</div>
              <select
                className="w-full rounded-lg border px-3 py-2 text-sm"
                value={inboxCfgId}
                onChange={(e) => setInboxCfgId(e.target.value)}
              >
                <option value="" disabled>
                  Select…
                </option>
                {configs.data?.configs?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={inboxAi} onChange={(e) => setInboxAi(e.target.checked)} />
              Enable AI drafts by default
            </label>

            {createInbox.isError ? <div className="text-xs text-red-600">{(createInbox.error as Error).message}</div> : null}

            <button
              className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              disabled={createInbox.isPending || !inboxName || !inboxCfgId}
              onClick={() => createInbox.mutate()}
            >
              {createInbox.isPending ? 'Creating…' : 'Create inbox'}
            </button>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-neutral-600">Attach phone number to inbox</div>
            <div className="mt-2 space-y-3">
              <label className="block">
                <div className="mb-1 text-xs font-medium text-neutral-600">Inbox</div>
                <select
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={phoneInboxId}
                  onChange={(e) => setPhoneInboxId(e.target.value)}
                >
                  <option value="" disabled>
                    Select…
                  </option>
                  {inboxes.data?.inboxes?.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <div className="mb-1 text-xs font-medium text-neutral-600">Phone number (E.164)</div>
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  value={phoneE164}
                  onChange={(e) => setPhoneE164(e.target.value)}
                  placeholder="+14155552671"
                />
              </label>

              {addNumber.isError ? <div className="text-xs text-red-600">{(addNumber.error as Error).message}</div> : null}

              <button
                className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
                disabled={addNumber.isPending || !phoneInboxId || !phoneE164}
                onClick={() => addNumber.mutate()}
              >
                {addNumber.isPending ? 'Adding…' : 'Add number'}
              </button>
            </div>

            <div className="mt-6 rounded-xl border bg-neutral-50 p-3 text-sm">
              <div className="font-medium">Twilio Webhooks</div>
              <div className="mt-2 text-xs text-neutral-600">
                Configure your Twilio number(s) to send inbound messages here:
              </div>
              <div className="mt-2 font-mono text-xs">
                {webhookBase}/inbound
              </div>
              <div className="mt-3 text-xs text-neutral-600">
                (Optional) Status callback:
              </div>
              <div className="mt-1 font-mono text-xs">
                {webhookBase}/status
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border bg-white p-5">
        <div className="text-sm font-semibold">Security notes</div>
        <ul className="mt-2 list-disc pl-5 text-sm text-neutral-600">
          <li>Twilio credentials are encrypted at rest using an app-level encryption key.</li>
          <li>All API routes are access-controlled via JWT auth.</li>
          <li>Twilio webhooks can be signature-validated (recommended for production).</li>
        </ul>
      </div>
    </div>
  );
}
