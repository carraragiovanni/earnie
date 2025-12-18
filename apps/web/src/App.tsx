import React from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { apiFetch, setToken } from './api';
import LoginPage from './pages/LoginPage';
import InboxPage from './pages/InboxPage';
import SettingsPage from './pages/SettingsPage';
import ContactsPage from './pages/ContactsPage';
import { resetSocket } from './socket';

function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => apiFetch<{ id: string; email: string }>('/api/auth/me'),
    retry: false
  });
}

function Shell({ children }: { children: React.ReactNode }) {
  const nav = useNavigate();
  const me = useMe();

  if (me.isLoading) {
    return <div className="p-6 text-neutral-600">Loading…</div>;
  }

  if (me.isError) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="text-sm font-semibold">Twilio Inbox</div>
            <nav className="flex items-center gap-3 text-sm text-neutral-600">
              <Link className="hover:text-neutral-900" to="/">Messages</Link>
              <Link className="hover:text-neutral-900" to="/contacts">Contacts</Link>
              <Link className="hover:text-neutral-900" to="/settings">Settings</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-neutral-500">{me.data!.email}</div>
            <button
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-neutral-50"
              onClick={() => {
                setToken(null);
                resetSocket();
                nav('/login');
              }}
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Shell>
            <InboxPage />
          </Shell>
        }
      />
      <Route
        path="/settings"
        element={
          <Shell>
            <SettingsPage />
          </Shell>
        }
      />
      <Route
        path="/contacts"
        element={
          <Shell>
            <ContactsPage />
          </Shell>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
