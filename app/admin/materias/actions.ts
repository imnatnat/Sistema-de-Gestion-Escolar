"use server";

import { requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export type MateriaActionResult = {
  success: boolean;
  message: string;
};

export async function crearMateriaAction(
  _previousState: MateriaActionResult,
  formData: FormData,
): Promise<MateriaActionResult> {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .single();

  if (errorRol || usuario?.rol !== "administrador") {
    return {
      success: false,
      message: "No tienes permiso para administrar materias.",
    };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();

  const clave = String(formData.get("clave") ?? "")
    .trim()
    .toUpperCase();

  const creditosTexto = String(formData.get("creditos") ?? "").trim();
  const horasTexto = String(formData.get("horas") ?? "").trim();
  const semestreTexto = String(formData.get("semestre") ?? "").trim();

  if (!nombre || !clave || !creditosTexto || !horasTexto) {
    return {
      success: false,
      message: "Completa todos los campos obligatorios.",
    };
  }

  if (
    nombre.length > 150 ||
    clave.length > 30 ||
    !/^\d+$/.test(creditosTexto) ||
    !/^\d+$/.test(horasTexto) ||
    (semestreTexto !== "" && !/^\d+$/.test(semestreTexto))
  ) {
    return {
      success: false,
      message: "Revisa los datos: uno o más valores no son válidos.",
    };
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
    return {
      success: false,
      message: "Revisa los datos: uno o más valores no son válidos.",
    };
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
      return {
        success: false,
        message: "Ya existe una materia con esos datos únicos.",
      };
    }

    console.error("Error al crear materia:", error.code);

    return {
      success: false,
      message: "No se pudo guardar la materia. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/admin/materias");
  revalidatePath("/inicio");

  return {
    success: true,
    message: "Materia creada correctamente.",
  };
}
