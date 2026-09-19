"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LoaderCircle, MailCheck } from "lucide-react";
import Brand from "@/components/Brand";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-4 py-12">
        <div className="grid-backdrop pointer-events-none absolute inset-0" aria-hidden="true" />
        <div className="relative w-full max-w-md">
          <Link href="/" className="mb-8 flex justify-center" aria-label="Back to home">
            <Brand size="lg" />
          </Link>
          <div className="card p-7 text-center sm:p-8">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              <MailCheck className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
              Check your email
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              We sent a confirmation link to{" "}
              <span className="font-semibold text-ink">{email}</span>. Click it
              to activate your account, then sign in.
            </p>
            <Link href="/login" className="btn btn-primary btn-lg mt-6 w-full">
              Go to sign in
            </Link>
          </div>
        </div>
      </div>
    );
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
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Start speed-reading in under a minute.
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
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-subtle"
              >
                Confirm password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? "Creating account…" : "Sign up"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold text-accent transition hover:underline"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
