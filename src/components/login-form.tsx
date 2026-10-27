"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function LoginForm({
  locale,
  labels,
}: {
  locale: string;
  labels: {
    email: string;
    password: string;
    submit: string;
    pending: string;
    invalid: string;
  };
}) {
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(false);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const result = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });
    if (!result || result.error) {
      setPending(false);
      setError(true);
      return;
    }
    window.location.assign(`/${locale}`);
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-1 text-sm font-medium">
        {labels.email}
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          className="h-11 rounded-md border border-line bg-card px-3 text-base font-normal"
        />
      </label>
      <label className="grid gap-1 text-sm font-medium">
        {labels.password}
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="h-11 rounded-md border border-line bg-card px-3 text-base font-normal"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-brick">
          {labels.invalid}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-pine text-base font-semibold text-paper disabled:opacity-70"
      >
        {pending ? labels.pending : labels.submit}
      </button>
    </form>
  );
}
