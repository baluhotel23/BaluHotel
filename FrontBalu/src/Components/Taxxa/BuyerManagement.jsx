import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { FaSearch, FaUserPlus, FaEdit, FaSave, FaTimes, FaUser } from 'react-icons/fa';
import DashboardLayout from '../Dashboard/DashboardLayout';
import {
  fetchBuyerByDocument,
  createBuyer,
  updateBuyer,
  fetchDepartments,
  fetchMunicipalities,
  clearBuyer,
} from '../../Redux/Actions/taxxaActions';

const BuyerManagement = () => {
  const dispatch = useDispatch();
  const { buyer: verifiedBuyer, loading, departmentsCache, loadingDepartments } = useSelector(
    (state) => state.taxxa
  );

  // ⭐ ESTADOS
  const [searchDocument, setSearchDocument] = useState('');
  const [mode, setMode] = useState('search'); // search, create, edit
  const [formData, setFormData] = useState({
    sdocno: '',
    wlegalorganizationtype: 'person',
    scostumername: '',
    stributaryidentificationkey: 'ZZ',
    sfiscalresponsibilities: 'R-99-PN',
    sfiscalregime: '49',
    wdoctype: 'CC',
    scorporateregistrationschemename: '',
    scontactperson: '',
    selectronicmail: '',
    stelephone: '',
    saddressline1: '',
    scityname: '',
    wdepartmentcode: '',
    wtowncode: '',
  });

  const [locationState, setLocationState] = useState({
    selectedCountry: 'CO',
    selectedDepartment: '',
    selectedMunicipality: '',
    departmentsList: [],
    municipalitiesList: [],
    loadingMunicipalities: false,
  });

  const [submitting, setSubmitting] = useState(false);

  // ⭐ EFECTOS
  useEffect(() => {
    dispatch(fetchDepartments('CO'));
  }, [dispatch]);

  useEffect(() => {
    const departments = departmentsCache[`departments_${locationState.selectedCountry}`] || [];
    setLocationState((prev) => ({ ...prev, departmentsList: departments }));
  }, [departmentsCache, locationState.selectedCountry]);

  useEffect(() => {
    if (verifiedBuyer && mode === 'search') {
      // Auto-rellenar el formulario con los datos del buyer encontrado
      setFormData({
        sdocno: verifiedBuyer.sdocno || '',
        wlegalorganizationtype: verifiedBuyer.wlegalorganizationtype || 'person',
        scostumername: verifiedBuyer.scostumername || '',
        stributaryidentificationkey: verifiedBuyer.stributaryidentificationkey || 'ZZ',
        sfiscalresponsibilities: verifiedBuyer.sfiscalresponsibilities || 'R-99-PN',
        sfiscalregime: verifiedBuyer.sfiscalregime || '49',
        wdoctype: verifiedBuyer.wdoctype || 'CC',
        scorporateregistrationschemename: verifiedBuyer.scorporateregistrationschemename || '',
        scontactperson: verifiedBuyer.scontactperson || '',
        selectronicmail: verifiedBuyer.selectronicmail || '',
        stelephone: verifiedBuyer.stelephone || '',
        saddressline1: verifiedBuyer.saddressline1 || '',
        scityname: verifiedBuyer.scityname || '',
        wdepartmentcode: verifiedBuyer.wdepartmentcode || '',
        wtowncode: verifiedBuyer.wtowncode || '',
      });

      if (verifiedBuyer.wdepartmentcode) {
        setLocationState((prev) => ({
          ...prev,
          selectedDepartment: verifiedBuyer.wdepartmentcode,
        }));
        dispatch(fetchMunicipalities(verifiedBuyer.wdepartmentcode));
      }

      if (verifiedBuyer.wtowncode) {
        setLocationState((prev) => ({
          ...prev,
          selectedMunicipality: verifiedBuyer.wtowncode,
        }));
      }

      setMode('edit');
    }
  }, [verifiedBuyer, mode, dispatch]);

  // ⭐ HANDLERS
  const handleSearch = async () => {
    if (!searchDocument.trim()) {
      toast.error('Ingrese un número de documento');
      return;
    }

    const result = await dispatch(fetchBuyerByDocument(searchDocument));
    
    if (!result) {
      // No encontrado - ofrecer crear nuevo
      toast.info('Huésped no encontrado. Puede crear uno nuevo.');
      setFormData((prev) => ({ ...prev, sdocno: searchDocument }));
      setMode('create');
    }
  };

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleDepartmentChange = useCallback(
    async (e) => {
      const departmentCode = e.target.value;

      setLocationState((prev) => ({
        ...prev,
        selectedDepartment: departmentCode,
        selectedMunicipality: '',
        municipalitiesList: [],
        loadingMunicipalities: !!departmentCode,
      }));

      setFormData((prev) => ({
        ...prev,
        wdepartmentcode: departmentCode,
        wtowncode: '',
        scityname: '',
      }));

      if (departmentCode) {
        try {
          const municipalities = await dispatch(fetchMunicipalities(departmentCode));
          if (Array.isArray(municipalities)) {
            setLocationState((prev) => ({
              ...prev,
              municipalitiesList: municipalities,
              loadingMunicipalities: false,
            }));
          }
        } catch (error) {
          console.error('Error loading municipalities:', error);
          setLocationState((prev) => ({
            ...prev,
            loadingMunicipalities: false,
          }));
        }
      }
    },
    [dispatch]
  );

  const handleMunicipalityChange = useCallback(
    (e) => {
      const municipalityCode = e.target.value;
      const selectedMunicipality = locationState.municipalitiesList.find(
        (muni) => muni.code === municipalityCode || muni.wtowncode === municipalityCode
      );

      setLocationState((prev) => ({
        ...prev,
        selectedMunicipality: municipalityCode,
      }));
      setFormData((prev) => ({
        ...prev,
        wtowncode: municipalityCode,
        scityname: selectedMunicipality?.name || '',
      }));
    },
    [locationState.municipalitiesList]
  );

  const validateForm = () => {
    const requiredFields = {
      sdocno: 'Número de documento',
      scostumername: 'Nombre completo',
      selectronicmail: 'Email',
      wdoctype: 'Tipo de documento',
      scorporateregistrationschemename: 'Nombre comercial',
      scontactperson: 'Persona de contacto',
      stelephone: 'Teléfono',
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([field]) => !formData[field]?.toString().trim())
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
      let result;

      if (mode === 'create') {
        result = await dispatch(createBuyer(formData));
      } else if (mode === 'edit') {
        result = await dispatch(updateBuyer(formData.sdocno, formData));
      }

      if (result?.success || (result && !result.error)) {
        toast.success(`Huésped ${mode === 'create' ? 'creado' : 'actualizado'} exitosamente`);
        handleReset();
      }
    } catch (error) {
      console.error('Error submitting buyer:', error);
      toast.error('Error de conexión. Intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    // 🧹 Limpiar buyer del estado de Redux
    dispatch(clearBuyer());
    
    setSearchDocument('');
    setMode('search');
    setFormData({
      sdocno: '',
      wlegalorganizationtype: 'person',
      scostumername: '',
      stributaryidentificationkey: 'ZZ',
      sfiscalresponsibilities: 'R-99-PN',
      sfiscalregime: '49',
      wdoctype: 'CC',
      scorporateregistrationschemename: '',
      scontactperson: '',
      selectronicmail: '',
      stelephone: '',
      saddressline1: '',
      scityname: '',
      wdepartmentcode: '',
      wtowncode: '',
    });
    setLocationState({
      selectedCountry: 'CO',
      selectedDepartment: '',
      selectedMunicipality: '',
      departmentsList: locationState.departmentsList,
      municipalitiesList: [],
      loadingMunicipalities: false,
    });
  };

  const inputClassName =
    'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all';

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            <FaUser className="inline mr-3 text-blue-600" />
            Gestión de Huéspedes
          </h1>
          <p className="text-gray-600">Buscar, crear o editar información de huéspedes</p>
        </div>

        {/* Search Section */}
        {mode === 'search' && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <FaSearch className="mr-2 text-blue-500" />
              Buscar Huésped
            </h2>

            <div className="flex gap-3">
              <input
                type="text"
                value={searchDocument}
                onChange={(e) => setSearchDocument(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Número de documento (ej: 1234567890)"
                className={inputClassName}
              />
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {loading ? '⏳ Buscando...' : <><FaSearch className="inline mr-2" />Buscar</>}
              </button>
              <button
                onClick={() => {
                  setMode('create');
                  setFormData((prev) => ({ ...prev, sdocno: searchDocument }));
                }}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors whitespace-nowrap"
              >
                <FaUserPlus className="inline mr-2" />
                Nuevo
              </button>
            </div>
          </div>
        )}

        {/* Form Section */}
        {(mode === 'create' || mode === 'edit') && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                {mode === 'create' ? (
                  <>
                    <FaUserPlus className="mr-2 text-green-500" />
                    Crear Nuevo Huésped
                  </>
                ) : (
                  <>
                    <FaEdit className="mr-2 text-blue-500" />
                    Editar Huésped
                  </>
                )}
              </h2>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                <FaTimes className="inline mr-2" />
                Cancelar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-medium text-gray-700 mb-4">📋 Información Básica</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Organización *
                    </label>
                    <select
                      name="wlegalorganizationtype"
                      value={formData.wlegalorganizationtype}
                      onChange={handleInputChange}
                      className={inputClassName}
                      required
                    >
                      <option value="person">👤 Persona Natural</option>
                      <option value="company">🏢 Empresa</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Documento *
                    </label>
                    <input
                      type="text"
                      name="sdocno"
                      value={formData.sdocno}
                      onChange={handleInputChange}
                      disabled={mode === 'edit'}
                      className={`${inputClassName} ${mode === 'edit' ? 'bg-gray-100' : ''}`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                      <option value="TI">TI - Tarjeta de Identidad</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
              </div>

              {/* Contact Information */}
              <div className="border-b pb-6">
                <h3 className="text-lg font-medium text-gray-700 mb-4">📞 Información de Contacto</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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
                </div>
              </div>

              {/* Location Information */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-700 mb-4">📍 Ubicación (Opcional)</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Departamento
                    </label>
                    <select
                      value={locationState.selectedDepartment}
                      onChange={handleDepartmentChange}
                      disabled={loadingDepartments}
                      className={inputClassName}
                    >
                      <option value="">Seleccionar...</option>
                      {locationState.departmentsList.map((dept) => (
                        <option key={dept.code} value={dept.code}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ciudad/Municipio
                    </label>
                    <select
                      value={locationState.selectedMunicipality}
                      onChange={handleMunicipalityChange}
                      disabled={
                        locationState.loadingMunicipalities || !locationState.selectedDepartment
                      }
                      className={inputClassName}
                    >
                      <option value="">
                        {!locationState.selectedDepartment
                          ? 'Primero seleccione departamento'
                          : 'Seleccionar...'}
                      </option>
                      {locationState.municipalitiesList.map((muni) => (
                        <option key={muni.code || muni.wtowncode} value={muni.code || muni.wtowncode}>
                          {muni.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  <FaTimes className="inline mr-2" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? (
                    '⏳ Guardando...'
                  ) : (
                    <>
                      <FaSave className="inline mr-2" />
                      {mode === 'create' ? 'Crear Huésped' : 'Guardar Cambios'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default BuyerManagement;
