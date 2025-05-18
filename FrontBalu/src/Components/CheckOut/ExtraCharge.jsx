import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addExtraCharge } from '../../Redux/Actions/bookingActions';
import { getAllItems, removeStock } from '../../Redux/Actions/inventoryActions';
import { toast } from 'react-toastify';

const ExtraCharges = ({ bookingId }) => {
  const dispatch = useDispatch();
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Corregido: "item" a "items" (plural)
  const sellableItems = useSelector(state => state.inventory.sellableItems);
  console.log("Items del inventario:", sellableItems);
  
  // Cargamos los items del inventario al montar el componente
  useEffect(() => {
    dispatch(getAllItems());
  }, [dispatch]);

  // Corregido: Uso de itemId y itemName en lugar de id y name
  const handleItemSelect = (e) => {
    const itemId = e.target.value;
    setSelectedItem(itemId);
    
    if (itemId) {
      const item = sellableItems.find(item => item.itemId.toString() === itemId);
      if (item) {
        setDescription(item.itemName); // Corregido: itemName en vez de name
        setAmount(parseFloat(item.salePrice) || 0); // Corregido: salePrice en vez de unitPrice
      }
    }
  };

  // Cuando cambia la cantidad, actualizamos el monto
  useEffect(() => {
    if (selectedItem) {
      const item = sellableItems.find(item => item.itemId.toString() === selectedItem);
      if (item) {
        // Calculamos el precio total basado en la cantidad
        setAmount((parseFloat(item.salePrice || 0) * quantity).toFixed(2));
      }
    }
  }, [quantity, selectedItem, sellableItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedItem) {
      toast.error("Por favor seleccione un producto del inventario");
      return;
    }
    
    if (quantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }
    
    // Corregido: Búsqueda por itemId
    const selectedItemObject = sellableItems.find(item => item.itemId.toString() === selectedItem);
    
    if (!selectedItemObject) {
      toast.error("Producto no encontrado en el inventario");
      return;
    }
    
    // Verificar si hay stock suficiente
    if (selectedItemObject.currentStock < quantity) {
      toast.error(`Stock insuficiente. Disponible: ${selectedItemObject.currentStock}`);
      return;
    }
    
    try {
      // 1. Agregar el cargo extra a la reserva
      await dispatch(addExtraCharge({
        bookingId,
        extraCharge: {
          description,
          amount,
          itemId: selectedItem,
          quantity
        }
      }));
      
      // 2. Descontar del inventario
      await dispatch(removeStock(selectedItem, quantity));
      
      // Limpiar el formulario
      setSelectedItem('');
      setDescription('');
      setAmount('');
      setQuantity(1);
      setShowForm(false);
      
      toast.success("Cargo extra añadido y stock actualizado");
    } catch (error) {
      console.error("Error al procesar el cargo extra:", error);
      toast.error("Error al procesar la solicitud");
    }
  };

  return (
    <div className="mt-2">
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
        >
          + Añadir cargo extra
        </button>
      ) : (
        <div className="bg-gray-50 border p-3 rounded">
          <h4 className="font-medium mb-2">Nuevo Cargo Extra</h4>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm">Producto del inventario:</label>
              <select
                value={selectedItem}
                onChange={handleItemSelect}
                className="w-full px-2 py-1 border rounded"
                required
              >
                <option value="">-- Seleccionar producto --</option>
                {/* Corregido: Uso de itemId y itemName */}
                {sellableItems.map(item => (
                  <option 
                    key={item.itemId} 
                    value={item.itemId}
                    disabled={item.currentStock < 1}
                  >
                    {item.itemName} - ${item.salePrice} (Stock: {item.currentStock})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm">Descripción:</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-2 py-1 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm">Cantidad:</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="w-full px-2 py-1 border rounded"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm">Monto total:</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-2 py-1 border rounded"
                step="0.01"
                required
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setSelectedItem('');
                  setDescription('');
                  setAmount('');
                  setQuantity(1);
                }}
                className="text-sm bg-gray-300 text-gray-700 px-3 py-1 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ExtraCharges;