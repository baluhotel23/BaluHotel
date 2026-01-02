import React from "react";

const DataTreatment = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            POLÍTICA DE PROTECCIÓN DE NIÑOS, NIÑAS Y ADOLESCENTES
          </h1>
          <div className="mt-4 text-gray-700">
            <p className="font-semibold text-lg">Hotel Balú</p>
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

        {/* Contenido principal */}
        <section>
          <div className="space-y-6 text-gray-700 leading-relaxed text-lg">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
              <p className="font-semibold text-gray-900 mb-4">
                Hotel Balú cumple estrictamente con la Ley 1098 de 2006 (Código
                de la Infancia y la Adolescencia), la Ley 679 de 2001 y la Ley
                704 de 2001, orientadas a la prevención de la explotación sexual
                y comercial de menores de edad.
              </p>
            </div>

            <div className="bg-white border-2 border-purple-200 p-6 rounded-lg">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                <svg
                  className="w-6 h-6 mr-2 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Compromiso del Hotel
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>
                    Todo huésped que se presente con menores de edad deberá
                    acreditar el parentesco o autorización legal, presentando el
                    Registro Civil del menor.
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="inline-block w-2 h-2 bg-purple-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span>
                    El hotel reportará a las autoridades competentes cualquier
                    situación sospechosa que atente contra los derechos de los
                    menores.
                  </span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg">
              <div className="flex items-start">
                <svg
                  className="w-8 h-8 text-yellow-600 mr-3 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <p className="font-semibold text-yellow-900">
                  Hotel Balú tiene TOLERANCIA CERO frente a cualquier forma de
                  explotación, abuso o turismo sexual que involucre a niños,
                  niñas y adolescentes. Estas conductas serán denunciadas de
                  inmediato ante las autoridades competentes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-300 text-center">
          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-semibold text-gray-800">
              Proteger a nuestros niños es responsabilidad de todos
            </p>
            <p>
              © {new Date().getFullYear()} Hotel Balú. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataTreatment;
