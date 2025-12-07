import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPurchase } from '../../Redux/Actions/purchaseActions';
import { getAllItems } from '../../Redux/Actions/inventoryActions';
import { toast } from 'react-toastify';
import { FaPlus, FaSave, FaTimes } from 'react-icons/fa';
import ItemSelector from './ItemSelector';
import PurchaseItemForm from './PurchaseItemForm';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../Dashboard/DashboardLayout';
import { openCloudinaryWidget } from '../../cloudinaryConfig';
import { 
  getCurrentDate, 
  formatDateForBackend, 
  isValidPastDate, 
  getMaxDate, 
  getMinDate 
} from '../../utils/dateHelpers';

const PurchaseForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const inventory = useSelector((state) => state.inventory?.inventory || []);
  const { user } = useSelector((state) => state.auth);
  const { loading } = useSelector((state) => state.purchase || {});

  const [showItemSelector, setShowItemSelector] = useState(false);
  const [receipt, setReceipt] = useState(null); // Estado para el comprobante
  const [purchase, setPurchase] = useState({
    supplier: '',
    invoiceNumber: '',
    purchaseDate: getCurrentDate(), // ⭐ Usar utilidad de fecha
    paymentMethod: 'cash',
    paymentStatus: 'paid',
    notes: '',
    items: [],
    totalAmount: 0,
  });

  useEffect(() => {
    dispatch(getAllItems());
  }, [dispatch]);

  // Calcular total general
  useEffect(() => {
    const total = purchase.items.reduce((sum, item) => 
      sum + (item.quantity * item.price), 0);
    
    setPurchase(prev => ({
      ...prev,
      totalAmount: total
    }));
  }, [purchase.items]);

  const handleItemSelect = (selectedItem) => {
    const newItem = {
      id: Date.now(), // ID temporal para manipulación del ítem en el frontend
      itemId: selectedItem.id || selectedItem.itemId,
      quantity: 1,
      price: selectedItem.unitPrice || 0,
      total: selectedItem.unitPrice || 0
    };
    
    setPurchase({
      ...purchase,
      items: [...purchase.items, newItem]
    });
    
    setShowItemSelector(false);
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...purchase.items];
    updatedItems[index][field] = value;
    
    // Actualizar total del ítem
    if (field === 'quantity' || field === 'price') {
      updatedItems[index].total = updatedItems[index].quantity * updatedItems[index].price;
    }
    
    setPurchase({
      ...purchase,
      items: updatedItems
    });
  };

  const handleRemoveItem = (index) => {
    const updatedItems = purchase.items.filter((_, i) => i !== index);
    setPurchase({
      ...purchase,
      items: updatedItems
    });
  };

  const handleInputChange = (field, value) => {
    setPurchase({
      ...purchase,
      [field]: value
    });
  };

  const validateForm = () => {
    // Validación de datos básicos de la compra
    if (!purchase.supplier.trim()) {
      toast.error('Debe ingresar un proveedor');
      return false;
    }
    
    // Validación de fecha
    if (!purchase.purchaseDate) {
      toast.error('Debe seleccionar una fecha de compra');
      return false;
    }
    
    // ⭐ Validar que la fecha no sea futura usando utilidad
    if (!isValidPastDate(purchase.purchaseDate)) {
      toast.error('La fecha de compra no puede ser en el futuro');
      return false;
    }
    
    // Validación del método de pago
    const validPaymentMethods = ['cash', 'credit_card', 'transfer', 'credit'];
    if (!validPaymentMethods.includes(purchase.paymentMethod)) {
      toast.error('Método de pago inválido');
      return false;
    }
    
    // Validación del estado de pago
    const validPaymentStatus = ['paid', 'pending', 'partial'];
    if (!validPaymentStatus.includes(purchase.paymentStatus)) {
      toast.error('Estado de pago inválido');
      return false;
    }
    
    // Validación de ítems
    if (purchase.items.length === 0) {
      toast.error('Debe agregar al menos un ítem a la compra');
      return false;
    }
    
    // Validación para cada ítem
    for (let i = 0; i < purchase.items.length; i++) {
      const item = purchase.items[i];
      const itemNumber = i + 1;
      
      if (!item.itemId) {
        toast.error(`El ítem #${itemNumber} no tiene un producto seleccionado`);
        return false;
      }
      
      // Validación de cantidad
      if (!item.quantity) {
        toast.error(`La cantidad del ítem #${itemNumber} no puede estar vacía`);
        return false;
      }
      
      if (isNaN(Number(item.quantity))) {
        toast.error(`La cantidad del ítem #${itemNumber} debe ser un número válido`);
        return false;
      }
      
      if (item.quantity <= 0) {
        toast.error(`La cantidad del ítem #${itemNumber} debe ser mayor a cero`);
        return false;
      }
      
      if (item.quantity > 10000) { // Límite razonable para evitar errores de entrada
        toast.error(`La cantidad del ítem #${itemNumber} parece ser muy alta. Por favor, verifique`);
        return false;
      }
      
      // Validación de precio
      if (item.price === null || item.price === undefined) {
        toast.error(`El precio del ítem #${itemNumber} es obligatorio`);
        return false;
      }
      
      if (isNaN(Number(item.price))) {
        toast.error(`El precio del ítem #${itemNumber} debe ser un número válido`);
        return false;
      }
      
      if (item.price <= 0) { // Cambiado de < 0 a <= 0 para exigir precios positivos
        toast.error(`El precio del ítem #${itemNumber} debe ser mayor a cero`);
        return false;
      }
      
      // Validación de valores extremadamente altos (prevención de errores)
      if (item.price > 1000000) { // Límite razonable que puede ajustarse según tu negocio
        toast.error(`El precio del ítem #${itemNumber} parece ser muy alto. Por favor, verifique`);
        return false;
      }
      
      // Validación de cálculos
      const calculatedTotal = parseFloat(item.quantity) * parseFloat(item.price);
      const storedTotal = parseFloat(item.total);
      
      if (Math.abs(calculatedTotal - storedTotal) > 0.01) { // Margen de error por decimales
        // Auto-corregir en lugar de mostrar error
        handleItemChange(i, 'total', calculatedTotal);
      }
    }
    
    // Validación del total general
    const calculatedTotalAmount = purchase.items.reduce((sum, item) => 
      sum + (parseFloat(item.quantity) * parseFloat(item.price)), 0);
    
    if (Math.abs(calculatedTotalAmount - purchase.totalAmount) > 0.1) {
      // Auto-corregir
      setPurchase(prev => ({
        ...prev,
        totalAmount: calculatedTotalAmount
      }));
    }
    
    return true;
  };

  const handleUploadReceipt = () => {
    openCloudinaryWidget((url) => {
      console.log('📎 URL recibida de Cloudinary:', url);
      setReceipt(url);
      toast.success('Comprobante cargado exitosamente');
    });
  };

  // ⭐ FUNCIÓN MEJORADA PARA MOSTRAR EL COMPROBANTE
  const renderReceiptPreview = () => {
    if (!receipt) {
      return (
        <div className="mt-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
          <p className="text-gray-500">No se ha cargado ningún comprobante.</p>
          <p className="text-sm text-gray-400 mt-1">El comprobante es opcional pero recomendado</p>
        </div>
      );
    }

    return (
      <div className="mt-2">
        <div className="flex items-center justify-between mb-2">
          <p className="text-green-600">✅ Comprobante cargado exitosamente</p>
          <button
            type="button"
            onClick={() => setReceipt(null)}
            className="text-red-500 hover:text-red-700 text-sm"
          >
            Remover
          </button>
        </div>
        
        {/* ⭐ PREVIEW MEJORADO */}
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-3 py-2 border-b flex items-center justify-between">
            <span className="text-sm font-medium">Vista previa del comprobante</span>
            <a
              href={receipt}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              Abrir en nueva pestaña ↗
            </a>
          </div>
          <iframe
            src={receipt}
            width="100%"
            height="400px"
            className="border-0"
            title="Comprobante de Compra"
          />
        </div>
        
        <p className="text-gray-500 text-sm mt-2">
          Si deseas reemplazar el comprobante, vuelve a cargar uno nuevo.
        </p>
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Bloquear admins de crear compras
    if (user?.role === 'admin') {
      toast.error('No tienes permisos para registrar compras');
      return;
    }

    if (!validateForm()) {
      return;
    }

    console.log('📋 Receipt URL antes de enviar:', receipt); // ⭐ DEBUG

    const purchaseData = {
      supplier: purchase.supplier,
      invoiceNumber: purchase.invoiceNumber,
      purchaseDate: formatDateForBackend(purchase.purchaseDate),
      paymentMethod: purchase.paymentMethod,
      paymentStatus: purchase.paymentStatus,
      notes: purchase.notes,
      totalAmount: purchase.totalAmount,
      receiptUrl: receipt, // ⭐ La URL ya viene de Cloudinary
      items: purchase.items.map((item) => ({
        itemId: item.itemId,
        quantity: parseInt(item.quantity),
        price: parseFloat(item.price),
        total: parseFloat(item.quantity * item.price),
      })),
    };

    console.log('🚀 Datos a enviar:', purchaseData); // ⭐ DEBUG

    try {
      const result = await dispatch(createPurchase(purchaseData));

      if (result.success) {
        toast.success('Compra registrada exitosamente');
        navigate('/purchaseList');
      }
    } catch (error) {
      toast.error('Error al registrar la compra');
      console.error(error);
    }
  };

  return (
    <DashboardLayout>
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-6 text-gray-700">Registrar Nueva Compra</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Información general de la compra */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor *
              </label>
              <input
                type="text"
                value={purchase.supplier}
                onChange={(e) => handleInputChange('supplier', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nombre del proveedor"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Factura
              </label>
              <input
                type="text"
                value={purchase.invoiceNumber}
                onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Número de factura del proveedor"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de Compra *
              </label>
              <input
                type="date"
                value={purchase.purchaseDate}
                onChange={(e) => handleInputChange('purchaseDate', e.target.value)}
                min={getMinDate()}
                max={getMaxDate()}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Método de Pago
              </label>
              <select
                value={purchase.paymentMethod}
                onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="cash">Efectivo</option>
                <option value="credit_card">Tarjeta de Crédito</option>
                <option value="transfer">Transferencia</option>
                <option value="credit">Crédito</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estado de Pago
              </label>
              <select
                value={purchase.paymentStatus}
                onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="paid">Pagado</option>
                <option value="pending">Pendiente</option>
                <option value="partial">Pago Parcial</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <textarea
                value={purchase.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Comentarios adicionales sobre la compra"
                rows="2"
              ></textarea>
            </div>

            {/* ⭐ SECCIÓN DEL COMPROBANTE MEJORADA */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comprobante de Compra (Opcional)
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleUploadReceipt}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center text-sm hover:bg-blue-600 transition-colors"
                >
                  📎 {receipt ? 'Cambiar Comprobante' : 'Cargar Comprobante'}
                </button>
                {receipt && (
                  <button
                    type="button"
                    onClick={() => setReceipt(null)}
                    className="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600 transition-colors"
                  >
                    🗑️ Remover
                  </button>
                )}
              </div>
              {renderReceiptPreview()}
            </div>
          </div>
          
          {/* Sección de ítems */}
          <div className="mt-8 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-700">Productos</h3>
              <button
                type="button"
                onClick={() => setShowItemSelector(true)}
                className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center text-sm hover:bg-blue-600"
              >
                <FaPlus className="mr-2" /> Agregar Producto
              </button>
            </div>
            
            {showItemSelector && (
              <div className="mb-6 border rounded-lg p-4 bg-gray-50 relative">
                <button
                  type="button"
                  onClick={() => setShowItemSelector(false)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                >
                  <FaTimes />
                </button>
                <h4 className="text-md font-medium mb-3">Seleccionar Producto</h4>
                <ItemSelector 
                  onSelect={handleItemSelect}
                  excludeItems={purchase.items}
                />
              </div>
            )}
            
            {purchase.items.length === 0 ? (
              <div className="text-center py-8 border rounded-lg bg-gray-50">
                <p className="text-gray-500">No hay productos agregados a esta compra</p>
                <button
                  type="button"
                  onClick={() => setShowItemSelector(true)}
                  className="mt-2 text-blue-500 hover:text-blue-700"
                >
                  Agregar productos
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Cantidad</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Precio Unit.</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Total</th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchase.items.map((item, index) => (
                      <PurchaseItemForm
                        key={item.id}
                        item={item}
                        itemIndex={index}
                        inventory={inventory}
                        onChange={handleItemChange}
                        onRemove={handleRemoveItem}
                      />
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="3" className="px-3 py-3 text-right font-medium">Total:</td>
                      <td className="px-3 py-3 text-right font-bold">${purchase.totalAmount.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
          
          {/* Botones */}
          <div className="mt-6 flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/purchaseList')}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || user?.role === 'admin'}
              className={`bg-green-500 text-white px-4 py-2 rounded-md flex items-center ${loading ? 'opacity-70' : 'hover:bg-green-600'}`}
            >
              <FaSave className="mr-2" /> 
              {loading ? 'Guardando...' : 'Guardar Compra'}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default PurchaseForm;