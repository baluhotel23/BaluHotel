import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkAvailability, createBooking } from '../../Redux/Actions/bookingActions';
import { registerLocalPayment } from '../../Redux/Actions/paymentActions';
import {
  fetchBuyerByDocument,
  createBuyer,
  fetchCountries,
  fetchDepartments,
  fetchMunicipalities,
  
} from "../../Redux/Actions/taxxaActions";
import { toast } from 'react-toastify';
import { differenceInDays, format } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../Dashboard/DashboardLayout';
import RoomStatusGrid from './RoomStatusGrid';
import { canBookToday } from '../../utils/canBookToday';


// =============================
// CONSTANTES
// =============================
const ROOM_TYPES = ["Doble", "Triple", "Múltiple", "Pareja"];

const PAYMENT_METHODS = [
  { value: 'cash', label: '💵 Efectivo', icon: '💵' },
  { value: 'credit_card', label: '💳 Tarjeta Crédito', icon: '💳' },
  { value: 'debit_card', label: '💳 Tarjeta Débito', icon: '💳' },
  { value: 'transfer', label: '🏦 Transferencia', icon: '🏦' }
];

const CONFIRMATION_OPTIONS = [
  { 
    value: 'payNow', 
    label: '💳 Pagar Total Ahora', 
    description: 'Pago completo inmediato',
    percentage: 100 
  },
  { 
    value: 'pay50Percent', 
    label: '💰 Pagar 50% Ahora', 
    description: 'Reserva con anticipo del 50%',
    percentage: 50 
  },
  { 
    value: 'payAtCheckIn', 
    label: '🏨 Pagar en Check-in', 
    description: 'Solo confirmar reserva, pago posterior',
    percentage: 0 
  }
];




const Modal = ({ children, isOpen, onClose, title }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
          >
            <span className="text-2xl text-gray-500">×</span>
          </button>
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};


