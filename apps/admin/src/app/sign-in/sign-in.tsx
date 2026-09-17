"use client";

import { errorMessage, ValidationError } from "@Stratford-city-motorcars-Ltd/core";
import { useQueryClient } from "@tanstack/react-query";
import type { Route } from "next";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CircleAlert, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, TextInput } from "@/components/ui/form";
import { api, isSampleData } from "@/lib/api";
import { SAMPLE_PASSWORD } from "@/lib/api/mock/fixtures";
import { queryKeys } from "@/lib/query";
import { useSessionQuery } from "@/lib/session";

/** Only same-app paths are followed after sign-in; anything else goes to the overview. */
function safeNext(value: string | null): Route {
  return (value && /^\/[a-z0-9/_-]*$/i.test(value) && !value.startsWith("//") ? value : "/dashboard") as Route;
}

export function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const client = useQueryClient();
  const { data: user } = useSessionQuery();
  const next = safeNext(params.get("next"));

  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Read from the form, not React state: a password manager can fill the
    // inputs without firing the events React listens for.
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    const errors: typeof fieldErrors = {};
    if (!email) errors.email = "Enter your email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "That doesn't look like an email address.";
    if (!password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    setError(null);
    if (errors.email || errors.password) {
      formRef.current?.querySelector<HTMLInputElement>(errors.email ? "input[name=email]" : "input[name=password]")?.focus();
      return;
    }

    setBusy(true);
    try {
      const signedIn = await api.session.signIn({ email, password });
      client.setQueryData(queryKeys.session, signedIn);
      router.replace(next);
    } catch (caught) {
      // The same words for an unknown address and a wrong password.
      setError(caught instanceof ValidationError ? caught.message : errorMessage(caught, "Could not sign you in. Try again."));
      setBusy(false);
    }
  }

  const fill = (email: string) => {
    const form = formRef.current;
    if (!form) return;
    (form.elements.namedItem("email") as HTMLInputElement).value = email;
    (form.elements.namedItem("password") as HTMLInputElement).value = SAMPLE_PASSWORD;
    form.requestSubmit();
  };

  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <section data-surface="dark" className="relative flex flex-col justify-between bg-ink-950 px-6 py-6 text-bone sm:px-10 lg:py-10">
        <Image src="/logo-bone.webp" alt="Stratford City Motorcars" width={900} height={269} sizes="160px" priority className="h-9 w-auto self-start lg:h-11" />
        <div className="hidden max-w-sm lg:block">
          <p className="admin-eyebrow">Dealership admin</p>
          <p className="mt-4 font-display text-[2.5rem] leading-[1.05]">Stock, enquiries and viewings in one place.</p>
          <div aria-hidden className="mt-8 h-px w-16 bg-brass" />
        </div>
        <p className="hidden text-xs text-bone/65 lg:block">21–25 Romford Road, London E15 4LJ</p>
      </section>

      <section className="flex items-start justify-center px-5 py-10 sm:items-center sm:px-10">
        <div className="w-full max-w-sm">
          <p className="admin-eyebrow">Staff sign in</p>
          <h1 className="mt-2 font-display text-3xl">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Accounts are created by the owner. There is no public sign-up.</p>

          {error ? (
            <div role="alert" className="mt-6 flex gap-2.5 border-l-2 border-destructive bg-destructive/6 px-3.5 py-3 text-[0.8125rem] text-ink-800">
              <CircleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              {error}
            </div>
          ) : null}

          <form ref={formRef} noValidate onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email address" error={fieldErrors.email}>
              {(control) => <TextInput {...control} name="email" type="email" autoComplete="username" inputMode="email" autoCapitalize="none" spellCheck={false} />}
            </Field>
            <Field label="Password" error={fieldErrors.password}>
              {(control) => (
                <div className="relative">
                  <TextInput {...control} name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" className="pr-11" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="absolute top-1/2 right-0.5 flex size-10 -translate-y-1/2 items-center justify-center text-ink-500 hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </button>
                </div>
              )}
            </Field>
            <Button type="submit" variant="primary" className="w-full" busy={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
            Forgotten your password? Ask the owner to send you a new invitation from the Team page.
          </p>

          {isSampleData ? (
            <div className="mt-8 border border-brass/50 bg-brass/8 p-4">
              <p className="admin-eyebrow">Sample data</p>
              <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-700">
                This admin is running on invented records. Sign in as either sample account — password{" "}
                <code className="bg-surface-raised px-1 font-mono text-xs">{SAMPLE_PASSWORD}</code>.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button size="sm" onClick={() => fill("owner@example.com")} disabled={busy}>
                  Owner
                </Button>
                <Button size="sm" onClick={() => fill("staff@example.com")} disabled={busy}>
                  Staff
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
