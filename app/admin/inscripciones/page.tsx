import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth/session";
import { PageHeader } from "@/app/ui/page-header";
import { DataTable } from "@/app/ui/data-table";
import type { DataTableColumn } from "@/app/ui/data-table";
import { EmptyState } from "@/app/ui/empty-state";
import { StatusMessage } from "@/app/ui/status-message";

import { EnrollmentCreateForm } from "./enrollment-create-form";
import { EnrollmentDeleteForm } from "./enrollment-delete-form";

export const dynamic = "force-dynamic";

type Estudiante = {
  id_usuario: string;
  matricula: string;
  nombre_completo: string;
  aprobado: boolean;
};

type Grupo = {
  id_grupo: string;
  id_materia: string;
  id_profesor: string;
  periodo: string;
  horario: string;
  cupo_maximo: number;
};

type Materia = {
  id_materia: string;
  nombre: string;
  clave: string;
};

type Profesor = {
  id_usuario: string;
  nombre_completo: string;
};

type Inscripcion = {
  id_inscripcion: string;
  id_usuario: string;
  id_grupo: string;
  fecha_inscripcion: string;
};

type InscripcionTabla = {
  id_inscripcion: string;
  estudiante: string;
  matricula: string;
  materia: string;
  profesor: string;
  periodo: string;
  horario: string;
  fecha: string;
  tieneCalificacion: boolean;
};

