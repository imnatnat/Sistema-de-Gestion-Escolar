export function getTurnstileSiteKey() {
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!key) {
    throw new Error("Falta NEXT_PUBLIC_TURNSTILE_SITE_KEY (revisa .env.local)");
  }
  return key;
}
