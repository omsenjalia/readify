"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LoaderCircle } from "lucide-react";
import Brand from "@/components/Brand";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/library");
    router.refresh();
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-4 py-12">
      <div className="grid-backdrop pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px]"
        style={{ background: "var(--glow-radial)" }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 flex justify-center" aria-label="Back to home">
          <Brand size="lg" />
        </Link>

        <div className="card p-7 sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Your library is right where you left it.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-subtle"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-subtle"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p
                className="rounded-xl px-3.5 py-2.5 text-sm font-medium"
                style={{
                  background: "var(--color-danger-soft)",
                  color: "var(--color-danger)",
                }}
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg mt-2 w-full disabled:opacity-60"
            >
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-accent transition hover:underline"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
