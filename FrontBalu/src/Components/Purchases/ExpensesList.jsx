import  { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getAllExpenses, updateExpense, deleteExpense } from '../../Redux/Actions/financialActions';
import { Link } from 'react-router-dom';
import { FaEye, FaSearch, FaPlus, FaFilePdf, FaEdit, FaSave, FaTimes, FaTrash } from 'react-icons/fa';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'react-toastify';
import DashboardLayout from '../Dashboard/DashboardLayout';

const ExpensesList = () => {
  const dispatch = useDispatch();
  const { expenses = [], loading } = useSelector(state => state.financial || {});
  
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    category: '',
    paymentMethod: ''
  });
  
  // Estado para manejar la edición
  const [editableExpenseId, setEditableExpenseId] = useState(null);
  const [editedExpense, setEditedExpense] = useState({});

  useEffect(() => {
    dispatch(getAllExpenses());
  }, [dispatch]);

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

  // Filtrar gastos según criterios
  const filteredExpenses = expenses.filter(expense => {
    if (!expense) return false;
    
    // Filtrar por término de búsqueda
    const searchMatch = !search || 
      (expense.destinatario && expense.destinatario.toLowerCase().includes(search.toLowerCase()));
    
    // Filtrar por fecha desde
    const fromDateMatch = !filters.dateFrom || 
      (expense.expenseDate && new Date(expense.expenseDate) >= new Date(filters.dateFrom));
    
    // Filtrar por fecha hasta
    const toDateMatch = !filters.dateTo || 
      (expense.expenseDate && new Date(expense.expenseDate) <= new Date(filters.dateTo));
    
    // Filtrar por categoría
    const categoryMatch = !filters.category || expense.category === filters.category;
    
    // Filtrar por método de pago
    const paymentMethodMatch = !filters.paymentMethod || expense.paymentMethod === filters.paymentMethod;
    
    return searchMatch && fromDateMatch && toDateMatch && categoryMatch && paymentMethodMatch;
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      category: '',
      paymentMethod: ''
    });
    setSearch('');
  };

  // Función para formatear la fecha
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      // Para fechas YYYY-MM-DD, agregar tiempo local para evitar offset UTC
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Crear fecha como local, no UTC
        const [year, month, day] = dateString.split('-');
        const localDate = new Date(year, month - 1, day);
        return format(localDate, 'dd/MM/yyyy', { locale: es });
      }
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
    } catch (e) {
      console.error("Error formateando fecha:", e);
      return dateString;
    }
  };

  // Función para mostrar categoría de manera legible
  const renderCategory = (category) => {
    const categories = {
      'maintenance': 'Mantenimiento',
      'utilities': 'Servicios',
      'salaries': 'Salarios',
      'marketing': 'Marketing',
      'supplies': 'Insumos',
      'other': 'Otros'
    };
    
    return categories[category] || category;
  };

  // Función para mostrar método de pago
  const renderPaymentMethod = (method) => {
    const methods = {
      'cash': 'Efectivo',
      'credit_card': 'Tarjeta',
      'transfer': 'Transferencia',
      'credit': 'Crédito'
    };
    
    return methods[method] || method;
  };

  // Funciones para edición in-line
  const handleEdit = (expense) => {
    setEditableExpenseId(expense.id);
    setEditedExpense({...expense});
  };

  const handleCancelEdit = () => {
    setEditableExpenseId(null);
    setEditedExpense({});
  };

  const handleChange = (field, value) => {
    setEditedExpense(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      const result = await dispatch(updateExpense(editedExpense.id, editedExpense));
      
      if (result.success) {
        setEditableExpenseId(null);
        toast.success('Gasto actualizado correctamente');
      } else {
        toast.error('Error al actualizar el gasto');
      }
    } catch (error) {
      toast.error('Error al actualizar el gasto');
      console.error(error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este gasto? Esta acción no se puede deshacer.')) {
      try {
        const result = await dispatch(deleteExpense(id));
        
        if (result.success) {
          toast.success('Gasto eliminado correctamente');
        }
      } catch (error) {
        toast.error('Error al eliminar el gasto');
        console.error(error);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="bg-white shadow-md rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-700">Registro de Gastos</h2>
          <Link 
            to="/financial/expenses/new" 
            className="bg-degrade text-white px-4 py-2 rounded-md flex items-center hover:bg-yellow-700 opacity-80"
          >
            <FaPlus className="mr-2" /> Nuevo Gasto
          </Link>
        </div>

        {/* Barra de búsqueda */}
        <div className="mb-6 flex">
          <div className="relative flex-grow">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por destinatario..."
              className="pl-10 w-full border border-gray-300 rounded-md py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              className="w-full border border-gray-300 rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              className="w-full border border-gray-300 rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="w-full border border-gray-300 rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todas</option>
              {expenseCategories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
            <select
              value={filters.paymentMethod}
              onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
              className="w-full border border-gray-300 rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos</option>
              {paymentMethods.map(method => (
                <option key={method.value} value={method.value}>{method.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full bg-gray-100 text-gray-700 px-4 py-1 rounded-md hover:bg-gray-200"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Tabla de gastos */}
        {loading ? (
          <div className="text-center py-20">
            <div className="spinner"></div>
            <p className="mt-2 text-gray-600">Cargando gastos...</p>
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-4">No se encontraron gastos con los criterios seleccionados</p>
            <Link to="/financial/expenses/new" className="text-blue-500 hover:underline">
              Registrar un nuevo gasto
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destinatario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Método de Pago</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editableExpenseId === expense.id ? (
                        <input
                          type="date"
                          value={editedExpense.expenseDate ? editedExpense.expenseDate.split('T')[0] : ''}
                          onChange={(e) => handleChange('expenseDate', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        formatDate(expense.expenseDate)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editableExpenseId === expense.id ? (
                        <input
                          type="text"
                          value={editedExpense.destinatario || ''}
                          onChange={(e) => handleChange('destinatario', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      ) : (
                        expense.destinatario || <span className="text-gray-400">--</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editableExpenseId === expense.id ? (
                        <select
                          value={editedExpense.category || ''}
                          onChange={(e) => handleChange('category', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {expenseCategories.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      ) : (
                        renderCategory(expense.category)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {editableExpenseId === expense.id ? (
                        <select
                          value={editedExpense.paymentMethod || ''}
                          onChange={(e) => handleChange('paymentMethod', e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {paymentMethods.map(method => (
                            <option key={method.value} value={method.value}>{method.label}</option>
                          ))}
                        </select>
                      ) : (
                        renderPaymentMethod(expense.paymentMethod)
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium">
                      {editableExpenseId === expense.id ? (
                        <input
                          type="number"
                          value={editedExpense.amount || 0}
                          onChange={(e) => handleChange('amount', parseFloat(e.target.value))}
                          className="w-full border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 text-right"
                          step="0.01"
                        />
                      ) : (
                        `$${parseFloat(expense.amount || 0).toFixed(2)}`
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex justify-center space-x-2">
                        {editableExpenseId === expense.id ? (
                          <>
                            <button
                              onClick={handleSave}
                              className="text-green-500 hover:text-green-700"
                              title="Guardar cambios"
                            >
                              <FaSave />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-red-500 hover:text-red-700"
                              title="Cancelar edición"
                            >
                              <FaTimes />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => handleEdit(expense)}
                              className="text-blue-500 hover:text-blue-700"
                              title="Editar gasto"
                            >
                              <FaEdit />
                            </button>
                            <Link 
                              to={`/financial/expenses/${expense.id}`} 
                              className="text-blue-500 hover:text-blue-700"
                              title="Ver detalles"
                            >
                              <FaEye />
                            </Link>
                            <button
                              className="text-green-500 hover:text-green-700"
                              title="Exportar a PDF"
                            >
                              <FaFilePdf />
                            </button>
                            <button
                              onClick={() => handleDelete(expense.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Eliminar gasto"
                            >
                              <FaTrash />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ExpensesList;