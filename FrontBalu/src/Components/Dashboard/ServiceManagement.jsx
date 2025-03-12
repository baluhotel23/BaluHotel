// filepath: c:\Users\yaniz\Documents\BaluHotel\BaluHotel\FrontBalu\src\Components\Dashboard\ServiceManagement.jsx
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
    }
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    if (name.trim() !== '' && editingServiceId) {
      await dispatch(updateService(editingServiceId, { name }));
      setName('');
      setEditingServiceId(null);
    }
  };

  const handleDeleteService = async (serviceId) => {
    await dispatch(deleteService(serviceId));
  };

  const handleEditService = (service) => {
    setName(service.name);
    setEditingServiceId(service.id);
  };

  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold mb-4">Service Management</h1>

      {/* Service Form */}
      <form onSubmit={editingServiceId ? handleUpdateService : handleCreateService} className="mb-4">
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Service Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          />
          <button
            type="submit"
            className="ml-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {editingServiceId ? 'Update Service' : 'Create Service'}
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
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Service List */}
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {services.map((service) => (
          <div key={service.id} className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-2">{service.name}</h2>
            <div className="flex justify-end">
              <button
                onClick={() => handleEditService(service)}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline"
              >
                Edit
              </button>
              <button
                onClick={() => handleDeleteService(service.id)}
                className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default ServiceManagement;