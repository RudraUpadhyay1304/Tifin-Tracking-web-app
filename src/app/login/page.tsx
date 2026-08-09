import { redirect } from "next/navigation";
import Image from "next/image";
import { dict } from "@/lib/i18n";
import { getServerUser, getSupabaseAnonKeyConfigured } from "@/lib/server/supabase";
import { serverLang } from "@/lib/server/lang";
import { AnonLoginRedirect } from "@/components/AnonLoginRedirect";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const user = await getServerUser();
  if (user) redirect("/dashboard");

  const { error } = await searchParams;
  const lang = await serverLang();
  const t = dict[lang];
  const configured = getSupabaseAnonKeyConfigured();

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center px-4">
      <Image
        src="/icon-192.png"
        alt=""
        width={96}
        height={96}
        className="mb-5 h-24 w-24 rounded-3xl shadow-lg shadow-orange-500/20"
      />

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.appName}</h1>
      <p className="mt-1 mb-8 text-sm text-slate-500 dark:text-slate-400">{t.signInSubtitle}</p>

      {!configured ? (
        <div className="w-full max-w-sm rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-200">
          {t.authSetup}
        </div>
      ) : (
        <AnonLoginRedirect />
      )}
    </div>
  );
}