import { headers } from "next/headers";
import Link from "next/link";
import Script from "next/script";
import { signupAction } from "@/app/auth/actions";
import { getTurnstileSiteKey } from "@/lib/security/turnstile";

const MENSAJES: Record<string, string> = {
  datos:
    "Revisa los datos. Usa un correo institucional @uanl.edu.mx y una contraseña de al menos 12 caracteres.",
  captcha: "Completa la verificación de seguridad e inténtalo de nuevo.",
  intentos: "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.",
  registro:
    "No se pudo completar el registro. Revisa los datos e inténtalo de nuevo.",
  confirmacion:
    "No se pudo confirmar el correo. Solicita un nuevo enlace si es necesario.",
};

export default async function RegistroPage(props: PageProps<"/registro">) {
  const searchParams = await props.searchParams;
  const codigo =
    typeof searchParams.error === "string" ? searchParams.error : undefined;
  const mensaje =
    codigo && Object.hasOwn(MENSAJES, codigo) ? MENSAJES[codigo] : undefined;
  const correoEnviado = searchParams.estado === "correo";

  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const siteKey = getTurnstileSiteKey();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>

      <p className="text-sm text-gray-600">
        Regístrate con tu correo institucional de la UANL. Tu cuenta necesitará
        aprobación para acceder a las funciones de estudiante.
      </p>

      {correoEnviado && (
        <p
          role="status"
          className="rounded border border-green-300 bg-green-50 p-3 text-green-900"
        >
          Si el registro fue aceptado, recibirás un correo con instrucciones
          para confirmar tu cuenta. Revisa también la carpeta de spam.
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

      {!correoEnviado && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
            nonce={nonce}
          />

          <form action={signupAction} className="flex flex-col gap-4">
            <label htmlFor="nombre_completo" className="flex flex-col gap-1">
              Nombre completo
              <input
                id="nombre_completo"
                name="nombre_completo"
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                className="rounded border px-3 py-2"
              />
            </label>

            <label htmlFor="correo" className="flex flex-col gap-1">
              Correo institucional
              <input
                id="correo"
                name="correo"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                pattern="[^@\s]+@uanl\.edu\.mx"
                title="Usa un correo que termine en @uanl.edu.mx"
                className="rounded border px-3 py-2"
              />
            </label>

            <label htmlFor="contrasena" className="flex flex-col gap-1">
              Contraseña
              <input
                id="contrasena"
                name="contrasena"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                className="rounded border px-3 py-2"
              />
              <span className="text-sm text-gray-600">
                Usa entre 12 y 128 caracteres.
              </span>
            </label>

            <div
              className="cf-turnstile"
              data-sitekey={siteKey}
              data-language="es"
            />

            <button
              type="submit"
              className="rounded bg-black px-4 py-2 text-white"
            >
              Crear cuenta
            </button>
          </form>
        </>
      )}

      <p className="text-sm">
        ¿Ya tienes una cuenta?{" "}
        <Link href="/login" className="underline">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}
