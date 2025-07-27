import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import {
  getAllVouchers,
  validateVoucher,
  useVoucher,
  clearVoucherState
} from '../../Redux/Actions/bookingActions';

const VoucherManager = ({ 
  mode = 'full', // 'full', 'validation', 'list'
  bookingId = null,
  onVoucherUsed = null,
  showStatistics = true 
}) => {
  const dispatch = useDispatch();
  const { 
    vouchers, 
    loading 
  } = useSelector(state => state.booking || {});

  // Estados locales
  const [activeTab, setActiveTab] = useState('available');
  const [voucherCode, setVoucherCode] = useState('');
  const [showValidation, setShowValidation] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    dateRange: 'all',
    minAmount: '',
    maxAmount: ''
  });

  // ⭐ CARGAR VOUCHERS AL MONTAR COMPONENTE
  useEffect(() => {
    dispatch(getAllVouchers());
  }, [dispatch]);

  // ⭐ VALIDAR VOUCHER
  const handleValidateVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error('Ingrese un código de voucher');
      return;
    }

    const result = await dispatch(validateVoucher(voucherCode, {
      bookingId: bookingId,
      validateAmount: true
    }));

    if (result.success && result.data.isValid) {
      setShowValidation(true);
    }
  };

  // ⭐ USAR VOUCHER
  const handleUseVoucher = async (voucher, notes = '') => {
    if (!bookingId) {
      toast.error('No hay reserva seleccionada para aplicar el voucher');
      return;
    }

    const result = await dispatch(useVoucher(voucher.voucherId, {
      bookingId: bookingId,
      usedBy: 'staff',
      notes: notes || `Aplicado a reserva #${bookingId}`
    }));

    if (result.success) {
      setShowValidation(false);
      setVoucherCode('');
      
      if (onVoucherUsed) {
        onVoucherUsed(result.data);
      }
      
      // Recargar vouchers
      dispatch(getAllVouchers());
    }
  };

  // ⭐ FILTRAR VOUCHERS
  const filterVouchers = (voucherList) => {
    return voucherList.filter(voucher => {
      // Filtro por estado
      if (filters.status !== 'all') {
        if (filters.status === 'active' && voucher.status !== 'active') return false;
        if (filters.status === 'expired' && voucher.status !== 'expired') return false;
        if (filters.status === 'used' && voucher.status !== 'used') return false;
      }

      // Filtro por monto
      if (filters.minAmount && voucher.amount < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && voucher.amount > parseFloat(filters.maxAmount)) return false;

      // Filtro por fecha
      if (filters.dateRange !== 'all') {
        const createdAt = dayjs(voucher.createdAt);
        const now = dayjs();
        
        switch (filters.dateRange) {
          case 'today':
            if (!createdAt.isSame(now, 'day')) return false;
            break;
          case 'week':
            if (!createdAt.isAfter(now.subtract(7, 'days'))) return false;
            break;
          case 'month':
            if (!createdAt.isAfter(now.subtract(30, 'days'))) return false;
            break;
        }
      }

      return true;
    });
  };

  // ⭐ RENDERIZAR TARJETA DE VOUCHER
  const renderVoucherCard = (voucher, showActions = true) => {
    const isExpired = dayjs().isAfter(dayjs(voucher.expiresAt));
    const isUsed = voucher.status === 'used';
    
    return (
      <div 
        key={voucher.voucherId}
        className={`border rounded-lg p-4 ${
          isUsed ? 'bg-gray-50 border-gray-300' : 
          isExpired ? 'bg-red-50 border-red-300' : 
          'bg-green-50 border-green-300'
        }`}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <h4 className="font-semibold text-lg">
              ${voucher.amount.toLocaleString()}
            </h4>
            <p className="text-sm text-gray-600 font-mono">
              {voucher.voucherCode}
            </p>
          </div>
          
          <div className="text-right">
            <span className={`px-2 py-1 text-xs rounded ${
              isUsed ? 'bg-gray-200 text-gray-700' :
              isExpired ? 'bg-red-200 text-red-700' :
              'bg-green-200 text-green-700'
            }`}>
              {isUsed ? '✓ Usado' : isExpired ? '⏰ Expirado' : '💳 Disponible'}
            </span>
          </div>
        </div>

        <div className="text-sm text-gray-700 space-y-1">
          <p><strong>Generado:</strong> {dayjs(voucher.createdAt).format("DD/MM/YYYY HH:mm")}</p>
          <p><strong>Expira:</strong> {dayjs(voucher.expiresAt).format("DD/MM/YYYY")}</p>
          
          {voucher.originalBookingId && (
            <p><strong>Reserva origen:</strong> #{voucher.originalBookingId}</p>
          )}
          
          {isUsed && voucher.usedAt && (
            <p><strong>Usado:</strong> {dayjs(voucher.usedAt).format("DD/MM/YYYY HH:mm")}</p>
          )}
        </div>

        {showActions && !isUsed && !isExpired && bookingId && (
          <div className="mt-3 pt-3 border-t">
            <button
              onClick={() => handleUseVoucher(voucher)}
              disabled={loading.vouchers}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading.vouchers ? 'Aplicando...' : '💳 Aplicar a Reserva'}
            </button>
          </div>
        )}
      </div>
    );
  };

  // ⭐ RENDERIZAR VALIDACIÓN DE VOUCHER
  const renderVoucherValidation = () => {
    if (!vouchers.validation) return null;

    const { isValid, voucher, reason } = vouchers.validation;

    return (
      <div className={`border rounded-lg p-4 ${
        isValid ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
      }`}>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          {isValid ? '✅ Voucher Válido' : '❌ Voucher No Válido'}
        </h3>

        {isValid ? (
          <div>
            <div className="text-sm space-y-2 mb-4">
              <p><strong>Código:</strong> {voucher.voucherCode}</p>
              <p><strong>Valor:</strong> ${voucher.amount.toLocaleString()}</p>
              <p><strong>Expira:</strong> {dayjs(voucher.expiresAt).format("DD/MM/YYYY")}</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowValidation(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUseVoucher(voucher)}
                disabled={loading.vouchers}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading.vouchers ? 'Aplicando...' : 'Confirmar Uso'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-red-700 mb-4">{reason}</p>
            <button
              onClick={() => setShowValidation(false)}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>
    );
  };

  // ⭐ RENDERIZAR SEGÚN MODO
  if (mode === 'validation') {
    return (
      <div className="space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
            placeholder="Código de voucher..."
            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleValidateVoucher}
            disabled={loading.voucherValidation}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading.voucherValidation ? 'Validando...' : 'Validar'}
          </button>
        </div>

        {showValidation && renderVoucherValidation()}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con estadísticas */}
      {showStatistics && vouchers.statistics && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800">Total Generados</h3>
            <p className="text-2xl font-bold text-blue-600">
              {vouchers.statistics.totalGenerated || 0}
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800">Total Usados</h3>
            <p className="text-2xl font-bold text-green-600">
              {vouchers.statistics.totalUsed || 0}
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800">Valor Total</h3>
            <p className="text-2xl font-bold text-purple-600">
              ${(vouchers.statistics.totalValue || 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-800">Valor Pendiente</h3>
            <p className="text-2xl font-bold text-orange-600">
              ${(vouchers.statistics.pendingValue || 0).toLocaleString()}
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('available')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'available'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            💳 Disponibles ({vouchers.available?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('used')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'used'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            ✓ Usados ({vouchers.used?.length || 0})
          </button>
          {bookingId && (
            <button
              onClick={() => setActiveTab('validate')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'validate'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              🔍 Validar Voucher
            </button>
          )}
        </nav>
      </div>

      {/* Contenido según tab activo */}
      {activeTab === 'validate' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Validar y Usar Voucher</h3>
          <div className="flex gap-3 mb-4">
            <input
              type="text"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              placeholder="Ingrese código de voucher..."
              className="flex-1 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleValidateVoucher}
              disabled={loading.voucherValidation}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading.voucherValidation ? 'Validando...' : 'Validar'}
            </button>
          </div>

          {showValidation && renderVoucherValidation()}
        </div>
      )}

      {activeTab === 'available' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Vouchers Disponibles</h3>
          
          {loading.vouchers ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Cargando vouchers...</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterVouchers(vouchers.available || []).map(voucher => 
                renderVoucherCard(voucher, true)
              )}
            </div>
          )}

          {(!vouchers.available || vouchers.available.length === 0) && !loading.vouchers && (
            <div className="text-center py-8 text-gray-500">
              <p>No hay vouchers disponibles</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'used' && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Vouchers Usados</h3>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {(vouchers.used || []).map(voucher => 
              renderVoucherCard(voucher, false)
            )}
          </div>

          {(!vouchers.used || vouchers.used.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <p>No hay vouchers usados</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

import PropTypes from 'prop-types';

VoucherManager.propTypes = {
  mode: PropTypes.oneOf(['full', 'validation', 'list']),
  bookingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onVoucherUsed: PropTypes.func,
  showStatistics: PropTypes.bool
};

export default VoucherManager;