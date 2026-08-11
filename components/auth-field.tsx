"use client";

type AuthFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  hint?: string;
  minLength?: number;
  maxLength?: number;
  disabled?: boolean;
};

export function AuthField({
  label,
  name,
  value,
  onChange,
  type = "text",
  autoComplete,
  hint,
  minLength,
  maxLength,
  disabled,
}: AuthFieldProps) {
  return (
    <label className="auth-field" htmlFor={name}>
      <span>{label}</span>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={maxLength}
        disabled={disabled}
        required
      />
      {hint && <small>{hint}</small>}
    </label>
  );
}
