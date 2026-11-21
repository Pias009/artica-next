"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { signInAction, type SignInState } from "../actions";

export function SignInForm() {
  const [state, action, pending] = useActionState<SignInState, FormData>(signInAction, {});
  const password = useRef<HTMLInputElement>(null);
  const [shown, setShown] = useState(false);

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
      <div className="grid gap-1.5">
        <label htmlFor="admin-password" className="text-xs font-semibold text-ink-2">
          Password
        </label>
        <div className="relative">
          <input
            ref={password}
            id="admin-password"
            name="password"
            type={shown ? "text" : "password"}
            required
            autoComplete="current-password"
            autoCapitalize="none"
            spellCheck={false}
            className="field pr-12"
          />
          {/* show or hide what's typed, to check it before signing in */}
          <button
            type="button"
            onClick={() => setShown((s) => !s)}
            aria-label={shown ? "Hide password" : "Show password"}
            aria-pressed={shown}
            aria-controls="admin-password"
            className="absolute inset-y-0 right-1 my-auto grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-chip hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-none stroke-current stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
              {shown && <path d="M4 4l16 16" />}
            </svg>
          </button>
        </div>
      </div>
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
