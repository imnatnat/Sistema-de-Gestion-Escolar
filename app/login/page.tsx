import { headers } from "next/headers";
import Script from "next/script";
import { loginAction } from "@/app/auth/actions";
import { getTurnstileSiteKey } from "@/lib/security/turnstile";

// Fixed messages only. Query-string values are never rendered directly.
const MENSAJES: Record<string, string> = {
  datos: "Revisa tu correo y tu contraseña.",
  credenciales: "Correo o contraseña incorrectos.",
  intentos: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  captcha: "Completa la verificación de seguridad e inténtalo de nuevo.",
  confirmacion:
    "No se pudo confirmar el correo. Solicita un nuevo enlace si es necesario.",
};

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;

  const codigo =
    typeof searchParams.error === "string" ? searchParams.error : undefined;

  const mensaje =
    codigo && Object.hasOwn(MENSAJES, codigo) ? MENSAJES[codigo] : undefined;

  const confirmado = searchParams.estado === "confirmado";

  // The proxy puts the per-request nonce in this header (see proxy.ts).
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const siteKey = getTurnstileSiteKey();

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-8">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        nonce={nonce}
      />

      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>

      {confirmado && (
        <p
          role="status"
          className="rounded border border-green-300 bg-green-50 p-3 text-green-900"
        >
          Tu correo fue confirmado. Ya puedes iniciar sesión. Tu cuenta todavía
          necesita aprobación para acceder a las funciones de estudiante.
        </p>
      )}

      {mensaje && (
        <p
          role="alert"
          className="rounded border border-red-300 bg-red-50 p-3 text-red-800"
        >
          {mensaje}
        </p>
      )}

      <form action={loginAction} className="flex flex-col gap-4">
        <label htmlFor="correo" className="flex flex-col gap-1">
          Correo electrónico
          <input
            id="correo"
            name="correo"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            className="rounded border px-3 py-2"
          />
        </label>

        <label htmlFor="contrasena" className="flex flex-col gap-1">
          Contraseña
          <input
            id="contrasena"
            name="contrasena"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
            className="rounded border px-3 py-2"
          />
        </label>

        {/* Turnstile adds a hidden "cf-turnstile-response" field to this form. */}
        <div
          className="cf-turnstile"
          data-sitekey={siteKey}
          data-language="es"
        />

        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Entrar
        </button>
      </form>
    </main>
  );
}
