import type { ReactNode } from "react";

type StatusType = "success" | "error" | "warning" | "info";

type StatusMessageProps = {
  type: StatusType;
  children: ReactNode;
};

const styles: Record<StatusType, string> = {
  success: "border-[#D8E8DC] bg-[#F3F8F4] text-[#28623A]",
  error: "border-[#F0D5D2] bg-[#FEF5F4] text-[#A12B23]",
  warning: "border-[#EDE2C7] bg-[#FCF8ED] text-[#80601C]",
  info: "border-[#DCE4EA] bg-[#F4F7FA] text-[#405D75]",
};

export function StatusMessage({ type, children }: StatusMessageProps) {
  return (
    <div
      role={type === "error" ? "alert" : "status"}
      className={`rounded-md border px-4 py-3 text-sm leading-6 ${styles[type]}`}
    >
      {children}
    </div>
  );
}
