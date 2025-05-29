import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createRoom } from '../../Redux/Actions/roomActions';
import { getAllServices } from '../../Redux/Actions/serviceActions';
import DashboardLayout from './DashboardLayout';
import { openCloudinaryWidget } from '../../cloudinaryConfig';
import { getAllItems } from '../../Redux/Actions/inventoryActions';

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

  const [formData, setFormData] = useState({
    roomNumber: '',
    price: '',
    services: [],
    type: '',
    description: '',
    maxGuests: 1,
    image_url: []
  });

  const handleChange = (e) => {
    const { name, value, type, selectedOptions } = e.target;
    if (type === 'select-multiple') {
      const selectedServices = Array.from(selectedOptions, option => option.value);
      setFormData({
        ...formData,
        [name]: selectedServices
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
  
    const amenity = inventory.find((item) => item.id === selectedAmenity);
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
      { id: selectedAmenity, name: amenity.name, quantity: amenityQuantity },
    ]);
  
    // Reiniciar los campos de selección
    setSelectedAmenity("");
    setAmenityQuantity(1);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await dispatch(
        createRoom({
          ...formData,
          image_url: images,
          basicInventories: roomAmenities, // Enviar los amenities seleccionados
        })
      );
  
      if (response.success) {
        toast.success("Habitación creada correctamente.");
        setFormData({
          roomNumber: "",
          price: "",
          services: [],
          type: "",
          description: "",
          maxGuests: 1,
          image_url: [],
        });
        setImages([]);
        setRoomAmenities([]);
      } else {
        toast.error(response.error);
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
        <div className="bg-white p-4 rounded-lg shadow-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div>
              <label htmlFor="roomNumber" className="block text-sm font-medium text-gray-700 bg-zinc-300">
                Número de Habitación
              </label>
              <input
                type="text"
                name="roomNumber"
                id="roomNumber"
                value={formData.roomNumber}
                onChange={handleChange}
                required
                className="mt-1 block w-full shadow-sm sm:text-sm border-2 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-700 bg-zinc-300">
                Precio x Persona
              </label>
              <input
                type="number"
                name="price"
                id="price"
                value={formData.price}
                onChange={handleChange}
                required
                className="mt-1 block w-full shadow-sm sm:text-sm border-2 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 bg-zinc-300">
                Tipo de Habitación
              </label>
              <select
                name="type"
                id="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="mt-1 block w-full shadow-sm sm:text-sm border-2 rounded-md"
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
              <label htmlFor="maxGuests" className="block text-sm font-medium text-gray-700 bg-zinc-300">
                Capacidad Máxima
              </label>
              <select
                name="maxGuests"
                id="maxGuests"
                value={formData.maxGuests}
                onChange={handleChange}
                required
                className="mt-1 block w-full shadow-sm sm:text-sm border-2 rounded-md"
              >
                {[...Array(8).keys()].map(num => (
                  <option key={num + 1} value={num + 1}>{num + 1}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
         
          <div>
            <label htmlFor="services" className="block text-sm font-medium text-gray-700 bg-zinc-300">
              Selecciona varios Servicios
            </label>
            <select
              name="services"
              id="services"
              value={formData.services}
              onChange={handleChange}
              multiple
              required
              className="mt-1 block w-full shadow-sm sm:text-sm border-2 rounded-md"
            >
              {services.map(service => (
                <option key={service.id} value={service.name}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md">
         
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 bg-zinc-300">
              Descripción
            </label>
            <textarea
              name="description"
              id="description"
              value={formData.description}
              onChange={handleChange}
              required
              className="mt-1 block w-full shadow-sm sm:text-sm border-2 rounded-md"
            />
          </div>
        </div>
        {/* Amenities */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h4 className="text-md font-bold">Agregar Amenities</h4>
          <div className="flex items-center space-x-4">
           <select
  value={selectedAmenity}
  onChange={(e) => setSelectedAmenity(e.target.value)}
  className="w-full px-3 py-2 border rounded"
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
            />
            <button
              type="button"
              onClick={handleAddAmenity}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Agregar
            </button>
          </div>
        </div>
          {/* Lista de Amenities Seleccionados */}
          <div className="mt-4">
  <h4 className="text-md font-bold">Amenities Seleccionados</h4>
  {roomAmenities.length > 0 ? (
    <ul className="list-disc pl-5">
      {roomAmenities.map((amenity, index) => (
        <li key={index}>
          {amenity.name} - Cantidad: {amenity.quantity}
          <button
            type="button"
            onClick={() => {
              // Eliminar el amenity de la lista
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

        <div className="bg-white p-4 rounded-lg shadow-md">
          
          <button
            type="button"
            onClick={handleWidget}
            className="mt-1 block w-full py-2 px-4  text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 bg-zinc-300"
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
                    setFormData(prev => ({
                      ...prev,
                      image_url: newImages
                    }));
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
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md bg-degrade text-white hover:bg-yellow-700 opacity-80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando...' : 'Crear Habitación'}
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
};

export default CreateRoom;