import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  getManualInvoiceData,
  fetchBuyerByDocument,
  createBuyer,
  createManualInvoice,
  clearManualInvoiceData
} from '../../Redux/Actions/taxxaActions';
import BuyerForm from '../../Taxxa/BuyerForm';

const FacturaManual = () => {
  const dispatch = useDispatch();
  const {
    buyer,
    manualInvoice: { data: invoiceData, loading: loadingData, creating, created }
  } = useSelector(state => state.taxxa);

  // Estados locales
  const [documentInput, setDocumentInput] = useState('');
  const [buyerSearchLoading, setBuyerSearchLoading] = useState(false);
  const [showBuyerForm, setShowBuyerForm] = useState(false);
  const [newBuyerData, setNewBuyerData] = useState(null);
  const [activeTab, setActiveTab] = useState('buyer');
  const [items, setItems] = useState([{ 
    description: '', 
    quantity: 1, 
    unitPrice: 0, 
    taxRate: 19 
  }]);
  const [notes, setNotes] = useState('');

  // Cargar datos iniciales y limpiar al desmontar
  useEffect(() => {
    dispatch(getManualInvoiceData());
    return () => dispatch(clearManualInvoiceData());
  }, [dispatch]);

  // Búsqueda de comprador con debounce
  useEffect(() => {
    const handler = setTimeout(async () => {
      if (documentInput.length >= 6) {
        setBuyerSearchLoading(true);
        setShowBuyerForm(false);
        const foundBuyer = await dispatch(fetchBuyerByDocument(documentInput));
        if (foundBuyer) {
          toast.success(`Comprador encontrado: ${foundBuyer.scostumername}`);
        } else {
          setShowBuyerForm(true);
          setNewBuyerData({ 
            jpartylegalentity: { 
              sdocno: documentInput,
              wdoctype: 13 // CC por defecto
            },
            jcontact: {
              scontactperson: '',
              selectronicmail: '',
              stelephone: ''
            },
            scostumername: '',
            sfiscalresponsibilities: 'R-99-PN'
          });
          toast.info('Comprador no encontrado. Por favor, complete los datos.');
        }
        setBuyerSearchLoading(false);
      } else {
        setShowBuyerForm(false);
      }
    }, 800);
    return () => clearTimeout(handler);
  }, [documentInput, dispatch]);

  // Crear nuevo comprador
  const handleCreateBuyer = async () => {
    if (!newBuyerData?.scostumername || !newBuyerData?.jcontact?.selectronicmail) {
      toast.error('El nombre y el email son obligatorios.');
      return;
    }
    
    // Validar que scontactperson esté presente
    if (!newBuyerData.scontactperson && !newBuyerData.jcontact?.scontactperson) {
      setNewBuyerData(prev => ({
        ...prev,
        scontactperson: prev.scostumername,
        jcontact: {
          ...prev.jcontact,
          scontactperson: prev.scostumername
        }
      }));
    }

    const result = await dispatch(createBuyer(newBuyerData));
    if (result && !result.error) {
      setShowBuyerForm(false);
      setActiveTab('items');
      toast.success('Comprador creado exitosamente. Ahora puede agregar items.');
    }
  };

  // Enviar factura final
  const handleSubmitInvoice = async () => {
    if (!buyer) {
      toast.error('Debe seleccionar o crear un comprador.');
      return setActiveTab('buyer');
    }
    
    const validItems = items.filter(i => 
      i.description.trim() && 
      i.quantity > 0 && 
      i.unitPrice > 0
    );
    
    if (validItems.length === 0) {
      toast.error('Agregue al menos un item válido.');
      return setActiveTab('items');
    }

    // Construir payload optimizado para tu backend
    const payload = { 
      buyer: {
        document: buyer.sdocno,
        name: buyer.scostumername,
        email: buyer.selectronicmail,
        phone: buyer.stelephone,
        docType: buyer.wdoctype || 13,
        address: buyer.jregistrationaddress?.saddressline1 || '',
        city: buyer.jregistrationaddress?.scityname || '',
        department: buyer.jregistrationaddress?.sdepartmentname || '',
        country: 'Colombia'
      },
      items: validItems.map(item => ({
        description: item.description.trim(),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        taxRate: Number(item.taxRate || 19)
      })), 
      notes: notes.trim() || 'Factura manual'
    };

    console.log('📤 Enviando factura manual:', payload);
    
    const result = await dispatch(createManualInvoice(payload));
    
    if (result && result.success) {
      // Limpiar formulario tras éxito
      setItems([{ description: '', quantity: 1, unitPrice: 0, taxRate: 19 }]);
      setNotes('');
      setDocumentInput('');
      setActiveTab('buyer');
      setShowBuyerForm(false);
    }
  };

  // --- Lógica de Items ---
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    if (['quantity', 'unitPrice', 'taxRate'].includes(field)) {
      newItems[index][field] = parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { 
      description: '', 
      quantity: 1, 
      unitPrice: 0, 
      taxRate: 19 
    }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // --- Cálculos ---
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unitPrice);
    }, 0);
    // ⭐ Las reservas de hotel NO llevan IVA (exentas de impuestos)
    return { 
      subtotal: Math.round(subtotal * 100) / 100, 
      tax: 0, 
      total: Math.round(subtotal * 100) / 100 
    };
  }, [items]);

  // Validar si puede avanzar de pestaña
  const canAdvanceToItems = buyer && (buyer.scostumername || buyer.name);
  const canAdvanceToReview = canAdvanceToItems && items.some(i => 
    i.description.trim() && i.quantity > 0 && i.unitPrice > 0
  );

  // --- Renderizado ---
  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="ml-3">Cargando datos de facturación...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">📝 Facturación Manual</h1>
        {invoiceData && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Próxima Factura:</p>
            <p className="text-lg font-mono text-blue-600">
              {invoiceData.fullInvoiceNumber}
            </p>
          </div>
        )}
      </div>

      {/* Pestañas de Navegación */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'buyer', label: '👤 Comprador', enabled: true },
            { key: 'items', label: `🛒 Items (${items.filter(i => i.description).length})`, enabled: canAdvanceToItems },
            { key: 'review', label: '📋 Revisar', enabled: canAdvanceToReview }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => tab.enabled && setActiveTab(tab.key)}
              disabled={!tab.enabled}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-indigo-500 text-indigo-600'
                  : tab.enabled
                  ? 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  : 'border-transparent text-gray-300 cursor-not-allowed'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contenido de la Pestaña Activa */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        {activeTab === 'buyer' && (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número de Documento del Comprador
              </label>
              <input 
                type="text" 
                value={documentInput} 
                onChange={(e) => setDocumentInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Ingrese el documento para buscar o crear comprador" 
              />
              {buyerSearchLoading && (
                <p className="text-sm text-blue-600 mt-2 flex items-center">
                  <span className="animate-spin mr-2">⏳</span>
                  Buscando comprador...
                </p>
              )}
            </div>

            {buyer && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-green-800 font-medium">
                  ✅ Comprador seleccionado: {buyer.scostumername}
                </p>
                <p className="text-green-600 text-sm">
                  Documento: {buyer.sdocno} | Email: {buyer.selectronicmail}
                </p>
                <button
                  onClick={() => setActiveTab('items')}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Continuar a Items →
                </button>
              </div>
            )}
            
            {showBuyerForm && (
              <div className="mt-6 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-orange-600 mb-4">
                  📝 Registrar Nuevo Comprador
                </h3>
                <BuyerForm jbuyer={newBuyerData} setBuyer={setNewBuyerData} />
                <div className="text-right mt-4">
                  <button 
                    onClick={handleCreateBuyer} 
                    className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                  >
                    💾 Guardar Comprador
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'items' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">🛒 Items a Facturar</h3>
              <button
                onClick={addItem}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                ➕ Agregar Item
              </button>
            </div>

            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-4 mb-4 items-center border-b border-gray-100 pb-4">
                <div className="col-span-12 md:col-span-5">
                  <input 
                    type="text" 
                    placeholder="Descripción del producto o servicio" 
                    value={item.description} 
                    onChange={e => updateItem(index, 'description', e.target.value)} 
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <input 
                    type="number" 
                    placeholder="Cantidad" 
                    min="1"
                    value={item.quantity} 
                    onChange={e => updateItem(index, 'quantity', e.target.value)} 
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="col-span-4 md:col-span-3">
                  <input 
                    type="number" 
                    placeholder="Precio Unitario" 
                    min="0"
                    step="0.01"
                    value={item.unitPrice} 
                    onChange={e => updateItem(index, 'unitPrice', e.target.value)} 
                    className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <button 
                    onClick={() => removeItem(index)} 
                    className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600 transition-colors disabled:bg-gray-300" 
                    disabled={items.length <= 1}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas adicionales (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales para la factura..."
                className="w-full p-3 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>

            {canAdvanceToReview && (
              <div className="text-right mt-6">
                <button
                  onClick={() => setActiveTab('review')}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Revisar Factura →
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'review' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">📋 Resumen de la Factura</h3>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-blue-800 mb-2">Información del Comprador</h4>
              <p><strong>Nombre:</strong> {buyer?.scostumername || 'No seleccionado'}</p>
              <p><strong>Documento:</strong> {buyer?.sdocno || 'N/A'}</p>
              <p><strong>Email:</strong> {buyer?.selectronicmail || 'N/A'}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-300 p-3 text-left">Descripción</th>
                    <th className="border border-gray-300 p-3 text-center">Cant.</th>
                    <th className="border border-gray-300 p-3 text-right">Precio Unit.</th>
                    <th className="border border-gray-300 p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.filter(i => i.description).map((item, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-3">{item.description}</td>
                      <td className="border border-gray-300 p-3 text-center">{item.quantity}</td>
                      <td className="border border-gray-300 p-3 text-right">${item.unitPrice.toLocaleString()}</td>
                      <td className="border border-gray-300 p-3 text-right">${(item.quantity * item.unitPrice).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-100 font-semibold">
                  <tr>
                    <td colSpan="3" className="border border-gray-300 p-3 text-right">Subtotal:</td>
                    <td className="border border-gray-300 p-3 text-right">${totals.subtotal.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td colSpan="3" className="border border-gray-300 p-3 text-right">IVA:</td>
                    <td className="border border-gray-300 p-3 text-right">Exento (0%)</td>
                  </tr>
                  <tr className="text-lg bg-green-100">
                    <td colSpan="3" className="border border-gray-300 p-3 text-right font-bold">Total:</td>
                    <td className="border border-gray-300 p-3 text-right font-bold">${totals.total.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {notes && (
              <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-yellow-800"><strong>Notas:</strong> {notes}</p>
              </div>
            )}

            <div className="text-center mt-8">
              <button 
                onClick={handleSubmitInvoice} 
                disabled={creating} 
                className={`px-8 py-3 rounded-lg text-lg font-semibold transition-colors ${
                  creating 
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                    : 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl'
                }`}
              >
                {creating ? (
                  <span className="flex items-center">
                    <span className="animate-spin mr-2">⏳</span>
                    Enviando a Taxxa...
                  </span>
                ) : (
                  '📤 Crear y Enviar Factura'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de éxito */}
      {created && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full mx-4 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-4 text-green-600">¡Factura Creada!</h2>
            <p className="mb-6 text-gray-700">
              La factura <strong>{created.invoiceNumber}</strong> ha sido enviada exitosamente a Taxxa.
            </p>
            <button
              onClick={() => {
                dispatch({ type: 'CREATE_MANUAL_INVOICE_RESET' });
                window.location.reload(); // O navegar a otra página
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Crear Nueva Factura
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturaManual;