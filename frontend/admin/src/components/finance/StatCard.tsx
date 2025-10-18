interface StatCardProps {
  title: string;
  value: number;
  variant?: "default" | "success" | "error";
}

export function StatCard({ title, value, variant = "default" }: StatCardProps) {
  const variantClasses = {
    default: "bg-base-100 text-base-content",
    success: "bg-success text-success-content",
    error: "bg-error text-error-content",
  };

  return (
    <div className={`card shadow p-4 ${variantClasses[variant]}`}>
      <div className="text-sm opacity-70">{title}</div>
      <div className="text-2xl font-bold tabular-nums">
        $
        {value.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>
    </div>
  );
}
