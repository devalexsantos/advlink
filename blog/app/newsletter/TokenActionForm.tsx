"use client";

import { useActionState } from "react";
import type { ActionState } from "./actions";

interface Messages {
  ok: { title: string; body: string };
  failure: string;
  invalid: string;
}

interface Props {
  token: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  buttonLabel: string;
  pendingLabel: string;
  messages: Messages;
}

export function TokenActionForm({ token, action, buttonLabel, pendingLabel, messages }: Props) {
  const [state, formAction, pending] = useActionState(action, { result: null });

  if (state.result === "ok") {
    return (
      <div role="status" className="mt-8">
        <h2 className="text-xl font-semibold text-foreground">{messages.ok.title}</h2>
        <p className="mt-2 text-muted-foreground">{messages.ok.body}</p>
      </div>
    );
  }

  const error =
    state.result === "invalid" || state.result === "expired"
      ? messages.invalid
      : state.result
        ? messages.failure
        : null;

  return (
    <form action={formAction} className="mt-8">
      <input type="hidden" name="token" value={token} />
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {pending ? pendingLabel : buttonLabel}
      </button>
      <p aria-live="polite" className="mt-3 min-h-5 text-sm text-red-500">
        {error}
      </p>
    </form>
  );
}
