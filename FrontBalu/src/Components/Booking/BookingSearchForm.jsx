import { useState } from "react";
import { useDispatch } from "react-redux";
import { checkAvailability } from "../../Redux/Actions/bookingActions";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";



const ROOM_TYPES = ["Doble", "Triple", "Cuadruple", "Pareja"];

const BookingSearchForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const [checkIn, setCheckIn] = useState(new Date());
  const [checkOut, setCheckOut] = useState(new Date());
  const [roomType, setRoomType] = useState("");
  const [guests, setGuests] = useState(2);

  const handleSearch = () => {
    const searchParams = {
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      roomType,
      guests
    };
    
    localStorage.setItem('bookingSearchParams', JSON.stringify(searchParams));
    dispatch(checkAvailability({ checkIn, checkOut, roomType }));
    navigate('/booking');
  };

  return (
    <div 
      className="bg-white bg-opacity-95 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-xl max-w-6xl mx-auto"
      style={{ 
        boxShadow: '0 0 0 12px rgba(255, 255, 255, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.35)' // Increased border from 6px to 12px and opacity from 0.2 to 0.3
      }}
    >
      {/* Mobile Layout - Stack vertically */}
      <div className="block md:hidden space-y-4">
        {/* Check-in Date */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">ENTRADA</label>
          <DatePicker
            selected={checkIn}
            onChange={(date) => setCheckIn(date)}
            minDate={new Date()}
            className="w-full p-2 text-sm rounded-lg border border-gray-300 text-gray-700 font-medium"
            dateFormat="dd MMM yyyy"
            locale={es}
            placeholderText="Fecha de entrada"
          />
        </div>

        {/* Check-out Date */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">SALIDA</label>
          <DatePicker
            selected={checkOut}
            onChange={(date) => setCheckOut(date)}
            minDate={new Date(new Date(checkIn).getTime() + 86400000)}
            className="w-full p-2 text-sm rounded-lg border border-gray-300 text-gray-700 font-medium"
            dateFormat="dd MMM yyyy"
            locale={es}
            placeholderText="Fecha de salida"
          />
        </div>

        {/* Room Type and Guests in same row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">HABITACIÓN</label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full p-2 text-sm rounded-lg border border-gray-300 text-gray-700 font-medium"
            >
              <option value="">Tipo</option>
              {ROOM_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">HUÉSPEDES</label>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className="w-full p-2 text-sm rounded-lg border border-gray-300 text-gray-700 font-medium"
            >
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'Pers.' : 'Pers.'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          className="w-full p-3 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-lg transition-colors duration-200 text-sm"
        >
          RESERVAR
        </button>
      </div>

      {/* Desktop Layout - Horizontal */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        {/* Check-in Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">ENTRADA</label>
          <DatePicker
            selected={checkIn}
            onChange={(date) => setCheckIn(date)}
            minDate={new Date()}
            className="w-full p-3 rounded-lg border border-gray-300 text-gray-700 font-medium"
            dateFormat="dd MMM yyyy"
            locale={es}
            placeholderText="Fecha de entrada"
          />
        </div>

        {/* Check-out Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">SALIDA</label>
          <DatePicker
            selected={checkOut}
            onChange={(date) => setCheckOut(date)}
            minDate={new Date(new Date(checkIn).getTime() + 86400000)}
            className="w-full p-3 rounded-lg border border-gray-300 text-gray-700 font-medium"
            dateFormat="dd MMM yyyy"
            locale={es}
            placeholderText="Fecha de salida"
          />
        </div>

        {/* Room Type */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">HABITACIÓN</label>
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className="w-full p-3 rounded-lg border border-gray-300 text-gray-700 font-medium"
          >
            <option value="">Tipo de habitación</option>
            {ROOM_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Guests */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">HUÉSPEDES</label>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full p-3 rounded-lg border border-gray-300 text-gray-700 font-medium"
          >
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <option key={num} value={num}>
                {num} {num === 1 ? 'Huésped' : 'Huéspedes'}
              </option>
            ))}
          </select>
        </div>

        {/* Search Button */}
        <div>
          <button
            onClick={handleSearch}
            className="w-full p-3 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-lg transition-colors duration-200"
          >
            RESERVAR
          </button>
        </div>
      </div>

      {/* Promotional Message */}
      <div className="mt-3 md:mt-4 text-center">
        <p className="text-gray-600 text-xs md:text-sm">
          <span className="font-semibold text-yellow-600">RESERVÁ EN HOTEL BALU</span> y te garantizamos la mejor experiencia!
        </p>
      </div>
    </div>
  );
};

export default BookingSearchForm;
