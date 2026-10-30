"use client";

import { useActionState } from "react";
import { UsersRound } from "lucide-react";

import { Button } from "@/app/ui/button";
import { Field, SelectInput, TextInput } from "@/app/ui/form-controls";
import { StatusMessage } from "@/app/ui/status-message";

import { crearGrupoAction, type GrupoActionResult } from "./actions";

type MateriaOption = {
  id_materia: string;
  nombre: string;
  clave: string;
};

type ProfesorOption = {
  id_usuario: string;
  nombre_completo: string;
  especialidad: string | null;
};

type GroupCreateFormProps = {
  materias: MateriaOption[];
  profesores: ProfesorOption[];
};

const initialState: GrupoActionResult = {
  success: false,
  message: "",
};

export function GroupCreateForm({
  materias,
  profesores,
}: GroupCreateFormProps) {
  const [state, formAction, pending] = useActionState(
    crearGrupoAction,
    initialState,
  );

  const sinMaterias = materias.length === 0;
  const sinProfesores = profesores.length === 0;

  if (sinMaterias || sinProfesores) {
    return (
      <section className="rounded-lg border border-[#E9E9E7] bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F0F0EE] text-[#555555]">
            <UsersRound size={18} />
          </div>

          <div>
            <h2 className="text-base font-semibold text-[#252525]">
              Registrar grupo
            </h2>
            <p className="mt-0.5 text-xs text-[#888888]">
              Asigna una materia y un profesor.
            </p>
          </div>
        </div>

        <StatusMessage type="error">
          {sinMaterias && sinProfesores
            ? "Primero registra al menos una materia y un profesor."
            : sinMaterias
              ? "Primero registra al menos una materia."
              : "Primero registra al menos un profesor."}
        </StatusMessage>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-[#E9E9E7] bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F0F0EE] text-[#555555]">
          <UsersRound size={18} />
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#252525]">
            Registrar grupo
          </h2>
          <p className="mt-0.5 text-xs text-[#888888]">
            Asigna una materia y un profesor para un periodo escolar.
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <Field label="Materia *" htmlFor="id_materia">
          <SelectInput
            id="id_materia"
            name="id_materia"
            required
            defaultValue=""
            disabled={pending}
          >
            <option value="" disabled>
              Selecciona una materia
            </option>

            {materias.map((materia) => (
              <option key={materia.id_materia} value={materia.id_materia}>
                {materia.clave} — {materia.nombre}
              </option>
            ))}
          </SelectInput>
        </Field>

        <Field label="Profesor *" htmlFor="id_profesor">
          <SelectInput
            id="id_profesor"
            name="id_profesor"
            required
            defaultValue=""
            disabled={pending}
          >
            <option value="" disabled>
              Selecciona un profesor
            </option>

            {profesores.map((profesor) => (
              <option key={profesor.id_usuario} value={profesor.id_usuario}>
                {profesor.nombre_completo}
                {profesor.especialidad ? ` — ${profesor.especialidad}` : ""}
              </option>
            ))}
          </SelectInput>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Periodo escolar *"
            htmlFor="periodo"
            hint="Formato: AAAA-1 o AAAA-2."
          >
            <TextInput
              id="periodo"
              name="periodo"
              required
              pattern="[0-9]{4}-[12]"
              maxLength={6}
              placeholder="2026-2"
              title="Usa el formato AAAA-1 o AAAA-2."
              disabled={pending}
            />
          </Field>

          <Field label="Horario *" htmlFor="horario">
            <TextInput
              id="horario"
              name="horario"
              required
              maxLength={200}
              placeholder="Ej. Lun y Mié, 10:00–12:00"
              disabled={pending}
            />
          </Field>

          <Field label="Cupo máximo *" htmlFor="cupo_maximo">
            <TextInput
              id="cupo_maximo"
              name="cupo_maximo"
              type="number"
              min={1}
              max={500}
              step={1}
              required
              defaultValue={30}
              disabled={pending}
            />
          </Field>
        </div>

        {state.message && (
          <StatusMessage type={state.success ? "success" : "error"}>
            {state.message}
          </StatusMessage>
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={pending}>
            <UsersRound size={16} />
            {pending ? "Guardando..." : "Crear grupo"}
          </Button>
        </div>
      </form>
    </section>
  );
}
