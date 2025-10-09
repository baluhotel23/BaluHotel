import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllItems,
  updateItem,
  deleteItem,
  addStock,
  removeStock,
} from "../../Redux/Actions/inventoryActions";
import { toast } from "react-toastify";
import DashboardLayout from "./DashboardLayout"; // ⭐ NUEVO
import { FaEdit, FaTrash, FaBoxOpen } from "react-icons/fa";

const ManageItems = () => {
  const dispatch = useDispatch();
  const inventory = useSelector((state) => state.inventory?.inventory || []);
  const [editingItem, setEditingItem] = useState(null); // Para manejar el item que se está editando
  
  // Función para traducir categorías del inglés al español
  const getCategoryText = (category) => {
    const categoryMap = {
      'Room': 'Habitación',
      'Bathroom': 'Baño',
      'Kitchen': 'Cocina',
      'Other': 'Otro'
    };
    return categoryMap[category] || category;
  };

  useEffect(() => {
    dispatch(getAllItems());
  }, [dispatch]);
  console.log("Items del inventario:", inventory);

  const handleEdit = (item) => {
    if (!item) return;

    setEditingItem({
      ...item,
      id: item.id || null,
      itemId: item.itemId || null,
      name: item.name || item.itemName || null,
      description: item.description || "",
      isSellable: item.isSellable || false,
      salePrice: item.salePrice || 0,
    });

    console.log("Editando item:", {
      idItem: item.id || item.itemId,
      editingId: item.id || null,
      editingItemId: item.itemId || null,
    });
  };

  const handleSave = async (id, updatedData) => {
    // Si no es vendible, asegurarse de que salePrice sea null
    const dataToSend = {
      ...updatedData,
      salePrice: updatedData.isSellable ? updatedData.salePrice : null,
    };

    console.log("Datos enviados al backend para actualizar:", dataToSend);

    const { success } = await dispatch(updateItem(id, dataToSend));
    if (success) {
      toast.success("Item actualizado exitosamente");
      setEditingItem(null); // Salir del modo edición
      dispatch(getAllItems()); // Refrescar la lista
    } else {
      toast.error("Error al actualizar el item");
    }
  };

  // Define handleCancel
  const handleCancel = () => {
    setEditingItem(null);
  };

  // Define handleAddStock
  const handleAddStock = (id) => {
    const quantity = parseInt(prompt("¿Cuánto stock deseas añadir?"), 10);
    if (!isNaN(quantity) && quantity > 0) {
      dispatch(addStock(id, quantity));
      toast.success("Stock añadido correctamente");
      dispatch(getAllItems());
    } else {
      toast.error("Cantidad inválida");
    }
  };

  // Define handleRemoveStock
  const handleRemoveStock = (id) => {
    // Puedes mostrar un prompt para la cantidad a remover, o implementar tu lógica aquí
    const quantity = parseInt(prompt("¿Cuánto stock deseas remover?"), 10);
    if (!isNaN(quantity) && quantity > 0) {
      dispatch(removeStock(id, quantity));
      toast.success("Stock removido correctamente");
      dispatch(getAllItems());
    } else {
      toast.error("Cantidad inválida");
    }
  };

  // Define handleDelete
  const handleDelete = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este item?")) {
      const { success } = await dispatch(deleteItem(id));
      if (success) {
        toast.success("Item eliminado exitosamente");
        dispatch(getAllItems());
      } else {
        toast.error("Error al eliminar el item");
      }
    }
  };

  const filteredInventory = (inventory || []).filter(
    (item) => item && (item.name || item.itemName)
  );

  const isInventoryEmpty = filteredInventory.length === 0;

  return (
    <DashboardLayout>
      <div className="max-w-full overflow-x-auto p-4 bg-white shadow-md rounded-lg">
        {isInventoryEmpty ? (
          // Mostrar mensaje cuando no hay items en el inventario
          <div className="text-center py-12">
            <FaBoxOpen className="mx-auto text-4xl text-gray-400 mb-4" />
            <h3 className="text-xl font-medium text-gray-600 mb-2">
              No hay elementos en el inventario
            </h3>
            <p className="text-gray-500 mb-4">
              Para comenzar, crea un nuevo elemento usando el formulario de la
              izquierda.
            </p>
          </div>
        ) : (
        // Mostrar tabla cuando hay items
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2">Nombre</th>
              <th className="border border-gray-300 px-4 py-2">Descripción</th>
              <th className="border border-gray-300 px-4 py-2">Stock Actual</th>
              <th className="border border-gray-300 px-4 py-2">Stock Mínimo</th>
              <th className="border border-gray-300 px-4 py-2">
                Precio Unitario
              </th>
              <th className="border border-gray-300 px-4 py-2">Vendible</th>
              <th className="border border-gray-300 px-4 py-2">Precio Venta</th>
              <th className="border border-gray-300 px-4 py-2">Categoría</th>
              <th className="border border-gray-300 px-4 py-2">Activo</th>
              <th className="border border-gray-300 px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.map((item) => (
              <tr
                key={item.itemId || item.id}
                className={`${
                  item.currentStock <= item.minStock ? "bg-red-100" : ""
                }`}
                title={item.currentStock <= item.minStock ? "POCO STOCK" : ""}
              >
                {editingItem &&
                ((item.id && editingItem.id === item.id) ||
                  (item.itemId && editingItem.itemId === item.itemId)) ? (
                  <>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="text"
                        value={editingItem?.name || editingItem?.itemName || ""}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            name: e.target.value,
                            itemName: e.target.value,
                          })
                        }
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="text"
                        value={editingItem?.description || ""}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            description: e.target.value,
                          })
                        }
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={editingItem?.currentStock || 0}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            currentStock: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={editingItem?.minStock || 0}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            minStock: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={editingItem?.unitPrice || 0}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            unitPrice: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 border rounded"
                        step="0.01"
                      />
                    </td>
                    {/* Nuevo: Campo para marcar como vendible */}
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={editingItem?.isSellable || false}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            isSellable: e.target.checked,
                          })
                        }
                        className="form-checkbox h-4 w-4 text-green-600"
                      />
                    </td>
                    {/* Nuevo: Campo para precio de venta */}
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="number"
                        value={editingItem?.salePrice || 0}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            salePrice: Number(e.target.value),
                          })
                        }
                        className={`w-full px-2 py-1 border rounded ${
                          !editingItem?.isSellable ? "bg-gray-100" : "bg-white"
                        }`}
                        step="0.01"
                        disabled={!editingItem?.isSellable}
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <select
                        value={editingItem?.category || "Other"}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            category: e.target.value,
                          })
                        }
                        className="w-full px-2 py-1 border rounded"
                      >
                        <option value="Room">Habitación</option>
                        <option value="Bathroom">Baño</option>
                        <option value="Kitchen">Cocina</option>
                        <option value="Other">Otro</option>
                      </select>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={editingItem?.isActive}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            isActive: e.target.checked,
                          })
                        }
                        className="form-checkbox h-4 w-4 text-blue-600"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <button
                        onClick={() =>
                          handleSave(item.id || item.itemId, editingItem)
                        }
                        className="bg-green-500 text-white px-2 py-1 rounded mb-1 text-xs w-full"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-gray-500 text-white px-2 py-1 rounded text-xs w-full mt-1"
                      >
                        Cancelar
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border border-gray-300 px-4 py-2">
                      {item.name || item.itemName}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {item.description}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {item.currentStock}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {item.minStock}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {item.unitPrice}
                    </td>
                    {/* Nuevo: Mostrar si es vendible */}
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      {item.isSellable ? (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          Sí
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                          No
                        </span>
                      )}
                    </td>
                    {/* Nuevo: Mostrar precio de venta */}
                    <td className="border border-gray-300 px-4 py-2">
                      {item.isSellable ? (
                        <span className="font-semibold">${item.salePrice}</span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {getCategoryText(item.category)}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {item.isActive ? "Sí" : "No"}
                    </td>
                    <td className="border px-4 py-2 flex justify-center space-x-2">
                      <FaEdit
                        onClick={() => handleEdit(item)}
                        className="text-blue-500 cursor-pointer hover:text-blue-700"
                        title="Editar"
                      />
                      <FaTrash
                        onClick={() => handleDelete(item.id || item.itemId)}
                        className="text-red-500 cursor-pointer hover:text-red-700"
                        title="Eliminar"
                      />
                      <button
                        onClick={() => handleAddStock(item.id || item.itemId)}
                        className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                        title="Añadir Stock"
                      >
                        + Stock
                      </button>
                      <button
                        onClick={() =>
                          handleRemoveStock(item.id || item.itemId)
                        }
                        className="bg-yellow-500 text-white px-2 py-1 rounded text-xs hover:bg-yellow-600"
                        title="Remover Stock"
                      >
                        - Stock
                      </button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </div>
    </DashboardLayout>
  );
};

export default ManageItems;
