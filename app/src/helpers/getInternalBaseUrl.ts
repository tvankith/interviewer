/**
 * Base URL for server-side fetches from one Next.js route into another
 * within the same running instance (e.g. a Server Action calling a Route
 * Handler). Uses the loopback address and local port rather than the
 * request's Host header, since this app process only ever serves itself
 * on this port regardless of the external hostname it's reached through.
 */
export default function getInternalBaseUrl(): string {
  const port = process.env.PORT || "3000";
  return `http://127.0.0.1:${port}`;
}
