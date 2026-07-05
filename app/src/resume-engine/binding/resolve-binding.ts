/**
 * Dot-path resolution only — no query language. `scope` is either the root
 * ResumeData (for top-level bindings) or a single array element (inside a
 * List repeater's itemTemplate).
 */
export function resolveBinding(path: string | undefined, scope: unknown): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, scope);
}

/** Joins a repeater's absolute path prefix with a relative binding, e.g. ("experiences.2", "description") -> "experiences.2.description". */
export function toAbsoluteBinding(absolutePrefix: string | undefined, relativeBinding: string): string {
  return absolutePrefix ? `${absolutePrefix}.${relativeBinding}` : relativeBinding;
}
