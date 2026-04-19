import { useAuth } from "@/hooks";
import { Outlet } from "react-router";
import { Header } from "./Header";

export function ProtectedRoute() {
  const { user, loading, login } = useAuth();

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-6">
        <h1 className="text-3xl font-bold">Admin Portal</h1>
        <p className="text-lg opacity-70">
          Please sign in to access this protected area.
        </p>
        <button onClick={login} className="btn btn-primary">
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <Header>
      <div className="py-4">
        <Outlet />
      </div>
    </Header>
  );
}
