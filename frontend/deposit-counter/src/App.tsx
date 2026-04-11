import "@/App.css";
import Home from "@/pages/Home";

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="hero">
        <div className="prose hero-content text-center flex flex-col w-full">
          <h1>Deposit Counter</h1>
        </div>
      </div>
      <div className="flex justify-center w-full">
        <Home />
      </div>
    </div>
  );
}

export default App;
