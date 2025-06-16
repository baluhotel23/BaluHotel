import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { checkAvailability, createBooking, getBookingById } from '../../Redux/Actions/bookingActions';
import { registerLocalPayment } from '../../Redux/Actions/paymentActions';
import {
  fetchBuyerByDocument,
  createBuyer,
  fetchCountries,
  fetchDepartments,
  fetchMunicipalities,
  validateLocation
} from "../../Redux/Actions/taxxaActions";
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
const BuyerRegistrationFormPopup = ({
  isOpen,
  onClose,
  onBuyerRegistered,
  initialSdocno,
}) => {
  const dispatch = useDispatch();

  const {
    countries,
    departmentsCache,
    municipalitiesCache,
    loadingCountries,
    loadingDepartments,
    loadingMunicipalities
  } = useSelector(state => state.taxxa);

  const [buyerFormData, setBuyerFormData] = useState({
    sdocno: initialSdocno || "",
    wlegalorganizationtype: "person",
    scostumername: "",
    stributaryidentificationkey: "ZZ",  // 🔧 CORREGIR DEFAULT
    sfiscalresponsibilities: "R-99-PN",
    sfiscalregime: "49",  // 🔧 CORREGIR DEFAULT
    wdoctype: "CC",
    scorporateregistrationschemename: "",
    scontactperson: "",
    selectronicmail: "",
    stelephone: "",
    saddressline1: "",
    scityname: "",
    wdepartmentcode: "",
    wtowncode: "",  // 🆕 AGREGAR ESTE CAMPO
  });

  const [selectedCountry, setSelectedCountry] = useState('CO');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');

  // 🆕 AGREGAR ESTADOS PARA LISTAS LOCALES
  const [departmentsList, setDepartmentsList] = useState([]);
  const [municipalitiesList, setMunicipalitiesList] = useState([]);
  const [localLoadingMunicipalities, setLocalLoadingMunicipalities] = useState(false);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchCountries());
      dispatch(fetchDepartments('CO'));
    }
  }, [isOpen, dispatch]);

  useEffect(() => {
    if (initialSdocno) {
      setBuyerFormData((prev) => ({ ...prev, sdocno: initialSdocno }));
    }
  }, [initialSdocno, isOpen]);

  // 🔧 CORREGIR EFECTOS PARA OBTENER LISTAS
  useEffect(() => {
    if (selectedCountry) {
      dispatch(fetchDepartments(selectedCountry));
    }
  }, [selectedCountry, dispatch]);

  useEffect(() => {
    if (selectedDepartment) {
      dispatch(fetchMunicipalities(selectedDepartment));
    }
  }, [selectedDepartment, dispatch]);

  // 🆕 EFECTOS PARA ACTUALIZAR LISTAS LOCALES DESDE REDUX
  useEffect(() => {
    const departments = departmentsCache[`departments_${selectedCountry}`] || [];
    setDepartmentsList(departments);
    console.log('🏛️ [BUYER] Departamentos actualizados:', departments.length);
  }, [departmentsCache, selectedCountry]);

  useEffect(() => {
  // 🔧 CORREGIR LA CLAVE PARA COINCIDIR CON EL REDUCER
  const cacheKey = `municipalities_${selectedDepartment}__50`; // ← Doble underscore
  const municipalities = municipalitiesCache[cacheKey] || [];
  
  console.log('🔍 [BUYER] Cache key buscado:', cacheKey);
  console.log('🔍 [BUYER] Claves disponibles en cache:', Object.keys(municipalitiesCache));
  console.log('🏙️ [BUYER] Municipios encontrados:', municipalities.length);
  
  setMunicipalitiesList(municipalities);
}, [municipalitiesCache, selectedDepartment]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setBuyerFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 🔧 CORREGIR handleDepartmentChange
  const handleDepartmentChange = async (e) => {
    const departmentCode = e.target.value;
    setSelectedDepartment(departmentCode);
    setSelectedMunicipality('');
    setMunicipalitiesList([]); // ✅ AHORA ESTÁ DEFINIDA
    
    setBuyerFormData(prevData => ({
      ...prevData,
      wdepartmentcode: departmentCode,
      wtowncode: '',
      scityname: ''
    }));
    
    if (departmentCode) {
      setLocalLoadingMunicipalities(true); // ✅ AHORA ESTÁ DEFINIDA
      try {
        console.log('🏛️ [BUYER] Cargando municipios para departamento:', departmentCode);
        
        const municipalitiesData = await dispatch(fetchMunicipalities(departmentCode));
        
        if (municipalitiesData && Array.isArray(municipalitiesData)) {
          setMunicipalitiesList(municipalitiesData);
          console.log('🏙️ [BUYER] Municipios cargados:', municipalitiesData.length);
        } else {
          console.warn('⚠️ [BUYER] No se recibieron municipios válidos');
          setMunicipalitiesList([]);
        }
      } catch (error) {
        console.error('❌ [BUYER] Error cargando municipios:', error);
        setMunicipalitiesList([]);
      } finally {
        setLocalLoadingMunicipalities(false); // ✅ AHORA ESTÁ DEFINIDA
      }
    }
  };

  // 🔧 CORREGIR handleMunicipalityChange
  const handleMunicipalityChange = (e) => {
    const municipalityCode = e.target.value;
    setSelectedMunicipality(municipalityCode);
    
    const selectedMunicipalityData = municipalitiesList.find(
      muni => muni.code === municipalityCode || muni.wtowncode === municipalityCode
    );
    
    setBuyerFormData(prevData => ({
      ...prevData,
      wtowncode: municipalityCode,
      scityname: selectedMunicipalityData?.name || ''
    }));
    
    console.log('🏙️ [BUYER] Ciudad seleccionada:', {
      code: municipalityCode,
      name: selectedMunicipalityData?.name
    });
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    // 🔍 EXTRAER Y VALIDAR CAMPOS OBLIGATORIOS
    const {
      sdocno,
      scostumername,
      selectronicmail,
      wdoctype,
      scorporateregistrationschemename,
      scontactperson,
      stelephone,
    } = buyerFormData;
    
    // ✅ VALIDACIÓN DE CAMPOS OBLIGATORIOS
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
      .filter(([field]) => !buyerFormData[field] || buyerFormData[field].trim() === '')
      .map(([, label]) => label);
    
    if (missingFields.length > 0) {
      toast.error(`Por favor, complete los siguientes campos: ${missingFields.join(', ')}`);
      return;
    }
    
    // 📧 VALIDACIÓN DE EMAIL
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(selectronicmail)) {
      toast.error('Por favor, ingrese un email válido');
      return;
    }
    
    // 📱 VALIDACIÓN DE TELÉFONO (opcional, básica)
    if (stelephone.length < 7) {
      toast.error('Por favor, ingrese un teléfono válido (mínimo 7 dígitos)');
      return;
    }
    
    console.log('🔍 [BUYER] Iniciando proceso de registro:', {
      documento: sdocno,
      nombre: scostumername,
      email: selectronicmail,
      tieneUbicacion: !!(buyerFormData.wtowncode && buyerFormData.wdepartmentcode)
    });

    // 🌍 VALIDACIÓN DE UBICACIÓN (OPCIONAL Y NO BLOQUEANTE)
    let locationValidation = { isValid: true, errors: [] };
    
    if (buyerFormData.wtowncode && buyerFormData.wdepartmentcode) {
      try {
        console.log('🔍 [BUYER] Validando ubicación DIAN:', {
          municipalityCode: buyerFormData.wtowncode,
          departmentCode: buyerFormData.wdepartmentcode,
          countryCode: selectedCountry
        });
        
        locationValidation = await dispatch(validateLocation({
          municipalityCode: buyerFormData.wtowncode,
          departmentCode: buyerFormData.wdepartmentcode,
          countryCode: selectedCountry || 'CO'
        }));
        
        console.log('📊 [BUYER] Resultado validación ubicación:', locationValidation);
        
        if (locationValidation && !locationValidation.isValid) {
          // 🔧 MOSTRAR WARNING PERO NO BLOQUEAR
          toast.warning(`Advertencia en ubicación: ${locationValidation.errors.join(', ')}`);
          console.warn('⚠️ [BUYER] Ubicación con advertencias, continuando...', locationValidation.errors);
          
          // 🤔 PREGUNTAR AL USUARIO SI QUIERE CONTINUAR
          const userConfirms = window.confirm(
            `Se detectaron las siguientes advertencias en la ubicación:\n\n${locationValidation.errors.join('\n')}\n\n¿Desea continuar con el registro?`
          );
          
          if (!userConfirms) {
            console.log('👤 [BUYER] Usuario canceló por advertencias de ubicación');
            return;
          }
        } else if (locationValidation && locationValidation.isValid) {
          console.log('✅ [BUYER] Ubicación validada correctamente');
          toast.success('Ubicación validada correctamente');
        }
        
      } catch (validationError) {
        console.warn('⚠️ [BUYER] Error en validación DIAN (continuando):', validationError);
        toast.warning('No se pudo validar la ubicación, pero se continuará con el registro');
        // No bloquear el proceso por errores de validación
      }
    } else {
      console.log('ℹ️ [BUYER] Sin datos de ubicación para validar');
    }

    // 🚀 CREAR BUYER
    console.log('📝 [BUYER] Enviando datos de registro:', {
      ...buyerFormData,
      locationValidation: locationValidation.isValid ? 'válida' : 'con advertencias'
    });
    
    const resultAction = await dispatch(createBuyer(buyerFormData));
    
    console.log('📬 [BUYER] Respuesta del servidor:', resultAction);
    
    // ✅ VERIFICAR RESULTADO
    if (resultAction && resultAction.success) {
      // 🎉 ÉXITO
      console.log('✅ [BUYER] Registro exitoso:', resultAction.data);
      
      toast.success(
        `¡Huésped registrado exitosamente! ${locationValidation.isValid ? '✅ Ubicación validada' : '⚠️ Con advertencias de ubicación'}`
      );
      
      // 🔄 CALLBACK Y CIERRE
      if (onBuyerRegistered && typeof onBuyerRegistered === 'function') {
        onBuyerRegistered(resultAction.data);
      }
      
      // 🚪 CERRAR MODAL
      onClose();
      
      // 🔄 RESET COMPLETO DEL FORMULARIO
      resetForm();
      
    } else {
      // ❌ ERROR DEL SERVIDOR
      const errorMessage = resultAction?.message || 
                          resultAction?.error || 
                          'Error desconocido al registrar el huésped';
      
      console.error('❌ [BUYER] Error del servidor:', {
        resultAction,
        message: errorMessage
      });
      
      toast.error(`Error al registrar: ${errorMessage}`);
    }
    
  } catch (networkError) {
    // 🌐 ERROR DE RED O CONEXIÓN
    console.error('❌ [BUYER] Error de red en handleSubmit:', networkError);
    
    if (networkError.code === 'NETWORK_ERROR') {
      toast.error('Error de conexión. Verifique su internet e intente nuevamente.');
    } else if (networkError.response?.status === 500) {
      toast.error('Error interno del servidor. Intente nuevamente en unos momentos.');
    } else if (networkError.response?.status === 400) {
      toast.error('Datos inválidos. Revise la información ingresada.');
    } else {
      toast.error('Error inesperado. Intente nuevamente.');
    }
  }
};

