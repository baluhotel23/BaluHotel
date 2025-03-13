import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllRooms, updateRoom, deleteRoom } from '../../Redux/Actions/roomActions';
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
  }, [dispatch]);

  useEffect(() => {
    if (editingRoom) {
      setFormData({
        roomNumber: editingRoom.roomNumber,
        price: editingRoom.price,
        services: editingRoom.Services ? editingRoom.Services.map(service => service.name) : [],
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
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked
      });
    } else if (name === 'services') {
      const selectedServices = Array.from(e.target.selectedOptions, option => option.value);
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
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número de Habitación</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacidad</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicios</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imágenes</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disponible</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promoción</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio Promoción</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activo</th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rooms.map((room) => (
                <tr key={room.roomNumber}>
                  <td className="px-6 py-4 whitespace-nowrap">{room.roomNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                      <input
                        type="text"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    ) : (
                      room.description
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    ) : (
                      room.price
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                      <input
                        type="number"
                        name="maxGuests"
                        value={formData.maxGuests}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    ) : (
                      room.maxGuests
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
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
                      room.Services.map(service => service.name).join(', ')
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                      <>
                        <button
                          type="button"
                          onClick={handleWidget}
                          className="mt-1 block w-full py-2 px-4 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700"
                        >
                          Subir Imágenes
                        </button>
                        <div className="mt-4 grid grid-cols-3 gap-4">
                          {formData.image_url.map((img, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={img}
                                alt={`Imagen ${index + 1}`}
                                className="w-full h-32 object-cover rounded-md"
                              />
                              <button
                                type="button"
                                onClick={() => handleImageDelete(img)}
                                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                              >
                                <svg 
                                  xmlns="http://www.w3.org/2000/svg" 
                                  className="h-5 w-5" 
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
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      room.image_url.map((img, index) => (
                        <img
                          key={index}
                          src={img}
                          alt={`Imagen ${index + 1}`}
                          className="w-full h-32 object-cover rounded-md"
                        />
                      ))
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                      <input
                        type="checkbox"
                        name="available"
                        checked={formData.available}
                        onChange={handleChange}
                        className="mt-1 block shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    ) : (
                      room.available ? 'Sí' : 'No'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                      <input
                        type="checkbox"
                        name="isPromo"
                        checked={formData.isPromo}
                        onChange={handleChange}
                        className="mt-1 block shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    ) : (
                      room.isPromo ? 'Sí' : 'No'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                      <input
                        type="number"
                        name="promotionPrice"
                        value={formData.promotionPrice || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    ) : (
                      room.promotionPrice
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                      <input
                        type="text"
                        name="status"
                        value={formData.status || ''}
                        onChange={handleChange}
                        className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    ) : (
                      room.status
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleChange}
                        className="mt-1 block shadow-sm sm:text-sm border-gray-300 rounded-md"
                      />
                    ) : (
                      room.isActive ? 'Sí' : 'No'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingRoom && editingRoom.roomNumber === room.roomNumber ? (
                      <>
                        <button
                          onClick={handleSubmit}
                          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline"
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
                          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline"
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
};

export default RoomList;