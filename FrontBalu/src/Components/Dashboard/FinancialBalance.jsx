import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { 
  getFinancialDashboard, 
  getFinancialSummary,
  getRevenueByPeriod,
  getProfitLossReport,
  getAllPayments 
} from '../../Redux/Actions/financialActions';
import { format,  startOfMonth, endOfMonth } from 'date-fns';
import { es, } from 'date-fns/locale';
import { parseISO, isValid } from 'date-fns';
import * as XLSX from 'xlsx';

import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart
} from 'recharts';
import { FaDownload, FaFilter } from 'react-icons/fa';
import DashboardLayout from '../Dashboard/DashboardLayout';


const FinancialBalance = () => {
  const dispatch = useDispatch();
  const { 
     
    summary, 
    revenueByPeriod, 
    
    payments,
    paymentsPagination,
    paymentsSummary,
    loading 
  } = useSelector(state => state.financial || {});
console.log('📊 [FINANCIAL-COMPONENT] Resumen financiero completo:', summary);
console.log('📊 [FINANCIAL-COMPONENT] Revenue structure:', {
  revenue: summary?.revenue,
  hasTotal: summary?.revenue?.total !== undefined,
  hasNet: summary?.revenue?.net !== undefined,
  hasGross: summary?.revenue?.gross !== undefined
});
console.log('📊 [FINANCIAL-COMPONENT] Revenue by period:', revenueByPeriod);
  // Estados para filtros
  const [period, setPeriod] = useState('month');
  const [dateRange, setDateRange] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'), // ⭐ Primer día del mes actual
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd')      // ⭐ Último día del mes actual
  });
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'revenue', 'expenses'
  
  // ⭐ NUEVOS ESTADOS PARA FILTROS DE PAGOS
  const [paymentFilters, setPaymentFilters] = useState({
    startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    paymentMethod: '',
    bookingId: '',
    page: 1,
    limit: 20
  });

  useEffect(() => {
    // Cargar datos iniciales
    dispatch(getFinancialDashboard());
    
    // Solo pasar fechas personalizadas si el período es custom
    if (period === 'custom') {
      dispatch(getFinancialSummary(period, dateRange.startDate, dateRange.endDate));
    } else {
      dispatch(getFinancialSummary(period));
    }
    
    const { startDate, endDate } = dateRange;
    dispatch(getRevenueByPeriod(startDate, endDate));
    dispatch(getProfitLossReport(period));
  }, [dispatch, period]);
  
  // ⭐ NUEVO: Cargar pagos cuando se selecciona la pestaña de ingresos
  useEffect(() => {
    if (activeTab === 'revenue') {
      dispatch(getAllPayments(paymentFilters));
    }
  }, [activeTab, dispatch]);
  
  // ⭐ FUNCIÓN PARA APLICAR FILTROS DE PAGOS
  const handleApplyPaymentFilters = () => {
    dispatch(getAllPayments(paymentFilters));
  };
  
  // ⭐ FUNCIÓN PARA CAMBIAR PÁGINA DE PAGOS
  const handlePaymentPageChange = (newPage) => {
    setPaymentFilters(prev => ({ ...prev, page: newPage }));
    dispatch(getAllPayments({ ...paymentFilters, page: newPage }));
  };
  
  // ⭐ FUNCIÓN PARA FORMATEAR MÉTODO DE PAGO
  const formatPaymentMethodLabel = (method) => {
    const methods = {
      'cash': 'Efectivo',
      'credit_card': 'Tarjeta de Crédito',
      'debit_card': 'Tarjeta de Débito',
      'transfer': 'Transferencia',
      'wompi': 'Wompi (Online)',
      'wompi_checkout': 'Wompi Checkout'
    };
    return methods[method] || method;
  };
  
  // ⭐ FUNCIÓN PARA FORMATEAR TIPO DE PAGO
  const formatPaymentTypeLabel = (type) => {
    const types = {
      'full': 'Completo',
      'partial': 'Parcial',
      'deposit': 'Anticipo',
      'final': 'Final',
      'online': 'Online',
      'extra_charge': 'Cargo Extra'
    };
    return types[type] || type;
  };

  // Formateo de datos para gráficos
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(value);
  };

  // Preparación de datos para gráficos de ingresos
  const prepareRevenueData = () => {
    if (!summary || !summary.revenue) return [];
    
    return [
      { name: 'Online', value: summary.revenue.online || 0 },
      { name: 'Local', value: summary.revenue.local || 0 }
    ];
  };

  // Datos para el gráfico de pagos por método
  const preparePaymentMethodData = () => {
    if (!summary || !summary.paymentMethods) return [];
    
    // Transformar el objeto a array para Recharts
    return Object.entries(summary.paymentMethods || {}).map(([method, amount]) => ({
      name: formatPaymentMethod(method),
      value: amount
    }));
  };

  // Preparación de datos para gráficos de gastos
  const prepareExpensesData = () => {
    if (!summary) return [];
    
    return [
      { name: 'Gastos', value: summary.expenses?.total || 0 },
      { name: 'Compras', value: summary.purchases?.total || 0 }
    ];
  };

  // Datos para el gráfico de gastos por categoría
