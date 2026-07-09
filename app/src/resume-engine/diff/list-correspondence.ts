export type EntryCorrespondence<T> =
  | { kind: "unchanged"; index: number; oldItem: T; newItem: T }
  | { kind: "modified"; index: number; oldItem: T; newItem: T }
  | { kind: "added"; index: number; newItem: T }
  | { kind: "removed"; index: number; oldItem: T };

const defaultIsEqual = <T>(a: T, b: T) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Pairs old[i] with new[i] by index — the deliberate v1 correspondence
 * strategy (see design.md: positional over key-based fuzzy matching or
 * agent-tagged operations). Indices beyond the shorter array's length are
 * pure additions (if only in `newItems`) or removals (if only in `oldItems`).
 */
export function correspondPositionally<T>(
  oldItems: T[] | undefined,
  newItems: T[] | undefined,
  isEqual: (a: T, b: T) => boolean = defaultIsEqual
): EntryCorrespondence<T>[] {
  const oldArr = oldItems ?? [];
  const newArr = newItems ?? [];
  const length = Math.max(oldArr.length, newArr.length);
  const result: EntryCorrespondence<T>[] = [];

  for (let index = 0; index < length; index++) {
    const hasOld = index < oldArr.length;
    const hasNew = index < newArr.length;

    if (hasOld && hasNew) {
      const oldItem = oldArr[index];
      const newItem = newArr[index];
      result.push(
        isEqual(oldItem, newItem)
          ? { kind: "unchanged", index, oldItem, newItem }
          : { kind: "modified", index, oldItem, newItem }
      );
    } else if (hasNew) {
      result.push({ kind: "added", index, newItem: newArr[index] });
    } else {
      result.push({ kind: "removed", index, oldItem: oldArr[index] });
    }
  }

  return result;
}
