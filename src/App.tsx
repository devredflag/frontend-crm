import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Cadastro from "./pages/Cadastro";
import AtivarConta from "./pages/ativar";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import NovaEmpresa from "./pages/empresas/nova";
import Clientes from "./pages/clientes";

function App() {
  return (
    <Router>
      <Routes>

        <Route path="/" element={<Landing />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/ativar" element={<AtivarConta />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/empresas/nova" element={<NovaEmpresa />} />
        <Route path="/clientes" element={<Clientes />} />
        
        

        {/* 404 */}
        <Route path="*" element={<div>Página não encontrada</div>} />

      </Routes>
    </Router>
  );
}

export default App;