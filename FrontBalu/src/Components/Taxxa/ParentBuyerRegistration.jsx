import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch } from 'react-redux';
import { createBuyer, fetchBuyerByDocument } from '../../Redux/Actions/taxxaActions';
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

const ParentBuyerRegistration = ({ initialBuyerData, onComplete }) => {
    const dispatch = useDispatch();
    const [buyer, setBuyer] = useState(initialBuyerState);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [docChecked, setDocChecked] = useState(false);

    useEffect(() => {
        if (initialBuyerData) {
            setBuyer({
                scostumername: initialBuyerData.scostumername || '',
                wlegalorganizationtype: initialBuyerData.wlegalorganizationtype || 'person',
                sfiscalresponsibilities: initialBuyerData.sfiscalresponsibilities || 'R-99-PN',
                jpartylegalentity: {
                    wdoctype: initialBuyerData.wdoctype || '',
                    sdocno: initialBuyerData.sdocno || '',
                    scorporateregistrationschemename: initialBuyerData.scorporateregistrationschemename || '',
                },
                jcontact: {
                    scontactperson: initialBuyerData.scontactperson || '',
                    selectronicmail: initialBuyerData.selectronicmail || '',
                    stelephone: initialBuyerData.stelephone || '',
                },
            });
            setDocChecked(true); // Pasar directamente al modo "formulario completo"
            // Llamar a onComplete para notificar al componente padre que los datos están listos
            if (onComplete) {
                onComplete(initialBuyerData);
            }
        }
    }, [initialBuyerData, onComplete]);

    // Primer paso: verificar si existe el buyer usando el documento
    const handleCheckDocument = async () => {
        if (!buyer.jpartylegalentity.sdocno) {
            setError('El número de documento es requerido para la verificación');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await dispatch(
                fetchBuyerByDocument(buyer.jpartylegalentity.sdocno)
            );
            // Si se encuentra al buyer, se utiliza la data y se llama onComplete
            if (response && response.payload) {
                console.log('Buyer ya existe:', response.payload);
                if (onComplete) {
                    onComplete(response.payload);
                }
            } else {
                // No se encontró: se permite completar el resto del formulario
                setDocChecked(true);
            }
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Segundo paso: enviar el formulario completo para crear el buyer
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const buyerData = {
                ...buyer,
                scostumername: buyer.scostumername.trim(),
                jpartylegalentity: {
                    ...buyer.jpartylegalentity,
                    scorporateregistrationschemename: buyer.scostumername.trim(),
                },
                jcontact: {
                    ...buyer.jcontact,
                    scontactperson: buyer.scostumername.trim(),
                },
            };
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
            {/* Mostrar el formulario completo directamente si initialBuyerData está presente */}
            {initialBuyerData || docChecked ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Modo formulario completo: se muestran todos los campos */}
                    <BuyerRegistrationForm buyer={buyer} setBuyer={setBuyer} />
                    <div className="text-center">
                        <button
                            type="submit"
                            disabled={loading}
                            className={`mt-4 w-full md:w-auto ${
                                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                            } text-white font-semibold py-2 px-6 rounded shadow`}
                        >
                            {loading ? 'Enviando...' : 'Enviar Registro'}
                        </button>
                    </div>
                </form>
            ) : (
                <div>
                    {/* Modo solo documento: se muestran solo los campos para elegir el tipo y número */}
                    <BuyerRegistrationForm buyer={buyer} setBuyer={setBuyer} onlyDoc={true} />
                    <div className="text-center">
                        <button
                            onClick={handleCheckDocument}
                            disabled={loading}
                            className={`mt-4 w-full md:w-auto ${
                                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                            } text-white font-semibold py-2 px-6 rounded shadow`}
                        >
                            {loading ? 'Verificando...' : 'Verificar Documento'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

ParentBuyerRegistration.propTypes = {
    initialBuyerData: PropTypes.shape({
        scostumername: PropTypes.string,
        wlegalorganizationtype: PropTypes.string,
        sfiscalresponsibilities: PropTypes.string,
        jpartylegalentity: PropTypes.shape({
            wdoctype: PropTypes.string.isRequired,
            sdocno: PropTypes.string,
            scorporateregistrationschemename: PropTypes.string,
        }),
        jcontact: PropTypes.shape({
            scontactperson: PropTypes.string.isRequired,
            selectronicmail: PropTypes.string, // Ensure this is validated
            stelephone: PropTypes.string,
        }).isRequired,
    }),
    onComplete: PropTypes.func,
};

export default ParentBuyerRegistration;