// 🔄 FUNCIÓN AUXILIAR PARA RESET COMPLETO
const resetForm = () => {
  console.log('🔄 [BUYER] Reseteando formulario completo');
  
  setBuyerFormData({
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
  
  // Reset selectores
  setSelectedCountry('CO');
  setSelectedDepartment('');
  setSelectedMunicipality('');
  
  // Reset listas locales
  setMunicipalitiesList([]);
  setLocalLoadingMunicipalities(false);
  
  console.log('✅ [BUYER] Formulario reseteado completamente');
};

  const inputStyle = {
    width: "calc(100% - 16px)",
    padding: "8px",
    marginBottom: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  };
  const labelStyle = {
    display: "block",
    marginBottom: "5px",
    fontWeight: "bold",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h4 style={{ marginTop: 0, marginBottom: "20px" }}>
        Registrate para reservar
      </h4>
      <form onSubmit={handleSubmit}>
        <div>
          <label style={labelStyle}>Documento (sdocno):*</label>
          <input
            type="text"
            name="sdocno"
            value={buyerFormData.sdocno}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>
        
        <div>
          <label style={labelStyle}>Tipo Documento (wdoctype):*</label>
          <select
            name="wdoctype"
            value={buyerFormData.wdoctype}
            onChange={handleChange}
            required
            style={inputStyle}
          >
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
          <input
            type="text"
            name="scostumername"
            value={buyerFormData.scostumername}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>
        
        <div>
          <label style={labelStyle}>Email (selectronicmail):*</label>
          <input
            type="email"
            name="selectronicmail"
            value={buyerFormData.selectronicmail}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>
        
        <div>
          <label style={labelStyle}>Teléfono (stelephone):*</label>
          <input
            type="text"
            name="stelephone"
            value={buyerFormData.stelephone}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>
        
        <div>
          <label style={labelStyle}>Tipo Organización Legal (wlegalorganizationtype):*</label>
          <select
            name="wlegalorganizationtype"
            value={buyerFormData.wlegalorganizationtype}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="person">Persona</option>
            <option value="company">Empresa</option>
          </select>
        </div>
        
        <div>
          <label style={labelStyle}>Clave Identificación Tributaria (stributaryidentificationkey):*</label>
          <select
            name="stributaryidentificationkey"
            value={buyerFormData.stributaryidentificationkey}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="O-1">O-1 (IVA)</option>
            <option value="O-4">O-4 (INC)</option>
            <option value="ZZ">ZZ (No aplica)</option>
            <option value="ZA">ZA (IVA e INC)</option>
          </select>
        </div>
        
        <div>
          <label style={labelStyle}>Responsabilidades Fiscales (sfiscalresponsibilities):*</label>
          <select
            name="sfiscalresponsibilities"
            value={buyerFormData.sfiscalresponsibilities}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="R-99-PN">R-99-PN (No responsable)</option>
            <option value="O-13">O-13 (Gran contribuyente)</option>
            <option value="O-15">O-15 (Autorretenedor)</option>
            <option value="O-23">O-23 (Agente de retención IVA)</option>
            <option value="O-47">O-47 (Régimen Simple de Tributación)</option>
          </select>
        </div>
        
        <div>
          <label style={labelStyle}>Régimen Fiscal (sfiscalregime):*</label>
          <select
            name="sfiscalregime"
            value={buyerFormData.sfiscalregime}
            onChange={handleChange}
            required
            style={inputStyle}
          >
            <option value="48">48 - Impuesto sobre las ventas – IVA</option>
            <option value="49">49 - No responsable de IVA</option>
          </select>
        </div>
        
        <div>
          <label style={labelStyle}>Nombre Comercial:</label>
          <input
            type="text"
            name="scorporateregistrationschemename"
            value={buyerFormData.scorporateregistrationschemename}
            onChange={handleChange}
            required
            style={inputStyle}
            placeholder="Ej: Registro Mercantil"
          />
        </div>
        
        <div>
          <label style={labelStyle}>Persona de Contacto (scontactperson):*</label>
          <input
            type="text"
            name="scontactperson"
            value={buyerFormData.scontactperson}
            onChange={handleChange}
            required
            style={inputStyle}
          />
        </div>

        {/* 🆕 SECCIÓN DE UBICACIÓN CON SELECTORES DIAN */}
        <div style={{ 
          marginTop: "20px", 
          padding: "15px", 
          backgroundColor: "#f9f9f9", 
          borderRadius: "8px",
          border: "1px solid #e0e0e0"
        }}>
          <h5 style={{ 
            marginTop: 0, 
            marginBottom: "15px", 
            color: "#333",
            fontSize: "16px",
            fontWeight: "bold"
          }}>
            📍 Ubicación (Opcional)
          </h5>
          
          {/* Selector de Departamento */}
          <div>
            <label style={labelStyle}>Departamento:</label>
            <select
              value={selectedDepartment}
              onChange={handleDepartmentChange}
              disabled={loadingDepartments}
              style={{
                ...inputStyle,
                backgroundColor: loadingDepartments ? "#f5f5f5" : "white"
              }}
            >
              <option value="">Seleccionar departamento...</option>
              {departmentsList.map(dept => (
                <option key={dept.code} value={dept.code}>
                  {dept.name}
                </option>
              ))}
            </select>
            {loadingDepartments && (
              <p style={{ 
                fontSize: "12px", 
                color: "#0066cc", 
                margin: "5px 0",
                fontStyle: "italic"
              }}>
                ⏳ Cargando departamentos...
              </p>
            )}
          </div>

          {/* Selector de Municipio */}
          <div>
            <label style={labelStyle}>Ciudad/Municipio:</label>
            <select
              value={selectedMunicipality}
              onChange={handleMunicipalityChange}
              disabled={localLoadingMunicipalities || !selectedDepartment}
              style={{
                ...inputStyle,
                backgroundColor: (localLoadingMunicipalities || !selectedDepartment) ? "#f5f5f5" : "white"
              }}
            >
              <option value="">
                {!selectedDepartment 
                  ? "Primero seleccione un departamento..." 
                  : "Seleccionar ciudad..."
                }
              </option>
              {municipalitiesList.map(muni => (
                <option key={muni.code || muni.wtowncode} value={muni.code || muni.wtowncode}>
                  {muni.name}
                </option>
              ))}
            </select>
            {localLoadingMunicipalities && (
              <p style={{ 
                fontSize: "12px", 
                color: "#0066cc", 
                margin: "5px 0",
                fontStyle: "italic"
              }}>
                ⏳ Cargando ciudades...
              </p>
            )}
          </div>

          {/* Campo de Dirección */}
          <div>
            <label style={labelStyle}>Dirección completa:</label>
            <input
              type="text"
              name="saddressline1"
              value={buyerFormData.saddressline1}
              onChange={handleChange}
              style={inputStyle}
              placeholder="Ej: Calle 123 #45-67, Barrio Centro"
            />
          </div>

          {/* Campos ocultos para debug */}
          {(buyerFormData.wdepartmentcode || buyerFormData.wtowncode) && (
            <div style={{
              marginTop: "10px",
              padding: "8px",
              backgroundColor: "#e8f4fd",
              borderRadius: "4px",
              border: "1px solid #b3d9ff",
              fontSize: "12px"
            }}>
              <strong>🔍 Ubicación seleccionada:</strong><br/>
              Departamento: {buyerFormData.wdepartmentcode}<br/>
              Ciudad: {buyerFormData.wtowncode} ({buyerFormData.scityname})
            </div>
          )}
        </div>

        <button
          type="submit"
          style={{
            padding: "12px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            width: "auto",
            display: "block",
            marginLeft: "auto",
            marginRight: "auto",
            marginTop: "25px",
            fontSize: "16px",
            fontWeight: "bold",
            transition: "background-color 0.2s ease"
          }}
          onMouseOver={(e) => e.target.style.backgroundColor = "#45a049"}
          onMouseOut={(e) => e.target.style.backgroundColor = "#4CAF50"}
        >
          ✅ Registrar Huésped
        </button>
      </form>
    </Modal>
  );
};

const ROOM_TYPES = ["Doble", "Triple", "Cuadruple", "Pareja"];

const LocalBookingForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  // ⭐ CORREGIR SELECTORES PARA OBTENER LAS HABITACIONES
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

  const isLoadingAvailability = loading.availability;
  const availabilityError = errors.availability;
  
  // ⭐ DEBUGEAR AVAILABILITY
   console.log('🏨 [LOCAL] Availability from Redux:', {
    availability: availability?.length,
    isLoadingAvailability,
    availabilityError,
    availabilitySummary
  });

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


   useEffect(() => {
    console.log('🚀 [LOCAL] Component mounted, loading all rooms...');
    // Cargar todas las habitaciones por defecto
    setTimeout(() => {
      handleSearchAvailability();
    }, 500);
  }, [dispatch]);

   const getStaffFriendlyStatus = (room) => {
    if (!room.isActive) {
      return { text: 'Inactiva', color: 'bg-gray-100 text-gray-800', icon: '🚫' };
    }
    
    if (room.status === 'Limpia' && room.isAvailable) {
      return { text: 'Disponible', color: 'bg-green-100 text-green-800', icon: '✅' };
    }
    
    if (room.status === 'Para Limpiar' && room.isAvailable) {
      return { text: 'Para Limpiar', color: 'bg-yellow-100 text-yellow-800', icon: '🧹' };
    }
    
    if (room.status === 'Ocupada') {
      return { text: 'Ocupada', color: 'bg-red-100 text-red-800', icon: '👥' };
    }
    
    if (room.status === 'Reservada') {
      return { text: 'Reservada', color: 'bg-blue-100 text-blue-800', icon: '📝' };
    }
    
    if (room.status === 'Mantenimiento') {
      return { text: 'Mantenimiento', color: 'bg-orange-100 text-orange-800', icon: '🔧' };
    }
    
    return { text: 'Desconocido', color: 'bg-gray-100 text-gray-800', icon: '❓' };
  };
  // Función para manejar selección de habitación mejorada
  const handleSelectRoom = (room) => {
    console.log('🏨 [LOCAL] Habitación seleccionada:', room);
    
    // ⭐ VALIDAR SI LA HABITACIÓN ES RESERVABLE
    if (!room.isActive) {
      toast.error(`Habitación ${room.roomNumber} está inactiva y no se puede reservar.`);
      return;
    }
    
    if (!room.isAvailable) {
      toast.warning(`Habitación ${room.roomNumber} no está disponible para reserva.`);
      return;
    }
    
    // ⭐ MOSTRAR INFORMACIÓN ADICIONAL DEL ESTADO
    const statusInfo = getStaffFriendlyStatus(room);
    
    if (room.status === 'Para Limpiar') {
      toast.info(`Habitación ${room.roomNumber} seleccionada. Estado: ${statusInfo.text} - Se limpiará antes del check-in.`);
    } else {
      toast.success(`Habitación ${room.roomNumber} seleccionada. Estado: ${statusInfo.text}`);
    }
    
    setSelectedRoom(room);
  };

  // ⭐ MEJORAR availableRooms CON VERIFICACIÓN
  const availableRooms = React.useMemo(() => {
    console.log('🔄 [LOCAL] Calculando habitaciones disponibles...');
    console.log('📊 Availability:', availability?.length);
    console.log('🔍 isLoadingAvailability:', isLoadingAvailability);
    console.log('❌ availabilityError:', availabilityError);
    
    if (availability && Array.isArray(availability) && !isLoadingAvailability && !availabilityError) {
      // ⭐ PARA STAFF LOCAL: MOSTRAR TODAS LAS HABITACIONES (DISPONIBLES Y NO DISPONIBLES)
      const allRooms = availability;
      
      console.log('✅ [LOCAL] Habitaciones procesadas:', {
        total: allRooms.length,
        disponibles: allRooms.filter(r => r.isAvailable).length,
        ocupadas: allRooms.filter(r => r.status === 'Ocupada').length,
        paraLimpiar: allRooms.filter(r => r.status === 'Para Limpiar').length,
        mantenimiento: allRooms.filter(r => r.status === 'Mantenimiento').length
      });
      
      return allRooms;
    }
    
    console.log('❌ [LOCAL] No hay habitaciones disponibles');
    return [];
  }, [availability, isLoadingAvailability, availabilityError]);

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
    
    console.log('🔍 [LOCAL] Buscando disponibilidad...');
    
    // ⭐ CREAR OBJETO DE PARÁMETROS FORMATEADO
    const searchParams = {
      checkIn: format(checkIn, 'yyyy-MM-dd'), 
      checkOut: format(checkOut, 'yyyy-MM-dd'), 
      roomType 
    };
    
    console.log('📅 [LOCAL] Search Params:', searchParams);
    
    try {
      const result = await dispatch(checkAvailability(searchParams));
      console.log('🎯 [LOCAL] Dispatch result:', result);
    } catch (error) {
      console.error('❌ [LOCAL] Error in dispatch:', error);
    }
    
    setSelectedRoom(null); 
    setCreatedBookingId(null);
    setShowPaymentForm(false);
  };

