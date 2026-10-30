import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from "react";

const controlClass =
  "w-full rounded-md border border-[#E5E5E3] bg-white px-3 py-2.5 text-sm text-[#252525] outline-none transition-colors placeholder:text-[#A3A3A3] hover:border-[#C9C9C6] focus:border-[#999999] focus:ring-2 focus:ring-[#EAEAE8] disabled:cursor-not-allowed disabled:bg-[#F7F7F5] disabled:text-[#999999]";

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-[#373737]"
      >
        {label}
      </label>

      {children}

      {error ? (
        <p className="text-xs text-[#B42318]" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-[#999999]">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${controlClass} ${className}`} {...props} />;
}

export function SelectInput({
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${controlClass} ${className}`} {...props} />;
}

export function TextAreaInput({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`${controlClass} min-h-24 resize-y ${className}`}
      {...props}
    />
  );
}
