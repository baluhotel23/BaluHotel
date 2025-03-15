import React from 'react';
import PropTypes from 'prop-types';

const BuyerForm = ({ jbuyer, setBuyer }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;

    setBuyer((prevBuyer) => {
      let updatedBuyer = { ...prevBuyer };

      // Condicionales para actualizar campos específicos en la estructura
      if (name in updatedBuyer) {
        updatedBuyer[name] = value;
      } else if (name in updatedBuyer.jpartylegalentity) {
        updatedBuyer.jpartylegalentity[name] = value;
      } else if (name in updatedBuyer.jcontact) {
        updatedBuyer.jcontact[name] = value;
      }

      // Actualiza `sfiscalregime` basado en `wlegalorganizationtype`
      if (name === 'wlegalorganizationtype') {
        updatedBuyer.sfiscalregime = value === 'company' ? '48' : '49';
      }

      // Condicional para `sfiscalresponsibilities`
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

      console.log('Updated Buyer:', updatedBuyer); // Imprimir el objeto actualizado para depuración

      return updatedBuyer;
    });
  };

  return (
    <>
      <label>
        Nombre/Razón Social:
        <input type="text" name="scostumername" value={jbuyer.scostumername} onChange={handleChange} />
      </label>
      <label>
        Tipo de Organización:
        <select name="wlegalorganizationtype" value={jbuyer.wlegalorganizationtype} onChange={handleChange}>
          <option value="person">Persona Natural</option>
          <option value="company">Persona Jurídica</option>
        </select>
      </label>
      <label>
        Responsabilidad Fiscal:
        <select name="sfiscalresponsibilities" value={jbuyer.sfiscalresponsibilities} onChange={handleChange}>
          <option value="R-99-PN">No aplica – Otros *</option>
          <option value="O1">IVA</option>
          <option value="O4">INC</option>
          <option value="ZA">IVA e INC</option>
        </select>
      </label>
      <label>
        Tipo de Documento:
        <select name="wdoctype" value={jbuyer.jpartylegalentity.wdoctype} onChange={handleChange}>
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
      </label>
      <label>
        Número de Documento:
        <input type="text" name="sdocno" value={jbuyer.jpartylegalentity.sdocno} onChange={handleChange} />
      </label>
      <label>
        Persona de Contacto:
        <input type="text" name="scontactperson" value={jbuyer.jcontact.scontactperson} onChange={handleChange} />
      </label>
      <label>
        Correo Electrónico:
        <input type="email" name="selectronicmail" value={jbuyer.jcontact.selectronicmail} onChange={handleChange} />
      </label>
      <label>
        Teléfono:
        <input type="text" name="stelephone" value={jbuyer.jcontact.stelephone} onChange={handleChange} />
      </label>
    </>
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
    }),
  }).isRequired,
  setBuyer: PropTypes.func.isRequired,
};

export default BuyerForm;


  
