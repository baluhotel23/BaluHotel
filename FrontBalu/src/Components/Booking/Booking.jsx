import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  checkAvailability,
  createBooking,
  updateOnlinePayment
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
import { toast } from "react-toastify";
import WompiPayment from "../WompiPayment";
import { useNavigate } from "react-router-dom";

const ROOM_TYPES = ["Sencilla", "Doble", "Triple", "Cuadruple", "Pareja"];

const Booking = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { availability, loading, error } = useSelector((state) => state.booking);
  const { rooms } = useSelector((state) => state.room);
  const [showRegistration, setShowRegistration] = useState(false);
  const today = new Date();
  const buyerRedux = useSelector((state) => state.taxxa.buyer);
  console.log("buyerRedux:", buyerRedux);
  // Estados para fechas, búsqueda y reserva
  const [checkIn, setCheckIn] = useState(new Date());
  const [checkOut, setCheckOut] = useState(new Date());
  const [roomType, setRoomType] = useState("");
  const [bookingTotal, setBookingTotal] = useState(0);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [maxCapacity, setMaxCapacity] = useState(2);
  const [selectedRoom, setSelectedRoom] = useState(null);

  // Estados para registro del comprador y reserva
  const [buyerData, setBuyerData] = useState(null);
  const [isBookingReady, setIsBookingReady] = useState(false);

  // Estado para tipo de pago (por el momento no se utiliza, pero queda como referencia)
  const [paymentType, setPaymentType] = useState("wompi");

  // Cargar disponibilidad inicial
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
      toast.error("Datos de habitación inválidos");
      return;
    }
    const maxGuests = room.maxGuests || 2;
    setMaxCapacity(maxGuests);
    toast.info(
      <div>
        <p>¿Confirma las siguientes fechas?</p>
        <p>Check-in: {formatDate(checkIn)}</p>
        <p>Check-out: {formatDate(checkOut)}</p>
        <button
          onClick={() => {
            if (adults + children > maxGuests) {
              setAdults(1);
              setChildren(0);
              toast.warning(
                `Esta habitación tiene un máximo de ${maxGuests} huéspedes. Se han reiniciado los valores.`
              );
            }
            setSelectedRoom(room);
            setShowRegistration(true);
            toast.dismiss();
          }}
          className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mr-2"
        >
          Confirmar
        </button>
        <button
          onClick={() => toast.dismiss()}
          className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Cancelar
        </button>
      </div>,
      {
        position: "top-center",
        autoClose: false,
        closeOnClick: false,
        draggable: false,
        closeButton: false,
      }
    );
  };

  const calculateTotal = (adults, children, room, checkIn, checkOut) => {
    const totalGuests = adults + children;
    const nights = differenceInDays(checkOut, checkIn) + 1;
    if (!room) return 0;
    let pricePerPerson = room.price;
    if (totalGuests === 1) pricePerPerson = 70000;
    else if (totalGuests >= 2 && totalGuests <= 4) pricePerPerson = 60000;
    else if (totalGuests > 4) pricePerPerson = 50000;
    return pricePerPerson * totalGuests * nights;
  };

  useEffect(() => {
    if (selectedRoom) {
      const newTotal = calculateTotal(adults, children, selectedRoom, checkIn, checkOut);
      setBookingTotal(newTotal);
    }
  }, [adults, children, selectedRoom, checkIn, checkOut]);

  const handleAdultsChange = (e, room) => {
    const newAdults = parseInt(e.target.value);
    const total = newAdults + children;
    if (total <= room.maxGuests) {
      setAdults(newAdults);
      setBookingTotal(calculateTotal(newAdults, children, room, checkIn, checkOut));
    } else {
      toast.warning(`La capacidad máxima es de ${room.maxGuests} personas`);
    }
  };

  const handleChildrenChange = (e, room) => {
    const newChildren = parseInt(e.target.value);
    const total = adults + newChildren;
    if (total <= room.maxGuests) {
      setChildren(newChildren);
      setBookingTotal(calculateTotal(adults, newChildren, room, checkIn, checkOut));
    } else {
      toast.warning(`La capacidad máxima es de ${room.maxGuests} personas`);
    }
  };

  const handleBuyerDataComplete = (buyerData) => {
    console.log("Buyer creado exitosamente:", buyerData);
    setBuyerData(buyerData);
    setIsBookingReady(true);
  };

  // Flujo principal para el pago con Wompi
  const handleWompiPaymentSuccess = async (transaction) => {
    console.log("Pago con Wompi exitoso:", transaction);
    if (transaction.status !== "APPROVED") {
      toast.error(`El pago no fue aprobado. Estado: ${transaction.status}`);
      return;
    }
    const totalAmount = calculateTotal(adults, children, selectedRoom, checkIn, checkOut);
    const totalGuests = adults + children;
    const nights = differenceInDays(checkOut, checkIn) + 1;
    const bookingData = {
      checkIn,
      checkOut,
      pointOfSale: "Online",
      status: "confirmed",
      guestCount: totalGuests,
      roomNumber: selectedRoom.roomNumber,
      totalAmount,
      adults,
      children,
      nights,
      guestId: buyerData?.sdocno,
      paymentType: "online",
      paymentMethod: "credit_card",
      paymentStatus: transaction.status,
      transactionId: transaction.id,
      paymentReference: transaction.reference,
      paymentDetails: {
        cardType: transaction.paymentMethod?.extra?.cardType,
        cardBrand: transaction.paymentMethod?.extra?.brand,
        lastFour: transaction.paymentMethod?.extra?.lastFour,
        installments: transaction.paymentMethod?.installments,
        processorResponseCode: transaction.paymentMethod?.extra?.processorResponseCode,
      },
      buyerInfo: {
        name: buyerData?.scostumername,
        docType: buyerData?.wdoctype,
        sdocno: buyerData?.sdocno,
        email: buyerData?.selectronicmail,
        phone: buyerData?.stelephone,
      },
    };
  
    try {
      console.log("Datos completos de la reserva:", bookingData);
      const createResponse = await dispatch(createBooking(bookingData));
      if (!createResponse.success) {
        toast.error('Error al confirmar la reserva: ' + createResponse.message);
        return;
      }
      // Se asume que se retorna createResponse.data.booking.bookingId
      const bookingId = createResponse.data.booking.bookingId;
      // Preparar payload para actualizar el pago online
      const paymentPayload = {
        bookingId,
        amount: transaction.amountInCents ? transaction.amountInCents / 100 : totalAmount,
        transactionId: transaction.id,
        paymentReference: transaction.reference,
        paymentMethod: "credit_card", // o "wompi" según corresponda
      };
      console.log("Enviando actualización de pago online:", paymentPayload);
      const updateResponse = await dispatch(updateOnlinePayment(paymentPayload));
      if (updateResponse.success) {
        toast.success("Pago online registrado y reserva actualizada exitosamente");
        if (createResponse.data.trackingLink) {
          window.open(createResponse.data.trackingLink, '_blank');
        }
        navigate(`/booking-confirmation/${bookingId}`);
      } else {
        toast.error("Error al actualizar el pago online: " + updateResponse.message);
      }
      toast.success(
        <div>
          <p>¡Pago exitoso!</p>
          <p>Referencia: {transaction.reference}</p>
          <p>
            Tarjeta: {transaction.paymentMethod?.extra?.brand}-{transaction.paymentMethod?.extra?.lastFour}
          </p>
        </div>,
        { autoClose: 5000 }
      );
    } catch (error) {
      console.error("Error en el flujo de reserva/pago:", error);
      toast.error("Error al procesar la reserva y el pago online");
    }
  };

  // Funciones de utilidad
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


  useEffect(() => {
    if (buyerRedux && !buyerData) {
      setBuyerData(buyerRedux);
      setIsBookingReady(true);
    }
  }, [buyerRedux, buyerData]);

  // ...
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
        minDate={new Date(checkIn.getTime() + 86400000)}
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
          dispatch(checkAvailability({ checkIn, checkOut, roomType: e.target.value }));
        }}
        className="w-full p-2 rounded-lg bg-gray-700"
      >
        <option value="">Todos los tipos</option>
        {ROOM_TYPES.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </select>
      <button
        onClick={handleSearch}
        className="mt-4 w-full p-3 bg-stone-500 hover:bg-Hover rounded-full font-bold"
      >
        Buscar
      </button>
    </div>

    {/* Listado de Habitaciones Disponibles */}
    <div className="col-span-3">
      {loading && <p>Cargando habitaciones...</p>}
      {error && <p>Error: {error}</p>}
      {!loading && (!availability || availability.length === 0) && (
        <p>No hay habitaciones disponibles para las fechas y tipo seleccionado.</p>
      )}
      {/* Se muestra el listado solo si no se ha seleccionado una habitación */}
      {!selectedRoom && availability && availability.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Habitaciones Disponibles</h2>
          <div className="space-y-6">
            {availability.map((room) => (
              <div key={room.roomNumber} className="bg-gray-800 p-6 rounded-xl flex flex-col md:flex-row items-center shadow-lg">
                <img 
                  src={room.image_url[0]} 
                  alt={`Habitación ${room.roomNumber}`} 
                  className="w-32 h-32 object-cover rounded-lg mb-4 md:mb-0 md:mr-6" 
                />
                <div className="flex-1">
                  <h3 className="text-lg font-bold mb-2">{room.type}</h3>
                  <p className="text-gray-400 mb-2">{room.description}</p>
                  <ul className="space-y-2">
                    {room.Services && room.Services.map((service, index) => (
                      <li key={index} className="flex text-white items-center space-x-2">
                        <FontAwesomeIcon icon={getServiceIcon(service.name)} />
                        <span>{service.name}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-2xl font-bold text-yellow-400">{formatPrice(room.price)}</p>
                </div>
                <div className="mt-4 md:mt-0 md:ml-6">
                  <button
                    onClick={() => {
                      console.log("Seleccionando habitación:", room);
                      handleReserve(room);
                    }}
                    className="mt-4 w-full p-3 bg-stone-500 hover:bg-Hover rounded-full font-bold"
                  >
                    Seleccionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>

    {/* Sección de Registro y Confirmación de Reserva (sólo si ya se ha seleccionado una habitación) */}
    {showRegistration && selectedRoom && (
        <div className="col-span-1 md:col-span-4 flex flex-col md:flex-row gap-6">
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full md:w-1/2">
            <h2 className="text-xl font-bold mb-4">Registro de Usuario</h2>
            {/* Se pasa initialBuyerData para precargar si ya existe */}
            <ParentBuyerRegistration 
              initialBuyerData={buyerRedux}
              onComplete={handleBuyerDataComplete} 
            />
          </div>
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg w-full md:w-1/2">
          <h2 className="text-xl font-bold mb-4">Confirmar Reserva</h2>
          <p className="mb-2">Habitación: {selectedRoom.type}</p>
          <p className="mb-2">Desde: {formatDate(checkIn)}</p>
          <p className="mb-2">Hasta: {formatDate(checkOut)}</p>
          {/* Controles para elegir pasajeros */}
          <div className="flex space-x-4 mb-2">
            <div>
              <label className="block text-sm">Adultos</label>
              <select
                value={adults}
                onChange={(e) => handleAdultsChange(e, selectedRoom)}
                className="w-16 p-2 rounded-lg bg-gray-700"
              >
                {[...Array(selectedRoom.maxGuests)].map((_, index) => (
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
                onChange={(e) => handleChildrenChange(e, selectedRoom)}
                className="w-16 p-2 rounded-lg bg-gray-700"
              >
                {[...Array(Math.max(0, selectedRoom.maxGuests - adults + 1))].map((_, index) => (
                  <option key={index} value={index}>
                    {index}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mb-2">Total: {formatPrice(bookingTotal)}</p>
          <WompiPayment
            booking={{
              bookingId: selectedRoom.roomNumber,
              totalAmount: bookingTotal,
            }}
            onPaymentComplete={handleWompiPaymentSuccess}
          />
          <button
            onClick={() => {
              // Permitir volver al listado de habitaciones para cambiar la selección
              setSelectedRoom(null);
              setShowRegistration(false);
            }}
            className="mt-4 w-full p-3 bg-red-500 hover:bg-red-600 rounded-full font-bold"
          >
            Cambiar habitación
          </button>
        </div>
      </div>
    )}
  </div>
);
}
export default Booking;
