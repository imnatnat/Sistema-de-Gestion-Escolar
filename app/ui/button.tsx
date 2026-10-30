import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#252525] text-white hover:bg-[#3D3D3D]",
  secondary:
    "border border-[#E5E5E3] bg-white text-[#373737] hover:bg-[#F7F7F5]",
  danger: "border border-[#F0D5D2] bg-white text-[#B42318] hover:bg-[#FEF3F2]",
  ghost: "bg-transparent text-[#666666] hover:bg-[#F0F0EE]",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#A3A3A3] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
