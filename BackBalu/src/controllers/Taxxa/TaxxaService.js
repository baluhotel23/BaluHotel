const { SellerData, User, Booking } = require('../../data');
const { generateToken, sendDocument } = require('./taxxaUtils');

const createInvoice = async (req, res) => {
  try {
    console.log('=== Iniciando proceso de facturación ===');
    console.log('Received payload:', JSON.stringify(req.body, null, 2));

    const { invoiceData, sellerId } = req.body;

    if (!invoiceData || !sellerId) {
      console.error('Datos de factura o vendedor faltantes');
      return res.status(400).json({
        message: 'Datos de factura o vendedor faltantes',
        success: false
      });
    }

    const bookingId = invoiceData.bookingId;
    console.log('Procesando reserva:', bookingId);

    // First, get the order details
    const Booking = await Booking.findOne({
      where: { bookingId }
    });

    // Validate order exists
    if (Booking) {
      console.error('Reserva no encontrada:', bookingId);
      return res.status(404).json({
        message: 'Reserva no encontrada',
        success: false,
        orderReference: bookingId
      });
    }

    // Check and log current order status
    console.log('Estado actual de la reserva:', Booking.status);

    // Validate order status
    if (Booking.status === 'confirmed') {
      console.log('=== Reserva previamente facturada ===');
      console.log('ID Reserva:', bookingId);
      console.log('Estado:', Booking.status);
      console.log('Fecha de facturación:', Booking.updatedAt);

      return res.status(400).json({
        message: 'La reserva ya está facturada',
        success: false,
        orderReference: bookingId,
        invoicedAt: Booking.updatedAt
      });
    }

    // Now get seller and user data in parallel
    console.log('=== Consultando datos adicionales ===');
    const [sellerData, userData] = await Promise.all([
      SellerData.findOne({ where: { sdocno: sellerId } }),
      User.findOne({ where: { n_document: Booking.n_document } })
    ]);

    // Validate and log seller data
    if (!sellerData) {
      console.error('Datos del vendedor no encontrados:', sellerId);
      return res.status(404).json({
        message: 'Datos del vendedor no encontrados',
        success: false,
        sellerId
      });
    }
    console.log('Datos del vendedor encontrados:', sellerData.ssellername);

    // Validate and log user data
    if (!userData) {
      console.error('Datos del comprador no encontrados:', Booking.n_document);
      return res.status(404).json({
        message: 'Datos del comprador no encontrados',
        success: false,
        buyerId: Booking.n_document
      });
    }
    console.log('Datos del comprador encontrados:', userData.first_name, userData.last_name);

    // Construir el objeto jdocumentitems como un array
    const documentItemsArray = Object.values(invoiceData.jdocumentitems);

    console.log('=== Construyendo documento para Taxxa ===');
    const documentBody = {
      sMethod: 'classTaxxa.fjDocumentAdd',
      jParams: {
        wVersionUBL: "2.1",
        wenvironment: "test",
        jDocument: {
          wdocumenttype: "Invoice",
          wdocumenttypecode: "01",
          scustomizationid: "10",
          wcurrency: "COP",
          sdocumentprefix: "FVB",
          sdocumentsuffix: null,
          tissuedate: new Date().toISOString().slice(0, 19),
          tduedate: new Date().toISOString().slice(0, 10),
          wpaymentmeans: 1,
          wpaymentmethod: "10",
          nlineextensionamount: 21008.4,
          ntaxexclusiveamount: 21008.4,
          ntaxinclusiveamount: 25000,
          npayableamount: 25000,
          sorderreference: bookingId,
          tdatereference: new Date().toISOString().slice(0, 10),
          jextrainfo: {},
          jdocumentitems: documentItemsArray,
          jseller: {
            wlegalorganizationtype: 'company',
            sfiscalresponsibilities: sellerData.sfiscalresponsibilities,
            sdocno: sellerData.sdocno,
            sdoctype: sellerData.sdoctype,
            ssellername: sellerData.ssellername,
            ssellerbrand: sellerData.ssellerbrand,
            scontactperson: sellerData.scontactperson,
            saddresszip: sellerData.saddresszip,
            wdepartmentcode: sellerData.wdepartmentcode,
            wtowncode: '501021',
            scityname: sellerData.scityname,
            jcontact: {
              selectronicmail: sellerData.contact_selectronicmail,
              jregistrationaddress: {
                wdepartmentcode: sellerData.registration_wdepartmentcode,
                scityname: sellerData.registration_scityname,
                saddressline1: sellerData.registration_saddressline1,
                scountrycode: sellerData.registration_scountrycode,
                wprovincecode: sellerData.registration_wprovincecode,
                szip: sellerData.registration_szip,
                sdepartmentname: sellerData.registration_sdepartmentname,
              }
            }
          },
          jbuyer: {
            wlegalorganizationtype: "person",
            scostumername: userData.first_name + ' ' + userData.last_name,
            stributaryidentificationkey: "O-1",
            sfiscalresponsibilities: "R-99-PN",
            sfiscalregime: "48",
            jpartylegalentity: {
              wdoctype: userData.wdoctype,
              sdocno: userData.n_document,
              scorporateregistrationschemename: userData.first_name + ' ' + userData.last_name
            },
            jcontact: {
              scontactperson: userData.first_name + ' ' + userData.last_name,
              selectronicmail: userData.email,
              stelephone: userData.phone
            }
          }
        }
      }
    };

    console.log('=== Generando token para Taxxa ===');
    const token = await generateToken();
    if (!token) {
      throw new Error('No se pudo generar el token de autenticación');
    }
    console.log('Token generado exitosamente');

    console.log('=== Enviando documento a Taxxa ===');
    const taxxaPayload = {
      stoken: token,
      jApi: documentBody
    };
    console.log('Payload completo:', JSON.stringify(taxxaPayload, null, 2));

    const taxxaResponse = await sendDocument(taxxaPayload);
    console.log('Respuesta de Taxxa:', JSON.stringify(taxxaResponse, null, 2));

    if (taxxaResponse && taxxaResponse.rerror === 0) {
      console.log('=== Actualizando estado de la reserva ===');
      await Booking.update({ status: 'facturada' });

      return res.status(200).json({
        message: 'Factura creada y enviada con éxito',
        success: true,
        response: taxxaResponse,
        orderReference: bookingId
      });
    }

    throw new Error(`Error en la respuesta de Taxxa: ${JSON.stringify(taxxaResponse)}`);

  } catch (error) {
    console.error('=== Error en el proceso de facturación ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);

    if (error.response) {
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      console.error('Response status:', error.response.status);
    }

    return res.status(500).json({
      message: 'Error al procesar la factura',
      success: false,
      error: error.message,
      details: error.response?.data
    });
  }
};

module.exports = {
  createInvoice
};