import React, { useEffect } from "react";
import { useCheckOutLogic } from "../../hooks/useCheckOutLogic";
import CheckOutHeader from "./CheckOutHeader";
import CheckOutFilters from "./CheckOutFilters";
import BookingCard from "./BookingCard";
import PaymentAndReceipt from "../Booking/PaymentAndReceipt";
import ExtraCharges from "./ExtraCharge";
import BillModal from "../Taxxa/BillModal";
import EarlyCheckOutModal from "./EarlyCheckOutModal";
import LoadingSpinner from "./LoadingSpinner";
import EmptyState from "./EmptyState";
import { getCheckOutBadge } from "../../utils/checkOutUtils";
import { getRealPaymentSummary } from "../../utils/paymentUtils";

const CheckOut = () => {
  const {
    // Estados
    selectedBooking,
    setSelectedBooking,
    showExtraCharges,
    setShowExtraCharges,
    selectedBookingForExtras,
    setSelectedBookingForExtras,
    showEarlyCheckOutModal,
    setShowEarlyCheckOutModal,
    earlyCheckOutDate,
    setEarlyCheckOutDate,
    bookingForEarlyCheckOut,
    setBookingForEarlyCheckOut,
    isLoading,
    showBillModal,
    setShowBillModal,
    generatedBill,
    setGeneratedBill,
    filters,
    sortBy,
    setSortBy,
    
    // Datos
    bookings,
    statistics,
    loading,
    taxxaStatus,
    
    // Funciones
    getDaysUntilCheckOut,
    handleCheckOut,
    handleEarlyCheckOutWithDiscount,
    handleGenerateBill,
    handlePaymentSuccess,
    handleFilterChange,
    applyFilters,
    clearFilters,
    handleOpenExtraCharges,
    handleExtraChargeSuccess,
    findBookingById,
    processPaymentResult,
    reloadSpecificBooking,
  } = useCheckOutLogic();

  // ✅ LOG BÁSICO DEL ESTADO
  useEffect(() => {
    console.log("📊 [CHECK-OUT] Estado actual:", {
      totalBookings: bookings?.length || 0,
      selectedBooking: selectedBooking?.bookingId || null,
      isLoading,
      showExtraCharges,
      selectedBookingForExtras: selectedBookingForExtras?.bookingId || null
    });

    // Hacer disponible para debugging
    window.__DEBUG_CHECKOUT_STATE__ = {
      bookings,
      selectedBooking,
      totalBookings: bookings?.length || 0,
      showExtraCharges,
      selectedBookingForExtras
    };
  }, [bookings, selectedBooking, isLoading, showExtraCharges, selectedBookingForExtras]);

  // ✅ FUNCIÓN PERSONALIZADA PARA ABRIR GASTOS EXTRAS
  const handleExtraChargesClick = (booking) => {
    console.group("📦 [EXTRA-CHARGES-CLICK] ===================");
    console.log("📋 Booking recibido:", {
      id: booking?.bookingId,
      room: booking?.roomNumber,
      status: booking?.status,
      hasData: !!booking
    });

    // Validación básica
    if (!booking?.bookingId) {
      console.error("❌ [EXTRA-CHARGES-CLICK] BookingId faltante");
      alert("❌ Error: No se pudo identificar la reserva para gastos extras");
      console.groupEnd();
      return;
    }

    // Buscar booking actualizado si está disponible
    let targetBooking = booking;
    if (findBookingById) {
      const freshBooking = findBookingById(booking.bookingId);
      if (freshBooking) {
        targetBooking = freshBooking;
        console.log("✅ [EXTRA-CHARGES-CLICK] Usando booking actualizado");
      } else {
        console.warn("⚠️ [EXTRA-CHARGES-CLICK] No se encontró en lista, usando original");
      }
    }

    try {
      console.log("🔧 [EXTRA-CHARGES-CLICK] Estableciendo estados...");
      
      // Establecer el booking seleccionado para gastos extras
      setSelectedBookingForExtras(targetBooking);
      
      // Mostrar el modal
      setShowExtraCharges(true);
      
      console.log("✅ [EXTRA-CHARGES-CLICK] Modal de gastos extras configurado");
      
    } catch (error) {
      console.error("❌ [EXTRA-CHARGES-CLICK] Error:", error);
      alert(`❌ Error abriendo gastos extras: ${error.message}`);
    }

    console.groupEnd();
  };

  // ✅ FUNCIÓN PRINCIPAL PARA MANEJAR CLICK DE PAGO
  const handlePaymentClick = (booking) => {
    console.group("💳 [PAYMENT-CLICK] ===================");
    console.log("📋 Booking recibido:", {
      id: booking?.bookingId,
      room: booking?.roomNumber,
      status: booking?.status,
      hasData: !!booking
    });

    // Validación básica
    if (!booking?.bookingId) {
      console.error("❌ [PAYMENT-CLICK] BookingId faltante");
      alert("❌ Error: No se pudo identificar la reserva");
      console.groupEnd();
      return;
    }

    // Buscar booking actualizado
    let targetBooking = booking;
    if (findBookingById) {
      const freshBooking = findBookingById(booking.bookingId);
      if (freshBooking) {
        targetBooking = freshBooking;
        console.log("✅ [PAYMENT-CLICK] Usando booking actualizado");
      } else {
        console.warn("⚠️ [PAYMENT-CLICK] No se encontró en lista, usando original");
      }
    }

    // Validar datos financieros
    try {
      const financials = getRealPaymentSummary(targetBooking);
      console.log("💰 [PAYMENT-CLICK] Financials:", {
        totalPendiente: financials?.totalPendiente,
        isValid: !!financials
      });

      if (!financials) {
        throw new Error("No se pudieron calcular los datos financieros");
      }

      if (financials.totalPendiente <= 0) {
        alert(`ℹ️ Esta reserva está completamente pagada.\n\nTotal: $${financials.totalFinal?.toLocaleString()}\nPagado: $${financials.totalPagado?.toLocaleString()}`);
        console.groupEnd();
        return;
      }

      // Abrir modal
      console.log("✅ [PAYMENT-CLICK] Abriendo modal de pago");
      setSelectedBooking(targetBooking);

    } catch (error) {
      console.error("❌ [PAYMENT-CLICK] Error:", error);
      alert(`❌ Error: ${error.message}`);
    }

    console.groupEnd();
  };

  // ✅ FUNCIÓN PERSONALIZADA PARA MANEJAR CHECKOUT
  const handleCheckOutClick = (booking) => {
    console.group("🚪 [CHECKOUT-CLICK] ===================");
    console.log("📋 Booking recibido:", {
      id: booking?.bookingId,
      room: booking?.roomNumber,
      status: booking?.status,
      hasData: !!booking
    });

    // Validación básica
    if (!booking?.bookingId) {
      console.error("❌ [CHECKOUT-CLICK] BookingId faltante");
      alert("❌ Error: No se pudo identificar la reserva para checkout");
      console.groupEnd();
      return;
    }

    // Buscar booking actualizado
    let targetBooking = booking;
    if (findBookingById) {
      const freshBooking = findBookingById(booking.bookingId);
      if (freshBooking) {
        targetBooking = freshBooking;
        console.log("✅ [CHECKOUT-CLICK] Usando booking actualizado");
      } else {
        console.warn("⚠️ [CHECKOUT-CLICK] No se encontró en lista, usando original");
      }
    }

    try {
      // Verificar si la función handleCheckOut existe
      if (typeof handleCheckOut !== 'function') {
        console.error("❌ [CHECKOUT-CLICK] handleCheckOut no es una función:", typeof handleCheckOut);
        alert("❌ Error: Función de checkout no disponible");
        console.groupEnd();
        return;
      }

      console.log("🔧 [CHECKOUT-CLICK] Llamando a handleCheckOut...");
      
      // Llamar a la función de checkout del hook
      const result = handleCheckOut(targetBooking);
      
      console.log("✅ [CHECKOUT-CLICK] handleCheckOut ejecutado, resultado:", result);
      
    } catch (error) {
      console.error("❌ [CHECKOUT-CLICK] Error:", error);
      alert(`❌ Error en checkout: ${error.message}`);
    }

    console.groupEnd();
  };

  // ✅ FUNCIÓN PARA CALCULAR MONTO DE PAGO
  const getPaymentAmount = (booking) => {
    if (!booking) return 0;
    
    try {
      const financials = getRealPaymentSummary(booking);
      return financials?.totalPendiente || 0;
    } catch (error) {
      console.error("❌ [GET-PAYMENT-AMOUNT] Error:", error);
      return 0;
    }
  };

  // ✅ CONFIGURAR FUNCIONES GLOBALES PARA TESTING
  useEffect(() => {
    console.log("🚀 [CHECK-OUT] Componente montado");
    
    // Hacer funciones disponibles globalmente para debugging
    window.__TEST_PAYMENT_CLICK__ = handlePaymentClick;
    window.__TEST_EXTRA_CHARGES_CLICK__ = handleExtraChargesClick;
    window.__TEST_CHECKOUT_CLICK__ = handleCheckOutClick;
    window.__TEST_GET_PAYMENT_AMOUNT__ = getPaymentAmount;
    window.__TEST_GET_REAL_PAYMENT_SUMMARY__ = getRealPaymentSummary;
    
    // ✅ FUNCIÓN DE TEST PARA CHECKOUT
    window.__TEST_CHECKOUT_FLOW__ = (bookingId) => {
      console.log("🧪 [TEST] Probando checkout para:", bookingId);
      const booking = bookings.find(b => b.bookingId == bookingId);
      if (booking) {
        handleCheckOutClick(booking);
      } else {
        console.error("❌ Booking no encontrado:", bookingId);
      }
    };
    
    // ✅ FUNCIÓN DE TEST PARA GASTOS EXTRAS
    window.__TEST_EXTRA_CHARGES_FLOW__ = (bookingId) => {
      console.log("🧪 [TEST] Probando gastos extras para:", bookingId);
      const booking = bookings.find(b => b.bookingId == bookingId);
      if (booking) {
        handleExtraChargesClick(booking);
      } else {
        console.error("❌ Booking no encontrado:", bookingId);
      }
    };
    
    // ✅ FUNCIÓN DE TEST PARA PAGOS
    window.__TEST_PAYMENT_FLOW__ = (bookingId) => {
      console.log("🧪 [TEST] Probando pago para:", bookingId);
      const booking = bookings.find(b => b.bookingId == bookingId);
      if (booking) {
        handlePaymentClick(booking);
      } else {
        console.error("❌ Booking no encontrado:", bookingId);
      }
    };
    
    window.__CHECKOUT_FUNCTIONS__ = {
      handlePaymentClick,
      handleExtraChargesClick,
      handleCheckOutClick,
      handleCheckOut,
      getPaymentAmount,
      getRealPaymentSummary,
      findBookingById,
      processPaymentResult,
      handlePaymentSuccess,
      setSelectedBooking,
      handleOpenExtraCharges,
      showExtraCharges,
      setShowExtraCharges,
      selectedBookingForExtras,
      setSelectedBookingForExtras
    };

    // ✅ Hacer disponible la función handleCheckOut para debugging
    window.__DEBUG_HANDLE_CHECKOUT__ = handleCheckOut;
    window.__DEBUG_CHECKOUT_FUNCTIONS__ = {
      handleCheckOut,
      handleCheckOutClick,
      typeof_handleCheckOut: typeof handleCheckOut,
      available: !!handleCheckOut
    };

    console.log("✅ [CHECK-OUT] Funciones de test configuradas");
  }, [handlePaymentClick, handleExtraChargesClick, handleCheckOut, bookings, showExtraCharges, selectedBookingForExtras]);

  // ✅ LOG CUANDO SE ACTIVAN LOS MODALES
  useEffect(() => {
    if (selectedBooking) {
      console.log("📺 [MODAL] Modal de pago activado para booking:", selectedBooking.bookingId);
    } else {
      console.log("📺 [MODAL] Modal de pago cerrado");
    }
  }, [selectedBooking]);

  useEffect(() => {
    if (showExtraCharges && selectedBookingForExtras) {
      console.log("📦 [MODAL] Modal de gastos extras activado para booking:", selectedBookingForExtras.bookingId);
    } else {
      console.log("📦 [MODAL] Modal de gastos extras cerrado");
    }
  }, [showExtraCharges, selectedBookingForExtras]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <CheckOutHeader statistics={statistics} />
      
      {/* Filtros */}
      <CheckOutFilters
        filters={filters}
        sortBy={sortBy}
        setSortBy={setSortBy}
        handleFilterChange={handleFilterChange}
        applyFilters={applyFilters}
        clearFilters={clearFilters}
        isLoading={isLoading}
      />

      {/* Contenido principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Estado de carga */}
        {isLoading && !loading.bills ? (
          <LoadingSpinner />
        ) : bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking, index) => {
              console.log(`📋 [RENDER] Renderizando BookingCard ${index} para booking:`, booking.bookingId);
              
              return (
                <div 
                  key={booking.bookingId}
                  data-booking-id={booking.bookingId}
                  className="booking-card"
                >
                  <BookingCard
                    booking={booking}
                    getDaysUntilCheckOut={getDaysUntilCheckOut}
                    getCheckOutBadge={getCheckOutBadge}
                    onPaymentClick={(clickedBooking) => {
                      console.log("🔘 [BOOKING-CARD] Click pago recibido para:", clickedBooking?.bookingId);
                      handlePaymentClick(clickedBooking);
                    }}
                    onExtraChargesClick={(clickedBooking) => {
                      console.log("📦 [BOOKING-CARD] Click gastos extras recibido para:", clickedBooking?.bookingId);
                      handleExtraChargesClick(clickedBooking);
                    }}
                    onGenerateBill={handleGenerateBill}
                    onCheckOut={(clickedBooking) => {
                      console.log("🚪 [BOOKING-CARD] Click checkout recibido para:", clickedBooking?.bookingId);
                      handleCheckOutClick(clickedBooking); // ⭐ USAR NUESTRA FUNCIÓN PERSONALIZADA
                    }}
                    onEarlyCheckOut={(booking) => {
                      console.log("🕐 [BOOKING-CARD] Click early checkout recibido para:", booking?.bookingId);
                      setBookingForEarlyCheckOut(booking);
                      setEarlyCheckOutDate(new Date().toISOString().slice(0, 16));
                      setShowEarlyCheckOutModal(true);
                    }}
                    isLoading={isLoading}
                    loadingBills={loading.bills}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ✅ MODAL DE PAGO */}
      {selectedBooking && (
        <PaymentAndReceipt
          bookingData={selectedBooking}
          amountToPay={getPaymentAmount(selectedBooking)}
          currentBuyerData={selectedBooking.guest}
          selectedRoom={selectedBooking.room}
          onPaymentSuccess={(paymentResult) => {
            console.log("💳 [PAYMENT-SUCCESS] Resultado:", paymentResult);
            
            try {
              if (processPaymentResult) {
                processPaymentResult(paymentResult);
              } else if (handlePaymentSuccess) {
                handlePaymentSuccess(paymentResult);
              }
              
              // Cerrar modal después de procesar
              setTimeout(() => {
                setSelectedBooking(null);
              }, 1000);
              
            } catch (error) {
              console.error("❌ [PAYMENT-SUCCESS] Error:", error);
            }
          }}
          onClose={() => {
            console.log("🔄 [MODAL] Cerrando modal de pago");
            setSelectedBooking(null);
          }}
        />
      )}

      {/* ✅ MODAL DE GASTOS EXTRAS */}
      {showExtraCharges && selectedBookingForExtras && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-auto"
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              maxWidth: '56rem',
              width: '100%',
              margin: '0 1rem',
              maxHeight: '90vh',
              overflow: 'auto',
              zIndex: 10000
            }}
          >
            {/* ✅ HEADER DE DEBUG TEMPORAL */}
            <div className="bg-green-100 border-b border-green-300 p-3 text-sm font-semibold">
              🔧 DEBUG ExtraCharges: BookingId {selectedBookingForExtras.bookingId} | 
              Show: {showExtraCharges.toString()} | 
              Loading: {isLoading.toString()}
            </div>
            
            <ExtraCharges
              bookingId={selectedBookingForExtras.bookingId}
              isLoading={isLoading}
              onSuccess={(result) => {
                console.log("✅ [EXTRA-CHARGES] Cargo añadido exitosamente:", result);
                handleExtraChargeSuccess(result);
              }}
              onClose={() => {
                console.log("🔄 [EXTRA-CHARGES] Cerrando modal de gastos extras");
                setShowExtraCharges(false);
                setSelectedBookingForExtras(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de Factura */}
      {showBillModal && generatedBill && (
        <BillModal
          bill={generatedBill}
          taxxaStatus={taxxaStatus}
          onClose={() => {
            setShowBillModal(false);
            setGeneratedBill(null);
          }}
        />
      )}

      {/* Modal de Check-out Anticipado */}
      {showEarlyCheckOutModal && bookingForEarlyCheckOut && (
        <EarlyCheckOutModal
          booking={bookingForEarlyCheckOut}
          earlyCheckOutDate={earlyCheckOutDate}
          setEarlyCheckOutDate={setEarlyCheckOutDate}
          onConfirm={handleEarlyCheckOutWithDiscount}
          onClose={() => {
            setShowEarlyCheckOutModal(false);
            setBookingForEarlyCheckOut(null);
            setEarlyCheckOutDate("");
          }}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

export default CheckOut;