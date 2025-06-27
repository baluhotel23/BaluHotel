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

  const isLoadingRooms = loading?.rooms || loading?.general || false;
  const roomError = errors?.rooms || errors?.general || null;

  const [editingRoom, setEditingRoom] = useState(null);
  const [selectedItem, setSelectedItem] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState(1);

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
    dispatch(getAllRooms());
    dispatch(getAllServices());
    dispatch(getAllItems());
  }, [dispatch]);

  useEffect(() => {
    if (editingRoom) {
      setFormData({
        roomNumber: editingRoom.roomNumber,
        priceSingle: editingRoom.priceSingle || "",
        priceDouble: editingRoom.priceDouble || "",
        priceMultiple: editingRoom.priceMultiple || "",
        pricePerExtraGuest: editingRoom.pricePerExtraGuest || "",
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
          name: item.name || item.itemName,
          RoomBasics: { quantity: newItemQuantity },
        },
      ],
    }));

    setSelectedItem("");
    setNewItemQuantity(1);
    toast.success("Item agregado correctamente.");
  };

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

    if (!validatePrices()) {
      return;
    }

    try {
      const updatedData = {
        ...formData,
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

  const displayRoomPrices = (room) => {
    if (room.priceSingle && room.priceDouble && room.priceMultiple) {
      return (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">1 huésped:</span>
            <span className="font-semibold text-orange-600">
              ${parseFloat(room.priceSingle)?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">2 huéspedes:</span>
            <span className="font-semibold text-orange-600">
              ${parseFloat(room.priceDouble)?.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">3+ huéspedes:</span>
            <span className="font-semibold text-orange-600">
              ${parseFloat(room.priceMultiple)?.toLocaleString()}
            </span>
          </div>
          {room.pricePerExtraGuest > 0 && (
            <div className="flex justify-between text-sm border-t pt-1">
              <span className="text-gray-500">Extra:</span>
              <span className="text-gray-700">
                ${parseFloat(room.pricePerExtraGuest)?.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      );
    } else {
      return <p className="text-gray-500 text-sm">Precios no configurados</p>;
    }
  };

  const getStatusColor = (status) => {
    const statusColors = {
      available: "bg-green-100 text-green-800",
      occupied: "bg-red-100 text-red-800",
      maintenance: "bg-yellow-100 text-yellow-800",
      cleaning: "bg-blue-100 text-blue-800",
      "Para Limpiar": "bg-orange-100 text-orange-800",
      out_of_order: "bg-gray-100 text-gray-800",
    };
    return statusColors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* ⭐ HEADER MODERNO */}
        <div className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  🏨 Gestión de Habitaciones
                </h1>
                <p className="text-gray-600 mt-1">
                  Administra las habitaciones del hotel
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="bg-orange-100 px-3 py-1 rounded-full">
                  <span className="text-orange-800 text-sm font-medium">
                    {rooms?.length || 0} habitaciones
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* ⭐ LOADING Y ERROR STATES */}
          {isLoadingRooms ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                <p className="text-gray-600 mt-4">Cargando habitaciones...</p>
              </div>
            </div>
          ) : roomError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{roomError}</p>
                </div>
              </div>
            </div>
          ) : rooms?.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                🏨
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay habitaciones</h3>
              <p className="mt-1 text-sm text-gray-500">Comienza agregando una habitación.</p>
            </div>
          ) : (
            /* ⭐ GRID DE HABITACIONES MODERNO */
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {rooms.map((room) => (
                <div
                  key={room.roomNumber}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all duration-200 hover:shadow-md ${
                    editingRoom?.roomNumber === room.roomNumber 
                      ? 'ring-2 ring-orange-500 ring-opacity-50' 
                      : ''
                  }`}
                >
                  {/* ⭐ HEADER DE LA TARJETA */}
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-white bg-opacity-20 rounded-lg p-2">
                          <span className="text-white text-lg font-bold">
                            {room.roomNumber}
                          </span>
                        </div>
                        <div>
                          <h3 className="text-white font-semibold text-lg">
                            Habitación {room.roomNumber}
                          </h3>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(room.status)}`}>
                              {room.status || 'Sin estado'}
                            </span>
                            {room.isPromo && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                🏷️ Promoción
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {editingRoom?.roomNumber === room.roomNumber ? (
                          <>
                            <button
                              onClick={handleSubmit}
                              className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors"
                            >
                              💾 Guardar
                            </button>
                            <button
                              onClick={() => setEditingRoom(null)}
                              className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg font-medium hover:bg-opacity-30 transition-colors"
                            >
                              ❌ Cancelar
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(room)}
                              className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-orange-50 transition-colors"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => handleDelete(room.roomNumber)}
                              className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
                            >
                              🗑️ Eliminar
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* ⭐ GRID RESPONSIVO DE INFORMACIÓN */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      
                      {/* DESCRIPCIÓN */}
                      <div className="md:col-span-2 lg:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          📝 Descripción
                        </label>
                        {editingRoom?.roomNumber === room.roomNumber ? (
                          <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                            rows="3"
                            placeholder="Descripción de la habitación..."
                          />
                        ) : (
                          <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                            {room.description || 'Sin descripción'}
                          </p>
                        )}
                      </div>

                      {/* TIPO */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          🏠 Tipo
                        </label>
                        {editingRoom?.roomNumber === room.roomNumber ? (
                          <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                          >
                            <option value="">Selecciona un tipo</option>
                            <option value="Individual">Individual</option>
                            <option value="Doble">Doble</option>
                            <option value="Triple">Triple</option>
                            <option value="Múltiple">Múltiple</option>
                            <option value="Suite">Suite</option>
                          </select>
                        ) : (
                          <div className="bg-orange-50 text-orange-800 px-3 py-2 rounded-lg font-medium">
                            {room.type}
                          </div>
                        )}
                      </div>

                      {/* CAPACIDAD */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          👥 Capacidad
                        </label>
                        {editingRoom?.roomNumber === room.roomNumber ? (
                          <select
                            name="maxGuests"
                            value={formData.maxGuests}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                          >
                            {[...Array(8).keys()].map((num) => (
                              <option key={num + 1} value={num + 1}>
                                {num + 1} persona{num + 1 > 1 ? 's' : ''}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="bg-gray-50 px-3 py-2 rounded-lg">
                            <span className="font-medium text-gray-900">
                              {room.maxGuests} persona{room.maxGuests > 1 ? 's' : ''}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ESTADOS */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          ⚡ Estados
                        </label>
                        {editingRoom?.roomNumber === room.roomNumber ? (
                          <div className="space-y-2">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                name="available"
                                checked={formData.available}
                                onChange={handleChange}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="ml-2 text-sm">Disponible</span>
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                name="isActive"
                                checked={formData.isActive}
                                onChange={handleChange}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="ml-2 text-sm">Activo</span>
                            </label>
                            <select
                              name="status"
                              value={formData.status || ""}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm"
                            >
                              <option value="">Estado...</option>
                              <option value="available">Disponible</option>
                              <option value="occupied">Ocupada</option>
                              <option value="maintenance">Mantenimiento</option>
                              <option value="Para Limpiar">Para Limpiar</option>
                              <option value="out_of_order">Fuera de servicio</option>
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Disponible:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                room.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {room.available ? '✅ Sí' : '❌ No'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">Activo:</span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                room.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {room.isActive ? '✅ Sí' : '❌ No'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ⭐ SECCIÓN DE PRECIOS MODERNA */}
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        💰 Precios
                      </label>
                      {editingRoom?.roomNumber === room.roomNumber ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">1 Huésped</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500">$</span>
                              <input
                                type="number"
                                name="priceSingle"
                                value={formData.priceSingle}
                                onChange={handleChange}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                                placeholder="70000"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">2 Huéspedes</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500">$</span>
                              <input
                                type="number"
                                name="priceDouble"
                                value={formData.priceDouble}
                                onChange={handleChange}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                                placeholder="120000"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">3+ Huéspedes</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500">$</span>
                              <input
                                type="number"
                                name="priceMultiple"
                                value={formData.priceMultiple}
                                onChange={handleChange}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                                placeholder="180000"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Extra</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500">$</span>
                              <input
                                type="number"
                                name="pricePerExtraGuest"
                                value={formData.pricePerExtraGuest}
                                onChange={handleChange}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                                placeholder="25000"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-4 rounded-lg">
                          {displayRoomPrices(room)}
                        </div>
                      )}
                    </div>

                    {/* ⭐ PROMOCIONES */}
                    {(editingRoom?.roomNumber === room.roomNumber || room.isPromo) && (
                      <div className="mt-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          🏷️ Promociones
                        </label>
                        {editingRoom?.roomNumber === room.roomNumber ? (
                          <div className="space-y-3">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                name="isPromo"
                                checked={formData.isPromo}
                                onChange={handleChange}
                                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                              />
                              <span className="ml-2 text-sm">Es promocional</span>
                            </label>
                            {formData.isPromo && (
                              <div className="relative">
                                <label className="block text-xs text-gray-500 mb-1">Precio Promocional</label>
                                <span className="absolute left-3 top-6 text-gray-500">$</span>
                                <input
                                  type="number"
                                  name="promotionPrice"
                                  value={formData.promotionPrice || ""}
                                  onChange={handleChange}
                                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                                  placeholder="90000"
                                />
                              </div>
                            )}
                          </div>
                        ) : (
                          room.isPromo && (
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                              <div className="flex items-center justify-between">
                                <span className="text-yellow-800 font-medium">🏷️ Precio Promocional</span>
                                <span className="text-yellow-900 font-bold text-lg">
                                  ${parseFloat(room.promotionPrice || 0).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    )}

                    {/* ⭐ SERVICIOS */}
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        🛎️ Servicios
                      </label>
                      {editingRoom?.roomNumber === room.roomNumber ? (
                        <select
                          name="services"
                          value={formData.services}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                          multiple
                          size="4"
                        >
                          {services &&
                            services.map((service) => (
                              <option key={service.id} value={service.name}>
                                {service.name}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {room.Services?.length > 0 ? (
                            room.Services.map((service, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800"
                              >
                                {service.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-sm">Sin servicios</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ⭐ INVENTARIO BÁSICO MODERNO */}
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        📦 Inventario Básico
                      </label>
                      {(editingRoom?.roomNumber === room.roomNumber
                        ? formData.basicInventories
                        : room.BasicInventories
                      )?.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(editingRoom?.roomNumber === room.roomNumber
                            ? formData.basicInventories
                            : room.BasicInventories
                          ).map((inventory) => (
                            <div
                              key={inventory.id}
                              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border"
                            >
                              <span className="text-sm font-medium text-gray-900">
                                {inventory.name}
                              </span>
                              {editingRoom?.roomNumber === room.roomNumber ? (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    value={inventory.RoomBasics?.quantity || 0}
                                    onChange={(e) =>
                                      handleBasicInventoryChange(
                                        inventory.id,
                                        Number(e.target.value)
                                      )
                                    }
                                    className="w-16 px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500 text-sm"
                                    min="0"
                                  />
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleRemoveBasicInventory(inventory.id)
                                    }
                                    className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                                    title="Eliminar"
                                  >
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-sm font-semibold">
                                  {inventory.RoomBasics?.quantity || 0}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <p className="text-gray-500 text-sm">📦 No hay inventario básico asignado</p>
                        </div>
                      )}

                      {/* Agregar nuevos items */}
                      {editingRoom?.roomNumber === room.roomNumber && (
                        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                          <h5 className="text-sm font-semibold text-orange-900 mb-3">
                            ➕ Agregar Nuevo Item
                          </h5>
                          <div className="flex flex-col sm:flex-row gap-3">
                            <select
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm"
                              value={selectedItem}
                              onChange={(e) => setSelectedItem(e.target.value)}
                            >
                              <option value="">Selecciona un item...</option>
                              {inventory &&
                                inventory.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name || item.itemName} (Stock: {item.currentStock})
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
                              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors text-sm"
                              min="1"
                            />
                            <button
                              type="button"
                              onClick={handleAddBasicInventory}
                              className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors font-medium text-sm whitespace-nowrap"
                            >
                              ➕ Agregar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ⭐ GALERÍA DE IMÁGENES MODERNA */}
                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        📸 Galería de Imágenes
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {(editingRoom?.roomNumber === room.roomNumber
                          ? formData.image_url
                          : room.image_url
                        )?.map((img, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={img}
                              alt={`Imagen ${index + 1}`}
                              className="w-full h-24 object-cover rounded-lg border border-gray-200"
                            />
                            {editingRoom?.roomNumber === room.roomNumber && (
                              <button
                                type="button"
                                onClick={() => handleImageDelete(img)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 shadow-lg"
                              >
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                        {editingRoom?.roomNumber === room.roomNumber && (
                          <button
                            type="button"
                            onClick={handleWidget}
                            className="w-full h-24 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-orange-500 hover:bg-orange-50 transition-colors group"
                          >
                            <div className="text-center">
                              <svg className="mx-auto h-6 w-6 text-gray-400 group-hover:text-orange-500" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                              <span className="text-xs text-gray-500 group-hover:text-orange-500">Agregar</span>
                            </div>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RoomList;
