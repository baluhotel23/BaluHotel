import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllServices, createService, updateService, deleteService } from '../../Redux/Actions/serviceActions';
import DashboardLayout from './DashboardLayout';

const ServiceManagement = () => {
  const dispatch = useDispatch();
  const { services, loading, error } = useSelector((state) => state.service);
  const [name, setName] = useState('');
  const [editingServiceId, setEditingServiceId] = useState(null);

  useEffect(() => {
    dispatch(getAllServices());
  }, [dispatch]);

  const handleCreateService = async (e) => {
    e.preventDefault();
    if (name.trim() !== '') {
      await dispatch(createService({ name }));
      setName('');
      dispatch(getAllServices()); // Refrescar la lista de servicios
    }
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    if (name.trim() !== '' && editingServiceId) {
      await dispatch(updateService(editingServiceId, { name }));
      setName('');
      setEditingServiceId(null);
      dispatch(getAllServices()); // Refrescar la lista de servicios
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este servicio?')) {
      await dispatch(deleteService(serviceId));
      dispatch(getAllServices()); // Refrescar la lista de servicios
    }
  };

  const handleEditService = (service) => {
    setName(service.name);
    setEditingServiceId(service.serviceId); // Asegúrate de usar service.serviceId
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold mb-4">Gestión de Servicios</h1>

      {/* Service Form */}
      <form onSubmit={editingServiceId ? handleUpdateService : handleCreateService} className="mb-4">
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Nombre del Servicio"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          <button
            type="submit"
            className="ml-2 bg-degrade text-white hover:bg-yellow-700 opacity-80 font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {editingServiceId ? 'Actualizar Servicio' : 'Crear Servicio'}
          </button>
          {editingServiceId && (
            <button
              type="button"
              onClick={() => {
                setName('');
                setEditingServiceId(null);
              }}
              className="ml-2 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>

      {/* Service List */}
      {loading && <p>Cargando...</p>}
      {error && <p>Error: {error}</p>}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre del Servicio</th>
              <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {services.map((service) => (
              <tr key={service.serviceId}>
                <td className="px-6 py-4 whitespace-nowrap">{service.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleEditService(service)}
                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDeleteService(service.serviceId)} // Asegúrate de usar service.serviceId
                    className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};

export default ServiceManagement;