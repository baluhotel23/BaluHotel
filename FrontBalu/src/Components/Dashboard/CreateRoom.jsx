import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createRoom } from '../../Redux/Actions/roomActions';
import { getAllServices } from '../../Redux/Actions/serviceActions';
import DashboardLayout from './DashboardLayout';
import { openCloudinaryWidget } from '../../cloudinaryConfig';

const CreateRoom = () => {
  const [images, setImages] = useState([]);
  const dispatch = useDispatch();
  const { loading, error } = useSelector(state => state.room);
  const { services } = useSelector(state => state.service);

  useEffect(() => {
    dispatch(getAllServices());
  }, [dispatch]);

  const handleWidget = () => {
    openCloudinaryWidget((uploadedImageUrl) => {
      setImages((prevImages) => [...prevImages, uploadedImageUrl]);
    });
  };

  const [formData, setFormData] = useState({
    roomNumber: '',
    price: '',
    services: '',
    type: '',
    description: '',
    maxGuests: 1,
    image_url: [] // Cambiamos el campo a image_url
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'services') {
      const selectedServices = Array.from(e.target.selectedOptions, option => option.value);
      setFormData({
        ...formData,
        [name]: selectedServices
      });
      console.log('Selected services:', selectedServices);
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
      console.log(`Changed ${name}:`, value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form data before submit:', { ...formData, image_url: images });
    try {
      await dispatch(createRoom({ ...formData, image_url: images }));
      setFormData({
        roomNumber: '',
        price: '',
        services: '',
        type: '',
        description: '',
        maxGuests: 1,
        image_url: []
      });
      setImages([]);
    } catch (error) {
      console.error('Error creating room:', error);
    }
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold mb-4">Crear Habitación</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
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
            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-gray-700">
            Precio
          </label>
          <input
            type="number"
            name="price"
            id="price"
            value={formData.price}
            onChange={handleChange}
            required
            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label htmlFor="services" className="block text-sm font-medium text-gray-700">
            Servicios
          </label>
          <select
            name="services"
            id="services"
            value={formData.services}
            onChange={handleChange}
            required
            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
          >
            <option value="">Selecciona un servicio</option>
            {services.map(service => (
              <option key={service.id} value={service.name}>
                {service.name}
              </option>
            ))}
          </select>
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
            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
          >
            <option value="">Selecciona un tipo</option>
            <option value="Sencilla">Sencilla</option>
            <option value="Doble">Doble</option>
            <option value="Triple">Triple</option>
            <option value="Cuadruple">Cuadruple</option>
            <option value="Pareja">Pareja</option>
          </select>
        </div>
        <div>
          <label htmlFor="maxGuests" className="block text-sm font-medium text-gray-700">
            Capacidad Máxima
          </label>
          <input
            type="number"
            name="maxGuests"
            id="maxGuests"
            value={formData.maxGuests}
            onChange={handleChange}
            required
            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Descripción
          </label>
          <textarea
            name="description"
            id="description"
            value={formData.description}
            onChange={handleChange}
            required
            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
          />
        </div>
        
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Imágenes
          </label>
          <button
            type="button"
            onClick={handleWidget}
            className="mt-1 block w-full py-2 px-4 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700"
          >
            Subir Imágenes
          </button>

          {/* Muestra las imágenes seleccionadas */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            {images.map((img, index) => (
              <div key={index} className="relative group">
                <img
                  src={img}
                  alt={`Imagen ${index + 1}`}
                  className="w-full h-32 object-cover rounded-md"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newImages = images.filter((_, i) => i !== index);
                    setImages(newImages);
                    setFormData(prev => ({
                      ...prev,
                      image_url: newImages
                    }));
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600"
                >
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5" 
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
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando...' : 'Crear Habitación'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default CreateRoom;