import { supabase } from './supabaseClient';

export function getDeviceId(): string {
  const KEY = 'device_id';
  let id = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
  if (!id) {
    id = crypto.randomUUID();
    if (typeof window !== 'undefined') {
      localStorage.setItem(KEY, id);
    }
  }
  return id;
}

export async function ensureAnonSession() {
  const deviceId = getDeviceId();
  const sessionRes = typeof (supabase.auth as any).session === 'function'
    ? (supabase.auth as any).session()
    : (await supabase.auth.getSession())?.data?.session;

  if (sessionRes?.user?.id) return; // already have a token

  const res = await fetch('/api/create-anon-user', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId })
  });
  const { access_token } = await res.json();
  if (access_token) {
    await supabase.auth.setSession({ access_token, refresh_token: '' });
  }
}
