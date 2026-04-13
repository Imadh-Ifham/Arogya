import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<div className="text-3xl">Hello, Vite + React!</div>}
        />
        {/* Add more routes here as your app grows */}
      </Routes>
    </Router>
  );
}

export default App;
