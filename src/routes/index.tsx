import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "../pages/Landing";
import Cadastro from "../pages/Cadastro";
import Login from "../pages/login";
import AtivarConta from "../pages/ativar";
import Dashboard from "../pages/dashboard";
import TodosClientes from "../pages/clientes";
import BuscarEmpresas from "../pages/buscar";
import Gerenciamento from "../pages/gerenciamento";
import Calendario from "../pages/calendario";
import EmpresaView from "../pages/clientes/detalhe";
import EmpresaEdit from "../pages/clientes/detalhe/editar";
import NovaEmpresa from "../pages/empresas/nova";
import GoogleCallback from "../pages/auth/GoogleCallback";
import OutlookCallback from "../pages/auth/OutlookCallback";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/login" element={<Login />} />
        <Route path="/ativar" element={<AtivarConta />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/clientes" element={<TodosClientes />} />
        <Route path="/buscar" element={<BuscarEmpresas />} />
        <Route path="/gerenciamento" element={<Gerenciamento />} />
        <Route path="/calendario" element={<Calendario />} />
        <Route path="/clientes/:id" element={<EmpresaView />} />
        <Route path="/clientes/:id/editar" element={<EmpresaEdit />} />
        <Route path="/empresas/nova" element={<NovaEmpresa />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />
        <Route path="/auth/outlook/callback" element={<OutlookCallback />} />
      </Routes>
    </BrowserRouter>
  );
}