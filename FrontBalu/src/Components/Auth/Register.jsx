import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { register } from "../../Redux/Actions/authActions"; // Asegúrate de tener esta acción configurada

const Register = () => {
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    wdoctype: "CC",
    n_document: "",
    role: "owner",
    phone: "",
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false); // Estado para alternar visibilidad de la contraseña

  const wdoctypeOptions = [
    "RC",
    "TI",
    "CC",
    "TE",
    "CE",
    "NIT",
    "PAS",
    "DEX",
    "PEP",
    "PPT",
    "FI",
    "NUIP",
  ];

  const roleOptions = ["owner", "recept", "admin"];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
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
    }

    if (!formData.phone) {
      newErrors.phone = "El número de teléfono es obligatorio.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const response = await dispatch(register(formData)); // Llama a la acción para registrar al usuario
      if (response.success) {
        toast.success("Usuario registrado exitosamente.");
        setFormData({
          email: "",
          password: "",
          wdoctype: "CC",
          n_document: "",
          role: "owner",
          phone: "",
        });
      } else {
        if (response.message.includes("email")) {
          setErrors({ email: "El correo electrónico ya está registrado." });
        }
        if (response.message.includes("n_document")) {
          setErrors({ n_document: "El número de documento ya está registrado." });
        }
        toast.error("Error al registrar el usuario.");
      }
    } catch (error) {
      console.error("Error al registrar el usuario:", error);
      toast.error("Error al procesar el registro.");
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-4 m-4 rounded-lg shadow-md">
      <h2 className="text-2xl text-neutral-500 font-bold mb-2">Registrar Staff</h2>
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block font-semibold">Correo Electrónico:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
          />
          {errors.email && <p className="text-red-500 text-sm">{errors.email}</p>}
        </div>

        <div className="mb-4 relative">
          <label className="block font-semibold">Contraseña:</label>
          <input
            type={showPassword ? "text" : "password"} // Alternar entre texto y contraseña
            name="password"
            value={formData.password}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
          />
          <span
            onClick={() => setShowPassword(!showPassword)} // Alternar visibilidad
            className="absolute right-3 top-10 cursor-pointer text-gray-500"
          >
            {showPassword ? "X" : "👁️"} {/* Icono para mostrar/ocultar */}
          </span>
          {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
        </div>

        <div className="mb-4">
          <label className="block font-semibold">Tipo de Documento:</label>
          <select
            name="wdoctype"
            value={formData.wdoctype}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
          >
            {wdoctypeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block font-semibold">Número de Documento:</label>
          <input
            type="text"
            name="n_document"
            value={formData.n_document}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
          />
          {errors.n_document && (
            <p className="text-red-500 text-sm">{errors.n_document}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block font-semibold">Rol:</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
          >
            {roleOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block font-semibold">Teléfono:</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full p-2 border rounded-md"
          />
          {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
        </div>

        <button
          type="submit"
          className="w-full bg-degrade text-white py-2 px-4 rounded-md hover:bg-Hover"
        >
          Registrar
        </button>
      </form>
    </div>
  );
};

export default Register;