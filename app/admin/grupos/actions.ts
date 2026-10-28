"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";

function volverConEstado(estado: string): never {
  redirect(`/admin/grupos?estado=${encodeURIComponent(estado)}`);
}

export async function crearGrupoAction(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .single();

  if (errorRol || usuario?.rol !== "administrador") {
    volverConEstado("sin-permiso");
  }

  const idMateria = String(formData.get("id_materia") ?? "").trim();
  const idProfesor = String(formData.get("id_profesor") ?? "").trim();
  const periodo = String(formData.get("periodo") ?? "").trim();
  const horario = String(formData.get("horario") ?? "").trim();
  const cupoTexto = String(formData.get("cupo_maximo") ?? "").trim();

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!idMateria || !idProfesor || !periodo || !horario || !cupoTexto) {
    volverConEstado("campos-obligatorios");
  }

  if (
    !uuidRegex.test(idMateria) ||
    !uuidRegex.test(idProfesor) ||
    !/^\d{4}-[12]$/.test(periodo) ||
    horario.length > 200 ||
    !/^\d+$/.test(cupoTexto)
  ) {
    volverConEstado("datos-invalidos");
  }

  const cupoMaximo = Number(cupoTexto);

  if (!Number.isSafeInteger(cupoMaximo) || cupoMaximo < 1 || cupoMaximo > 500) {
    volverConEstado("datos-invalidos");
  }

  const { data: materia, error: errorMateria } = await supabase
    .from("materias")
    .select("id_materia")
    .eq("id_materia", idMateria)
    .maybeSingle();

  if (errorMateria || !materia) {
    volverConEstado("materia-invalida");
  }

  const { data: profesor, error: errorProfesor } = await supabase
    .from("profesores")
    .select("id_usuario")
    .eq("id_usuario", idProfesor)
    .maybeSingle();

  if (errorProfesor || !profesor) {
    volverConEstado("profesor-invalido");
  }

  const { error } = await supabase.from("grupos").insert({
    id_materia: idMateria,
    id_profesor: idProfesor,
    periodo,
    horario,
    cupo_maximo: cupoMaximo,
  });

  if (error) {
    console.error("Error al crear grupo:", error.code);
    volverConEstado("error-guardar");
  }

  volverConEstado("creado");
}
