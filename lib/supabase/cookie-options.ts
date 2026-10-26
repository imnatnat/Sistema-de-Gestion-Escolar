// Session cookies written by this app are always HttpOnly, Secure and SameSite=Lax.
// maxAge/expires coming from Supabase are kept as they are (never shortened).
export function hardenCookieOptions<T extends object>(options?: T) {
  return {
    ...options,
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
  };
}
