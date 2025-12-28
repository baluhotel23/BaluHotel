import  { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaSave, FaTimes, FaMoneyBillWave, FaFilePdf } from 'react-icons/fa';
import { createExpense } from '../../Redux/Actions/financialActions';
import DashboardLayout from '../Dashboard/DashboardLayout';
import ExpensesList from './ExpensesList';
import { openCloudinaryWidget } from '../../cloudinaryConfig';
import { 
  getCurrentDate, 
  formatDateForBackend, 
  isValidPastDate, 
  getMaxDate, 
  getMinDate 
} from '../../utils/dateHelpers';


const ExpenseForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);

  // Estado inicial del formulario
  const [expense, setExpense] = useState({
    destinatario: '',
    amount: '',
    expenseDate: getCurrentDate(), // ⭐ Usar utilidad de fecha
    category: '',
    paymentMethod: 'cash',
    notes: ''
  });

  // Categorías de gastos disponibles
  const expenseCategories = [
    { value: 'maintenance', label: 'Mantenimiento' },
    { value: 'utilities', label: 'Servicios públicos' },
    { value: 'salaries', label: 'Salarios' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'supplies', label: 'Insumos' },
    { value: 'other', label: 'Otros' }
  ];

  // Métodos de pago disponibles
  const paymentMethods = [
    { value: 'cash', label: 'Efectivo' },
    { value: 'credit_card', label: 'Tarjeta de Crédito' },
    { value: 'transfer', label: 'Transferencia' },
    { value: 'credit', label: 'Crédito' }
  ];

  // Manejo de cambios en los campos
  const handleInputChange = (field, value) => {
    setExpense({
      ...expense,
      [field]: value
    });
  };

  // Validación de datos
  const validateForm = () => {
    // Validar descripción
    if (!expense.destinatario.trim()) {
      toast.error('Debe ingresar una descripción del gasto');
      return false;
    }
    
    // Validar monto
    if (!expense.amount || isNaN(Number(expense.amount)) || Number(expense.amount) <= 0) {
      toast.error('El monto debe ser un número positivo');
      return false;
    }
    
    // Validar fecha
    if (!expense.expenseDate) {
      toast.error('Debe seleccionar una fecha para el gasto');
      return false;
    }
    
    // ⭐ Validar que la fecha no sea futura usando utilidad
    if (!isValidPastDate(expense.expenseDate)) {
      toast.error('La fecha del gasto no puede ser en el futuro');
      return false;
    }
    
    // Validar categoría
    if (!expenseCategories.some(cat => cat.value === expense.category)) {
      toast.error('Categoría de gasto inválida');
      return false;
    }
    
    // Validar método de pago
    if (!paymentMethods.some(method => method.value === expense.paymentMethod)) {
      toast.error('Método de pago inválido');
      return false;
    }
    
    return true;
  };

  // Manejar envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Bloquear admins de crear gastos desde UI: deben ser owner o staff responsable
    if (user?.role === 'admin') {
      toast.error('No tienes permisos para registrar gastos');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Preparar datos para enviar
      const expenseData = {
        destinatario: expense.destinatario,
        amount: parseFloat(expense.amount),
        expenseDate: formatDateForBackend(expense.expenseDate), // ⭐ Formatear fecha correctamente
        category: expense.category,
        paymentMethod: expense.paymentMethod,
        notes: expense.notes || null,
        receiptUrl: receipt || null,
        createdBy: user.n_document
      };
      
      const result = await dispatch(createExpense(expenseData));
      
      if (result.success) {
        toast.success('Gasto registrado exitosamente');
        navigate('/purchasePanel'); // Redirigir a la lista de gastos
      } else {
        toast.error(result.error || 'Error al registrar el gasto');
      }
    } catch (error) {
      toast.error('Error al registrar el gasto');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Cancelar y volver atrás
  const handleCancel = () => {
    navigate('/financial/expenses');
  };

  // Función para cargar comprobante
  const handleUploadReceipt = () => {
    openCloudinaryWidget((url) => {
      console.log('📎 URL recibida de Cloudinary:', url);
      setReceipt(url);
      toast.success('Comprobante cargado exitosamente');
    });
  };

  // Función para renderizar preview del comprobante
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
            title="Comprobante de Gasto"
          />
        </div>
        
        <p className="text-gray-500 text-sm mt-2">
          Si deseas reemplazar el comprobante, vuelve a cargar uno nuevo.
        </p>
      </div>
    );
  };

  return (
     <DashboardLayout>
    <div className="bg-white shadow-md rounded-lg p-6 max-w-3xl mx-auto">
      <div className="flex items-center mb-6">
        <FaMoneyBillWave className="text-2xl text-yellow-600 mr-2" />
        <h1 className="text-2xl font-bold">Registrar Nuevo Gasto</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Descripción */}
          <div className="col-span-2">
            <label htmlFor="destinatario" className="block text-sm font-medium text-gray-700 mb-1">
              Destinatario *
            </label>
            <input
              type="text"
              id="destinatario"
              value={expense.destinatario}
              onChange={(e) => handleInputChange('destinatario', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej: Pago de electricidad"
              required
            />
          </div>

          {/* Monto */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              Monto *
            </label>
            <input
              type="number"
              id="amount"
              value={expense.amount}
              onChange={(e) => handleInputChange('amount', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* Fecha */}
          <div>
            <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-700 mb-1">
              Fecha del gasto *
            </label>
            <input
              type="date"
              id="expenseDate"
              value={expense.expenseDate}
              onChange={(e) => handleInputChange('expenseDate', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={getMinDate()}
              max={getMaxDate()}
              required
            />
          </div>

          {/* Categoría */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Categoría *
            </label>
            <select
              id="category"
              value={expense.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Seleccione una categoría --</option>
              {expenseCategories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Método de pago */}
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
              Método de pago *
            </label>
            <select
              id="paymentMethod"
              value={expense.paymentMethod}
              onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notas adicionales */}
          <div className="col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notas adicionales
            </label>
            <textarea
              id="notes"
              value={expense.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 h-24 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Información adicional sobre el gasto..."
            />
          </div>

          {/* Comprobante */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comprobante del Gasto (Opcional)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUploadReceipt}
                className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center text-sm hover:bg-blue-600 transition-colors"
              >
                <FaFilePdf className="mr-2" />
                {receipt ? 'Cambiar Comprobante' : 'Cargar Comprobante'}
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

        {/* Botones de acción */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={handleCancel}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded flex items-center hover:bg-gray-200"
          >
            <FaTimes className="mr-2" /> Cancelar
          </button>
          <button
            type="submit"
            disabled={loading || user?.role === 'admin'}
            className="bg-degrade text-white px-4 py-2 rounded flex items-center hover:bg-yellow-700 opacity-80"
            title={user?.role === 'admin' ? 'No tienes permisos para registrar gastos' : ''}
          >
            <span className="flex items-center">
              <FaSave className="mr-2" />
              {loading ? 'Guardando...' : (user?.role === 'admin' ? 'No autorizado' : 'Guardar Gasto')}
            </span>
          </button>
        </div>
      </form>
      

      
    </div>
    <ExpensesList/>
    </DashboardLayout>
  );
};

export default ExpenseForm;