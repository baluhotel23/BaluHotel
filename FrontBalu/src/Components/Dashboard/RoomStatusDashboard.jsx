import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllRooms } from '../../Redux/Actions/roomActions';
import { getCurrentShift } from '../../Redux/Actions/shiftActions';
import DashboardLayout from './DashboardLayout';
import ShiftModal from './ShiftModal';
import { toast } from 'react-toastify';

const RoomStatusDashboard = () => {
  const dispatch = useDispatch();
  const { rooms, loading } = useSelector(state => state.room || { rooms: [], loading: { rooms: false } });
  const { currentShift } = useSelector(state => state.shift || { currentShift: null });
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  // ⭐ EXTRAER loading.rooms como booleano
  const isLoading = loading?.rooms || false;

  useEffect(() => {
    // Cargar habitaciones
    dispatch(getAllRooms()).catch(error => {
      console.error('Error al cargar habitaciones:', error);
      toast.error('Error al cargar habitaciones');
    });
    
    // Cargar turno actual (sin bloquear si falla)
    dispatch(getCurrentShift()).catch(error => {
      console.log('No hay turno activo o error al cargar:', error);
      // No mostramos error porque es normal no tener turno activo
    });
  }, [dispatch]);

  // ⭐ FUNCIÓN PARA NORMALIZAR ESTADO (solo 3 estados)
  const getNormalizedStatus = (room) => {
    if (!room.isActive) return 'Inactiva';
    
    // Agrupar todos los estados disponibles
    if (room.status === 'Disponible' || room.status === 'Limpia' || room.status === 'Para Limpiar') {
      return 'Disponible';
    }
    
    if (room.status === 'Ocupada' || room.status === 'Mantenimiento') {
      return 'Ocupada';
    }
    
    if (room.status === 'Reservada') {
      return 'Reservada';
    }
    
    return 'Disponible'; // Por defecto
  };

  // ⭐ FUNCIÓN PARA OBTENER COLOR SEGÚN ESTADO (3 colores)
  const getStatusColor = (room) => {
    const status = getNormalizedStatus(room);
    
    switch (status) {
      case 'Disponible':
        return 'bg-green-500'; // Verde - Disponible
      case 'Reservada':
        return 'bg-yellow-500'; // Amarillo - Reservada
      case 'Ocupada':
        return 'bg-red-500'; // Rojo - Ocupada
      case 'Inactiva':
        return 'bg-gray-400'; // Gris - Inactiva
      default:
        return 'bg-gray-300';
    }
  };

  // ⭐ FUNCIÓN PARA OBTENER ÍCONO DE ESTADO (3 íconos)
  const getStatusIcon = (room) => {
    const status = getNormalizedStatus(room);
    
    switch (status) {
      case 'Disponible':
        return '✅';
      case 'Reservada':
        return '📅';
      case 'Ocupada':
        return '🔴';
      case 'Inactiva':
        return '�';
      default:
        return '❓';
    }
  };

  // ⭐ ORDENAR HABITACIONES POR NÚMERO (sin agrupar por tipo)
  const sortedRooms = [...rooms].sort((a, b) => {
    // Ordenar numéricamente por roomNumber
    const numA = parseInt(a.roomNumber);
    const numB = parseInt(b.roomNumber);
    return numA - numB;
  });

  // ⭐ ESTADÍSTICAS RÁPIDAS (solo 3 estados)
  const stats = {
    total: rooms.length,
    disponibles: rooms.filter(r => getNormalizedStatus(r) === 'Disponible').length,
    ocupadas: rooms.filter(r => getNormalizedStatus(r) === 'Ocupada').length,
    reservadas: rooms.filter(r => getNormalizedStatus(r) === 'Reservada').length
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* ⭐ ENCABEZADO CON INFORMACIÓN DEL TURNO */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Estado de Habitaciones
            </h1>
            <p className="text-gray-600 mt-1">
              Vista en tiempo real de todas las habitaciones del hotel
            </p>
          </div>

          {/* ⭐ INFORMACIÓN DEL TURNO */}
          <div className="bg-white rounded-lg shadow p-4 min-w-[250px]">
            {currentShift ? (
              <div>
                <p className="text-sm text-gray-600">Turno Actual</p>
                <p className="text-lg font-bold text-green-600">Abierto</p>
                <p className="text-xs text-gray-500">
                  Desde: {new Date(currentShift.openedAt).toLocaleString('es-CO')}
                </p>
                <button
                  onClick={() => setShowShiftModal(true)}
                  className="mt-2 w-full bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                >
                  Cerrar Turno
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600">Sin Turno Activo</p>
                <button
                  onClick={() => setShowShiftModal(true)}
                  className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                >
                  Abrir Turno
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ⭐ ESTADÍSTICAS RÁPIDAS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-gray-600">Total</p>
            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow p-4">
            <p className="text-sm text-green-700">Disponibles</p>
            <p className="text-2xl font-bold text-green-600">{stats.disponibles}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow p-4">
            <p className="text-sm text-red-700">Ocupadas</p>
            <p className="text-2xl font-bold text-red-600">{stats.ocupadas}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg shadow p-4">
            <p className="text-sm text-yellow-700">Reservadas</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.reservadas}</p>
          </div>
        </div>

        {/* ⭐ LEYENDA DE COLORES (solo 3 estados) */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="font-semibold text-gray-700 mb-3">Leyenda de Estados</h3>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
              <span className="text-sm">Disponible</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
              <span className="text-sm">Reservada</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
              <span className="text-sm">Ocupada</span>
            </div>
          </div>
        </div>

        {/* ⭐ GRID DE HABITACIONES ORDENADAS POR NÚMERO */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">
              Todas las Habitaciones ({sortedRooms.length})
            </h3>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-3">
              {sortedRooms.map(room => (
                <button
                  key={room.roomNumber}
                  onClick={() => setSelectedRoom(room)}
                  className={`${getStatusColor(room)} hover:opacity-80 transition-opacity rounded-lg p-3 shadow-md text-white relative group`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-1">{getStatusIcon(room)}</div>
                    <div className="font-bold text-sm">{room.roomNumber}</div>
                    <div className="text-xs opacity-90">{getNormalizedStatus(room)}</div>
                  </div>
                  
                  {/* ⭐ TOOLTIP AL HOVER */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-10">
                    <div>{room.type}</div>
                    <div>Max: {room.maxGuests} huéspedes</div>
                    {room.isPromo && <div className="text-yellow-300">⭐ Promoción</div>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ⭐ MODAL DE DETALLES DE HABITACIÓN */}
        {selectedRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-2xl font-bold text-gray-800">
                  Habitación {selectedRoom.roomNumber}
                </h3>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="font-semibold">Estado: </span>
                  <span className={`px-3 py-1 rounded text-white ${getStatusColor(selectedRoom)}`}>
                    {selectedRoom.status}
                  </span>
                </div>

                <div>
                  <span className="font-semibold">Tipo: </span>
                  <span>{selectedRoom.type}</span>
                </div>

                <div>
                  <span className="font-semibold">Capacidad: </span>
                  <span>{selectedRoom.maxGuests} huéspedes</span>
                </div>

                <div>
                  <span className="font-semibold">Precios: </span>
                  <div className="ml-4 text-sm">
                    <div>1 huésped: ${parseFloat(selectedRoom.priceSingle || 0).toLocaleString()}</div>
                    <div>2 huéspedes: ${parseFloat(selectedRoom.priceDouble || 0).toLocaleString()}</div>
                    <div>3+ huéspedes: ${parseFloat(selectedRoom.priceMultiple || 0).toLocaleString()}</div>
                  </div>
                </div>

                {selectedRoom.isPromo && selectedRoom.promotionPrice && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                    <span className="font-semibold text-yellow-700">⭐ Promoción: </span>
                    <span className="text-yellow-700">
                      ${parseFloat(selectedRoom.promotionPrice).toLocaleString()}
                    </span>
                  </div>
                )}

                {selectedRoom.description && (
                  <div>
                    <span className="font-semibold">Descripción: </span>
                    <p className="text-gray-600 text-sm">{selectedRoom.description}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => {
                    // TODO: Navegar a detalles de la habitación
                    toast.info('Funcionalidad en desarrollo');
                  }}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
                >
                  Ver Detalles
                </button>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ⭐ MODAL DE GESTIÓN DE TURNO */}
        {showShiftModal && (
          <ShiftModal
            isOpen={showShiftModal}
            onClose={() => setShowShiftModal(false)}
            currentShift={currentShift}
          />
        )}
      </div>
    </DashboardLayout>
  );
};

export default RoomStatusDashboard;
