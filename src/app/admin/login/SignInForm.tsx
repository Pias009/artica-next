"use client";

import { useActionState, useEffect, useRef } from "react";
import { signInAction, type SignInState } from "../actions";

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, {});
  const code = useRef<HTMLInputElement>(null);

  // after a wrong try the code has usually expired anyway: clear it and put the cursor there
  useEffect(() => {
    if (state.error && code.current) {
      code.current.value = "";
      code.current.focus();
    }
  }, [state]);

  return (
    <form action={action} className="mt-6 grid gap-3.5" aria-busy={pending}>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-ink-2">Email</span>
        <input name="email" type="email" required autoComplete="username" autoCapitalize="none" spellCheck={false} className="field" />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-ink-2">Password</span>
        <input name="password" type="password" required autoComplete="current-password" className="field" />
      </label>
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold text-ink-2">Authenticator code</span>
        <input
          ref={code}
          name="code"
          required
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="6 digits"
          className="field tracking-[.3em] tabular-nums"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-[13px] font-medium text-danger">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-dark mt-1 h-[48px] w-full">
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
