import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  searchRoomByInput,
  updateRoomStatus,
  getRoomAmenities,
  updateRoomAmenities,
} from "../../Redux/Actions/roomActions";
import {
  getAllItems,
  removeStock,
} from "../../Redux/Actions/inventoryActions";
import { toast } from "react-toastify";
import DashboardLayout from "./DashboardLayout";

function RoomDetailCheck() {
  const dispatch = useDispatch();

  const { searchedRoom = {}, loading, error } = useSelector((state) => state.room || {});
  console.log(searchedRoom);  
  const inventory = useSelector((state) => state.inventory.inventory || []);

  const [roomNumber, setRoomNumber] = useState(""); // Número de habitación a buscar
  const [roomAmenities, setRoomAmenities] = useState([]); // Amenities actuales de la habitación
  const [missingAmenities, setMissingAmenities] = useState([]); // Amenities faltantes
  const [selectedAmenity, setSelectedAmenity] = useState(""); // Amenity seleccionado
  const [amenityQuantity, setAmenityQuantity] = useState(1); // Cantidad del amenity

  // Obtener el inventario al cargar el componente
  useEffect(() => {
    dispatch(getAllItems());
  }, [dispatch]);

 

  const handleSearch = async () => {
    if (!roomNumber) {
      toast.error("Por favor, ingresa un número de habitación.");
      return;
    }

    try {
      const response = await dispatch(searchRoomByInput(roomNumber));
      if (response?.error) {
        toast.error(response.message || "Error al buscar la habitación.");
        setRoomAmenities([]);
        setMissingAmenities([]);
      } else {
        toast.success("Habitación encontrada correctamente.");

        // Procesar los BasicInventories para incluir la cantidad desde RoomBasics
        const roomAmenities = (response.data?.BasicInventories || []).map((item) => ({
          id: item.id,
          name: item.name,
          quantity: item.RoomBasics?.quantity || 0,
        }));
        setRoomAmenities(roomAmenities);

        // Comparar con el inventario global para encontrar faltantes
        const missing = inventory.filter(
          (item) =>
            !roomAmenities.some((amenity) => amenity.id === item.id) &&
            item.currentStock > 0
        );
        setMissingAmenities(missing);
      }
    } catch (error) {
      toast.error("Error al buscar la habitación.");
    }
  };
  // Manejar la actualización del estado de la habitación
  const handleUpdateStatus = async (newStatus) => {
    if (!searchedRoom) {
      toast.error("Primero busca una habitación.");
      return;
    }
  
    try {
      // Llama a la acción para actualizar el estado de la habitación
      await dispatch(updateRoomStatus(searchedRoom.roomNumber, { status: newStatus }));
      toast.success(`Estado de la habitación actualizado a ${newStatus}.`);
  
      // Refresca los detalles de la habitación
      const response = await dispatch(searchRoomByInput(searchedRoom.roomNumber));
      if (response.error) {
        toast.error("Error al refrescar los detalles de la habitación.");
      } else {
        toast.success("Detalles de la habitación actualizados.");
      }
    } catch (error) {
      toast.error("Error al actualizar el estado de la habitación.");
    }
  };
  // Manejar la adición o actualización de un amenity
  const handleAddOrUpdateAmenity = async () => {
    if (!selectedAmenity || amenityQuantity <= 0) {
      toast.error("Por favor, selecciona un amenity y una cantidad válida.");
      return;
    }

    const amenity = inventory.find((item) => item.id === selectedAmenity);
    if (!amenity || amenity.currentStock < amenityQuantity) {
      toast.error("Stock insuficiente para este amenity.");
      return;
    }

    try {
      // Reducir el stock del amenity en el inventario
      await dispatch(removeStock(amenity.id, amenityQuantity));

      const updatedAmenities = [...roomAmenities];
      const existingAmenityIndex = updatedAmenities.findIndex(
        (item) => item.id === selectedAmenity
      );

      if (existingAmenityIndex !== -1) {
        updatedAmenities[existingAmenityIndex].quantity += amenityQuantity;
      } else {
        updatedAmenities.push({
          id: amenity.id,
          name: amenity.name,
          quantity: amenityQuantity,
        });
      }

      await dispatch(updateRoomAmenities(roomNumber, updatedAmenities));
      setRoomAmenities(updatedAmenities);
      toast.success(
        `Amenity "${amenity.name}" agregado/actualizado con cantidad ${amenityQuantity}.`
      );

      const missing = inventory.filter(
        (item) =>
          !updatedAmenities.some((amenity) => amenity.id === item.id) &&
          item.currentStock > 0
      );
      setMissingAmenities(missing);

      setSelectedAmenity("");
      setAmenityQuantity(1);
    } catch (error) {
      toast.error("Error al actualizar los amenities de la habitación.");
    }
  };
  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4 bg-white shadow-md rounded-lg">
        <h2 className="text-2xl font-bold mb-4">Detalles de la Habitación</h2>
  
        {/* Input para buscar habitación */}
        <div className="mb-4">
          <label className="block text-sm font-medium">Número de Habitación *</label>
          <input
            type="text"
            value={roomNumber}
            onChange={(e) => setRoomNumber(e.target.value)}
            className="w-full px-3 py-2 border rounded"
          />
          <button
            type="button"
            onClick={handleSearch}
            className="mt-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Buscar Habitación
          </button>
        </div>
  
        {/* Mostrar detalles de la habitación */}
        {loading && <p>Cargando detalles de la habitación...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {searchedRoom && (
          <div className="mt-4">
            <h3 className="text-lg font-bold">Información de la Habitación</h3>
            <p>
              <strong>Número:</strong> {searchedRoom.roomNumber}
            </p>
            <p>
              <strong>Estado:</strong> {searchedRoom.status}
            </p>
            <p>
              <strong>Disponible:</strong> {searchedRoom.available ? "Sí" : "No"}
            </p>
            <p>
              <strong>Tipo:</strong> {searchedRoom.type}
            </p>
            <p>
              <strong>Capacidad Máxima:</strong> {searchedRoom.maxGuests} Personas
            </p>
  
           {/* Amenities actuales */}
           <h4 className="text-md font-bold mt-4">Amenities</h4>
            {roomAmenities.length > 0 ? (
              <ul className="list-disc pl-5">
                {roomAmenities.map((amenity) => (
                  <li key={amenity.id}>
                    {amenity.name} - Cantidad: {amenity.quantity}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No hay amenities disponibles.</p>
            )}
          </div>
        )}

        {/* Amenities faltantes */}
        <div className="mt-4">
          <h4 className="text-md font-bold">Amenities Faltantes</h4>
          {missingAmenities.length > 0 ? (
            <ul className="list-disc pl-5">
              {missingAmenities.map((item) => (
                <li key={item.id}>
                  {item.name} (Stock: {item.currentStock})
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500">No hay amenities faltantes.</p>
          )}
        </div>

        {/* Agregar Amenity */}
        <div className="mt-4">
          <h4 className="text-md font-bold">Agregar Amenity</h4>
          <div className="flex items-center space-x-4">
            <select
              value={selectedAmenity}
              onChange={(e) => setSelectedAmenity(e.target.value)}
              className="w-full px-3 py-2 border rounded"
            >
              <option value="">Selecciona un amenity</option>
              {inventory.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} (Stock: {item.currentStock})
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Cantidad"
              value={amenityQuantity}
              onChange={(e) => setAmenityQuantity(Number(e.target.value))}
              className="w-20 px-3 py-2 border rounded"
            />
            <button
              type="button"
              onClick={handleAddOrUpdateAmenity}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Agregar/Actualizar
            </button>
          </div>
        </div>
  
        {/* Botones para actualizar el estado */}
        <div className="mt-4">
          <h4 className="text-md font-bold">Actualizar Estado</h4>
          <button
            type="button"
            onClick={() => handleUpdateStatus("Limpia")}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mr-2"
          >
            Marcar como Limpia
          </button>
          <button
            type="button"
            onClick={() => handleUpdateStatus("Mantenimiento")}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 mr-2"
          >
            Marcar como Mantenimiento
          </button>
          <button
            type="button"
            onClick={() => handleUpdateStatus("Ocupada")}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 mr-2"
          >
            Marcar como Ocupada
          </button>
          <button
            type="button"
            onClick={() => handleUpdateStatus("Reservada")}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Marcar como Reservada
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default RoomDetailCheck;