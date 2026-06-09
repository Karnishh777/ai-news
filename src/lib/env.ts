import "server-only";

/**
 * Reads an environment variable, trimming whitespace and stripping a single
 * pair of surrounding quotes. Pasting secrets into hosting dashboards often
 * adds stray quotes/newlines that silently break API auth headers — this
 * normalizes them so keys are read reliably.
 */
export function env(name: string): string {
  return (process.env[name] ?? "").trim().replace(/^["']|["']$/g, "").trim();
}
