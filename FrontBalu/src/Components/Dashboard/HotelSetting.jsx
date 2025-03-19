import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSellerData, updateSellerData } from "../../Redux/Actions/taxxaActions";
import { toast } from "react-toastify";
import DashboardLayout from "./DashboardLayout";

const HotelSetting = ({ existingData }) => {
    const dispatch = useDispatch();

    // Estado inicial del formulario
    const [formData, setFormData] = useState({
        name: existingData?.name || "", // Campo obligatorio
        address: existingData?.address || "", // Campo obligatorio
        contactInfo: existingData?.contactInfo || [{ instagram: "" }], // Inicializa como un array con un objeto vacío
        wlegalorganizationtype: existingData?.wlegalorganizationtype || "company",
        sfiscalresponsibilities: existingData?.sfiscalresponsibilities || "O-47",
        sdocno: existingData?.sdocno || "",
        sdoctype: existingData?.sdoctype || "NIT",
        ssellername: existingData?.ssellername || "",
        ssellerbrand: existingData?.ssellerbrand || "",
        scontactperson: existingData?.scontactperson || "",
        saddresszip: existingData?.saddresszip || "",
        wdepartmentcode: existingData?.wdepartmentcode || "",
        wtowncode: existingData?.wtowncode || "",
        scityname: existingData?.scityname || "",
        contact_selectronicmail: existingData?.contact_selectronicmail || "",
        registration_wdepartmentcode: existingData?.registration_wdepartmentcode || "",
        registration_scityname: existingData?.registration_scityname || "",
        registration_saddressline1: existingData?.registration_saddressline1 || "",
        registration_scountrycode: existingData?.registration_scountrycode || "CO",
        registration_wprovincecode: existingData?.registration_wprovincecode || "",
        registration_szip: existingData?.registration_szip || "",
        registration_sdepartmentname: existingData?.registration_sdepartmentname || "",
    });

    useEffect(() => {
        if (existingData) {
            setFormData(existingData);
        }
    }, [existingData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevFormData) => ({
            ...prevFormData,
            [name]: value,
        }));
    };

    // Manejo especial para el campo de Instagram dentro de contactInfo
    const handleInstagramChange = (e) => {
        const { value } = e.target;
        setFormData((prevFormData) => ({
            ...prevFormData,
            contactInfo: [{ instagram: value }], // Actualiza el array con el nuevo valor
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Datos enviados:", formData);

        if (existingData) {
            const success = await dispatch(updateSellerData(existingData.id, formData));
            if (success) {
                toast.success("Datos actualizados correctamente.");
            } else {
                toast.error("Error al actualizar los datos.");
            }
        } else {
            const success = await dispatch(createSellerData(formData));
            if (success) {
                toast.success("Datos creados correctamente.");
            } else {
                toast.error("Error al crear los datos.");
            }
        }
    };

    return (
        <DashboardLayout>
        <div className="max-w-4xl mx-auto p-6 bg-white shadow-md rounded-lg">
            <h2 className="text-2xl font-bold text-center mb-4">
                {existingData ? "Actualizar Datos del Hotel" : "Datos Hotel"}
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
                        value={formData.contactInfo[0]?.instagram || ""}
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
                    {existingData ? "Actualizar" : "Crear"}
                </button>
            </form>
        </div>
        </DashboardLayout>
    );
};

export default HotelSetting;