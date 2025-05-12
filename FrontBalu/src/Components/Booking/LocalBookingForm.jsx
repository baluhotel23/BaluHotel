import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkAvailability, createBooking, getBookingById } from '../../Redux/Actions/bookingActions'; // Asumiendo getBookingById existe
import { registerLocalPayment } from '../../Redux/Actions/paymentActions';
import { fetchBuyerByDocument, createBuyer } from '../../Redux/Actions/taxxaActions'; // Asumiendo estas acciones existen
import { toast } from 'react-toastify';
import { differenceInDays, format } from 'date-fns';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useNavigate } from 'react-router-dom';


// Un componente simple para el Modal/Popup
const Modal = ({ children, isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: 'white', padding: '20px', borderRadius: '8px', minWidth: '300px', maxWidth: '500px' }}>
        {children}
        <button onClick={onClose} style={{ marginTop: '10px', padding: '8px 12px', float: 'right' }}>Cerrar</button>
      </div>
    </div>
  );
};



const BuyerRegistrationFormPopup = ({ isOpen, onClose, onBuyerRegistered, initialSdocno }) => {
  const dispatch = useDispatch();
  const [buyerData, setBuyerData] = useState({
    sdocno: initialSdocno || '',
    wlegalorganizationtype: 'person', // Default from model
    scostumername: '', // Corresponds to ssellername in previous version
    stributaryidentificationkey: 'O-1', // Default from model
    sfiscalresponsibilities: 'R-99-PN', // Default from model
    sfiscalregime: '48', // Default from model
    wdoctype: 'CC', // Default, corresponds to sdoctype
    scorporateregistrationschemename: '', // New field
    scontactperson: '', // New field
    selectronicmail: '',
    stelephone: '', // Corresponds to sphonenumber
    // Additional address fields (if you decide to keep them and your backend handles them)
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

    console.log('Datos del Buyer a registrar:', buyerData);
    // Update validation based on allowNull: false fields
    if (!buyerData.sdocno || 
        !buyerData.scostumername || 
        !buyerData.selectronicmail ||
        !buyerData.wdoctype ||
        !buyerData.scorporateregistrationschemename || // Added validation
        !buyerData.scontactperson || // Added validation
        !buyerData.stelephone) { // Added validation
        toast.error("Por favor, complete todos los campos obligatorios del huésped (*).");
        return;
    }
    // Ensure ENUM fields have valid values if not using select defaults strictly
    
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
      <h4>Registrar Nuevo Huésped</h4>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>Documento (sdocno):*</label>
          <input type="text" name="sdocno" value={buyerData.sdocno} onChange={handleChange} required style={{ width: '95%', padding: '8px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Tipo Documento (wdoctype):*</label>
          <select name="wdoctype" value={buyerData.wdoctype} onChange={handleChange} required style={{ width: '100%', padding: '8px' }}>
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
        <div style={{ marginBottom: '10px' }}>
          <label>Nombre Completo (scostumername):*</label>
          <input type="text" name="scostumername" value={buyerData.scostumername} onChange={handleChange} required style={{ width: '95%', padding: '8px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Email (selectronicmail):*</label>
          <input type="email" name="selectronicmail" value={buyerData.selectronicmail} onChange={handleChange} required style={{ width: '95%', padding: '8px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Teléfono (stelephone):*</label>
          <input type="text" name="stelephone" value={buyerData.stelephone} onChange={handleChange} required style={{ width: '95%', padding: '8px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Tipo Organización Legal (wlegalorganizationtype):*</label>
          <select name="wlegalorganizationtype" value={buyerData.wlegalorganizationtype} onChange={handleChange} required style={{ width: '100%', padding: '8px' }}>
            <option value="person">Persona</option>
            <option value="company">Empresa</option>
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Clave Identificación Tributaria (stributaryidentificationkey):*</label>
          <select name="stributaryidentificationkey" value={buyerData.stributaryidentificationkey} onChange={handleChange} required style={{ width: '100%', padding: '8px' }}>
            <option value="O-1">O-1</option>
            <option value="O-4">O-4</option>
            <option value="ZZ">ZZ</option>
            <option value="ZA">ZA</option>
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Responsabilidades Fiscales (sfiscalresponsibilities):*</label>
          <select name="sfiscalresponsibilities" value={buyerData.sfiscalresponsibilities} onChange={handleChange} required style={{ width: '100%', padding: '8px' }}>
            <option value="R-99-PN">R-99-PN</option>
            <option value="O-1">O-1</option>
            <option value="O-4">O-4</option>
            <option value="ZA">ZA</option>
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Régimen Fiscal (sfiscalregime):*</label>
          <select name="sfiscalregime" value={buyerData.sfiscalregime} onChange={handleChange} required style={{ width: '100%', padding: '8px' }}>
            <option value="48">48 - Impuesto sobre las ventas – IVA</option>
            <option value="49">49 - No responsable de IVA</option>
          </select>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Nombre Esquema Registro Corporativo (scorporateregistrationschemename):*</label>
          <input type="text" name="scorporateregistrationschemename" value={buyerData.scorporateregistrationschemename} onChange={handleChange} required style={{ width: '95%', padding: '8px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Persona de Contacto (scontactperson):*</label>
          <input type="text" name="scontactperson" value={buyerData.scontactperson} onChange={handleChange} required style={{ width: '95%', padding: '8px' }} />
        </div>

        {/* Campos de Dirección (Opcionales, si los mantienes) */}
        <h5 style={{marginTop: '15px', marginBottom: '5px'}}>Dirección (Opcional)</h5>
        <div style={{ marginBottom: '10px' }}>
          <label>Dirección (saddressline1):</label>
          <input type="text" name="saddressline1" value={buyerData.saddressline1} onChange={handleChange} style={{ width: '95%', padding: '8px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Ciudad (scityname):</label>
          <input type="text" name="scityname" value={buyerData.scityname} onChange={handleChange} style={{ width: '95%', padding: '8px' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Código Departamento (wdepartmentcode):</label>
          <input type="text" name="wdepartmentcode" value={buyerData.wdepartmentcode} onChange={handleChange} style={{ width: '95%', padding: '8px' }} />
        </div>
        
        <button type="submit" style={{ padding: '10px 15px', backgroundColor: 'green', color: 'white' }}>Registrar Huésped</button>
      </form>
    </Modal>
  );
};




const ROOM_TYPES = ["Sencilla", "Doble", "Triple", "Cuadruple", "Pareja"];

const LocalBookingForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { availability, loading: availabilityLoading, error: availabilityError } = useSelector(state => state.booking);
  const { buyer: verifiedBuyer, loading: buyerLoading, error: buyerError } = useSelector(state => state.taxxa);
  const roomsSlice = useSelector(state => state.rooms); 
  const listOfRooms = roomsSlice && roomsSlice.rooms ? roomsSlice.rooms : []; 

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
  const [totalAmount, setTotalAmount] = useState(0); // Para el cálculo dinámico de la reserva actual
  
  const [createdBookingId, setCreatedBookingId] = useState(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethodLocal, setPaymentMethodLocal] = useState('cash');
  const [currentBookingTotalForPayment, setCurrentBookingTotalForPayment] = useState(0); // Total de la reserva confirmada para el pago

  const [showBuyerPopup, setShowBuyerPopup] = useState(false);
  const [confirmationOption, setConfirmationOption] = useState('payNow'); // 'payNow', 'pay50Percent', 'payAtCheckIn'


  // ... (handleVerifyOrRegisterBuyer, useEffect para buyer, handleBuyerRegistered, handleSearchAvailability, handleSelectRoom sin cambios) ...
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

  const handleSearchAvailability = () => {
    if (!checkIn || !checkOut || !roomType) {
        toast.error("Por favor, seleccione fechas y tipo de habitación.");
        return;
    }
    if (checkOut <= checkIn) {
        toast.error("La fecha de salida debe ser posterior a la fecha de entrada.");
        return;
    }
     dispatch(checkAvailability({ 
        checkIn: format(checkIn, 'yyyy-MM-dd'), 
        checkOut: format(checkOut, 'yyyy-MM-dd'), 
        roomType 
    }));
    setSelectedRoom(null); 
    setCreatedBookingId(null);
    setShowPaymentForm(false);
  };

  const handleSelectRoom = (room) => {
    setSelectedRoom(room);
  };

  const calculateLocalBookingTotal = () => {
    if (!selectedRoom || !checkIn || !checkOut) return 0;
    const nights = differenceInDays(checkOut, checkIn);
    if (nights <= 0) return 0;

    const guestCount = parseInt(adults, 10) + parseInt(children, 10);
    let pricePerPersonPerNight;

    // console.log('Calculating total: Adults:', adults, 'Children:', children, 'GuestCount:', guestCount, 'Nights:', nights);

    if (guestCount === 0) pricePerPersonPerNight = 0;
    else if (guestCount === 1) pricePerPersonPerNight = 70000;
    else if (guestCount === 2) pricePerPersonPerNight = 70000;
    else if (guestCount === 3) pricePerPersonPerNight = 60000;
    else if (guestCount >= 4) pricePerPersonPerNight = 50000;
    else pricePerPersonPerNight = 0;
    
    const calculatedTotal = pricePerPersonPerNight * guestCount * nights;
    // console.log('Calculated total:', calculatedTotal);
    return calculatedTotal;
  };

  useEffect(() => {
    if (selectedRoom && checkIn && checkOut && (parseInt(adults, 10) >= 0 || parseInt(children, 10) >= 0)) { // Permitir 0 para resetear
        const nights = differenceInDays(checkOut, checkIn);
        const currentGuestCount = parseInt(adults, 10) + parseInt(children, 10);

        if (nights > 0 && currentGuestCount > 0 && parseInt(adults, 10) >= 1) {
            const newTotal = calculateLocalBookingTotal();
            setTotalAmount(newTotal);
            // No establecer paymentAmount aquí directamente si tenemos opciones de pago
            // setPaymentAmount(newTotal); 
        } else {
            setTotalAmount(0);
            // setPaymentAmount(0);
        }
    } else {
        setTotalAmount(0);
        // setPaymentAmount(0);
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
    if (parseInt(adults, 10) <=0) {
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
      totalAmount, // Este es el total completo de la reserva
      status: 'confirmed', 
      pointOfSale: 'Local',
      // Puedes añadir un campo como 'paymentInstructions: confirmationOption' si es útil para el backend
    };

    const resultAction = await dispatch(createBooking(localBookingData));
    if (resultAction && resultAction.success && resultAction.data && resultAction.data.booking) {
      const newBooking = resultAction.data.booking;
      toast.success(`Reserva local creada con ID: ${newBooking.bookingId}`);
      setCreatedBookingId(newBooking.bookingId);
      setCurrentBookingTotalForPayment(totalAmount); // Guardar el total de ESTA reserva para el formulario de pago

      if (confirmationOption === 'payNow') {
        setPaymentAmount(totalAmount); 
        setShowPaymentForm(true);
      } else if (confirmationOption === 'pay50Percent') {
        setPaymentAmount(totalAmount * 0.50);
        setShowPaymentForm(true);
      } else if (confirmationOption === 'payAtCheckIn') {
        toast.info('Reserva confirmada. El pago se realizará en el check-in.');
        setShowPaymentForm(false);
        // Resetear formulario completo para una nueva reserva
        setCreatedBookingId(null);
        setSelectedRoom(null); 
        setBuyerSdocnoInput(''); 
        setBuyerSdocno('');
        setBuyerName('');
        setAdults(1);
        setChildren(0);
        setCheckIn(today);
        setCheckOut(tomorrow);
        setRoomType(ROOM_TYPES[0]);
        setTotalAmount(0); 
        setCurrentBookingTotalForPayment(0);
        setPaymentAmount(0);
        setConfirmationOption('payNow'); // Resetear opción de confirmación
      }
      
      // Resetear solo adultos y niños si se va a mostrar el formulario de pago,
      // para que la siguiente reserva comience con valores por defecto.
      // El totalAmount de la reserva actual ya está en currentBookingTotalForPayment.
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
    
    const resultPaymentAction = await dispatch(registerLocalPayment(paymentPayload));

    if(resultPaymentAction && resultPaymentAction.success) { // Comprobar la propiedad success
        toast.success('Pago local registrado exitosamente.'); // Toast de éxito aquí o en la acción
        setShowPaymentForm(false);
        setCreatedBookingId(null);
        setSelectedRoom(null); 
        setTotalAmount(0); 
        setCurrentBookingTotalForPayment(0); 
        setPaymentAmount(0);
        setBuyerSdocnoInput(''); 
        setBuyerSdocno('');
        setBuyerName('');
        setAdults(1);
        setChildren(0);
        setCheckIn(today);
        setCheckOut(tomorrow);
        setRoomType(ROOM_TYPES[0]);
        setConfirmationOption('payNow'); 
    } else {
        toast.error(resultPaymentAction.message || 'Error al registrar el pago local.');
    }
  };

  const availableRooms = availability && !availabilityLoading && !availabilityError ? availability.filter(room => room.isAvailable) : [];

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: 'auto' }}>
      <BuyerRegistrationFormPopup 
        isOpen={showBuyerPopup} 
        onClose={() => setShowBuyerPopup(false)}
        onBuyerRegistered={handleBuyerRegistered}
        initialSdocno={buyerSdocnoInput}
      />
      <h2>Crear Reserva Local (Recepción)</h2>

      {/* ... (Sección 1: Búsqueda de Disponibilidad sin cambios) ... */}
      <fieldset style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc' }}>
        <legend>1. Buscar Disponibilidad</legend>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <div>
            <label>Fecha de Entrada:</label><br />
            <DatePicker selected={checkIn} onChange={(date) => setCheckIn(date)} dateFormat="yyyy-MM-dd" minDate={today} />
          </div>
          <div>
            <label>Fecha de Salida:</label><br />
            <DatePicker selected={checkOut} onChange={(date) => setCheckOut(date)} dateFormat="yyyy-MM-dd" minDate={checkIn || today} />
          </div>
          <div>
            <label>Tipo de Habitación:</label><br />
            <select value={roomType} onChange={(e) => setRoomType(e.target.value)} style={{ padding: '8px' }}>
              {ROOM_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>
        <button onClick={handleSearchAvailability} disabled={availabilityLoading} style={{ padding: '10px 15px' }}>
          {availabilityLoading ? 'Buscando...' : 'Buscar Disponibilidad'}
        </button>
        {availabilityError && <p style={{ color: 'red' }}>Error: {availabilityError}</p>}
      </fieldset>

      {/* ... (Sección 2: Mostrar Habitaciones Disponibles sin cambios) ... */}
       {availableRooms.length > 0 && !selectedRoom && (
        <fieldset style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc' }}>
          <legend>2. Seleccionar Habitación</legend>
          {availableRooms.map(room => (
            <div key={room.roomNumber} style={{ border: '1px solid #eee', padding: '10px', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p><strong>Habitación N°: {room.roomNumber}</strong> ({room.type})</p>
                <p>Capacidad: {room.capacity} </p>
              </div>
              <button onClick={() => handleSelectRoom(room)} style={{ padding: '8px 12px' }}>Seleccionar</button>
            </div>
          ))}
        </fieldset>
      )}
       {availability && availableRooms.length === 0 && !availabilityLoading && (
         <p>No hay habitaciones disponibles para los criterios seleccionados.</p>
       )}


      {/* Sección 3: Datos de la Reserva y Huésped */}
      {selectedRoom && !createdBookingId && (
        <fieldset style={{ marginBottom: '20px', padding: '15px', border: '1px solid #ccc' }}>
          <legend>3. Detalles de Reserva para Habitación N°{selectedRoom.roomNumber}</legend>
          {/* ... (Inputs de sdocno y nombre del huésped sin cambios) ... */}
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="buyerSdocnoInput">Documento del Huésped (sdocno):</label><br />
            <div style={{display: 'flex', gap: '10px'}}>
                <input 
                    type="text" 
                    id="buyerSdocnoInput" 
                    value={buyerSdocnoInput} 
                    onChange={(e) => setBuyerSdocnoInput(e.target.value)} 
                    style={{ padding: '8px', flexGrow: 1 }}
                    placeholder="Ingrese documento y verifique"
                />
                <button onClick={handleVerifyOrRegisterBuyer} disabled={buyerLoading} style={{padding: '8px 12px'}}>
                    {buyerLoading ? 'Verificando...' : 'Verificar/Registrar'}
                </button>
            </div>
            {buyerSdocno && buyerName && <p style={{color: 'green'}}>Huésped: {buyerName} ({buyerSdocno})</p>}
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="buyerName">Nombre del Huésped:</label><br />
            <input type="text" id="buyerName" value={buyerName} readOnly style={{ padding: '8px', width: '95%', backgroundColor: '#e9ecef' }}/>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label htmlFor="adults">Adultos:</label><br />
              <input type="number" id="adults" value={adults} onChange={(e) => setAdults(e.target.value)} min="1" style={{ padding: '8px', width: '80px' }}/>
            </div>
            <div>
              <label htmlFor="children">Niños:</label><br />
              <input type="number" id="children" value={children} onChange={(e) => setChildren(e.target.value)} min="0" style={{ padding: '8px', width: '80px' }}/>
            </div>
          </div>
           <p style={{ fontWeight: 'bold' }}>Total Estimado: ${totalAmount.toFixed(2)}</p>

          {/* NUEVO: Opciones de Confirmación */}
          <div style={{ marginBottom: '15px', marginTop: '10px' }}>
            <label htmlFor="confirmationOption">Opciones de Confirmación:</label><br />
            <select 
              id="confirmationOption" 
              value={confirmationOption} 
              onChange={(e) => setConfirmationOption(e.target.value)} 
              style={{ padding: '8px', width: '100%' }}
            >
              <option value="payNow">Pagar Total Ahora</option>
              <option value="pay50Percent">Pagar 50% Ahora</option>
              <option value="payAtCheckIn">Pagar en el Check-in</option>
            </select>
          </div>

          <button 
            onClick={handleSubmitLocalBooking} 
            disabled={!buyerSdocno || totalAmount <= 0 || (parseInt(adults,10) + parseInt(children,10) === 0) || parseInt(adults,10) < 1} 
            style={{ padding: '10px 15px', backgroundColor: 'green', color: 'white' }}
          >
            Confirmar y Crear Reserva Local
          </button>
        </fieldset>
      )}
      
      {/* Sección 4: Formulario de Pago Local */}
      {showPaymentForm && createdBookingId && (
        <fieldset style={{ padding: '15px', border: '1px solid #007bff' }}>
          <legend style={{ color: '#007bff' }}>4. Registrar Pago para Reserva ID: {createdBookingId}</legend>
          <div style={{ marginBottom: '10px' }}>
            {/* Usar currentBookingTotalForPayment para la etiqueta */}
            <label htmlFor="paymentAmount">Monto Pagado (${currentBookingTotalForPayment.toFixed(2)} total):</label><br />
            <input type="number" id="paymentAmount" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} style={{ padding: '8px', width: '95%' }}/>
          </div>
          <div style={{ marginBottom: '10px' }}>
            <label htmlFor="paymentMethodLocal">Método de Pago:</label><br />
            <select id="paymentMethodLocal" value={paymentMethodLocal} onChange={e => setPaymentMethodLocal(e.target.value)} style={{ padding: '8px', width: '100%' }}>
              <option value="cash">Efectivo</option>
              <option value="credit_card">Tarjeta Crédito (Local)</option>

                           <option value="debit_card">Tarjeta Débito (Local)</option>
              <option value="transfer">Transferencia</option>
            </select>
          </div>
          <button onClick={handleRegisterLocalPayment} style={{ padding: '10px 15px', backgroundColor: '#007bff', color: 'white' }}>
            Registrar Pago
          </button>
        </fieldset>
      )}
    </div>
  );
};

export default LocalBookingForm;