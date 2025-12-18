import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api';

type ContactFieldType = 'TEXT' | 'NUMBER' | 'DATE';

type FieldDef = {
  id: string;
  key: string;
  label: string;
  type: ContactFieldType;
};

type Contact = {
  id: string;
  name: string | null;
  primaryPhone: string;
  fieldValues: Array<{ id: string; fieldDef: FieldDef; valueText?: string | null; valueNumber?: number | null; valueDate?: string | null }>;
};

export default function ContactsPage() {
  const qc = useQueryClient();
  const [q, setQ] = React.useState('');

  const fields = useQuery({
    queryKey: ['contact-fields'],
    queryFn: () => apiFetch<{ fields: FieldDef[] }>('/api/contact-fields')
  });

  const contacts = useQuery({
    queryKey: ['contacts', q],
    queryFn: () => apiFetch<{ contacts: Contact[] }>(`/api/contacts${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  });

  const [newKey, setNewKey] = React.useState('');
  const [newLabel, setNewLabel] = React.useState('');
  const [newType, setNewType] = React.useState<ContactFieldType>('TEXT');

  const createField = useMutation({
    mutationFn: () =>
      apiFetch<{ field: FieldDef }>('/api/contact-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: newKey, label: newLabel, type: newType })
      }),
    onSuccess: () => {
      setNewKey('');
      setNewLabel('');
      setNewType('TEXT');
      qc.invalidateQueries({ queryKey: ['contact-fields'] });
    }
  });

  const [cName, setCName] = React.useState('');
  const [cPhone, setCPhone] = React.useState('');
  const [fieldInput, setFieldInput] = React.useState<Record<string, string>>({});

  const createContact = useMutation({
    mutationFn: () =>
      apiFetch<{ contact: Contact }>('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cName.trim() ? cName.trim() : undefined,
          primaryPhone: cPhone.trim(),
          fieldValues: (fields.data?.fields ?? [])
            .map((f) => {
              const raw = (fieldInput[f.key] ?? '').trim();
              if (!raw) return null;
              if (f.type === 'TEXT') return { fieldKey: f.key, valueText: raw };
              if (f.type === 'NUMBER') {
                const n = Number(raw);
                if (Number.isNaN(n)) return null;
                return { fieldKey: f.key, valueNumber: n };
              }
              // DATE: accept yyyy-mm-dd from <input type="date">
              const d = new Date(`${raw}T00:00:00.000Z`);
              if (Number.isNaN(d.getTime())) return null;
              return { fieldKey: f.key, valueDate: d.toISOString() };
            })
            .filter(Boolean)
        })
      }),
    onSuccess: () => {
      setCName('');
      setCPhone('');
      setFieldInput({});
      qc.invalidateQueries({ queryKey: ['contacts'] });
    }
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 lg:col-span-1">
          <div className="text-sm font-semibold">Custom fields</div>
          <div className="mt-1 text-sm text-neutral-600">Define reusable contact fields (text, number, date).</div>

          <div className="mt-4 space-y-3">
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Key (e.g. company, age)</div>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Label</div>
              <input className="w-full rounded-lg border px-3 py-2 text-sm" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
            </label>
            <label className="block">
              <div className="mb-1 text-xs font-medium text-neutral-600">Type</div>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" value={newType} onChange={(e) => setNewType(e.target.value as ContactFieldType)}>
                <option value="TEXT">Text</option>
                <option value="NUMBER">Number</option>
                <option value="DATE">Date</option>
              </select>
            </label>

            {createField.isError ? <div className="text-xs text-red-600">{(createField.error as Error).message}</div> : null}

            <button
              className="rounded-lg border px-4 py-2 text-sm hover:bg-neutral-50 disabled:opacity-50"
              disabled={createField.isPending || !newKey || !newLabel}
              onClick={() => createField.mutate()}
            >
              {createField.isPending ? 'Creating…' : 'Add field'}
            </button>
          </div>

          <div className="mt-6">
            <div className="text-xs font-semibold text-neutral-600">Existing fields</div>
            <div className="mt-2 space-y-2">
              {fields.data?.fields?.length ? (
                fields.data.fields.map((f) => (
                  <div key={f.id} className="rounded-lg border px-3 py-2 text-sm">
                    <div className="font-medium">{f.label}</div>
                    <div className="mt-0.5 font-mono text-xs text-neutral-500">
                      {f.key} · {f.type}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-neutral-500">No custom fields yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Contacts</div>
              <div className="mt-1 text-sm text-neutral-600">Search by name or phone. (Field-based filtering is supported at the DB layer and can be added to UI.)</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="rounded-xl border p-3">
              <div className="text-xs font-semibold text-neutral-600">Create contact</div>
              <div className="mt-2 space-y-2">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Name (optional)"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                />
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Phone (E.164)"
                  value={cPhone}
                  onChange={(e) => setCPhone(e.target.value)}
                />

                {fields.data?.fields?.length ? (
                  <div className="mt-2 space-y-2 rounded-lg border bg-neutral-50 p-2">
                    <div className="text-[11px] font-semibold text-neutral-600">Custom fields</div>
                    {fields.data.fields.map((f) => (
                      <label key={f.id} className="block">
                        <div className="mb-1 text-[11px] font-medium text-neutral-600">{f.label}</div>
                        <input
                          className="w-full rounded-lg border px-3 py-2 text-sm"
                          value={fieldInput[f.key] ?? ''}
                          onChange={(e) => setFieldInput((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.type === 'DATE' ? 'YYYY-MM-DD' : f.type === 'NUMBER' ? '123' : 'Text'}
                          type={f.type === 'DATE' ? 'date' : 'text'}
                        />
                      </label>
                    ))}
                  </div>
                ) : null}

                {createContact.isError ? <div className="text-xs text-red-600">{(createContact.error as Error).message}</div> : null}

                <button
                  className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
                  disabled={createContact.isPending || !cPhone.trim()}
                  onClick={() => createContact.mutate()}
                >
                  {createContact.isPending ? 'Saving…' : 'Create'}
                </button>
              </div>
            </div>

            <div className="rounded-xl border p-3">
              <div className="text-xs font-semibold text-neutral-600">Search</div>
              <div className="mt-2">
                <input
                  className="w-full rounded-lg border px-3 py-2 text-sm"
                  placeholder="Search contacts…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-4">
            {contacts.isLoading ? (
              <div className="text-sm text-neutral-600">Loading contacts…</div>
            ) : contacts.data?.contacts?.length ? (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {contacts.data.contacts.map((c) => (
                  <div key={c.id} className="rounded-xl border p-3">
                    <div className="text-sm font-semibold">{c.name ?? c.primaryPhone}</div>
                    <div className="mt-1 text-xs text-neutral-600">{c.primaryPhone}</div>
                    {c.fieldValues?.length ? (
                      <div className="mt-2 space-y-1">
                        {c.fieldValues.map((fv) => (
                          <div key={fv.id} className="text-xs text-neutral-700">
                            <span className="font-medium">{fv.fieldDef.label}:</span>{' '}
                            <span className="font-mono">
                              {fv.valueText ?? fv.valueNumber ?? (fv.valueDate ? new Date(fv.valueDate).toLocaleDateString() : '')}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-neutral-500">No custom fields set.</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">No contacts found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
