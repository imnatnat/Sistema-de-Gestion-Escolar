import type { ReactNode } from "react";
import { RoleShell } from "@/app/ui/role-shell";

export default function ProfesorLayout({ children }: { children: ReactNode }) {
  return <RoleShell role="profesor">{children}</RoleShell>;
}
