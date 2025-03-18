import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  checkAvailability,
  createBooking,
} from "../../Redux/Actions/bookingActions";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faWifi,
  faParking,
  faTv,
  faFan,
  faUtensils,
  faUser,
} from "@fortawesome/free-solid-svg-icons";
import { format, differenceInDays } from "date-fns";
import ParentBuyerRegistration from "../Taxxa/ParentBuyerRegistration";
import { es } from "date-fns/locale";

const ROOM_TYPES = ["Sencilla", "Doble", "Triple", "Cuadruple", "Pareja"];

const Booking = () => {
  const dispatch = useDispatch();
  const { availability, loading, error } = useSelector(
    (state) => state.booking
  );
  const [showRegistration, setShowRegistration] = useState(false);
  const { rooms } = useSelector((state) => state.room);
  const [checkIn, setCheckIn] = useState(new Date());
  const [checkOut, setCheckOut] = useState(new Date());
  const [roomType, setRoomType] = useState("");

  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [maxCapacity, setMaxCapacity] = useState(2);
  const [selectedRoom, setSelectedRoom] = useState(null);

  const [buyerData, setBuyerData] = useState(null);
  const [isBookingReady, setIsBookingReady] = useState(false);
  const today = new Date();

  useEffect(() => {
    console.log("Cargando disponibilidad inicial...");
    dispatch(checkAvailability({ checkIn, checkOut }));
  }, [dispatch]);

  const handleCheckInChange = (date) => {
    if (date < today) {
      alert("No se puede seleccionar una fecha anterior a hoy");
      return;
    }
    setCheckIn(date);

    // Si el checkout es menor que el nuevo checkin, actualizarlo
    if (checkOut <= date) {
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);
      setCheckOut(nextDay);
    }
  };

  const handleCheckOutChange = (date) => {
    if (date <= checkIn) {
      alert("La fecha de salida debe ser posterior a la fecha de entrada");
      return;
    }
    setCheckOut(date);
  };

  const handleSearch = () => {
    console.log("Buscando habitaciones:", { checkIn, checkOut, roomType });
    dispatch(checkAvailability({ checkIn, checkOut, roomType }));
  };

  const handleReserve = (room) => {
    if (!room || !room.type) {
      console.error("Datos de habitación inválidos");
      return;
    }

    const maxGuests = room.maxGuests || 2;
    setMaxCapacity(maxGuests);
    console.log("Capacidad máxima establecida:", maxGuests);

    // Reset adults and children if they exceed new maxCapacity
    if (adults + children > maxGuests) {
      setAdults(1);
      setChildren(0);
      alert(
        `Esta habitación tiene un máximo de ${maxGuests} huéspedes. Se han reiniciado los valores.`
      );
    }

    setSelectedRoom(room);
    setShowRegistration(true);
  };

  const handleAdultsChange = (e, room) => {
    const newAdults = parseInt(e.target.value);
    const total = newAdults + children;

    console.log("Cambiando adultos:", {
      newAdults,
      children,
      total,
      maxGuests: room.maxGuests,
      roomNumber: room.roomNumber,
    });

    if (total <= room.maxGuests) {
      setAdults(newAdults);
    } else {
      alert(`La capacidad máxima es de ${room.maxGuests} personas`);
    }
  };

  const handleChildrenChange = (e, room) => {
    const newChildren = parseInt(e.target.value);
    const total = adults + newChildren;

    console.log("Cambiando niños:", {
      adults,
      newChildren,
      total,
      maxGuests: room.maxGuests,
      roomNumber: room.roomNumber,
    });

    if (total <= room.maxGuests) {
      setChildren(newChildren);
    } else {
      alert(`La capacidad máxima es de ${room.maxGuests} personas`);
    }
  };

  const handleBuyerDataComplete = (buyerData) => {
    console.log('Buyer creado exitosamente:', buyerData);
    // Se asume que buyerData ya trae sdocno a nivel raíz
    setBuyerData(buyerData);
    setIsBookingReady(true);
  };
  // Modificar handleBooking
  const handleBooking = async () => {
    if (!selectedRoom || !buyerData) {
      alert("Por favor complete el registro de usuario");
      return;
    }

    try {
      const totalGuests = adults + children;
      const nights = differenceInDays(checkOut, checkIn);

      if (nights <= 0) {
        alert("Por favor seleccione fechas válidas");
        return;
      }

      let pricePerPerson = selectedRoom.price;
      if (totalGuests === 2) pricePerPerson = 60000;
      else if (totalGuests > 4) pricePerPerson = 50000;

      const totalAmount = pricePerPerson * totalGuests * nights;

      const bookingData = {
        checkIn,
        checkOut,
        pointOfSale: "Online",
        status: "pending",
        guestCount: totalGuests,
        roomNumber: selectedRoom.roomNumber,
        totalAmount,
        adults,
        children,
        nights,
        // Se utiliza el sdocno a nivel raíz
        guestId: buyerData.sdocno,
        buyerInfo: {
          name: buyerData.scostumername,
          docType: buyerData.wdoctype,      // <-- Se usa la propiedad aplanada
          sdocno: buyerData.sdocno,
          email: buyerData.selectronicmail,
          phone: buyerData.stelephone,
        },
      };

      console.log("Datos completos de la reserva:", bookingData);
      const response = await dispatch(createBooking(bookingData));

      

    } catch (error) {
      console.error('Error al crear la reserva:', error);
      alert('Error al procesar la reserva: ' + error.message);
    }
  };


  const getServiceIcon = (serviceName) => {
    switch (serviceName.toLowerCase()) {
      case "wifi":
        return faWifi;
      case "parking":
        return faParking;
      case "tv":
        return faTv;
      case "aire acondicionado":
        return faFan;
      case "ventilador":
        return faFan;
      case "desayuno":
        return faUtensils;
      default:
        return faUser;
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price);
  };

  const formatDate = (date) => {
    return format(date, "dd-MM-yyyy", { locale: es });
  };

  return (
    <div className="container mx-auto p-4 grid grid-cols-1 md:grid-cols-4 gap-6 bg-stone-500 text-white min-h-screen">
      {/* Formulario de Búsqueda */}
      <div className="col-span-1 bg-gray-800 p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold mb-4">Buscar Habitaciones</h1>
        <label className="block mb-2">Desde</label>
        <DatePicker
          selected={checkIn}
          onChange={handleCheckInChange}
          minDate={today}
          className="w-full p-2 rounded-lg bg-gray-700"
          dateFormat="dd-MM-yyyy"
          locale={es}
        />
        <label className="block mt-4 mb-2">Hasta</label>
        <DatePicker
          selected={checkOut}
          onChange={handleCheckOutChange}
          minDate={new Date(checkIn.getTime() + 86400000)} // checkIn + 1 día en milisegundos
          className="w-full p-2 rounded-lg bg-gray-700"
          dateFormat="dd-MM-yyyy"
          locale={es}
        />
        <label className="block mt-4 mb-2">Tipo de Habitación</label>
        <select
          value={roomType}
          onChange={(e) => {
            setRoomType(e.target.value);
            console.log("Tipo seleccionado:", e.target.value);
            // Filtrar habitaciones por tipo seleccionado
            dispatch(
              checkAvailability({
                checkIn,
                checkOut,
                roomType: e.target.value,
              })
            );
          }}
          className="w-full p-2 rounded-lg bg-gray-700"
        >
          <option value="">Todos los tipos</option>
          {ROOM_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button
          onClick={handleSearch}
          className="mt-4 w-full p-3 bg-stone-500 hover:bg-Hover rounded-full font-bold"
        >
          Buscar
        </button>
      </div>

      {/* Habitaciones Disponibles */}
      <div className="col-span-3">
        {loading && <p>Cargando habitaciones...</p>}
        {error && <p>Error: {error}</p>}
        {availability?.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4">Habitaciones Disponibles</h2>
            <div className="space-y-6">
              {availability.map((room) => (
                <div
                  key={room.roomNumber}
                  className="bg-gray-800 p-6 rounded-xl flex flex-col md:flex-row items-center shadow-lg"
                >
                  <img
                    src={room.image_url[0]}
                    alt={`Habitación ${room.roomNumber}`}
                    className="w-32 h-32 object-cover rounded-lg mb-4 md:mb-0 md:mr-6"
                  />
                  <div className="flex-1">
                    <h3 className="text-lg font-bold mb-2">{room.type}</h3>
                    <p className="text-gray-400 mb-2">{room.description}</p>
                    <ul className="space-y-2">
                      {room.Services &&
                        room.Services.map((service, index) => (
                          <li
                            key={index}
                            className="flex text-white items-center space-x-2"
                          >
                            <FontAwesomeIcon
                              icon={getServiceIcon(service.name)}
                            />
                            <span>{service.name}</span>
                          </li>
                        ))}
                    </ul>
                    <p className="text-2xl font-bold text-yellow-400">
                      {formatPrice(room.price)}
                    </p>
                  </div>
                  <div className="mt-4 md:mt-0 md:ml-6 flex space-x-4">
                    <div>
                      <label className="block text-sm">Adultos</label>
                      <select
                        value={adults}
                        onChange={(e) => handleAdultsChange(e, room)} // Pasar la room actual
                        className="w-16 p-2 rounded-lg bg-gray-700"
                      >
                        {[...Array(room.maxGuests)].map((_, index) => (
                          <option key={index} value={index + 1}>
                            {index + 1}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm">Niños</label>
                      <select
                        value={children}
                        onChange={(e) => handleChildrenChange(e, room)} // Pasar la room actual
                        className="w-16 p-2 rounded-lg bg-gray-700"
                      >
                        {[
                          ...Array(Math.max(0, room.maxGuests - adults + 1)),
                        ].map((_, index) => (
                          <option key={index} value={index}>
                            {index}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={() => {
                        console.log("Reservando habitación:", {
                          roomNumber: room.roomNumber,
                          maxGuests: room.maxGuests,
                          currentTotal: adults + children,
                        });
                        handleReserve(room);
                      }}
                      className="mt-4 w-full p-3 bg-stone-500 hover:bg-Hover rounded-full font-bold"
                    >
                      Reservar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      {showRegistration && (
        <div className="col-span-1 md:col-span-4 flex flex-col md:flex-row gap-6">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full md:w-1/2">
            <h2 className="text-xl font-bold mb-4">Registro de Usuario</h2>
            <ParentBuyerRegistration onComplete={handleBuyerDataComplete} />
          </div>
          {selectedRoom && (
            <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full md:w-1/2">
              <h2 className="text-xl font-bold mb-4">Confirmar Reserva</h2>
              <p className="mb-2">Habitación: {selectedRoom.type}</p>
              <p className="mb-2">Desde: {formatDate(checkIn)}</p>
              <p className="mb-2">Hasta: {formatDate(checkOut)}</p>
              <p className="mb-2">Adultos: {adults}</p>
              <p className="mb-2">Niños: {children}</p>
              <p className="mb-2">
                Total: {formatPrice(selectedRoom.price * (adults + children))}
              </p>
              <button
                onClick={handleBooking}
                className="mt-4 w-full p-3 bg-stone-500 hover:bg-Hover rounded-full font-bold"
              >
                Confirmar Reserva
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Booking;
