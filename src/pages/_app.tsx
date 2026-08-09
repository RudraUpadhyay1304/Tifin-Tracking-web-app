import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { ensureAnonSession } from '@/lib/anon';

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    ensureAnonSession();
  }, []);

  return <Component {...pageProps} />;
}
