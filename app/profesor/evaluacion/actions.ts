"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function volverConEstado(estado: string): never {
  redirect(`/profesor/evaluacion?estado=${encodeURIComponent(estado)}`);
}

function leerPorcentaje(formData: FormData, campo: string) {
  const valor = formData.get(campo);

  if (typeof valor !== "string" || valor.trim() === "") {
    return null;
  }

  const texto = valor.trim();

  if (!/^\d{1,3}(?:\.\d{1,2})?$/.test(texto)) {
    return null;
  }

  const numero = Number(texto);

  if (!Number.isFinite(numero) || numero < 0 || numero > 100) {
    return null;
  }

  return numero;
}

export async function guardarConfiguracionEvaluacionAction(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorRol || usuario?.rol !== "profesor") {
    redirect("/inicio");
  }

  const idMateria = formData.get("id_materia");
  const periodo = formData.get("periodo");

  if (
    typeof idMateria !== "string" ||
    !uuidRegex.test(idMateria) ||
    typeof periodo !== "string" ||
    periodo.trim() === "" ||
    periodo.length > 30
  ) {
    volverConEstado("solicitud-invalida");
  }

  // Verificar que el profesor tenga grupos de esta materia y periodo.
  const { data: grupo, error: errorGrupo } = await supabase
    .from("grupos")
    .select("id_grupo")
    .eq("id_profesor", userId)
    .eq("id_materia", idMateria)
    .eq("periodo", periodo)
    .limit(1)
    .maybeSingle();

  if (errorGrupo) {
    console.error("Error verificando grupo:", errorGrupo.code);
    volverConEstado("error");
  }

  if (!grupo) {
    volverConEstado("sin-permiso");
  }

  const actividad1 = leerPorcentaje(formData, "actividad_1");
  const actividad2 = leerPorcentaje(formData, "actividad_2");
  const actividad3 = leerPorcentaje(formData, "actividad_3");
  const actividad4 = leerPorcentaje(formData, "actividad_4");
  const actividad5 = leerPorcentaje(formData, "actividad_5");
  const medioCurso = leerPorcentaje(formData, "medio_curso");
  const ordinario = leerPorcentaje(formData, "ordinario");

  const porcentajes = [
    actividad1,
    actividad2,
    actividad3,
    actividad4,
    actividad5,
    medioCurso,
    ordinario,
  ];

  if (porcentajes.some((valor) => valor === null)) {
    volverConEstado("datos-invalidos");
  }

  const total = porcentajes.reduce((suma, valor) => suma + (valor ?? 0), 0);

  if (Math.round(total * 100) !== 10000) {
    volverConEstado("total-invalido");
  }

  const { error } = await supabase.rpc("guardar_configuracion_evaluacion", {
    p_id_materia: idMateria,
    p_periodo: periodo,
    p_actividad_1: actividad1,
    p_actividad_2: actividad2,
    p_actividad_3: actividad3,
    p_actividad_4: actividad4,
    p_actividad_5: actividad5,
    p_medio_curso: medioCurso,
    p_ordinario: ordinario,
  });

  if (error) {
    console.error("Error guardando configuración:", error.code);
    volverConEstado("error");
  }

  revalidatePath("/profesor/evaluacion");
  revalidatePath("/profesor/grupos");
  revalidatePath("/estudiante/calificaciones");

  volverConEstado("guardada");
}
