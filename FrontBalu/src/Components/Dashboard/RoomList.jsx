import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllRooms, deleteRoom } from '../../Redux/Actions/roomActions';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

const RoomList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { rooms, loading, error } = useSelector(state => state.room);

  useEffect(() => {
    dispatch(getAllRooms());
  }, [dispatch]);

  const handleEdit = (roomNumber) => {
    navigate(`/rooms/edit/${roomNumber}`);
  };

  const handleDelete = (roomNumber) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta habitación?')) {
      dispatch(deleteRoom(roomNumber));
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
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número de Habitación</th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capacidad Máxima</th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Servicios</th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Array.isArray(rooms) && rooms.length > 0 ? (
              rooms.map(room => (
                <tr key={room.roomNumber}>
                  <td className="px-6 py-4 whitespace-nowrap">{room.roomNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{room.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{room.maxGuests}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {room.Services && room.Services.map(service => service.name).join(', ')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleEdit(room.roomNumber)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Modificar
                    </button>
                    <button
                      onClick={() => handleDelete(room.roomNumber)}
                      className="text-red-600 hover:text-red-900 ml-4"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-4 whitespace-nowrap text-center">
                  No hay habitaciones disponibles.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </DashboardLayout>
  );
};

export default RoomList;