import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllRooms } from "../../Redux/Actions/roomActions"; // Importa la acción
import { useNavigate } from "react-router-dom";

function RoomsSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
 const { rooms, loading, error } = useSelector(state => state.room) // Accede al estado global

  useEffect(() => {
    dispatch(getAllRooms()); // Llama a la acción al montar el componente
  }, [dispatch]);

  if (loading) return <p>Cargando habitaciones...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4">
      {rooms.map((room) => (
        <div key={room.roomNumber} className="border rounded-lg shadow-lg p-4">
          {/* Mostrar la imagen */}
          <img
            src={room.image_url[0]} 
            alt={`Habitación ${room.roomNumber}`}
            className="w-full h-48 object-cover rounded-lg"
          />
          <h2 className="text-xl font-bold mt-2">{`Habitación ${room.roomNumber}`}</h2>
          <p>{room.description}</p>
          <p className="text-green-600 font-bold">{`$${room.price}`}</p>
          <button
            className="bg-blue-500 text-white px-4 py-2 mt-2 rounded"
            onClick={() => navigate(`/room/${room.roomNumber}`)} // Navegar al detalle
          >
            Ver Detalle
          </button>
        </div>
      ))}
    </div>
  );
}

export default RoomsSection;
