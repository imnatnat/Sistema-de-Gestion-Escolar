import type { ReactNode } from "react";
import { RoleShell } from "@/app/ui/role-shell";

export default function InicioLayout({ children }: { children: ReactNode }) {
  return <RoleShell>{children}</RoleShell>;
}
