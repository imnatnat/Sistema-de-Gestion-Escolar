"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/app/ui/button";
import { StatusMessage } from "@/app/ui/status-message";

import {
  eliminarInscripcionAction,
  type InscripcionActionResult,
} from "./actions";

const initialState: InscripcionActionResult = {
  success: false,
  message: "",
};

type EnrollmentDeleteFormProps = {
  idInscripcion: string;
};

export function EnrollmentDeleteForm({
  idInscripcion,
}: EnrollmentDeleteFormProps) {
  const [state, formAction, pending] = useActionState(
    eliminarInscripcionAction,
    initialState,
  );

  return (
    <div className="min-w-36 space-y-2">
      <form
        action={formAction}
        onSubmit={(event) => {
          if (
            !window.confirm(
              "¿Estás seguro de que deseas eliminar esta inscripción?",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id_inscripcion" value={idInscripcion} />

        <Button type="submit" variant="danger" disabled={pending}>
          <Trash2 size={14} />
          {pending ? "Eliminando..." : "Eliminar"}
        </Button>
      </form>

      {state.message && (
        <StatusMessage type={state.success ? "success" : "error"}>
          {state.message}
        </StatusMessage>
      )}
    </div>
  );
}
