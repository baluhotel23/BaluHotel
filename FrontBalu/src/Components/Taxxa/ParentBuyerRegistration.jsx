import { useState } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { createBuyer } from '../../Redux/Actions/taxxaActions';
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

const ParentBuyerRegistration = ({ onComplete }) => {
  const dispatch = useDispatch();
  const [buyer, setBuyer] = useState(initialBuyerState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
  
    try {
      // Validar que los campos requeridos estén presentes
      if (!buyer.jpartylegalentity.sdocno || !buyer.jpartylegalentity.wdoctype) {
        throw new Error('El número y tipo de documento son requeridos');
      }
  
      // Asegurarse de que los campos dependientes estén completos
      const buyerData = {
        ...buyer,
        scostumername: buyer.scostumername.trim(),
        jpartylegalentity: {
          ...buyer.jpartylegalentity,
          scorporateregistrationschemename: buyer.scostumername.trim()
        },
        jcontact: {
          ...buyer.jcontact,
          scontactperson: buyer.scostumername.trim()
        }
      };
  
      console.log('Enviando datos del buyer:', buyerData);
      
      const response = await dispatch(createBuyer(buyerData));
  
      if (response.error) {
        throw new Error(response.message);
      }
  
      console.log('Buyer creado exitosamente:', response.data);
      
      if (onComplete) {
        onComplete(response.data);
      }
      
      setBuyer(initialBuyerState);
      
    } catch (error) {
      console.error('Error al crear buyer:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-center mb-6">Registro del Comprador</h1>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <BuyerRegistrationForm buyer={buyer} setBuyer={setBuyer} />
        <div className="text-center">
          <button
            type="submit"
            disabled={loading}
            className={`mt-4 w-full md:w-auto ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white font-semibold py-2 px-6 rounded shadow`}
          >
            {loading ? 'Enviando...' : 'Enviar Registro'}
          </button>
        </div>
      </form>
    </div>
  );
};
ParentBuyerRegistration.propTypes = {
  onComplete: PropTypes.func,
};

export default ParentBuyerRegistration;