useEffect(() => {
    console.log('🔍 [LOCAL] Current state:', {
      availability: availability?.length,
      isLoadingAvailability,
      availabilityError,
      availabilitySummary,
      selectedRoom: selectedRoom?.roomNumber
    });
  }, [availability, isLoadingAvailability, availabilityError, availabilitySummary, selectedRoom]);

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
    
    // ⭐ VERIFICAR ÉXITO DE FORMA MÁS SIMPLE
    if (resultPaymentAction && resultPaymentAction.success) {
      const isFullPayment = parseFloat(paymentAmount) >= currentBookingTotalForPayment;
      const remainingAmount = currentBookingTotalForPayment - parseFloat(paymentAmount);
      
      if (isFullPayment) {
        toast.success('¡Pago completo registrado exitosamente! Reserva totalmente pagada.');
      } else {
        toast.success(`Pago parcial registrado exitosamente. Restante: $${remainingAmount.toFixed(2)}`);
      }
      
      // ⭐ RESETEAR FORMULARIO PRIMERO
      resetFormToInitialState();
      
      // ⭐ NAVEGACIÓN SIMPLE Y DIRECTA
      setTimeout(() => {
        navigate('/dashboard', { replace: true });
      }, 3000); // Dar tiempo para que se vea el toast
      
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
                  disabled={isLoadingAvailability}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 transform hover:-translate-y-0.5 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoadingAvailability ? '🔍 Buscando...' : '🔍 Buscar'}
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
      <div className="ml-auto bg-blue-100 text-blue-800 px-4 py-1 rounded-full text-sm font-medium">
        {availableRooms.length} habitación(es) para {format(checkIn, 'dd/MM/yyyy')} - {format(checkOut, 'dd/MM/yyyy')}
      </div>
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
{availability && availableRooms.length === 0 && !isLoadingAvailability && (
  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-8 mb-8 text-center">
    <div className="text-6xl mb-4">😔</div>
    <h3 className="text-2xl font-bold text-orange-800 mb-2">No hay habitaciones disponibles</h3>
    <p className="text-orange-600 text-lg">Para los criterios seleccionados. Intente con otras fechas.</p>
  </div>
)}

