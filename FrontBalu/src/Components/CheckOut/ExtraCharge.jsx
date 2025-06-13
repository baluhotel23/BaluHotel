import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addExtraCharge,
  getAllBookings,
} from "../../Redux/Actions/bookingActions";
import { getAllItems, removeStock } from "../../Redux/Actions/inventoryActions";
import { toast } from "react-toastify";

const ExtraCharges = ({ bookingId, isLoading: externalLoading }) => {
  const dispatch = useDispatch();
  
  // Estados locales
  const [showForm, setShowForm] = useState(false);
  const [selectedItem, setSelectedItem] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🛡️ SELECTORES CON PROTECCIÓN
  const sellableItems = useSelector((state) => state.inventory?.inventory || []);
  const { bookings = [] } = useSelector((state) => state.booking || {});

  // 🛡️ OBTENER RESERVA ACTUAL DE FORMA SEGURA
  const currentBooking = bookings.find(b => b.bookingId?.toString() === bookingId?.toString());
  
  // 🛡️ ASEGURAR QUE extraCharges SEA SIEMPRE UN ARRAY VÁLIDO
  const extraCharges = Array.isArray(currentBooking?.extraCharges) 
    ? currentBooking.extraCharges.filter(charge => charge != null)
    : [];

  // 🛡️ CÁLCULO SEGURO DEL TOTAL
  const totalExtraCharges = extraCharges.reduce((sum, charge) => {
    if (!charge) return sum;
    const amount = parseFloat(charge.amount);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);

  // 🔍 LOGS PARA DEBUG DE RENDERIZADO
  useEffect(() => {
    console.group("🔍 [EXTRA-CHARGE-RENDER] Estado del componente");
    console.log("📦 bookingId:", bookingId);
    console.log("📊 sellableItems length:", sellableItems?.length);
    console.log("🏨 currentBooking:", currentBooking ? "Encontrada" : "No encontrada");
    console.log("💰 extraCharges length:", extraCharges?.length);
    console.log("🔄 isSubmitting:", isSubmitting);
    console.log("📝 showForm:", showForm);
    console.groupEnd();
  }, [bookingId, sellableItems, currentBooking, extraCharges, isSubmitting, showForm]);

  // Cargar inventario al montar
  useEffect(() => {
    console.log("🔄 [EXTRA-CHARGE] Cargando inventario...");
    dispatch(getAllItems());
  }, [dispatch]);

  // 🔧 FUNCIÓN DE RESET MEJORADA
  const resetForm = (hideForm = false) => {
    console.log("🔄 [EXTRA-CHARGE] Reseteando formulario, hideForm:", hideForm);
    
    setSelectedItem("");
    setDescription("");
    setAmount("");
    setQuantity(1);
    setCustomPrice(false);
    setIsSubmitting(false);

    if (hideForm) {
      setShowForm(false);
    }
  };

  // 🔧 VALIDACIÓN MEJORADA
  const validateForm = () => {
    console.group("🔍 [EXTRA-CHARGE] Validando formulario");
    console.log("📝 description:", description);
    console.log("💰 amount:", amount);
    console.log("🔢 quantity:", quantity);

    if (!description || description.trim() === "") {
      console.error("❌ Description vacía");
      console.groupEnd();
      toast.error("La descripción no puede estar vacía");
      return false;
    }

    if (quantity <= 0) {
      console.error("❌ Quantity inválida");
      console.groupEnd();
      toast.error("La cantidad debe ser mayor a 0");
      return false;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      console.error("❌ Amount inválido:", { amount, amountValue });
      console.groupEnd();
      toast.error("El monto debe ser un número válido y mayor a 0");
      return false;
    }

    // Validar stock si se seleccionó un producto
    if (selectedItem) {
      const selectedItemObject = sellableItems.find(
        (item) => item && item.itemId && item.itemId.toString() === selectedItem
      );

      if (!selectedItemObject) {
        console.error("❌ Producto no encontrado");
        console.groupEnd();
        toast.error("Producto no encontrado en el inventario");
        return false;
      }

      if (selectedItemObject.currentStock < quantity) {
        console.error("❌ Stock insuficiente");
        console.groupEnd();
        toast.error(
          `Stock insuficiente. Disponible: ${selectedItemObject.currentStock}`
        );
        return false;
      }
    }

    console.log("✅ Validación exitosa");
    console.groupEnd();
    return true;
  };

  // 🔧 FUNCIÓN DE SELECCIÓN DE ITEM MEJORADA
  const handleItemSelect = (e) => {
    const itemId = e.target.value;
    console.group("🔍 [EXTRA-CHARGE] handleItemSelect");
    console.log("📦 itemId seleccionado:", itemId);
    
    setSelectedItem(itemId);

    if (itemId) {
      const item = sellableItems.find(
        (item) => item && item.itemId && item.itemId.toString() === itemId
      );
      
      console.log("📦 item encontrado:", item);
      
      if (item) {
        setDescription(item.itemName || "");
        if (!customPrice) {
          const salePrice = parseFloat(item.salePrice || 0);
          const qty = parseInt(quantity) || 1;
          const totalPrice = salePrice * qty;
          
          console.log("💰 Precio calculado:", { salePrice, qty, totalPrice });
          
          if (!isNaN(totalPrice) && totalPrice >= 0) {
            setAmount(totalPrice.toFixed(2));
          } else {
            console.warn("⚠️ TotalPrice inválido, usando 0.00");
            setAmount("0.00");
          }
        }
      }
    } else {
      setDescription("");
      setAmount("");
    }
    console.groupEnd();
  };

  // Recalcular precio cuando cambia la cantidad
  useEffect(() => {
    if (selectedItem && !customPrice && sellableItems.length > 0) {
      const item = sellableItems.find(
        (item) => item && item.itemId && item.itemId.toString() === selectedItem
      );
      
      if (item && item.salePrice) {
        const salePrice = parseFloat(item.salePrice);
        const qty = parseInt(quantity) || 1;
        
        if (!isNaN(salePrice) && salePrice >= 0) {
          const totalPrice = salePrice * qty;
          setAmount(totalPrice.toFixed(2));
        } else {
          console.warn("⚠️ SalePrice inválido:", item.salePrice);
          setAmount("0.00");
        }
      }
    }
  }, [quantity, selectedItem, sellableItems, customPrice]);

  // 🔧 SUBMIT MEJORADO CON MANEJO DE ERRORES
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) {
      console.log("⏳ [EXTRA-CHARGE] Ya se está enviando, ignorando...");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      console.group("🚀 [EXTRA-CHARGE] Enviando cargo extra");
      
      const amountValue = parseFloat(amount);
      const extraChargeData = {
        extraCharge: {
          bookingId: parseInt(bookingId),
          description: description.trim(),
          amount: amountValue,
          quantity: parseInt(quantity, 10),
          chargeType: "service",
          notes: selectedItem ? `Producto del inventario: ${selectedItem}` : null,
          ...(selectedItem && { basicId: selectedItem }),
        },
      };

      console.log("📤 Datos a enviar:", extraChargeData);

      const result = await dispatch(addExtraCharge(extraChargeData));
      console.log("📥 Resultado del dispatch:", result);

      if (result && !result.error) {
        console.log("✅ Cargo creado exitosamente");
        
        // Descontar stock si se seleccionó un producto
        if (selectedItem) {
          console.log("📦 Descontando stock del producto:", selectedItem, "cantidad:", quantity);
          try {
            await dispatch(removeStock(selectedItem, quantity));
          } catch (stockError) {
            console.warn("⚠️ Error al descontar stock:", stockError);
            toast.warn("Cargo creado pero no se pudo actualizar el stock automáticamente");
          }
        }
        
        // 🔧 RECARGAR DATOS DE FORMA SEGURA
        try {
          console.log("🔄 Recargando datos de reservas...");
          await dispatch(getAllBookings({ status: "checked-in" }));
          console.log("✅ Datos recargados");
        } catch (reloadError) {
          console.error("❌ Error al recargar:", reloadError);
          toast.warn("Cargo añadido pero no se pudieron actualizar los datos automáticamente");
        }

        // 🔧 RESET SEGURO
        resetForm(false);
        toast.success("✅ Cargo extra añadido exitosamente. Puedes agregar más gastos si lo necesitas.");
        
      } else {
        throw new Error(result?.message || "Error al crear cargo");
      }

    } catch (error) {
      console.error("❌ Error al procesar cargo:", error);
      
      const errorMessage =
        error.response?.data?.message ||
        error.response?.data?.details ||
        error.message ||
        "Error al procesar la solicitud";

      toast.error(`❌ ${errorMessage}`);
    } finally {
      // 🔧 SIEMPRE RESETEAR isSubmitting
      console.log("🔄 Finalizando submit...");
      setIsSubmitting(false);
      console.groupEnd();
    }
  };

  // Manejar cambio de monto
  const handleAmountChange = (e) => {
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  // 🛡️ PROTECCIÓN CONTRA RENDERIZADO EN BLANCO
  if (externalLoading) {
    return (
      <div className="text-center p-4">
        <div className="text-sm text-gray-500">⏳ Cargando datos...</div>
      </div>
    );
  }

  // 🛡️ VERIFICAR SI HAY DATOS MÍNIMOS PARA RENDERIZAR
  if (!bookingId) {
    return (
      <div className="text-center p-4">
        <div className="text-sm text-red-500">❌ Error: bookingId no disponible</div>
      </div>
    );
  }

  // 🔧 RENDERIZADO PRINCIPAL CON PROTECCIONES
  try {
    return (
      <div className="space-y-4">
        {/* Resumen de cargos extras actuales */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-blue-800">
              💰 Total cargos extras:
            </span>
            <span className="text-lg font-bold text-blue-600">
              ${totalExtraCharges.toLocaleString()}
            </span>
          </div>
          {extraCharges.length > 0 && (
            <div className="text-xs text-blue-600 mt-1">
              {extraCharges.length} cargo(s) registrado(s)
            </div>
          )}
        </div>

        {/* Botón para mostrar/ocultar formulario */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            disabled={isSubmitting}
          >
            <span>{showForm ? "➖" : "➕"}</span>
            {showForm ? "Ocultar formulario" : "Añadir cargo extra"}
          </button>
        </div>

        {/* Formulario de cargos extras */}
        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-3 border p-4 rounded-lg bg-gray-50">
            {/* Selector de producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📦 Producto (opcional):
              </label>
              <select
                value={selectedItem}
                onChange={handleItemSelect}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Seleccionar producto del inventario...</option>
                {sellableItems.map((item) => (
                  <option key={item.itemId || item.id} value={item.itemId || item.id}>
                    {item.itemName || item.name} - ${parseFloat(item.salePrice || 0).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📝 Descripción: *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                placeholder="Descripción del cargo..."
                required
              />
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🔢 Cantidad: *
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                disabled={isSubmitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                required
              />
            </div>

            {/* Monto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                💵 Monto total: *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={handleAmountChange}
                readOnly={selectedItem && !customPrice}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  selectedItem && !customPrice ? "bg-gray-100" : ""
                } ${isSubmitting ? "bg-gray-100" : ""}`}
                placeholder="0.00"
                required
              />
              {selectedItem && !customPrice && (
                <p className="text-xs text-gray-500 mt-1">
                  💡 Precio calculado automáticamente basado en el producto seleccionado
                </p>
              )}
              {amount && (
                <p className="text-xs text-blue-600 mt-1">
                  Valor actual: ${parseFloat(amount || 0).toFixed(2)}
                </p>
              )}
            </div>

            {/* Checkbox para precio personalizado */}
            {selectedItem && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="customPrice"
                  checked={customPrice}
                  onChange={(e) => setCustomPrice(e.target.checked)}
                  disabled={isSubmitting}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="customPrice" className="ml-2 text-sm text-gray-700">
                  Usar precio personalizado
                </label>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !amount || !description}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Añadiendo...
                  </>
                ) : (
                  <>
                    ✅ Añadir cargo
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => resetForm(true)}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                ❌ Cancelar
              </button>
            </div>
          </form>
        )}

        {/* Lista de cargos existentes */}
        {extraCharges.length > 0 && (
          <div className="mt-4">
            <h5 className="font-medium text-gray-700 mb-2">📋 Cargos registrados:</h5>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {extraCharges.map((charge, idx) => {
                if (!charge) return null;
                
                const amount = parseFloat(charge.amount);
                const displayAmount = isNaN(amount) ? 0 : amount;
                
                return (
                  <div key={charge.id || idx} className="flex justify-between items-center p-2 bg-white rounded border text-sm">
                    <div>
                      <span className="font-medium">{charge.description || 'Sin descripción'}</span>
                      {charge.quantity > 1 && (
                        <span className="text-gray-500 ml-2">x{charge.quantity}</span>
                      )}
                    </div>
                    <span className="font-medium text-green-600">
                      ${displayAmount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Debug info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="text-xs text-gray-400 bg-gray-100 p-2 rounded">
            🔍 Debug: BookingId={bookingId}, Items={sellableItems?.length}, 
            Charges={extraCharges?.length}, Submitting={isSubmitting}
          </div>
        )}
      </div>
    );

  } catch (renderError) {
    console.error("❌ [EXTRA-CHARGE] Error en render:", renderError);
    return (
      <div className="text-center p-4">
        <div className="text-sm text-red-500">
          ❌ Error al renderizar el componente de cargos extras
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs"
        >
          🔄 Recargar página
        </button>
      </div>
    );
  }
};

export default ExtraCharges;