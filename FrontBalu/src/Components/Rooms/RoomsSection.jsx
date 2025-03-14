import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllRooms } from "../../Redux/Actions/roomActions"; 
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons';

function RoomsSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { rooms, loading, error } = useSelector(state => state.room);

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [sortOrder, setSortOrder] = useState("asc");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    dispatch(getAllRooms());
  }, [dispatch]);

  useEffect(() => {
    let filtered = rooms.filter(room => 
      room.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.roomNumber.toString().includes(searchTerm) ||
      room.maxGuests.toString().includes(searchTerm) ||
      room.price.toString().includes(searchTerm)
    );

    if (filterType) {
      filtered = filtered.filter(room => room.type === filterType);
    }

    if (filtered.length === 0 && searchTerm) {
      toast.warn("Búsqueda no encontrada");
    }

    setFilteredRooms(filtered);
  }, [rooms, searchTerm, filterType]);

  useEffect(() => {
    const sortedRooms = [...filteredRooms].sort((a, b) => {
      if (sortOrder === "asc") {
        return a.price - b.price;
      } else {
        return b.price - a.price;
      }
    });
    setFilteredRooms(sortedRooms);
  }, [sortOrder]);

  if (loading) return <p>Cargando habitaciones...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="px-4 py-6">
      <ToastContainer />
      <div className="mb-4">
        <button
          className="w-full p-2 bg-secondary text-white rounded flex justify-center items-center"
          onClick={() => document.getElementById("filterMenu").classList.toggle("hidden")}
        >
          HABITACIONES
          <FontAwesomeIcon icon={faChevronDown} className="ml-2" />
        </button>
        <div id="filterMenu" className="hidden mt-2 p-4 border border-gray-300 rounded bg-white">
          <div className="mb-4 flex justify-between">
            <input
              type="text"
              placeholder="Buscar por descripción, número de habitación, capacidad o precio"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-1/2 p-2 border border-gray-300 rounded"
            />
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-1/2 p-2 border border-gray-300 rounded"
            >
              <option value="asc">Menor Precio</option>
              <option value="desc">Mayor Precio</option>
            </select>
          </div>
          <div className="mb-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            >
              <option value="">Selecciona un tipo</option>
                        <option value="Sencilla">Sencilla</option>
                        <option value="Doble">Doble</option>
                        <option value="Triple">Triple</option>
                        <option value="Cuadruple">Cuadruple</option>
                        <option value="Pareja">Pareja</option>
            </select>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {filteredRooms.map((room) => (
          <div 
            key={room.roomNumber} 
            className="relative rounded-lg overflow-hidden shadow-lg cursor-pointer"
            onClick={() => navigate(`/room/${room.roomNumber}`)}
          >
            <img
              src={room.image_url[0]}
              alt={`Habitación ${room.roomNumber}`}
              className="w-full h-[250px] object-cover"
            />
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-4">
              <button 
                className="bg-white text-gray-800 font-bold rounded-full px-4 py-1 mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/room/${room.roomNumber}`);
                }}
              >
                Ver más
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RoomsSection;