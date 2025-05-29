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

  const sellableItems = useSelector(state => state.inventory.inventory);

  useEffect(() => {
    dispatch(getAllItems());
  }, [dispatch]);

  const handleItemSelect = (e) => {
    const itemId = e.target.value;
    setSelectedItem(itemId);

    if (itemId) {
      const item = sellableItems.find(item => item.itemId.toString() === itemId);
      if (item) {
        setDescription(item.itemName);
        setAmount((parseFloat(item.salePrice) * quantity).toFixed(2));
      }
    }
  };

  useEffect(() => {
    if (selectedItem) {
      const item = sellableItems.find(item => item.itemId.toString() === selectedItem);
      if (item) {
        setAmount(parseFloat((item.salePrice || 0) * quantity));
      }
    }
  }, [quantity, selectedItem, sellableItems]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedItem) {
      toast.error("Por favor seleccione un producto del inventario");
      return;
    }

    if (!description || description.trim() === "") {
      toast.error("La descripción no puede estar vacía");
      return;
    }

    if (quantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      toast.error("El monto debe ser un número válido y mayor a 0");
      return;
    }

    const selectedItemObject = sellableItems.find(item => item.itemId.toString() === selectedItem);

    if (!selectedItemObject) {
      toast.error("Producto no encontrado en el inventario");
      return;
    }

    if (selectedItemObject.currentStock < quantity) {
      toast.error(`Stock insuficiente. Disponible: ${selectedItemObject.currentStock}`);
      return;
    }

    try {
     await dispatch(addExtraCharge({
  bookingId,
  extraCharge: {
    description,
    price: parseFloat(amount), // Cambiar `amount` a `price`
    itemId: selectedItem,
    quantity: parseInt(quantity, 10), // Convertir a número entero
  },
}));

      await dispatch(removeStock(selectedItem, quantity));

      setSelectedItem('');
      setDescription('');
      setAmount('');
      setQuantity(1);
      setShowForm(false);

      toast.success("Cargo extra añadido y stock actualizado");
    } catch (error) {
      console.error("Error al procesar el cargo extra:", error);
      const errorMessage = error.response?.data?.message || "Error al procesar la solicitud";
      toast.error(errorMessage);
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
                {sellableItems.map(item => (
                  <option 
                    key={item.itemId} 
                    value={item.itemId}
                    disabled={item.currentStock < 1}
                  >
                    {item.itemName} - ${item.salePrice} 
                    {item.currentStock < 1 ? " (Agotado)" : ` (Stock: ${item.currentStock})`}
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
                readOnly
                className="w-full px-2 py-1 border rounded bg-gray-100"
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