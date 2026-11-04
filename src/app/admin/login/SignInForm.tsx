"use client";

import { useActionState, useEffect, useRef } from "react";
import { signInAction, type SignInState } from "../actions";

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, {});
  const password = useRef<HTMLInputElement>(null);

  // after a wrong try: clear the password and put the cursor there
  useEffect(() => {
    if (state.error && password.current) {
      password.current.value = "";
      password.current.focus();
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
        <input ref={password} name="password" type="password" required autoComplete="current-password" className="field" />
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
