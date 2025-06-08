import { useState } from "react";
import { useDispatch } from "react-redux";
import { checkAvailability } from "../../Redux/Actions/bookingActions";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { es } from "date-fns/locale";
import { useNavigate } from "react-router-dom";



const ROOM_TYPES = ["Doble", "Triple", "Cuadruple", "Pareja"];

const BookingSearchForm = ({ isCompact = false }) => {
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
      className={`bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-xl mx-auto ${
        isCompact 
          ? 'p-2 sm:p-3 md:p-4 max-w-full'
          : 'p-4 md:p-6 max-w-6xl'
      }`}
      style={{ 
        boxShadow: isCompact 
          ? '0 0 0 4px rgba(255, 255, 255, 0.2), 0 15px 35px -10px rgba(0, 0, 0, 0.25)'
          : '0 0 0 12px rgba(255, 255, 255, 0.3), 0 25px 50px -12px rgba(0, 0, 0, 0.35)'
      }}
    >
      {/* Mobile Layout - Stack vertically */}
      <div className={`block md:hidden ${isCompact ? 'space-y-2' : 'space-y-4'}`}>
        {/* Check-in Date */}
        <div>
          <label className={`block font-semibold text-gray-700 ${isCompact ? 'text-xs mb-1' : 'text-xs mb-1'}`}>
            ENTRADA
          </label>
          <DatePicker
            selected={checkIn}
            onChange={(date) => setCheckIn(date)}
            minDate={new Date()}
            className={`w-full rounded-lg border border-gray-300 text-gray-700 font-medium ${
              isCompact ? 'p-2 text-xs' : 'p-2 text-sm'
            }`}
            dateFormat="dd MMM yyyy"
            locale={es}
            placeholderText="Fecha de entrada"
          />
        </div>

        {/* Check-out Date */}
        <div>
          <label className={`block font-semibold text-gray-700 ${isCompact ? 'text-xs mb-1' : 'text-xs mb-1'}`}>
            SALIDA
          </label>
          <DatePicker
            selected={checkOut}
            onChange={(date) => setCheckOut(date)}
            minDate={new Date(new Date(checkIn).getTime() + 86400000)}
            className={`w-full rounded-lg border border-gray-300 text-gray-700 font-medium ${
              isCompact ? 'p-2 text-xs' : 'p-2 text-sm'
            }`}
            dateFormat="dd MMM yyyy"
            locale={es}
            placeholderText="Fecha de salida"
          />
        </div>

        {/* Room Type and Guests in same row */}
        <div className={`grid grid-cols-2 ${isCompact ? 'gap-1' : 'gap-2'}`}>
          <div>
            <label className={`block font-semibold text-gray-700 ${isCompact ? 'text-xs mb-1' : 'text-xs mb-1'}`}>
              HABITACIÓN
            </label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className={`w-full rounded-lg border border-gray-300 text-gray-700 font-medium ${
                isCompact ? 'p-2 text-xs' : 'p-2 text-sm'
              }`}
            >
              <option value="">Tipo</option>
              {ROOM_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block font-semibold text-gray-700 ${isCompact ? 'text-xs mb-1' : 'text-xs mb-1'}`}>
              HUÉSPEDES
            </label>
            <select
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              className={`w-full rounded-lg border border-gray-300 text-gray-700 font-medium ${
                isCompact ? 'p-2 text-xs' : 'p-2 text-sm'
              }`}
            >
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'P.' : 'P.'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={handleSearch}
          className={`w-full bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-lg transition-colors duration-200 ${
            isCompact ? 'p-2 text-xs' : 'p-3 text-sm'
          }`}
        >
          RESERVAR
        </button>
      </div>

      {/* Desktop Layout - Horizontal */}
      <div className={`hidden md:grid lg:grid-cols-5 items-end ${
        isCompact 
          ? 'grid-cols-5 gap-2 lg:gap-3 xl:gap-4'
          : 'grid-cols-2 lg:grid-cols-5 gap-4'
      }`}>
        {/* Check-in Date */}
        <div>
          <label className={`block font-semibold text-gray-700 ${
            isCompact ? 'text-xs mb-1 lg:text-sm lg:mb-2' : 'text-sm mb-2'
          }`}>
            ENTRADA
          </label>
          <DatePicker
            selected={checkIn}
            onChange={(date) => setCheckIn(date)}
            minDate={new Date()}
            className={`w-full rounded-lg border border-gray-300 text-gray-700 font-medium ${
              isCompact ? 'p-2 text-xs lg:p-3 lg:text-sm' : 'p-3'
            }`}
            dateFormat="dd MMM yyyy"
            locale={es}
            placeholderText="Fecha de entrada"
          />
        </div>

        {/* Check-out Date */}
        <div>
          <label className={`block font-semibold text-gray-700 ${
            isCompact ? 'text-xs mb-1 lg:text-sm lg:mb-2' : 'text-sm mb-2'
          }`}>
            SALIDA
          </label>
          <DatePicker
            selected={checkOut}
            onChange={(date) => setCheckOut(date)}
            minDate={new Date(new Date(checkIn).getTime() + 86400000)}
            className={`w-full rounded-lg border border-gray-300 text-gray-700 font-medium ${
              isCompact ? 'p-2 text-xs lg:p-3 lg:text-sm' : 'p-3'
            }`}
            dateFormat="dd MMM yyyy"
            locale={es}
            placeholderText="Fecha de salida"
          />
        </div>

        {/* Room Type */}
        <div>
          <label className={`block font-semibold text-gray-700 ${
            isCompact ? 'text-xs mb-1 lg:text-sm lg:mb-2' : 'text-sm mb-2'
          }`}>
            HABITACIÓN
          </label>
          <select
            value={roomType}
            onChange={(e) => setRoomType(e.target.value)}
            className={`w-full rounded-lg border border-gray-300 text-gray-700 font-medium ${
              isCompact ? 'p-2 text-xs lg:p-3 lg:text-sm' : 'p-3'
            }`}
          >
            <option value="">{isCompact ? 'Tipo' : 'Tipo de habitación'}</option>
            {ROOM_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* Guests */}
        <div>
          <label className={`block font-semibold text-gray-700 ${
            isCompact ? 'text-xs mb-1 lg:text-sm lg:mb-2' : 'text-sm mb-2'
          }`}>
            HUÉSPEDES
          </label>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className={`w-full rounded-lg border border-gray-300 text-gray-700 font-medium ${
              isCompact ? 'p-2 text-xs lg:p-3 lg:text-sm' : 'p-3'
            }`}
          >
            {[1, 2, 3, 4, 5, 6].map((num) => (
              <option key={num} value={num}>
                {num} {num === 1 ? (isCompact ? 'P.' : 'Huésped') : (isCompact ? 'P.' : 'Huéspedes')}
              </option>
            ))}
          </select>
        </div>

        {/* Search Button */}
        <div>
          <button
            onClick={handleSearch}
            className={`w-full bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-lg transition-colors duration-200 ${
              isCompact ? 'p-2 text-xs lg:p-3 lg:text-sm' : 'p-3'
            }`}
          >
            RESERVAR
          </button>
        </div>
      </div>

      {/* Promotional Message - Hide in compact mode */}
      {!isCompact && (
        <div className="mt-3 md:mt-4 text-center">
          <p className="text-gray-600 text-xs md:text-sm">
            <span className="font-semibold text-yellow-600">RESERVÁ EN HOTEL BALU</span> y te garantizamos la mejor experiencia!
          </p>
        </div>
      )}
    </div>
  );
};

export default BookingSearchForm;
