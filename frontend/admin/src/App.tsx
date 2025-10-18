import "@/App.css";
import { Outlet } from "react-router";

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="w-full flex justify-center">
        <div className="w-full max-w-7xl px-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default App;