export default async function AdminInscripcionesPage() {
  const { supabase, userId } = await requireUser();

  const { data: usuario, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (errorRol || usuario?.rol !== "administrador") {
    redirect("/inicio");
  }

  const [
    { data: inscripciones, error: errorInscripciones },
    { data: estudiantes, error: errorEstudiantes },
    { data: grupos, error: errorGrupos },
    { data: materias, error: errorMaterias },
    { data: profesores, error: errorProfesores },
    { data: calificaciones, error: errorCalificaciones },
  ] = await Promise.all([
    supabase
      .from("inscripciones")
      .select("id_inscripcion, id_usuario, id_grupo, fecha_inscripcion")
      .order("fecha_inscripcion", { ascending: false }),

    supabase
      .from("estudiantes")
      .select("id_usuario, matricula, nombre_completo, aprobado")
      .order("nombre_completo"),

    supabase
      .from("grupos")
      .select(
        "id_grupo, id_materia, id_profesor, periodo, horario, cupo_maximo",
      ),

    supabase.from("materias").select("id_materia, nombre, clave"),

    supabase.from("profesores").select("id_usuario, nombre_completo"),

    supabase.from("calificaciones").select("id_inscripcion"),
  ]);

  if (
    errorInscripciones ||
    errorEstudiantes ||
    errorGrupos ||
    errorMaterias ||
    errorProfesores ||
    errorCalificaciones
  ) {
    console.error("Error cargando inscripciones:", {
      inscripciones: errorInscripciones?.code,
      estudiantes: errorEstudiantes?.code,
      grupos: errorGrupos?.code,
      materias: errorMaterias?.code,
      profesores: errorProfesores?.code,
      calificaciones: errorCalificaciones?.code,
    });

    return (
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <PageHeader
          eyebrow="Administración"
          title="Inscripciones"
          description="Administra las inscripciones de los estudiantes."
        />

        <StatusMessage type="error">
          No se pudieron cargar los datos. Verifica los permisos de lectura en
          Supabase e inténtalo nuevamente.
        </StatusMessage>
      </div>
    );
  }

  const listaInscripciones: Inscripcion[] = inscripciones ?? [];
  const listaEstudiantes: Estudiante[] = estudiantes ?? [];
  const listaGrupos: Grupo[] = grupos ?? [];
  const listaMaterias: Materia[] = materias ?? [];
  const listaProfesores: Profesor[] = profesores ?? [];

  const estudiantesPorId = new Map(
    listaEstudiantes.map((estudiante) => [estudiante.id_usuario, estudiante]),
  );

  const gruposPorId = new Map(
    listaGrupos.map((grupo) => [grupo.id_grupo, grupo]),
  );

  const materiasPorId = new Map(
    listaMaterias.map((materia) => [materia.id_materia, materia]),
  );

  const profesoresPorId = new Map(
    listaProfesores.map((profesor) => [profesor.id_usuario, profesor]),
  );

  const inscripcionesConCalificacion = new Set(
    (calificaciones ?? []).map((calificacion) => calificacion.id_inscripcion),
  );

  const estudiantesAprobados = listaEstudiantes.filter(
    (estudiante) => estudiante.aprobado,
  );

  const gruposDisponibles = listaGrupos.filter(
    (grupo) => Number.isInteger(grupo.cupo_maximo) && grupo.cupo_maximo > 0,
  );

  const opcionesGrupos = gruposDisponibles.map((grupo) => {
    const materia = materiasPorId.get(grupo.id_materia);
    const profesor = profesoresPorId.get(grupo.id_profesor);

    const nombreMateria = materia
      ? `${materia.clave} — ${materia.nombre}`
      : "Materia no disponible";

    return {
      id_grupo: grupo.id_grupo,
      etiqueta: `${nombreMateria} | ${grupo.periodo} | ${grupo.horario} | Cupo: ${grupo.cupo_maximo}${profesor ? ` | ${profesor.nombre_completo}` : ""}`,
    };
  });

  const filas: InscripcionTabla[] = listaInscripciones.map((inscripcion) => {
    const estudiante = estudiantesPorId.get(inscripcion.id_usuario);
    const grupo = gruposPorId.get(inscripcion.id_grupo);

    const materia = grupo ? materiasPorId.get(grupo.id_materia) : undefined;

    const profesor = grupo ? profesoresPorId.get(grupo.id_profesor) : undefined;

    return {
      id_inscripcion: inscripcion.id_inscripcion,
      estudiante: estudiante?.nombre_completo ?? "No disponible",
      matricula: estudiante?.matricula ?? "No disponible",
      materia: materia
        ? `${materia.clave} — ${materia.nombre}`
        : "No disponible",
      profesor: profesor?.nombre_completo ?? "No disponible",
      periodo: grupo?.periodo ?? "No disponible",
      horario: grupo?.horario ?? "No disponible",
      fecha: new Date(inscripcion.fecha_inscripcion).toLocaleString("es-MX", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Monterrey",
      }),
      tieneCalificacion: inscripcionesConCalificacion.has(
        inscripcion.id_inscripcion,
      ),
    };
  });

  const columns: DataTableColumn<InscripcionTabla>[] = [
    {
      key: "estudiante",
      header: "Estudiante",
      render: (fila) => (
        <span className="font-medium text-[#252525]">{fila.estudiante}</span>
      ),
    },
    {
      key: "matricula",
      header: "Matrícula",
      render: (fila) => (
        <span className="font-mono text-xs text-[#555555]">
          {fila.matricula}
        </span>
      ),
    },
    {
      key: "materia",
      header: "Materia",
      render: (fila) => fila.materia,
    },
    {
      key: "profesor",
      header: "Profesor",
      render: (fila) => fila.profesor,
    },
    {
      key: "periodo",
      header: "Periodo",
      render: (fila) => fila.periodo,
    },
    {
      key: "horario",
      header: "Horario",
      render: (fila) => fila.horario,
    },
    {
      key: "fecha",
      header: "Fecha de inscripción",
      render: (fila) => (
        <span className="whitespace-nowrap text-xs text-[#666666]">
          {fila.fecha}
        </span>
      ),
    },
    {
      key: "accion",
      header: "Acción",
      render: (fila) =>
        fila.tieneCalificacion ? (
          <span className="text-xs text-[#888888]">Tiene calificación</span>
        ) : (
          <EnrollmentDeleteForm idInscripcion={fila.id_inscripcion} />
        ),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-7">
      <PageHeader
        eyebrow="Administración"
        title="Inscripciones"
        description="Administra las inscripciones de los estudiantes y consulta sus grupos asignados."
      />

      <EnrollmentCreateForm
        estudiantes={estudiantesAprobados.map((estudiante) => ({
          id_usuario: estudiante.id_usuario,
          matricula: estudiante.matricula,
          nombre_completo: estudiante.nombre_completo,
        }))}
        grupos={opcionesGrupos}
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-[#252525]">
            Inscripciones registradas
          </h2>

          <span className="text-sm text-[#888888]">
            {listaInscripciones.length}{" "}
            {listaInscripciones.length === 1 ? "inscripción" : "inscripciones"}
          </span>
        </div>

        {listaInscripciones.length === 0 ? (
          <EmptyState
            title="Todavía no hay inscripciones registradas"
            description="Cuando inscribas a un estudiante, aparecerá en esta lista."
          />
        ) : (
          <DataTable
            columns={columns}
            rows={filas}
            getRowKey={(fila) => fila.id_inscripcion}
          />
        )}
      </section>
    </div>
  );
}
