# Security decisions

## Step 4: Password hashing

- Passwords are hashed by Supabase Auth (bcrypt), stored in auth.users.encrypted_password.
  The application never sees, stores or logs plaintext passwords or hashes.
- The contract prefers Argon2id; bcrypt is accepted because hashing is done by a
  managed, maintained auth service rather than code we write ourselves.
- Known limitation: minimum password length is 8 (complexity rules on). Leaked-password
  checking is a Pro-plan feature and we are on Free. Revisit before launch.

## Step 5: Session strategy

Chosen: server-only Supabase access with cookie-based sessions (@supabase/ssr), HttpOnly.

- The browser never creates a Supabase client and never sees a token. All sign-in,
  sign-out and data access happen in Server Components, Server Actions and Route Handlers.
- Storage: access token (JWT) and refresh token in cookies set by the server with
  HttpOnly, Secure, SameSite=Lax, path=/. Cookie lifetime is not shortened.
  Tokens never go in URLs, localStorage, logs or error messages.
- Expiration: access token expiry is set in the Supabase dashboard (value recorded below).
  Refresh happens in proxy.ts on each request; refresh tokens rotate.
- Verification: pages and data are protected with getClaims(), never getSession().
  Sensitive actions (grades, role changes, password/email changes) also call getUser()
  to confirm the session was not revoked.
- Authorization: the role is never read from the cookie or token. It comes from the
  database (public.usuarios) through RLS and server-side checks.
- Logout: server action calling signOut with scope local; "log out everywhere" uses
  global. Logout revokes the refresh token server-side and clears the cookies.
- Theft protection: HttpOnly + Secure + SameSite, CSP (Step 16), refresh-token rotation,
  no caching of authenticated routes (force-dynamic, Cache-Control: private, no-store),
  Supabase client created per request (never module-level).
- Fallback: if HttpOnly cannot be applied with @supabase/ssr, use the standard cookie
  setup and document it as an exception here, relying on a strict CSP.

Dashboard values: access token (JWT) expiry = 900 s
refresh token rotation = on, reuse interval 10 s;
session limits (single session, time-box, inactivity timeout) = unavailable on Free plan.
An app-level idle timeout will be considered at Step 11.

## Step 6: CORS and security headers

- CORS: same-origin only. No Access-Control-Allow-\* headers are sent; the browser talks
  only to this app's own server (session strategy B).
- CSP: nonce-based, generated per request in proxy.ts (lib/security/csp.ts). Cache
  Components / Partial Prerendering are disabled because they are incompatible with
  nonce-based CSP. Every route renders dynamically (await connection() in the root layout).
  Production: no unsafe-inline / unsafe-eval for scripts. Development only: unsafe-eval
  (React debugging) and unsafe-inline styles (hot reload).
- Static headers (next.config.ts): X-Content-Type-Options, Referrer-Policy,
  X-Frame-Options, Permissions-Policy, HSTS (production only, max-age 1 year,
  no includeSubDomains/preload until a custom domain exists). X-Powered-By removed.

## Step 7a: Login and logout

- Server-only Supabase client (lib/supabase/server.ts), created per request. Session
  cookies are forced HttpOnly + Secure + SameSite=Lax (lib/supabase/cookie-options.ts)
  in both the server client and the proxy.
- proxy.ts: nonce CSP + session refresh with getClaims() + default-deny routing
  (public: /login and /auth/\*). It runs on all non-static requests, including prefetches,
  so sessions never refresh inside page renders. Authenticated responses are no-store.
- Every protected page/action also calls requireUser() (lib/auth/session.ts).
- Login: zod validation, generic error for all failures except rate limit (429).
  Error messages come from a fixed dictionary, never from the query string.
- Logout: signOut with scope local (revokes this session's refresh token).
- server-only is not imported by files the proxy uses.

## Step 10a: Rate limiting and CAPTCHA

- Supabase built-in auth rate limits kept as configured (sign-ups/sign-ins 30 per 5 min
  per IP; chosen not to lower it because a classroom shares one IP).
- Cloudflare Turnstile (managed) on login. Enabled in Supabase (secret key only in the
  Supabase dashboard), so direct calls to the auth API also require a token. The server
  action also requires the token before calling Supabase.
- CSP: nonce on the Turnstile api.js tag; frame-src https://challenges.cloudflare.com.
- Known limitation: default Supabase email limit is 2 per hour; custom SMTP is required
  before public signups. Per-account throttling (option B) is deferred.
