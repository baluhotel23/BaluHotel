import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { openShift, closeShift, getCurrentShift, generateShiftPDF } from '../../Redux/Actions/shiftActions';
import { toast } from 'react-toastify';

const ShiftModal = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const { loading, currentShift, summary } = useSelector(state => state.shift); // ⭐ Agregar summary
  
  // ⭐ ESTADOS PARA FORMULARIOS
  const [openingCash, setOpeningCash] = useState('');
  const [closingCash, setClosingCash] = useState('');
  const [openingNotes, setOpeningNotes] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [showClosingForm, setShowClosingForm] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false); // ⭐ NUEVO: Controlar si se descargó el PDF

  // ⭐ CALCULAR DIFERENCIA DE CAJA
  const cashDifference = summary && closingCash
    ? parseFloat(closingCash) - parseFloat(summary.expectedCash || 0)
    : 0;

  // ⭐ CARGAR TURNO ACTUAL AL ABRIR EL MODAL
  useEffect(() => {
    if (isOpen) {
      // Cargar turno actual cuando se abre el modal
      console.log('🔄 [SHIFT-MODAL] Modal abierto, cargando turno actual...');
      dispatch(getCurrentShift()).then((data) => {
        console.log('📊 [SHIFT-MODAL] Turno cargado:', data?.shift);
        console.log('📊 [SHIFT-MODAL] Summary cargado:', data?.summary);
      });
    } else {
      // Limpiar formularios al cerrar
      setOpeningCash('');
      setClosingCash('');
      setOpeningNotes('');
      setClosingNotes('');
      setShowClosingForm(false);
      setPdfDownloaded(false); // ⭐ Resetear estado de PDF
    }
  }, [isOpen, dispatch]);

  // ⭐ MANEJAR APERTURA DE TURNO
  const handleOpenShift = async (e) => {
    e.preventDefault();

    if (!openingCash || parseFloat(openingCash) < 0) {
      toast.error('Por favor ingresa un monto válido');
      return;
    }

    try {
      const result = await dispatch(openShift({
        openingCash: parseFloat(openingCash),
        openingNotes
      }));
      
      // ⭐ Verificar resultado
      if (result.success) {
        toast.success('✅ Turno abierto exitosamente');
        onClose();
        dispatch(getCurrentShift()); // Refrescar turno actual
      } else if (result.isShiftAlreadyOpen) {
        // ⭐ Caso específico: turno ya abierto
        toast.warning('⚠️ Ya tienes un turno abierto. Mostrando resumen...');
        // ⭐ NO cerrar el modal, refrescar para mostrar el turno actual
        await dispatch(getCurrentShift()); // Refrescar para que currentShift se actualice
        // El componente se renderizará automáticamente con el resumen
      } else {
        toast.error(result.error || 'Error al abrir turno');
      }
    } catch (error) {
      toast.error(error.message || 'Error al abrir turno');
    }
  };

  // ⭐ MANEJAR CIERRE DE TURNO
  const handleCloseShift = async (e) => {
    e.preventDefault();

    if (!closingCash || parseFloat(closingCash) < 0) {
      toast.error('Por favor ingresa el monto de cierre');
      return;
    }

    if (!currentShift || !currentShift.shiftId) {
      toast.error('❌ No se encontró el turno activo. Por favor recarga la página.');
      return;
    }

    try {
      console.log('🔒 [CLOSE-SHIFT-MODAL] Enviando cierre con shiftId:', currentShift.shiftId);
      
      await dispatch(closeShift({
        shiftId: currentShift.shiftId, // ⭐ AGREGAR shiftId
        closingCash: parseFloat(closingCash),
        closingNotes
      }));
      
      toast.success('✅ Turno cerrado exitosamente');
      onClose();
      dispatch(getCurrentShift()); // Refrescar estado
    } catch (error) {
      toast.error(error.message || 'Error al cerrar turno');
    }
  };

  // ⭐ DESCARGAR PDF DEL TURNO
  const handleDownloadPDF = async () => {
    try {
      await dispatch(generateShiftPDF(currentShift.shiftId));
      setPdfDownloaded(true); // ⭐ Marcar como descargado
      toast.success('📄 PDF descargado. Ahora puedes cerrar el turno.');
    } catch {
      toast.error('Error al generar PDF');
    }
  };

  if (!isOpen) return null;

  // ⭐ DEBUG: Ver estado actual
  console.log('🎨 [SHIFT-MODAL] Renderizando modal. currentShift:', currentShift);
  console.log('🎨 [SHIFT-MODAL] loading:', loading);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        
        {/* ⭐ ENCABEZADO */}
        <div className="bg-orange-500 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-2xl font-bold">
            {currentShift ? 'Cerrar Turno' : 'Abrir Turno'}
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 text-2xl"
          >
            ✕
          </button>
        </div>

        <div className="p-6">
          {/* ⭐ FORMULARIO DE APERTURA */}
          {!currentShift && (
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Monto Inicial en Caja *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  placeholder="Ejemplo: 50000"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ingresa el dinero en efectivo con el que comienzas el turno
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notas de Apertura (Opcional)
                </label>
                <textarea
                  value={openingNotes}
                  onChange={(e) => setOpeningNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  rows="3"
                  placeholder="Ejemplo: Turno de mañana, todo en orden..."
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-4">
                <h4 className="font-semibold text-blue-800 mb-2">📋 Información Importante</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Todos los pagos en efectivo se registrarán en este turno</li>
                  <li>• Podrás ver un resumen en tiempo real de tus operaciones</li>
                  <li>• Al cerrar, deberás contar el efectivo y compararlo con lo esperado</li>
                  <li>• Recuerda cerrar tu turno antes de terminar tu jornada</li>
                </ul>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-3 rounded transition-colors"
                >
                  {loading ? 'Abriendo...' : '✅ Abrir Turno'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* ⭐ RESUMEN Y CIERRE DE TURNO */}
          {currentShift && !showClosingForm && (
            <div className="space-y-4">
              {/* Resumen del turno */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-3">Resumen del Turno</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Apertura:</p>
                    <p className="font-semibold">
                      {new Date(currentShift.openedAt).toLocaleString('es-CO')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Caja Inicial:</p>
                    <p className="font-semibold text-green-600">
                      ${parseFloat(currentShift.openingCash || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Estadísticas de ventas */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-3">💰 Ventas del Turno</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Efectivo:</span>
                    <span className="font-semibold text-green-600">
                      ${parseFloat(summary?.totalCashSales || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tarjetas:</span>
                    <span className="font-semibold text-blue-600">
                      ${parseFloat(summary?.totalCardSales || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Transferencias:</span>
                    <span className="font-semibold text-purple-600">
                      ${parseFloat(summary?.totalTransferSales || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-semibold text-gray-700">Total Ventas:</span>
                    <span className="font-bold text-orange-600 text-lg">
                      ${parseFloat(summary?.totalSales || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actividades */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-700 mb-3">📊 Actividades</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {summary?.checkInsProcessed || 0}
                    </p>
                    <p className="text-xs text-gray-600">Check-ins</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {summary?.checkOutsProcessed || 0}
                    </p>
                    <p className="text-xs text-gray-600">Check-outs</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {summary?.bookingsCreated || 0}
                    </p>
                    <p className="text-xs text-gray-600">Reservas</p>
                  </div>
                </div>
              </div>

              {/* Caja esperada */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-yellow-800">Efectivo Esperado en Caja:</span>
                  <span className="text-2xl font-bold text-yellow-700">
                    ${parseFloat(summary?.expectedCash || 0).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-yellow-700 mt-1">
                  Caja inicial + ventas en efectivo
                </p>
              </div>

              {/* ⭐ MENSAJE INFORMATIVO - DESCARGAR PDF */}
              {!pdfDownloaded && (
                <div className="bg-blue-50 border border-blue-300 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    ℹ️ <strong>Importante:</strong> Debes descargar el PDF del turno antes de cerrarlo.
                  </p>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleDownloadPDF}
                  className={`flex-1 font-semibold py-3 rounded transition-colors ${
                    pdfDownloaded 
                      ? 'bg-green-500 hover:bg-green-600 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  {pdfDownloaded ? '✅ PDF Descargado' : '📄 Descargar PDF'}
                </button>
                <button
                  onClick={() => setShowClosingForm(true)}
                  disabled={!pdfDownloaded}
                  className={`flex-1 font-semibold py-3 rounded transition-colors ${
                    pdfDownloaded 
                      ? 'bg-red-500 hover:bg-red-600 text-white cursor-pointer' 
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                  title={!pdfDownloaded ? 'Primero debes descargar el PDF del turno' : 'Cerrar turno'}
                >
                  🔒 Cerrar Turno
                </button>
              </div>
              
              <button
                onClick={onClose}
                className="w-full bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 rounded transition-colors"
              >
                Volver al Dashboard
              </button>
            </div>
          )}

          {/* ⭐ FORMULARIO DE CIERRE */}
          {currentShift && showClosingForm && (
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
                <h4 className="font-semibold text-red-800 mb-2">⚠️ Cerrar Turno</h4>
                <p className="text-sm text-red-700">
                  Cuenta todo el efectivo en la caja y registra el monto exacto.
                  El sistema calculará automáticamente si hay diferencias.
                </p>
              </div>

              <div className="bg-gray-100 rounded p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-700">Efectivo Esperado:</span>
                  <span className="font-bold text-gray-800">
                    ${parseFloat(summary?.expectedCash || 0).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  (Caja inicial: ${parseFloat(currentShift.openingCash || 0).toLocaleString()} + 
                  Ventas efectivo: ${parseFloat(summary?.totalCashSales || 0).toLocaleString()})
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Efectivo Contado en Caja *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  placeholder="Ingresa el monto exacto contado"
                  required
                />
              </div>

              {/* Mostrar diferencia */}
              {closingCash && (
                <div className={`rounded p-4 ${
                  Math.abs(cashDifference) < 1 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Diferencia:</span>
                    <span className={`text-2xl font-bold ${
                      cashDifference > 0 ? 'text-green-600' : 
                      cashDifference < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {cashDifference > 0 && '+'}
                      ${cashDifference.toLocaleString()}
                    </span>
                  </div>
                  {Math.abs(cashDifference) > 0 && (
                    <p className="text-xs mt-1">
                      {cashDifference > 0 
                        ? '✅ Hay más dinero del esperado (sobrante)'
                        : '⚠️ Hay menos dinero del esperado (faltante)'}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Notas de Cierre (Opcional)
                </label>
                <textarea
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  rows="3"
                  placeholder="Ejemplo: Todo en orden, turno sin novedades..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-semibold py-3 rounded transition-colors"
                >
                  {loading ? 'Cerrando...' : '🔒 Confirmar Cierre'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowClosingForm(false)}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShiftModal;
