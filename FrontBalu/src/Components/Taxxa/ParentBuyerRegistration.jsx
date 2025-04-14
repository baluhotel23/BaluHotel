import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDispatch , useSelector} from 'react-redux';
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
    // Obtener estado relevante de Redux
    const { buyer: buyerFromRedux, loading: loadingRedux, error: errorRedux } = useSelector(state => state.taxxa);
    const [buyer, setBuyer] = useState(initialBuyerState);
    // Usar el loading/error local o de Redux según la operación
    const [localLoading, setLocalLoading] = useState(false);
    const [localError, setLocalError] = useState(null);
    const [docChecked, setDocChecked] = useState(false); // Indica si ya se intentó verificar el documento
    const [buyerExists, setBuyerExists] = useState(false); // Indica si el fetch encontró un buyer

    // ... (useEffect para initialBuyerData) ...

    // Efecto para reaccionar a los resultados del fetch desde Redux
     useEffect(() => {
        // Solo reaccionar si estábamos esperando el resultado de un fetch (docChecked es true pero buyerExists es false)
        if (docChecked && !buyerExists) {
            if (!loadingRedux && buyerFromRedux) {
                console.log('Buyer encontrado vía Redux:', buyerFromRedux);
                setBuyerExists(true); // Marcar que existe
                // Actualizar el estado local para pre-rellenar el formulario
                setBuyer(prev => ({ ...prev, ...buyerFromRedux }));
                if (onComplete) {
                    onComplete(buyerFromRedux); // Usar datos de Redux
                }
            } else if (!loadingRedux && errorRedux) {
                // ... (manejo de error) ...
            }
        }
    }, [buyerFromRedux, loadingRedux, errorRedux, docChecked, buyerExists, onComplete]);



    const handleCheckDocument = async () => {
        // ... (validación de sdocno) ...
        setLocalLoading(true); // Podrías usar loadingRedux si prefieres
        setLocalError(null);
        setBuyerExists(false); // Reiniciar estado
        setDocChecked(true); // Indicar que se inició la verificación
        // Limpiar estado Redux anterior antes de despachar? Opcional.
        // dispatch({ type: 'FETCH_BUYER_RESET' }); // Necesitarías añadir este caso al reducer
        dispatch(fetchBuyerByDocument(buyer.jpartylegalentity.sdocno));
        // Ya no esperamos aquí, el useEffect reaccionará
        setLocalLoading(false); // O quitar esto y basarse en loadingRedux
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Asegurarse de no intentar crear si ya se encontró uno
        if (buyerExists) {
            setLocalError("No se puede crear un comprador que ya fue encontrado.");
            return;
        }

        setLocalLoading(true); // O usar loadingRedux
        setLocalError(null);
        try {
            // ... (construir buyerData) ...

            // Despachar createBuyer (asumiendo que devuelve el buyer creado o maneja errores)
            const createdBuyer = await dispatch(createBuyer(buyerData)); // createBuyer debería manejar su propio estado Redux

            // Idealmente, createBuyer también actualiza buyerFromRedux
            // y podrías tener otro useEffect para reaccionar a CREATE_BUYER_SUCCESS
            // Pero si createBuyer devuelve los datos directamente:
             if (createdBuyer && !createdBuyer.error) { // Ajusta según lo que realmente devuelva createBuyer
                 console.log('Buyer creado exitosamente:', createdBuyer);
                 if (onComplete) {
                     onComplete(createdBuyer); // Usar los datos devueltos/actualizados
                 }
                 setBuyer(initialBuyerState); // Limpiar formulario
                 setDocChecked(false); // Resetear estado
             } else {
                 // Si createBuyer devuelve un error en la respuesta
                 throw new Error(createdBuyer?.message || 'Error al crear el comprador.');
             }

        } catch (error) {
            // Capturar errores de la acción createBuyer o errores de red
             console.error("Error en handleSubmit:", error);
             // Usar el error de Redux si está disponible después de CREATE_BUYER_FAILURE
             setLocalError(errorRedux || error.message || 'Error desconocido al crear.');
        } finally {
            setLocalLoading(false); // O basarse en loadingRedux
        }
    };

    // Determinar el estado de carga y error combinado
    const isLoading = localLoading || loadingRedux;
    const displayError = localError || (docChecked && !buyerExists && errorRedux ? `Error Redux: ${errorRedux}` : null);


    return (
        <div className="max-w-3xl mx-auto p-6">
            <h1 className="text-3xl font-bold text-center mb-6">Registro del Comprador</h1>
            {displayError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    {displayError}
                </div>
            )}
            {/* Renderizado condicional */}
            {!docChecked ? (
                 // Modo inicial: solo documento
                <div>
                    <BuyerRegistrationForm buyer={buyer} setBuyer={setBuyer} onlyDoc={true} />
                    <div className="text-center">
                        <button onClick={handleCheckDocument} disabled={isLoading} /* ... clases ... */ >
                            {isLoading ? 'Verificando...' : 'Verificar Documento'}
                        </button>
                    </div>
                </div>
            ) : buyerExists ? (
                // Documento verificado, buyer encontrado (opcionalmente mostrar datos o solo mensaje)
                <div className="text-center p-4 bg-green-100 text-gray-700 rounded">
                    Comprador encontrado. Procediendo con la reserva...
                    {/* O podrías mostrar el formulario pre-rellenado y deshabilitado */}
                </div>
            ) : (
                 // Documento verificado, buyer NO encontrado -> Mostrar formulario completo para crear
                <form onSubmit={handleSubmit} className="space-y-6">
                    <BuyerRegistrationForm buyer={buyer} setBuyer={setBuyer} />
                    <div className="text-center">
                        <button type="submit" disabled={isLoading} /* ... clases ... */ >
                            {isLoading ? 'Enviando...' : 'Enviar Registro'}
                        </button>
                    </div>
                </form>
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
            wdoctype: PropTypes.string.isRequired, // Ensure this is validated
            sdocno: PropTypes.string,
            scorporateregistrationschemename: PropTypes.string,
        }),
        jcontact: PropTypes.shape({
            scontactperson: PropTypes.string.isRequired,
            selectronicmail: PropTypes.string, // Ensure this is validated
            stelephone: PropTypes.string.isRequired,
        }).isRequired,
    }),
    onComplete: PropTypes.func,
};

export default ParentBuyerRegistration;