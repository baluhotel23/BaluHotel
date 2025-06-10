import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
// ⭐ VERIFICAR QUE ESTA ACTION EXISTA - SI NO, CREARLA
import { createItem } from "../../Redux/Actions/inventoryActions";
import { toast } from "react-toastify";
import DashboardLayout from "./DashboardLayout";
import ManageItems from "./ManageItems";

const CreateItems = () => {
  const dispatch = useDispatch();
  
  // ⭐ USAR EL ESTADO CON FALLBACKS SEGUROS
  const inventoryState = useSelector((state) => state.inventory || {});
  const { 
    loading = {}, 
    errors = {}, 
    success = {} 
  } = inventoryState;

  const isCreating = loading.creating || false;
  const createError = errors.creating || null;

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Other",
    // ⭐ USAR LOS VALORES CORRECTOS DEL ENUM DEL BACKEND
    inventoryType: "consumable", // consumable | reusable | sellable
    currentStock: 0,
    cleanStock: 0, // Solo para reusables
    dirtyStock: 0, // Solo para reusables
    minStock: 10,
    minCleanStock: 0, // Solo para reusables
    unitPrice: 0.0,
    salePrice: 0.0,
    washingTime: 60, // Solo para reusables (minutos)
    isActive: true,
  });

  // ⭐ MANEJAR CAMBIOS EN EL TIPO DE INVENTARIO
  useEffect(() => {
    if (formData.inventoryType === 'reusable') {
      // Para reusables, el stock inicial se divide en limpio
      setFormData(prev => ({
        ...prev,
        cleanStock: prev.currentStock,
        dirtyStock: 0,
        minCleanStock: Math.ceil(prev.minStock * 0.7) // 70% debe estar limpio
      }));
    } else {
      // Para consumibles/vendibles, resetear campos de lavandería
      setFormData(prev => ({
        ...prev,
        cleanStock: 0,
        dirtyStock: 0,
        minCleanStock: 0,
        washingTime: 60
      }));
    }
  }, [formData.inventoryType]);

  // ⭐ MANEJO DE ÉXITO
  useEffect(() => {
    if (success.message && success.type === 'create') {
      toast.success(success.message);
      // Reset form
      setFormData({
        name: "",
        description: "",
        category: "Other",
        inventoryType: "consumable",
        currentStock: 0,
        cleanStock: 0,
        dirtyStock: 0,
        minStock: 10,
        minCleanStock: 0,
        unitPrice: 0.0,
        salePrice: 0.0,
        washingTime: 60,
        isActive: true,
      });
      dispatch({ type: 'CLEAR_INVENTORY_SUCCESS' });
    }
  }, [success, dispatch]);

  // ⭐ MANEJO DE ERRORES
  useEffect(() => {
    if (createError) {
      toast.error(createError);
      dispatch({ type: 'CLEAR_INVENTORY_ERRORS' });
    }
  }, [createError, dispatch]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ⭐ VALIDACIONES
    if (!formData.name.trim()) {
      toast.error("El nombre del item es requerido");
      return;
    }

    if (!formData.description.trim()) {
      toast.error("La descripción es requerida");
      return;
    }

    if (formData.currentStock < 0) {
      toast.error("El stock no puede ser negativo");
      return;
    }

    if (formData.inventoryType === 'sellable' && formData.salePrice <= 0) {
      toast.error("Los items vendibles deben tener un precio de venta");
      return;
    }

    // ⭐ PREPARAR DATOS SEGÚN EL MODELO
    const dataToSend = {
      name: formData.name,
      description: formData.description,
      category: formData.category,
      inventoryType: formData.inventoryType,
      currentStock: formData.currentStock,
      minStock: formData.minStock,
      unitPrice: formData.unitPrice,
      isActive: formData.isActive,
      
      // ⭐ CAMPOS CONDICIONALES SEGÚN TIPO
      ...(formData.inventoryType === 'reusable' && {
        cleanStock: formData.cleanStock,
        dirtyStock: formData.dirtyStock,
        minCleanStock: formData.minCleanStock,
        washingTime: formData.washingTime
      }),
      
      ...(formData.inventoryType === 'sellable' && {
        salePrice: formData.salePrice
      })
    };

    dispatch(createItem(dataToSend));
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        <div className="bg-white shadow-md rounded-lg p-4 col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Cargar Inventario</h2>
            {isCreating && (
              <div className="flex items-center text-blue-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm">Creando...</span>
              </div>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ⭐ NOMBRE */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Item *
              </label>
              <input
                type="text"
                name="name"
                placeholder="Ej: Toallas blancas, Jabón líquido"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
                required
                disabled={isCreating}
              />
            </div>

            {/* ⭐ TIPO DE INVENTARIO CORREGIDO */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Inventario *
              </label>
              <select
                name="inventoryType"
                value={formData.inventoryType}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
                required
                disabled={isCreating}
              >
                <option value="consumable">🗑️ Consumible (Uso único)</option>
                <option value="reusable">♻️ Reutilizable (Lavandería)</option>
                <option value="sellable">💰 Vendible (A huéspedes)</option>
              </select>
            </div>

            {/* ⭐ DESCRIPCIÓN */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción *
              </label>
              <textarea
                name="description"
                placeholder="Descripción detallada del item"
                value={formData.description}
                onChange={handleChange}
                rows="2"
                className="w-full px-3 py-2 text-sm border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white resize-none"
                required
                disabled={isCreating}
              />
            </div>

            {/* ⭐ CATEGORÍA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white"
                required
                disabled={isCreating}
              >
                <option value="Room">🛏️ Habitación</option>
                <option value="Bathroom">🚿 Baño</option>
                <option value="Kitchen">🍽️ Cocina</option>
                <option value="Cafeteria">☕ Cafetería</option>
                <option value="Laundry">👕 Lavandería</option>
                <option value="Other">📦 Otros</option>
              </select>
            </div>

            {/* ⭐ STOCK - LAYOUT INTELIGENTE */}
            {formData.inventoryType === 'reusable' ? (
              // Para items reutilizables - mostrar clean/dirty
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">
                      🧼 Stock Limpio *
                    </label>
                    <input
                      type="number"
                      name="cleanStock"
                      value={formData.cleanStock}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-green-300 rounded-md bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-400"
                      min="0"
                      required
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-orange-700 mb-1">
                      🧺 Stock Sucio
                    </label>
                    <input
                      type="number"
                      name="dirtyStock"
                      value={formData.dirtyStock}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-orange-300 rounded-md bg-orange-50 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      min="0"
                      disabled={isCreating}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      📦 Stock Mínimo Total *
                    </label>
                    <input
                      type="number"
                      name="minStock"
                      value={formData.minStock}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      min="1"
                      required
                      disabled={isCreating}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-green-700 mb-1">
                      🧼 Mín. Limpio *
                    </label>
                    <input
                      type="number"
                      name="minCleanStock"
                      value={formData.minCleanStock}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-sm border border-green-300 rounded-md bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-400"
                      min="0"
                      disabled={isCreating}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    ⏱️ Tiempo de Lavado (minutos)
                  </label>
                  <input
                    type="number"
                    name="washingTime"
                    value={formData.washingTime}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-blue-300 rounded-md bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    min="1"
                    disabled={isCreating}
                  />
                </div>
              </>
            ) : (
              // Para items consumibles/vendibles - stock simple
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    📦 Stock Inicial *
                  </label>
                  <input
                    type="number"
                    name="currentStock"
                    value={formData.currentStock}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    min="0"
                    required
                    disabled={isCreating}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    🔻 Stock Mínimo *
                  </label>
                  <input
                    type="number"
                    name="minStock"
                    value={formData.minStock}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    min="1"
                    required
                    disabled={isCreating}
                  />
                </div>
              </div>
            )}

            {/* ⭐ PRECIOS */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  💵 Precio Costo *
                </label>
                <input
                  type="number"
                  name="unitPrice"
                  value={formData.unitPrice}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  step="0.01"
                  min="0"
                  required
                  disabled={isCreating}
                />
              </div>
              {formData.inventoryType === 'sellable' && (
                <div>
                  <label className="block text-sm font-medium text-green-700 mb-1">
                    💰 Precio Venta *
                  </label>
                  <input
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm border border-green-300 rounded-md bg-green-50 focus:outline-none focus:ring-2 focus:ring-green-400"
                    step="0.01"
                    min="0.01"
                    required
                    disabled={isCreating}
                  />
                </div>
              )}
            </div>

            {/* ⭐ ESTADO ACTIVO */}
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="form-checkbox h-4 w-4 text-blue-600 rounded"
                  disabled={isCreating}
                />
                <span className="ml-2 text-sm text-gray-700">Item activo</span>
              </label>
            </div>
            
            {/* ⭐ BOTÓN */}
            <button
              type="submit"
              disabled={isCreating}
              className={`w-full py-2 px-4 rounded-md shadow text-sm font-medium transition-colors
                ${isCreating 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                } text-white`}
            >
              {isCreating ? 'Creando Item...' : 'Crear Item'}
            </button>
          </form>
        </div>

        <div className="col-span-2">
          <ManageItems />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateItems;