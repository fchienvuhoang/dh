// Preserve node-postgres 8's existing certificate and hostname verification
// when a provider supplies one of its deprecated SSL mode aliases.
export function normalizeDatabaseSslUrl(connectionString: string | undefined) {
  if (!connectionString) return connectionString;
  try {
    const url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) return connectionString;
    if (url.searchParams.get("uselibpqcompat") === "true") return connectionString;
    const mode = url.searchParams.get("sslmode");
    if (mode && ["prefer", "require", "verify-ca"].includes(mode)) {
      url.searchParams.set("sslmode", "verify-full");
      return url.toString();
    }
  } catch {
    // Leave invalid connection strings to the database driver's own validation.
  }
  return connectionString;
}
