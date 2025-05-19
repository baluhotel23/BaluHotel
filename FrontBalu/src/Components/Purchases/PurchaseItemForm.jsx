import React from 'react';
import { FaTrash } from 'react-icons/fa';

const PurchaseItemForm = ({ item, itemIndex, inventory, onChange, onRemove, disabled = false }) => {
  const selectedItem = inventory.find(invItem => 
    invItem.id === item.itemId || invItem.itemId === item.itemId
  );
  
  const handleInputChange = (field, value) => {
    onChange(itemIndex, field, value);
  };
  
  // Calcular el total del ítem (precio unitario * cantidad)
  const calculateItemTotal = () => {
    return (item.price * item.quantity).toFixed(2);
  };
  
  return (
    <tr className="border-b border-gray-200">
      <td className="px-3 py-3">
        {selectedItem ? (
          <div>
            <p className="font-medium text-sm">{selectedItem.name || selectedItem.itemName}</p>
            <p className="text-xs text-gray-500">{selectedItem.description}</p>
          </div>
        ) : (
          <p className="text-gray-400 italic">Producto no disponible</p>
        )}
      </td>
      <td className="px-3 py-3">
        <input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
          className="w-20 border border-gray-300 rounded px-2 py-1"
          disabled={disabled}
        />
      </td>
      <td className="px-3 py-3">
        <input
          type="number"
          step="0.01"
          min="0"
          value={item.price}
          onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
          className="w-24 border border-gray-300 rounded px-2 py-1"
          disabled={disabled}
        />
      </td>
      <td className="px-3 py-3 text-right font-medium">
        ${calculateItemTotal()}
      </td>
      <td className="px-3 py-3 text-center">
        {!disabled && (
          <button
            onClick={() => onRemove(itemIndex)}
            className="text-red-500 hover:text-red-700"
            title="Eliminar ítem"
          >
            <FaTrash />
          </button>
        )}
      </td>
    </tr>
  );
};

export default PurchaseItemForm;