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
    <div className="w-full">
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
            <div className="relative w-full h-[300px] overflow-hidden">
              <img
                src={room.image_url[0]}
                alt={`Habitación ${room.roomNumber}`}
                className="w-full h-full object-cover"
              />
              {/* Capa de opacidad debajo */}
              <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-[#8c794d] to-transparent opacity-90"></div>
              {/* Texto y botón centrado */}
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-center text-white">
                <h2 className="font-bold text-lg">{room.roomType}</h2>
                <button
                  className="bg-white text-[#8c794d] font-semibold px-6 py-2 rounded-full mt-2 shadow-md"
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
  );}

export default RoomsCarousel;

