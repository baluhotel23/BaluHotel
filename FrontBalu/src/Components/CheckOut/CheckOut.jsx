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
      isLoading
    });

    // Hacer disponible para debugging
    window.__DEBUG_CHECKOUT_STATE__ = {
      bookings,
      selectedBooking,
      totalBookings: bookings?.length || 0
    };
  }, [bookings, selectedBooking, isLoading]);

  // ✅ CONFIGURAR FUNCIONES GLOBALES PARA TESTING
  useEffect(() => {
    console.log("🚀 [CHECK-OUT] Componente montado");
    
    // Hacer funciones disponibles globalmente para debugging
    window.__TEST_PAYMENT_CLICK__ = handlePaymentClick;
    window.__TEST_GET_PAYMENT_AMOUNT__ = getPaymentAmount;
    window.__TEST_GET_REAL_PAYMENT_SUMMARY__ = getRealPaymentSummary;
    window.__CHECKOUT_FUNCTIONS__ = {
      handlePaymentClick,
      getPaymentAmount,
      getRealPaymentSummary,
      findBookingById,
      processPaymentResult,
      handlePaymentSuccess,
      setSelectedBooking
    };

    // Función de test completa
    window.__TEST_PAYMENT_FLOW__ = () => {
      console.group("🧪 [TEST] Probando flujo completo de pago");
      
      const state = window.__DEBUG_CHECKOUT_STATE__;
      if (!state?.bookings?.length) {
        console.error("❌ [TEST] No hay bookings disponibles");
        console.groupEnd();
        return;
      }

      const booking = state.bookings[0];
      console.log("📋 [TEST] Testing con booking:", booking.bookingId);

      try {
        const financials = getRealPaymentSummary(booking);
        console.log("📊 [TEST] Financials:", financials);
        
        if (financials?.totalPendiente > 0) {
          console.log("🔘 [TEST] Simulando click...");
          handlePaymentClick(booking);
        } else {
          console.log("⚠️ [TEST] No hay pendientes");
        }
      } catch (error) {
        console.error("❌ [TEST] Error:", error);
      }
      
      console.groupEnd();
    };

    console.log("✅ [CHECK-OUT] Funciones de test configuradas");
  }, []);

  // ✅ FUNCIÓN PRINCIPAL PARA MANEJAR CLICK DE PAGO - SIMPLIFICADA
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

  // ✅ LOG CUANDO SE ACTIVA EL MODAL
  useEffect(() => {
    if (selectedBooking) {
      console.log("📺 [MODAL] Modal de pago activado para booking:", selectedBooking.bookingId);
    } else {
      console.log("📺 [MODAL] Modal cerrado");
    }
  }, [selectedBooking]);

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
            {bookings.map((booking) => (
              <BookingCard
                key={booking.bookingId}
                booking={booking}
                getDaysUntilCheckOut={getDaysUntilCheckOut}
                getCheckOutBadge={getCheckOutBadge}
                onPaymentClick={(clickedBooking) => {
                  console.log("🔘 [BOOKING-CARD] Click recibido para:", clickedBooking?.bookingId);
                  handlePaymentClick(clickedBooking);
                }}
                onExtraChargesClick={handleOpenExtraCharges}
                onGenerateBill={handleGenerateBill}
                onCheckOut={handleCheckOut}
                onEarlyCheckOut={(booking) => {
                  setBookingForEarlyCheckOut(booking);
                  setEarlyCheckOutDate(new Date().toISOString().slice(0, 16));
                  setShowEarlyCheckOutModal(true);
                }}
                isLoading={isLoading}
                loadingBills={loading.bills}
              />
            ))}
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

      {/* Modal de Cargos Extra */}
      {showExtraCharges && selectedBookingForExtras && (
        <ExtraCharges
          bookingId={selectedBookingForExtras.bookingId}
          isLoading={isLoading}
          onSuccess={handleExtraChargeSuccess}
          onClose={() => {
            setShowExtraCharges(false);
            setSelectedBookingForExtras(null);
          }}
        />
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