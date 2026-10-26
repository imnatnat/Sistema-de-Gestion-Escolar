"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  correo: z.string().trim().toLowerCase().email().max(254),
  contrasena: z.string().min(1).max(128),
});

// Turnstile tokens are at most 2048 characters.
const captchaSchema = z.string().min(1).max(2048);

export async function loginAction(formData: FormData) {
  // The app requires the token itself, independent of the Supabase dashboard setting.
  const captcha = captchaSchema.safeParse(
    formData.get("cf-turnstile-response"),
  );
  if (!captcha.success) {
    redirect("/login?error=captcha");
  }

  const parsed = loginSchema.safeParse({
    correo: formData.get("correo"),
    contrasena: formData.get("contrasena"),
  });
  if (!parsed.success) {
    redirect("/login?error=datos");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.correo,
    password: parsed.data.contrasena,
    options: { captchaToken: captcha.data },
  });

  if (error) {
    if (error.status === 429) redirect("/login?error=intentos");
    if (error.code === "captcha_failed") redirect("/login?error=captcha");
    // Same message for wrong password, unknown account, unconfirmed email, etc.
    redirect("/login?error=credenciales");
  }

  redirect("/inicio");
}

export async function logoutAction() {
  const supabase = await createClient();
  // "local" ends this device's session only and revokes its refresh token server-side.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
