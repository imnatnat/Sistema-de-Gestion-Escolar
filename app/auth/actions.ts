"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  correo: z.string().trim().toLowerCase().email().max(254),
  contrasena: z.string().min(1).max(128),
});

const signupSchema = z.object({
  nombre_completo: z.string().trim().min(2).max(120),
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .email()
    .max(254)
    .regex(/^[^@\s]+@uanl\.edu\.mx$/),
  contrasena: z.string().min(12).max(128),
});

const captchaSchema = z.string().min(1).max(2048);

function getSiteOrigin() {
  const value = process.env.NEXT_PUBLIC_SITE_URL;

  if (!value) {
    throw new Error("Falta NEXT_PUBLIC_SITE_URL");
  }

  const url = new URL(value);

  if (
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    (process.env.NODE_ENV === "production" && url.protocol !== "https:")
  ) {
    throw new Error("NEXT_PUBLIC_SITE_URL no es un origen válido");
  }

  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && url.hostname === "localhost")
  ) {
    throw new Error("NEXT_PUBLIC_SITE_URL debe usar HTTPS");
  }

  return url.origin;
}

export async function loginAction(formData: FormData) {
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
    if (error.code === "captcha_failed") {
      redirect("/login?error=captcha");
    }

    redirect("/login?error=credenciales");
  }

  redirect("/inicio");
}

export async function signupAction(formData: FormData) {
  const captcha = captchaSchema.safeParse(
    formData.get("cf-turnstile-response"),
  );

  if (!captcha.success) {
    redirect("/registro?error=captcha");
  }

  const parsed = signupSchema.safeParse({
    nombre_completo: formData.get("nombre_completo"),
    correo: formData.get("correo"),
    contrasena: formData.get("contrasena"),
  });

  if (!parsed.success) {
    redirect("/registro?error=datos");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.correo,
    password: parsed.data.contrasena,
    options: {
      emailRedirectTo: `${getSiteOrigin()}/auth/confirm`,
      captchaToken: captcha.data,
      data: {
        nombre_completo: parsed.data.nombre_completo,
      },
    },
  });

  if (error) {
    if (error.status === 429) {
      redirect("/registro?error=intentos");
    }

    if (error.code === "captcha_failed") {
      redirect("/registro?error=captcha");
    }

    // Avoid revealing whether an email is already registered.
    redirect("/registro?error=registro");
  }

  redirect("/registro?estado=correo");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
