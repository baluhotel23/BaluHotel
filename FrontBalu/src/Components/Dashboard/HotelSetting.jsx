import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createHotelSettings, updateHotelSettings, fetchHotelSettings } from "../../Redux/Actions/hotelActions";
import { toast } from "react-toastify";
import DashboardLayout from "./DashboardLayout";

const HotelSetting = () => {
    const dispatch = useDispatch();
    const { hotelSettings, loading, error } = useSelector((state) => state.hotel); // Accede al estado del reducer

    const [formData, setFormData] = useState({
        name: "",
        address: "",
        contactInfo: [{ instagram: "" }],
        wlegalorganizationtype: "company",
        sfiscalresponsibilities: "O-47",
        sdocno: "",
        sdoctype: "NIT",
        ssellername: "",
        ssellerbrand: "",
        scontactperson: "",
        saddresszip: "",
        wdepartmentcode: "",
        wtowncode: "",
        scityname: "",
        contact_selectronicmail: "",
        registration_wdepartmentcode: "",
        registration_scityname: "",
        registration_saddressline1: "",
        registration_scountrycode: "CO",
        registration_wprovincecode: "",
        registration_szip: "",
        registration_sdepartmentname: "",
    });

    const [isEditing, setIsEditing] = useState(false); // Estado para alternar entre creación y edición

    // Cargar los datos del hotel al montar el componente
    useEffect(() => {
        dispatch(fetchHotelSettings());
    }, [dispatch]);

    // Actualizar el formulario si hay datos existentes
    useEffect(() => {
        if (hotelSettings) {
            console.log('Datos del hotel:', hotelSettings); // Verifica los datos en la consola
            setFormData({
                ...hotelSettings,
                contactInfo: Array.isArray(hotelSettings.contactInfo)
                    ? hotelSettings.contactInfo
                    : [{ instagram: "" }], // Asegúrate de que contactInfo sea un array
            });
            setIsEditing(true);
        }
    }, [hotelSettings]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevFormData) => ({
            ...prevFormData,
            [name]: value,
        }));
    };

    const handleInstagramChange = (e) => {
        const { value } = e.target;
        setFormData((prevFormData) => ({
            ...prevFormData,
            contactInfo: [{ instagram: value }],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        if (isEditing) {
            const success = await dispatch(updateHotelSettings(formData));
            if (success) {
                toast.success("Datos del hotel actualizados correctamente.");
            } else {
                toast.error("Error al actualizar los datos del hotel.");
            }
        } else {
            const createdData = await dispatch(createHotelSettings(formData));
            if (createdData) {
                setFormData(createdData); // Actualiza el formulario con los datos creados
                setIsEditing(true); // Cambia a modo edición
                toast.success("Datos del hotel creados correctamente.");
            } else {
                toast.error("Error al crear los datos del hotel.");
            }
        }
    };

    if (loading) return <p>Cargando...</p>;
    if (error) return <p>Error: {error}</p>;
    return (
        <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
            <h2 className="text-2xl font-bold text-center mb-4">
                {isEditing ? "Actualizar Datos del Hotel" : "Datos Hotel"}
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Nombre del Hotel
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                        Dirección
                    </label>
                    <input
                        type="text"
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">
                        Instagram
                    </label>
                    <input
                        type="url"
                        id="instagram"
                        name="instagram"
                        value={formData.contactInfo?.[0]?.instagram || ""} // Validación para evitar errores
                        onChange={handleInstagramChange}
                        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>
                {/* Campos opcionales */}
                <div>
                    <label htmlFor="wlegalorganizationtype" className="block text-sm font-medium text-gray-700">
                        Tipo de Organización Legal
                    </label>
                    <select
                        id="wlegalorganizationtype"
                        name="wlegalorganizationtype"
                        value={formData.wlegalorganizationtype}
                        onChange={handleChange}
                       className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    >
                        <option value="">Seleccionar</option>
                        <option value="person">Persona Natural</option>
            <option value="company">Persona Jurídica</option>
                    </select>
                </div>
                <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Responsabilidad Fiscal:
          </label>
          <select
            name="sfiscalresponsibilities"
            value={formData.sfiscalresponsibilities}
            onChange={handleChange}
            className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="R-99-PN">No aplica – Otros *</option>
            <option value="O-13"> Gran contribuyente </option>
            <option value="O-15"> Autorretenedor</option>
            <option value="O-23">Agente de retención IVA</option>
            <option value="O-47">Régimen simple de tributación</option>

          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Tipo de Documento:
          </label>
          <select
            name="sdoctype"
            value={formData.sdoctype}
            onChange={handleChange}
            className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Selecciona un tipo de documento</option>
            <option value="RC">Registro civil</option>
            <option value="TI">Tarjeta de identidad</option>
            <option value="CC">Cédula de ciudadanía</option>
            <option value="TE">Tarjeta de extranjería</option>
            <option value="CE">Cédula de extranjería</option>
            <option value="NIT">NIT</option>
            <option value="PAS">Pasaporte</option>
            <option value="DEX">Documento de identificación extranjero</option>
            <option value="PEP">PEP (Permiso Especial de Permanencia)</option>
            <option value="PPT">PPT (Permiso Protección Temporal)</option>
            <option value="FI">NIT de otro país</option>
            <option value="NUIP">NUIP</option>
          </select>
        </div>
                <div>
                    <label htmlFor="sdocno" className="block text-sm font-medium text-gray-700">
                        Número de Documento
                    </label>
                    <input
                        type="text"
                        id="sdocno"
                        name="sdocno"
                        value={formData.sdocno}
                        onChange={handleChange}
                        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                </div>
                <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Razón Social del Vendedor:</label>
          <input
            type="text"
            name="ssellername"
            value={formData.ssellername}
            onChange={handleChange}
            className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
                {/* Nombre del vendedor */}


{/* Marca del vendedor */}
<div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Nombre Comercial:</label>
          <input
            type="text"
            name="ssellerbrand"
            value={formData.ssellerbrand}
            onChange={handleChange}
            className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

{/* Persona de contacto */}
<div>
    <label htmlFor="scontactperson" className="block text-sm font-medium text-gray-700">
        Persona de Contacto
    </label>
    <input
        type="text"
        id="scontactperson"
        name="scontactperson"
        value={formData.scontactperson}
        onChange={handleChange}
        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
</div>

{/* Código postal */}
<div>
    <label htmlFor="saddresszip" className="block text-sm font-medium text-gray-700">
        Código Postal
    </label>
    <input
        type="text"
        id="saddresszip"
        name="saddresszip"
        value={formData.saddresszip}
        onChange={handleChange}
        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
</div>

{/* Código del departamento */}
<div>
    <label htmlFor="wdeparregistration_wdepartmentcodementcode" className="block text-sm font-medium text-gray-700">
        Código del Departamento
    </label>
    <input
        type="text"
        id="registration_wdepartmentcode"
        name="registration_wdepartmentcode"
        value={formData.registration_wdepartmentcode}
        onChange={handleChange}
        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
</div>

{/* Código de la ciudad */}
<div>
    <label htmlFor="wtowncode" className="block text-sm font-medium text-gray-700">
        Código de la Ciudad
    </label>
    <input
        type="text"
        id="wtowncode"
        name="wtowncode"
        value={formData.wtowncode}
        onChange={handleChange}
        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
</div>
<div className="mb-4">
          <label className="block text-sm font-medium text-gray-700"> Ciudad (Nombre):</label>
          <input
            type="text"
            name="registration_scityname"
            value={formData.registration_scityname}
            onChange={handleChange}
            className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        {/* Código del Departamento */}
<div>
    <label htmlFor="wdepartmentcode" className="block text-sm font-medium text-gray-700">
        Código del Departamento
    </label>
    <input
        type="text"
        id="wdepartmentcode"
        name="wdepartmentcode"
        value={formData.wdepartmentcode}
        onChange={handleChange}
        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
</div>

{/* Nombre de la Ciudad */}
<div>
    <label htmlFor="scityname" className="block text-sm font-medium text-gray-700">
        Nombre de la Ciudad
    </label>
    <input
        type="text"
        id="scityname"
        name="scityname"
        value={formData.scityname}
        onChange={handleChange}
        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
</div>

{/* Correo electrónico de contacto */}
<div>
    <label htmlFor="contact_selectronicmail" className="block text-sm font-medium text-gray-700">
        Correo Electrónico de Contacto
    </label>
    <input
        type="email"
        id="contact_selectronicmail"
        name="contact_selectronicmail"
        value={formData.contact_selectronicmail}
        onChange={handleChange}
        className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
</div>

{/* Dirección de registro */}
<div>
    <label htmlFor="registration_saddressline1" className="block text-sm font-medium text-gray-700">
        Dirección de Registro
    </label>
    <input
        type="text"
        id="registration_saddressline1"
        name="registration_saddressline1"
        value={formData.registration_saddressline1}
        onChange={handleChange}
        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
</div>

{/* País de registro */}
<div>
    <label htmlFor="registration_scountrycode" className="block text-sm font-medium text-gray-700">
        País de Registro
    </label>
    <input
        type="text"
        id="registration_scountrycode"
        name="registration_scountrycode"
        value={formData.registration_scountrycode}
        onChange={handleChange}
        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
</div>

{/* Provincia de registro */}
<div>
    <label htmlFor="registration_wprovincecode" className="block text-sm font-medium text-gray-700">
        Provincia de Registro
    </label>
    <input
        type="text"
        id="registration_wprovincecode"
        name="registration_wprovincecode"
        value={formData.registration_wprovincecode}
        onChange={handleChange}
        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
</div>

{/* Código postal de registro */}
<div>
    <label htmlFor="registration_szip" className="block text-sm font-medium text-gray-700">
        Código Postal de Registro
    </label>
    <input
        type="text"
        id="registration_szip"
        name="registration_szip"
        value={formData.registration_szip}
        onChange={handleChange}
        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
</div>

{/* Nombre del departamento de registro */}
<div>
    <label htmlFor="registration_sdepartmentname" className="block text-sm font-medium text-gray-700">
        Nombre del Departamento de Registro
    </label>
    <input
        type="text"
        id="registration_sdepartmentname"
        name="registration_sdepartmentname"
        value={formData.registration_sdepartmentname}
        onChange={handleChange}
        className="w-full px-4 py-1 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
</div>
                {/* Agrega más campos opcionales aquí */}
                <button
                    type="submit"
                    className="col-span-1 md:col-span-2 bg-indigo-600 text-white py-2 px-4 rounded-md shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                    {isEditing ? "Actualizar" : "Crear"}
                </button>
            </form>
        </div>
        </DashboardLayout>
    );
};

export default HotelSetting;