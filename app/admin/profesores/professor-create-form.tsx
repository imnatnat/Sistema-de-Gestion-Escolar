"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import { crearProfesorFormAction } from "./actions";

import { Button } from "@/app/ui/button";
import { Field, TextInput } from "@/app/ui/form-controls";
import { StatusMessage } from "@/app/ui/status-message";

const initialState = {
  success: false,
  message: "",
};

export function ProfessorCreateForm() {
  const [state, formAction, pending] = useActionState(
    crearProfesorFormAction,
    initialState,
  );

  return (
    <section className="rounded-lg border border-[#E9E9E7] bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-[#F0F0EE] text-[#555555]">
          <UserPlus size={18} />
        </div>

        <div>
          <h2 className="text-base font-semibold text-[#252525]">
            Registrar profesor
          </h2>
          <p className="mt-0.5 text-xs text-[#888888]">
            Se enviará una invitación al correo indicado.
          </p>
        </div>
      </div>

      <form action={formAction} className="space-y-4">
        <Field label="Nombre completo *" htmlFor="nombre_completo">
          <TextInput
            id="nombre_completo"
            name="nombre_completo"
            type="text"
            maxLength={150}
            autoComplete="name"
            placeholder="Nombre del profesor"
            required
            disabled={pending}
          />
        </Field>

        <Field
          label="Correo electrónico *"
          htmlFor="correo"
          hint="Se utilizará para enviar la invitación de acceso."
        >
          <TextInput
            id="correo"
            name="correo"
            type="email"
            maxLength={254}
            autoComplete="email"
            placeholder="profesor@uanl.edu.mx"
            required
            disabled={pending}
          />
        </Field>

        <Field
          label="Especialidad"
          htmlFor="especialidad"
          hint="Este campo es opcional."
        >
          <TextInput
            id="especialidad"
            name="especialidad"
            type="text"
            maxLength={150}
            placeholder="Ej. Matemáticas"
            disabled={pending}
          />
        </Field>

        {state.message && (
          <StatusMessage type={state.success ? "success" : "error"}>
            {state.message}
          </StatusMessage>
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" disabled={pending}>
            <UserPlus size={16} />
            {pending ? "Registrando..." : "Registrar profesor"}
          </Button>
        </div>
      </form>
    </section>
  );
}
