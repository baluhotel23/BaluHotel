/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSellerData, updateSellerData, createSellerData } from '../../Redux/Actions/actions';
import { useNavigate } from 'react-router-dom';
import Navbar2 from '../Navbar2';

const SellerForm = ({ jseller, setSeller }) => {
  const dispatch = useDispatch();
  const sellerData = useSelector((state) => state.sellerData.data);
  console.log(sellerData);

 const navigate = useNavigate();

  const [formData, setFormData] = useState({
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
    jcontact: {
      selectronicmail: "",
      jregistrationaddress: {
        wdepartmentcode: "",
        scityname: "",
        saddressline1: "",
        scountrycode: "CO",
        wprovincecode: "",
        szip: "",
        sdepartmentname: "",
      },
    },
  });
  

  const updateNestedField = (obj, path, value) => {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  };

  useEffect(() => {
    dispatch(fetchSellerData());
    console.log('fetchSellerData ejecutado'); // Confirmación de la acción
  }, [dispatch]);

  useEffect(() => {
    if (sellerData) {
      console.log('Datos del vendedor cargados:', sellerData); // Verifica los datos iniciales
      setFormData(sellerData);
    }
  }, [sellerData]);
  

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Datos enviados:', formData);
  
    // Construir el objeto a enviar al backend
    const dataToSend = {
      wlegalorganizationtype: formData.wlegalorganizationtype,
      sfiscalresponsibilities: formData.sfiscalresponsibilities,
      sdocno: formData.sdocno,
      sdoctype: formData.sdoctype,
      ssellername: formData.ssellername,
      ssellerbrand: formData.ssellerbrand,
      scontactperson: formData.scontactperson,
      saddresszip: formData.saddresszip,
      wdepartmentcode: formData.wdepartmentcode,
      wtowncode: formData.wtowncode,
      scityname: formData.scityname,
      jcontact: {
        selectronicmail: formData.jcontact.selectronicmail,
        jregistrationaddress: {
          wdepartmentcode: formData.jcontact.jregistrationaddress.wdepartmentcode,
          scityname: formData.jcontact.jregistrationaddress.scityname,
          saddressline1: formData.jcontact.jregistrationaddress.saddressline1,
          scountrycode: formData.jcontact.jregistrationaddress.scountrycode,
          wprovincecode: formData.jcontact.jregistrationaddress.wprovincecode,
          szip: formData.jcontact.jregistrationaddress.szip,
          sdepartmentname: formData.jcontact.jregistrationaddress.sdepartmentname,
        },
      },
    };
  
    console.log('Datos a enviar:', dataToSend);
  
    if (sellerData && sellerData.sdocno) {
      // Actualizar datos existentes
      const success = await dispatch(updateSellerData(sellerData.sdocno, dataToSend));
      if (success) {
        alert("Datos actualizados con éxito");
        navigate("/panel");
      } else {
        alert("Error al actualizar los datos");
      }
    } else {
      // Crear nuevos datos
      const success = await dispatch(createSellerData(dataToSend));
      if (success) {
        alert("Datos creados con éxito");
        navigate("/panel");
      } else {
        alert("Error al crear los datos");
      }
    }
  };
  
  
  const handleChange = (e) => {
    const { name, value } = e.target;
  
    setFormData(prevFormData => {
      const updatedFormData = { ...prevFormData };
  
      if (name.includes('jcontact.jregistrationaddress')) {
        const path = name.split('.').slice(2).join('.');
        updateNestedField(updatedFormData.jcontact.jregistrationaddress, path, value);
      } else if (name.includes('jcontact')) {
        const path = name.split('.').slice(1).join('.');
        updateNestedField(updatedFormData.jcontact, path, value);
      } else {
        updatedFormData[name] = value;
      }
  
      return updatedFormData;
    });
  };


  return (
    <div>
    <Navbar2/>
    <form onSubmit={handleSubmit} className="p-8 max-w-7xl mx-auto bg-white shadow-lg mt-20 rounded-lg">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800">Datos del Comercio</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">
            Tipo de Organización Legal:
          </label>
          <select
            name="wlegalorganizationtype"
            value={formData.wlegalorganizationtype}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="person">Persona Natural</option>
            <option value="company">Persona Jurídica</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">
            Responsabilidad Fiscal:
          </label>
          <select
            name="sfiscalresponsibilities"
            value={formData.sfiscalresponsibilities}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="R-99-PN">No aplica – Otros *</option>
            <option value="O-13"> Gran contribuyente </option>
            <option value="O-15"> Autorretenedor</option>
            <option value="O-23">Agente de retención IVA</option>
            <option value="O-47">Régimen simple de tributación</option>

          </select>
        </div>
       

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">
            Número de Documento:
          </label>
          <input
            type="text"
            name="sdocno"
            value={formData.sdocno}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">
            Tipo de Documento:
          </label>
          <select
            name="sdoctype"
            value={formData.sdoctype}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
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

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Razón Social del Vendedor:</label>
          <input
            type="text"
            name="ssellername"
            value={formData.ssellername}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        
        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Nombre Comercial:</label>
          <input
            type="text"
            name="ssellerbrand"
            value={formData.ssellerbrand}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="mb-4">
          <label className="block text-gray-700 mb-2">Contacto (Nombre):</label>
          <input
            type="text"
            name="scontactperson"
            value={formData.scontactperson}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2"> Código Postal:</label>
          <input
            type="text"
            name="saddresszip"
            value={formData.saddresszip}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2"> Código Depto:</label>
          <input
            type="text"
            name="wdepartmentcode"
            value={formData.wdepartmentcode}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2"> Código Ciudad:</label>
          <input
            type="text"
            name="wtowncode"
            value={formData.wtowncode}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="mb-4">
          <label className="block text-gray-700 mb-2"> Ciudad (Nombre):</label>
          <input
            type="text"
            name="scityname"
            value={formData.scityname}
            onChange={handleChange}
            className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
         {/* Contact Information Section */}
         <div className="mb-4 col-span-full md:col-span-2 lg:col-span-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-800">
            Información de Contacto
          </h3>
        </div>
        <div className="mb-4">
        <label className="block text-gray-700 mb-2">Correo Electrónico:</label>
        <input
          type="email"
          name="jcontact.selectronicmail" // Campo anidado
          value={formData.jcontact.selectronicmail}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Departamento (Código):</label>
        <input
          type="text"
          name="jcontact.jregistrationaddress.wdepartmentcode" // Campo anidado
          value={formData.jcontact.jregistrationaddress.wdepartmentcode}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Ciudad (Nombre):</label>
        <input
          type="text"
          name="jcontact.jregistrationaddress.scityname" // Campo anidado
          value={formData.jcontact.jregistrationaddress.scityname}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Domicilio:</label>
        <input
          type="text"
          name="jcontact.jregistrationaddress.saddressline1" // Campo anidado
          value={formData.jcontact.jregistrationaddress.saddressline1}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Código Ciudad:</label>
        <input
          type="text"
          name="jcontact.jregistrationaddress.scountrycode" // Campo anidado
          value={formData.jcontact.jregistrationaddress.scountrycode}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Código Provincia:</label>
        <input
          type="text"
          name="jcontact.jregistrationaddress.wprovincecode" // Campo anidado
          value={formData.jcontact.jregistrationaddress.wprovincecode}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Código Postal:</label>
        <input
          type="text"
          name="jcontact.jregistrationaddress.szip" // Campo anidado
          value={formData.jcontact.jregistrationaddress.szip}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="mb-4">
        <label className="block text-gray-700 mb-2">Departamento:</label>
        <input
          type="text"
          name="jcontact.jregistrationaddress.sdepartmentname" // Campo anidado
          value={formData.jcontact.jregistrationaddress.sdepartmentname}
          onChange={handleChange}
          className="w-full px-4 py-2 border rounded bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      </div>

      <button
        type="submit"
        className="mt-6 w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg transition duration-200"
      >
        Guardar Cambios
      </button>
    </form>
    </div>
  );
};

export default SellerForm;


