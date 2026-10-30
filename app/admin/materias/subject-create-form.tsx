"use client";

import { useActionState } from "react";
import { BookPlus } from "lucide-react";

import { Button } from "@/app/ui/button";
import { Field, TextInput } from "@/app/ui/form-controls";
import { StatusMessage } from "@/app/ui/status-message";

import { crearMateriaAction, type MateriaActionResult } from "./actions";

const initialState: MateriaActionResult = {
  success: false,
  message: "",
};

export function SubjectCreateForm() {
  const [state, formAction, pending] = useActionState(
    crearMateriaAction,
    initialState,
  );

  return (
    <section className="rounded-lg border border-[#E9E9E7] bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F0F0EE] text-[#555555]">
          <BookPlus size={18} />
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#252525]">
            Registrar materia
          </h2>

          <p className="mt-0.5 text-xs text-[#888888]">
            Agrega una nueva materia al catálogo escolar.
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <Field label="Nombre de la materia *" htmlFor="nombre">
          <TextInput
            id="nombre"
            name="nombre"
            type="text"
            maxLength={150}
            placeholder="Ej. Programación orientada a objetos"
            required
            disabled={pending}
          />
        </Field>

        <Field
          label="Clave *"
          htmlFor="clave"
          hint="La clave se guardará automáticamente en mayúsculas."
        >
          <TextInput
            id="clave"
            name="clave"
            type="text"
            maxLength={30}
            placeholder="Ej. POO101"
            required
            disabled={pending}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Créditos *" htmlFor="creditos">
            <TextInput
              id="creditos"
              name="creditos"
              type="number"
              min={1}
              max={100}
              step={1}
              required
              disabled={pending}
            />
          </Field>

          <Field label="Horas *" htmlFor="horas">
            <TextInput
              id="horas"
              name="horas"
              type="number"
              min={1}
              max={1000}
              step={1}
              required
              disabled={pending}
            />
          </Field>

          <Field label="Semestre" htmlFor="semestre" hint="Campo opcional.">
            <TextInput
              id="semestre"
              name="semestre"
              type="number"
              min={1}
              max={20}
              step={1}
              placeholder="Opcional"
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
            <BookPlus size={16} />
            {pending ? "Guardando..." : "Crear materia"}
          </Button>
        </div>
      </form>
    </section>
  );
}
