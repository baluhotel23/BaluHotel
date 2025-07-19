import React from 'react';

const CheckOutHeader = ({ statistics }) => (
  <div className="bg-white shadow-sm border-b border-gray-200">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="py-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🏁 Gestión de Check-Out
            </h1>
            <p className="mt-2 text-gray-600">
              Administra pagos, facturas y check-outs - Ordenado por fecha de salida
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
            <div className="bg-red-50 p-3 rounded-lg">
              <div className="text-lg font-bold text-red-600">{statistics.overdue}</div>
              <div className="text-xs text-red-600">Vencidos</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <div className="text-lg font-bold text-orange-600">{statistics.today}</div>
              <div className="text-xs text-orange-600">Hoy</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-lg font-bold text-yellow-600">{statistics.tomorrow}</div>
              <div className="text-xs text-yellow-600">Mañana</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-lg font-bold text-green-600">{statistics.readyForCheckout}</div>
              <div className="text-xs text-green-600">Listas</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default React.memo(CheckOutHeader);