const BuyerRegistrationForm = ({
  isOpen,
  onClose,
  onBuyerRegistered,
  initialSdocno,
}) => {
  const dispatch = useDispatch();
  const { departmentsCache, municipalitiesCache, loadingDepartments } = useSelector(state => state.taxxa);

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

  const [locationState, setLocationState] = useState({
    selectedCountry: 'CO',
    selectedDepartment: '',
    selectedMunicipality: '',
    departmentsList: [],
    municipalitiesList: [],
    loadingMunicipalities: false
  });

  const [submitting, setSubmitting] = useState(false);

  // ⭐ EFECTOS OPTIMIZADOS
  useEffect(() => {
    if (isOpen) {
      dispatch(fetchCountries());
      dispatch(fetchDepartments('CO'));
    }
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (initialSdocno) {
      setFormData(prev => ({ ...prev, sdocno: initialSdocno }));
    }
  }, [initialSdocno]);

  useEffect(() => {
    const departments = departmentsCache[`departments_${locationState.selectedCountry}`] || [];
    setLocationState(prev => ({ ...prev, departmentsList: departments }));
  }, [departmentsCache, locationState.selectedCountry]);

  // ⭐ HANDLERS OPTIMIZADOS
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleDepartmentChange = useCallback(async (e) => {
    const departmentCode = e.target.value;
    
    setLocationState(prev => ({
      ...prev,
      selectedDepartment: departmentCode,
      selectedMunicipality: '',
      municipalitiesList: [],
      loadingMunicipalities: !!departmentCode
    }));
    
    setFormData(prev => ({
      ...prev,
      wdepartmentcode: departmentCode,
      wtowncode: '',
      scityname: ''
    }));
    
    if (departmentCode) {
      try {
        const municipalities = await dispatch(fetchMunicipalities(departmentCode));
        if (Array.isArray(municipalities)) {
          setLocationState(prev => ({ 
            ...prev, 
            municipalitiesList: municipalities,
            loadingMunicipalities: false 
          }));
        }
      } catch (error) {
        console.error('Error loading municipalities:', error);
        setLocationState(prev => ({ ...prev, loadingMunicipalities: false }));
      }
    }
  }, [dispatch]);

  const handleMunicipalityChange = useCallback((e) => {
    const municipalityCode = e.target.value;
    const selectedMunicipality = locationState.municipalitiesList.find(
      muni => muni.code === municipalityCode || muni.wtowncode === municipalityCode
    );
    
    setLocationState(prev => ({ ...prev, selectedMunicipality: municipalityCode }));
    setFormData(prev => ({
      ...prev,
      wtowncode: municipalityCode,
      scityname: selectedMunicipality?.name || ''
    }));
  }, [locationState.municipalitiesList]);

  const validateForm = () => {
    const requiredFields = {
      sdocno: 'Número de documento',
      scostumername: 'Nombre completo',
      selectronicmail: 'Email',
      wdoctype: 'Tipo de documento',
      scorporateregistrationschemename: 'Nombre comercial',
      scontactperson: 'Persona de contacto',
      stelephone: 'Teléfono'
    };
    
    const missingFields = Object.entries(requiredFields)
      .filter(([field]) => !formData[field]?.trim())
      .map(([, label]) => label);
    
    if (missingFields.length > 0) {
      toast.error(`Complete los campos: ${missingFields.join(', ')}`);
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.selectronicmail)) {
      toast.error('Email inválido');
      return false;
    }
    
    if (formData.stelephone.length < 7) {
      toast.error('Teléfono inválido (mínimo 7 dígitos)');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setSubmitting(true);
    
    try {
      const result = await dispatch(createBuyer(formData));
      
      if (result?.success) {
        toast.success('¡Huésped registrado exitosamente!');
        onBuyerRegistered(result.data);
        onClose();
      } else {
        toast.error(result?.message || 'Error al registrar huésped');
      }
    } catch (error) {
      console.error('Error registering buyer:', error);
      toast.error('Error de conexión. Intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClassName = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registrar Nuevo Huésped">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Documento *
            </label>
            <input
              type="text"
              name="sdocno"
              value={formData.sdocno}
              onChange={handleInputChange}
              className={inputClassName}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo Documento *
            </label>
            <select
              name="wdoctype"
              value={formData.wdoctype}
              onChange={handleInputChange}
              className={inputClassName}
              required
            >
              <option value="CC">CC - Cédula de Ciudadanía</option>
              <option value="CE">CE - Cédula de Extranjería</option>
              <option value="PAS">PAS - Pasaporte</option>
              <option value="NIT">NIT</option>
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre Completo *
          </label>
          <input
            type="text"
            name="scostumername"
            value={formData.scostumername}
            onChange={handleInputChange}
            className={inputClassName}
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              name="selectronicmail"
              value={formData.selectronicmail}
              onChange={handleInputChange}
              className={inputClassName}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono *
            </label>
            <input
              type="tel"
              name="stelephone"
              value={formData.stelephone}
              onChange={handleInputChange}
              className={inputClassName}
              required
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre Comercial *
          </label>
          <input
            type="text"
            name="scorporateregistrationschemename"
            value={formData.scorporateregistrationschemename}
            onChange={handleInputChange}
            className={inputClassName}
            placeholder="Ej: Registro Mercantil"
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Persona de Contacto *
          </label>
          <input
            type="text"
            name="scontactperson"
            value={formData.scontactperson}
            onChange={handleInputChange}
            className={inputClassName}
            required
          />
        </div>

        {/* Sección de ubicación opcional */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-700 mb-3">📍 Ubicación (Opcional)</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Departamento
              </label>
              <select
                value={locationState.selectedDepartment}
                onChange={handleDepartmentChange}
                disabled={loadingDepartments}
                className={inputClassName}
              >
                <option value="">Seleccionar...</option>
                {locationState.departmentsList.map(dept => (
                  <option key={dept.code} value={dept.code}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ciudad/Municipio
              </label>
              <select
                value={locationState.selectedMunicipality}
                onChange={handleMunicipalityChange}
                disabled={locationState.loadingMunicipalities || !locationState.selectedDepartment}
                className={inputClassName}
              >
                <option value="">
                  {!locationState.selectedDepartment ? "Primero seleccione departamento" : "Seleccionar..."}
                </option>
                {locationState.municipalitiesList.map(muni => (
                  <option key={muni.code || muni.wtowncode} value={muni.code || muni.wtowncode}>
                    {muni.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              name="saddressline1"
              value={formData.saddressline1}
              onChange={handleInputChange}
              className={inputClassName}
              placeholder="Calle 123 #45-67, Barrio Centro"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
          >
            {submitting ? '⏳ Registrando...' : '✅ Registrar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
function isTodayAfterLimit() {
  return !canBookToday();
}

const LocalBookingForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // ⭐ SELECTORES REDUX OPTIMIZADOS
  const { 
    availability, 
    availabilitySummary,
    loading, 
    errors 
  } = useSelector((state) => ({
    availability: state.booking.availability || [],
    availabilitySummary: state.booking.availabilitySummary || { total: 0, available: 0 },
    loading: state.booking.loading || {},
    errors: state.booking.errors || {}
  }));
  
  const { 
    buyer: verifiedBuyer, 
    loading: buyerLoading, 
    error: buyerError 
  } = useSelector((state) => state.taxxa);

  // ⭐ ESTADOS PRINCIPALES
  const [searchParams, setSearchParams] = useState({
    checkIn: new Date(),
    checkOut: (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    })(),
    roomType: ROOM_TYPES[0]
  });

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [guestInfo, setGuestInfo] = useState({
    buyerSdocnoInput: '',
    buyerSdocno: '', 
    buyerName: '',
    adults: 1,
    children: 0
  });

  const [bookingState, setBookingState] = useState({
    totalAmount: 0,
    createdBookingId: null,
    confirmationOption: 'payNow'
  });

  const [paymentState, setPaymentState] = useState({
    showPaymentForm: false,
    amount: 0,
    method: 'cash',
    processing: false
  });

  const [uiState, setUiState] = useState({
    showBuyerPopup: false,
    currentStep: 'search' // search, booking, payment
  });

  // ⭐ VALORES COMPUTADOS
  const isLoadingAvailability = loading.availability;
  const availabilityError = errors.availability;
  
  const availableRooms = useMemo(() => {
  if (!Array.isArray(availability) || isLoadingAvailability || availabilityError) {
    return [];
  }
  // Solo habitaciones marcadas como disponibles
  return availability.filter(room => room.isAvailable);
}, [availability, isLoadingAvailability, availabilityError]);

  const totalGuests = guestInfo.adults + guestInfo.children;
  
  const calculatedTotal = useMemo(() => {
    if (!selectedRoom || !searchParams.checkIn || !searchParams.checkOut) return 0;
    
    const nights = differenceInDays(searchParams.checkOut, searchParams.checkIn);
    if (nights <= 0) return 0;

    let pricePerNight = 0;
    
    if (totalGuests === 1 && selectedRoom.priceSingle) {
      pricePerNight = parseFloat(selectedRoom.priceSingle);
    } else if (totalGuests === 2 && selectedRoom.priceDouble) {
      pricePerNight = parseFloat(selectedRoom.priceDouble);
    } else if (totalGuests >= 3 && selectedRoom.priceMultiple) {
      pricePerNight = parseFloat(selectedRoom.priceMultiple);
    } else if (selectedRoom.price) {
      pricePerNight = parseFloat(selectedRoom.price);
    }

    if (selectedRoom.isPromo && selectedRoom.promotionPrice) {
      pricePerNight = parseFloat(selectedRoom.promotionPrice);
    }

    return pricePerNight * nights;
  }, [selectedRoom, searchParams.checkIn, searchParams.checkOut, totalGuests]);

  // ⭐ EFECTOS
  useEffect(() => {
    console.log('🚀 [LOCAL] Component mounted, loading rooms...');
    setTimeout(() => handleSearchAvailability(), 500);
  }, []);

  useEffect(() => {
    setBookingState(prev => ({ ...prev, totalAmount: calculatedTotal }));
  }, [calculatedTotal]);

  useEffect(() => {
    if (!buyerLoading && guestInfo.buyerSdocnoInput) {
      if (verifiedBuyer && verifiedBuyer.sdocno === guestInfo.buyerSdocnoInput) {
        setGuestInfo(prev => ({
          ...prev,
          buyerSdocno: verifiedBuyer.sdocno,
          buyerName: verifiedBuyer.scostumername || ''
        }));
        setUiState(prev => ({ ...prev, showBuyerPopup: false }));
        toast.success(`Huésped ${verifiedBuyer.scostumername || verifiedBuyer.sdocno} encontrado.`);
      } else if (buyerError) {
        setGuestInfo(prev => ({ ...prev, buyerSdocno: '', buyerName: '' }));
        toast.info(`Huésped no encontrado. Por favor, regístrelo.`);
        setUiState(prev => ({ ...prev, showBuyerPopup: true }));
      }
    }
  }, [verifiedBuyer, buyerLoading, buyerError, guestInfo.buyerSdocnoInput]);

  // ⭐ HANDLERS PRINCIPALES
  const handleSearchAvailability = () => {
  const params = {
    // ⭐ ENVIAR FECHAS CON HORAS ESPECÍFICAS TAMBIÉN PARA DISPONIBILIDAD
    checkIn: searchParams.checkIn ? format(searchParams.checkIn, "yyyy-MM-dd") + 'T15:30:00-05:00' : undefined,
    checkOut: searchParams.checkOut ? format(searchParams.checkOut, "yyyy-MM-dd") + 'T12:00:00-05:00' : undefined,
    roomType: searchParams.roomType || undefined,
  };

  console.log("[LocalBookingForm.jsx][checkAvailability] Params with times:", params);

  dispatch(checkAvailability(params)).then((res) => {
    console.log("[LocalBookingForm.jsx][checkAvailability] Response:", res);
  });
};

  const handleSelectRoom = useCallback((room) => {
    if (!room.isActive) {
      toast.error(`Habitación ${room.roomNumber} está inactiva.`);
      return;
    }
    
    if (!room.isAvailable) {
      toast.warning(`Habitación ${room.roomNumber} no está disponible.`);
      return;
    }
    
    setSelectedRoom(room);
    setUiState(prev => ({ ...prev, currentStep: 'booking' }));
    toast.success(`Habitación ${room.roomNumber} seleccionada.`);
  }, []);

  const handleVerifyBuyer = useCallback(async () => {
    if (!guestInfo.buyerSdocnoInput.trim()) {
      toast.error("Ingrese un número de documento.");
      return;
    }
    
    setGuestInfo(prev => ({ ...prev, buyerSdocno: '', buyerName: '' }));
    setUiState(prev => ({ ...prev, showBuyerPopup: false }));
    
    await dispatch(fetchBuyerByDocument(guestInfo.buyerSdocnoInput.trim()));
  }, [guestInfo.buyerSdocnoInput, dispatch]);

  const handleBuyerRegistered = useCallback((registeredBuyer) => {
    setGuestInfo(prev => ({
      ...prev,
      buyerSdocno: registeredBuyer.sdocno,
      buyerName: registeredBuyer.scostumername || ''
    }));
    setUiState(prev => ({ ...prev, showBuyerPopup: false }));
    toast.success('Huésped registrado exitosamente');
  }, []);

const handleCreateBooking = useCallback(async () => {
    // Validaciones
    if (!selectedRoom || !guestInfo.buyerSdocno || bookingState.totalAmount <= 0) {
      toast.error('Complete todos los datos de la reserva.');
      return;
    }
    
    if (searchParams.checkOut <= searchParams.checkIn) {
      toast.error("Fechas inválidas.");
      return;
    }
    
    if (guestInfo.adults <= 0) {
      toast.error("Debe haber al menos un adulto.");
      return;
    }

    // Validación de hora límite para reservas del día actual
    const today = new Date();
    const checkInDate = new Date(searchParams.checkIn);
    if (
      checkInDate.toDateString() === today.toDateString() &&
      !canBookToday()
    ) {
      toast.error("No se pueden realizar reservas para hoy después de las 15:30 (hora Colombia).");
      return;
    }

    const bookingData = {
    roomNumber: selectedRoom.roomNumber,
    // ⭐ FORMATO ESPECÍFICO CON TIMEZONE DE COLOMBIA
    checkIn: format(searchParams.checkIn, 'yyyy-MM-dd') + 'T15:30:00-05:00',
    checkOut: format(searchParams.checkOut, 'yyyy-MM-dd') + 'T12:00:00-05:00',
    guestId: guestInfo.buyerSdocno,
    guestName: guestInfo.buyerName,
    guestCount: totalGuests,
    adults: guestInfo.adults,
    children: guestInfo.children,
    totalAmount: bookingState.totalAmount,
    status: 'confirmed',
    pointOfSale: 'Local'
  };
    try {
      const result = await dispatch(createBooking(bookingData));
      
      if (result?.success && result.data?.booking) {
    const newBookingId = result.data.booking.bookingId;
    toast.success(`Reserva creada: #${newBookingId}`);
    setBookingState(prev => ({ 
      ...prev, 
      createdBookingId: newBookingId 
    }));

    const { confirmationOption, totalAmount } = bookingState;
    
    if (confirmationOption === 'payNow') {
      setPaymentState(prev => ({ 
        ...prev, 
        amount: totalAmount, 
        showPaymentForm: true 
      }));
      setUiState(prev => ({ ...prev, currentStep: 'payment' }));
    } else if (confirmationOption === 'pay50Percent') {
      setPaymentState(prev => ({ 
        ...prev, 
        amount: totalAmount * 0.5, 
        showPaymentForm: true 
      }));
      setUiState(prev => ({ ...prev, currentStep: 'payment' }));
    } else {
      toast.info('Reserva confirmada. Pago pendiente para check-in.');
      handleResetForm();
    }
  } else {
    toast.error(result?.message || 'Error al crear la reserva.');
  }
} catch (error) {
  console.error('Error creating booking:', error);
  toast.error('Error al crear la reserva.');
}
  }, [selectedRoom, guestInfo, bookingState, searchParams, totalGuests, dispatch]);

  const handleProcessPayment = useCallback(async () => {
    if (!bookingState.createdBookingId || paymentState.amount <= 0) {
      toast.error('Datos de pago incompletos.');
      return;
    }
    
    setPaymentState(prev => ({ ...prev, processing: true }));
    
    const paymentData = {
      bookingId: bookingState.createdBookingId,
      amount: parseFloat(paymentState.amount),
      paymentMethod: paymentState.method,
      paymentType: paymentState.amount >= bookingState.totalAmount ? 'full' : 'partial'
    };
    
    try {
      const result = await dispatch(registerLocalPayment(paymentData));
      
      if (result?.success) {
        const isFullPayment = paymentState.amount >= bookingState.totalAmount;
        const remainingAmount = bookingState.totalAmount - paymentState.amount;
        
        if (isFullPayment) {
          toast.success('¡Pago completo registrado! ✅ Estado: PAID - Lista para check-in físico.');
        } else {
          toast.success(`Pago parcial registrado. Restante: $${remainingAmount.toFixed(2)}`);
        }
        
        handleResetForm();
        
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 2000);
      } else {
        toast.error(result?.message || 'Error al procesar el pago.');
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('Error al procesar el pago.');
    } finally {
      setPaymentState(prev => ({ ...prev, processing: false }));
    }
  }, [bookingState, paymentState, dispatch, navigate]);

  const handleResetForm = useCallback(() => {
    setSelectedRoom(null);
    setGuestInfo({
      buyerSdocnoInput: '',
      buyerSdocno: '',
      buyerName: '',
      adults: 1,
      children: 0
    });
    setBookingState({
      totalAmount: 0,
      createdBookingId: null,
      confirmationOption: 'payNow'
    });
    setPaymentState({
      showPaymentForm: false,
      amount: 0,
      method: 'cash',
      processing: false
    });
    setUiState({
      showBuyerPopup: false,
      currentStep: 'search'
    });
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    setSearchParams({
      checkIn: today,
      checkOut: tomorrow,
      roomType: ROOM_TYPES[0]
    });
  }, []);

  // ⭐ RENDER
  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-3">
              🏨 Crear Reserva Local
            </h1>
            <p className="text-lg text-gray-600">
              Sistema de gestión de reservas para recepción
            </p>
          </div>

          {/* Sección 1: Búsqueda */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-2 rounded-lg">
                <span className="text-2xl">🔍</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">1. Buscar Disponibilidad</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Entrada
                </label>
                <DatePicker 
      selected={searchParams.checkIn} 
      onChange={(date) => setSearchParams(prev => ({ ...prev, checkIn: date }))} 
      dateFormat="yyyy-MM-dd" 
      minDate={new Date()}
      // ⭐ Usa filterDate para bloquear hoy si ya pasó la hora límite
      filterDate={date => {
        const today = new Date();
        if (
          date.toDateString() === today.toDateString() &&
          isTodayAfterLimit()
        ) {
          console.log("⛔ Hoy está deshabilitado en el DatePicker por horario límite.");
          return false;
        }
        return true;
      }}
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Salida
                </label>
                <DatePicker 
                  selected={searchParams.checkOut} 
                  onChange={(date) => setSearchParams(prev => ({ ...prev, checkOut: date }))} 
                  dateFormat="yyyy-MM-dd" 
                  minDate={searchParams.checkIn || new Date()}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Habitación
                </label>
                <select 
                  value={searchParams.roomType} 
                  onChange={(e) => setSearchParams(prev => ({ ...prev, roomType: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {ROOM_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                <button 
                  onClick={handleSearchAvailability} 
                  disabled={isLoadingAvailability}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingAvailability ? '🔍 Buscando...' : '🔍 Buscar'}
                </button>
              </div>
            </div>
            
            {/* Errores */}
            {availabilityError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">❌ Error: {availabilityError}</p>
              </div>
            )}
          </div>

          {/* Sección 2: Habitaciones */}
          {availableRooms.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-100 p-2 rounded-lg">
                  <span className="text-2xl">🏠</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">2. Habitaciones</h2>
                <div className="ml-auto bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm font-medium">
                  {availableRooms.length} habitación(es) para {format(searchParams.checkIn, 'dd/MM/yyyy')} - {format(searchParams.checkOut, 'dd/MM/yyyy')}
                </div>
              </div>
              
              <RoomStatusGrid 
                rooms={availableRooms}
                checkIn={searchParams.checkIn}
                checkOut={searchParams.checkOut}
                onRoomSelect={handleSelectRoom}
                selectedRoom={selectedRoom}
              />
            </div>
          )}

          {/* Sección 3: Detalles de Reserva */}
          {selectedRoom && !bookingState.createdBookingId && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <span className="text-2xl">📋</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  3. Detalles - Habitación {selectedRoom.roomNumber}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Información del Huésped */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
                    Información del Huésped
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Documento del Huésped
                    </label>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        value={guestInfo.buyerSdocnoInput} 
                        onChange={(e) => setGuestInfo(prev => ({ ...prev, buyerSdocnoInput: e.target.value }))} 
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ingrese documento y verifique"
                      />
                      <button 
                        onClick={handleVerifyBuyer} 
                        disabled={buyerLoading}
                        className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50"
                      >
                        {buyerLoading ? '⏳' : '✓ Verificar'}
                      </button>
                    </div>
                    
                    {guestInfo.buyerSdocno && guestInfo.buyerName && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-700 font-medium">
                          ✅ Huésped: {guestInfo.buyerName} ({guestInfo.buyerSdocno})
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Adultos
                      </label>
                      <input 
                        type="number" 
                        value={guestInfo.adults} 
                        onChange={(e) => setGuestInfo(prev => ({ ...prev, adults: parseInt(e.target.value) || 1 }))} 
                        min="1" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Niños
                      </label>
                      <input 
                        type="number" 
                        value={guestInfo.children} 
                        onChange={(e) => setGuestInfo(prev => ({ ...prev, children: parseInt(e.target.value) || 0 }))} 
                        min="0" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Resumen de Reserva */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
                    Resumen de Reserva
                  </h3>
                  
                  <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Habitación:</span>
                      <span className="font-semibold">{selectedRoom.roomNumber} ({selectedRoom.type})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fechas:</span>
                      <span className="font-semibold">
                        {format(searchParams.checkIn, 'dd/MM/yyyy')} - {format(searchParams.checkOut, 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Noches:</span>
                      <span className="font-semibold">{differenceInDays(searchParams.checkOut, searchParams.checkIn)} noches</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Huéspedes:</span>
                      <span className="font-semibold">{totalGuests} personas</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-xl">
                        <span className="font-bold text-gray-800">Total:</span>
                        <span className="font-bold text-green-600">${bookingState.totalAmount.toLocaleString()} COP</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opciones de Pago
                    </label>
                    <select 
                      value={bookingState.confirmationOption} 
                      onChange={(e) => setBookingState(prev => ({ ...prev, confirmationOption: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {CONFIRMATION_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <button 
                  onClick={handleCreateBooking} 
                  disabled={!guestInfo.buyerSdocno || bookingState.totalAmount <= 0 || totalGuests === 0 || guestInfo.adults < 1}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 px-8 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  ✅ Confirmar y Crear Reserva
                </button>
              </div>
            </div>
          )}
          
          {/* Sección 4: Pago */}
          {paymentState.showPaymentForm && bookingState.createdBookingId && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-100 p-2 rounded-lg">
                  <span className="text-2xl">💳</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  4. Registrar Pago - Reserva #{bookingState.createdBookingId}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto a Pagar (Total: ${bookingState.totalAmount.toLocaleString()})
                  </label>
                  <input 
                    type="number" 
                    value={paymentState.amount} 
                    onChange={(e) => setPaymentState(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ingrese el monto"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Método de Pago
                  </label>
                  <select 
                    value={paymentState.method} 
                    onChange={(e) => setPaymentState(prev => ({ ...prev, method: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="text-center">
                <button 
                  onClick={handleProcessPayment}
                  disabled={paymentState.processing}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg disabled:opacity-50"
                >
                  {paymentState.processing ? '⏳ Procesando...' : '💳 Registrar Pago'}
                </button>
              </div>
            </div>
          )}

          {/* Componentes Auxiliares */}
          <BuyerRegistrationForm
            isOpen={uiState.showBuyerPopup}
            onClose={() => setUiState(prev => ({ ...prev, showBuyerPopup: false }))}
            onBuyerRegistered={handleBuyerRegistered}
            initialSdocno={guestInfo.buyerSdocnoInput}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LocalBookingForm;