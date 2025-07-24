import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { 
  getManualInvoiceData, 
  fetchBuyerByDocument,    // ⭐ USAR LA FUNCIÓN EXISTENTE
  createManualInvoice,
  clearManualInvoiceData
} from '../../Redux/Actions/taxxaActions';

const FacturaManual = () => {
  const dispatch = useDispatch();
  
  // 🔧 Estados Redux
  const { 
    buyer,                   // ⭐ USAR EL BUYER DEL ESTADO GLOBAL
    manualInvoice: {
      data: invoiceData,
      loading: loadingData,
      creating,
      created,
      createError
    }
  } = useSelector(state => state.taxxa);

  // 🔧 Estados locales
  const [activeTab, setActiveTab] = useState('buyer');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [buyerSearchLoading, setBuyerSearchLoading] = useState(false);
  const [buyerFound, setBuyerFound] = useState(false);
  const [showBuyerForm, setShowBuyerForm] = useState(false);
  
  // ⭐ FORMULARIO LOCAL SIMPLIFICADO
  const [localFormData, setLocalFormData] = useState({
    buyer: {
      document: '',
      docType: 13,
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      department: '',
      country: 'Colombia'
    },
    items: [{
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 19,
      totalPrice: 0
    }],
    notes: ''
  });

  // 🚀 Cargar datos iniciales al montar componente
  useEffect(() => {
    dispatch(getManualInvoiceData());
    
    return () => {
      dispatch(clearManualInvoiceData());
    };
  }, [dispatch]);

  // 🔍 Búsqueda automática de comprador con debounce USANDO FUNCIÓN EXISTENTE
  useEffect(() => {
    const document = localFormData.buyer.document?.trim();
    
    if (document && document.length >= 6) {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      setBuyerSearchLoading(true);
      
      const timeoutId = setTimeout(async () => {
        try {
          console.log('🔍 [MANUAL-BUYER] Buscando comprador:', document);
          
          // ⭐ USAR LA FUNCIÓN EXISTENTE
          const foundBuyer = await dispatch(fetchBuyerByDocument(document));
          
          if (foundBuyer) {
            console.log('✅ [MANUAL-BUYER] Comprador encontrado:', foundBuyer);
            
            // ⭐ AUTO-LLENAR FORMULARIO CON DATOS ENCONTRADOS
            setLocalFormData(prev => ({
              ...prev,
              buyer: {
                ...prev.buyer,
                document: foundBuyer.sdocno || document,
                name: foundBuyer.scostumername || '',
                email: foundBuyer.selectronicmail || '',
                phone: foundBuyer.stelephone || '',
                address: foundBuyer.jregistrationaddress?.saddressline1 || '',
                city: foundBuyer.jregistrationaddress?.scityname || '',
                department: foundBuyer.jregistrationaddress?.sdepartmentname || '',
                country: 'Colombia'
              }
            }));
            
            setBuyerFound(true);
            toast.success(`Comprador encontrado: ${foundBuyer.scostumername}`);
            
          } else {
            console.log('ℹ️ [MANUAL-BUYER] Comprador no encontrado');
            setBuyerFound(false);
            toast.info('Comprador no encontrado, se creará uno nuevo');
          }
          
        } catch (error) {
          console.error('❌ [MANUAL-BUYER] Error:', error);
          setBuyerFound(false);
          toast.error('Error al buscar comprador');
        } finally {
          setBuyerSearchLoading(false);
        }
      }, 800);
      
      setSearchTimeout(timeoutId);
    } else {
      setBuyerFound(false);
      setBuyerSearchLoading(false);
      
      // Limpiar buyer del formulario si se borra el documento
      if (!document) {
        setLocalFormData(prev => ({
          ...prev,
          buyer: {
            ...prev.buyer,
            name: '',
            email: '',
            phone: '',
            address: '',
            city: '',
            department: ''
          }
        }));
      }
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [localFormData.buyer.document, dispatch]);

  // 💰 Calcular totales automáticamente
  const calculatedTotals = useMemo(() => {
    const subtotal = localFormData.items.reduce((sum, item) => {
      const itemTotal = parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0);
      return sum + itemTotal;
    }, 0);
    
    const taxAmount = subtotal * 0.19; // 19% IVA
    const totalAmount = subtotal + taxAmount;
    
    return {
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2))
    };
  }, [localFormData.items]);

  // 🔧 Actualizar campo del comprador
  const updateBuyerField = (field, value) => {
    setLocalFormData(prev => ({
      ...prev,
      buyer: {
        ...prev.buyer,
        [field]: value
      }
    }));
    
    // Si se cambia el documento, limpiar estado de búsqueda
    if (field === 'document') {
      setBuyerFound(false);
    }
  };

  // 🔧 Actualizar item específico
  const updateItem = (index, field, value) => {
    setLocalFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index 
          ? { 
              ...item, 
              [field]: value,
              totalPrice: field === 'quantity' || field === 'unitPrice' 
                ? (field === 'quantity' ? value : item.quantity) * (field === 'unitPrice' ? value : item.unitPrice)
                : item.totalPrice
            }
          : item
      )
    }));
  };

  // ➕ Agregar nuevo item
  const addItem = () => {
    setLocalFormData(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 19,
          totalPrice: 0
        }
      ]
    }));
  };

  // ❌ Remover item
  const removeItem = (index) => {
    if (localFormData.items.length > 1) {
      setLocalFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  // 📝 Enviar factura
  const handleSubmit = async () => {
    // Validaciones básicas
    if (!localFormData.buyer.document || !localFormData.buyer.name) {
      toast.error('Complete los datos del comprador');
      setActiveTab('buyer');
      return;
    }

    const validItems = localFormData.items.filter(item => 
      item.description && item.quantity > 0 && item.unitPrice > 0
    );

    if (validItems.length === 0) {
      toast.error('Agregue al menos un item válido');
      setActiveTab('items');
      return;
    }

    // Preparar datos para envío
    const invoicePayload = {
      buyer: {
        document: localFormData.buyer.document.trim(),
        name: localFormData.buyer.name.trim(),
        email: localFormData.buyer.email?.trim() || '',
        phone: localFormData.buyer.phone?.trim() || '',
        docType: localFormData.buyer.docType || 13,
        address: localFormData.buyer.address?.trim() || '',
        city: localFormData.buyer.city?.trim() || '',
        department: localFormData.buyer.department?.trim() || '',
        country: localFormData.buyer.country || 'Colombia'
      },
      items: validItems.map(item => ({
        description: item.description.trim(),
        quantity: parseFloat(item.quantity),
        unitPrice: parseFloat(item.unitPrice),
        taxRate: item.taxRate || 19
      })),
      notes: localFormData.notes?.trim() || ''
    };

    console.log('📤 Enviando factura manual:', invoicePayload);

    const result = await dispatch(createManualInvoice(invoicePayload));
    
    if (result?.success) {
      // Reset formulario
      setLocalFormData({
        buyer: {
          document: '',
          docType: 13,
          name: '',
          email: '',
          phone: '',
          address: '',
          city: '',
          department: '',
          country: 'Colombia'
        },
        items: [{
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 19,
          totalPrice: 0
        }],
        notes: ''
      });
      
      setActiveTab('buyer');
      setShowBuyerForm(false);
      setBuyerFound(false);
      
      // Recargar datos para próxima factura
      dispatch(getManualInvoiceData());
    }
  };

  // 🎨 Renderizar tabs
  const renderTabs = () => (
    <div className="flex border-b border-gray-200 mb-6">
      {[
        { key: 'buyer', label: '👤 Comprador', count: localFormData.buyer.document ? '✓' : '!' },
        { key: 'items', label: '🛒 Items', count: localFormData.items.filter(i => i.description).length },
        { key: 'review', label: '📋 Revisar', count: calculatedTotals.totalAmount > 0 ? '✓' : '' }
      ].map(tab => (
        <button
          key={tab.key}
          onClick={() => setActiveTab(tab.key)}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors duration-200 ${
            activeTab === tab.key
              ? 'border-blue-500 text-blue-600 bg-blue-50'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          {tab.label} {tab.count && <span className="ml-1 text-xs">({tab.count})</span>}
        </button>
      ))}
    </div>
  );

  // 👤 Renderizar sección de comprador ACTUALIZADA
  const renderBuyerSection = () => (
    <div className="space-y-6">
      {/* Búsqueda de comprador */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Documento del comprador
        </label>
        <div className="flex gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={localFormData.buyer.document}
              onChange={(e) => updateBuyerField('document', e.target.value)}
              placeholder="Ingrese número de documento"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {/* ⭐ ESTADOS DE BÚSQUEDA ACTUALIZADOS */}
            {buyerSearchLoading && (
              <p className="text-sm text-blue-600 mt-1">
                🔍 Buscando comprador...
              </p>
            )}
            
            {buyerFound && buyer && (
              <p className="text-sm text-green-600 mt-1">
                ✅ Comprador encontrado: {buyer.scostumername || localFormData.buyer.name}
              </p>
            )}
            
            {localFormData.buyer.document.length >= 6 && !buyerSearchLoading && !buyerFound && (
              <p className="text-sm text-orange-600 mt-1">
                ℹ️ Comprador no encontrado, se creará uno nuevo
              </p>
            )}
          </div>
          
          <button
            onClick={() => setShowBuyerForm(!showBuyerForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {showBuyerForm ? 'Ocultar' : 'Completar'} datos
          </button>
        </div>
      </div>

      {/* Formulario completo del comprador */}
      {(showBuyerForm || !buyerFound) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo *
            </label>
            <input
              type="text"
              value={localFormData.buyer.name}
              onChange={(e) => updateBuyerField('name', e.target.value)}
              placeholder="Nombre del comprador"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={localFormData.buyer.email}
              onChange={(e) => updateBuyerField('email', e.target.value)}
              placeholder="email@ejemplo.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={localFormData.buyer.phone}
              onChange={(e) => updateBuyerField('phone', e.target.value)}
              placeholder="300 000 0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ciudad
            </label>
            <input
              type="text"
              value={localFormData.buyer.city}
              onChange={(e) => updateBuyerField('city', e.target.value)}
              placeholder="Ciudad"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={localFormData.buyer.address}
              onChange={(e) => updateBuyerField('address', e.target.value)}
              placeholder="Dirección completa"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      )}
    </div>
  );

  // 🛒 Renderizar sección de items
  const renderItemsSection = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Items a facturar</h3>
        <button
          onClick={addItem}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
        >
          ➕ Agregar item
        </button>
      </div>
      
      <div className="space-y-3">
        {localFormData.items.map((item, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Descripción *
                </label>
                <input
                  type="text"
                  value={item.description}
                  onChange={(e) => updateItem(index, 'description', e.target.value)}
                  placeholder="Descripción del producto/servicio"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Cantidad *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Precio unitario *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitPrice}
                  onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Total
                  </label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
                    ${((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}
                  </div>
                </div>
                
                {localFormData.items.length > 1 && (
                  <button
                    onClick={() => removeItem(index)}
                    className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                    title="Eliminar item"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Notas adicionales */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notas adicionales (opcional)
        </label>
        <textarea
          value={localFormData.notes}
          onChange={(e) => setLocalFormData(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="Notas o comentarios adicionales para la factura"
          rows="3"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );

  // 📋 Renderizar sección de revisión
  const renderReviewSection = () => (
    <div className="space-y-6">
      {/* Información de la factura */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          📄 Información de la factura
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-800">Número:</span>
            <p className="text-blue-700">
              {invoiceData?.fullInvoiceNumber || 'Cargando...'}
            </p>
          </div>
          <div>
            <span className="font-medium text-blue-800">Fecha:</span>
            <p className="text-blue-700">
              {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Datos del comprador */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          👤 Comprador
        </h3>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">Documento:</span> {localFormData.buyer.document}</p>
          <p><span className="font-medium">Nombre:</span> {localFormData.buyer.name}</p>
          {localFormData.buyer.email && (
            <p><span className="font-medium">Email:</span> {localFormData.buyer.email}</p>
          )}
          {localFormData.buyer.phone && (
            <p><span className="font-medium">Teléfono:</span> {localFormData.buyer.phone}</p>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          🛒 Items ({localFormData.items.filter(i => i.description).length})
        </h3>
        <div className="space-y-2">
          {localFormData.items
            .filter(item => item.description)
            .map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-200">
                <div className="flex-1">
                  <p className="font-medium">{item.description}</p>
                  <p className="text-sm text-gray-600">
                    {item.quantity} x ${item.unitPrice?.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    ${((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Totales */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-green-900 mb-3">
          💰 Resumen
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>${calculatedTotals.subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>IVA (19%):</span>
            <span>${calculatedTotals.taxAmount.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-bold text-lg border-t border-green-200 pt-2">
            <span>Total:</span>
            <span>${calculatedTotals.totalAmount.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Botón de envío */}
      <div className="flex justify-center">
        <button
          onClick={handleSubmit}
          disabled={creating || !localFormData.buyer.document || !localFormData.buyer.name || calculatedTotals.totalAmount === 0}
          className={`px-8 py-3 rounded-lg font-medium text-lg transition-colors ${
            creating
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          } ${
            !localFormData.buyer.document || !localFormData.buyer.name || calculatedTotals.totalAmount === 0
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
        >
          {creating ? (
            <>
              <span className="inline-block animate-spin mr-2">⏳</span>
              Enviando a Taxxa...
            </>
          ) : (
            '📤 Crear y enviar factura'
          )}
        </button>
      </div>
    </div>
  );

  // 🎨 Renderizar contenido principal
  const renderContent = () => {
    switch (activeTab) {
      case 'buyer':
        return renderBuyerSection();
      case 'items':
        return renderItemsSection();
      case 'review':
        return renderReviewSection();
      default:
        return renderBuyerSection();
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Cargando datos para facturación...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              📝 Facturación Manual
            </h1>
            <p className="text-gray-600 mt-1">
              Crear facturas para productos o servicios adicionales
            </p>
          </div>
          
          {invoiceData && (
            <div className="text-right">
              <p className="text-sm text-gray-600">Próxima factura:</p>
              <p className="text-xl font-bold text-blue-600">
                {invoiceData.fullInvoiceNumber}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs de navegación */}
      {renderTabs()}

      {/* Contenido principal */}
      <div className="bg-white">
        {renderContent()}
      </div>

      {/* Mostrar factura creada exitosamente */}
      {created && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">
                ¡Factura creada exitosamente!
              </h2>
              <p className="text-gray-600 mb-4">
                Factura <strong>{created.fullInvoiceNumber}</strong> enviada a Taxxa
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Total: ${created.totalAmount?.toLocaleString()}
              </p>
              <button
                onClick={() => {
                  dispatch({ type: 'CREATE_MANUAL_INVOICE_SUCCESS', payload: null });
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacturaManual;