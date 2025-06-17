import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { createSellerData } from '../../Redux/Actions/taxxaActions';
import DashboardLayout from '../Dashboard/DashboardLayout';


const HotelSetting = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  // 🔧 ESTADO SIMPLIFICADO - Solo campos esenciales
  const [formData, setFormData] = useState({
    // Datos básicos del hotel
    ssellername: '',
    ssellerbrand: '',
    scontactperson: '',
    stelephone: '',
    
    // Datos fiscales (con valores por defecto)
    sdocno: user?.n_document || '',
    sdoctype: 31, // NIT por defecto
    wlegalorganizationtype: 'company',
    sfiscalresponsibilities: 'O-13',
    stributaryidentificationkey: '01',
    sfiscalregime: '48',
    scorporateregistrationschemename: 'DIAN',
    
    // Contacto
    selectronicmail: user?.email || '',
    
    // Dirección básica
    saddressline1: '',
    scityname: '',
    wdepartmentcode: '',
    wtowncode: '',
    saddresszip: '',
    sdepartmentname: ''
  });

  // 🔧 ESTADOS DE CONTROL SIMPLES
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [sellerExists, setSellerExists] = useState(false);

  // 🔧 OPCIONES ESTÁTICAS SIMPLIFICADAS
  const organizationTypes = [
    { value: 'company', label: 'Persona Jurídica' },
    { value: 'person', label: 'Persona Natural' }
  ];

  const fiscalResponsibilities = [
    { value: 'O-13', label: 'O-13 - Gran contribuyente' },
    { value: 'O-15', label: 'O-15 - Autorretenedor' },
    { value: 'O-23', label: 'O-23 - Agente de retención IVA' },
    { value: 'R-99-PN', label: 'R-99-PN - No responsable' }
  ];

  // 🔧 VERIFICAR SI EL SELLER YA EXISTE
  const checkExistingSeller = async () => {
    if (!formData.sdocno) return;
    
    try {
      // Aquí podrías agregar una action para verificar si existe
      // Por ahora asumimos que no existe
      setSellerExists(false);
    } catch (error) {
      console.log('Seller no existe o error en verificación');
      setSellerExists(false);
    }
  };

  // 🔧 MANEJAR CAMBIOS EN EL FORMULARIO
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // 🔧 VALIDACIÓN SIMPLE
  const validateForm = () => {
    const requiredFields = [
      'ssellername',
      'scontactperson', 
      'selectronicmail',
      'stelephone',
      'sdocno'
    ];

    const missingFields = requiredFields.filter(field => !formData[field]?.trim());
    
    if (missingFields.length > 0) {
      toast.error('Por favor complete todos los campos obligatorios');
      return false;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.selectronicmail)) {
      toast.error('Por favor ingrese un email válido');
      return false;
    }

    return true;
  };

  // 🔧 CONSTRUIR BODY PARA EL BACKEND
  const buildRequestBody = () => {
    return {
      // Datos básicos
      wlegalorganizationtype: formData.wlegalorganizationtype,
      sfiscalresponsibilities: formData.sfiscalresponsibilities,
      sdocno: formData.sdocno,
      sdoctype: parseInt(formData.sdoctype),
      ssellername: formData.ssellername,
      ssellerbrand: formData.ssellerbrand || formData.ssellername,
      scontactperson: formData.scontactperson,
      saddresszip: formData.saddresszip,
      wdepartmentcode: formData.wdepartmentcode,
      wtowncode: formData.wtowncode,
      scityname: formData.scityname,
      
      // Estructura anidada que espera el backend
      jcontact: {
        selectronicmail: formData.selectronicmail,
        jregistrationaddress: {
          wdepartmentcode: formData.wdepartmentcode,
          scityname: formData.scityname,
          saddressline1: formData.saddressline1,
          scountrycode: 'CO',
          wprovincecode: formData.wdepartmentcode,
          szip: formData.saddresszip,
          sdepartmentname: formData.sdepartmentname
        }
      },
      
      // Datos fiscales
      stelephone: formData.stelephone,
      stributaryidentificationkey: formData.stributaryidentificationkey,
      sfiscalregime: formData.sfiscalregime,
      scorporateregistrationschemename: formData.scorporateregistrationschemename
    };
  };

  // 🔧 ENVIAR FORMULARIO
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      const requestBody = buildRequestBody();
      console.log('📤 [HOTEL-SETTING] Enviando:', requestBody);
      
      const result = await dispatch(createSellerData(requestBody));
      
      if (result) {
        console.log('✅ [HOTEL-SETTING] Guardado exitosamente');
        setSellerExists(true);
        setIsEditing(false);
        // La action ya muestra el toast de éxito
      }
    } catch (error) {
      console.error('❌ [HOTEL-SETTING] Error:', error);
      // La action ya maneja el error y muestra el toast
    } finally {
      setLoading(false);
    }
  };

  // 🔧 RESETEAR FORMULARIO
  const handleReset = () => {
    setFormData({
      ssellername: '',
      ssellerbrand: '',
      scontactperson: '',
      stelephone: '',
      sdocno: user?.n_document || '',
      sdoctype: 31,
      wlegalorganizationtype: 'company',
      sfiscalresponsibilities: 'O-13',
      stributaryidentificationkey: '01',
      sfiscalregime: '48',
      scorporateregistrationschemename: 'DIAN',
      selectronicmail: user?.email || '',
      saddressline1: '',
      scityname: '',
      wdepartmentcode: '',
      wtowncode: '',
      saddresszip: '',
      sdepartmentname: ''
    });
    setIsEditing(false);
  };

  // 🔧 EFECTOS
  useEffect(() => {
    checkExistingSeller();
  }, [formData.sdocno]);

  return (
    <DashboardLayout>
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-800">
          🏨 Configuración del Hotel para Facturación
        </h2>
        <p className="text-gray-600 mt-2">
          Configure los datos fiscales de su hotel para la facturación electrónica
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Básica del Hotel */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📋 Información Básica del Hotel
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre *
              </label>
              <input
                type="text"
                name="ssellername"
                value={formData.ssellername}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Hotel Balu Premium"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marca
              </label>
              <input
                type="text"
                name="ssellerbrand"
                value={formData.ssellerbrand}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Balu Hotels"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Persona de Contacto *
              </label>
              <input
                type="text"
                name="scontactperson"
                value={formData.scontactperson}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono de Contacto *
              </label>
              <input
                type="tel"
                name="stelephone"
                value={formData.stelephone}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: +57 301 234 5678"
                required
              />
            </div>
          </div>
        </div>

        {/* Información Fiscal */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            🏛️ Información Fiscal
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cédula *
              </label>
              <input
                type="text"
                name="sdocno"
                value={formData.sdocno}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: 900123456-7"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Organización
              </label>
              <select
                name="wlegalorganizationtype"
                value={formData.wlegalorganizationtype}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {organizationTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Responsabilidad Fiscal
              </label>
              <select
                name="sfiscalresponsibilities"
                value={formData.sfiscalresponsibilities}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {fiscalResponsibilities.map(resp => (
                  <option key={resp.value} value={resp.value}>
                    {resp.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email de Contacto *
              </label>
              <input
                type="email"
                name="selectronicmail"
                value={formData.selectronicmail}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="admin@hotel.com"
                required
              />
            </div>
          </div>
        </div>

        {/* Dirección (Opcional) */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📍 Dirección (Opcional)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dirección Completa
              </label>
              <input
                type="text"
                name="saddressline1"
                value={formData.saddressline1}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Calle 123 #45-67"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ciudad
              </label>
              <input
                type="text"
                name="scityname"
                value={formData.scityname}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Bogotá"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código Postal
              </label>
              <input
                type="text"
                name="saddresszip"
                value={formData.saddresszip}
                onChange={handleInputChange}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: 110111"
              />
            </div>
          </div>
        </div>

        {/* Botones de Acción */}
        <div className="flex gap-4 pt-6">
          <button
            type="submit"
            disabled={loading}
            className={`flex-1 py-3 px-6 rounded-md font-medium text-white transition-colors ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </span>
            ) : (
              sellerExists ? '📝 Actualizar Datos' : '💾 Guardar Configuración'
            )}
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 transition-colors"
          >
            🔄 Limpiar
          </button>
        </div>

        {/* Info del Estado */}
        {sellerExists && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-400">✅</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">
                  Los datos del hotel ya están configurados para facturación. 
                  Puede actualizar la información cuando sea necesario.
                </p>
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
    </DashboardLayout>
  );
};

export default HotelSetting;