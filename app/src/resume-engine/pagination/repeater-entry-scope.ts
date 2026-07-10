import type { BindingScope } from "../registry/node-registry";

/**
 * Non-diff mode: the scope for one repeater entry, given its array index and value. Shared by
 * ListNode's repeater rendering and the pagination hidden measurement pass so they can never
 * resolve a different value for the same entry.
 */
export function buildRepeaterEntryScope(listAbsoluteBinding: string | undefined, index: number, item: unknown): BindingScope {
  return { value: item, absolutePath: `${listAbsoluteBinding}.${index}` };
}
