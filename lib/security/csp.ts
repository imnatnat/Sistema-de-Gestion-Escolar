export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

// Hash of the exact string "color:transparent": the inline style attribute that
// next/image puts on <img>. Nonces cannot approve style attributes, so this one
// value is allowed by hash. Nothing else is.
const NEXT_IMAGE_STYLE_HASH =
  "'sha256-zlqnbDt84zf1iSefLU/ImC54isoprH/MRiVZGskwexk='";

export function buildCsp(nonce: string, isDev: boolean): string {
  const directives = [
    "default-src 'self'",
    // 'strict-dynamic' lets nonce-approved scripts load their own chunks.
    // 'unsafe-eval' is needed ONLY in development (React debugging info).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Development injects inline styles for hot reload; production uses the nonce only.
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    // Inline style attributes: development allows them; production allows only the
    // exact next/image value above.
    `style-src-attr ${isDev ? "'unsafe-inline'" : `'unsafe-hashes' ${NEXT_IMAGE_STYLE_HASH}`}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    // The browser only talks to our own server (session strategy B).
    "connect-src 'self' https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
    // Cloudflare Turnstile widget (the script itself is approved by the nonce).
    "frame-src https://challenges.cloudflare.com",
  ];
  return directives.join("; ");
}
