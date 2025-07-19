import React from 'react';

const CheckOutFilters = ({
  filters,
  sortBy,
  setSortBy,
  handleFilterChange,
  applyFilters,
  clearFilters,
  isLoading
}) => (
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            📊 Ordenar por:
          </label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="checkOut">📅 Fecha de salida</option>
            <option value="status">🎯 Prioridad de procesamiento</option>
            <option value="amount">💰 Monto pendiente</option>
            <option value="room">🚪 Número habitación</option>
            <option value="created">🕐 Fecha creación</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Estado:</label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos los estados</option>
            <option value="confirmed">Confirmadas</option>
            <option value="paid">Pagadas</option>
            <option value="checked-in">Check-in</option>
            <option value="completed">Completadas</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Habitación:</label>
          <input
            type="text"
            value={filters.roomNumber}
            onChange={(e) => handleFilterChange("roomNumber", e.target.value)}
            placeholder="Ej: 101"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Documento Huésped:</label>
          <input
            type="text"
            value={filters.guestId}
            onChange={(e) => handleFilterChange("guestId", e.target.value)}
            placeholder="Documento"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex items-end gap-2">
          <button
            onClick={applyFilters}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            🔍 Filtrar
          </button>
          <button
            onClick={clearFilters}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 transition-colors"
          >
            🧹
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default React.memo(CheckOutFilters);