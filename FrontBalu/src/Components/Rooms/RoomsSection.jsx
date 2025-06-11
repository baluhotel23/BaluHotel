import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllRooms } from "../../Redux/Actions/roomActions"; 
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faSortAmountDown, faSortAmountUp, faFilter, faBed, faUsers } from '@fortawesome/free-solid-svg-icons';

function RoomsSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // ⭐ SELECTORES CORREGIDOS PARA TU REDUCER
  const { 
    rooms = [], 
    loading = {}, 
    errors = {} 
  } = useSelector((state) => state.room || {});
  
  // ⭐ LOADING ESPECÍFICO PARA ROOMS
  const isLoadingRooms = loading.rooms || loading.general || false;
  const roomsError = errors.rooms || errors.general || null;

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [sortOrder, setSortOrder] = useState("asc"); // "asc" or "desc"
  const [filterRoomType, setFilterRoomType] = useState(""); // For room type (e.g., "Sencilla")
  const [filterCapacity, setFilterCapacity] = useState(""); // For minimum guest capacity

  // ⭐ DEBUG TEMPORAL - REMOVER DESPUÉS DE CONFIRMAR QUE FUNCIONA
  useEffect(() => {
    console.log('🔍 [ROOMS] Estado actual:', {
      isLoadingRooms,
      roomsError,
      roomsLength: rooms?.length,
      rooms: rooms,
      loading: loading,
      errors: errors
    });
  }, [isLoadingRooms, roomsError, rooms?.length, loading, errors]);

  useEffect(() => {
    console.log('🔍 [ROOMS] Disparando getAllRooms action');
    dispatch(getAllRooms());
  }, [dispatch]);

  useEffect(() => {
    // ⭐ VERIFICAR QUE ROOMS SEA UN ARRAY ANTES DE PROCESAR
    if (!Array.isArray(rooms)) {
      console.warn('⚠️ [ROOMS] rooms no es un array:', rooms);
      setFilteredRooms([]);
      return;
    }

    let processedRooms = [...rooms];

    // Filtering
    if (filterRoomType) {
      processedRooms = processedRooms.filter(room => room.type === filterRoomType);
    }
    if (filterCapacity) {
      processedRooms = processedRooms.filter(room => room.maxGuests >= parseInt(filterCapacity));
    }
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      processedRooms = processedRooms.filter(room => 
        room.description?.toLowerCase().includes(lowerSearchTerm) ||
        (room.type && room.type.toLowerCase().includes(lowerSearchTerm))
      );
    }

    // Sorting - Simplified to sort by capacity only
    processedRooms.sort((a, b) => {
      const comparison = (a.maxGuests || 0) - (b.maxGuests || 0);
      return sortOrder === "asc" ? comparison : comparison * -1;
    });
    
    if (processedRooms.length === 0 && (searchTerm || filterRoomType || filterCapacity) && rooms.length > 0) {
      toast.warn("Ninguna habitación coincide con los criterios.", { autoClose: 2000 });
    }

    setFilteredRooms(processedRooms);
  }, [rooms, searchTerm, filterRoomType, filterCapacity, sortOrder]);

  // ⭐ CONDICIONES DE LOADING Y ERROR CORREGIDAS
  if (isLoadingRooms) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent border-solid rounded-full animate-spin mb-4"></div>
          <p className="text-xl text-gray-700">Cargando habitaciones...</p>
        </div>
      </div>
    );
  }

  if (roomsError) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-200px)] px-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> No se pudieron cargar las habitaciones: {roomsError}. Por favor, intente más tarde.</span>
        </div>
      </div>
    );
  }
  
  // ⭐ VERIFICACIONES SEGURAS PARA EVITAR CRASHES
  const uniqueRoomTypes = [...new Set(rooms.map(room => room.type).filter(Boolean))].sort();
  const maxGuestCapacity = rooms.length > 0 ? Math.max(...rooms.map(room => room.maxGuests || 0), 0) : 0;

  return (
    <div className="bg-gray-100 min-h-screen px-2 sm:px-4 lg:px-6 py-8">
      <ToastContainer position="bottom-right" autoClose={3000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="colored"/>
      
      <div className="mb-6 lg:mb-8 p-4 sm:p-6 bg-white rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-0">Nuestras Habitaciones</h2>
          <button
            className="lg:hidden flex items-center justify-center w-full sm:w-auto px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors duration-200"
            onClick={() => {
              const menu = document.getElementById("filterSortMenu");
              menu.classList.toggle("hidden");
              menu.classList.toggle("grid"); // Use grid for better layout when shown
            }}
          >
            <FontAwesomeIcon icon={faFilter} className="mr-2" /> Mostrar Filtros y Orden
          </button>
        </div>

        <div id="filterSortMenu" className="hidden lg:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          {/* Search Input */}
          <div className="w-full">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              <FontAwesomeIcon icon={faSearch} className="mr-1 text-gray-500" /> Buscar
            </label>
            <input
              type="text"
              id="search"
              placeholder="Nombre, tipo, nro..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 transition-all"
            />
          </div>

          {/* Filter by Type */}
          <div className="w-full">
            <label htmlFor="filterRoomType" className="block text-sm font-medium text-gray-700 mb-1">
              <FontAwesomeIcon icon={faBed} className="mr-1 text-gray-500" /> Tipo de Habitación
            </label>
            <select
              id="filterRoomType"
              value={filterRoomType}
              onChange={(e) => setFilterRoomType(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 transition-all bg-white"
            >
              <option value="">Todos los tipos</option>
              {uniqueRoomTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Filter by Capacity */}
          <div className="w-full">
            <label htmlFor="filterCapacity" className="block text-sm font-medium text-gray-700 mb-1">
              <FontAwesomeIcon icon={faUsers} className="mr-1 text-gray-500" /> Capacidad (mín.)
            </label>
            <select
              id="filterCapacity"
              value={filterCapacity}
              onChange={(e) => setFilterCapacity(e.target.value)}
              className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-500 transition-all bg-white"
            >
              <option value="">Cualquier capacidad</option>
              {maxGuestCapacity > 0 && [...Array(maxGuestCapacity)].map((_, i) => (
                <option key={i+1} value={i+1}>{i+1} Huésped{i > 0 ? 'es' : ''}</option>
              ))}
            </select>
          </div>
          
          {/* Sort Options - Simplified */}
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <FontAwesomeIcon icon={sortOrder === "asc" ? faSortAmountDown : faSortAmountUp} className="mr-1 text-gray-500" /> Ordenar por Capacidad
            </label>
            <div className="flex">
              <button
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                className="w-full p-2.5 border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 transition-colors flex items-center justify-center text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400"
                title={sortOrder === "asc" ? "Menor a Mayor Capacidad" : "Mayor a Menor Capacidad"}
              >
                {sortOrder === "asc" ? "Menor a Mayor" : "Mayor a Menor"}
                <FontAwesomeIcon icon={sortOrder === "asc" ? faSortAmountDown : faSortAmountUp} size="lg" className="ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ⭐ INFORMACIÓN DE DEBUG TEMPORAL */}
      {/* <div className="mb-4 p-2 bg-blue-50 rounded text-sm text-blue-700">
        📊 Total habitaciones: {rooms.length} | Filtradas: {filteredRooms.length} | Loading: {isLoadingRooms ? 'Sí' : 'No'}
      </div> */}

      {filteredRooms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 lg:gap-8">
          {filteredRooms.map((room, index) => (
            <div 
              key={room.roomNumber || index} // Fallback key
              className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 ease-in-out transform hover:-translate-y-1.5 cursor-pointer flex flex-col group animate-fadeInUp"
              style={{ animationDelay: `${index * 75}ms` }}
              onClick={() => navigate(`/room/${room.roomNumber}`)}
            >
              <div className="relative h-56 sm:h-60">
                <img
                  src={room.image_url && room.image_url.length > 0 ? room.image_url[0] : 'https://via.placeholder.com/400x300.png?text=Hotel+Balú'}
                  alt={`Habitación ${room.type || ''}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                 {room.type && (
                  <div className="absolute top-3 left-3 bg-secondary bg-opacity-90 text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-md">
                    {room.type}
                  </div>
                 )}
              </div>
              
              <div className="p-4 sm:p-5 flex flex-col flex-grow">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-1.5 truncate" title={room.type ? `Habitación ${room.type} - ${room.description}` : room.description}>
                  Habitación {room.type || 'Confortable'}
                </h3>
                <p className="text-gray-600 text-xs sm:text-sm mb-1">
                  <FontAwesomeIcon icon={faUsers} className="mr-1.5 text-yellow-600" />
                  Capacidad: {room.maxGuests || 1} huésped{(room.maxGuests || 1) > 1 ? 'es' : ''}
                </p>
                <p className="text-gray-500 text-xs sm:text-sm mb-3 line-clamp-2 flex-grow min-h-[2.5em]" title={room.description}>
                  {room.description || "Descripción no disponible."}
                </p>
                
                <button 
                  className="mt-auto w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75"
                  onClick={(e) => {
                    e.stopPropagation(); 
                    navigate(`/room/${room.roomNumber}`);
                  }}
                >
                  Ver Detalles y Reservar
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        !isLoadingRooms && ( // Only show if not loading and no rooms
          <div className="text-center py-10 sm:py-16">
            <FontAwesomeIcon icon={faSearch} size="3x" className="text-gray-400 mb-4" />
            <p className="text-xl text-gray-600 mb-2">No se encontraron habitaciones que coincidan.</p>
            <p className="text-gray-500">Intenta ajustar tus filtros o término de búsqueda.</p>
          </div>
        )
      )}
    </div>
  );
}

export default RoomsSection;