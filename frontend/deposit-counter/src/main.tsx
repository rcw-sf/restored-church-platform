import App from "@/App.tsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="min-h-screen w-full">
      <App />
    </div>
  </StrictMode>,
);