{/* General Room Status with Upcoming Bookings */}
{availability && availability.length > 0 && (
  <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
    <div className="flex items-center gap-3 mb-6">
      <div className="bg-indigo-100 p-2 rounded-lg">
        <span className="text-2xl">📊</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-800">Estado General de Habitaciones</h2>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {availability.map(room => (
        <div 
          key={room.roomNumber}
          className={`border rounded-lg p-4 ${
            room.isAvailable ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
          }`}
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-xl">
              Hab. {room.roomNumber} 
              <span className="text-sm font-normal ml-2">({room.type})</span>
            </h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              room.isAvailable ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
            }`}>
              {room.isAvailable ? 'Disponible' : room.status || 'No Disponible'}
            </span>
          </div>
          
          {room.bookedDates && room.bookedDates.length > 0 ? (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Próximas reservas:</p>
              <ul className="space-y-2">
                {room.bookedDates.map((booking, idx) => (
                  <li key={idx} className="bg-white border border-gray-200 rounded px-3 py-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-800 font-medium">#{booking.bookingId}</span>
                      <span className="text-gray-600">
                        {new Date(booking.checkIn).toLocaleDateString()} - {new Date(booking.checkOut).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Sin reservas próximas</p>
          )}
          
          <div className="mt-3 flex justify-end">
            <button 
              onClick={() => handleSelectRoom(room)}
              disabled={!room.isAvailable}
              className={`text-sm px-3 py-1 rounded ${
                selectedRoom && selectedRoom.roomNumber === room.roomNumber 
                  ? 'bg-blue-600 text-white' 
                  : room.isAvailable 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {selectedRoom && selectedRoom.roomNumber === room.roomNumber ? 'Seleccionada' : 'Seleccionar'}
            </button>
          </div>
        </div>
      ))}
    </div>
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