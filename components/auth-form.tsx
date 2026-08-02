"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { api } from "@/lib/client";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Card } from "@/components/ui/surface";

type Mode = "signin" | "signup";

const COPY = {
  signin: {
    heading: "Sign in",
    sub: "Get back to your arsenal.",
    cta: "Sign in",
    switchText: "New here?",
    switchLabel: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    heading: "Create your account",
    sub: "Start mapping your game.",
    cta: "Create account",
    switchText: "Already have an account?",
    switchLabel: "Sign in",
    switchHref: "/signin",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const copy = COPY[mode];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      if (mode === "signup") {
        await api("/api/register", {
          method: "POST",
          json: { name: name.trim(), email: email.trim(), password },
        });
      }

      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("That email and password combination did not work.");
        setPending(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong. Try again.",
      );
      setPending(false);
    }
  };

  return (
    <Card className="w-full max-w-sm p-6 sm:p-7">
      <h1 className="font-display text-xl tracking-wide text-[var(--fg)]">
        {copy.heading}
      </h1>
      <p className="mt-1 text-sm text-[var(--fg-muted)]">{copy.sub}</p>

      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {mode === "signup" && (
          <Field label="Name" required>
            {({ id }) => (
              <Input
                id={id}
                name="name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                required
              />
            )}
          </Field>
        )}

        <Field label="Email" required>
          {({ id }) => (
            <Input
              id={id}
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
        </Field>

        <Field
          label="Password"
          required
          hint={
            mode === "signup"
              ? "At least 10 characters, with a letter and a number."
              : undefined
          }
        >
          {({ id }) => (
            <Input
              id={id}
              name="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          )}
        </Field>

        {error && (
          <p role="alert" className="text-sm text-[var(--danger)]">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" loading={pending}>
          {copy.cta}
        </Button>
      </form>

      <p className="mt-5 text-center text-xs text-[var(--fg-muted)]">
        {copy.switchText}{" "}
        <Link
          href={copy.switchHref}
          className="text-[var(--accent)] transition-colors hover:underline"
        >
          {copy.switchLabel}
        </Link>
      </p>
    </Card>
  );
}
