import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  checkAvailability,
  createBooking,
  updateOnlinePayment
} from "../../Redux/Actions/bookingActions";
import { calculateRoomPrice } from "../../Redux/Actions/roomActions"; // ⭐ NUEVA IMPORTACIÓN
import { fetchBuyerByDocument, createBuyer } from '../../Redux/Actions/taxxaActions';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "react-toastify";
import WompiPayment from "../WompiPayment";
import { useNavigate } from "react-router-dom";

const ROOM_TYPES = ["Sencilla", "Doble", "Triple", "Cuadruple", "Pareja"];

// Definición del Modal
const Modal = ({ children, isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      color: '#333' // Asegurar que el texto dentro del modal sea legible
    }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', minWidth: '300px', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
        <button 
          onClick={onClose} 
          style={{ 
            marginTop: '20px', 
            padding: '10px 15px', 
            float: 'right', 
            backgroundColor: '#f44336', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer' 
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

// Definición del Formulario de Registro de Buyer en el Popup
const BuyerRegistrationFormPopup = ({ isOpen, onClose, onBuyerRegistered, initialSdocno }) => {
  const dispatch = useDispatch();
  const [buyerFormData, setBuyerFormData] = useState({
    sdocno: initialSdocno || '',
    wlegalorganizationtype: 'person',
    scostumername: '',
    stributaryidentificationkey: 'O-1',
    sfiscalresponsibilities: 'R-99-PN',
    sfiscalregime: '48',
    wdoctype: 'CC',
    scorporateregistrationschemename: '',
    scontactperson: '',
    selectronicmail: '',
    stelephone: '',
    saddressline1: '',
    scityname: '',
    wdepartmentcode: '',
  });

  useEffect(() => {
    if (initialSdocno) {
      setBuyerFormData(prev => ({ ...prev, sdocno: initialSdocno }));
    }
  }, [initialSdocno, isOpen]); // Reset form when opened with new initialSdocno

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBuyerFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { sdocno, scostumername, selectronicmail, wdoctype, scorporateregistrationschemename, scontactperson, stelephone } = buyerFormData;
    if (!sdocno || !scostumername || !selectronicmail || !wdoctype || !scorporateregistrationschemename || !scontactperson || !stelephone) {
      toast.error("Por favor, complete todos los campos obligatorios del huésped (*).");
      return;
    }
    const resultAction = await dispatch(createBuyer(buyerFormData));
    if (resultAction && resultAction.success) {
      toast.success("Huésped registrado exitosamente.");
      onBuyerRegistered(resultAction.data); // Pasa el buyer registrado
      onClose();
    } else {
      toast.error(resultAction.message || "Error al registrar el huésped.");
    }
  };

  const inputStyle = { width: 'calc(100% - 16px)', padding: '8px', marginBottom: '10px', border: '1px solid #ccc', borderRadius: '4px' };
  const labelStyle = { display: 'block', marginBottom: '5px', fontWeight: 'bold'};

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h4 style={{ marginTop: 0, marginBottom: '20px' }}>Registrar Nuevo Huésped</h4>
      <form onSubmit={handleSubmit}>
        <div>
          <label style={labelStyle}>Documento (sdocno):*</label>
          <input type="text" name="sdocno" value={buyerFormData.sdocno} onChange={handleChange} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Tipo Documento (wdoctype):*</label>
          <select name="wdoctype" value={buyerFormData.wdoctype} onChange={handleChange} required style={inputStyle}>
            <option value="CC">CC - Cédula de Ciudadanía</option>
            <option value="NIT">NIT</option>
            <option value="CE">CE - Cédula de Extranjería</option>
            <option value="PAS">PAS - Pasaporte</option>
            <option value="RC">RC - Registro Civil</option>
            <option value="TI">TI - Tarjeta de Identidad</option>
            <option value="TE">TE - Tarjeta de Extranjería</option>
            <option value="DEX">DEX - Documento Extranjero</option>
            <option value="PEP">PEP - Permiso Especial de Permanencia</option>
            <option value="PPT">PPT - Permiso Protección Temporal</option>
            <option value="FI">FI - NIT de Otro País</option>
            <option value="NUIP">NUIP - Número Único de Identificación Personal</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Nombre Completo (scostumername):*</label>
          <input type="text" name="scostumername" value={buyerFormData.scostumername} onChange={handleChange} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Email (selectronicmail):*</label>
          <input type="email" name="selectronicmail" value={buyerFormData.selectronicmail} onChange={handleChange} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Teléfono (stelephone):*</label>
          <input type="text" name="stelephone" value={buyerFormData.stelephone} onChange={handleChange} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Tipo Organización Legal (wlegalorganizationtype):*</label>
          <select name="wlegalorganizationtype" value={buyerFormData.wlegalorganizationtype} onChange={handleChange} required style={inputStyle}>
            <option value="person">Persona</option>
            <option value="company">Empresa</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Clave Identificación Tributaria (stributaryidentificationkey):*</label>
          <select name="stributaryidentificationkey" value={buyerFormData.stributaryidentificationkey} onChange={handleChange} required style={inputStyle}>
            <option value="O-1">O-1 (IVA)</option>
            <option value="O-4">O-4 (INC)</option>
            <option value="ZZ">ZZ (No aplica)</option>
            <option value="ZA">ZA (IVA e INC)</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Responsabilidades Fiscales (sfiscalresponsibilities):*</label>
          <select name="sfiscalresponsibilities" value={buyerFormData.sfiscalresponsibilities} onChange={handleChange} required style={inputStyle}>
            <option value="R-99-PN">R-99-PN (No responsable)</option>
            <option value="O-13">O-13 (Gran contribuyente)</option>
            <option value="O-15">O-15 (Autorretenedor)</option>
            <option value="O-23">O-23 (Agente de retención IVA)</option>
            <option value="O-47">O-47 (Régimen Simple de Tributación)</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Régimen Fiscal (sfiscalregime):*</label>
          <select name="sfiscalregime" value={buyerFormData.sfiscalregime} onChange={handleChange} required style={inputStyle}>
            <option value="48">48 - Impuesto sobre las ventas – IVA</option>
            <option value="49">49 - No responsable de IVA</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Nombre Esquema Registro Corporativo (scorporateregistrationschemename):*</label>
          <input type="text" name="scorporateregistrationschemename" value={buyerFormData.scorporateregistrationschemename} onChange={handleChange} required style={inputStyle} placeholder="Ej: Registro Mercantil" />
        </div>
        <div>
          <label style={labelStyle}>Persona de Contacto (scontactperson):*</label>
          <input type="text" name="scontactperson" value={buyerFormData.scontactperson} onChange={handleChange} required style={inputStyle} />
        </div>
        <h5 style={{marginTop: '15px', marginBottom: '5px'}}>Dirección (Opcional)</h5>
        <div>
          <label style={labelStyle}>Dirección (saddressline1):</label>
          <input type="text" name="saddressline1" value={buyerFormData.saddressline1} onChange={handleChange} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Ciudad (scityname):</label>
          <input type="text" name="scityname" value={buyerFormData.scityname} onChange={handleChange} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Código Departamento (wdepartmentcode):</label>
          <input type="text" name="wdepartmentcode" value={buyerFormData.wdepartmentcode} onChange={handleChange} style={inputStyle} />
        </div>
        <button 
          type="submit" 
          style={{ 
            padding: '10px 15px', 
            backgroundColor: '#4CAF50', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            width: 'auto',
            display: 'block',
            marginLeft: 'auto',
            marginRight: 'auto',
            marginTop: '20px'
          }}
        >
          Registrar Huésped
        </button>
      </form>
    </Modal>
  );
};

// ... El resto de tu componente Booking ...
const Booking = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { 
    availability, 
    loading: availabilityLoading,
    error: availabilityError 
  } = useSelector((state) => state.booking);
  const { 
    buyer: buyerFromRedux, 
    loading: buyerLoading, 
    error: buyerError 
  } = useSelector((state) => state.taxxa);

  const [step, setStep] = useState(1);
  const [checkIn, setCheckIn] = useState(new Date());
  const [checkOut, setCheckOut] = useState(new Date());
  const [roomType, setRoomType] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [maxCapacity, setMaxCapacity] = useState(2);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [buyerSdocnoInput, setBuyerSdocnoInput] = useState('');
  const [showBuyerPopup, setShowBuyerPopup] = useState(false);
  const [currentBuyerData, setCurrentBuyerData] = useState(null);
  const [paymentOption, setPaymentOption] = useState("total");
  const [lastSearchedSdocno, setLastSearchedSdocno] = useState('');
  
  // ⭐ NUEVOS ESTADOS PARA MANEJO DE PRECIOS
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [promoCode, setPromoCode] = useState('');

  // Load search parameters from localStorage if available
  useEffect(() => {
    const storedParams = localStorage.getItem('bookingSearchParams');
    if (storedParams) {
      const params = JSON.parse(storedParams);
      setCheckIn(new Date(params.checkIn));
      setCheckOut(new Date(params.checkOut));
      setRoomType(params.roomType || "");
      setAdults(params.guests || 1);
      
      // Auto-trigger search with stored parameters
      setTimeout(() => {
        dispatch(checkAvailability({ 
          checkIn: new Date(params.checkIn), 
          checkOut: new Date(params.checkOut), 
          roomType: params.roomType 
        }));
      }, 100);
      
      // Clear stored parameters
      localStorage.removeItem('bookingSearchParams');
    }
  }, [dispatch]);

  // ... (handleSearch, handleSelectRoom, handleContinuePassengers sin cambios) ...
 const handleSearch = () => {
    dispatch(checkAvailability({ checkIn, checkOut, roomType }));
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setMaxCapacity(room.maxGuests || 2);
    setAdults(1); 
    setChildren(0);
    setStep(2);
  };


  const handleContinuePassengers = async () => {
    const totalGuests = adults + children;
    if (totalGuests === 0) {
      toast.warning('Debe seleccionar al menos un huésped.');
      return;
    }
    if (totalGuests > maxCapacity) {
      toast.warning(`Máximo ${maxCapacity} huéspedes para esta habitación.`);
      return;
    }

    const nights = differenceInDays(checkOut, checkIn);
    if (nights < 1) {
      toast.warning('La fecha de salida debe ser posterior a la fecha de entrada.');
      return;
    }

    setPriceLoading(true);
    
    try {
      // ⭐ LLAMAR AL BACKEND PARA CALCULAR PRECIO
      const result = await dispatch(calculateRoomPrice({
        roomNumber: selectedRoom.roomNumber,
        guestCount: totalGuests,
        checkIn: checkIn.toISOString(),
        checkOut: checkOut.toISOString(),
        promoCode: promoCode || null
      }));

      if (result.success) {
        const priceData = result.data;
        setBookingTotal(priceData.totalAmount);
        setPriceBreakdown(priceData.breakdown);
        
        if (priceData.isPromotion) {
          toast.success(`¡Precio promocional aplicado! $${priceData.pricePerNight.toLocaleString()} por noche`);
        }
        
        setStep(3);
      } else {
        toast.error(result.error || 'Error al calcular el precio');
      }
    } catch (error) {
      console.error('Error calculando precio:', error);
      toast.error('Error al calcular el precio. Intente nuevamente.');
    } finally {
      setPriceLoading(false);
    }
  };

 


  // Paso 3: Iniciar la verificación o registro del buyer
  const handleVerifyOrRegisterBuyer = async () => {
    const sdocnoToSearch = buyerSdocnoInput.trim();
    if (!sdocnoToSearch) {
      toast.error("Por favor, ingrese un número de documento para el huésped.");
      return;
    }

    // Optimización: Si Redux ya tiene este buyer y coincide con el input actual
    if (buyerFromRedux && buyerFromRedux.sdocno === sdocnoToSearch) {
      toast.success(`Huésped ${buyerFromRedux.scostumername || buyerFromRedux.sdocno} encontrado (datos previos).`);
      setCurrentBuyerData(buyerFromRedux);
      setShowBuyerPopup(false);
      setLastSearchedSdocno(sdocnoToSearch); // Asegurarse que lastSearchedSdocno esté actualizado
      setStep(4); 
      return;
    }

    setLastSearchedSdocno(sdocnoToSearch); // Establecer el sdocno que se va a buscar
    setCurrentBuyerData(null); 
    setShowBuyerPopup(false); 
    dispatch(fetchBuyerByDocument(sdocnoToSearch));
  };

  // useEffect para reaccionar a los resultados de la búsqueda del buyer desde Redux
  useEffect(() => {
    // Solo actuar si estamos en el paso 3, se ha establecido un 'lastSearchedSdocno' y la carga ha terminado.
    if (step === 3 && lastSearchedSdocno && !buyerLoading) {
      if (buyerFromRedux && buyerFromRedux.sdocno === lastSearchedSdocno) {
        // Buyer encontrado y coincide con el sdocno buscado explícitamente
        if (!currentBuyerData || currentBuyerData.sdocno !== buyerFromRedux.sdocno) { 
            toast.success(`Huésped ${buyerFromRedux.scostumername || buyerFromRedux.sdocno} encontrado.`);
        }
        setCurrentBuyerData(buyerFromRedux);
        setShowBuyerPopup(false);
        setStep(4); 
      } else {
        // Buyer no encontrado para el 'lastSearchedSdocno', o hubo un error.
        if (buyerError) {
          toast.error(`Error al buscar huésped con documento ${lastSearchedSdocno}: ${typeof buyerError === 'string' ? buyerError : (buyerError.message || 'Intente de nuevo')}. Si no existe, por favor regístrelo.`);
        } else {
          // No hay error específico, pero el buyer no se encontró para este sdocno.
          toast.info(`Huésped con documento ${lastSearchedSdocno} no encontrado. Por favor, regístrelo.`);
        }
        setCurrentBuyerData(null); 
        setShowBuyerPopup(true);   
      }
    }
  }, [buyerFromRedux, buyerLoading, buyerError, lastSearchedSdocno, step, dispatch, currentBuyerData]);

  // Callback cuando un nuevo buyer es registrado a través del popup
  const handleBuyerRegistered = (registeredBuyer) => {
    setCurrentBuyerData(registeredBuyer); 
    setShowBuyerPopup(false);
    setStep(4); 
  };
  
  const amountToPay = paymentOption === "mitad"
    ? Math.round(bookingTotal / 2)
    : bookingTotal;
  
  // ... (handlePaymentSuccess y el resto del componente JSX) ...
  const handlePaymentSuccess = async (transaction) => {
    if (!currentBuyerData || !selectedRoom) {
        toast.error("Faltan datos para crear la reserva.");
        return;
    }
     const totalGuests = adults + children;
     const nights = differenceInDays(checkOut, checkIn);

    const bookingData = {
      checkIn: format(checkIn, "yyyy-MM-dd"),
      checkOut: format(checkOut, "yyyy-MM-dd"),
      pointOfSale: "Online",
      status: "confirmed", 
      guestCount: totalGuests,
      roomNumber: selectedRoom.roomNumber,
      totalAmount: bookingTotal,
      adults,
      children,
      nights,
      guestId: currentBuyerData.sdocno, 
      paymentType: "online",
      paymentMethod: transaction.payment_method_type || "credit_card", 
      paymentStatus: transaction.status,
      transactionId: transaction.id,
      paymentReference: transaction.reference,
      paymentDetails: { 
        cardType: transaction.paymentMethod?.extra?.cardType,
        cardBrand: transaction.paymentMethod?.extra?.brand,
        lastFour: transaction.paymentMethod?.extra?.lastFour,
      },
      buyerInfo: { 
        name: currentBuyerData.scostumername,
        docType: currentBuyerData.wdoctype,
        sdocno: currentBuyerData.sdocno,
        email: currentBuyerData.selectronicmail,
        phone: currentBuyerData.stelephone,
      },
    };

    try {
      const createResponse = await dispatch(createBooking(bookingData));
      if (!createResponse || !createResponse.success) {
        toast.error('Error al confirmar la reserva: ' + (createResponse?.message || 'Error desconocido'));
        return;
      }
      
      const bookingId = createResponse.data.booking.bookingId; 
      
      const paymentPayload = {
        bookingId,
        amount: amountToPay, 
        transactionId: transaction.id,
        paymentReference: transaction.reference,
        paymentMethod: transaction.payment_method_type || "credit_card",
        status: transaction.status,
      };
      
      await dispatch(updateOnlinePayment(paymentPayload));

      toast.success("Reserva confirmada y pago registrado exitosamente.");
      if (createResponse.data.trackingLink) { 
          // window.open(createResponse.data.trackingLink, '_blank');
      }
      navigate(`/booking-confirmation/${bookingId}`); 

    } catch (error) {
      console.error("Error al procesar la reserva y el pago online:", error);
      toast.error("Error al procesar la reserva y el pago online. Intente de nuevo.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-32"> {/* Added top padding to account for navbar */}
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Paso 1: Selección de habitación y fechas */}
        {step === 1 && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200"
               style={{ 
                 boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.1), 0 20px 40px -12px rgba(0, 0, 0, 0.15)' 
               }}>
            <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">Reservar Habitación</h1>
            
            {/* Show current search parameters if they exist */}
            <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
              <h3 className="text-xl font-semibold mb-3 text-gray-700 flex items-center">
                <span className="mr-2">🔍</span> Búsqueda Actual
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-gray-600">
                <p><span className="font-medium">Entrada:</span> {format(checkIn, "dd-MM-yyyy", { locale: es })}</p>
                <p><span className="font-medium">Salida:</span> {format(checkOut, "dd-MM-yyyy", { locale: es })}</p>
                {roomType && <p><span className="font-medium">Tipo:</span> {roomType}</p>}
              </div>
            </div>

            {/* Existing form for modifying search */}
            <div className="mb-6 p-6 bg-gray-50 rounded-xl">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Modificar Búsqueda</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Desde</label>
                  <DatePicker
                    selected={checkIn}
                    onChange={(date) => setCheckIn(date)}
                    minDate={new Date()}
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    dateFormat="dd-MM-yyyy"
                    locale={es}
                  />
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Hasta</label>
                  <DatePicker
                    selected={checkOut}
                    onChange={(date) => setCheckOut(date)}
                    minDate={new Date(new Date(checkIn).getTime() + 86400000)} 
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    dateFormat="dd-MM-yyyy"
                    locale={es}
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block mb-2 text-sm font-medium text-gray-700">Tipo de Habitación</label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Todos los tipos</option>
                  {ROOM_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSearch}
                className="mt-6 w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all duration-200 transform hover:scale-105 shadow-lg"
              >
                🔎 Buscar Disponibilidad
              </button>
            </div>

            {availabilityLoading && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Cargando habitaciones...</p>
              </div>
            )}

            {availabilityError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-600 text-center">
                  ❌ Error: {typeof availabilityError === 'string' ? availabilityError : (availabilityError.message || 'Error al buscar habitaciones')}
                </p>
              </div>
            )}

            {availability && availability.length > 0 && !availabilityLoading && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">🏨 Habitaciones Disponibles</h2>
                <div className="space-y-6">
                  {availability.map((room) => (
                    <div key={room.roomNumber} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                      <div className="flex flex-col lg:flex-row items-center">
                        <img
                          src={room.image_url && room.image_url[0] ? room.image_url[0] : 'https://via.placeholder.com/200x150'}
                          alt={`Habitación ${room.roomNumber}`}
                          className="w-full lg:w-48 h-36 object-cover rounded-xl mb-4 lg:mb-0 lg:mr-6"
                        />
                        <div className="flex-1 text-center lg:text-left">
                          <h3 className="text-xl font-bold mb-2 text-gray-800">{room.type} - Habitación {room.roomNumber}</h3>
                          <p className="text-gray-600 mb-3">{room.description}</p>
                          <p className="text-lg font-bold text-yellow-600 mb-3">
                            👥 Capacidad: {room.maxGuests} personas
                          </p>
                          <div className="text-sm text-green-600 space-y-1">
                            <p>💰 Desde: ${room.priceSingle?.toLocaleString() || 'N/A'} (1 huésped)</p>
                            <p>💰 Hasta: ${room.priceMultiple?.toLocaleString() || 'N/A'} (3+ huéspedes)</p>
                            {room.isPromo && room.promotionPrice && (
                              <p className="text-yellow-600 font-bold">
                                🎉 ¡Oferta! ${room.promotionPrice.toLocaleString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="mt-4 lg:mt-0 lg:ml-6">
                          <button
                            onClick={() => handleSelectRoom(room)}
                            className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white rounded-full font-bold transition-all duration-200 transform hover:scale-105 shadow-lg"
                          >
                            ✨ Seleccionar
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {availability && availability.length === 0 && !availabilityLoading && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
                <p className="text-yellow-700">
                  😔 No hay habitaciones disponibles para las fechas o tipo seleccionado.
                </p>
              </div>
            )}
          </div>
        )}

        {step === 2 && selectedRoom && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200"
               style={{ 
                 boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.1), 0 20px 40px -12px rgba(0, 0, 0, 0.15)' 
               }}>
            <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">👥 Selecciona la cantidad de pasajeros</h2>
            
            {/* Código promocional */}
            <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
              <label className="block text-sm font-semibold mb-2 text-gray-700">🎟️ Código Promocional (Opcional)</label>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Ingrese código promocional"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">👨‍👩‍👧‍👦 Adultos (Máx. {maxCapacity})</label>
                <select
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {[...Array(maxCapacity + 1)].map((_, index) => (
                    <option key={`adult-${index}`} value={index}>{index}</option>
                  ))}
                </select>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">👶 Niños (Máx. {maxCapacity - adults})</label>
                <select
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={(maxCapacity - adults) < 0}
                >
                  {[...Array(Math.max(0, maxCapacity - adults) + 1)].map((_, index) => (
                    <option key={`child-${index}`} value={index}>{index}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">📋 Resumen de Reserva</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-600">
                <p><span className="font-medium">🏨 Habitación:</span> {selectedRoom.type} - {selectedRoom.roomNumber}</p>
                <p><span className="font-medium">📅 Desde:</span> {format(checkIn, "dd-MM-yyyy", { locale: es })}</p>
                <p><span className="font-medium">📅 Hasta:</span> {format(checkOut, "dd-MM-yyyy", { locale: es })}</p>
                <p><span className="font-medium">🌙 Noches:</span> {differenceInDays(checkOut, checkIn)}</p>
              </div>
              <p className="text-yellow-600 text-sm mt-3 text-center">
                💡 El precio exacto se calculará en el siguiente paso
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep(1)}
                className="w-full p-4 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold transition-all duration-200"
              >
                ← Volver
              </button>
              <button
                onClick={handleContinuePassengers}
                disabled={priceLoading}
                className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {priceLoading ? '⏳ Calculando...' : 'Continuar →'}
              </button>
            </div>
          </div>
        )}

        {/* ⭐ RESTO DE LOS STEPS SIN CAMBIOS SIGNIFICATIVOS, SOLO MOSTRAR BREAKDOWN SI ESTÁ DISPONIBLE */}
        {step === 3 && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200"
               style={{ 
                 boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.1), 0 20px 40px -12px rgba(0, 0, 0, 0.15)' 
               }}>
            <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">👤 Datos del Huésped Principal</h2>
            
            {/* Price breakdown */}
            {priceBreakdown && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">💰 Detalle del Precio</h3>
                <div className="text-sm space-y-2 text-gray-600">
                  <p>🏷️ Precio base por noche: ${priceBreakdown.basePrice?.toLocaleString()}</p>
                  <p>🌙 Noches: {priceBreakdown.nights}</p>
                  <p>👥 Huéspedes: {priceBreakdown.guestCount}</p>
                  {priceBreakdown.extraGuestCharges > 0 && (
                    <p>💵 Cargo por huéspedes extra: ${priceBreakdown.extraGuestCharges?.toLocaleString()}</p>
                  )}
                  <hr className="border-green-300" />
                  <p className="font-bold text-lg text-green-700">💳 Total: ${bookingTotal.toLocaleString()}</p>
                </div>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2 text-gray-700">📄 Documento del huésped</label>
              <input
                type="text"
                value={buyerSdocnoInput}
                onChange={e => setBuyerSdocnoInput(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
                placeholder="Ingrese documento y verifique"
                disabled={buyerLoading} 
              />
              <button
                onClick={handleVerifyOrRegisterBuyer}
                className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all duration-200 disabled:opacity-50"
                disabled={buyerLoading} 
              >
                {buyerLoading ? '⏳ Verificando...' : '🔍 Verificar / Registrar Huésped'}
              </button>
              
              {buyerLoading && (
                <div className="text-center mt-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="text-yellow-600 mt-2">Buscando huésped...</p>
                </div>
              )}
              
              {currentBuyerData && !showBuyerPopup && !buyerLoading && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-green-700">✅ Huésped: {currentBuyerData.scostumername} ({currentBuyerData.sdocno})</p>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setStep(2)}
              className="w-full p-4 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold transition-all duration-200"
              disabled={buyerLoading}
            >
              ← Volver a Pasajeros
            </button>
          </div>
        )}

        {step === 4 && currentBuyerData && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200"
               style={{ 
                 boxShadow: '0 0 0 4px rgba(255, 255, 255, 0.1), 0 20px 40px -12px rgba(0, 0, 0, 0.15)' 
               }}>
            <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">💳 Resumen y Pago</h2>
            
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">📋 Detalles de la Reserva</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-600">
                <p><span className="font-medium">🏨 Habitación:</span> {selectedRoom.type} - {selectedRoom.roomNumber}</p>
                <p><span className="font-medium">📅 Fechas:</span> {format(checkIn, "dd-MM-yyyy", { locale: es })} - {format(checkOut, "dd-MM-yyyy", { locale: es })}</p>
                <p><span className="font-medium">🌙 Noches:</span> {differenceInDays(checkOut, checkIn)}</p>
                <p><span className="font-medium">👥 Huéspedes:</span> {adults} adultos, {children} niños</p>
              </div>
              <p className="mt-3"><span className="font-medium text-gray-700">👤 Huésped Principal:</span> {currentBuyerData.scostumername} ({currentBuyerData.sdocno})</p>
            </div>
          
            {/* Price breakdown detailed */}
            {priceBreakdown && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">💰 Detalle del Precio</h3>
                <div className="text-sm space-y-2 text-gray-600">
                  <p>🏷️ Precio base: ${priceBreakdown.basePrice?.toLocaleString()}</p>
                  <p>🌙 Noches: {priceBreakdown.nights}</p>
                  <p>👥 Huéspedes: {priceBreakdown.guestCount}</p>
                  {priceBreakdown.extraGuestCharges > 0 && (
                    <p>💵 Huéspedes extra: ${priceBreakdown.extraGuestCharges?.toLocaleString()}</p>
                  )}
                </div>
              </div>
            )}
            
            <div className="text-center mb-6">
              <p className="text-3xl font-bold text-green-600">💳 Total Reserva: ${bookingTotal.toLocaleString()}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2 text-gray-700">💳 Opción de Pago:</label>
              <select
                value={paymentOption}
                onChange={e => setPaymentOption(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="total">Pagar Total (${bookingTotal.toLocaleString()})</option>
                <option value="mitad">Pagar 50% (${Math.round(bookingTotal / 2).toLocaleString()})</option>
              </select>
            </div>

            <div className="text-center mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-xl font-semibold text-yellow-700">💰 Monto a Pagar Ahora: ${amountToPay.toLocaleString()}</p>
            </div>

            <WompiPayment
              booking={{ 
                bookingId: `reserva-${selectedRoom.roomNumber}-${Date.now()}`, 
                totalAmount: amountToPay, 
                currency: "COP", 
                customer_email: currentBuyerData.selectronicmail, 
              }}
              onPaymentComplete={handlePaymentSuccess}
            />

            <button
              onClick={() => setStep(3)}
              className="mt-6 w-full p-4 bg-gray-500 hover:bg-gray-600 text-white rounded-xl font-bold transition-all duration-200"
            >
              ← Volver a Datos del Huésped
            </button>
          </div>
        )}

        {/* Buyer Registration Popup */}
        <BuyerRegistrationFormPopup
          isOpen={showBuyerPopup}
          onClose={() => setShowBuyerPopup(false)}
          onBuyerRegistered={handleBuyerRegistered}
          initialSdocno={buyerSdocnoInput}
        />
      </div>
    </div>
  );
};

export default Booking;