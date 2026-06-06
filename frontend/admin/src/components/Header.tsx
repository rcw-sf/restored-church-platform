import { useAuth } from "@/hooks";
import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

interface HeaderProps {
  children: ReactNode;
}

const closeDrawer = () => {
  document.getElementById("admin-drawer")?.click();
};

export function Header({ children }: HeaderProps) {
  const { user, logout } = useAuth();
  const { tenantId } = useParams();

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
              <Menu className="w-6 h-6" />
            </label>
          </div>
          <div className="flex-1">
            <span className="text-xl font-bold px-2">Admin Portal</span>
          </div>
        </nav>
        {/* Page Content */}
        <main className="w-full flex justify-center">
          <div className="w-full max-w-7xl px-4 pb-20">{children}</div>
        </main>
      </div>
      {/* Sidebar */}
      <div className="drawer-side z-50">
        <label
          htmlFor="admin-drawer"
          aria-label="close sidebar"
          className="drawer-overlay"
        ></label>
        <div className="menu p-4 pb-20 w-full md:w-80 min-h-screen bg-base-100 text-base-content flex flex-col">
          {/* Close button */}
          <button
            onClick={closeDrawer}
            className="btn btn-ghost btn-sm btn-square absolute top-2 right-2"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="px-4 py-6 mb-2 border-b border-base-300">
            <div className="text-lg font-bold">{user.displayName}</div>
            <div className="text-sm opacity-60">{user.email}</div>
          </div>
          <ul className="menu menu-md p-0 mt-4 space-y-1 flex-grow">
            <li>
              <Link
                to={`/${tenantId}/members`}
                className="font-semibold text-primary"
                onClick={closeDrawer}
              >
                Members
              </Link>
            </li>
          </ul>
          <div className="mt-auto pt-4 border-t border-base-300">
            <button
              onClick={logout}
              className="btn btn-error btn-outline w-full"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
