import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Cadastro from "./pages/Cadastro";
import AtivarConta from "./pages/ativar";
import Login from "./pages/login";
import Signup from "./pages/signup";
import Dashboard from "./pages/dashboard";
import Equipe from "./pages/equipe";
import NovaEmpresa from "./pages/empresas/nova";
import Clientes from "./pages/clientes";
import EmpresaView from "./pages/clientes/detalhe";
import EmpresaEdit from "./pages/clientes/detalhe/editar";
import Perfil from "./pages/perfil";
import Calendario from "./pages/calendario";
import Gerenciamento from "./pages/gerenciamento";
import OutlookCallback from "./pages/auth/OutlookCallback";
import GoogleCallback from "./pages/auth/GoogleCallback";
import BuscarEmpresas from "./pages/buscar";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/ativar" element={<AtivarConta />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/equipe" element={<Equipe />} />
        <Route path="/empresas/nova" element={<NovaEmpresa />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/:id" element={<EmpresaView />} />
        <Route path="/clientes/:id/editar" element={<EmpresaEdit />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/gerenciamento" element={<Gerenciamento />} />
        <Route path="/buscar" element={<BuscarEmpresas />} />
        <Route path="/auth/outlook/callback" element={<OutlookCallback />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="*" element={<div>Página não encontrada</div>} />
      </Routes>
    </Router>
  );
}

export default App;