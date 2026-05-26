import { useAuth } from "@/hooks";
import { Gauge, TriangleAlert } from "lucide-react";
import { Outlet } from "react-router";
import { Header } from "./Header";

export function ProtectedRoute() {
  const { user, loading, isAuthorized, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  // Premium layout wrapper for unauthenticated states
  const AuthLayout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-base-200 via-base-100 to-base-300 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary/20 rounded-full blur-[100px] mix-blend-multiply animate-pulse pointer-events-none"></div>
      <div
        className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-secondary/20 rounded-full blur-[100px] mix-blend-multiply animate-pulse pointer-events-none"
        style={{ animationDelay: "2s" }}
      ></div>

      {/* Glassmorphism Card */}
      <div className="card w-full max-w-md bg-base-100/70 backdrop-blur-2xl shadow-2xl border border-base-content/5 z-10 transition-all duration-500 hover:shadow-primary/10 hover:border-primary/20 m-4">
        <div className="card-body items-center text-center p-10">
          {children}
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <AuthLayout>
        <div className="w-20 h-20 bg-gradient-to-tr from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 mb-6 transform transition-transform hover:scale-105 hover:rotate-3 duration-300">
          <Gauge className="h-10 w-10 text-primary-content" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-base-content to-base-content/60 mb-2">
          Admin Portal
        </h1>
        <button
          onClick={login}
          className="btn btn-outline btn-primary w-full group"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform"
            viewBox="0 0 48 48"
          >
            <path
              fill="#FFC107"
              d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
            />
            <path
              fill="#FF3D00"
              d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
            />
            <path
              fill="#1976D2"
              d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
            />
          </svg>
          Sign in with Google
        </button>
      </AuthLayout>
    );
  }

  if (!isAuthorized) {
    return (
      <AuthLayout>
        <div
          className="w-20 h-20 bg-gradient-to-tr from-error to-error/60 rounded-2xl flex items-center justify-center shadow-lg shadow-error/30 mb-6 animate-bounce"
          style={{ animationIterationCount: 1 }}
        >
          <TriangleAlert className="h-10 w-10 text-error-content" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-base-content to-base-content/60 mb-2">
          Access Denied
        </h1>
        <p className="text-base opacity-70 mb-8 leading-relaxed">
          <span className="font-semibold text-base-content">{user.email}</span>{" "}
          is not authorized to access this portal. Please contact a system
          administrator to request privileges.
        </p>
        <button
          onClick={logout}
          className="btn btn-outline btn-error w-full hover:shadow-lg hover:shadow-error/20 transition-all duration-300"
        >
          Sign Out
        </button>
      </AuthLayout>
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
