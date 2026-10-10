"use server";

import { confirmSubscription, unsubscribe, type FlowResult } from "@/lib/newsletter/service";

export interface ActionState {
  result: FlowResult | null;
}

// The pages only render a button; the state change happens on this POST, never on the GET,
// so e-mail link scanners that prefetch URLs cannot confirm or cancel on the person's behalf.
export async function confirmAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return { result: await confirmSubscription(formData.get("token")) };
}

export async function unsubscribeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return { result: await unsubscribe(formData.get("token")) };
}
