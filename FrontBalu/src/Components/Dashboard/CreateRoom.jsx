import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createRoom } from '../../Redux/Actions/roomActions';
import { getAllServices } from '../../Redux/Actions/serviceActions';
import DashboardLayout from './DashboardLayout';
import { openCloudinaryWidget } from '../../cloudinaryConfig';
import { getAllItems } from '../../Redux/Actions/inventoryActions';
import { toast } from 'react-toastify';

const CreateRoom = () => {
  const [images, setImages] = useState([]);
  const [selectedAmenity, setSelectedAmenity] = useState("");
  const [amenityQuantity, setAmenityQuantity] = useState(1);
  const [roomAmenities, setRoomAmenities] = useState([]);
  const dispatch = useDispatch();
  const { loading, error } = useSelector(state => state.room);
  const { services } = useSelector(state => state.service);
  const inventory = useSelector((state) => state.inventory.inventory || []);

  useEffect(() => {
    dispatch(getAllServices());
    dispatch(getAllItems());
  }, [dispatch]);

  const handleWidget = () => {
    openCloudinaryWidget((uploadedImageUrl) => {
      setImages((prevImages) => [...prevImages, uploadedImageUrl]);
    });
  };

  // ⭐ ACTUALIZAR FORMDATA CON NUEVOS CAMPOS DE PRECIO
  const [formData, setFormData] = useState({
    roomNumber: '',
    priceSingle: '',           // ⭐ NUEVO: Precio para 1 huésped
    priceDouble: '',           // ⭐ NUEVO: Precio para 2 huéspedes
    priceMultiple: '',         // ⭐ NUEVO: Precio para 3+ huéspedes
    pricePerExtraGuest: '',    // ⭐ NUEVO: Precio por huésped extra
    services: [],
    type: '',
    description: '',
    maxGuests: 1,
    image_url: [],
    // ⭐ NUEVOS CAMPOS PROMOCIONALES
    isPromo: false,
    promotionPrice: ''
  });

  const handleChange = (e) => {
    const { name, value, type, selectedOptions, checked } = e.target;
    
    if (type === 'select-multiple') {
      const selectedServices = Array.from(selectedOptions, option => option.value);
      setFormData({
        ...formData,
        [name]: selectedServices
      });
    } else if (type === 'checkbox') {
      setFormData({
        ...formData,
        [name]: checked
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleAddAmenity = () => {
    if (!selectedAmenity || amenityQuantity <= 0) {
      toast.error("Por favor, selecciona un amenity y una cantidad válida.");
      return;
    }

    const amenity = inventory.find((item) => item.itemId === selectedAmenity);
    if (!amenity) {
      toast.error("Amenity no encontrado.");
      return;
    }

    // Verificar si el amenity ya está en la lista
    const existingAmenity = roomAmenities.find((item) => item.id === selectedAmenity);
    if (existingAmenity) {
      toast.error("Este amenity ya ha sido agregado.");
      return;
    }

    // Agregar el amenity al estado
    setRoomAmenities((prev) => [
      ...prev,
      { id: selectedAmenity, name: amenity.itemName, quantity: amenityQuantity },
    ]);

    // Reiniciar los campos de selección
    setSelectedAmenity("");
    setAmenityQuantity(1);
  };

  // ⭐ VALIDACIÓN MEJORADA PARA PRECIOS
  const validatePrices = () => {
    const { priceSingle, priceDouble, priceMultiple } = formData;
    
    if (!priceSingle || !priceDouble || !priceMultiple) {
      toast.error("Todos los campos de precio son obligatorios.");
      return false;
    }

    const single = parseFloat(priceSingle);
    const double = parseFloat(priceDouble);
    const multiple = parseFloat(priceMultiple);

    if (single <= 0 || double <= 0 || multiple <= 0) {
      toast.error("Los precios deben ser mayores a 0.");
      return false;
    }

    // Validación lógica: el precio para más huéspedes podría ser menor por huésped
    if (single > double) {
      toast.warning("El precio para 1 huésped es mayor que para 2. ¿Está seguro?");
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ⭐ VALIDAR PRECIOS ANTES DE ENVIAR
    if (!validatePrices()) {
      return;
    }

    try {
      const response = await dispatch(
        createRoom({
          ...formData,
          image_url: images,
          basicInventories: roomAmenities,
          // ⭐ ASEGURAR QUE LOS PRECIOS SEAN NÚMEROS
          priceSingle: parseFloat(formData.priceSingle),
          priceDouble: parseFloat(formData.priceDouble),
          priceMultiple: parseFloat(formData.priceMultiple),
          pricePerExtraGuest: formData.pricePerExtraGuest ? parseFloat(formData.pricePerExtraGuest) : 0,
          promotionPrice: formData.promotionPrice ? parseFloat(formData.promotionPrice) : null
        })
      );

      if (response?.success) {
        toast.success("Habitación creada correctamente.");
        // ⭐ RESETEAR FORMULARIO COMPLETO
        setFormData({
          roomNumber: "",
          priceSingle: "",
          priceDouble: "",
          priceMultiple: "",
          pricePerExtraGuest: "",
          services: [],
          type: "",
          description: "",
          maxGuests: 1,
          image_url: [],
          isPromo: false,
          promotionPrice: ""
        });
        setImages([]);
        setRoomAmenities([]);
      } else {
        toast.error(response?.message || "Error al crear la habitación.");
      }
    } catch (error) {
      console.error("Error creando la habitación:", error);
      toast.error("Error al crear la habitación.");
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold bg-zinc-300 mb-4">Crear Habitación</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* ⭐ INFORMACIÓN BÁSICA */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-medium mb-3">Información Básica</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="roomNumber" className="block text-sm font-medium text-gray-700">
                Número de Habitación
              </label>
              <input
                type="text"
                name="roomNumber"
                id="roomNumber"
                value={formData.roomNumber}
                onChange={handleChange}
                required
                className="mt-1 block w-full shadow-sm sm:text-sm border-2 rounded-md p-2"
              />
            </div>
            
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Tipo de Habitación
              </label>
              <select
                name="type"
                id="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="mt-1 block w-full shadow-sm sm:text-sm border-2 rounded-md p-2"
              >
                <option value="">Selecciona un tipo</option>
                <option value="Individual">Individual</option>
                <option value="Doble">Doble</option>
                <option value="Triple">Triple</option>
                <option value="Cuadruple">Cuádruple</option>
                <option value="Suite">Suite</option>
              </select>
            </div>

            <div>
              <label htmlFor="maxGuests" className="block text-sm font-medium text-gray-700">
                Capacidad Máxima
              </label>
              <select
                name="maxGuests"
                id="maxGuests"
                value={formData.maxGuests}
                onChange={handleChange}
                required
                className="mt-1 block w-full shadow-sm sm:text-sm border-2 rounded-md p-2"
              >
                {[...Array(8).keys()].map(num => (
                  <option key={num + 1} value={num + 1}>{num + 1}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ⭐ CONFIGURACIÓN DE PRECIOS */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-medium mb-3">Configuración de Precios</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="priceSingle" className="block text-sm font-medium text-gray-700">
                Precio para 1 Huésped (COP) *
              </label>
              <input
                type="number"
                name="priceSingle"
                id="priceSingle"
                value={formData.priceSingle}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full shadow-sm sm:text-sm border-2 rounded-md p-2"
                placeholder="70000"
              />
            </div>

            <div>
              <label htmlFor="priceDouble" className="block text-sm font-medium text-gray-700">
                Precio para 2 Huéspedes (COP) *
              </label>
              <input
                type="number"
                name="priceDouble"
                id="priceDouble"
                value={formData.priceDouble}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full shadow-sm border-2 rounded-md p-2"
                placeholder="120000"
              />
            </div>

            <div>
              <label htmlFor="priceMultiple" className="block text-sm font-medium text-gray-700">
                Precio para 3+ Huéspedes (COP) *
              </label>
              <input
                type="number"
                name="priceMultiple"
                id="priceMultiple"
                value={formData.priceMultiple}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="mt-1 block w-full shadow-sm border-2 rounded-md p-2"
                placeholder="180000"
              />
            </div>

            <div>
              <label htmlFor="pricePerExtraGuest" className="block text-sm font-medium text-gray-700">
                Precio por Huésped Extra (COP)
              </label>
              <input
                type="number"
                name="pricePerExtraGuest"
                id="pricePerExtraGuest"
                value={formData.pricePerExtraGuest}
                onChange={handleChange}
                min="0"
                step="0.01"
                className="mt-1 block w-full shadow-sm border-2 rounded-md p-2"
                placeholder="25000"
              />
              <p className="text-xs text-gray-500 mt-1">Opcional: Costo adicional por huésped extra</p>
            </div>
          </div>

          {/* ⭐ SECCIÓN DE PROMOCIONES */}
          <div className="mt-4 p-3 bg-yellow-50 rounded-md">
            <div className="flex items-center mb-3">
              <input
                type="checkbox"
                name="isPromo"
                id="isPromo"
                checked={formData.isPromo}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isPromo" className="ml-2 block text-sm font-medium text-gray-700">
                Esta habitación tiene precio promocional
              </label>
            </div>
            
            {formData.isPromo && (
              <div>
                <label htmlFor="promotionPrice" className="block text-sm font-medium text-gray-700">
                  Precio Promocional (COP)
                </label>
                <input
                  type="number"
                  name="promotionPrice"
                  id="promotionPrice"
                  value={formData.promotionPrice}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  className="mt-1 block w-full shadow-sm border-2 rounded-md p-2"
                  placeholder="90000"
                />
                <p className="text-xs text-gray-500 mt-1">
                  El precio promocional anula los precios regulares cuando está activo
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ⭐ SERVICIOS */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-medium mb-3">Servicios Incluidos</h3>
          <div>
            <label htmlFor="services" className="block text-sm font-medium text-gray-700">
              Selecciona varios Servicios
            </label>
            <select
              name="services"
              id="services"
              value={formData.services}
              onChange={handleChange}
              multiple
              required
              className="mt-1 block w-full shadow-sm sm:text-sm border-2 rounded-md p-2 h-32"
            >
              {services.map(service => (
                <option key={service.id} value={service.name}>
                  {service.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Mantén presionada la tecla Ctrl (Cmd en Mac) para seleccionar múltiples servicios
            </p>
          </div>
        </div>

        {/* ⭐ DESCRIPCIÓN */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-medium mb-3">Descripción</h3>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Descripción de la Habitación
            </label>
            <textarea
              name="description"
              id="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows="4"
              className="mt-1 block w-full shadow-sm sm:text-sm border-2 rounded-md p-2"
              placeholder="Describe las características principales de la habitación..."
            />
          </div>
        </div>

        {/* ⭐ AMENITIES (sin cambios significativos) */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-medium mb-3">Amenities</h3>
          <div className="flex items-center space-x-4">
            <select
              value={selectedAmenity}
              onChange={(e) => setSelectedAmenity(e.target.value)}
              className="flex-1 px-3 py-2 border rounded"
            >
              <option value="">Selecciona un amenity</option>
              {inventory.map((item) => (
                <option key={item.itemId} value={item.itemId}>
                  {item.itemName} (Stock: {item.currentStock})
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Cantidad"
              value={amenityQuantity}
              onChange={(e) => setAmenityQuantity(Number(e.target.value))}
              className="w-20 px-3 py-2 border rounded"
              min="1"
            />
            <button
              type="button"
              onClick={handleAddAmenity}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Agregar
            </button>
          </div>

          {/* Lista de Amenities Seleccionados */}
          <div className="mt-4">
            <h4 className="text-md font-bold">Amenities Seleccionados</h4>
            {roomAmenities.length > 0 ? (
              <ul className="list-disc pl-5">
                {roomAmenities.map((amenity, index) => (
                  <li key={index} className="flex justify-between items-center">
                    <span>{amenity.name} - Cantidad: {amenity.quantity}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setRoomAmenities((prev) => prev.filter((item) => item.id !== amenity.id));
                      }}
                      className="ml-2 text-red-500 hover:underline"
                    >
                      Eliminar
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">No hay amenities seleccionados.</p>
            )}
          </div>
        </div>

        {/* ⭐ IMÁGENES (sin cambios) */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-lg font-medium mb-3">Imágenes</h3>
          <button
            type="button"
            onClick={handleWidget}
            className="mt-1 block w-full py-2 px-4 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 bg-zinc-500"
          >
            Subir Imágenes
          </button>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {images.map((img, index) => (
              <div key={index} className="relative group">
                <img
                  src={img}
                  alt={`Imagen ${index + 1}`}
                  className="w-full h-24 object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newImages = images.filter((_, i) => i !== index);
                    setImages(newImages);
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-4 w-4" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={loading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando...' : 'Crear Habitación'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default CreateRoom;