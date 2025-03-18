import PropTypes from "prop-types";

const BuyerRegistrationForm = ({ buyer, setBuyer }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      setBuyer((prev) => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value.trim(),
        },
      }));
    } else {
      setBuyer((prev) => {
        const updatedBuyer = { ...prev, [name]: value.trim() };

        if (name === "wlegalorganizationtype") {
          updatedBuyer.sfiscalregime = value === "company" ? "48" : "49";
        }
        if (name === "sfiscalresponsibilities") {
          switch (value) {
            case "O1":
              updatedBuyer.stributaryidentificationkey = "01";
              updatedBuyer.stributaryidentificationname = "IVA";
              break;
            case "O4":
              updatedBuyer.stributaryidentificationkey = "04";
              updatedBuyer.stributaryidentificationname = "INC";
              break;
            case "ZA":
              updatedBuyer.stributaryidentificationkey = "ZA";
              updatedBuyer.stributaryidentificationname = "IVA e INC";
              break;
            case "R-99-PN":
              updatedBuyer.stributaryidentificationkey = "ZZ";
              updatedBuyer.stributaryidentificationname = "No aplica";
              break;
            default:
              updatedBuyer.stributaryidentificationkey = "";
              updatedBuyer.stributaryidentificationname = "";
              break;
          }
        }
        return updatedBuyer;
      });
    }
  };

  

  return (
    <div className="max-w-2xl mx-auto p-4 bg-gray-50 rounded shadow space-y-6">
      <h2 className="text-2xl font-bold text-center">Datos del Comprador</h2>

      {/* scostumername */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nombre / Razón Social:
        </label>
        <input
          type="text"
          name="scostumername"
          value={buyer.scostumername}
          onChange={handleChange}
          required
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ej. Juan Pérez"
        />
      </div>

      {/* wlegalorganizationtype */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tipo de Organización:
        </label>
        <select
          name="wlegalorganizationtype"
          value={buyer.wlegalorganizationtype}
          onChange={handleChange}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="person">Persona Natural</option>
          <option value="company">Persona Jurídica</option>
        </select>
      </div>

      {/* sfiscalresponsibilities */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Responsabilidad Fiscal:
        </label>
        <select
          name="sfiscalresponsibilities"
          value={buyer.sfiscalresponsibilities}
          onChange={handleChange}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="R-99-PN">No Aplica – Otros</option>
          <option value="O-1">IVA</option>
          <option value="O-4">INC</option>
          <option value="ZA">IVA e INC</option>
        </select>
      </div>

      {/* jpartylegalentity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tipo de Documento:
          </label>
          <select
            name="jpartylegalentity.wdoctype"
            value={buyer.jpartylegalentity.wdoctype}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <option value="PEP">PEP</option>
            <option value="PPT">PPT</option>
            <option value="FI">NIT de otro país</option>
            <option value="NUIP">NUIP</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Número de Documento:
          </label>
          <input
            type="text"
            name="jpartylegalentity.sdocno"
            value={buyer.jpartylegalentity.sdocno}
            onChange={handleChange}
            required
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ingrese número de documento"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Registro Corporativo (nombre):
        </label>
        <input
          type="text"
          name="jpartylegalentity.scorporateregistrationschemename"
          value={buyer.jpartylegalentity.scorporateregistrationschemename}
          onChange={handleChange}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ej. Juan Pérez"
        />
      </div>

      {/* jcontact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Persona de Contacto:
          </label>
          <input
            type="text"
            name="jcontact.scontactperson"
            value={buyer.jcontact.scontactperson}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nombre de contacto"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Correo Electrónico:
          </label>
          <input
            type="email"
            name="jcontact.selectronicmail"
            value={buyer.jcontact.selectronicmail}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="correo@ejemplo.com"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Teléfono:
        </label>
        <input
          type="text"
          name="jcontact.stelephone"
          value={buyer.jcontact.stelephone}
          onChange={handleChange}
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Número de teléfono"
        />
      </div>
    </div>
  );
};

BuyerRegistrationForm.propTypes = {
  buyer: PropTypes.shape({
    scostumername: PropTypes.string.isRequired,
    wlegalorganizationtype: PropTypes.string.isRequired,
    sfiscalresponsibilities: PropTypes.string.isRequired,
    jpartylegalentity: PropTypes.shape({
      wdoctype: PropTypes.string.isRequired,
      sdocno: PropTypes.string.isRequired,
      scorporateregistrationschemename: PropTypes.string.isRequired,
    }).isRequired,
    jcontact: PropTypes.shape({
      scontactperson: PropTypes.string.isRequired,
      selectronicmail: PropTypes.string.isRequired,
      stelephone: PropTypes.string.isRequired,
    }).isRequired,
    // Los nuevos campos, si es necesario
    sfiscalregime: PropTypes.string,
    stributaryidentificationkey: PropTypes.string,
    stributaryidentificationname: PropTypes.string,
  }).isRequired,
  setBuyer: PropTypes.func.isRequired,
};


export default BuyerRegistrationForm;
