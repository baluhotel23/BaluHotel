import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkAvailability, createBooking, getBookingById } from '../../Redux/Actions/bookingActions';
import { registerLocalPayment } from '../../Redux/Actions/paymentActions';
import { fetchBuyerByDocument, createBuyer } from '../../Redux/Actions/taxxaActions';
import { toast } from 'react-toastify';
import { differenceInDays, format } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../Dashboard/DashboardLayout';
import RoomStatusGrid from './RoomStatusGrid';

// Modal Component con Tailwind
const Modal = ({ children, isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        <div className="flex-1 p-6 overflow-y-auto">
          {children}
        </div>
        <div className="border-t border-gray-200 p-4 bg-gray-50 rounded-b-2xl flex justify-end">
          <button 
            onClick={onClose} 
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors duration-200 font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// Buyer Registration Form con Tailwind
const BuyerRegistrationFormPopup = ({ isOpen, onClose, onBuyerRegistered, initialSdocno }) => {
  const dispatch = useDispatch();
  const [buyerData, setBuyerData] = useState({
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
      setBuyerData(prev => ({ ...prev, sdocno: initialSdocno }));
    }
  }, [initialSdocno]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setBuyerData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!buyerData.sdocno || 
        !buyerData.scostumername || 
        !buyerData.selectronicmail ||
        !buyerData.wdoctype ||
        !buyerData.scorporateregistrationschemename ||
        !buyerData.scontactperson ||
        !buyerData.stelephone) {
        toast.error("Por favor, complete todos los campos obligatorios del huésped (*).");
        return;
    }
    
    const resultAction = await dispatch(createBuyer(buyerData));
    if (resultAction && resultAction.success) {
      toast.success("Huésped registrado exitosamente.");
      onBuyerRegistered(resultAction.data);
      onClose();
    } else {
      toast.error(resultAction.message || "Error al registrar el huésped.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-6">
        <div className="text-center">
          <h4 className="text-2xl font-bold text-gray-800 mb-2">🏨 Registrar Nuevo Huésped</h4>
          <p className="text-gray-600">Complete la información del huésped</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documento (sdocno) *
              </label>
              <input 
                type="text" 
                name="sdocno" 
                value={buyerData.sdocno} 
                onChange={handleChange} 
                required 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Número de documento"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo Documento *
              </label>
              <select 
                name="wdoctype" 
                value={buyerData.wdoctype} 
                onChange={handleChange} 
                required 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="CC">CC - Cédula de Ciudadanía</option>
                <option value="NIT">NIT - Número de Identificación Tributaria</option>
                <option value="CE">CE - Cédula de Extranjería</option>
                <option value="PAS">PAS - Pasaporte</option>
                <option value="RC">RC - Registro Civil</option>
                <option value="TI">TI - Tarjeta de Identidad</option>
                <option value="TE">TE - Tarjeta de Extranjería</option>
                <option value="DEX">DEX - Documento de Identificación Extranjero</option>
                <option value="PEP">PEP - Permiso Especial de Permanencia</option>
                <option value="PPT">PPT - Permiso por Protección Temporal</option>
                <option value="FI">FI - Cédula de Inversión Extranjera</option>
                <option value="NUIP">NUIP - Número Único de Identificación Personal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre Completo *
            </label>
            <input 
              type="text" 
              name="scostumername" 
              value={buyerData.scostumername} 
              onChange={handleChange} 
              required 
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nombre completo del huésped"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email *
              </label>
              <input 
                type="email" 
                name="selectronicmail" 
                value={buyerData.selectronicmail} 
                onChange={handleChange} 
                required 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="correo@ejemplo.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono *
              </label>
              <input 
                type="text" 
                name="stelephone" 
                value={buyerData.stelephone} 
                onChange={handleChange} 
                required 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Número de teléfono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Persona de Contacto *
              </label>
              <input 
                type="text" 
                name="scontactperson" 
                value={buyerData.scontactperson} 
                onChange={handleChange} 
                required 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Persona de contacto"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Registro Corporativo *
              </label>
              <input 
                type="text" 
                name="scorporateregistrationschemename" 
                value={buyerData.scorporateregistrationschemename} 
                onChange={handleChange} 
                required 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Nombre del esquema"
              />
            </div>
          </div>

          {/* Campos adicionales con menor importancia visual */}
          <div className="pt-4 border-t border-gray-200">
            <h5 className="text-lg font-medium text-gray-700 mb-3">Información Adicional</h5>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo Organización</label>
                <select 
                  name="wlegalorganizationtype" 
                  value={buyerData.wlegalorganizationtype} 
                  onChange={handleChange} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="person">Persona</option>
                  <option value="company">Empresa</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID Tributaria</label>
                <select 
                  name="stributaryidentificationkey" 
                  value={buyerData.stributaryidentificationkey} 
                  onChange={handleChange} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="O-1">O-1</option>
                  <option value="O-4">O-4</option>
                  <option value="ZZ">ZZ</option>
                  <option value="ZA">ZA</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Régimen Fiscal</label>
                <select 
                  name="sfiscalregime" 
                  value={buyerData.sfiscalregime} 
                  onChange={handleChange} 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="48">48 - IVA</option>
                  <option value="49">49 - No IVA</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="pt-6">
            <button 
              type="submit" 
              className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg"
            >
              Registrar Huésped
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

const ROOM_TYPES = ["Doble", "Triple", "Cuadruple", "Pareja"];

const LocalBookingForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // ⭐ CORREGIR SELECTORES PARA OBTENER LAS HABITACIONES
  const { availability, loading: availabilityLoading, error: availabilityError } = useSelector(state => state.booking);
  const { buyer: verifiedBuyer, loading: buyerLoading, error: buyerError } = useSelector(state => state.taxxa);
  
  // ⭐ DEBUGEAR AVAILABILITY
  console.log('🏨 Availability from Redux:', availability);
  console.log('📊 Type of availability:', typeof availability);
  console.log('🔍 Is availability array?', Array.isArray(availability));

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [roomType, setRoomType] = useState(ROOM_TYPES[0]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  const [buyerSdocnoInput, setBuyerSdocnoInput] = useState('');
  const [buyerSdocno, setBuyerSdocno] = useState(''); 
  const [buyerName, setBuyerName] = useState('');
  
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  
  const [createdBookingId, setCreatedBookingId] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethodLocal, setPaymentMethodLocal] = useState('cash');
  const [currentBookingTotalForPayment, setCurrentBookingTotalForPayment] = useState(0);

  const [showBuyerPopup, setShowBuyerPopup] = useState(false);
  const [confirmationOption, setConfirmationOption] = useState('payNow');

  // Función para manejar selección de habitación mejorada
  const handleSelectRoom = (room) => {
    console.log('🏨 Habitación seleccionada:', room);
    setSelectedRoom(room);
    toast.success(`Habitación ${room.roomNumber} seleccionada`);
  };

  // ⭐ MEJORAR availableRooms CON VERIFICACIÓN
  const availableRooms = React.useMemo(() => {
  console.log('🔄 Calculando habitaciones disponibles...');
  console.log('📊 Availability:', availability);
  console.log('🔍 availabilityLoading:', availabilityLoading);
  console.log('❌ availabilityError:', availabilityError);
  
  if (availability && Array.isArray(availability) && !availabilityLoading && !availabilityError) {
    // ⭐ OPCIÓN 1: Mostrar solo disponibles (actual)
    // const filtered = availability.filter(room => room.isAvailable);
    
    // ⭐ OPCIÓN 2: Mostrar TODAS las habitaciones (recomendado para debug)
    const filtered = availability; // Mostrar todas
    
    console.log('✅ Habitaciones filtradas:', filtered);
    console.log('🏠 Habitaciones disponibles:', filtered.filter(r => r.isAvailable).length);
    console.log('🚫 Habitaciones no disponibles:', filtered.filter(r => !r.isAvailable).length);
    
    return filtered;
  }
  
  console.log('❌ No hay habitaciones disponibles');
  return [];
}, [availability, availabilityLoading, availabilityError]);

  // Resto de funciones sin cambios (handleVerifyOrRegisterBuyer, etc.)
  const handleVerifyOrRegisterBuyer = async () => {
    if (!buyerSdocnoInput) {
      toast.error("Por favor, ingrese un número de documento para el huésped.");
      return;
    }
    setBuyerSdocno('');
    setBuyerName('');
    await dispatch(fetchBuyerByDocument(buyerSdocnoInput)); 
  };

  useEffect(() => {
    if (!buyerLoading && buyerSdocnoInput) { 
      if (verifiedBuyer && verifiedBuyer.sdocno === buyerSdocnoInput) {
        const fetchedName = verifiedBuyer.scostumername || '';
        setBuyerSdocno(verifiedBuyer.sdocno);
        setBuyerName(fetchedName);
        toast.success(`Huésped ${fetchedName || verifiedBuyer.sdocno} encontrado.`);
        setShowBuyerPopup(false);
      } else if (buyerError) {
        setBuyerSdocno(''); 
        setBuyerName('');
        toast.info(`Huésped con documento ${buyerSdocnoInput} no encontrado. Por favor, regístrelo.`);
        setShowBuyerPopup(true);
      }
    }
  }, [verifiedBuyer, buyerLoading, buyerError, buyerSdocnoInput, dispatch]);

  const handleBuyerRegistered = (registeredBuyer) => {
    setBuyerSdocno(registeredBuyer.sdocno);
    setBuyerName(registeredBuyer.scostumername || '');
    setShowBuyerPopup(false);
  };

  const handleSearchAvailability = async () => {
  if (!checkIn || !checkOut || !roomType) {
    toast.error("Por favor, seleccione fechas y tipo de habitación.");
    return;
  }
  if (checkOut <= checkIn) {
    toast.error("La fecha de salida debe ser posterior a la fecha de entrada.");
    return;
  }
  
  console.log('🔍 Buscando disponibilidad...');
  
  // ⭐ CREAR OBJETO DE PARÁMETROS CON VALIDACIÓN
  const searchParams = {
    checkIn: format(checkIn, 'yyyy-MM-dd'), 
    checkOut: format(checkOut, 'yyyy-MM-dd'), 
    roomType 
  };
  
  console.log('📅 Search Params:', searchParams);
  console.log('🔍 Params validation:');
  console.log('  - checkIn valid:', !!searchParams.checkIn);
  console.log('  - checkOut valid:', !!searchParams.checkOut);
  console.log('  - roomType valid:', !!searchParams.roomType);
  
  // ⭐ ESPERAR LA RESPUESTA Y VERIFICAR
  try {
    const result = await dispatch(checkAvailability(searchParams));
    console.log('🎯 Dispatch result:', result);
  } catch (error) {
    console.error('❌ Error in dispatch:', error);
  }
  
  setSelectedRoom(null); 
  setCreatedBookingId(null);
  setShowPaymentForm(false);
};

  // Cálculo de precio con nuevos campos
  const calculateLocalBookingTotal = () => {
    if (!selectedRoom || !checkIn || !checkOut) return 0;
    const nights = differenceInDays(checkOut, checkIn);
    if (nights <= 0) return 0;

    const guestCount = parseInt(adults, 10) + parseInt(children, 10);
    let pricePerNight = 0;

    // ⭐ USAR NUEVOS CAMPOS DE PRECIO
    if (guestCount === 1 && selectedRoom.priceSingle) {
      pricePerNight = parseFloat(selectedRoom.priceSingle);
    } else if (guestCount === 2 && selectedRoom.priceDouble) {
      pricePerNight = parseFloat(selectedRoom.priceDouble);
    } else if (guestCount >= 3 && selectedRoom.priceMultiple) {
      pricePerNight = parseFloat(selectedRoom.priceMultiple);
    } else if (selectedRoom.price) {
      // Compatibilidad con precio legacy
      pricePerNight = parseFloat(selectedRoom.price);
    }

    // Si es promocional, usar precio promocional
    if (selectedRoom.isPromo && selectedRoom.promotionPrice) {
      pricePerNight = parseFloat(selectedRoom.promotionPrice);
    }

    return pricePerNight * nights;
  };

  useEffect(() => {
    if (selectedRoom && checkIn && checkOut && (parseInt(adults, 10) >= 0 || parseInt(children, 10) >= 0)) {
      const nights = differenceInDays(checkOut, checkIn);
      const currentGuestCount = parseInt(adults, 10) + parseInt(children, 10);

      if (nights > 0 && currentGuestCount > 0 && parseInt(adults, 10) >= 1) {
        const newTotal = calculateLocalBookingTotal();
        setTotalAmount(newTotal);
      } else {
        setTotalAmount(0);
      }
    } else {
      setTotalAmount(0);
    }
  }, [selectedRoom, checkIn, checkOut, adults, children]);

  const handleSubmitLocalBooking = async () => {
    if (!selectedRoom || !buyerSdocno || totalAmount <= 0 || !checkIn || !checkOut) {
      toast.error('Por favor, complete todos los datos de la reserva y del huésped (verificado/registrado).');
      return;
    }
    if (checkOut <= checkIn) {
      toast.error("La fecha de salida debe ser posterior a la fecha de entrada.");
      return;
    }
    if (parseInt(adults, 10) <= 0) {
      toast.error("Debe haber al menos un adulto en la reserva.");
      return;
    }

    const localBookingData = {
      roomNumber: selectedRoom.roomNumber,
      checkIn: format(checkIn, 'yyyy-MM-dd'),
      checkOut: format(checkOut, 'yyyy-MM-dd'),
      guestId: buyerSdocno,
      guestName: buyerName,
      guestCount: parseInt(adults, 10) + parseInt(children, 10),
      adults: parseInt(adults, 10),
      children: parseInt(children, 10),
      totalAmount,
      status: 'confirmed', 
      pointOfSale: 'Local',
    };

    const resultAction = await dispatch(createBooking(localBookingData));
    if (resultAction && resultAction.success && resultAction.data && resultAction.data.booking) {
      const newBooking = resultAction.data.booking;
      toast.success(`Reserva local creada con ID: ${newBooking.bookingId}`);
      setCreatedBookingId(newBooking.bookingId);
      setCurrentBookingTotalForPayment(totalAmount);

      if (confirmationOption === 'payNow') {
        setPaymentAmount(totalAmount); 
        setShowPaymentForm(true);
      } else if (confirmationOption === 'pay50Percent') {
        setPaymentAmount(totalAmount * 0.50);
        setShowPaymentForm(true);
      } else if (confirmationOption === 'payAtCheckIn') {
        toast.info('Reserva confirmada. El pago se realizará en el check-in.');
        setShowPaymentForm(false);
        resetFormToInitialState();
      }
      
      if (confirmationOption !== 'payAtCheckIn') {
        setAdults(1);
        setChildren(0);
        navigate('/admin/localBooking');
      }
    } else {
      toast.error(resultAction.message || 'Error al crear la reserva local.');
    }
  };
  
  const handleRegisterLocalPayment = async () => {
    if (!createdBookingId || paymentAmount <= 0 || !paymentMethodLocal) {
      toast.error('Datos de pago incompletos o reserva no creada.');
      return;
    }
    
    const paymentPayload = {
      bookingId: createdBookingId,
      amount: parseFloat(paymentAmount),
      paymentMethod: paymentMethodLocal,
      paymentType: (parseFloat(paymentAmount) >= currentBookingTotalForPayment) ? 'full' : 'partial', 
    };
    
    try {
      const resultPaymentAction = await dispatch(registerLocalPayment(paymentPayload));
      const isSuccess = resultPaymentAction && (
        resultPaymentAction.success || 
        resultPaymentAction.type?.includes('fulfilled') ||
        resultPaymentAction.payload?.success ||
        !resultPaymentAction.error
      );

      if (isSuccess) {
        const isFullPayment = parseFloat(paymentAmount) >= currentBookingTotalForPayment;
        const remainingAmount = currentBookingTotalForPayment - parseFloat(paymentAmount);
        
        if (isFullPayment) {
          toast.success('¡Pago completo registrado exitosamente! Reserva totalmente pagada.');
        } else {
          toast.success(`Pago parcial registrado exitosamente. Restante: $${remainingAmount.toFixed(2)}`);
        }
        
        resetFormToInitialState();
        
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 1500);
        
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 3000);
        
      } else {
        toast.error(resultPaymentAction?.message || resultPaymentAction?.error || 'Error al registrar el pago local.');
      }
    } catch (error) {
      console.error('Error en handleRegisterLocalPayment:', error);
      toast.error('Error inesperado al registrar el pago.');
    }
  };

  const resetFormToInitialState = () => {
    setShowPaymentForm(false);
    setCreatedBookingId(null);
    setPaymentAmount(0);
    setCurrentBookingTotalForPayment(0);
    setPaymentMethodLocal('cash');
    setSelectedRoom(null);
    setTotalAmount(0);
    setConfirmationOption('payNow');
    setBuyerSdocnoInput('');
    setBuyerSdocno('');
    setBuyerName('');
    setShowBuyerPopup(false);
    setAdults(1);
    setChildren(0);
    
    const newToday = new Date();
    const newTomorrow = new Date(newToday);
    newTomorrow.setDate(newTomorrow.getDate() + 1);
    
    setCheckIn(newToday);
    setCheckOut(newTomorrow);
    setRoomType(ROOM_TYPES[0]);
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="max-w-6xl mx-auto">
          <BuyerRegistrationFormPopup 
            isOpen={showBuyerPopup} 
            onClose={() => setShowBuyerPopup(false)}
            onBuyerRegistered={handleBuyerRegistered}
            initialSdocno={buyerSdocnoInput}
          />
          
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-3">
              🏨 Crear Reserva Local
            </h1>
            <p className="text-lg text-gray-600">Sistema de gestión de reservas para recepción</p>
          </div>

          {/* Search Availability Section */}
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-100 p-2 rounded-lg">
                <span className="text-2xl">🔍</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">1. Buscar Disponibilidad</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Entrada</label>
                <DatePicker 
                  selected={checkIn} 
                  onChange={(date) => setCheckIn(date)} 
                  dateFormat="yyyy-MM-dd" 
                  minDate={today}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fecha de Salida</label>
                <DatePicker 
                  selected={checkOut} 
                  onChange={(date) => setCheckOut(date)} 
                  dateFormat="yyyy-MM-dd" 
                  minDate={checkIn || today}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Habitación</label>
                <select 
                  value={roomType} 
                  onChange={(e) => setRoomType(e.target.value)}
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
                  disabled={availabilityLoading}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {availabilityLoading ? '🔍 Buscando...' : '🔍 Buscar'}
                </button>
              </div>
            </div>
            
            {availabilityError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-700">❌ Error: {availabilityError}</p>
              </div>
            )}
          </div>

          {/* Available Rooms Section */}
          {availableRooms.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-100 p-2 rounded-lg">
                  <span className="text-2xl">🏠</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">2. Habitaciones Disponibles</h2>
              </div>
              
              <RoomStatusGrid 
                rooms={availableRooms}
                checkIn={checkIn}
                checkOut={checkOut}
                onRoomSelect={handleSelectRoom}
                selectedRoom={selectedRoom}
              />
            </div>
          )}

          {/* No Rooms Available Message */}
          {availability && availableRooms.length === 0 && !availabilityLoading && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-8 mb-8 text-center">
              <div className="text-6xl mb-4">😔</div>
              <h3 className="text-2xl font-bold text-orange-800 mb-2">No hay habitaciones disponibles</h3>
              <p className="text-orange-600 text-lg">Para los criterios seleccionados. Intente con otras fechas.</p>
            </div>
          )}

          {/* Booking Details Section */}
          {selectedRoom && !createdBookingId && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <span className="text-2xl">📋</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  3. Detalles de Reserva - Habitación {selectedRoom.roomNumber}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Guest Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Información del Huésped</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Documento del Huésped
                    </label>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        value={buyerSdocnoInput} 
                        onChange={(e) => setBuyerSdocnoInput(e.target.value)} 
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Ingrese documento y verifique"
                      />
                      <button 
                        onClick={handleVerifyOrRegisterBuyer} 
                        disabled={buyerLoading}
                        className="bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 disabled:opacity-50"
                      >
                        {buyerLoading ? '⏳' : '✓ Verificar'}
                      </button>
                    </div>
                    {buyerSdocno && buyerName && (
                      <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-green-700 font-medium">
                          ✅ Huésped: {buyerName} ({buyerSdocno})
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Huésped
                    </label>
                    <input 
                      type="text" 
                      value={buyerName} 
                      readOnly 
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                      placeholder="Se completará automáticamente"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Adultos</label>
                      <input 
                        type="number" 
                        value={adults} 
                        onChange={(e) => setAdults(e.target.value)} 
                        min="1" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Niños</label>
                      <input 
                        type="number" 
                        value={children} 
                        onChange={(e) => setChildren(e.target.value)} 
                        min="0" 
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Reservation Summary */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Resumen de Reserva</h3>
                  
                  <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Habitación:</span>
                      <span className="font-semibold">{selectedRoom.roomNumber} ({selectedRoom.type})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fechas:</span>
                      <span className="font-semibold">
                        {format(checkIn, 'dd/MM/yyyy')} - {format(checkOut, 'dd/MM/yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Noches:</span>
                      <span className="font-semibold">{differenceInDays(checkOut, checkIn)} noches</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Huéspedes:</span>
                      <span className="font-semibold">{parseInt(adults) + parseInt(children)} personas</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-xl">
                        <span className="font-bold text-gray-800">Total:</span>
                        <span className="font-bold text-green-600">${totalAmount.toLocaleString()} COP</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Opciones de Pago</label>
                    <select 
                      value={confirmationOption} 
                      onChange={(e) => setConfirmationOption(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="payNow">💳 Pagar Total Ahora</option>
                      <option value="pay50Percent">💰 Pagar 50% Ahora</option>
                      <option value="payAtCheckIn">🏨 Pagar en el Check-in</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <button 
                  onClick={handleSubmitLocalBooking} 
                  disabled={!buyerSdocno || totalAmount <= 0 || (parseInt(adults,10) + parseInt(children,10) === 0) || parseInt(adults,10) < 1}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 px-8 rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                >
                  ✅ Confirmar y Crear Reserva Local
                </button>
              </div>
            </div>
          )}
          
          {/* Payment Form Section */}
          {showPaymentForm && createdBookingId && (
            <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-green-100 p-2 rounded-lg">
                  <span className="text-2xl">💳</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">
                  4. Registrar Pago - Reserva #{createdBookingId}
                </h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monto a Pagar (Total: ${currentBookingTotalForPayment.toLocaleString()})
                  </label>
                  <input 
                    type="number" 
                    value={paymentAmount} 
                    onChange={e => setPaymentAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ingrese el monto"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Método de Pago</label>
                  <select 
                    value={paymentMethodLocal} 
                    onChange={e => setPaymentMethodLocal(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="cash">💵 Efectivo</option>
                    <option value="credit_card">💳 Tarjeta Crédito</option>
                    <option value="debit_card">💳 Tarjeta Débito</option>
                    <option value="transfer">🏦 Transferencia</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <button 
                  onClick={handleRegisterLocalPayment}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-3 px-8 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg"
                >
                  💳 Registrar Pago
                </button>
              </div>
            </div>
          )}

          {/* Room Status Grid - General Overview */}
          {availability && availability.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Estado General de Habitaciones</h2>
              </div>
              
              <RoomStatusGrid 
                rooms={availability}
                checkIn={checkIn}
                checkOut={checkOut}
                onRoomSelect={handleSelectRoom}
                selectedRoom={selectedRoom}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default LocalBookingForm;