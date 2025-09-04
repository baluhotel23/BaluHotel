import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  checkAvailability,
  createBooking,
  updateOnlinePayment,
} from "../../Redux/Actions/bookingActions";
import { calculateRoomPrice } from "../../Redux/Actions/roomActions";
import {
  fetchBuyerByDocument,
  createBuyer,
  fetchCountries,
  fetchDepartments,
  fetchMunicipalities,
  validateLocation
} from "../../Redux/Actions/taxxaActions";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "react-toastify";
import WompiPayment from "../WompiPayment";
import { useNavigate } from "react-router-dom";
import { canBookToday } from '../../utils/canBookToday';
const ROOM_TYPES = ["Pareja/Sencilla", "Doble", "Triple", "Múltiple"];



// ⭐ COMPONENTE MODAL REUTILIZABLE
const Modal = ({ children, isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-2xl shadow-xl max-w-2xl max-h-[90vh] overflow-y-auto w-full mx-4">
        {children}
        <button
          onClick={onClose}
          className="mt-6 px-6 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors float-right"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
};

// ⭐ COMPONENTE DE REGISTRO DE BUYER OPTIMIZADO
const BuyerRegistrationForm = ({ isOpen, onClose, onBuyerRegistered, initialSdocno }) => {
  const dispatch = useDispatch();
  const { countries, departmentsCache, municipalitiesCache, loadingDepartments } = useSelector(state => state.taxxa);

  const [formData, setFormData] = useState({
    sdocno: initialSdocno || "",
    wlegalorganizationtype: "person",
    scostumername: "",
    stributaryidentificationkey: "ZZ",
    sfiscalresponsibilities: "R-99-PN",
    sfiscalregime: "49",
    wdoctype: "CC",
    scorporateregistrationschemename: "",
    scontactperson: "",
    selectronicmail: "",
    stelephone: "",
    saddressline1: "",
    scityname: "",
    wdepartmentcode: "",
    wtowncode: "",
  });

  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [municipalitiesList, setMunicipalitiesList] = useState([]);
  const [loadingMunicipalities, setLoadingMunicipalities] = useState(false);

  // ⭐ EFECTOS OPTIMIZADOS
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchCountries());
      dispatch(fetchDepartments('CO'));
      if (initialSdocno) {
        setFormData(prev => ({ ...prev, sdocno: initialSdocno }));
      }
    }
  }, [isOpen, initialSdocno, dispatch]);

  useEffect(() => {
    if (selectedDepartment) {
      setLoadingMunicipalities(true);
      dispatch(fetchMunicipalities(selectedDepartment))
        .then(() => {
          const cacheKey = `municipalities_${selectedDepartment}__50`;
          const municipalities = municipalitiesCache[cacheKey] || [];
          setMunicipalitiesList(municipalities);
        })
        .finally(() => setLoadingMunicipalities(false));
    }
  }, [selectedDepartment, dispatch, municipalitiesCache]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDepartmentChange = (e) => {
    const departmentCode = e.target.value;
    setSelectedDepartment(departmentCode);
    setSelectedMunicipality('');
    setFormData(prev => ({
      ...prev,
      wdepartmentcode: departmentCode,
      wtowncode: '',
      scityname: ''
    }));
  };

  const handleMunicipalityChange = (e) => {
    const municipalityCode = e.target.value;
    setSelectedMunicipality(municipalityCode);
    
    const selectedMunicipalityData = municipalitiesList.find(
      muni => muni.code === municipalityCode || muni.wtowncode === municipalityCode
    );
    
    setFormData(prev => ({
      ...prev,
      wtowncode: municipalityCode,
      scityname: selectedMunicipalityData?.name || ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ⭐ VALIDACIÓN SIMPLIFICADA
    const requiredFields = ['sdocno', 'scostumername', 'selectronicmail', 'stelephone'];
    const missingFields = requiredFields.filter(field => !formData[field]?.trim());
    
    if (missingFields.length > 0) {
      toast.error('Por favor, complete todos los campos obligatorios');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.selectronicmail)) {
      toast.error('Por favor, ingrese un email válido');
      return;
    }

    try {
      const result = await dispatch(createBuyer(formData));
      
      if (result?.success) {
        toast.success('¡Huésped registrado exitosamente!');
        onBuyerRegistered(result.data);
        onClose();
        
        // Reset form
        setFormData({
          sdocno: "",
          wlegalorganizationtype: "person",
          scostumername: "",
          stributaryidentificationkey: "ZZ",
          sfiscalresponsibilities: "R-99-PN",
          sfiscalregime: "49",
          wdoctype: "CC",
          scorporateregistrationschemename: "",
          scontactperson: "",
          selectronicmail: "",
          stelephone: "",
          saddressline1: "",
          scityname: "",
          wdepartmentcode: "",
          wtowncode: "",
        });
      } else {
        toast.error(result?.message || 'Error al registrar el huésped');
      }
    } catch (error) {
      console.error('Error registering buyer:', error);
      toast.error('Error al registrar el huésped');
    }
  };

  const inputClass = "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
  const labelClass = "block text-sm font-medium text-gray-700 mb-2";

  const departmentsList = departmentsCache[`departments_CO`] || [];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h4 className="text-2xl font-bold mb-6 text-gray-800">
        📝 Registrar Nuevo Huésped
      </h4>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ⭐ CAMPOS PRINCIPALES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Documento *</label>
            <input
              type="text"
              name="sdocno"
              value={formData.sdocno}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          
          <div>
            <label className={labelClass}>Tipo Documento *</label>
            <select
              name="wdoctype"
              value={formData.wdoctype}
              onChange={handleChange}
              required
              className={inputClass}
            >
              <option value="CC">CC - Cédula de Ciudadanía</option>
              <option value="CE">CE - Cédula de Extranjería</option>
              <option value="PAS">PAS - Pasaporte</option>
              <option value="NIT">NIT</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Nombre Completo *</label>
          <input
            type="text"
            name="scostumername"
            value={formData.scostumername}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Email *</label>
            <input
              type="email"
              name="selectronicmail"
              value={formData.selectronicmail}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
          
          <div>
            <label className={labelClass}>Teléfono *</label>
            <input
              type="text"
              name="stelephone"
              value={formData.stelephone}
              onChange={handleChange}
              required
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Nombre Comercial</label>
          <input
            type="text"
            name="scorporateregistrationschemename"
            value={formData.scorporateregistrationschemename}
            onChange={handleChange}
            className={inputClass}
            placeholder="Registro Mercantil (opcional)"
          />
        </div>

        <div>
          <label className={labelClass}>Persona de Contacto</label>
          <input
            type="text"
            name="scontactperson"
            value={formData.scontactperson}
            onChange={handleChange}
            className={inputClass}
          />
        </div>

        {/* ⭐ SECCIÓN DE UBICACIÓN OPCIONAL */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <h5 className="font-semibold text-gray-700 mb-3">📍 Ubicación (Opcional)</h5>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Departamento:</label>
              <select
                value={selectedDepartment}
                onChange={handleDepartmentChange}
                disabled={loadingDepartments}
                className={inputClass}
              >
                <option value="">Seleccionar...</option>
                {departmentsList.map(dept => (
                  <option key={dept.code} value={dept.code}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Ciudad/Municipio:</label>
              <select
                value={selectedMunicipality}
                onChange={handleMunicipalityChange}
                disabled={loadingMunicipalities || !selectedDepartment}
                className={inputClass}
              >
                <option value="">
                  {!selectedDepartment ? "Seleccione departamento..." : "Seleccionar ciudad..."}
                </option>
                {municipalitiesList.map(muni => (
                  <option key={muni.code || muni.wtowncode} value={muni.code || muni.wtowncode}>
                    {muni.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Dirección:</label>
            <input
              type="text"
              name="saddressline1"
              value={formData.saddressline1}
              onChange={handleChange}
              className={inputClass}
              placeholder="Dirección completa"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg font-bold transition-all duration-200 transform hover:scale-105"
        >
          ✅ Registrar Huésped
        </button>
      </form>
    </Modal>
  );
};
function isTodayAfterLimit() {
  return !canBookToday();
}
// ⭐ COMPONENTE PRINCIPAL OPTIMIZADO
const Booking = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ⭐ SELECTORES REDUX OPTIMIZADOS
  const { 
    availability = [], 
    availabilitySummary = { total: 0, available: 0 }, 
    loading = {}, 
    errors = {} 
  } = useSelector(state => state.booking);

  const { 
    buyer: buyerFromRedux, 
    loading: buyerLoading, 
    error: buyerError 
  } = useSelector(state => state.taxxa);

  // ⭐ ESTADOS PRINCIPALES
  const [step, setStep] = useState(1);
  const [checkIn, setCheckIn] = useState(new Date());
  const [checkOut, setCheckOut] = useState(new Date());
  const [roomType, setRoomType] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [maxCapacity, setMaxCapacity] = useState(2);
  const [bookingTotal, setBookingTotal] = useState(0);
  const [buyerSdocnoInput, setBuyerSdocnoInput] = useState("");
  const [showBuyerPopup, setShowBuyerPopup] = useState(false);
  const [currentBuyerData, setCurrentBuyerData] = useState(null);
  const [paymentOption, setPaymentOption] = useState("total");
  const [lastSearchedSdocno, setLastSearchedSdocno] = useState("");
  const [priceBreakdown, setPriceBreakdown] = useState(null);
  const [priceLoading, setPriceLoading] = useState(false);

  // ⭐ COMPUTED VALUES
  const isLoadingAvailability = loading.availability;
  const availabilityError = errors.availability;
  const totalGuests = adults + children;
  const nights = differenceInDays(checkOut, checkIn);
  const amountToPay = paymentOption === "mitad" ? Math.round(bookingTotal / 2) : bookingTotal;

  // ⭐ EFECTOS PRINCIPALES
  useEffect(() => {
    console.log("🚀 [BOOKING] Component mounted");
    
    const storedParams = localStorage.getItem("bookingSearchParams");
    if (storedParams) {
      try {
        const params = JSON.parse(storedParams);
        setCheckIn(new Date(params.checkIn));
        setCheckOut(new Date(params.checkOut));
        setRoomType(params.roomType || "");
        setAdults(params.guests || 1);
        setTimeout(() => handleSearch(params), 500);
        localStorage.removeItem("bookingSearchParams");
      } catch (error) {
        console.error("Error parsing stored params:", error);
        localStorage.removeItem("bookingSearchParams");
      }
    } else {
      setTimeout(() => handleSearch(), 500);
    }
  }, []);

  // ⭐ EFECTO PARA MANEJO DE BUYER
  useEffect(() => {
    if (step === 3 && lastSearchedSdocno && !buyerLoading) {
      if (buyerFromRedux && buyerFromRedux.sdocno === lastSearchedSdocno) {
        toast.success(`Huésped ${buyerFromRedux.scostumername || buyerFromRedux.sdocno} encontrado.`);
        setCurrentBuyerData(buyerFromRedux);
        setShowBuyerPopup(false);
        setStep(4);
      } else {
        if (buyerError) {
          toast.error(`Huésped no encontrado: ${buyerError}`);
        } else {
          toast.info(`Huésped con documento ${lastSearchedSdocno} no encontrado. Por favor, regístrelo.`);
        }
        setCurrentBuyerData(null);
        setShowBuyerPopup(true);
      }
    }
  }, [buyerFromRedux, buyerLoading, buyerError, lastSearchedSdocno, step]);

  // ⭐ FUNCIONES PRINCIPALES
  const handleSearch = (customParams = null) => {
  const searchParams = customParams || { checkIn, checkOut, roomType };

  const formattedParams = {
    checkIn: searchParams.checkIn ? format(new Date(searchParams.checkIn), "yyyy-MM-dd") : undefined,
    checkOut: searchParams.checkOut ? format(new Date(searchParams.checkOut), "yyyy-MM-dd") : undefined,
    roomType: searchParams.roomType || undefined,
  };

  const cleanParams = Object.fromEntries(
    Object.entries(formattedParams).filter(([_, value]) => value !== undefined && value !== "")
  );

  // LOG de parámetros enviados
  console.log("[Booking.jsx][checkAvailability] Params enviados:", cleanParams);

  dispatch(checkAvailability(cleanParams)).then((res) => {
    // LOG de respuesta del backend
    console.log("[Booking.jsx][checkAvailability] Respuesta backend:", res);
  });
};

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
    setMaxCapacity(room.maxGuests || 2);
    setAdults(1);
    setChildren(0);
    setStep(2);
  };

  const handleContinuePassengers = async () => {
    if (totalGuests === 0) {
      toast.warning("Debe seleccionar al menos un huésped.");
      return;
    }
    if (totalGuests > maxCapacity) {
      toast.warning(`Máximo ${maxCapacity} huéspedes para esta habitación.`);
      return;
    }
    if (nights < 1) {
      toast.warning("La fecha de salida debe ser posterior a la fecha de entrada.");
      return;
    }

    setPriceLoading(true);

    try {
      // ⭐ CÁLCULO DE PRECIO SIMPLIFICADO
      const basePrice = totalGuests === 1 
        ? parseFloat(selectedRoom.priceSingle)
        : totalGuests === 2 
        ? parseFloat(selectedRoom.priceDouble)
        : parseFloat(selectedRoom.priceMultiple);

      const extraCharges = totalGuests > 3 
        ? (totalGuests - 3) * parseFloat(selectedRoom.pricePerExtraGuest || 0) 
        : 0;

      const finalPrice = selectedRoom.isPromo && selectedRoom.promotionPrice
        ? parseFloat(selectedRoom.promotionPrice)
        : basePrice + extraCharges;

      const totalAmount = finalPrice * nights;

      const breakdown = {
        basePrice: finalPrice,
        nights,
        guestCount: totalGuests,
        extraGuestCharges: extraCharges,
        isPromotion: selectedRoom.isPromo && selectedRoom.promotionPrice,
      };

      setBookingTotal(totalAmount);
      setPriceBreakdown(breakdown);

      if (breakdown.isPromotion) {
        toast.success(`¡Precio promocional aplicado! $${finalPrice.toLocaleString()} por noche`);
      }

      setStep(3);
    } catch (error) {
      console.error("Error calculating price:", error);
      toast.error("Error al calcular el precio. Intente nuevamente.");
    } finally {
      setPriceLoading(false);
    }
  };

  const handleVerifyOrRegisterBuyer = async () => {
    const sdocnoToSearch = buyerSdocnoInput.trim();
    if (!sdocnoToSearch) {
      toast.error("Por favor, ingrese un número de documento.");
      return;
    }

    if (buyerFromRedux && buyerFromRedux.sdocno === sdocnoToSearch) {
      toast.success(`Huésped ${buyerFromRedux.scostumername || buyerFromRedux.sdocno} encontrado.`);
      setCurrentBuyerData(buyerFromRedux);
      setShowBuyerPopup(false);
      setLastSearchedSdocno(sdocnoToSearch);
      setStep(4);
      return;
    }

    setLastSearchedSdocno(sdocnoToSearch);
    setCurrentBuyerData(null);
    setShowBuyerPopup(false);
    dispatch(fetchBuyerByDocument(sdocnoToSearch));
  };

  const handleBuyerRegistered = (registeredBuyer) => {
    setCurrentBuyerData(registeredBuyer);
    setShowBuyerPopup(false);
    setStep(4);
  };

  // ⭐ FUNCIÓN DE PAGO ACTUALIZADA PARA NUEVOS ESTADOS
  const handlePaymentSuccess = async (transaction) => {
    if (!currentBuyerData || !selectedRoom) {
      toast.error("Faltan datos para crear la reserva.");
      return;
    }

    const today = new Date();
  if (
    checkIn.toDateString() === today.toDateString() &&
    !canBookToday()
  ) {
    toast.error("No se pueden realizar reservas para hoy después de las 15:30 (hora Colombia).");
    return;
  }

    const bookingData = {
    checkIn: format(checkIn, "yyyy-MM-dd"),
    checkOut: format(checkOut, "yyyy-MM-dd"),
    pointOfSale: "Online",
    status: "pending",
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
    if (!createResponse?.success) {
      toast.error("Error al crear la reserva: " + (createResponse?.message || "Error desconocido"));
      return;
    }
      const bookingId = createResponse.data.booking.bookingId;

      // ⭐ ACTUALIZAR PAGO ONLINE - ESTO AHORA CAMBIARÁ EL STATUS A 'paid' O 'confirmed'
      const paymentPayload = {
        bookingId,
        amount: amountToPay,
        transactionId: transaction.id,
        paymentReference: transaction.reference,
        paymentMethod: transaction.payment_method_type || "credit_card",
        paymentStatus: "completed", // ⭐ IMPORTANTE: Marcar como completado
        wompiTransactionId: transaction.id,
        wompiStatus: transaction.status
      };

      await dispatch(updateOnlinePayment(paymentPayload));

      // ⭐ PREPARAR DATOS PARA PÁGINA DE AGRADECIMIENTO
      const reservationData = {
        bookingId,
        bookingDetails: {
          ...bookingData,
          roomType: selectedRoom.type,
          roomDescription: selectedRoom.description,
          checkInFormatted: format(checkIn, "dd/MM/yyyy", { locale: es }),
          checkOutFormatted: format(checkOut, "dd/MM/yyyy", { locale: es }),
        },
        paymentDetails: {
          amountPaid: amountToPay,
          totalAmount: bookingTotal,
          paymentOption,
          transactionId: transaction.id,
          paymentReference: transaction.reference,
          paymentMethod: transaction.payment_method_type || "credit_card",
          remainingAmount: paymentOption === "mitad" ? bookingTotal - amountToPay : 0,
          // ⭐ NUEVOS CAMPOS PARA INDICAR ESTADO
          isPaidInFull: paymentOption === "total",
          isReadyForCheckIn: paymentOption === "total", // Si pagó completo, está listo para check-in físico
        },
        guestInfo: currentBuyerData,
        priceBreakdown,
      };

      localStorage.setItem('reservationData', JSON.stringify(reservationData));
      toast.success("¡Reserva confirmada exitosamente!");
      navigate('/thankyou');

    } catch (error) {
      console.error("Error processing booking:", error);
      toast.error("Error al procesar la reserva. Intente de nuevo.");
    }
  };

  // ⭐ RENDERIZADO OPTIMIZADO
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pt-32">
      <div className="container mx-auto p-4 max-w-4xl">
        
        {/* ⭐ PASO 1: BÚSQUEDA */}
        {step === 1 && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
            <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">
              🏨 Reservar Habitación
            </h1>

            {/* Parámetros actuales */}
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

            {/* Formulario de búsqueda */}
            <div className="mb-6 p-6 bg-gray-50 rounded-xl">
              <h3 className="text-lg font-semibold mb-4 text-gray-700">Buscar Habitaciones</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Fecha de Entrada</label>
                  <DatePicker
  selected={checkIn}
  onChange={setCheckIn}
  minDate={new Date()}
  filterDate={date => {
    const today = new Date();
    // Si es hoy y ya pasó la hora límite, no permitir seleccionar hoy
    if (
      date.toDateString() === today.toDateString() &&
      isTodayAfterLimit()
    ) {
      return false;
    }
    return true;
  }}
  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
  dateFormat="dd-MM-yyyy"
  locale={es}
/>
                </div>
                <div>
                  <label className="block mb-2 text-sm font-medium text-gray-700">Fecha de Salida</label>
                  <DatePicker
                    selected={checkOut}
                    onChange={setCheckOut}
                    minDate={new Date(checkIn.getTime() + 86400000)}
                    className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
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
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Todos los tipos</option>
                  {ROOM_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => handleSearch()}
                disabled={isLoadingAvailability}
                className="mt-6 w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all duration-200 disabled:opacity-50"
              >
                {isLoadingAvailability ? "⏳ Buscando..." : "🔎 Buscar Disponibilidad"}
              </button>
            </div>

            {/* Estados de carga y error */}
            {isLoadingAvailability && (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-gray-600">Buscando habitaciones disponibles...</p>
              </div>
            )}

            {availabilityError && !isLoadingAvailability && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-red-600 text-center">❌ Error: {availabilityError}</p>
                <button
                  onClick={() => handleSearch()}
                  className="mt-2 w-full p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
                >
                  🔄 Reintentar
                </button>
              </div>
            )}

            {/* Lista de habitaciones */}
            {availability?.length > 0 && !isLoadingAvailability && (
              <div>
                <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
                  🏨 Habitaciones Disponibles ({availability.filter(r => r.isAvailable).length})
                </h2>
                <div className="space-y-6">
                  {availability
                    .filter(room => room.isAvailable)
                    .map(room => (
                      <div key={room.roomNumber} className="bg-white border border-gray-200 p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex flex-col lg:flex-row items-center">
                          <img
                            src={room.image_url?.[0] || "https://via.placeholder.com/200x150"}
                            alt={`Habitación ${room.roomNumber}`}
                            className="w-full lg:w-48 h-36 object-cover rounded-xl mb-4 lg:mb-0 lg:mr-6"
                          />
                          <div className="flex-1 text-center lg:text-left">
                            <h3 className="text-xl font-bold mb-2 text-gray-800">
                              {room.type} - Habitación {room.roomNumber}
                            </h3>
                            <p className="text-gray-600 mb-3">{room.description}</p>
                            <p className="text-lg font-bold text-yellow-600 mb-3">
                              👥 Capacidad: {room.maxGuests} personas
                            </p>
                            <div className="text-sm text-green-600 space-y-1">
                              <p>💰 Desde: ${parseFloat(room.priceSingle || 0).toLocaleString()} (1 huésped)</p>
                              <p>💰 Hasta: ${parseFloat(room.priceMultiple || 0).toLocaleString()} (3+ huéspedes)</p>
                              {room.isPromo && room.promotionPrice && (
                                <p className="text-yellow-600 font-bold">
                                  🎉 ¡Oferta! ${parseFloat(room.promotionPrice).toLocaleString()}
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
          </div>
        )}

        {/* ⭐ PASO 2: SELECCIÓN DE PASAJEROS */}
        {step === 2 && selectedRoom && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
              👥 Selecciona la cantidad de pasajeros
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👨‍👩‍👧‍👦 Adultos (Máx. {maxCapacity})
                </label>
                <select
                  value={adults}
                  onChange={(e) => setAdults(Number(e.target.value))}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                >
                  {[...Array(maxCapacity + 1)].map((_, index) => (
                    <option key={index} value={index}>{index}</option>
                  ))}
                </select>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👶 Niños (Máx. {Math.max(0, maxCapacity - adults)})
                </label>
                <select
                  value={children}
                  onChange={(e) => setChildren(Number(e.target.value))}
                  className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
                >
                  {[...Array(Math.max(0, maxCapacity - adults) + 1)].map((_, index) => (
                    <option key={index} value={index}>{index}</option>
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
                <p><span className="font-medium">🌙 Noches:</span> {nights}</p>
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
                className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all duration-200 disabled:opacity-50"
              >
                {priceLoading ? "⏳ Calculando..." : "Continuar →"}
              </button>
            </div>
          </div>
        )}

        {/* ⭐ PASO 3: DATOS DEL HUÉSPED */}
        {step === 3 && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">
              👤 Datos del Huésped Principal
            </h2>

            {/* Desglose de precio */}
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
                onChange={(e) => setBuyerSdocnoInput(e.target.value)}
                className="w-full p-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 mb-4"
                placeholder="Ingrese documento y verifique"
                disabled={buyerLoading}
              />
              <button
                onClick={handleVerifyOrRegisterBuyer}
                className="w-full p-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold transition-all duration-200 disabled:opacity-50"
                disabled={buyerLoading}
              >
                {buyerLoading ? "⏳ Verificando..." : "🔍 Verificar"}
              </button>

              {buyerLoading && (
                <div className="text-center mt-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <p className="text-yellow-600 mt-2">Buscando huésped...</p>
                </div>
              )}

              {currentBuyerData && !showBuyerPopup && !buyerLoading && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-green-700">
                    ✅ Huésped: {currentBuyerData.scostumername} ({currentBuyerData.sdocno})
                  </p>
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

        {/* ⭐ PASO 4: RESUMEN Y PAGO */}
        {step === 4 && currentBuyerData && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">💳 Resumen y Pago</h2>

            {/* Detalles de la reserva */}
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 mb-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">📋 Detalles de la Reserva</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-gray-600">
                <p><span className="font-medium">🏨 Habitación:</span> {selectedRoom.type} - {selectedRoom.roomNumber}</p>
                <p><span className="font-medium">📅 Fechas:</span> {format(checkIn, "dd-MM-yyyy", { locale: es })} - {format(checkOut, "dd-MM-yyyy", { locale: es })}</p>
                <p><span className="font-medium">🌙 Noches:</span> {nights}</p>
                <p><span className="font-medium">👥 Huéspedes:</span> {adults} adultos, {children} niños</p>
              </div>
              <p className="mt-3">
                <span className="font-medium text-gray-700">👤 Huésped Principal:</span> {currentBuyerData.scostumername} ({currentBuyerData.sdocno})
              </p>
            </div>

            {/* Desglose de precio */}
            {priceBreakdown && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">💰 Detalle del Precio</h3>
                <div className="text-sm space-y-2 text-gray-600">
                  <div className="flex justify-between">
                    <span>🏷️ Precio base por noche:</span>
                    <span>${priceBreakdown.basePrice?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>🌙 Noches:</span>
                    <span>{priceBreakdown.nights}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>👥 Huéspedes:</span>
                    <span>{priceBreakdown.guestCount}</span>
                  </div>
                  {priceBreakdown.extraGuestCharges > 0 && (
                    <div className="flex justify-between">
                      <span>💵 Huéspedes extra:</span>
                      <span>${priceBreakdown.extraGuestCharges?.toLocaleString()}</span>
                    </div>
                  )}
                  <hr className="border-green-300" />
                  <div className="flex justify-between font-bold text-lg text-green-700">
                    <span>💳 Total Reserva:</span>
                    <span>${bookingTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Opciones de pago */}
            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2 text-gray-700">💳 Opción de Pago:</label>
              <div className="space-y-3">
                <div
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    paymentOption === "total" ? "border-green-500 bg-green-50" : "border-gray-300 bg-white hover:border-gray-400"
                  }`}
                  onClick={() => setPaymentOption("total")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="paymentOption"
                        value="total"
                        checked={paymentOption === "total"}
                        onChange={(e) => setPaymentOption(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium text-gray-800">💳 Pago Total (100%)</p>
                        <p className="text-sm text-gray-600">Pague el monto completo ahora</p>
                        <p className="text-xs text-green-600 mt-1">✅ Reserva lista para check-in físico</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${bookingTotal.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Total</p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                    paymentOption === "mitad" ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white hover:border-gray-400"
                  }`}
                  onClick={() => setPaymentOption("mitad")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        name="paymentOption"
                        value="mitad"
                        checked={paymentOption === "mitad"}
                        onChange={(e) => setPaymentOption(e.target.value)}
                        className="mr-3"
                      />
                      <div>
                        <p className="font-medium text-gray-800">💰 Pago Parcial (50%)</p>
                        <p className="text-sm text-gray-600">Pague la mitad ahora, resto al check-in</p>
                        <p className="text-xs text-blue-600 mt-1">📋 Reserva confirmada, pago pendiente</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">${Math.round(bookingTotal / 2).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Ahora</p>
                      <p className="text-xs text-gray-400">Resta: ${(bookingTotal - Math.round(bookingTotal / 2)).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Monto a pagar */}
            <div className="text-center mb-6 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl">
              <p className="text-lg text-gray-600 mb-2">Monto a pagar ahora:</p>
              <p className="text-4xl font-bold text-orange-600">${amountToPay.toLocaleString()}</p>
              {paymentOption === "mitad" && (
                <div className="mt-3 space-y-1">
                  <p className="text-sm text-gray-500">Restante al check-in: ${(bookingTotal - amountToPay).toLocaleString()}</p>
                  <p className="text-xs text-blue-600">ℹ️ Reserva quedará en estado "confirmado" hasta completar pago</p>
                </div>
              )}
              {paymentOption === "total" && (
                <p className="text-xs text-green-600 mt-2">✅ Reserva quedará "pagada" y lista para check-in físico</p>
              )}
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

        {/* ⭐ POPUP DE REGISTRO DE BUYER */}
        <BuyerRegistrationForm
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