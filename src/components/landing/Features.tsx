import { Building2, Users, MapPin } from "lucide-react";

export default function Features() {
  return (
    <section id="features" className="py-20 text-center">

      <h2 className="text-3xl font-bold mb-10">
        Funcionalidades
      </h2>

      <div className="grid md:grid-cols-3 gap-6 px-6">

        <div className="p-6 bg-white shadow-lg rounded-xl hover:scale-105 transition">
          <Building2 className="mx-auto mb-3" />
          <h3>Empresas</h3>
        </div>

        <div className="p-6 bg-white shadow-lg rounded-xl hover:scale-105 transition">
          <Users className="mx-auto mb-3" />
          <h3>Contatos</h3>
        </div>

        <div className="p-6 bg-white shadow-lg rounded-xl hover:scale-105 transition">
          <MapPin className="mx-auto mb-3" />
          <h3>Mapa</h3>
        </div>

      </div>
    </section>
  );
}