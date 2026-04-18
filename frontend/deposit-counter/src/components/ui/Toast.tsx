interface ToastProps {
  message: string;
  isError?: boolean;
}

export default function Toast({ message, isError = false }: ToastProps) {
  if (!message) return null;
  return (
    <div className="toast toast-end z-50" role="alert">
      <div className={`alert ${isError ? "alert-error" : "alert-success"}`}>
        <span>{message}</span>
      </div>
    </div>
  );
}
