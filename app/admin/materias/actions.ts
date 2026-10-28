"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

function volverConEstado(estado: string): never {
  redirect(`/admin/materias?estado=${encodeURIComponent(estado)}`);
}

export async function crearMateriaAction(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .single();

  if (errorRol || usuario?.rol !== "administrador") {
    volverConEstado("sin-permiso");
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const clave = String(formData.get("clave") ?? "")
    .trim()
    .toUpperCase();
  const creditosTexto = String(formData.get("creditos") ?? "").trim();
  const horasTexto = String(formData.get("horas") ?? "").trim();
  const semestreTexto = String(formData.get("semestre") ?? "").trim();

  if (!nombre || !clave || !creditosTexto || !horasTexto) {
    volverConEstado("campos-obligatorios");
  }

  if (
    nombre.length > 150 ||
    clave.length > 30 ||
    !/^\d+$/.test(creditosTexto) ||
    !/^\d+$/.test(horasTexto) ||
    (semestreTexto !== "" && !/^\d+$/.test(semestreTexto))
  ) {
    volverConEstado("datos-invalidos");
  }

  const creditos = Number(creditosTexto);
  const horas = Number(horasTexto);
  const semestre = semestreTexto === "" ? null : Number(semestreTexto);

  if (
    !Number.isSafeInteger(creditos) ||
    creditos < 1 ||
    creditos > 100 ||
    !Number.isSafeInteger(horas) ||
    horas < 1 ||
    horas > 1000 ||
    (semestre !== null &&
      (!Number.isSafeInteger(semestre) || semestre < 1 || semestre > 20))
  ) {
    volverConEstado("datos-invalidos");
  }

  const { error } = await supabase.from("materias").insert({
    nombre,
    clave,
    creditos,
    horas,
    semestre,
  });

  if (error) {
    if (error.code === "23505") {
      volverConEstado("materia-duplicada");
    }

    console.error("Error al crear materia:", error.code);
    volverConEstado("error-guardar");
  }

  volverConEstado("creada");
}
