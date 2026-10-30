import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { aprobarEstudianteAction } from "./actions";

import { Button } from "@/app/ui/button";
import { PageHeader } from "@/app/ui/page-header";
import { DataTable } from "@/app/ui/data-table";
import type { DataTableColumn } from "@/app/ui/data-table";
import { StatusMessage } from "@/app/ui/status-message";
import { EmptyState } from "@/app/ui/empty-state";

type PageProps = {
  searchParams: Promise<{
    estado?: string;
  }>;
};

type Estudiante = {
  id_usuario: string;
  matricula: string;
  nombre_completo: string;
  carrera: string | null;
  semestre: number | null;
};

export default async function AdminEstudiantesPage({
  searchParams,
}: PageProps) {
  const { supabase, userId } = await requireUser();
  const params = await searchParams;

  const { data: usuario, error: usuarioError } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (usuarioError || usuario?.rol !== "administrador") {
    redirect("/inicio");
  }

  const { data: estudiantes, error: estudiantesError } = await supabase
    .from("estudiantes")
    .select("id_usuario, matricula, nombre_completo, carrera, semestre")
    .eq("aprobado", false)
    .order("nombre_completo");

  const mensajes: Record<string, string> = {
    aprobado: "La cuenta fue aprobada correctamente.",
    error:
      "No se pudo aprobar la cuenta. Revisa los permisos e inténtalo nuevamente.",
    "no-pendiente": "La cuenta ya estaba aprobada o no existe.",
    "solicitud-invalida": "La solicitud no es válida.",
  };

  if (estudiantesError) {
    return (
      <div className="mx-auto w-full max-w-6xl">
        <PageHeader
          eyebrow="Administración"
          title="Estudiantes"
          description="Revisa y administra las solicitudes de acceso."
        />
        <StatusMessage type="error">
          No se pudo cargar la lista. Verifica los permisos de la base de datos
          e inténtalo nuevamente.
        </StatusMessage>
      </div>
    );
  }

  const listaEstudiantes: Estudiante[] = estudiantes ?? [];
  const ids = listaEstudiantes.map((estudiante) => estudiante.id_usuario);

  let correosPorUsuario = new Map<string, string>();

  if (ids.length > 0) {
    const { data: usuarios, error: usuariosError } = await supabase
      .from("usuarios")
      .select("id_usuario, correo")
      .in("id_usuario", ids);

    if (usuariosError || !usuarios) {
      return (
        <div className="mx-auto w-full max-w-6xl">
          <PageHeader
            eyebrow="Administración"
            title="Estudiantes"
            description="Revisa y administra las solicitudes de acceso."
          />
          <StatusMessage type="error">
            No se pudieron cargar los datos de las cuentas. Inténtalo
            nuevamente.
          </StatusMessage>
        </div>
      );
    }

    correosPorUsuario = new Map(
      usuarios.map((usuario) => [usuario.id_usuario, usuario.correo]),
    );
  }

  const columns: DataTableColumn<Estudiante>[] = [
    {
      key: "nombre",
      header: "Nombre",
      render: (estudiante) => (
        <span className="font-medium text-[#252525]">
          {estudiante.nombre_completo}
        </span>
      ),
    },
    {
      key: "matricula",
      header: "Matrícula",
      render: (estudiante) => estudiante.matricula,
    },
    {
      key: "correo",
      header: "Correo",
      render: (estudiante) =>
        correosPorUsuario.get(estudiante.id_usuario) ?? "No disponible",
    },
    {
      key: "carrera",
      header: "Carrera",
      render: (estudiante) => estudiante.carrera ?? "Sin asignar",
    },
    {
      key: "semestre",
      header: "Semestre",
      render: (estudiante) => estudiante.semestre ?? "Sin asignar",
    },
    {
      key: "accion",
      header: "Acción",
      render: (estudiante) => (
        <form action={aprobarEstudianteAction}>
          <input
            type="hidden"
            name="id_usuario"
            value={estudiante.id_usuario}
          />
          <Button type="submit" variant="secondary">
            Aprobar
          </Button>
        </form>
      ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl">
      <PageHeader
        eyebrow="Administración"
        title="Estudiantes"
        description="Revisa las solicitudes y aprueba las cuentas que correspondan."
      />

      {params.estado && mensajes[params.estado] && (
        <div className="mb-6">
          <StatusMessage
            type={params.estado === "aprobado" ? "success" : "error"}
          >
            {mensajes[params.estado]}
          </StatusMessage>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-[#252525]">
            Solicitudes pendientes
          </h2>
          <span className="text-sm text-[#888888]">
            {listaEstudiantes.length}{" "}
            {listaEstudiantes.length === 1 ? "solicitud" : "solicitudes"}
          </span>
        </div>

        {listaEstudiantes.length === 0 ? (
          <EmptyState
            title="No hay solicitudes pendientes"
            description="Cuando un estudiante se registre, su solicitud aparecerá aquí."
          />
        ) : (
          <DataTable
            columns={columns}
            rows={listaEstudiantes}
            getRowKey={(estudiante) => estudiante.id_usuario}
          />
        )}
      </section>
    </div>
  );
}
