import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "../pages/Landing";
import Cadastro from "../pages/Cadastro";
import Login from "../pages/login";
import AtivarConta from "../pages/ativar";
import Dashboard from "../pages/dashboard";
import TodosClientes from "../pages/clientes";
import EmpresaView from "../pages/clientes/[id]";
import EmpresaEdit from "../pages/clientes/[id]/editar";
import NovaEmpresa from "../pages/empresas/nova";

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
        <Route path="/clientes/:id" element={<EmpresaView />} />
        <Route path="/clientes/:id/editar" element={<EmpresaEdit />} />
        <Route path="/empresas/nova" element={<NovaEmpresa />} />
      </Routes>
    </BrowserRouter>
  );
}
