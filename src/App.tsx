import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { bootstrapAuth } from "./services/auth";
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
  // Ao carregar/recarregar a página, restaura a sessão a partir do cookie httpOnly
  // (o access token vive só em memória). Só renderiza as rotas após essa tentativa,
  // garantindo que páginas protegidas e callbacks OAuth já tenham o token.
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    bootstrapAuth().finally(() => setPronto(true));
  }, []);

  if (!pronto) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F6F7F8",
          color: "#2563EB",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Carregando...
      </div>
    );
  }

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