/* eslint-disable react/prop-types */
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { registerUser } from '../../Redux/Actions/actions';

const UserRegistrationPopup = ({ onClose }) => {
  const dispatch = useDispatch();
  const [userData, setUserData] = useState({
    n_document: '',
    first_name: '',
    last_name: '',
    gender: 'F',
    email: '',
    password: '',
    phone: '',
    city: '',
    

  });

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    dispatch(registerUser(userData));
    onClose(); // Cierra el popup después de registrar
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Registrar Usuario</h2>
        <form onSubmit={handleRegister} className="flex flex-col gap-4">
          <input type="text" name="n_document" placeholder="Documento" onChange={handleChange} required />
          <input type="text" name="first_name" placeholder="Nombre" onChange={handleChange} required />
          <input type="text" name="last_name" placeholder="Apellido" onChange={handleChange} required />
          <input type="text" name="email" placeholder="Email" onChange={handleChange} required />
          <input type="password" name="password" placeholder="Contraseña" onChange={handleChange} required />
          <input type="text" name="phone" placeholder="Teléfono" onChange={handleChange} required />
          <input type="text" name="city" placeholder="Ciudad" onChange={handleChange} required />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-500 text-white rounded">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded">
              Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserRegistrationPopup;
