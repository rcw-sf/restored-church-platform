import App from "@/App";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Finance from "@/pages/Finance";
import Home from "@/pages/Home";
import { AuthProvider } from "@/providers/AuthProvider";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter } from "react-router";
import { RouterProvider } from "react-router/dom";

const router = createBrowserRouter([
  {
    path: "/",
    Component: App,
    children: [
      // Protected Routes with Tenant ID
      {
        path: ":tenantId",
        element: (
          <AuthProvider>
            <ProtectedRoute />
          </AuthProvider>
        ),
        children: [
          {
            index: true,
            Component: Home,
          },
        ],
      },
      // Public Routes
      {
        path: "finance",
        Component: Finance,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="min-h-screen w-full">
      <RouterProvider router={router} />
    </div>
  </StrictMode>,
);
