import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../Redux/Actions/authActions';

const DashboardNavbar = () => {
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <nav className="bg-gray-800 p-4 fixed top-0 left-0 w-full z-10">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/dashboard" className="text-white text-lg font-semibold">Dashboard</Link>
        <div className="flex space-x-4">
          {location.pathname !== '/dashboard' && (
            <Link to="/dashboard" className="text-gray-300 hover:text-white">Inicio</Link>
          )}
          <button onClick={handleBack} className="text-gray-300 hover:text-white">Volver</button>
          <Link to="/" className="text-gray-300 hover:text-white">Web</Link>
          <button onClick={handleLogout} className="text-gray-300 hover:text-white">Logout</button>
        </div>
      </div>
    </nav>
  );
};

export default DashboardNavbar;