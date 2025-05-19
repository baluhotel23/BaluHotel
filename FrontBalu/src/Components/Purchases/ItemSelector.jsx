import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { FaSearch } from 'react-icons/fa';
import DashboardLayout from '../Dashboard/DashboardLayout';

const ItemSelector = ({ onSelect, excludeItems = [] }) => {
  const inventory = useSelector(state => state.inventory.inventory || []);
  const [search, setSearch] = useState('');
  const [filteredItems, setFilteredItems] = useState([]);

  // Filtrar items por término de búsqueda y excluir los ya seleccionados
  useEffect(() => {
    const filtered = inventory.filter(item => {
      // Verificar si el item ya está en la lista de exclusión
      const isExcluded = excludeItems.some(
        excluded => excluded.itemId === (item.id || item.itemId)
      );
      
      // Filtrar por término de búsqueda
      const matchesSearch = search === '' || 
        (item.name || item.itemName || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.description || '').toLowerCase().includes(search.toLowerCase());
      
      return matchesSearch && !isExcluded;
    });
    
    setFilteredItems(filtered);
  }, [inventory, search, excludeItems]);

  return (
     <DashboardLayout>
    <div className="bg-white shadow-sm rounded-lg p-4">
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="text-gray-400" />
        </div>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="pl-10 w-full border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          No se encontraron productos disponibles
        </div>
      ) : (
        <div className="max-h-64 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr 
                  key={item.id || item.itemId} 
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-3 py-2 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.name || item.itemName}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    {item.category}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-right">
                    <span className={`font-medium ${item.currentStock <= item.minStock ? 'text-red-500' : 'text-green-500'}`}>
                      {item.currentStock || 0}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <button
                      onClick={() => onSelect(item)}
                      className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-xs hover:bg-blue-200"
                    >
                      Seleccionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
};

export default ItemSelector;