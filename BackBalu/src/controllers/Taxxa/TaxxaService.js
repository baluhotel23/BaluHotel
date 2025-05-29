const { SellerData, User, Buyer, Booking, Bill } = require('../../data'); // Asegúrate de incluir Bill

const createInvoice = async (req, res) => {
  try {
    console.log('=== Datos recibidos en el backend ===');
    console.log('Body:', JSON.stringify(req.body, null, 2)); // Log para verificar los datos recibidos

    const { idBill } = req.body;

    if (!idBill) {
      console.error('Error: El ID de la factura (Bill) es obligatorio');
      return res.status(400).json({
        message: 'El ID de la factura (Bill) es obligatorio',
        success: false,
      });
    }

    // Buscar la factura (Bill) y la reserva asociada
    const bill = await Bill.findOne({
      where: { idBill },
      include: [
        {
          model: Booking,
          include: [
            {
              model: Buyer,
              as: 'guest', // Usa el alias configurado en las relaciones
            },
          ],
        },
      ],
    });

    if (!bill) {
      console.error('Error: Factura no encontrada');
      return res.status(404).json({
        message: 'Factura no encontrada',
        success: false,
      });
    }

    console.log('Factura encontrada:', JSON.stringify(bill, null, 2));

    const booking = bill.Booking;
    if (!booking) {
      console.error('Error: Reserva asociada no encontrada');
      return res.status(404).json({
        message: 'Reserva asociada no encontrada',
        success: false,
      });
    }

    console.log('Reserva asociada encontrada:', JSON.stringify(booking, null, 2));

    const buyer = booking.guest; // Accede al Buyer usando el alias 'guest'
    if (!buyer) {
      console.error('Error: Buyer no asociado a la reserva');
      return res.status(404).json({
        message: 'Buyer no asociado a la reserva',
        success: false,
      });
    }

    console.log('Buyer asociado encontrado:', JSON.stringify(buyer, null, 2));

    // Validar que el estado de la factura sea "pending"
    if (bill.status !== 'pending') {
      console.error('Error: La factura ya fue procesada o está cancelada');
      return res.status(400).json({
        message: 'La factura ya fue procesada o está cancelada',
        success: false,
      });
    }

    console.log('=== Construyendo documento para Taxxa ===');

    // Obtener datos del vendedor
    const sellerData = await SellerData.findOne({ where: { sdocno: booking.sellerId } });
    if (!sellerData) {
      return res.status(404).json({
        message: 'Datos del vendedor no encontrados',
        success: false,
      });
    }

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
          nlineextensionamount: 0,
          ntaxexclusiveamount: 0,
          ntaxinclusiveamount: 0,
          npayableamount: 0,
          sorderreference: booking.bookingId,
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
              },
            },
          },
          jbuyer: {
            wlegalorganizationtype: buyer.wlegalorganizationtype,
            scostumername: buyer.scostumername,
            stributaryidentificationkey: buyer.stributaryidentificationkey,
            sfiscalresponsibilities: buyer.sfiscalresponsibilities,
            sfiscalregime: buyer.sfiscalregime,
            jpartylegalentity: {
              wdoctype: buyer.wdoctype,
              sdocno: buyer.sdocno,
              scorporateregistrationschemename: buyer.scorporateregistrationschemename,
            },
            jcontact: {
              scontactperson: buyer.scontactperson,
              selectronicmail: buyer.selectronicmail,
              stelephone: buyer.stelephone,
            },
          },
        },
      },
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
      jApi: documentBody,
    };
    console.log('Payload completo:', JSON.stringify(taxxaPayload, null, 2));

    const taxxaResponse = await sendDocument(taxxaPayload);
    console.log('Respuesta de Taxxa:', JSON.stringify(taxxaResponse, null, 2));

    if (taxxaResponse && taxxaResponse.rerror === 0) {
      // Actualizar el estado de la factura y crear un registro en Invoice
      await bill.update({ status: 'paid' });
      await Invoice.create({
        buyerId: buyer.sdocno,
        sellerId: sellerData.sdocno,
        invoiceNumber: taxxaResponse.invoiceNumber,
        status: 'sent',
        totalAmount: bill.totalAmount,
        taxxaResponse,
        cufe: taxxaResponse.cufe,
        qrCode: taxxaResponse.qrCode,
        orderReference: booking.bookingId,
      });

      return res.status(200).json({
        message: 'Factura creada y enviada con éxito',
        success: true,
        response: taxxaResponse,
      });
    }

    throw new Error(`Error en la respuesta de Taxxa: ${JSON.stringify(taxxaResponse)}`);
  } catch (error) {
    console.error('Error en el proceso de facturación:', error.message);
    return res.status(500).json({
      message: 'Error al procesar la factura',
      success: false,
      error: error.message,
    });
  }
};

module.exports = {
  createInvoice,
};