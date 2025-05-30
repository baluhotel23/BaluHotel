import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllRooms,
  updateRoom,
  deleteRoom,
} from "../../Redux/Actions/roomActions";
import { getAllServices } from "../../Redux/Actions/serviceActions";
import DashboardLayout from "./DashboardLayout";
import { openCloudinaryWidget } from "../../cloudinaryConfig";
import { toast } from "react-toastify";

const RoomList = () => {
  const dispatch = useDispatch();
  const { rooms, loading, error } = useSelector((state) => state.room);
  const { services } = useSelector((state) => state.service);
  const inventory = useSelector((state) => state.inventory.inventory || []);
  const [editingRoom, setEditingRoom] = useState(null);
  const [selectedItem, setSelectedItem] = useState(""); // ID del item seleccionado
  const [newItemQuantity, setNewItemQuantity] = useState(1); // Cantidad del nuevo item
  const [formData, setFormData] = useState({
    roomNumber: "",
    price: "",
    services: [],
    basicInventories: [], // Añadir este campo
    type: "",
    description: "",
    maxGuests: 1,
    image_url: [],
    available: false,
    isPromo: false,
    promotionPrice: null,
    status: null,
    isActive: true,
  });

  useEffect(() => {
    dispatch(getAllRooms());
    dispatch(getAllServices());
  }, [dispatch]);

  useEffect(() => {
    if (editingRoom) {
      setFormData({
        roomNumber: editingRoom.roomNumber,
        price: editingRoom.price,
        services: editingRoom.Services
          ? editingRoom.Services.map((service) => service.name)
          : [],
        basicInventories: editingRoom.BasicInventories || [],
        type: editingRoom.type,
        description: editingRoom.description,
        maxGuests: editingRoom.maxGuests,
        image_url: editingRoom.image_url || [],
        available: editingRoom.available,
        isPromo: editingRoom.isPromo,
        promotionPrice: editingRoom.promotionPrice,
        status: editingRoom.status,
        isActive: editingRoom.isActive,
      });
    }
  }, [editingRoom]);

  const handleEdit = (room) => {
    setEditingRoom(room);
  };

  const handleChange = (e) => {
    const { name, value, type, selectedOptions, checked } = e.target;
    if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: checked,
      });
    } else if (name === "services") {
      const selectedServices = Array.from(
        selectedOptions,
        (option) => option.value
      );
      setFormData({
        ...formData,
        [name]: selectedServices,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };
  const handleAddBasicInventory = () => {
    if (!selectedItem || newItemQuantity <= 0) {
      toast.error("Por favor, selecciona un item y una cantidad válida.");
      return;
    }

    const item = inventory.find((inv) => inv.id === selectedItem);
    if (!item) {
      toast.error("El item seleccionado no existe.");
      return;
    }

    // Verificar si el item ya está en los BasicInventories
    const existingInventory = formData.basicInventories.find(
      (inv) => inv.id === selectedItem
    );
    if (existingInventory) {
      toast.error("Este item ya está en el inventario básico.");
      return;
    }

    // Agregar el nuevo item al estado
    setFormData((prevFormData) => ({
      ...prevFormData,
      basicInventories: [
        ...prevFormData.basicInventories,
        {
          id: selectedItem,
          name: item.name,
          RoomBasics: { quantity: newItemQuantity },
        },
      ],
    }));

    // Reiniciar los campos de selección
    setSelectedItem("");
    setNewItemQuantity(1);

    toast.success("Item agregado correctamente.");
  };

  const handleWidget = () => {
    openCloudinaryWidget((uploadedImageUrl) => {
      setFormData((prevFormData) => ({
        ...prevFormData,
        image_url: [...prevFormData.image_url, uploadedImageUrl],
      }));
    });
  };

  const handleImageDelete = (url) => {
    setFormData({
      ...formData,
      image_url: formData.image_url.filter((image) => image !== url),
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatedData = {
        ...formData,
        basicInventories: formData.basicInventories.map((inventory) => ({
          id: inventory.id,
          quantity: inventory.RoomBasics.quantity, // Solo enviar ID y cantidad
        })),
      };

      await dispatch(updateRoom(formData.roomNumber, updatedData));
      setEditingRoom(null);
      dispatch(getAllRooms()); // Refrescar la lista de habitaciones
      toast.success("Habitación actualizada correctamente.");
    } catch (error) {
      console.error("Error updating room:", error);
      toast.error("Error al actualizar la habitación.");
    }
  };
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold mb-4">Lista de Habitaciones</h1>
      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <p>Error: {error}</p>
      ) : (
        <div className="space-y-6">
          {rooms.map((room) => (
            <div
              key={room.roomNumber}
              className="bg-white p-4 rounded-lg shadow-md"
            >
              <div className="flex flex-col md:flex-row md:items-center">
                <div className="flex-shrink-0">
                  <div className="mt-4">
                    <h4 className="text-md font-bold">Imágenes</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {formData.image_url.map((img, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={img}
                            alt={`Imagen ${index + 1}`}
                            className="w-full h-24 object-cover rounded-md"
                          />
                          {editingRoom && (
                            <button
                              type="button"
                              onClick={() => handleImageDelete(img)}
                              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {editingRoom && (
                      <button
                        type="button"
                        onClick={handleWidget}
                        className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                      >
                        Agregar Imagen
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Número de Habitación
                      </label>
                      <p className="mt-1">{room.roomNumber}</p>
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Descripción
                      </label>
                      {editingRoom &&
                      editingRoom.roomNumber === room.roomNumber ? (
                        <input
                          type="text"
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <p className="mt-1">{room.description}</p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Precio
                      </label>
                      {editingRoom &&
                      editingRoom.roomNumber === room.roomNumber ? (
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleChange}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <p className="mt-1">{room.price}</p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Capacidad
                      </label>
                      {editingRoom &&
                      editingRoom.roomNumber === room.roomNumber ? (
                        <input
                          type="number"
                          name="maxGuests"
                          value={formData.maxGuests}
                          onChange={handleChange}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <p className="mt-1">{room.maxGuests}</p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Servicios
                      </label>
                      {editingRoom &&
                      editingRoom.roomNumber === room.roomNumber ? (
                        <select
                          name="services"
                          value={formData.services}
                          onChange={handleChange}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          multiple
                        >
                          {services.map((service) => (
                            <option key={service.id} value={service.name}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="mt-1">
                          {room.Services.map((service) => service.name).join(
                            ", "
                          )}
                        </p>
                      )}
                    </div>
                    <div className="mt-4">
                      <h4 className="text-md font-bold">Inventario Básico</h4>
                      {room.BasicInventories &&
                      room.BasicInventories.length > 0 ? (
                        <ul className="list-disc pl-5">
                          {room.BasicInventories.map((inventory) => (
                            <li key={inventory.id}>
                              {inventory.name} - Cantidad:{" "}
                              {editingRoom &&
                              editingRoom.roomNumber === room.roomNumber ? (
                                <input
                                  type="number"
                                  value={
                                    formData.basicInventories.find(
                                      (item) => item.id === inventory.id
                                    )?.RoomBasics.quantity || 0
                                  }
                                  onChange={(e) =>
                                    handleBasicInventoryChange(
                                      inventory.id,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-16 px-2 py-1 border rounded"
                                />
                              ) : (
                                inventory.RoomBasics.quantity
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500">
                          No hay inventario básico asignado.
                        </p>
                      )}

                      {/* Select para agregar nuevos items */}
                      {/* Select para agregar nuevos items */}
                      {editingRoom &&
                        editingRoom.roomNumber === room.roomNumber && (
                          <div className="mt-4">
                            <h5 className="text-sm font-bold">
                              Agregar Nuevo Item
                            </h5>
                            <div className="flex items-center space-x-4">
                              <select
                                className="w-full px-3 py-2 border rounded"
                                value={selectedItem}
                                onChange={(e) =>
                                  setSelectedItem(e.target.value)
                                }
                              >
                                <option value="">Selecciona un item</option>
                                {inventory.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name} (Stock: {item.currentStock})
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                placeholder="Cantidad"
                                value={newItemQuantity}
                                onChange={(e) =>
                                  setNewItemQuantity(Number(e.target.value))
                                }
                                className="w-20 px-3 py-2 border rounded"
                              />
                              <button
                                type="button"
                                onClick={handleAddBasicInventory}
                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                              >
                                Agregar
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Tipo de Habitación
                      </label>
                      {editingRoom &&
                      editingRoom.roomNumber === room.roomNumber ? (
                        <select
                          name="type"
                          value={formData.type}
                          onChange={handleChange}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        >
                          <option value="">Selecciona un tipo</option>
                          <option value="Sencilla">Sencilla</option>
                          <option value="Doble">Doble</option>
                          <option value="Triple">Triple</option>
                          <option value="Cuadruple">Cuadruple</option>
                          <option value="Pareja">Pareja</option>
                        </select>
                      ) : (
                        <p className="mt-1">{room.type}</p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Disponible
                      </label>
                      {editingRoom &&
                      editingRoom.roomNumber === room.roomNumber ? (
                        <input
                          type="checkbox"
                          name="available"
                          checked={formData.available}
                          onChange={handleChange}
                          className="mt-1 block shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <p className="mt-1">{room.available ? "Sí" : "No"}</p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Promoción
                      </label>
                      {editingRoom &&
                      editingRoom.roomNumber === room.roomNumber ? (
                        <input
                          type="checkbox"
                          name="isPromo"
                          checked={formData.isPromo}
                          onChange={handleChange}
                          className="mt-1 block shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <p className="mt-1">{room.isPromo ? "Sí" : "No"}</p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Precio Promoción
                      </label>
                      {editingRoom &&
                      editingRoom.roomNumber === room.roomNumber ? (
                        <input
                          type="number"
                          name="promotionPrice"
                          value={formData.promotionPrice || ""}
                          onChange={handleChange}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <p className="mt-1">{room.promotionPrice}</p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Estado
                      </label>
                      {editingRoom &&
                      editingRoom.roomNumber === room.roomNumber ? (
                        <input
                          type="text"
                          name="status"
                          value={formData.status || ""}
                          onChange={handleChange}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <p className="mt-1">{room.status}</p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Activo
                      </label>
                      {editingRoom &&
                      editingRoom.roomNumber === room.roomNumber ? (
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleChange}
                          className="mt-1 block shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <p className="mt-1">{room.isActive ? "Sí" : "No"}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    {editingRoom &&
                    editingRoom.roomNumber === room.roomNumber ? (
                      <>
                        <button
                          onClick={handleSubmit}
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                          Guardar
                        </button>
                        <button
                          onClick={() => setEditingRoom(null)}
                          className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleEdit(room)}
                          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                          Editar
                        </button>
                      
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default RoomList;
