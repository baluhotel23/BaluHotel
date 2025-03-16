import  { useState } from 'react';
import BuyerRegistrationForm from './BuyerRegistrationForm';

const initialBuyerState = {
  scostumername: '',
  wlegalorganizationtype: 'person',
  sfiscalresponsibilities: 'R-99-PN',
  jpartylegalentity: {
    wdoctype: '',
    sdocno: '',
    scorporateregistrationschemename: '',
  },
  jcontact: {
    scontactperson: '',
    selectronicmail: '',
    stelephone: '',
  },
};

const ParentBuyerRegistration = () => {
  const [buyer, setBuyer] = useState(initialBuyerState);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí envías el objeto buyer al backend o despachas la acción correspondiente.
    console.log('Datos del Buyer a enviar:', buyer);
    // Por ejemplo: dispatch(register(buyer));
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-6">Registro del Comprador</h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <BuyerRegistrationForm buyer={buyer} setBuyer={setBuyer} />
        <div className="text-center">
          <button
            type="submit"
            className="mt-4 w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded shadow"
          >
            Enviar Registro
          </button>
        </div>
      </form>
    </div>
  );
};

export default ParentBuyerRegistration;