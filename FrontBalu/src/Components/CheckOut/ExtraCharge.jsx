import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addExtraCharge, getAllBookings } from '../../Redux/Actions/bookingActions';
import { getAllItems, removeStock } from '../../Redux/Actions/inventoryActions';
import { toast } from 'react-toastify';

const ExtraCharges = ({ bookingId, isLoading: externalLoading }) => {
  const dispatch = useDispatch();
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState(false);

  const sellableItems = useSelector(state => state.inventory.inventory || []);
  
  // ⭐ USAR EL LOADING EXTERNO EN LUGAR DEL INTERNO
  const { loading: internalLoading } = useSelector(state => state.booking);
  const isLoading = externalLoading || internalLoading?.booking || false;
  
  // ⭐ OBTENER BOOKING ACTUAL PARA MOSTRAR EXTRAS EXISTENTES
  const currentBooking = useSelector(state => 
    state.booking.bookings.find(b => b.bookingId === bookingId)
  );

  useEffect(() => {
    dispatch(getAllItems());
  }, [dispatch]);

  // ⭐ MANEJAR SELECCIÓN DE PRODUCTO - CORREGIDO
  const handleItemSelect = (e) => {
    const itemId = e.target.value;
    setSelectedItem(itemId);

    if (itemId) {
      const item = sellableItems.find(item => 
        item && item.itemId && item.itemId.toString() === itemId
      );
      if (item) {
        setDescription(item.itemName || '');
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

  // ⭐ RECALCULAR PRECIO CUANDO CAMBIA LA CANTIDAD - CORREGIDO
  useEffect(() => {
    if (selectedItem && !customPrice && sellableItems.length > 0) {
      const item = sellableItems.find(item => 
        item && item.itemId && item.itemId.toString() === selectedItem
      );
      if (item && item.salePrice) {
        setAmount((parseFloat(item.salePrice) * quantity).toFixed(2));
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
      const selectedItemObject = sellableItems.find(item => 
        item && item.itemId && item.itemId.toString() === selectedItem
      );

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

  // ⭐ MANEJAR ENVÍO DEL FORMULARIO - CORREGIDO PARA EVITAR RECARGA PROBLEMÁTICA
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      console.log("🔍 [FRONTEND-DEBUG] Estado del formulario antes de enviar:");
      console.log("📝 description:", description);
      console.log("💰 amount:", amount);
      console.log("🔢 quantity:", quantity);
      console.log("📦 selectedItem:", selectedItem);
      
      const extraChargeData = {
        bookingId: parseInt(bookingId),
        extraCharge: {
          description: description.trim(),
          price: parseFloat(amount),
          quantity: parseInt(quantity, 10),
          chargeType: 'service',
          notes: selectedItem ? `Producto del inventario: ${selectedItem}` : null,
          ...(selectedItem && { itemId: selectedItem })
        },
      };

      console.log("📤 [FRONTEND-DEBUG] Datos completos a enviar:");
      console.log(JSON.stringify(extraChargeData, null, 2));

      // ⭐ VERIFICAR QUE DESCRIPTION NO ESTÉ VACÍA
      if (!extraChargeData.extraCharge.description || extraChargeData.extraCharge.description.trim() === '') {
        console.error("❌ [FRONTEND-DEBUG] Description está vacía!");
        toast.error("La descripción no puede estar vacía");
        return;
      }

      // ⭐ VERIFICAR QUE PRICE SEA VÁLIDO
      if (isNaN(extraChargeData.extraCharge.price) || extraChargeData.extraCharge.price <= 0) {
        console.error("❌ [FRONTEND-DEBUG] Price inválido:", extraChargeData.extraCharge.price);
        toast.error("El precio debe ser un número válido mayor a 0");
        return;
      }

      console.log("✅ [FRONTEND-DEBUG] Validaciones frontales pasadas, enviando...");

      const result = await dispatch(addExtraCharge(extraChargeData));
      
      // ⭐ VERIFICAR RESULTADO CORRECTAMENTE
      if (result && !result.error) {
        // ⭐ DESCONTAR STOCK SOLO SI SE SELECCIONÓ UN PRODUCTO DEL INVENTARIO
        if (selectedItem) {
          console.log("📦 Descontando stock del producto:", selectedItem, "cantidad:", quantity);
          try {
            await dispatch(removeStock(selectedItem, quantity));
          } catch (stockError) {
            console.warn("⚠️ Error al descontar stock (cargo ya creado):", stockError);
            toast.warn("Cargo creado pero no se pudo actualizar el stock automáticamente");
          }
        }

        // ⭐ EVITAR RECARGA COMPLETA - SOLO ACTUALIZAR EL BOOKING ESPECÍFICO
        try {
          // ⭐ RECARGAR SOLO LOS BOOKINGS CHECKED-IN SIN FORZAR UNA RECARGA COMPLETA
          console.log("🔄 Actualizando estado local...");
          
          // ⭐ NO HACER RECARGA AUTOMÁTICA QUE PUEDE CAUSAR ERRORES
          // await dispatch(getAllBookings({ status: "checked-in" }));
          
          // ⭐ EN SU LUGAR, ACTUALIZAR EL ESTADO LOCAL YA SE HACE EN EL REDUCER
          console.log("✅ Estado actualizado mediante reducer");
          
        } catch (reloadError) {
          console.warn("⚠️ Error al recargar datos (cargo ya creado):", reloadError);
          // ⭐ NO MOSTRAR ERROR AL USUARIO PORQUE EL CARGO YA SE CREÓ
        }

        // ⭐ LIMPIAR FORMULARIO Y MOSTRAR ÉXITO
        resetForm();
        toast.success("✅ Cargo extra añadido exitosamente");
        console.log("✅ Cargo extra procesado exitosamente");
        
      } else {
        throw new Error(result?.message || "Error desconocido al agregar cargo");
      }
    } catch (error) {
      console.error("❌ Error al procesar el cargo extra:", error);
      
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.details || 
                          error.message || 
                          "Error al procesar la solicitud";
      
      toast.error(`❌ ${errorMessage}`);
    }
  };

  // ⭐ CALCULAR TOTAL DE EXTRAS EXISTENTES - CORREGIDO
  const totalExtras = currentBooking?.ExtraCharges?.reduce(
    (sum, charge) => {
      const price = parseFloat(charge.price || charge.amount || 0);
      return sum + price;
    }, 
    0
  ) || 0;

  return (
    <div className="mt-2">
      {/* ⭐ MOSTRAR EXTRAS EXISTENTES - CORREGIDO CON KEYS */}
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
              <li 
                key={charge.id || charge.chargeId || `charge-${idx}`} 
                className="text-xs text-blue-700 flex justify-between items-center"
              >
                <span>
                  📦 {charge.description || 'Cargo extra'} 
                  {charge.quantity && charge.quantity > 1 && ` (x${charge.quantity})`}
                </span>
                <span className="font-medium">
                  ${parseFloat(charge.price || charge.amount || 0).toLocaleString()}
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
            {/* ⭐ SELECCIÓN DE PRODUCTO DEL INVENTARIO - CORREGIDO CON VALIDACIONES */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📦 Producto del inventario (opcional):
              </label>
              <select
                value={selectedItem}
                onChange={handleItemSelect}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">-- Seleccionar producto o agregar manualmente --</option>
                {sellableItems
                  .filter(item => item && item.itemId && item.itemName) // ⭐ FILTRAR ITEMS VÁLIDOS
                  .map(item => (
                    <option 
                      key={item.itemId} 
                      value={item.itemId}
                      disabled={item.currentStock < 1}
                    >
                      {item.itemName} - ${item.salePrice || 0} 
                      {item.currentStock < 1 ? " (Agotado)" : ` (Stock: ${item.currentStock || 0})`}
                    </option>
                  ))
                }
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
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
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
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
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
                  disabled={isLoading}
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
                disabled={isLoading}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  selectedItem && !customPrice ? 'bg-gray-100' : ''
                } ${isLoading ? 'bg-gray-100' : ''}`}
                placeholder="0.00"
                required
              />
              {selectedItem && !customPrice && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 Precio calculado automáticamente basado en el producto seleccionado
                </p>
              )}
            </div>

            {/* ⭐ BOTONES DE ACCIÓN CON LOADING CORRECTO */}
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 transition-colors"
              >
                ❌ Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400 transition-colors flex items-center gap-2"
              >
                {isLoading ? (
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