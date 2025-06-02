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

const ROOM_TYPES = [ "Doble", "Triple", "Cuadruple", "Pareja"];

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
    <div className="container mx-auto p-4 max-w-3xl">
      {/* Paso 1: Selección de habitación y fechas */}
      {step === 1 && (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg text-white">
          <h1 className="text-2xl font-bold mb-4">Reservar Habitación</h1>
          <div className="mb-4">
            <label className="block mb-2">Desde</label>
            <DatePicker
              selected={checkIn}
              onChange={(date) => setCheckIn(date)}
              minDate={new Date()}
              className="w-full p-2 rounded-lg bg-gray-700 text-white"
              dateFormat="dd-MM-yyyy"
              locale={es}
            />
            <label className="block mt-4 mb-2">Hasta</label>
            <DatePicker
              selected={checkOut}
              onChange={(date) => setCheckOut(date)}
              minDate={new Date(new Date(checkIn).getTime() + 86400000)} 
              className="w-full p-2 rounded-lg bg-gray-700 text-white"
              dateFormat="dd-MM-yyyy"
              locale={es}
            />
            <label className="block mt-4 mb-2">Tipo de Habitación</label>
            <select
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="w-full p-2 rounded-lg bg-gray-700 text-white"
            >
              <option value="">Todos los tipos</option>
              {ROOM_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <button
              onClick={handleSearch}
              className="mt-4 w-full p-3 bg-stone-500 hover:bg-stone-600 rounded-full font-bold"
            >
              Buscar Disponibilidad
            </button>
          </div>
          {availabilityLoading && <p className="text-center">Cargando habitaciones...</p>}
          {availabilityError && <p className="text-center text-red-400">Error: {typeof availabilityError === 'string' ? availabilityError : (availabilityError.message || 'Error al buscar habitaciones')}</p>}
          {availability && availability.length > 0 && !availabilityLoading && (
            <div>
              <h2 className="text-xl font-bold mb-4">Habitaciones Disponibles</h2>
              <div className="space-y-6">
                {availability.map((room) => (
                  <div key={room.roomNumber} className="bg-gray-700 p-4 rounded-lg flex flex-col md:flex-row items-center">
                    <img
                      src={room.image_url && room.image_url[0] ? room.image_url[0] : 'https://via.placeholder.com/100'}
                      alt={`Habitación ${room.roomNumber}`}
                      className="w-full md:w-32 h-32 object-cover rounded-lg mb-4 md:mb-0 md:mr-6"
                    />
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-2">{room.type} - Habitación {room.roomNumber}</h3>
                      <p className="text-gray-300 mb-2">{room.description}</p>
                      <p className="text-xl font-bold text-yellow-400">Capacidad: {room.maxGuests} personas</p>
                      {/* ⭐ MOSTRAR RANGO DE PRECIOS */}
                      <div className="text-sm text-green-400 mt-2">
                        <p>Desde: ${room.priceSingle?.toLocaleString() || 'N/A'} (1 huésped)</p>
                        <p>Hasta: ${room.priceMultiple?.toLocaleString() || 'N/A'} (3+ huéspedes)</p>
                        {room.isPromo && room.promotionPrice && (
                          <p className="text-yellow-300 font-bold">
                            ¡Oferta! ${room.promotionPrice.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 md:mt-0 md:ml-6">
                      <button
                        onClick={() => handleSelectRoom(room)}
                        className="w-full p-2 bg-stone-500 hover:bg-stone-600 rounded-full font-bold"
                      >
                        Seleccionar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {availability && availability.length === 0 && !availabilityLoading && (
            <p className="text-center text-yellow-400 mt-4">No hay habitaciones disponibles para las fechas o tipo seleccionado.</p>
          )}
        </div>
      )}

      {step === 2 && selectedRoom && (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg text-white">
          <h2 className="text-xl font-bold mb-4">Selecciona la cantidad de pasajeros</h2>
          
          {/* ⭐ CAMPO DE CÓDIGO PROMOCIONAL */}
          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Código Promocional (Opcional)</label>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              className="w-full p-2 rounded-lg bg-gray-700 text-white border border-gray-600"
              placeholder="Ingrese código promocional"
            />
          </div>

          <div className="flex space-x-4 mb-4">
            <div>
              <label className="block text-sm">Adultos (Máx. {maxCapacity})</label>
              <select
                value={adults}
                onChange={(e) => setAdults(Number(e.target.value))}
                className="w-full p-2 rounded-lg bg-gray-700 text-white"
              >
                {[...Array(maxCapacity + 1)].map((_, index) => (
                  <option key={`adult-${index}`} value={index}>{index}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm">Niños (Máx. {maxCapacity - adults})</label>
              <select
                value={children}
                onChange={(e) => setChildren(Number(e.target.value))}
                className="w-full p-2 rounded-lg bg-gray-700 text-white"
                disabled={(maxCapacity - adults) < 0}
              >
                {[...Array(Math.max(0, maxCapacity - adults) + 1)].map((_, index) => (
                  <option key={`child-${index}`} value={index}>{index}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <p>Habitación: <b>{selectedRoom.type} - {selectedRoom.roomNumber}</b></p>
            <p>Desde: <b>{format(checkIn, "dd-MM-yyyy", { locale: es })}</b></p>
            <p>Hasta: <b>{format(checkOut, "dd-MM-yyyy", { locale: es })}</b></p>
            <p>Noches: <b>{differenceInDays(checkOut, checkIn)}</b></p>
            <p className="text-yellow-300">
              <small>El precio exacto se calculará en el siguiente paso</small>
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep(1)}
              className="w-full p-2 bg-gray-500 hover:bg-gray-600 rounded-full font-bold"
            >
              Volver
            </button>
            <button
              onClick={handleContinuePassengers}
              disabled={priceLoading}
              className="w-full p-2 bg-stone-500 hover:bg-stone-600 rounded-full font-bold disabled:opacity-50"
            >
              {priceLoading ? 'Calculando...' : 'Continuar'}
            </button>
          </div>
        </div>
      )}

      {/* ⭐ RESTO DE LOS STEPS SIN CAMBIOS SIGNIFICATIVOS, SOLO MOSTRAR BREAKDOWN SI ESTÁ DISPONIBLE */}
      {step === 3 && (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg text-white">
          <h2 className="text-xl font-bold mb-4">Datos del Huésped Principal</h2>
          
          {/* ⭐ MOSTRAR BREAKDOWN DE PRECIO */}
          {priceBreakdown && (
            <div className="bg-gray-700 p-4 rounded-lg mb-4">
              <h3 className="text-lg font-semibold mb-2">Detalle del Precio</h3>
              <div className="text-sm space-y-1">
                <p>Precio base por noche: ${priceBreakdown.basePrice?.toLocaleString()}</p>
                <p>Noches: {priceBreakdown.nights}</p>
                <p>Huéspedes: {priceBreakdown.guestCount}</p>
                {priceBreakdown.extraGuestCharges > 0 && (
                  <p>Cargo por huéspedes extra: ${priceBreakdown.extraGuestCharges?.toLocaleString()}</p>
                )}
                <hr className="border-gray-600" />
                <p className="font-bold text-lg">Total: ${bookingTotal.toLocaleString()}</p>
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-semibold mb-1">Documento del huésped</label>
            <input
              type="text"
              value={buyerSdocnoInput}
              onChange={e => setBuyerSdocnoInput(e.target.value)}
              className="w-full p-2 rounded-lg bg-gray-700 text-white border border-gray-600"
              placeholder="Ingrese documento y verifique"
              disabled={buyerLoading} 
            />
            <button
              onClick={handleVerifyOrRegisterBuyer}
              className="mt-4 w-full p-3 bg-stone-500 hover:bg-stone-600 rounded-full font-bold"
              disabled={buyerLoading} 
            >
              {buyerLoading ? 'Verificando...' : 'Verificar / Registrar Huésped'}
            </button>
            {buyerLoading && <p className="text-yellow-400 mt-2 text-center">Buscando huésped...</p>}
            {currentBuyerData && !showBuyerPopup && !buyerLoading && (
              <p className="text-green-400 mt-2">Huésped: {currentBuyerData.scostumername} ({currentBuyerData.sdocno})</p>
            )}
          </div>
          <button
            onClick={() => setStep(2)}
            className="w-full p-2 bg-gray-500 hover:bg-gray-600 rounded-full font-bold mt-4"
            disabled={buyerLoading}
          >
            Volver a Pasajeros
          </button>
        </div>
      )}

      {/* ⭐ RESTO DEL COMPONENTE PERMANECE IGUAL */}
      <BuyerRegistrationFormPopup
        isOpen={showBuyerPopup}
        onClose={() => setShowBuyerPopup(false)}
        onBuyerRegistered={handleBuyerRegistered}
        initialSdocno={buyerSdocnoInput}
      />

      {step === 4 && currentBuyerData && (
        <div className="bg-gray-800 p-6 rounded-xl shadow-lg text-white">
          <h2 className="text-xl font-bold mb-4">Resumen y Pago</h2>
          <p>Habitación: <b>{selectedRoom.type} - {selectedRoom.roomNumber}</b></p>
          <p>Desde: <b>{format(checkIn, "dd-MM-yyyy", { locale: es })}</b> Hasta: <b>{format(checkOut, "dd-MM-yyyy", { locale: es })}</b> ({differenceInDays(checkOut, checkIn)} noches)</p>
          <p>Adultos: <b>{adults}</b> | Niños: <b>{children}</b> (Total: {adults+children} huéspedes)</p>
          <p>Huésped Principal: <b>{currentBuyerData.scostumername} ({currentBuyerData.sdocno})</b></p>
          
          {/* ⭐ MOSTRAR BREAKDOWN DETALLADO */}
          {priceBreakdown && (
            <div className="bg-gray-700 p-4 rounded-lg my-4">
              <h3 className="text-lg font-semibold mb-2">Detalle del Precio</h3>
              <div className="text-sm space-y-1">
                <p>Precio base: ${priceBreakdown.basePrice?.toLocaleString()}</p>
                <p>Noches: {priceBreakdown.nights}</p>
                <p>Huéspedes: {priceBreakdown.guestCount}</p>
                {priceBreakdown.extraGuestCharges > 0 && (
                  <p>Huéspedes extra: ${priceBreakdown.extraGuestCharges?.toLocaleString()}</p>
                )}
              </div>
            </div>
          )}
          
          <p className="text-2xl font-bold text-yellow-400">Total Reserva: <b>${bookingTotal.toLocaleString()}</b></p>
          <div className="my-4">
            <label className="block text-sm font-semibold mb-1">Opción de Pago:</label>
            <select
              value={paymentOption}
              onChange={e => setPaymentOption(e.target.value)}
              className="w-full p-2 rounded-lg bg-gray-700 text-white border border-gray-600"
            >
              <option value="total">Pagar Total (${bookingTotal.toLocaleString()})</option>
              <option value="mitad">Pagar 50% (${Math.round(bookingTotal / 2).toLocaleString()})</option>
            </select>
          </div>
          <p className="text-xl font-semibold mb-4">Monto a Pagar Ahora: ${amountToPay.toLocaleString()}</p>
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
            className="mt-4 w-full p-2 bg-gray-500 hover:bg-gray-600 rounded-full font-bold"
          >
            Volver a Datos del Huésped
          </button>
        </div>
      )}
    </div>
  );
};

export default Booking;