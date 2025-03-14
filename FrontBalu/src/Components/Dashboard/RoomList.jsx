import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllRooms, updateRoom, deleteRoom } from '../../Redux/Actions/roomActions';
import { getAllServices } from '../../Redux/Actions/serviceActions';
import DashboardLayout from './DashboardLayout';
import { openCloudinaryWidget } from '../../cloudinaryConfig';

const RoomList = () => {
  const dispatch = useDispatch();
  const { rooms, loading, error } = useSelector(state => state.room);
  const { services } = useSelector(state => state.service);

  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    roomNumber: '',
    price: '',
    services: [],
    type: '',
    description: '',
    maxGuests: 1,
    image_url: [],
    available: false,
    isPromo: false,
    promotionPrice: null,
    status: null,
    isActive: true
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
        services: editingRoom.Services ? editingRoom.Services.map(service => service.name) : [],
        type: editingRoom.type,
        description: editingRoom.description,
        maxGuests: editingRoom.maxGuests,
        image_url: editingRoom.image_url || [],
        available: editingRoom.available,
        isPromo: editingRoom.isPromo,
        promotionPrice: editingRoom.promotionPrice,
        status: editingRoom.status,
        isActive: editingRoom.isActive
      });
    }
  }, [editingRoom]);

  const handleEdit = (room) => {
    setEditingRoom(room);
  };

  const handleChange = (e) => {
    const { name, value, type, selectedOptions, checked } = e.target;
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked
      });
    } else if (name === 'services') {
      const selectedServices = Array.from(selectedOptions, option => option.value);
      setFormData({
        ...formData,
        [name]: selectedServices
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleWidget = () => {
    openCloudinaryWidget((uploadedImageUrl) => {
      setFormData((prevFormData) => ({
        ...prevFormData,
        image_url: [...prevFormData.image_url, uploadedImageUrl]
      }));
    });
  };

  const handleImageDelete = (url) => {
    setFormData({
      ...formData,
      image_url: formData.image_url.filter(image => image !== url)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(updateRoom(formData.roomNumber, formData));
      setEditingRoom(null);
      dispatch(getAllRooms()); // Refrescar la lista de habitaciones
    } catch (error) {
      console.error('Error updating room:', error);
    }
  };

  const handleDelete = (roomNumber) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta habitación?')) {
      dispatch(deleteRoom(roomNumber));
      dispatch(getAllRooms()); // Refrescar la lista de habitaciones
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
            <div key={room.roomNumber} className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex flex-col md:flex-row md:items-center">
                <div className="flex-shrink-0">
                  {room.image_url.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`Imagen ${index + 1}`}
                      className="w-16 h-16 object-cover rounded-md mb-2 md:mb-0 md:mr-4"
                    />
                  ))}
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">Número de Habitación</label>
                      <p className="mt-1">{room.roomNumber}</p>
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">Descripción</label>
                      {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
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
                      <label className="block text-sm font-medium text-gray-700">Precio</label>
                      {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
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
                      <label className="block text-sm font-medium text-gray-700">Capacidad</label>
                      {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
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
                      <label className="block text-sm font-medium text-gray-700">Servicios</label>
                      {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                        <select
                          name="services"
                          value={formData.services}
                          onChange={handleChange}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                          multiple
                        >
                          {services.map(service => (
                            <option key={service.id} value={service.name}>
                              {service.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="mt-1">{room.Services.map(service => service.name).join(', ')}</p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">Tipo de Habitación</label>
                      {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
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
                      <label className="block text-sm font-medium text-gray-700">Disponible</label>
                      {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                        <input
                          type="checkbox"
                          name="available"
                          checked={formData.available}
                          onChange={handleChange}
                          className="mt-1 block shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <p className="mt-1">{room.available ? 'Sí' : 'No'}</p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">Promoción</label>
                      {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                        <input
                          type="checkbox"
                          name="isPromo"
                          checked={formData.isPromo}
                          onChange={handleChange}
                          className="mt-1 block shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <p className="mt-1">{room.isPromo ? 'Sí' : 'No'}</p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">Precio Promoción</label>
                      {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                        <input
                          type="number"
                          name="promotionPrice"
                          value={formData.promotionPrice || ''}
                          onChange={handleChange}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <p className="mt-1">{room.promotionPrice}</p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">Estado</label>
                      {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                        <input
                          type="text"
                          name="status"
                          value={formData.status || ''}
                          onChange={handleChange}
                          className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <p className="mt-1">{room.status}</p>
                      )}
                    </div>
                    <div className="border-b pb-2">
                      <label className="block text-sm font-medium text-gray-700">Activo</label>
                      {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                        <input
                          type="checkbox"
                          name="isActive"
                          checked={formData.isActive}
                          onChange={handleChange}
                          className="mt-1 block shadow-sm sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        <p className="mt-1">{room.isActive ? 'Sí' : 'No'}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
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