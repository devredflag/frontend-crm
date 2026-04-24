import { Zap } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12">

      <div className="max-w-7xl mx-auto px-6">

        <div className="grid md:grid-cols-4 gap-10">

          {/* LOGO */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                <Zap className="text-white w-4 h-4" />
              </div>
              <span className="font-bold text-white">ProspectCRM</span>
            </div>

            <p className="text-sm">
              CRM de prospecção inteligente para empresas B2B.
            </p>
          </div>

          {/* LINKS */}
          <div>
            <h4 className="font-semibold text-white mb-3">Produto</h4>
            <ul className="space-y-2 text-sm">
              <li>Funcionalidades</li>
              <li>Benefícios</li>
              <li>Dashboard</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3">Empresa</h4>
            <ul className="space-y-2 text-sm">
              <li>Sobre</li>
              <li>Contato</li>
              <li>Suporte</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>Termos</li>
              <li>Privacidade</li>
            </ul>
          </div>

        </div>

        {/* LINHA FINAL */}
        <div className="border-t border-gray-700 mt-10 pt-6 text-center text-sm">
          © {new Date().getFullYear()} ProspectCRM. Todos os direitos reservados.
        </div>

      </div>
    </footer>
  );
}