import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchUserByDocument } from "../../Redux/Actions/actions";
import BuyerForm from "./BuyerForm";
import UserRegistrationPopup from "./UserRegistrationPopup";
import DocumentTypePopup from "./DocumentTypePopup"; // Importa el popup
import { useNavigate } from "react-router-dom";
import OrdenesPendientes from "./OrdenesPendientes";

const BillingForm = () => {
  const navigate = useNavigate();
  const [n_document, setNDocument] = useState("");
  const [showRegistrationPopup, setShowRegistrationPopup] = useState(false);
  const [showInvoicePopup, setShowInvoicePopup] = useState(false); // Estado para el popup
  const [jbuyer, setBuyer] = useState({
   
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
    });

    const handleSelectDocument = (selectedDocument) => {
      setNDocument(selectedDocument); // Actualizar el estado con el documento seleccionado
    };

  const handleProceedToDocument = () => {
    if (jbuyer.scostumername === "CONSUMIDOR FINAL") {
      alert("Completa los datos del comprador antes de continuar.");
      return;
    }
    setShowInvoicePopup(true); // Abrir el popup para seleccionar el tipo de comprobante
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
        scostumername:
          scostumername ||
          `${first_name} ${last_name}`.trim() ||
          "Consumidor Final",
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
      <div className="flex-1 bg-gray-900">
      <OrdenesPendientes
          filterType="facturablesPendientes"
          mode="billingForm"
          onSelectOrder={handleSelectDocument} // Pasar la función de callback
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

        {/* Popup para seleccionar tipo de comprobante */}
        {showInvoicePopup && (
          <DocumentTypePopup
            onClose={() => setShowInvoicePopup(false)}
            onSubmit={(type) => {
              if (type === "01") {
                console.log("Invoice Data:", jbuyer); // Log invoice data
                navigate("/invoice", { state: { buyer: jbuyer } });
                // Navegar a la ruta de facturas
              } else if (type === "91") {
                console.log("Credit Note Data:", jbuyer); // Log credit note data
                navigate("/creditN", { state: { buyer: jbuyer } });
                // Navegar a la ruta de notas de crédito
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default BillingForm;