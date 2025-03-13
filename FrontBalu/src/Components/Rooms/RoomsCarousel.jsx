import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllRooms } from "../../Redux/Actions/roomActions";
import { useNavigate } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/autoplay";
import { Autoplay } from "swiper/modules";

function RoomsCarousel() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { rooms, loading, error } = useSelector((state) => state.room); // Accede al estado global

  useEffect(() => {
    dispatch(getAllRooms()); // Llama a la acción para obtener habitaciones
  }, [dispatch]);

  if (loading) return <p className="text-center text-xl">Cargando habitaciones...</p>;
  if (error) return <p className="text-center text-xl text-red-500">Error: {error}</p>;

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4">
      <Swiper
        modules={[Autoplay]}
        slidesPerView={1}
        spaceBetween={0}
        autoplay={{ delay: 3000, disableOnInteraction: false }}
        breakpoints={{
          768: { slidesPerView: 2 }, // 2 en tablets
          1024: { slidesPerView: 5 }, // 5 en pantallas grandes
        }}
        className="w-full"
      >
        {rooms.map((room) => (
          <SwiperSlide key={room.roomNumber}>
            <div className="relative w-full h-[300px]">
              <img
                src={room.image_url[0]}
                alt={`Habitación ${room.roomNumber}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-4">
                <h2 className="text-white font-bold">{room.roomType}</h2>
                <button
                  className="bg-white text-black px-4 py-2 mt-2 rounded"
                  onClick={() => navigate(`/room/${room.roomNumber}`)}
                >
                  Ver más
                </button>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

export default RoomsCarousel;

