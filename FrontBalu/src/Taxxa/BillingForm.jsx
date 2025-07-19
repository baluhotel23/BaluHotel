import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserByDocument } from "../../Redux/Actions/actions";
import BuyerForm from "./BuyerForm";
import UserRegistrationPopup from "./UserRegistrationPopup";
import DocumentTypePopup from "./DocumentTypePopup";
import { useNavigate, useLocation } from "react-router-dom";
import OrdenesPendientes from "./OrdenesPendientes";

const BillingForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // ✅ OBTENER DATOS DE LA RESERVA SI VIENEN DEL CHECK-OUT
  const { buyer: preloadedBuyer, bookingData, preGeneratedBill } = location.state || {};
  
  const [n_document, setNDocument] = useState(
    preloadedBuyer?.jpartylegalentity?.sdocno || ""
  );
  const [showRegistrationPopup, setShowRegistrationPopup] = useState(false);
  const [showInvoicePopup, setShowInvoicePopup] = useState(false);
  const [jbuyer, setBuyer] = useState(
    preloadedBuyer || {
      wlegalorganizationtype: "person",
      scostumername: "Consumidor Final",
      stributaryidentificationkey: "01",
      stributaryidentificationname: "IVA",
      sfiscalresponsibilities: "R-99-PN",
      sfiscalregime: "49",
      jpartylegalentity: {
        wdoctype: "",
        sdocno: "",
        scorporateregistrationschemename: ""
      },
      jcontact: {
        scontactperson: "",
        selectronicmail: "",
        stelephone: "",
        jregistrationaddress: {
          scountrycode: "CO",
          wdepartmentcode: "",
          wtowncode: "",
          scityname: "",
          saddressline1: "",
          szip: ""
        }
      }
    }
  );

  const handleSelectDocument = (selectedDocument) => {
    setNDocument(selectedDocument);
  };

  const handleProceedToDocument = () => {
    if (jbuyer.scostumername === "CONSUMIDOR FINAL") {
      alert("Completa los datos del comprador antes de continuar.");
      return;
    }
    setShowInvoicePopup(true);
  };

  const dispatch = useDispatch();
  const userTaxxa = useSelector((state) => state.userTaxxa);

  const handleFetchUser = (e) => {
    e.preventDefault();
    dispatch(fetchUserByDocument(n_document));
  };

  useEffect(() => {
    if (userTaxxa.userInfo && userTaxxa.userInfo.error) {
      setShowRegistrationPopup(true);
    } else if (userTaxxa.userInfo) {
      const {
        first_name,
        last_name,
        email,
        phone,
        n_document,
        wlegalorganizationtype,
        scostumername,
        stributaryidentificationkey,
        sfiscalregime,
        sfiscalresponsibilities,
        wdoctype,
        wdepartmentcode,
        wtowncode,
        scityname,
        saddressline1,
        szip
      } = userTaxxa.userInfo;
  
      setBuyer((prevBuyer) => ({
        ...prevBuyer,
        wlegalorganizationtype: wlegalorganizationtype || "person",
        scostumername: scostumername || `${first_name} ${last_name}`.trim() || "Consumidor Final",
        stributaryidentificationkey: stributaryidentificationkey || "01",
        stributaryidentificationname: "IVA",
        sfiscalresponsibilities: sfiscalresponsibilities || "R-99-PN",
        sfiscalregime: sfiscalregime || "49",
        jpartylegalentity: {
          wdoctype: wdoctype || "",
          sdocno: n_document || "",
          scorporateregistrationschemename: `${first_name} ${last_name}`.trim() || ""
        },
        jcontact: {
          scontactperson: `${first_name} ${last_name}`.trim() || "",
          selectronicmail: email || "",
          stelephone: phone || "",
          jregistrationaddress: {
            scountrycode: "CO",
            wdepartmentcode: wdepartmentcode || "50",
            wtowncode: wtowncode || "50226",
            scityname: scityname || "Cumaral",
            saddressline1: saddressline1 || "12 # 17 -57",
            szip: szip || "501021"
          }
        }
      }));
    }
  }, [userTaxxa]);

  const handleSubmit = (e) => {
    e.preventDefault();
  };

  const closePopup = () => setShowRegistrationPopup(false);

  return (
    <div className="flex flex-col min-h-screen">
      {/* ✅ MOSTRAR INFORMACIÓN DE LA RESERVA SI VIENE DEL CHECK-OUT */}
      {bookingData && (
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-lg font-semibold text-blue-800 mb-2">
              🏨 Facturación desde Check-Out - Reserva #{bookingData.bookingId}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Habitación:</strong> {bookingData.room?.roomNumber}
              </div>
              <div>
                <strong>Huésped:</strong> {bookingData.guest?.scostumername}
              </div>
              <div>
                <strong>Total Factura:</strong> ${parseFloat(preGeneratedBill?.totalAmount || 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 bg-gray-900">
        <OrdenesPendientes
          filterType="facturablesPendientes"
          mode="billingForm"
          onSelectOrder={handleSelectDocument}
          // ✅ SI VIENE DE CHECK-OUT, PRESELECCIONAR LA ORDEN
          preSelectedBooking={bookingData}
        />
      </div>

      <div className="p-6 max-w-lg mx-auto pt-16 grid-cols-4">
        <form onSubmit={handleFetchUser} className="flex flex-col gap-4 mb-6">
          <label className="text-gray-700">Número de Documento</label>
          <input
            type="text"
            value={n_document}
            onChange={(e) => setNDocument(e.target.value)}
            className="p-2 border border-gray-300 rounded"
            required
          />
          <button
            type="submit"
            className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          >
            Buscar Usuario
          </button>
        </form>

        {userTaxxa.error && <p className="text-red-500 mt-2">{userTaxxa.error}</p>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <BuyerForm jbuyer={jbuyer} setBuyer={setBuyer} />
        </form>

        {showRegistrationPopup && <UserRegistrationPopup onClose={closePopup} />}
        
        <button
          type="button"
          onClick={handleProceedToDocument}
          className="bg-blue-500 text-white py-2 rounded mt-12 hover:bg-blue-600"
        >
          Proceder a Facturar o Nota de Crédito
        </button>

        {showInvoicePopup && (
          <DocumentTypePopup
            onClose={() => setShowInvoicePopup(false)}
            onSubmit={(type) => {
              if (type === "01") {
                console.log("Invoice Data:", jbuyer);
                navigate("/invoice", { 
                  state: { 
                    buyer: jbuyer,
                    bookingData,
                    preGeneratedBill 
                  }
                });
              } else if (type === "91") {
                console.log("Credit Note Data:", jbuyer);
                navigate("/creditN", { 
                  state: { 
                    buyer: jbuyer,
                    bookingData,
                    preGeneratedBill 
                  }
                });
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BillingForm;