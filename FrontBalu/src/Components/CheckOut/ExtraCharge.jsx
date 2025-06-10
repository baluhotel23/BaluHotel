import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addExtraCharge, getAllBookings } from '../../Redux/Actions/bookingActions';
import { getAllItems, removeStock } from '../../Redux/Actions/inventoryActions';
import { toast } from 'react-toastify';

const ExtraCharges = ({ bookingId }) => {
  const dispatch = useDispatch();
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState(false);

  const sellableItems = useSelector(state => state.inventory.inventory || []);
  const { loading } = useSelector(state => state.booking);
  
  // ⭐ OBTENER BOOKING ACTUAL PARA MOSTRAR EXTRAS EXISTENTES
  const currentBooking = useSelector(state => 
    state.booking.bookings.find(b => b.bookingId === bookingId)
  );

  useEffect(() => {
    dispatch(getAllItems());
  }, [dispatch]);

  // ⭐ MANEJAR SELECCIÓN DE PRODUCTO
  const handleItemSelect = (e) => {
    const itemId = e.target.value;
    setSelectedItem(itemId);

    if (itemId) {
      const item = sellableItems.find(item => item.itemId.toString() === itemId);
      if (item) {
        setDescription(item.itemName);
        if (!customPrice) {
          setAmount((parseFloat(item.salePrice || 0) * quantity).toFixed(2));
        }
      }
    } else {
      // Limpiar formulario si se deselecciona
      setDescription('');
      setAmount('');
    }
  };

  // ⭐ RECALCULAR PRECIO CUANDO CAMBIA LA CANTIDAD
  useEffect(() => {
    if (selectedItem && !customPrice) {
      const item = sellableItems.find(item => item.itemId.toString() === selectedItem);
      if (item) {
        setAmount((parseFloat(item.salePrice || 0) * quantity).toFixed(2));
      }
    }
  }, [quantity, selectedItem, sellableItems, customPrice]);

  // ⭐ VALIDACIONES MEJORADAS
  const validateForm = () => {
    if (!description || description.trim() === "") {
      toast.error("La descripción no puede estar vacía");
      return false;
    }

    if (quantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return false;
    }

    if (isNaN(amount) || parseFloat(amount) <= 0) {
      toast.error("El monto debe ser un número válido y mayor a 0");
      return false;
    }

    // ⭐ VALIDAR STOCK SOLO SI SE SELECCIONÓ UN PRODUCTO
    if (selectedItem) {
      const selectedItemObject = sellableItems.find(item => item.itemId.toString() === selectedItem);

      if (!selectedItemObject) {
        toast.error("Producto no encontrado en el inventario");
        return false;
      }

      if (selectedItemObject.currentStock < quantity) {
        toast.error(`Stock insuficiente. Disponible: ${selectedItemObject.currentStock}`);
        return false;
      }
    }

    return true;
  };

  // ⭐ LIMPIAR FORMULARIO
  const resetForm = () => {
    setSelectedItem('');
    setDescription('');
    setAmount('');
    setQuantity(1);
    setCustomPrice(false);
    setShowForm(false);
  };

  // ⭐ MANEJAR ENVÍO DEL FORMULARIO
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      console.log("📤 Procesando cargo extra...");
      
      const extraChargeData = {
        bookingId,
        extraCharge: {
          description: description.trim(),
          price: parseFloat(amount),
          quantity: parseInt(quantity, 10),
          // ⭐ INCLUIR itemId SOLO SI SE SELECCIONÓ UN PRODUCTO
          ...(selectedItem && { itemId: selectedItem })
        },
      };

      console.log("📦 Datos del cargo extra:", extraChargeData);

      const result = await dispatch(addExtraCharge(extraChargeData));

      if (!result.error) {
        // ⭐ DESCONTAR STOCK SOLO SI SE SELECCIONÓ UN PRODUCTO DEL INVENTARIO
        if (selectedItem) {
          console.log("📦 Descontando stock del producto:", selectedItem, "cantidad:", quantity);
          await dispatch(removeStock(selectedItem, quantity));
        }

        // ⭐ RECARGAR BOOKINGS PARA ASEGURAR SINCRONIZACIÓN
        dispatch(getAllBookings({ status: "checked-in" }));

        resetForm();
        toast.success("Cargo extra añadido exitosamente");
        console.log("✅ Cargo extra procesado exitosamente");
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error("❌ Error al procesar el cargo extra:", error);
      const errorMessage = error.response?.data?.message || error.message || "Error al procesar la solicitud";
      toast.error(errorMessage);
    }
  };

  // ⭐ CALCULAR TOTAL DE EXTRAS EXISTENTES
  const totalExtras = currentBooking?.ExtraCharges?.reduce(
    (sum, charge) => sum + (parseFloat(charge.price) || 0), 
    0
  ) || 0;

  return (
    <div className="mt-2">
      {/* ⭐ MOSTRAR EXTRAS EXISTENTES */}
      {currentBooking?.ExtraCharges && currentBooking.ExtraCharges.length > 0 && (
        <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded">
          <div className="flex justify-between items-center mb-2">
            <strong className="text-sm text-blue-800">
              💰 Cargos extras actuales ({currentBooking.ExtraCharges.length})
            </strong>
            <span className="text-sm font-semibold text-blue-900">
              Total: ${totalExtras.toLocaleString()}
            </span>
          </div>
          <ul className="space-y-1">
            {currentBooking.ExtraCharges.map((charge, idx) => (
              <li key={idx} className="text-xs text-blue-700 flex justify-between items-center">
                <span>
                  📦 {charge.description} 
                  {charge.quantity && ` (x${charge.quantity})`}
                </span>
                <span className="font-medium">
                  ${parseFloat(charge.price || 0).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full text-sm bg-blue-500 text-white px-3 py-2 rounded hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
        >
          <span>➕</span>
          Añadir cargo extra
        </button>
      ) : (
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-800">➕ Nuevo Cargo Extra</h4>
            <button
              type="button"
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600 text-lg"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* ⭐ SELECCIÓN DE PRODUCTO DEL INVENTARIO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📦 Producto del inventario (opcional):
              </label>
              <select
                value={selectedItem}
                onChange={handleItemSelect}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Seleccionar producto o agregar manualmente --</option>
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

            {/* ⭐ DESCRIPCIÓN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📝 Descripción: *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe el cargo extra..."
                required
              />
            </div>

            {/* ⭐ CANTIDAD */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🔢 Cantidad: *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>

            {/* ⭐ PRECIO PERSONALIZADO */}
            {selectedItem && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="customPrice"
                  checked={customPrice}
                  onChange={(e) => setCustomPrice(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="customPrice" className="text-sm text-gray-600">
                  💰 Usar precio personalizado
                </label>
              </div>
            )}

            {/* ⭐ MONTO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                💵 Monto total: *
              </label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                readOnly={selectedItem && !customPrice}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  selectedItem && !customPrice ? 'bg-gray-100' : ''
                }`}
                placeholder="0.00"
                required
              />
              {selectedItem && !customPrice && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 Precio calculado automáticamente basado en el producto seleccionado
                </p>
              )}
            </div>

            {/* ⭐ BOTONES DE ACCIÓN */}
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                ❌ Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    Guardar
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ExtraCharges;