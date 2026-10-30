import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[#DDDDDA] bg-[#FAFAF9] px-5 py-12 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[#EEEEEC] text-[#777777]">
        <Inbox size={21} strokeWidth={1.7} />
      </div>

      <h3 className="text-sm font-semibold text-[#373737]">{title}</h3>

      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-[#888888]">
          {description}
        </p>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
