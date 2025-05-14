import React, { useEffect } from 'react';
import PropTypes from 'prop-types';

const BuyerForm = ({ jbuyer = {}, setBuyer }) => {
  // Valores por defecto para evitar errores de acceso
  const safeBuyer = {
    scostumername: "",
    wlegalorganizationtype: "person",
    sfiscalresponsibilities: "R-99-PN",
    jpartylegalentity: {
      wdoctype: "",
      sdocno: "",
      ...(jbuyer.jpartylegalentity || {})
    },
    jcontact: {
      scontactperson: "",
      selectronicmail: "",
      stelephone: "",
      jregistrationaddress: {
        scountrycode: "CO",
        wdepartmentcode: "50",
        wtowncode: "50226",
        scityname: "Cumaral",
        saddressline1: "12 # 17 -57",
        szip: "501021",
        ...(jbuyer.jcontact?.jregistrationaddress || {})
      },
      ...(jbuyer.jcontact || {})
    },
    ...jbuyer
  };

  useEffect(() => {
    setBuyer(() => ({
      ...safeBuyer,
      jcontact: {
        ...safeBuyer.jcontact,
        jregistrationaddress: {
          ...safeBuyer.jcontact.jregistrationaddress,
          scountrycode: "CO",
          wdepartmentcode: "50",
          wtowncode: "50226",
          scityname: "Cumaral",
          saddressline1: "12 # 17 -57",
          szip: "501021"
        }
      }
    }));
    // eslint-disable-next-line
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setBuyer((prevBuyer) => {
      let updatedBuyer = { ...prevBuyer };

      // Handle address fields separately
      if (name.startsWith('address.')) {
        const addressField = name.split('.')[1];
        updatedBuyer.jcontact = updatedBuyer.jcontact || {};
        updatedBuyer.jcontact.jregistrationaddress = {
          ...(updatedBuyer.jcontact.jregistrationaddress || {}),
          [addressField]: value
        };
        return updatedBuyer;
      }

      // Handle other fields
      if (name in updatedBuyer) {
        updatedBuyer[name] = value;
      } else if (name in (updatedBuyer.jpartylegalentity || {})) {
        updatedBuyer.jpartylegalentity = updatedBuyer.jpartylegalentity || {};
        updatedBuyer.jpartylegalentity[name] = value;
      } else if (name in (updatedBuyer.jcontact || {})) {
        updatedBuyer.jcontact = updatedBuyer.jcontact || {};
        updatedBuyer.jcontact[name] = value;
      }

      // Handle special cases
      if (name === 'wlegalorganizationtype') {
        updatedBuyer.sfiscalregime = value === 'company' ? '48' : '49';
      }

      if (name === 'sfiscalresponsibilities') {
        switch (value) {
          case 'O1':
            updatedBuyer.stributaryidentificationkey = '01';
            updatedBuyer.stributaryidentificationname = 'IVA';
            break;
          case 'O4':
            updatedBuyer.stributaryidentificationkey = '04';
            updatedBuyer.stributaryidentificationname = 'INC';
            break;
          case 'ZA':
            updatedBuyer.stributaryidentificationkey = 'ZA';
            updatedBuyer.stributaryidentificationname = 'IVA e INC';
            break;
          case 'R-99-PN':
            updatedBuyer.stributaryidentificationkey = 'ZZ';
            updatedBuyer.stributaryidentificationname = 'No aplica';
            break;
          default:
            updatedBuyer.stributaryidentificationkey = '';
            updatedBuyer.stributaryidentificationname = '';
            break;
        }
      }

      return updatedBuyer;
    });
  };

  return (
    <form className="bg-white rounded-lg shadow-md p-6 space-y-6 max-w-xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold mb-1">Nombre/Razón Social</label>
          <input
            type="text"
            name="scostumername"
            value={safeBuyer.scostumername}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ej: Juan Pérez"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Tipo de Organización</label>
          <select
            name="wlegalorganizationtype"
            value={safeBuyer.wlegalorganizationtype}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="person">Persona Natural</option>
            <option value="company">Persona Jurídica</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Responsabilidad Fiscal</label>
          <select
            name="sfiscalresponsibilities"
            value={safeBuyer.sfiscalresponsibilities}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="R-99-PN">No aplica – Otros *</option>
            <option value="O1">IVA</option>
            <option value="O4">INC</option>
            <option value="ZA">IVA e INC</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Tipo de Documento</label>
          <select
            name="wdoctype"
            value={safeBuyer.jpartylegalentity.wdoctype}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
          <label className="block text-sm font-semibold mb-1">Número de Documento</label>
          <input
            type="text"
            name="sdocno"
            value={safeBuyer.jpartylegalentity.sdocno}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ej: 12345678"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Persona de Contacto</label>
          <input
            type="text"
            name="scontactperson"
            value={safeBuyer.jcontact.scontactperson}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ej: Juan Pérez"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Correo Electrónico</label>
          <input
            type="email"
            name="selectronicmail"
            value={safeBuyer.jcontact.selectronicmail}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="correo@ejemplo.com"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Teléfono</label>
          <input
            type="text"
            name="stelephone"
            value={safeBuyer.jcontact.stelephone}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ej: 3001234567"
            required
          />
        </div>
      </div>
      {/* Puedes agregar aquí más campos o secciones si lo necesitas */}
    </form>
  );
};

BuyerForm.propTypes = {
  jbuyer: PropTypes.shape({
    scostumername: PropTypes.string,
    wlegalorganizationtype: PropTypes.string,
    sfiscalresponsibilities: PropTypes.string,
    jpartylegalentity: PropTypes.shape({
      wdoctype: PropTypes.string,
      sdocno: PropTypes.string,
    }),
    jcontact: PropTypes.shape({
      scontactperson: PropTypes.string,
      selectronicmail: PropTypes.string,
      stelephone: PropTypes.string,
      jregistrationaddress: PropTypes.shape({
        scountrycode: PropTypes.string,
        wdepartmentcode: PropTypes.string,
        wtowncode: PropTypes.string,
        scityname: PropTypes.string,
        saddressline1: PropTypes.string,
        szip: PropTypes.string
      })
    }),
  }),
  setBuyer: PropTypes.func.isRequired,
};

export default BuyerForm;