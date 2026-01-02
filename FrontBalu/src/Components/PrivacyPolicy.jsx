import React from "react";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            POLÍTICA DE PRIVACIDAD
          </h1>
          <p className="text-sm text-gray-600 italic">
            (Documento independiente para publicación web y firma digital)
          </p>
          <div className="mt-4 text-gray-700">
            <p className="font-semibold">Hotel Balú</p>
            <p>Cl. 8 #8-57, Centro, Restrepo, Meta</p>
            <p>
              Correo:{" "}
              <a
                href="mailto:servicioalcliente@hotelbalu.com.co"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                servicioalcliente@hotelbalu.com.co
              </a>
            </p>
          </div>
        </div>

        <hr className="my-8 border-gray-300" />

        {/* Sección 1: Política de Privacidad */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            1. POLÍTICA DE PRIVACIDAD Y TRATAMIENTO DE DATOS PERSONALES
          </h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              En cumplimiento de la Ley 1581 de 2012, el Decreto 1377 de 2013 y
              demás normas concordantes, Hotel Balú informa que los datos
              personales suministrados por sus huéspedes, visitantes y clientes
              serán tratados de manera responsable, segura y confidencial.
            </p>

            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Finalidades del tratamiento
              </h3>
              <p className="mb-2">
                Los datos personales recolectados durante el proceso de reserva,
                check-in, estadía y check-out serán utilizados para:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Verificar la identidad de los huéspedes.</li>
                <li>
                  Realizar el registro hotelero exigido por la normativa
                  colombiana.
                </li>
                <li>
                  Garantizar la seguridad de huéspedes, colaboradores y
                  visitantes.
                </li>
                <li>Gestionar reservas, pagos y servicios contratados.</li>
                <li>
                  Enviar información relacionada con la estadía, promociones o
                  novedades del hotel (previa autorización).
                </li>
                <li>
                  Cumplir obligaciones legales ante autoridades administrativas
                  y judiciales.
                </li>
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Derechos del titular de los datos
              </h3>
              <p>
                El titular podrá ejercer en cualquier momento sus derechos a
                conocer, actualizar, rectificar o solicitar la supresión de sus
                datos personales, enviando una solicitud al correo:{" "}
                <a
                  href="mailto:servicioalcliente@hotelbalu.com.co"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  servicioalcliente@hotelbalu.com.co
                </a>
                .
              </p>
              <p className="mt-3 font-semibold">
                Hotel Balú no vende, cede ni comparte datos personales con
                terceros, salvo obligación legal.
              </p>
            </div>
          </div>
        </section>

        <hr className="my-8 border-gray-300" />

        {/* Sección 2: Política de Protección de Menores */}
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            POLÍTICA DE PROTECCIÓN DE NIÑOS, NIÑAS Y ADOLESCENTES
          </h2>
          <div className="space-y-4 text-gray-700 leading-relaxed">
            <p>
              Hotel Balú cumple estrictamente con la Ley 1098 de 2006 (Código de
              la Infancia y la Adolescencia), la Ley 679 de 2001 y la Ley 704 de
              2001, orientadas a la prevención de la explotación sexual y
              comercial de menores de edad.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>
                Todo huésped que se presente con menores de edad deberá acreditar
                el parentesco o autorización legal, presentando el Registro Civil
                del menor.
              </li>
              <li>
                El hotel reportará a las autoridades competentes cualquier
                situación sospechosa que atente contra los derechos de los
                menores.
              </li>
            </ul>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-300 text-center text-sm text-gray-600">
          <p>© {new Date().getFullYear()} Hotel Balú. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
