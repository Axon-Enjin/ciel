type AuthAlertVariant = "error" | "success" | "info";

const styles: Record<AuthAlertVariant, string> = {
  error: "border-[var(--color-error)]/30 bg-red-50 text-[var(--color-error)]",
  success: "border-[var(--color-success)]/30 bg-green-50 text-[var(--color-success)]",
  info: "border-[var(--color-primary)]/30 bg-[var(--color-bg)] text-[var(--color-text)]",
};

export function AuthAlert({
  variant,
  children,
}: {
  variant: AuthAlertVariant;
  children: React.ReactNode;
}) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`rounded-control border px-4 py-3 text-sm ${styles[variant]}`}
    >
      {children}
    </div>
  );
}
