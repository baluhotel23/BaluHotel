import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getAllRooms,
  updateRoom,
  deleteRoom,
} from "../../Redux/Actions/roomActions";
import { getAllServices } from "../../Redux/Actions/serviceActions";
import { getAllItems } from "../../Redux/Actions/inventoryActions";
import DashboardLayout from "./DashboardLayout";
import { openCloudinaryWidget } from "../../cloudinaryConfig";
import { toast } from "react-toastify";

const RoomList = () => {
  const dispatch = useDispatch();
  const { rooms, loading, errors } = useSelector((state) => state.room);
  const { services } = useSelector((state) => state.service);
  const inventory = useSelector((state) => state.inventory.inventory || []);

  // ⭐ CORREGIR: Extraer el loading específico de rooms
  const isLoadingRooms = loading?.rooms || loading?.general || false;
  const roomError = errors?.rooms || errors?.general || null;

  console.log('🏨 RoomList - Estado completo de rooms:', rooms);
  console.log('📊 RoomList - Cantidad de rooms:', rooms?.length || 0);
  console.log('⏳ RoomList - Loading:', loading);
  console.log('⚡ RoomList - isLoadingRooms:', isLoadingRooms);
  console.log('❌ RoomList - Error:', roomError);
  console.log('🔧 RoomList - Tipo de rooms:', typeof rooms);
  console.log('🔧 RoomList - Es array?', Array.isArray(rooms));

  const [editingRoom, setEditingRoom] = useState(null);
  const [selectedItem, setSelectedItem] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);

  // ⭐ ACTUALIZAR formData CON NUEVOS CAMPOS DE PRECIO
  const [formData, setFormData] = useState({
    roomNumber: "",
    priceSingle: "",
    priceDouble: "",
    priceMultiple: "",
    pricePerExtraGuest: "",
    services: [],
    basicInventories: [],
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
    console.log('🚀 RoomList - Ejecutando getAllRooms...');
    dispatch(getAllRooms());
    dispatch(getAllServices());
    dispatch(getAllItems());
  }, [dispatch]);

  useEffect(() => {
    console.log('🔄 RoomList - Estado cambió:', { 
      roomsLength: rooms?.length || 0, 
      loading, 
      isLoadingRooms,
      roomError,
      firstRoom: rooms?.[0]?.roomNumber 
    });
  }, [rooms, loading, isLoadingRooms, roomError]);

  useEffect(() => {
    if (editingRoom) {
      setFormData({
        roomNumber: editingRoom.roomNumber,
        priceSingle: editingRoom.priceSingle || "",
        priceDouble: editingRoom.priceDouble || "",
        priceMultiple: editingRoom.priceMultiple || "",
        pricePerExtraGuest: editingRoom.pricePerExtraGuest || "",
        // ⭐ MANTENER compatibilidad con price legacy si existe
        ...(editingRoom.price &&
          !editingRoom.priceDouble && {
            priceDouble: editingRoom.price,
          }),
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

  // ⭐ NUEVA FUNCIÓN PARA MANEJAR CAMBIOS EN INVENTARIO BÁSICO
  const handleBasicInventoryChange = (itemId, quantity) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      basicInventories: prevFormData.basicInventories.map((item) =>
        item.id === itemId
          ? { ...item, RoomBasics: { ...item.RoomBasics, quantity } }
          : item
      ),
    }));
  };

  const handleAddBasicInventory = () => {
    if (!selectedItem || newItemQuantity <= 0) {
      toast.error("Por favor, selecciona un item y una cantidad válida.");
      return;
    }

    // ⭐ CORREGIR: usar 'id' en lugar de 'itemId'
    const item = inventory.find((inv) => inv.id === selectedItem);
    if (!item) {
      toast.error("El item seleccionado no existe.");
      return;
    }

    const existingInventory = formData.basicInventories.find(
      (inv) => inv.id === selectedItem
    );
    if (existingInventory) {
      toast.error("Este item ya está en el inventario básico.");
      return;
    }

    setFormData((prevFormData) => ({
      ...prevFormData,
      basicInventories: [
        ...prevFormData.basicInventories,
        {
          id: selectedItem,
          name: item.name, // ⭐ CORREGIR: usar 'name' en lugar de 'itemName'
          RoomBasics: { quantity: newItemQuantity },
        },
      ],
    }));

    setSelectedItem("");
    setNewItemQuantity(1);
    toast.success("Item agregado correctamente.");
  };

  // ⭐ NUEVA FUNCIÓN PARA ELIMINAR ITEM DEL INVENTARIO
  const handleRemoveBasicInventory = (itemId) => {
    setFormData((prevFormData) => ({
      ...prevFormData,
      basicInventories: prevFormData.basicInventories.filter(
        (item) => item.id !== itemId
      ),
    }));
    toast.success("Item eliminado correctamente.");
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

  // ⭐ VALIDACIÓN MEJORADA PARA PRECIOS
  const validatePrices = () => {
    const { priceSingle, priceDouble, priceMultiple } = formData;

    if (!priceSingle || !priceDouble || !priceMultiple) {
      toast.error("Los precios para 1, 2 y 3+ huéspedes son obligatorios.");
      return false;
    }

    const single = parseFloat(priceSingle);
    const double = parseFloat(priceDouble);
    const multiple = parseFloat(priceMultiple);

    if (single <= 0 || double <= 0 || multiple <= 0) {
      toast.error("Los precios deben ser mayores a 0.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ⭐ VALIDAR PRECIOS ANTES DE ENVIAR
    if (!validatePrices()) {
      return;
    }

    try {
      const updatedData = {
        ...formData,
        // ⭐ ASEGURAR QUE LOS PRECIOS SEAN NÚMEROS
        priceSingle: parseFloat(formData.priceSingle),
        priceDouble: parseFloat(formData.priceDouble),
        priceMultiple: parseFloat(formData.priceMultiple),
        pricePerExtraGuest: formData.pricePerExtraGuest
          ? parseFloat(formData.pricePerExtraGuest)
          : 0,
        promotionPrice: formData.promotionPrice
          ? parseFloat(formData.promotionPrice)
          : null,
        basicInventories: formData.basicInventories.map((inventory) => ({
          id: inventory.id,
          quantity: inventory.RoomBasics.quantity,
        })),
      };

      await dispatch(updateRoom(formData.roomNumber, updatedData));
      setEditingRoom(null);
      dispatch(getAllRooms());
      toast.success("Habitación actualizada correctamente.");
    } catch (error) {
      console.error("Error updating room:", error);
      toast.error("Error al actualizar la habitación.");
    }
  };

  const handleDelete = async (roomNumber) => {
    if (
      window.confirm("¿Estás seguro de que deseas eliminar esta habitación?")
    ) {
      try {
        await dispatch(deleteRoom(roomNumber));
        dispatch(getAllRooms());
        toast.success("Habitación eliminada correctamente.");
      } catch (error) {
        console.error("Error deleting room:", error);
        toast.error("Error al eliminar la habitación.");
      }
    }
  };

  // ⭐ FUNCIÓN AUXILIAR PARA MOSTRAR PRECIOS
  const displayRoomPrices = (room) => {
    if (room.priceSingle && room.priceDouble && room.priceMultiple) {
      return (
        <div className="text-sm">
          <p>1 huésped: ${parseFloat(room.priceSingle)?.toLocaleString()}</p>
          <p>2 huéspedes: ${parseFloat(room.priceDouble)?.toLocaleString()}</p>
          <p>3+ huéspedes: ${parseFloat(room.priceMultiple)?.toLocaleString()}</p>
          {room.pricePerExtraGuest > 0 && (
            <p className="text-gray-600">
              Extra: ${parseFloat(room.pricePerExtraGuest)?.toLocaleString()}
            </p>
          )}
        </div>
      );
    } else if (room.price) {
      // ⭐ COMPATIBILIDAD CON PRECIO LEGACY
      return <p>${parseFloat(room.price)?.toLocaleString()}</p>;
    } else {
      return <p className="text-gray-500">Precios no configurados</p>;
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold mb-4">Lista de Habitaciones</h1>
      
      

      {/* ⭐ CORREGIR: Usar isLoadingRooms en lugar de loading */}
      {isLoadingRooms ? (
        <p>Cargando...</p>
      ) : roomError ? (
        <p>Error: {roomError}</p>
      ) : rooms?.length === 0 ? (
        <p>No hay habitaciones disponibles.</p>
      ) : (
        <div className="space-y-6">
          {rooms.map((room) => (
            <div
              key={room.roomNumber}
              className="bg-white p-4 rounded-lg shadow-md"
            >
              <div className="flex flex-col md:flex-row md:items-start">
                {/* ⭐ SECCIÓN DE IMÁGENES */}
                <div className="flex-shrink-0 mr-6">
                  <div className="mt-4">
                    <h4 className="text-md font-bold">Imágenes</h4>
                    <div className="grid grid-cols-2 gap-2 max-w-xs">
                      {(editingRoom?.roomNumber === room.roomNumber
                        ? formData.image_url
                        : room.image_url
                      )?.map((img, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={img}
                            alt={`Imagen ${index + 1}`}
                            className="w-full h-24 object-cover rounded-md"
                          />
                          {editingRoom?.roomNumber === room.roomNumber && (
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
                    {editingRoom?.roomNumber === room.roomNumber && (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Número de Habitación */}
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Número de Habitación
                      </label>
                      <p className="mt-1 font-semibold">{room.roomNumber}</p>
                    </div>

                    {/* Descripción */}
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Descripción
                      </label>
                      {editingRoom?.roomNumber === room.roomNumber ? (
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"
                          rows="2"
                        />
                      ) : (
                        <p className="mt-1">{room.description}</p>
                      )}
                    </div>

                    {/* ⭐ NUEVOS CAMPOS DE PRECIO */}
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Precios
                      </label>
                      {editingRoom?.roomNumber === room.roomNumber ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs text-gray-500">
                              1 Huésped (COP)
                            </label>
                            <input
                              type="number"
                              name="priceSingle"
                              value={formData.priceSingle}
                              onChange={handleChange}
                              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-1"
                              placeholder="70000"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              2 Huéspedes (COP)
                            </label>
                            <input
                              type="number"
                              name="priceDouble"
                              value={formData.priceDouble}
                              onChange={handleChange}
                              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-1"
                              placeholder="120000"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              3+ Huéspedes (COP)
                            </label>
                            <input
                              type="number"
                              name="priceMultiple"
                              value={formData.priceMultiple}
                              onChange={handleChange}
                              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-1"
                              placeholder="180000"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Precio por Extra (COP)
                            </label>
                            <input
                              type="number"
                              name="pricePerExtraGuest"
                              value={formData.pricePerExtraGuest}
                              onChange={handleChange}
                              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-1"
                              placeholder="25000"
                            />
                          </div>
                        </div>
                      ) : (
                        displayRoomPrices(room)
                      )}
                    </div>

                    {/* Capacidad */}
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Capacidad
                      </label>
                      {editingRoom?.roomNumber === room.roomNumber ? (
                        <select
                          name="maxGuests"
                          value={formData.maxGuests}
                          onChange={handleChange}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"
                        >
                          {[...Array(8).keys()].map((num) => (
                            <option key={num + 1} value={num + 1}>
                              {num + 1}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="mt-1">{room.maxGuests} personas</p>
                      )}
                    </div>

                    {/* Tipo de Habitación */}
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Tipo
                      </label>
                      {editingRoom?.roomNumber === room.roomNumber ? (
                        <select
                          name="type"
                          value={formData.type}
                          onChange={handleChange}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"
                        >
                          <option value="">Selecciona un tipo</option>
                          <option value="Individual">Individual</option>
                          <option value="Doble">Doble</option>
                          <option value="Triple">Triple</option>
                          <option value="Cuadruple">Cuádruple</option>
                          <option value="Suite">Suite</option>
                        </select>
                      ) : (
                        <p className="mt-1">{room.type}</p>
                      )}
                    </div>

                    {/* ⭐ SECCIÓN DE PROMOCIONES MEJORADA */}
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Promoción
                      </label>
                      {editingRoom?.roomNumber === room.roomNumber ? (
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              name="isPromo"
                              checked={formData.isPromo}
                              onChange={handleChange}
                              className="mr-2"
                            />
                            <span className="text-sm">Es promocional</span>
                          </div>
                          {formData.isPromo && (
                            <div>
                              <label className="text-xs text-gray-500">
                                Precio Promocional (COP)
                              </label>
                              <input
                                type="number"
                                name="promotionPrice"
                                value={formData.promotionPrice || ""}
                                onChange={handleChange}
                                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-1"
                                placeholder="90000"
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className="mt-1">{room.isPromo ? "Sí" : "No"}</p>
                          {room.isPromo && room.promotionPrice && (
                            <p className="text-green-600 font-semibold">
                              ${parseFloat(room.promotionPrice).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Estados */}
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Estados
                      </label>
                      {editingRoom?.roomNumber === room.roomNumber ? (
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              name="available"
                              checked={formData.available}
                              onChange={handleChange}
                              className="mr-2"
                            />
                            <span className="text-sm">Disponible</span>
                          </div>
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              name="isActive"
                              checked={formData.isActive}
                              onChange={handleChange}
                              className="mr-2"
                            />
                            <span className="text-sm">Activo</span>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">
                              Estado
                            </label>
                            <select
                              name="status"
                              value={formData.status || ""}
                              onChange={handleChange}
                              className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-1"
                            >
                              <option value="">Seleccionar estado</option>
                              <option value="available">Disponible</option>
                              <option value="occupied">Ocupada</option>
                              <option value="maintenance">Mantenimiento</option>
                              <option value="cleaning">Limpieza</option>
                              <option value="out_of_order">
                                Fuera de servicio
                              </option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <p>Disponible: {room.available ? "Sí" : "No"}</p>
                          <p>Activo: {room.isActive ? "Sí" : "No"}</p>
                          <p>Estado: {room.status || "No definido"}</p>
                        </div>
                      )}
                    </div>

                    {/* Servicios */}
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Servicios
                      </label>
                      {editingRoom?.roomNumber === room.roomNumber ? (
                        <select
                          name="services"
                          value={formData.services}
                          onChange={handleChange}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2"
                          multiple
                          size="4"
                        >
                          {services && services.map((service) => (
                            <option key={service.id} value={service.name}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="mt-1 text-sm">
                          {room.Services?.map((service) => service.name).join(
                            ", "
                          ) || "Sin servicios"}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* ⭐ SECCIÓN DE INVENTARIO MEJORADA */}
                  <div className="mt-4 col-span-full">
                    <h4 className="text-md font-bold mb-2">
                      Inventario Básico
                    </h4>
                    {(editingRoom?.roomNumber === room.roomNumber
                      ? formData.basicInventories
                      : room.BasicInventories
                    )?.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        {(editingRoom?.roomNumber === room.roomNumber
                          ? formData.basicInventories
                          : room.BasicInventories
                        ).map((inventory) => (
                          <div
                            key={inventory.id}
                            className="flex items-center justify-between bg-gray-50 p-2 rounded"
                          >
                            <span className="text-sm">{inventory.name}</span>
                            {editingRoom?.roomNumber === room.roomNumber ? (
                              <div className="flex items-center space-x-1">
                                <input
                                  type="number"
                                  value={inventory.RoomBasics?.quantity || 0}
                                  onChange={(e) =>
                                    handleBasicInventoryChange(
                                      inventory.id,
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-16 px-1 py-1 border rounded text-sm"
                                  min="0"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleRemoveBasicInventory(inventory.id)
                                  }
                                  className="text-red-500 hover:text-red-700"
                                  title="Eliminar"
                                >
                                  ×
                                </button>
                              </div>
                            ) : (
                              <span className="text-sm font-semibold">
                                {inventory.RoomBasics?.quantity || 0}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">
                        No hay inventario básico asignado.
                      </p>
                    )}

                    {/* Agregar nuevos items */}
                    {editingRoom?.roomNumber === room.roomNumber && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <h5 className="text-sm font-bold mb-2">
                          Agregar Nuevo Item
                        </h5>
                        <div className="flex items-center space-x-2">
                          <select
                            className="flex-1 px-2 py-1 border rounded text-sm"
                            value={selectedItem}
                            onChange={(e) => setSelectedItem(e.target.value)}
                          >
                            <option value="">Selecciona un item</option>
                            {inventory && inventory.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} (Stock: {item.currentStock})
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            placeholder="Cant."
                            value={newItemQuantity}
                            onChange={(e) =>
                              setNewItemQuantity(Number(e.target.value))
                            }
                            className="w-16 px-2 py-1 border rounded text-sm"
                            min="1"
                          />
                          <button
                            type="button"
                            onClick={handleAddBasicInventory}
                            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Botones de acción */}
                  <div className="mt-6 flex space-x-2">
                    {editingRoom?.roomNumber === room.roomNumber ? (
                      <>
                        <button
                          onClick={handleSubmit}
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                          Guardar Cambios
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
                        <button
                          onClick={() => handleDelete(room.roomNumber)}
                          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        >
                          Eliminar
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