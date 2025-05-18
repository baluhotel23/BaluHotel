import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { createItem } from "../../Redux/Actions/inventoryActions";
import { toast } from "react-toastify";
import DashboardLayout from "./DashboardLayout";
import ManageItems from "./ManageItems";

const CreateItems = () => {
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    currentStock: 0,
    minStock: 10,
    unitPrice: 0.0,
    salePrice: 0.0,
    isSellable: false,
    category: "",
    isActive: true,
  });

  // Sugerir precio de venta automáticamente (20% sobre el costo)
  useEffect(() => {
    if (formData.isSellable && formData.unitPrice > 0) {
      // Solo sugerir si el precio de venta no ha sido modificado manualmente
      if (formData.salePrice === 0) {
        const suggestedPrice = Math.round(formData.unitPrice * 1.2 * 100) / 100;
        setFormData(prev => ({...prev, salePrice: suggestedPrice}));
      }
    }
  }, [formData.isSellable, formData.unitPrice]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: type === "checkbox" ? checked : type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación para items vendibles
    if (formData.isSellable && formData.salePrice <= 0) {
      toast.error("Los items vendibles deben tener un precio de venta mayor a 0");
      return;
    }

    // Preparar datos para enviar
    const dataToSend = {
      ...formData,
      // Si no es vendible, asegurar que salePrice sea null
      salePrice: formData.isSellable ? formData.salePrice : null
    };

    const { success } = await dispatch(createItem(dataToSend));
    if (success) {
      toast.success("Item creado exitosamente");
      setFormData({
        name: "",
        description: "",
        currentStock: 0,
        minStock: 10,
        unitPrice: 0.0,
        salePrice: 0.0,
        isSellable: false,
        category: "",
        isActive: true,
      });
    } else {
      toast.error("Error al crear el item");
    }
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
        {/* Formulario compacto */}
        <div className="bg-white shadow-md rounded-lg p-4 col-span-1">
          <h2 className="text-lg font-light bg-slate-300 text-center mb-2">Cargar Stock</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-2">
            <input
              type="text"
              name="name"
              placeholder="Nombre"
              value={formData.name || ""}
              onChange={handleChange}
              className="px-2 py-1 text-sm border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
            <textarea
              name="description"
              placeholder="Descripción"
              value={formData.description || ""}
              onChange={handleChange}
              className="px-2 py-1 text-sm border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
            <input
              type="number"
              name="currentStock"
              placeholder="Stock Actual"
              value={formData.currentStock || ""}
              onChange={handleChange}
              className="px-2 py-1 text-sm border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              min="0"
              required
            />
            <input
              type="number"
              name="minStock"
              placeholder="Stock Mínimo"
              value={formData.minStock || ""}
              onChange={handleChange}
              className="px-2 py-1 text-sm border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              min="0"
              required
            />
            <input
              type="number"
              name="unitPrice"
              placeholder="Precio Unitario (costo)"
              value={formData.unitPrice || ""}
              onChange={handleChange}
              className="px-2 py-1 text-sm border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              step="0.01"
              required
            />
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="px-2 py-1 text-sm border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            >
              <option value="">Selecciona Categoría</option>
              <option value="Room">Room</option>
              <option value="Bathroom">Bathroom</option>
              <option value="Kitchen">Kitchen</option>
              <option value="Other">Other</option>
            </select>
            
            {/* Checkboxes para activo y vendible */}
            <div className="flex justify-between items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="form-checkbox h-4 w-4 text-blue-600"
                />
                <span className="ml-2 text-sm text-gray-700">Activo</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isSellable"
                  checked={formData.isSellable}
                  onChange={handleChange}
                  className="form-checkbox h-4 w-4 text-green-600"
                />
                <span className="ml-2 text-sm text-gray-700">Vendible a huéspedes</span>
              </label>
            </div>
            
            {/* Campo condicional de precio de venta */}
            {formData.isSellable && (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de Venta
                </label>
                <input
                  type="number"
                  name="salePrice"
                  placeholder="Precio para huéspedes"
                  value={formData.salePrice || ""}
                  onChange={handleChange}
                  className="w-full px-2 py-1 text-sm border rounded bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  step="0.01"
                  min="0.01"
                  required={formData.isSellable}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este precio será usado para ventas a los huéspedes
                </p>
              </div>
            )}
            
            <button
              type="submit"
              className="bg-boton text-white py-1 px-4 rounded-md shadow hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm mt-2"
            >
              Crear
            </button>
          </form>
        </div>

        {/* Tabla de gestión */}
        <div className="col-span-2">
          <ManageItems />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreateItems;