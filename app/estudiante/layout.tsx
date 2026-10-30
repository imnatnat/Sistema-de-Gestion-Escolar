import type { ReactNode } from "react";
import { RoleShell } from "@/app/ui/role-shell";

export default function EstudianteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <RoleShell role="estudiante">{children}</RoleShell>;
}
