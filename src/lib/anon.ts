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
  return id || 'default_device_id';
}

export async function ensureAnonSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const deviceId = getDeviceId();

  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) {
      return true; // Already has a valid session
    }

    const res = await fetch('/api/create-anon-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId })
    });

    if (!res.ok) {
      console.error('Failed to create anon user:', res.status, await res.text());
      return false;
    }

    const { access_token, refresh_token } = await res.json();
    if (access_token) {
      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token: refresh_token || ''
      });

      if (error) {
        console.error('supabase.auth.setSession error:', error);
        return false;
      }

      return true;
    }
  } catch (err) {
    console.error('ensureAnonSession error:', err);
  }

  return false;
}
