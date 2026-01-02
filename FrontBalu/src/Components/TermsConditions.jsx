import React from "react";

const TermsConditions = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-xl p-8 md:p-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            TÉRMINOS Y CONDICIONES DE RESERVA Y ESTADÍA
          </h1>
          <div className="mt-4 text-gray-700">
            <p className="font-semibold">Hotel Balú</p>
            <p className="text-sm italic text-gray-600 mt-2">
              Tu descanso con elegancia en el corazón del Llano.
            </p>
          </div>
        </div>

        <hr className="my-8 border-gray-300" />

        {/* Introducción */}
        <section className="mb-8">
          <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-lg">
            <p className="text-gray-700 leading-relaxed">
              Al realizar una reserva en Hotel Balú, el huésped acepta expresa y
              voluntariamente los siguientes términos y condiciones:
            </p>
          </div>
        </section>

        {/* Secciones */}
        <div className="space-y-8">
          {/* Reservas y pagos */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                1
              </span>
              Reservas y pagos
            </h2>
            <div className="ml-11 space-y-3 text-gray-700">
              <p className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                Toda reserva debe contar con abono previo para ser confirmada.
                Las reservas sin abono no se harán efectivas.
              </p>
              <p className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                Las habitaciones serán asignadas según disponibilidad del hotel.
              </p>
            </div>
          </section>

          {/* Modificaciones y cancelaciones */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                2
              </span>
              Modificaciones y cancelaciones
            </h2>
            <div className="ml-11 space-y-3 text-gray-700">
              <p className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                Las modificaciones de fecha deben solicitarse con un mínimo de
                cinco (5) días calendario antes de la fecha programada.
              </p>
              <p className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                <strong>Hotel Balú no realiza devoluciones de dinero.</strong>
              </p>
              <p className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                En caso de no poder asistir, el hotel otorgará un plazo máximo
                de treinta (30) días calendario para hacer uso de la reserva.
              </p>
              <p className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                Si el huésped no se presenta y no realiza cancelación o
                modificación, Hotel Balú podrá retener el anticipo realizado.
              </p>
            </div>
          </section>

          {/* Tarifas y ocupación */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                3
              </span>
              Tarifas y ocupación
            </h2>
            <div className="ml-11 space-y-3 text-gray-700">
              <p className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                Todo niño mayor de 5 años paga tarifa completa.
              </p>
              <p className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                En caso de presentarse con acompañante adicional no registrado en
                la reserva, se realizará el cobro correspondiente.
              </p>
            </div>
          </section>

          {/* Check-in y Check-out */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                4
              </span>
              Check-in y Check-out
            </h2>
            <div className="ml-11 space-y-3 text-gray-700">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="font-semibold text-blue-900 mb-2">
                  <span className="text-green-600">✓</span> Check-in: 3:00 p.m.
                </p>
                <p className="text-sm text-blue-800">
                  (ingresos antes de esta hora pueden generar costos adicionales)
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="font-semibold text-orange-900 mb-2">
                  <span className="text-green-600">✓</span> Check-out: 11:00 a.m.
                </p>
                <p className="text-sm text-orange-800">
                  (salidas posteriores pueden generar costos adicionales)
                </p>
              </div>
            </div>
          </section>

          {/* Documentación */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                5
              </span>
              Documentación
            </h2>
            <div className="ml-11 text-gray-700">
              <p className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                Todos los visitantes deben presentar documento de identidad
                original al momento del check-in.
              </p>
            </div>
          </section>

          {/* Parqueadero */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                6
              </span>
              Parqueadero
            </h2>
            <div className="ml-11 space-y-3 text-gray-700">
              <p className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                El servicio de parqueadero aplica hasta las 11:00 a.m.
              </p>
              <p className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                Si el huésped entrega la habitación y deja el vehículo en el
                parqueadero, deberá cancelar la tarifa correspondiente
                directamente con el encargado.
              </p>
            </div>
          </section>

          {/* Mascotas */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                7
              </span>
              Mascotas 🐾
            </h2>
            <div className="ml-11 space-y-3 text-gray-700">
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="font-semibold text-purple-900 mb-3">
                  Hotel Balú es un hotel pet friendly 🐶
                </p>
                <div className="space-y-2 text-gray-700">
                  <p className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    El huésped deberá traer los elementos necesarios para la
                    comodidad de su mascota.
                  </p>
                  <p className="flex items-start">
                    <span className="text-green-600 mr-2">•</span>
                    El propietario será responsable por cualquier daño o
                    perjuicio ocasionado por el animal.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Responsabilidad por daños */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
              <span className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center mr-3 text-sm">
                8
              </span>
              Responsabilidad por daños
            </h2>
            <div className="ml-11 text-gray-700">
              <p className="flex items-start">
                <span className="text-green-600 mr-2">•</span>
                Todo daño ocasionado en la habitación o áreas comunes será
                cargado a la cuenta del huésped.
              </p>
            </div>
          </section>
        </div>

        <hr className="my-8 border-gray-300" />

        {/* Condiciones de comercio electrónico */}
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            CONDICIONES DE COMERCIO ELECTRÓNICO
          </h2>
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg space-y-3 text-gray-700">
            <p>
              Las reservas realizadas por medios digitales (WhatsApp, redes
              sociales, página web o transferencias electrónicas) se rigen por la
              Ley 527 de 1999, la Ley 1480 de 2011 (Estatuto del Consumidor) y
              demás normas aplicables.
            </p>
            <p className="font-semibold text-yellow-900">
              Al realizar un pago, el cliente declara haber leído, entendido y
              aceptado estas políticas, términos y condiciones.
            </p>
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-300 text-center">
          <p className="text-2xl font-bold text-green-700 mb-2">Hotel Balú</p>
          <p className="text-gray-600 italic mb-4">
            Tu descanso con elegancia en el corazón del Llano.
          </p>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Hotel Balú. Todos los derechos
            reservados.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsConditions;
