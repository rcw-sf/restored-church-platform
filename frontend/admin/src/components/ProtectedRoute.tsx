import { useAuth } from "@/hooks";
import { FcGoogle } from "react-icons/fc";
import { IoWarning } from "react-icons/io5";
import { RiDashboard2Line } from "react-icons/ri";
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
          <RiDashboard2Line className="h-10 w-10 text-primary-content" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-base-content to-base-content/60 mb-2">
          Admin Portal
        </h1>
        <button
          onClick={login}
          className="btn btn-primary w-full shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all duration-300 group"
        >
          <FcGoogle className="mr-2 transition-transform duration-300 group-hover:rotate-12" />
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
          <IoWarning className="h-10 w-10 text-error-content" />
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
