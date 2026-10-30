import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { Sidebar } from "./sidebar";

type Role = "administrador" | "profesor" | "estudiante";

type RoleShellProps = {
  role?: Role;
  children: ReactNode;
};

function isRole(value: string): value is Role {
  return (
    value === "administrador" || value === "profesor" || value === "estudiante"
  );
}

export async function RoleShell({ role, children }: RoleShellProps) {
  const { supabase, userId, email } = await requireUser();

  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id_usuario", userId)
    .maybeSingle();

  if (
    error ||
    !usuario ||
    !isRole(usuario.rol) ||
    (role !== undefined && usuario.rol !== role)
  ) {
    redirect("/inicio");
  }

  const activeRole = usuario.rol;

  return (
    <div className="min-h-screen bg-white">
      <Sidebar role={activeRole} email={email} />

      <div className="min-h-screen pt-14 md:ml-[250px] md:pt-0">
        <div className="min-h-screen px-5 py-7 sm:px-8 md:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
