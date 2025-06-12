import  { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { 
  createStaffUser, 
  getAllUsers, 
  updateUser, 
  deactivateUser, 
  reactivateUser 
} from "../../Redux/Actions/adminActions";

const Register = () => {
  const dispatch = useDispatch();
  const { users, loading, error } = useSelector(state => state.admin);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    wdoctype: "CC",
    n_document: "",
    role: "admin",
    phone: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");

  const wdoctypeOptions = [
    "RC", "TI", "CC", "TE", "CE", "NIT", "PAS", "DEX", "PEP", "PPT", "FI", "NUIP",
  ];

  const roleOptions = ["admin", "recept"];

  // ⭐ CARGAR USUARIOS AL MONTAR EL COMPONENTE
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    await dispatch(getAllUsers());
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "El correo electrónico es obligatorio.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "El correo electrónico no es válido.";
    }

    if (!formData.password) {
      newErrors.password = "La contraseña es obligatoria.";
    } else if (formData.password.length < 6) {
      newErrors.password = "La contraseña debe tener al menos 6 caracteres.";
    }

    if (!formData.n_document) {
      newErrors.n_document = "El número de documento es obligatorio.";
    } else if (!/^\d+$/.test(formData.n_document)) {
      newErrors.n_document = "El número de documento debe contener solo números.";
    }

    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "El número de teléfono debe tener 10 dígitos.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Por favor, corrija los errores en el formulario.");
      return;
    }

    try {
      const dataToSend = { ...formData };
      if (!dataToSend.phone || dataToSend.phone.trim() === "") {
        delete dataToSend.phone;
      }

      const result = await dispatch(createStaffUser(dataToSend));
      
      if (result) {
        setFormData({
          email: "",
          password: "",
          wdoctype: "CC",
          n_document: "",
          role: "admin",
          phone: "",
        });
        setErrors({});
        loadUsers(); // Recargar la lista
      }
    } catch (error) {
      console.error("❌ [REGISTER_STAFF] Error:", error);
    }
  };

  // ⭐ FUNCIONES PARA GESTIÓN DE USUARIOS
  const handleEditUser = (user) => {
    setEditingUser({
      id: user.id,
      email: user.email,
      role: user.role,
      wdoctype: user.wdoctype,
      n_document: user.n_document,
      phone: user.phone || "",
      isActive: user.isActive
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async () => {
    try {
      const result = await dispatch(updateUser(editingUser.id, editingUser));
      if (result) {
        setShowEditModal(false);
        setEditingUser(null);
        loadUsers();
      }
    } catch (error) {
      console.error("❌ [UPDATE_USER] Error:", error);
    }
  };

  const handleDeactivateUser = async (userId) => {
    if (window.confirm("¿Está seguro de que desea desactivar este usuario?")) {
      try {
        const result = await dispatch(deactivateUser(userId));
        if (result) {
          loadUsers();
        }
      } catch (error) {
        console.error("❌ [DEACTIVATE_USER] Error:", error);
      }
    }
  };

  const handleReactivateUser = async (userId) => {
    try {
      const result = await dispatch(reactivateUser(userId));
      if (result) {
        loadUsers();
      }
    } catch (error) {
      console.error("❌ [REACTIVATE_USER] Error:", error);
    }
  };

  // ⭐ FILTRAR USUARIOS
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.n_document?.includes(searchTerm) ||
                         (user.phone && user.phone.includes(searchTerm));
    const matchesRole = filterRole === "all" || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 text-center mb-8 ">
          🏨 Gestión de Personal
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ⭐ FORMULARIO DE CREACIÓN */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-700 mb-6 flex items-center">
              <span className="mr-2">✨</span> Registrar Nuevo Staff
            </h2>
            
            <form onSubmit={handleSubmit} autoComplete="on">
              {/* EMAIL */}
              <div className="mb-4">
                <label className="block font-semibold text-gray-700 mb-2">
                  📧 Correo Electrónico:
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  className={`w-full p-3 border rounded-md transition-colors ${
                    errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="usuario@ejemplo.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">❌ {errors.email}</p>
                )}
              </div>

              {/* PASSWORD */}
              <div className="mb-4 relative">
                <label className="block font-semibold text-gray-700 mb-2">
                  🔒 Contraseña:
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="new-password"
                  className={`w-full p-3 border rounded-md pr-10 transition-colors ${
                    errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-11 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-1">❌ {errors.password}</p>
                )}
              </div>

              {/* TIPO DE DOCUMENTO */}
              <div className="mb-4">
                <label className="block font-semibold text-gray-700 mb-2">
                  📄 Tipo de Documento:
                </label>
                <select
                  name="wdoctype"
                  value={formData.wdoctype}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:border-blue-500 transition-colors"
                >
                  {wdoctypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {/* NÚMERO DE DOCUMENTO */}
              <div className="mb-4">
                <label className="block font-semibold text-gray-700 mb-2">
                  🆔 Número de Documento:
                </label>
                <input
                  type="text"
                  name="n_document"
                  value={formData.n_document}
                  onChange={handleChange}
                  autoComplete="off"
                  className={`w-full p-3 border rounded-md transition-colors ${
                    errors.n_document ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="Ej: 12345678"
                />
                {errors.n_document && (
                  <p className="text-red-500 text-sm mt-1">❌ {errors.n_document}</p>
                )}
              </div>

              {/* TELÉFONO */}
              <div className="mb-4">
                <label className="block font-semibold text-gray-700 mb-2">
                  📱 Número de Teléfono (Opcional):
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  autoComplete="tel"
                  className={`w-full p-3 border rounded-md transition-colors ${
                    errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-blue-500'
                  }`}
                  placeholder="Ej: 3001234567"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">❌ {errors.phone}</p>
                )}
              </div>

              {/* ROL */}
              <div className="mb-6">
                <label className="block font-semibold text-gray-700 mb-2">
                  👥 Rol:
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:border-blue-500 transition-colors"
                >
                  {roleOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "recept" ? "Recepcionista" : "Administrador"}
                    </option>
                  ))}
                </select>
              </div>

              {/* BOTÓN DE SUBMIT */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-all duration-200 ${
                  loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 shadow-lg'
                }`}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Registrando...
                  </div>
                ) : (
                  '✨ Registrar Staff'
                )}
              </button>
            </form>
          </div>

          {/* ⭐ LISTA DE USUARIOS */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-700 flex items-center">
                <span className="mr-2">👥</span> Personal Activo
              </h2>
              <button
                onClick={loadUsers}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
                Actualizar
              </button>
            </div>

            {/* ⭐ FILTROS Y BÚSQUEDA */}
            <div className="mb-4 space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="🔍 Buscar por email, documento o teléfono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-md focus:border-blue-500 transition-colors"
                >
                  <option value="all">🎯 Todos los roles</option>
                  <option value="admin">👑 Administradores</option>
                  <option value="recept">📝 Recepcionistas</option>
                </select>
              </div>
            </div>

            {/* ⭐ ESTADÍSTICAS RÁPIDAS */}
            <div className="mb-4 bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-blue-600">{users.length}</p>
                  <p className="text-sm text-gray-600">Total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {users.filter(u => u.isActive).length}
                  </p>
                  <p className="text-sm text-gray-600">Activos</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {users.filter(u => !u.isActive).length}
                  </p>
                  <p className="text-sm text-gray-600">Inactivos</p>
                </div>
              </div>
            </div>

            {/* ⭐ LISTA DE USUARIOS */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Cargando usuarios...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No se encontraron usuarios</p>
                </div>
              ) : (
                filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`border rounded-lg p-4 transition-all ${
                      user.isActive 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-800">
                            {user.email}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'admin' ? '👑 Admin' : '📝 Recepcionista'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? '✅ Activo' : '❌ Inactivo'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>📄 {user.wdoctype}: {user.n_document}</p>
                          {user.phone && <p>📱 {user.phone}</p>}
                          <p className="text-xs">
                            Creado: {new Date(user.createdAt).toLocaleDateString('es-CO')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                          title="Editar usuario"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        </button>
                        
                        {user.isActive ? (
                          <button
                            onClick={() => handleDeactivateUser(user.id)}
                            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                            title="Desactivar usuario"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"></path>
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivateUser(user.id)}
                            className="p-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
                            title="Reactivar usuario"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ⭐ MODAL DE EDICIÓN */}
        {showEditModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-xl font-bold text-gray-800 mb-4">
                ✏️ Editar Usuario
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold text-gray-700 mb-2">Email:</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-md focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block font-semibold text-gray-700 mb-2">Rol:</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-md focus:border-blue-500"
                  >
                    <option value="admin">Administrador</option>
                    <option value="recept">Recepcionista</option>
                  </select>
                </div>
                
                <div>
                  <label className="block font-semibold text-gray-700 mb-2">Teléfono:</label>
                  <input
                    type="tel"
                    value={editingUser.phone || ""}
                    onChange={(e) => setEditingUser({...editingUser, phone: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-md focus:border-blue-500"
                    placeholder="Opcional"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateUser}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;