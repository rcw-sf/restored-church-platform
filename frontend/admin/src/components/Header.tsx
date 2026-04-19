import { useAuth } from "@/hooks";
import type { ReactNode } from "react";

interface HeaderProps {
  children: ReactNode;
}

export function Header({ children }: HeaderProps) {
  const { user, logout } = useAuth();

  if (!user) return <>{children}</>;

  return (
    <div className="drawer">
      <input id="admin-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col">
        {/* Navbar */}
        <nav className="navbar bg-base-100 border-b border-base-200 w-full mb-4 px-4">
          <div className="flex-none">
            <label
              htmlFor="admin-drawer"
              className="btn btn-square btn-ghost drawer-button"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                className="inline-block w-5 h-5 stroke-current"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                ></path>
              </svg>
            </label>
          </div>
          <div className="flex-1">
            <span className="text-xl font-bold px-2">Admin Portal</span>
          </div>
        </nav>
        {/* Page Content */}
        <main className="w-full flex justify-center">
          <div className="w-full max-w-7xl px-4">{children}</div>
        </main>
      </div>
      {/* Sidebar */}
      <div className="drawer-side z-50">
        <label
          htmlFor="admin-drawer"
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>
        <div className="menu p-4 w-80 min-h-full bg-base-200 text-base-content">
          <div className="px-4 py-6 mb-2 border-b border-base-300">
            <div className="text-lg font-bold">{user.displayName}</div>
            <div className="text-sm opacity-60">{user.email}</div>
          </div>
          <ul className="mt-4">
            <li>
              <button onClick={logout} className="btn btn-error btn-outline">
                Logout
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
