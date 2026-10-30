"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";

import { Button } from "@/app/ui/button";
import { Field, SelectInput } from "@/app/ui/form-controls";
import { StatusMessage } from "@/app/ui/status-message";

import {
  crearInscripcionAdminAction,
  type InscripcionActionResult,
} from "./actions";

type EstudianteOption = {
  id_usuario: string;
  matricula: string;
  nombre_completo: string;
};

type GrupoOption = {
  id_grupo: string;
  etiqueta: string;
};

type EnrollmentCreateFormProps = {
  estudiantes: EstudianteOption[];
  grupos: GrupoOption[];
};

const initialState: InscripcionActionResult = {
  success: false,
  message: "",
};

export function EnrollmentCreateForm({
  estudiantes,
  grupos,
}: EnrollmentCreateFormProps) {
  const [state, formAction, pending] = useActionState(
    crearInscripcionAdminAction,
    initialState,
  );

  if (estudiantes.length === 0 || grupos.length === 0) {
    return (
      <section className="rounded-lg border border-[#E9E9E7] bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F0F0EE] text-[#555555]">
            <UserPlus size={18} />
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#252525]">
              Inscribir estudiante
            </h2>
            <p className="mt-0.5 text-xs text-[#888888]">
              Registra a un estudiante en un grupo.
            </p>
          </div>
        </div>

        <StatusMessage type="error">
          {estudiantes.length === 0 && grupos.length === 0
            ? "Se necesita al menos un estudiante aprobado y un grupo disponible."
            : estudiantes.length === 0
              ? "No hay estudiantes aprobados disponibles."
              : "No hay grupos disponibles para inscripción."}
        </StatusMessage>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[#E9E9E7] bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F0F0EE] text-[#555555]">
          <UserPlus size={18} />
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#252525]">
            Inscribir estudiante
          </h2>
          <p className="mt-0.5 text-xs text-[#888888]">
            Solo aparecen estudiantes aprobados.
          </p>
        </div>
      </div>

      <form action={formAction} className="grid gap-4 md:grid-cols-3">
        <Field label="Estudiante *" htmlFor="id_usuario">
          <SelectInput
            id="id_usuario"
            name="id_usuario"
            required
            defaultValue=""
            disabled={pending}
          >
            <option value="" disabled>
              Selecciona un estudiante
            </option>

            {estudiantes.map((estudiante) => (
              <option key={estudiante.id_usuario} value={estudiante.id_usuario}>
                {estudiante.matricula} — {estudiante.nombre_completo}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Grupo *" htmlFor="id_grupo">
          <SelectInput
            id="id_grupo"
            name="id_grupo"
            required
            defaultValue=""
            disabled={pending}
          >
            <option value="" disabled>
              Selecciona un grupo
            </option>

            {grupos.map((grupo) => (
              <option key={grupo.id_grupo} value={grupo.id_grupo}>
                {grupo.etiqueta}
              </option>
            ))}
          </SelectInput>
        </Field>

        <div className="flex items-end">
          <Button type="submit" disabled={pending} className="w-full">
            <UserPlus size={16} />
            {pending ? "Inscribiendo..." : "Crear inscripción"}
          </Button>
        </div>

        {state.message && (
          <div className="md:col-span-3">
            <StatusMessage type={state.success ? "success" : "error"}>
              {state.message}
            </StatusMessage>
          </div>
        )}
      </form>
    </section>
  );
}
