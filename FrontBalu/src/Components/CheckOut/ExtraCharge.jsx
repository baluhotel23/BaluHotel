import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  addExtraCharge,
  getAllBookings,
} from "../../Redux/Actions/bookingActions";
import { getAllItems, removeStock } from "../../Redux/Actions/inventoryActions";
import { toast } from "react-toastify";

const ExtraCharges = ({ bookingId, isLoading: externalLoading, onSuccess, onClose }) => {
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
  
  // 🛡️ USAR financialSummary DEL BACKEND SI ESTÁ DISPONIBLE
  const extraCharges = currentBooking?.extraCharges || [];
  const financials = currentBooking?.financialSummary;
  
  // 🛡️ CÁLCULO SEGURO DEL TOTAL (usar backend si está disponible)
  const totalExtraCharges = financials?.totalExtras || extraCharges.reduce((sum, charge) => {
    if (!charge) return sum;
    const amount = parseFloat(charge.amount) || 0;
    const qty = parseInt(charge.quantity) || 1;
    return sum + (amount * qty);
  }, 0);

  // 🔍 LOGS PARA DEBUG
  useEffect(() => {
    console.group("🔍 [EXTRA-CHARGE-RENDER] Estado del componente");
    console.log("📦 bookingId:", bookingId);
    console.log("📊 sellableItems length:", sellableItems?.length);
    console.log("🏨 currentBooking:", currentBooking ? "Encontrada" : "No encontrada");
    console.log("💰 extraCharges length:", extraCharges?.length);
    console.log("💼 financialSummary:", financials ? "Disponible" : "No disponible");
    console.log("🔄 isSubmitting:", isSubmitting);
    console.groupEnd();
  }, [bookingId, sellableItems, currentBooking, extraCharges, financials, isSubmitting]);

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
          await dispatch(getAllBookings({}));
          console.log("✅ Datos recargados");
        } catch (reloadError) {
          console.error("❌ Error al recargar:", reloadError);
          toast.warn("Cargo añadido pero no se pudieron actualizar los datos automáticamente");
        }

        // 🔧 RESET SEGURO
        resetForm(false);
        toast.success("✅ Cargo extra añadido exitosamente");
        
        // 🎯 NOTIFICAR AL PADRE SOBRE EL ÉXITO
        if (onSuccess) {
          onSuccess({
            chargeAmount: amountValue,
            description: description.trim(),
            quantity: parseInt(quantity, 10)
          });
        }
        
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
      console.log("🔄 Finalizando submit...");
      setIsSubmitting(false);
      console.groupEnd();
    }
  };

  // 🔧 MANEJAR CIERRE DEL MODAL
  const handleClose = () => {
    if (isSubmitting) {
      toast.warn("⏳ Espera a que termine de procesar el cargo actual");
      return;
    }
    
    resetForm(false);
    if (onClose) {
      onClose();
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
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <div className="text-sm text-gray-500">⏳ Cargando datos...</div>
          </div>
        </div>
      </div>
    );
  }

  // 🛡️ VERIFICAR SI HAY DATOS MÍNIMOS PARA RENDERIZAR
  if (!bookingId) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
          <div className="text-center">
            <div className="text-sm text-red-500">❌ Error: bookingId no disponible</div>
            <button 
              onClick={handleClose}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 🔧 RENDERIZADO PRINCIPAL COMO MODAL
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* 🎯 HEADER DEL MODAL */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold">➕ Cargos Extras</h3>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-white hover:text-gray-200 text-xl font-bold disabled:opacity-50"
            >
              ✕
            </button>
          </div>
          <div className="text-sm opacity-90 mt-1">
            Reserva #{bookingId} - {currentBooking?.guest?.scostumername}
          </div>
        </div>

        <div className="p-6">
          {/* 📊 RESUMEN FINANCIERO */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium text-blue-800">💰 Resumen de Cargos Extras:</span>
              <span className="text-xl font-bold text-blue-600">
                ${totalExtraCharges.toLocaleString()}
              </span>
            </div>
            <div className="text-sm text-blue-600">
              {extraCharges.length} cargo(s) registrado(s)
              {financials && (
                <span className="ml-2">
                  • Total cuenta: {financials.totalFinalFormatted}
                </span>
              )}
            </div>
          </div>

          {/* 🔧 BOTÓN PARA MOSTRAR/OCULTAR FORMULARIO */}
          <div className="mb-4">
            <button
              onClick={() => setShowForm(!showForm)}
              disabled={isSubmitting}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{showForm ? "➖" : "➕"}</span>
              {showForm ? "Ocultar formulario" : "Añadir nuevo cargo extra"}
            </button>
          </div>

          {/* 📋 FORMULARIO DE CARGOS EXTRAS */}
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 border p-4 rounded-lg bg-gray-50 mb-6">
              <h4 className="font-medium text-gray-800 border-b pb-2">📝 Nuevo Cargo Extra</h4>
              
              {/* Selector de producto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📦 Producto del inventario (opcional):
                </label>
                <select
                  value={selectedItem}
                  onChange={handleItemSelect}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">➕ Cargo personalizado (sin producto)</option>
                  {sellableItems.map((item) => (
                    <option key={item.itemId || item.id} value={item.itemId || item.id}>
                      {item.itemName || item.name} - ${parseFloat(item.salePrice || 0).toLocaleString()} 
                      (Stock: {item.currentStock})
                    </option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Descripción: *
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  placeholder="Ej: Bebida, Servicio de lavandería, etc."
                  required
                />
              </div>

              {/* Cantidad y Monto en la misma fila */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    💵 Precio unitario: *
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
                </div>
              </div>

              {/* Información del total */}
              {amount && quantity && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-700">
                      💰 Total del cargo:
                    </span>
                    <span className="text-lg font-bold text-green-600">
                      ${(parseFloat(amount || 0) * parseInt(quantity || 1)).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-green-600 mt-1">
                    {quantity} x ${parseFloat(amount || 0).toLocaleString()}
                  </div>
                </div>
              )}

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
                    🔧 Usar precio personalizado (diferente al del inventario)
                  </label>
                </div>
              )}

              {/* Botones del formulario */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="submit"
                  disabled={isSubmitting || !amount || !description || !quantity}
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
                  ❌ Limpiar
                </button>
              </div>
            </form>
          )}

          {/* 📋 LISTA DE CARGOS EXISTENTES */}
          {extraCharges.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-700 mb-3">📋 Cargos registrados:</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                {extraCharges.map((charge, idx) => {
                  if (!charge) return null;
                  
                  const unitAmount = parseFloat(charge.amount) || 0;
                  const qty = parseInt(charge.quantity) || 1;
                  const totalAmount = unitAmount * qty;
                  
                  return (
                    <div key={charge.id || idx} className="flex justify-between items-center p-3 bg-white rounded border shadow-sm">
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {charge.description || 'Sin descripción'}
                        </div>
                        <div className="text-sm text-gray-600">
                          {qty > 1 ? (
                            <span>{qty} x ${unitAmount.toLocaleString()} c/u</span>
                          ) : (
                            <span>Cantidad: 1</span>
                          )}
                          {charge.chargeDate && (
                            <span className="ml-2">
                              • {new Date(charge.chargeDate).toLocaleDateString('es-CO')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-green-600">
                          ${totalAmount.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Total de todos los cargos */}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-blue-800">
                    💰 Total cargos extras:
                  </span>
                  <span className="text-xl font-bold text-blue-600">
                    ${totalExtraCharges.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 🎛️ BOTONES DE ACCIÓN DEL MODAL */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? "⏳ Procesando..." : "✅ Finalizar"}
            </button>
          </div>

          {/* Debug info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-400 bg-gray-100 p-2 rounded mt-4">
              🔍 Debug: BookingId={bookingId}, Items={sellableItems?.length}, 
              Charges={extraCharges?.length}, Submitting={isSubmitting}, 
              Total=${totalExtraCharges}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExtraCharges;