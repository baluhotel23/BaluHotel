import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { fetchOrdersByIdOrder, sendInvoice } from "../../Redux/Actions/actions";
import numeroALetrasConDecimales from '../Taxxa/options/numeroALetras';
import paymentMethods from "./options/paymentMethods";
import OrdenesPendientes from "./OrdenesPendientes";

const Invoice = () => {
  const sellerId = '901832769';
  const location = useLocation();
  const buyer = location.state?.buyer || {};
  const dispatch = useDispatch();
  const order = useSelector((state) => state.orderById.order);
  const orderLoading = useSelector((state) => state.orderById.loading);
  const orderError = useSelector((state) => state.orderById.error);
  const sellerData = useSelector((state) => state.sellerData.data);

  const [orderId, setOrderId] = useState("");
  const { loading: invoiceLoading, success, error: invoiceError } = useSelector((state) => state.invoice);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [jDocumentData, setJDocumentData] = useState({ // Cambia invoiceData a jDocumentData
    wVersionUBL: "2.1",
    wenvironment: "test",
    wdocumenttype: "Invoice",
    wdocumenttypecode: "01",
    scustomizationid: "10",
    wcurrency: "COP",
    sdocumentprefix: "FVB",
    sdocumentsuffix: null,
    tissuedate: new Date().toISOString(),
    tduedate: new Date().toISOString().split("T")[0],
    wpaymentmeans: 1,
    wpaymentmethod: "10",
    nlineextensionamount: 0,
    ntaxexclusiveamount: 0,
    ntaxinclusiveamount: 0,
    npayableamount: 0,
    sorderreference: "",
    snotes: "",
    snotetop: "",
    jextrainfo: {
      ntotalinvoicepayment: 0,
      stotalinvoicewords: "",
      iitemscount: "0"
    },
    jdocumentitems: [],
    jbuyer: buyer,
  });

  useEffect(() => {
    if (order && order.amount) {
      const totalAmount = Number(order.amount);
      const amountWithoutTax = Number((totalAmount / 1.19).toFixed(2));
      //const taxAmount = Number((totalAmount - amountWithoutTax).toFixed(2));

      const productsData = order.products.map(product => {
        const priceWithoutTax = parseFloat((product.priceSell / 1.19).toFixed(2));
        const taxAmount = parseFloat((product.priceSell - priceWithoutTax).toFixed(2));

        return {
          jextrainfo: {
            sbarcode: product.codigoBarra,
          },
          sdescription: product.description,
          wunitcode: "und",
          sstandarditemidentification: product.codigoBarra,
          sstandardidentificationcode: "999",
          nunitprice: priceWithoutTax,
          nusertotal: parseFloat((priceWithoutTax * order.quantity).toFixed(2)),
          nquantity: parseFloat(order.quantity.toFixed(2)),
          jtax: {
            jiva: {
              nrate: 19,
              sname: "IVA",
              namount: parseFloat((taxAmount * order.quantity).toFixed(2)),
              nbaseamount: parseFloat((priceWithoutTax * order.quantity).toFixed(2)),
            },
          },
        };
      });

      setJDocumentData(prevJDocumentData => ({ // Cambia setInvoiceData a setJDocumentData
        ...prevJDocumentData,
        nlineextensionamount: parseFloat(amountWithoutTax.toFixed(2)),
        ntaxexclusiveamount: parseFloat(amountWithoutTax.toFixed(2)),
        ntaxinclusiveamount: parseFloat(totalAmount.toFixed(2)),
        npayableamount: parseFloat(totalAmount.toFixed(2)),
        jextrainfo: {
          ntotalinvoicepayment: parseFloat(totalAmount.toFixed(2)),
          stotalinvoicewords: numeroALetrasConDecimales(totalAmount),
          iitemscount: order.products.length.toString(),
        },
        jdocumentitems: productsData,
      }));
    }
  }, [order, buyer]);

  const handleChange = (e, path) => {
    const keys = path.split(".");
    const value = e.target.value;
    setJDocumentData((prevState) => { // Cambia setInvoiceData a setJDocumentData
      let obj = { ...prevState };
      let ref = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        ref = ref[keys[i]];
      }
      ref[keys[keys.length - 1]] = value;
      return obj;
    });
  };

  const handleFetchOrder = async () => {
    if (!orderId) return;
    try {
      await dispatch(fetchOrdersByIdOrder(orderId));
    } catch (err) {
      console.error("Error fetching order:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage("");
    try {
      if (order && order.id_orderDetail && sellerData) {
        // Agregar el id_orderDetail al objeto jDocumentData
        const jDocumentDataWithOrderId = {
          ...jDocumentData,
          sorderreference: order.id_orderDetail,
          jseller: {
            wlegalorganizationtype: sellerData.wlegalorganizationtype,
            sfiscalresponsibilities: sellerData.sfiscalresponsibilities,
            sdocno: sellerData.sdocno,
            sdoctype: sellerData.sdoctype,
            ssellername: sellerData.ssellername,
            ssellerbrand: sellerData.ssellerbrand,
            scontactperson: sellerData.scontactperson,
            saddresszip: sellerData.saddresszip,
            wdepartmentcode: sellerData.wdepartmentcode,
            wtowncode: sellerData.wtowncode,
            scityname: sellerData.scityname,
            jcontact: {
              selectronicmail: sellerData.jcontact.selectronicmail,
              jregistrationaddress: {
                wdepartmentcode: sellerData.jcontact.jregistrationaddress.wdepartmentcode,
                scityname: sellerData.jcontact.jregistrationaddress.scityname,
                saddressline1: sellerData.jcontact.jregistrationaddress.saddressline1,
                scountrycode: sellerData.jcontact.jregistrationaddress.scountrycode,
                wprovincecode: sellerData.jcontact.jregistrationaddress.wprovincecode,
                szip: sellerData.jcontact.jregistrationaddress.szip,
                sdepartmentname: sellerData.jcontact.jregistrationaddress.sdepartmentname,
              }
            }
          }
        };
  
        console.log('jDocumentDataWithOrderId:', jDocumentDataWithOrderId); // Imprimir el objeto jDocumentDataWithOrderId
  
        const invoiceDataToSend = {
          invoiceData: jDocumentDataWithOrderId, // Enviar el objeto jDocument con el id_orderDetail
          sellerId: sellerId,
        };
        console.log("invoiceDataToSend:", invoiceDataToSend);
        await dispatch(sendInvoice(invoiceDataToSend, { // Agregar el header Content-Type
          headers: {
            'Content-Type': 'application/json'
          }
        }));
        console.log("Factura enviada con éxito");
      } else {
        setErrorMessage("No se encontró la orden o el ID de la orden es inválido.");
      }
    } catch (err) {
      console.error("Error al enviar la factura:", err);
      setErrorMessage("Error al enviar la factura: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="p-4 pt-16">
      <OrdenesPendientes />
      <div className="mb-4">
        <label className="block mb-2">Buscar Orden por ID:</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="border p-2 w-full"
          />
          <button
            onClick={handleFetchOrder}
            className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
          >
            Buscar
          </button>
        </div>
        {orderLoading && <p>Cargando...</p>}
        {orderError && <p className="text-red-500">{orderError}</p>}
      </div>
      <form
        onSubmit={handleSubmit}
        className="p-4 bg-gray-100 rounded-md shadow-md mt-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          <div>
            <label className="block mb-2">Prefijo del documento:</label>
            <input
              type="text"
              value={jDocumentData.sdocumentprefix} // Cambia invoiceData a jDocumentData
              onChange={(e) => handleChange(e, "sdocumentprefix")} // Cambia jDocument.sdocumentprefix a sdocumentprefix
              className="border p-2 w-full"
              placeholder="Colocar el prefijo activo en DIAN, mínimo 1 carácter, máximo 4"
            />
          </div>

          <div>
            <label className="block mb-2">Fecha de emisión:</label>
            <input
              type="date"
              value={jDocumentData.tissuedate} // Cambia invoiceData a jDocumentData
              onChange={(e) => handleChange(e, "tissuedate")} // Cambia jDocument.tissuedate a tissuedate
              className="border p-2 w-full"
            />
          </div>
          <div>
            <label className="block mb-2">Fecha de vencimiento:</label>
            <input
              type="date"
              value={jDocumentData.tduedate} // Cambia invoiceData a jDocumentData
              onChange={(e) => handleChange(e, "tduedate")} // Cambia jDocument.tduedate a tduedate
              className="border p-2 w-full"
            />
          </div>
          <div>
            <label className="block mb-2">Método de pago:</label>
            <select
              value={jDocumentData.wpaymentmeans} // Cambia invoiceData a jDocumentData
              onChange={(e) => handleChange(e, "wpaymentmeans")} // Cambia jDocument.wpaymentmeans a wpaymentmeans
              className="border p-2 w-full"
            >
              <option value={1}>Contado</option>
              <option value={2}>Crédito</option>
            </select>
          </div>
          <div>
            <label className="block mb-2">Método de pago:</label>
            <select
              value={jDocumentData.wpaymentmethod} // Cambia invoiceData a jDocumentData
              onChange={(e) => handleChange(e, "wpaymentmethod")} // Cambia jDocument.wpaymentmethod a wpaymentmethod
              className="border p-2 w-full"
            >
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block mb-2">Monto de la Orden:</label>
            <input
              type="text"
              value={jDocumentData.nlineextensionamount} // Cambia invoiceData a jDocumentData
              onChange={(e) =>
                handleChange(e, "nlineextensionamount") // Cambia jDocument.nlineextensionamount a nlineextensionamount
              }
              className="border p-2 w-full"
            />
          </div>
          <div>
            <label className="block mb-2">
              Total Valor Bruto antes de tributos:
            </label>
            <input
              type="text"
              value={jDocumentData.ntaxexclusiveamount} // Cambia invoiceData a jDocumentData
              onChange={(e) => handleChange(e, "ntaxexclusiveamount")} // Cambia jDocument.ntaxexclusiveamount a ntaxexclusiveamount
              className="border p-2 w-full"
            />
          </div>
          <div>
            <label className="block mb-2">
              Total Valor Bruto antes de tributos:
            </label>
            <input
              type="text"
              value={jDocumentData.ntaxinclusiveamount} // Cambia invoiceData a jDocumentData
              onChange={(e) => handleChange(e, "ntaxinclusiveamount")} // Cambia jDocument.ntaxinclusiveamount a ntaxinclusiveamount
              className="border p-2 w-full"
            />
          </div>
          <div>
            <label className="block mb-2">
              Monto Total:
            </label>
            <input
              type="text"
              value={jDocumentData.npayableamount} // Cambia invoiceData a jDocumentData
              onChange={(e) => handleChange(e, "npayableamount")} // Cambia jDocument.npayableamount a npayableamount
              className="border p-2 w-full"
            />
          </div>
          <div>
            <label className="block mb-2">
              Monto en Letras:
            </label>
            <input
              type="text"
              value={jDocumentData.jextrainfo.stotalinvoicewords} // Cambia invoiceData a jDocumentData
              onChange={(e) => handleChange(e, "jextrainfo.stotalinvoicewords")} // Cambia jDocument.jextrainfo.stotalinvoicewords a jextrainfo.stotalinvoicewords
              className="border p-2 w-full"
            />
          </div>
          <div>
            <label className="block mb-2">
              Items:
            </label>
            <input
              type="text"
              value={jDocumentData.jextrainfo.iitemscount} // Cambia invoiceData a jDocumentData
              onChange={(e) => handleChange(e, "jextrainfo.iitemscount")} // Cambia jDocument.jextrainfo.iitemscount a jextrainfo.iitemscount
              className="border p-2 w-full"
            />
          </div>
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 mt-4 rounded hover:bg-blue-600"
          disabled={isLoading}
        >
          {isLoading ? "Enviando factura..." : "Enviar factura"}
        </button>
      </form>
      {errorMessage && <p className="text-red-500 mt-2">{errorMessage}</p>}
      {success && <p className="text-green-500 mt-2">Factura enviada con éxito!</p>}
    </div>
  );
};

export default Invoice;