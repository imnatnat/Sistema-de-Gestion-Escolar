export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan variables de entorno de Supabase (revisa .env.local)",
    );
  }

  // The URL must be the bare project URL, with no path (e.g. no /rest/v1/).
  const parsed = new URL(url);
  if (parsed.pathname !== "/") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL debe ser solo https://<proyecto>.supabase.co",
    );
  }

  return { url: parsed.origin, key };
}
