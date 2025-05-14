import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllItems, updateItem, deleteItem, addStock, removeStock } from "../../Redux/Actions/inventoryActions";
import { toast } from "react-toastify";
import DashboardLayout from "./DashboardLayout";
import { FaEdit, FaTrash } from "react-icons/fa";

const ManageItems = () => {
  const dispatch = useDispatch();
  const { inventory } = useSelector((state) => state.inventory); // Asegúrate de que el reducer esté configurado correctamente
  const [editingItem, setEditingItem] = useState(null); // Para manejar el item que se está editando

  useEffect(() => {
    dispatch(getAllItems());
  }, [dispatch]);

  const handleEdit = (item) => {
    setEditingItem(item); // Establece el item que se está editando
  };

  const handleSave = async (id, updatedData) => {
    console.log("Datos enviados al backend para actualizar:", updatedData);

    const { success } = await dispatch(updateItem(id, updatedData));
    if (success) {
      toast.success("Item actualizado exitosamente");
      setEditingItem(null); // Salir del modo edición
      dispatch(getAllItems()); // Refrescar la lista
    } else {
      toast.error("Error al actualizar el item");
    }
  };

  const handleAddStock = async (id) => {
    const quantity = prompt("Ingrese la cantidad a añadir:");
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      toast.error("Cantidad inválida");
      return;
    }
  
    const { success } = await dispatch(addStock(id, Number(quantity)));
    if (success) {
      dispatch(getAllItems()); // Refrescar la lista
    }
  };
  
  const handleRemoveStock = async (id) => {
    const quantity = prompt("Ingrese la cantidad a remover:");
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      toast.error("Cantidad inválida");
      return;
    }
  
    const { success } = await dispatch(removeStock(id, Number(quantity)));
    if (success) {
      dispatch(getAllItems()); // Refrescar la lista
    }
  };

  const handleDelete = (id) => {
    toast(
      ({ closeToast }) => (
        <div>
          <p>¿Estás seguro de que deseas eliminar este item?</p>
          <div className="flex justify-end mt-2">
            <button
              onClick={async () => {
                const { success } = await dispatch(deleteItem(id));
                if (success) {
                  toast.success("Item eliminado exitosamente");
                  dispatch(getAllItems()); // Refrescar la lista
                } else {
                  toast.error("Error al eliminar el item");
                }
                closeToast(); // Cierra el toast
              }}
              className="bg-red-500 text-white px-3 py-1 rounded mr-2"
            >
              Sí, eliminar
            </button>
            <button
              onClick={closeToast}
              className="bg-gray-500 text-white px-3 py-1 rounded"
            >
              Cancelar
            </button>
          </div>
        </div>
      ),
      { autoClose: false } // Evita que el toast se cierre automáticamente
    );
  };

  const handleCancel = () => {
    setEditingItem(null); // Salir del modo edición sin guardar
  };

  return (
    <DashboardLayout>
      <div className="max-w-full overflow-x-auto p-4 bg-white shadow-md rounded-lg">
       
        <table className="w-full border-collapse border border-gray-300 text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2">Nombre</th>
              <th className="border border-gray-300 px-4 py-2">Descripción</th>
              <th className="border border-gray-300 px-4 py-2">Stock Actual</th>
              <th className="border border-gray-300 px-4 py-2">Stock Mínimo</th>
              <th className="border border-gray-300 px-4 py-2">Precio Unitario</th>
              <th className="border border-gray-300 px-4 py-2">Categoría</th>
              <th className="border border-gray-300 px-4 py-2">Activo</th>
              <th className="border border-gray-300 px-4 py-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {inventory.map((item) => (
              <tr
                key={item.id}
                className={`${
                  item.currentStock <= item.minStock ? "bg-red-100" : ""
                }`}
                title={item.currentStock <= item.minStock ? "POCO STOCK" : ""} // Tooltip para filas con poco stock
              >
                {editingItem?.id === item.id ? (
                  <>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="text"
                        value={editingItem.name}
                        onChange={(e) =>
                          setEditingItem({ ...editingItem, name: e.target.value })
                        }
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="text"
                        value={editingItem.description}
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
                        value={editingItem.currentStock}
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
                        value={editingItem.minStock}
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
                        value={editingItem.unitPrice}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            unitPrice: Number(e.target.value),
                          })
                        }
                        className="w-full px-2 py-1 border rounded"
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <select
                        value={editingItem.category}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            category: e.target.value,
                          })
                        }
                        className="w-full px-2 py-1 border rounded"
                      >
                        <option value="Room">Room</option>
                        <option value="Bathroom">Bathroom</option>
                        <option value="Kitchen">Kitchen</option>
                        <option value="Other">Other</option>
                      </select>
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <input
                        type="checkbox"
                        checked={editingItem.isActive}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            isActive: e.target.checked,
                          })
                        }
                      />
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      <button
                        onClick={() => handleSave(item.id, editingItem)}
                        className="bg-green-500 text-white px-2 py-1 rounded mb-1 text-xs"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={handleCancel}
                        className="bg-gray-500 text-white px-2 py-1 rounded text-xs"
                      >
                        Cancelar
                      </button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="border border-gray-300 px-4 py-2">{item.name}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.description}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.currentStock}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.minStock}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.unitPrice}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.category}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      {item.isActive ? "Sí" : "No"}
                    </td>
                    <td className="border px-4 py-2 flex justify-center space-x-2">
  {/* Ícono para editar */}
  <FaEdit
    onClick={() => handleEdit(item)}
    className="text-blue-500 cursor-pointer hover:text-blue-700"
    title="Editar"
  />

  {/* Ícono para eliminar */}
  <FaTrash
    onClick={() => handleDelete(item.id)}
    className="text-red-500 cursor-pointer hover:text-red-700"
    title="Eliminar"
  />

  {/* Botón para añadir stock */}
  <button
    onClick={() => handleAddStock(item.id)}
    className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
    title="Añadir Stock"
  >
    + Stock
  </button>

  {/* Botón para remover stock */}
  <button
    onClick={() => handleRemoveStock(item.id)}
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
      </div>
    </DashboardLayout>
  );
};

export default ManageItems;