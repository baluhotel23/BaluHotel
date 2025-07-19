import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const BillModal = ({ bill, taxxaStatus, onClose }) => {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);

  if (!bill) return null;

  const {
    idBill,
    bookingId,
    reservationAmount = 0,
    extraChargesAmount = 0,
    discountAmount = 0,
    totalAmount = 0,
    status = 'generated',
    createdAt,
    booking = {},
  } = bill;

  const guestInfo = booking.guest || {};

  // ✅ FUNCIÓN PARA IR A FACTURACIÓN FORMAL CON TAXXA
  const handleGoToTaxxaBilling = () => {
    // Preparar datos del comprador basado en la información de la reserva
    const buyerData = {
      wlegalorganizationtype: "person",
      scostumername: guestInfo.scostumername || `${guestInfo.first_name} ${guestInfo.last_name}`.trim() || "Consumidor Final",
      stributaryidentificationkey: "01",
      stributaryidentificationname: "IVA",
      sfiscalresponsibilities: "R-99-PN",
      sfiscalregime: "49",
      jpartylegalentity: {
        wdoctype: guestInfo.wdoctype || "",
        sdocno: guestInfo.sdocno || "",
        scorporateregistrationschemename: guestInfo.scostumername || ""
      },
      jcontact: {
        scontactperson: guestInfo.scostumername || "",
        selectronicmail: guestInfo.selectronicmail || "",
        stelephone: guestInfo.stelephone || "",
        jregistrationaddress: {
          scountrycode: "CO",
          wdepartmentcode: guestInfo.wdepartmentcode || "50",
          wtowncode: guestInfo.wtowncode || "50226",
          scityname: guestInfo.scityname || "Cumaral",
          saddressline1: guestInfo.saddressline1 || "",
          szip: guestInfo.szip || "501021"
        }
      }
    };

    // Navegar al formulario de facturación con los datos precargados
    navigate("/billing-form", { 
      state: { 
        buyer: buyerData,
        bookingData: booking,
        preGeneratedBill: bill
      }
    });

    onClose();
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      // Aquí iría la lógica para descargar el PDF interno
      toast.success('✅ Factura interna descargada');
    } catch (error) {
      toast.error('❌ Error al descargar factura');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">🧾 Factura Generada</h2>
              <p className="text-blue-100 mt-1">
                Factura #{idBill} - Reserva #{bookingId}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Estado de la factura */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-blue-800">Factura Interna Generada</h3>
                <p className="text-blue-600 text-sm">
                  Se ha generado la factura interna del sistema para la reserva #{bookingId}
                </p>
              </div>
            </div>
          </div>

          {/* Resumen financiero */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">💰 Resumen Financiero</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Costo habitación:</span>
                <span className="font-medium">${parseFloat(reservationAmount).toLocaleString()}</span>
              </div>
              {extraChargesAmount > 0 && (
                <div className="flex justify-between text-blue-600">
                  <span>Consumos extras:</span>
                  <span className="font-medium">+${parseFloat(extraChargesAmount).toLocaleString()}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento aplicado:</span>
                  <span className="font-medium">-${parseFloat(discountAmount).toLocaleString()}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>TOTAL:</span>
                <span>${parseFloat(totalAmount).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Información del huésped */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-3">👤 Cliente</h4>
            <div className="text-sm space-y-1">
              <div><strong>Nombre:</strong> {guestInfo.scostumername || 'N/A'}</div>
              <div><strong>Documento:</strong> {guestInfo.sdocno || 'N/A'}</div>
              <div><strong>Email:</strong> {guestInfo.selectronicmail || 'N/A'}</div>
            </div>
          </div>

          {/* Opciones de facturación */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Facturación Oficial</h4>
            <p className="text-yellow-700 text-sm mb-3">
              Esta es una factura interna del sistema. Para generar una factura oficial con validez tributaria (TAXXA), 
              debe proceder al módulo de facturación formal.
            </p>
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="bg-gray-50 p-6 border-t border-gray-200">
          <div className="flex gap-3 justify-between">
            <div className="flex gap-3">
              <button
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {isDownloading ? 'Descargando...' : '📥 Descargar Factura Interna'}
              </button>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cerrar
              </button>
              
              <button
                onClick={handleGoToTaxxaBilling}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                🧾 Generar Factura Oficial TAXXA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillModal;