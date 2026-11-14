import {
  useState,
  type FormEvent,
} from "react";

import {
  CloudRain,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";

import {
  useAuth,
} from "../auth/useAuth";

function LoginPage() {
  const {
    configurationError,
    signIn,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    configurationError,
  );

  const submit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const nextError = await signIn(
        email.trim(),
        password,
      );

      setError(nextError);
    } catch {
      setError(
        "Unable to reach the authentication service.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#020915] px-4 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(0,124,247,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(0,217,255,0.12),transparent_34%)]" />

      <section className="glass-panel relative w-full max-w-md rounded-[32px] border border-[#007cf7]/20 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.45)] sm:p-8">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#007cf7]/15 text-[#67b5ff]">
            <CloudRain size={29} />
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#4da3ff]">
              Secure operations portal
            </p>
            <h1 className="mt-1 text-2xl font-semibold">
              FloodTwin AI
            </h1>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center gap-2 text-emerald-300">
            <ShieldCheck size={18} />
            <span className="text-xs uppercase tracking-[0.16em]">
              Authorized personnel only
            </span>
          </div>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Sign in
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Use the operator account issued by your FloodTwin administrator.
          </p>
        </div>

        <form className="mt-7 space-y-4" onSubmit={submit}>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Email address
            </span>
            <span className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#071a33]/80 px-4 py-3.5 focus-within:border-[#007cf7]/50">
              <Mail size={17} className="text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                placeholder="operator@example.com"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              />
            </span>
          </label>

          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
              Password
            </span>
            <span className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#071a33]/80 px-4 py-3.5 focus-within:border-[#007cf7]/50">
              <LockKeyhole size={17} className="text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
                minLength={6}
                placeholder="Enter your password"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-600"
              />
            </span>
          </label>

          {error && (
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || Boolean(configurationError)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#007cf7] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#168bff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <LoaderCircle size={17} className="animate-spin" />
                Authenticating...
              </>
            ) : (
              "Enter Command Center"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.14em] text-slate-600">
          Session protected by Supabase Auth
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
