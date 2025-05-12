import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const LoginTaxxa = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`/taxxa/login`, {
        email, // Directamente los campos que espera el backend
        password
      });
  
      console.log('Login exitoso:', response.data);
      localStorage.setItem('taxxaToken', response.data.token);
      navigate('/panel');
    } catch (error) {
      console.error('Error al iniciar sesión:', error.response ? error.response.data : error.message);
    }
  };
  

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Iniciar Sesión con Usuario Taxxa</h2>
        
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-3 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-3 mb-6 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <button
          type="submit"
          className="w-full p-3 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition duration-300 ease-in-out"
        >
          Iniciar sesión
        </button>
      </form>
    </div>
  );
};

export default LoginTaxxa;


