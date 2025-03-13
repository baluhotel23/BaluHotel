import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllRooms } from "../../Redux/Actions/roomActions"; 
import { useNavigate } from "react-router-dom";

function RoomsSection() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { rooms, loading, error } = useSelector(state => state.room);

  useEffect(() => {
    dispatch(getAllRooms());
  }, [dispatch]);

  if (loading) return <p>Cargando habitaciones...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 px-4 py-6">
      {rooms.map((room) => (
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
            {/* <h2 className="text-white text-lg font-bold">{room.maxGuests}</h2> */}
            <button className="bg-white text-gray-800 font-bold rounded-full px-4 py-1 mt-2">
              Ver más
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default RoomsSection;