const prepareExpensesByCategoryData = () => {
  if (!summary || !summary.expenses?.byCategory) return [];
  return Object.entries(summary.expenses.byCategory).map(([category, amount]) => ({
    name: formatExpenseCategory(category),
    value: amount
  }));
};

  // Datos para la tendencia mensual
const prepareMonthlyTrendData = () => {
  // No mostrar warnings si los datos están cargando
  if (loading) {
    return [];
  }
  
  if (!revenueByPeriod || !Array.isArray(revenueByPeriod) || revenueByPeriod.length === 0) {
    console.warn('⚠️ [FINANCIAL] No hay datos de revenue por período');
    return [];
  }

  console.log('📊 [FINANCIAL] Procesando datos mensuales:', revenueByPeriod);

  return revenueByPeriod
    .map((item, index) => {
      let validDate = null;
      try {
        // Usar la fecha de creación de la factura
        const dateValue = item.createdAt;
        if (!dateValue) {
          console.warn(`⚠️ [FINANCIAL] Item ${index} sin fecha:`, item);
          return null;
        }
        validDate = typeof dateValue === 'string' ? parseISO(dateValue) : new Date(dateValue);
        if (!isValid(validDate)) {
          console.warn(`⚠️ [FINANCIAL] Fecha inválida en item ${index}:`, {
            originalDate: dateValue,
            parsedDate: validDate,
            item
          });
          return null;
        }
        const formattedMonth = format(validDate, 'MMM', { locale: es });

        // Sumar reservationAmount y extraChargesAmount como ingresos
        const ingresos = parseFloat(item.reservationAmount || 0) + parseFloat(item.extraChargesAmount || 0);
        // Si tienes gastos, agrégalos aquí. Si no, pon 0.
        const gastos = 0;

        console.log(`✅ [FINANCIAL] Item ${index} procesado:`, {
          originalDate: dateValue,
          validDate,
          formattedMonth,
          ingresos,
          gastos
        });

        return {
          name: formattedMonth,
          ingresos,
          gastos,
          balance: ingresos - gastos
        };
      } catch (error) {
        console.error(`❌ [FINANCIAL] Error procesando item ${index}:`, {
          error: error.message,
          item,
          originalDate: item.createdAt
        });
        return null;
      }
    })
    .filter(item => item !== null);
};

  // Formateadores para nombres más amigables
  const formatPaymentMethod = (method) => {
    const methods = {
      'cash': 'Efectivo',
      'credit_card': 'Tarjeta',
      'transfer': 'Transferencia',
      'credit': 'Crédito',
      'online': 'Online',
      'paypal': 'PayPal'
    };
    
    return methods[method] || method;
  };

  const formatExpenseCategory = (category) => {
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

  // Colores para gráficos
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  // Manejo de cambios en filtros
  const handlePeriodChange = (e) => {
    setPeriod(e.target.value);
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Nueva función para aplicar filtro de fechas personalizadas
  const handleApplyCustomDates = () => {
    if (period === 'custom') {
      const { startDate, endDate } = dateRange;
      dispatch(getFinancialSummary(period, startDate, endDate));
      dispatch(getRevenueByPeriod(startDate, endDate));
      dispatch(getProfitLossReport(period));
    }
  };
const handleExcelDownload = () => {
  const data = getCSVData(); // Tu función que genera los datos (array de arrays)
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Balance');
  XLSX.writeFile(wb, `balance-financiero-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
};
  // Datos para exportar a CSV
  const getCSVData = () => {
    const data = [];
    
    // Añadir encabezados
    data.push(['Período', 'Ingresos Totales', 'Gastos Totales', 'Balance']);
    
    // Añadir datos de resumen
    const totalRevenue = summary?.revenue?.net || summary?.revenue?.gross || 0;
    const totalExpenses = (summary?.expenses?.total || 0) + (summary?.purchases?.total || 0);
    const balance = totalRevenue - totalExpenses;
    
    data.push([
      `${format(new Date(dateRange.startDate), 'dd/MM/yyyy')} - ${format(new Date(dateRange.endDate), 'dd/MM/yyyy')}`,
      totalRevenue,
      totalExpenses,
      balance
    ]);
    
    // Añadir datos de ingresos por tipo
    data.push(['', '', '', '']);
    data.push(['Ingresos por Tipo', 'Monto', '', '']);
    data.push(['Online', summary?.revenue?.online || 0, '', '']);
    data.push(['Local', summary?.revenue?.local || 0, '', '']);
    
    // Añadir datos de ingresos por método de pago
    data.push(['', '', '', '']);
    data.push(['Ingresos por Método de Pago', 'Monto', '', '']);
    if (summary?.paymentMethods) {
      Object.entries(summary.paymentMethods).forEach(([method, amount]) => {
        data.push([formatPaymentMethod(method), amount, '', '']);
      });
    }
    
    // Añadir datos de gastos
    data.push(['', '', '', '']);
    data.push(['Egresos por Tipo', 'Monto', '', '']);
    data.push(['Gastos', summary?.expenses?.total || 0, '', '']);
    data.push(['Compras', summary?.purchases?.total || 0, '', '']);
    
    // Añadir datos de gastos por categoría
    data.push(['', '', '', '']);
    data.push(['Gastos por Categoría', 'Monto', '', '']);
    if (summary?.expensesByCategory) {
      Object.entries(summary.expensesByCategory).forEach(([category, amount]) => {
        data.push([formatExpenseCategory(category), amount, '', '']);
      });
    }
    
    return data;
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Balance Financiero</h1>
          <div className="flex space-x-2">
            <button
  onClick={handleExcelDownload}
  className="bg-blue-500 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-600 ml-2"
>
  <FaDownload className="mr-2" /> Descargar Excel
</button>
          </div>
        </div>
        
        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <select 
                value={period}
                onChange={handlePeriodChange}
                className="border border-gray-300 rounded-md py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="month">Este Mes</option>
                <option value="quarter">Este Trimestre</option>
                <option value="year">Este Año</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            
            {period === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Desde</label>
                  <input 
                    type="date" 
                    value={dateRange.startDate}
                    onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                    className="border border-gray-300 rounded-md py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hasta</label>
                  <input 
                    type="date" 
                    value={dateRange.endDate}
                    onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                    className="border border-gray-300 rounded-md py-1 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleApplyCustomDates}
                    className="bg-blue-600 text-white px-4 py-1.5 rounded-md flex items-center hover:bg-blue-700 transition-colors"
                  >
                    <FaFilter className="mr-2" /> Aplicar Filtro
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Estado de carga */}
        {loading && (
          <div className="bg-white p-10 rounded-lg shadow-md flex justify-center items-center">
            <div className="spinner"></div>
            <p className="ml-2">Cargando datos financieros...</p>
          </div>
        )}
        
        {/* Resumen */}
        {!loading && summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Ingresos Totales</h2>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(summary.revenue?.net || summary.revenue?.gross || 0)}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Online: {formatCurrency(summary.revenue?.online || 0)}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Local: {formatCurrency(summary.revenue?.local || 0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Gastos Totales</h2>
              <div className="text-3xl font-bold text-red-600">
                {formatCurrency((summary.expenses?.total || 0) + (summary.purchases?.total || 0))}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Gastos: {formatCurrency(summary.expenses?.total || 0)}
              </div>
              <div className="mt-1 text-sm text-gray-500">
                Compras: {formatCurrency(summary.purchases?.total || 0)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-md">
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Balance</h2>
              <div className={`text-3xl font-bold ${((summary.revenue?.net || summary.revenue?.gross || 0) - ((summary.expenses?.total || 0) + (summary.purchases?.total || 0))) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency((summary.revenue?.net || summary.revenue?.gross || 0) - ((summary.expenses?.total || 0) + (summary.purchases?.total || 0)))}
              </div>
              <div className="mt-2 text-sm text-gray-500">
                Margen: {((((summary.revenue?.net || summary.revenue?.gross || 0)) / Math.max(1, (summary.expenses?.total || 0) + (summary.purchases?.total || 0))) * 100).toFixed(2)}%
              </div>
            </div>
          </div>
        )}

        {/* Pestañas para navegar entre secciones */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Resumen General
              </button>
              <button
                onClick={() => setActiveTab('revenue')}
                className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'revenue'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Ingresos
              </button>
              <button
                onClick={() => setActiveTab('expenses')}
                className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'expenses'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Gastos
              </button>
              <button
                onClick={() => setActiveTab('trend')}
                className={`py-2 px-4 text-center border-b-2 font-medium text-sm ${
                  activeTab === 'trend'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Tendencias
              </button>
            </nav>
          </div>
        </div>

        {/* Contenido de pestañas */}
        {!loading && (
          <>
            {/* Resumen General */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Distribución de Ingresos</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={prepareRevenueData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {prepareRevenueData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Distribución de Gastos</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={prepareExpensesData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {prepareExpensesData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md md:col-span-2">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Tendencia del Período</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart
                      data={prepareMonthlyTrendData()}
                      margin={{
                        top: 10,
                        right: 30,
                        left: 0,
                        bottom: 0,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Area type="monotone" dataKey="ingresos" stackId="1" stroke="#8884d8" fill="#8884d8" />
                      <Area type="monotone" dataKey="gastos" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
                      <Area type="monotone" dataKey="balance" stackId="2" stroke="#ffc658" fill="#ffc658" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Ingresos */}
            {activeTab === 'revenue' && (
              <div className="space-y-6">
                {/* Gráficos existentes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Ingresos: Online vs Local</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={prepareRevenueData()}
                        margin={{
                          top: 20,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="value" name="Monto" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white p-4 rounded-lg shadow-md">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Ingresos por Método de Pago</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={preparePaymentMethodData()}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {preparePaymentMethodData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-md md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Evolución de Ingresos</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={prepareMonthlyTrendData()}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Line type="monotone" dataKey="ingresos" stroke="#8884d8" activeDot={{ r: 8 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ⭐ NUEVA SECCIÓN: LISTADO DE PAGOS */}
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">💳 Listado de Pagos Recibidos</h3>
                  
                  {/* Filtros de pagos */}
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
                        <input 
                          type="date" 
                          value={paymentFilters.startDate}
                          onChange={(e) => setPaymentFilters(prev => ({ ...prev, startDate: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
                        <input 
                          type="date" 
                          value={paymentFilters.endDate}
                          onChange={(e) => setPaymentFilters(prev => ({ ...prev, endDate: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                        <select 
                          value={paymentFilters.paymentMethod}
                          onChange={(e) => setPaymentFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Todos</option>
                          <option value="cash">Efectivo</option>
                          <option value="credit_card">Tarjeta de Crédito</option>
                          <option value="debit_card">Tarjeta de Débito</option>
                          <option value="transfer">Transferencia</option>
                          <option value="wompi">Wompi</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reserva ID</label>
                        <input 
                          type="text" 
                          placeholder="Ej: 123"
                          value={paymentFilters.bookingId}
                          onChange={(e) => setPaymentFilters(prev => ({ ...prev, bookingId: e.target.value }))}
                          className="w-full border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={handleApplyPaymentFilters}
                        className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center"
                      >
                        <FaFilter className="mr-2" /> Aplicar Filtros
                      </button>
                      <button
                        onClick={() => {
                          setPaymentFilters({
                            startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                            endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
                            paymentMethod: '',
                            bookingId: '',
                            page: 1,
                            limit: 20
                          });
                          dispatch(getAllPayments({
                            startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
                            endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
                            page: 1,
                            limit: 20
                          }));
                        }}
                        className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600 transition-colors"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {/* Resumen de pagos */}
                  {paymentsSummary && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                      <div>
                        <span className="text-sm text-gray-600">Total de Pagos: </span>
                        <span className="font-semibold text-gray-800">{paymentsSummary.totalCount || 0}</span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-600">Monto Total: </span>
                        <span className="font-semibold text-green-600">{formatCurrency(paymentsSummary.totalAmount || 0)}</span>
                      </div>
                    </div>
                  )}

                  {/* Tabla de pagos */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fecha
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reserva
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Huésped
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Habitación
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Método
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Monto
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {payments && payments.length > 0 ? (
                          payments.map((payment) => (
                            <tr key={payment.paymentId} className="hover:bg-gray-50">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {format(new Date(payment.paymentDate), 'dd/MM/yyyy HH:mm')}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                <span className="font-medium">#{payment.booking?.bookingId || 'N/A'}</span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {payment.booking?.guestName || 'N/A'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {payment.booking?.roomNumber || 'N/A'}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  payment.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' :
                                  payment.paymentMethod === 'credit_card' || payment.paymentMethod === 'debit_card' ? 'bg-blue-100 text-blue-800' :
                                  payment.paymentMethod === 'transfer' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {formatPaymentMethodLabel(payment.paymentMethod)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {formatPaymentTypeLabel(payment.paymentType)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                                {formatCurrency(payment.amount)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                              {loading ? 'Cargando pagos...' : 'No se encontraron pagos en el período seleccionado'}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginación */}
                  {paymentsPagination && paymentsPagination.totalPages > 1 && (
                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        Mostrando {payments?.length || 0} de {paymentsPagination.total} pagos
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePaymentPageChange(paymentsPagination.page - 1)}
                          disabled={paymentsPagination.page === 1}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Anterior
                        </button>
                        <span className="px-4 py-2 text-sm text-gray-700">
                          Página {paymentsPagination.page} de {paymentsPagination.totalPages}
                        </span>
                        <button
                          onClick={() => handlePaymentPageChange(paymentsPagination.page + 1)}
                          disabled={!paymentsPagination.hasMore}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Siguiente
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gastos */}
            {activeTab === 'expenses' && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Gastos vs Compras</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={prepareExpensesData()}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend />
          <Bar dataKey="value" name="Monto" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>

    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Gastos por Categoría</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={prepareExpensesByCategoryData()}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {prepareExpensesByCategoryData().map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
      {/* TABLA DE DETALLE POR CATEGORÍA */}
      {summary?.expenses?.byCategory && Object.keys(summary.expenses.byCategory).length > 0 && (
  <div className="mt-6">
    <h4 className="text-md font-semibold text-gray-700 mb-2">Detalle por Categoría</h4>
    <table className="min-w-full text-left">
      <thead>
        <tr>
          <th className="py-2 px-4 border-b">Categoría</th>
          <th className="py-2 px-4 border-b">Monto</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(summary.expenses.byCategory).map(([category, amount]) => (
          <tr key={category}>
            <td className="py-2 px-4 border-b">{formatExpenseCategory(category)}</td>
            <td className="py-2 px-4 border-b">{formatCurrency(amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}
    </div>
    
    <div className="bg-white p-4 rounded-lg shadow-md md:col-span-2">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Evolución de Gastos</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={prepareMonthlyTrendData()}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => formatCurrency(value)} />
          <Legend />
          <Line type="monotone" dataKey="gastos" stroke="#82ca9d" activeDot={{ r: 8 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
)}

            {/* Tendencias */}
            {activeTab === 'trend' && (
              <div className="grid grid-cols-1 gap-6">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Tendencia de Ingresos vs Gastos</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                      data={prepareMonthlyTrendData()}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Line type="monotone" dataKey="ingresos" stroke="#8884d8" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="gastos" stroke="#82ca9d" activeDot={{ r: 8 }} />
                      <Line type="monotone" dataKey="balance" stroke="#ffc658" activeDot={{ r: 8 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <h3 className="text-lg font-semibold text-gray-700 mb-4">Balance Mensual</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={prepareMonthlyTrendData()}
                      margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="balance" name="Balance" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default FinancialBalance;