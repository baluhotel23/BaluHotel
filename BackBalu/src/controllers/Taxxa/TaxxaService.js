const { SellerData, User, Buyer, Booking, Bill, Invoice } = require('../../data');
const { generateToken, sendDocument } = require('./taxxaUtils');
const { createInvoiceWithNumber, cancelInvoice } = require('./invoiceNumberController');

const createInvoice = async (req, res) => {
  let createdInvoice = null;
  
  try {
    console.log('=== Iniciando proceso de facturación fiscal ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const { idBill } = req.body;

    if (!idBill) {
      return res.status(400).json({
        message: 'El ID de la factura (Bill) es obligatorio',
        success: false,
      });
    }

    // 🔧 BUSCAR LA FACTURA INTERNA (BILL)
    const bill = await Bill.findOne({
      where: { idBill },
      include: [
        {
          model: Booking,
          as: 'booking',
          include: [
            {
              model: Buyer,
              as: 'guest',
            },
          ],
        },
      ],
    });

    if (!bill) {
      return res.status(404).json({
        message: 'Factura interna no encontrada',
        success: false,
      });
    }

    // 🔧 VERIFICAR SI YA EXISTE UNA FACTURA FISCAL PARA ESTA BILL
    const existingInvoice = await Invoice.findOne({
      where: { 
        billId: bill.idBill,
        status: 'sent'
      }
    });

    if (existingInvoice) {
      console.log('✅ Ya existe una factura fiscal enviada para esta Bill');
      return res.status(200).json({
        message: 'Ya existe una factura fiscal enviada para esta reserva',
        success: true,
        data: {
          invoiceId: existingInvoice.id,
          invoiceNumber: existingInvoice.getFullInvoiceNumber(),
          cufe: existingInvoice.cufe,
          sentAt: existingInvoice.sentToTaxxaAt
        }
      });
    }

    const booking = bill.booking;
    const buyer = booking?.guest;

    if (!booking || !buyer) {
      return res.status(400).json({
        message: 'Datos incompletos de reserva o huésped',
        success: false,
      });
    }

    // Validar que la factura interna esté pagada
    if (bill.status !== 'paid') {
  return res.status(400).json({
    message: 'La factura debe estar pagada',
    success: false
  });
}

if (bill.taxxaStatus === 'sent' && bill.taxInvoiceId) {
  return res.status(200).json({
    message: 'Factura ya enviada exitosamente',
    success: true,
    data: { taxInvoiceId: bill.taxInvoiceId }
  });
}



    // 🔧 OBTENER DATOS DEL VENDEDOR
    const sellerData = await SellerData.findOne({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });

    if (!sellerData) {
      return res.status(404).json({
        message: 'Datos del vendedor no encontrados',
        success: false,
      });
    }

    // 🔧 CREAR FACTURA FISCAL CON NUMERACIÓN SECUENCIAL
    try {
      createdInvoice = await createInvoiceWithNumber({
        billId: bill.idBill,
        buyerId: buyer.sdocno,
        buyerName: buyer.scostumername,
        buyerEmail: buyer.selectronicmail,
        sellerId: sellerData.sdocno,
        sellerName: sellerData.scostumername,
        totalAmount: bill.totalAmount,
        taxAmount: bill.taxAmount || 0,
        netAmount: parseFloat(bill.totalAmount) - parseFloat(bill.taxAmount || 0),
        orderReference: `BOOKING-${booking.bookingId}-${bill.idBill.slice(-8)}`
      });

      console.log(`✅ Factura fiscal creada: ${createdInvoice.getFullInvoiceNumber()}`);
    } catch (invoiceError) {
      console.error('❌ Error creando factura fiscal:', invoiceError.message);
      return res.status(500).json({
        message: 'Error en la numeración de facturas fiscales',
        success: false,
        error: invoiceError.message
      });
    }

    // 🔧 CONSTRUIR DOCUMENTO PARA TAXXA
console.log('=== Construyendo documento para Taxxa (estructura corregida) ===');

// 🔧 CALCULAR TOTALES PRIMERO
const baseAmount = parseFloat(bill.reservationAmount);
const extraAmount = parseFloat(bill.extraChargesAmount) || 0;
const totalBase = baseAmount + extraAmount;
const taxAmount = parseFloat(bill.taxAmount) || 0;
const totalWithTax = totalBase + taxAmount;

// 🔧 MAPEAR TIPOS DE DOCUMENTO
const mapDocTypeToText = (code) => {
  const mapping = {
    11: "RC", 12: "TI", 13: "CC", 21: "CE", 22: "CD", 
    31: "NIT", 41: "PA", 42: "PEP", 50: "NIT", 91: "NUIP"
  };
  return mapping[code] || "CC";
};

const documentBody = {
  sMethod: 'classTaxxa.fjDocumentAdd',
  jParams: {
    // 🔧 ESTRUCTURA EXACTA DEL EJEMPLO
    wVersionUBL: 2.1, // ✅ Número, no string
    wenvironment: "prod",
    jDocument: {
      // 🔧 CAMPOS PRINCIPALES
      wdocumenttype: "Invoice", // ✅ Igual al ejemplo
      wdocumenttypecode: "01", // ✅ Igual al ejemplo
      scustomizationid: "10", // ✅ Igual al ejemplo
      wcurrency: "COP", // ✅ wcurrency no scurrency
      
      // 🔧 NUMERACIÓN
      sdocumentprefix: createdInvoice.prefix,
      sdocumentsuffix: createdInvoice.invoiceSequentialNumber,
      
      // 🔧 FECHAS (formato exacto del ejemplo)
      tissuedate: new Date().toISOString().replace('T', ' ').split('.')[0], // "2025-02-12 19:13:42"
      tduedate: new Date().toISOString().split('T')[0], // "2025-02-12"
      
      // 🔧 INFORMACIÓN DE PAGO (igual al ejemplo)
      wpaymentmeans: 1,
      wpaymentmethod: "10",
      
      // 🔧 TOTALES (nombres exactos del ejemplo)
      nlineextensionamount: totalBase,
      ntaxexclusiveamount: totalBase,
      ntaxinclusiveamount: totalWithTax,
      npayableamount: totalWithTax,
      
      // 🔧 REFERENCIAS
      sorderreference: createdInvoice.orderReference,
      tdatereference: new Date().toISOString().split('T')[0],
      
      // 🔧 INFORMACIÓN EXTRA (igual al ejemplo)
      jextrainfo: {},
      
      // 🔧 ITEMS (estructura exacta del ejemplo)
      jdocumentitems: {
        "0": {
          jextrainfo: {
            sbarcode: "SERV001"
          },
          sdescription: `Servicios de hospedaje - Habitación ${booking.roomNumber}`,
          wunitcode: "und",
          sstandarditemidentification: "SERV001",
          sstandardidentificationcode: "999",
          nunitprice: baseAmount,
          nusertotal: baseAmount,
          nquantity: 1,
          jtax: {
            jiva: {
              nrate: 0, // Sin IVA para servicios de hospedaje
              sname: "IVA",
              namount: 0,
              nbaseamount: baseAmount
            }
          }
        }
      },
      
      // 🔧 VENDEDOR (estructura exacta del ejemplo)
      jseller: {
        wlegalorganizationtype: sellerData.wlegalorganizationtype === "person" ? "person" : "company",
        sfiscalresponsibilities: sellerData.sfiscalresponsibilities,
        sdocno: sellerData.sdocno,
        sdoctype: mapDocTypeToText(sellerData.sdoctype),
        ssellername: sellerData.scostumername,
        ssellerbrand: sellerData.scostumername, // Usar mismo nombre como marca
        scontactperson: sellerData.scontactperson?.trim(),
        saddresszip: sellerData.spostalcode || "00000",
        wdepartmentcode: sellerData.registration_wdepartmentcode || "11",
        wtowncode: sellerData.registration_wprovincecode || "11001",
        scityname: sellerData.registration_scityname || sellerData.scity,
        jcontact: {
          selectronicmail: sellerData.selectronicmail,
          jregistrationaddress: {
            wdepartmentcode: sellerData.registration_wdepartmentcode || "11",
            scityname: sellerData.registration_scityname || sellerData.scity,
            saddressline1: sellerData.registration_saddressline1 || sellerData.saddress,
            scountrycode: sellerData.registration_scountrycode || "CO",
            wprovincecode: sellerData.registration_wprovincecode || "11",
            szip: sellerData.registration_szip || sellerData.spostalcode || "00000",
            sdepartmentname: sellerData.registration_sdepartmentname || "Cundinamarca"
          }
        }
      },
      
      // 🔧 COMPRADOR (estructura exacta del ejemplo)
      jbuyer: {
        wlegalorganizationtype: buyer.wlegalorganizationtype || "person",
        scostumername: buyer.scostumername,
        stributaryidentificationkey: "O-1", // ✅ Usar "O-1" como en el ejemplo
        sfiscalresponsibilities: buyer.sfiscalresponsibilities || "R-99-PN",
        sfiscalregime: "48", // ✅ Usar "48" como en el ejemplo
        jpartylegalentity: {
          wdoctype: mapDocTypeToText(buyer.wdoctype),
          sdocno: buyer.sdocno,
          scorporateregistrationschemename: "Admin" // ✅ Usar "Admin" como en el ejemplo
        },
        jcontact: {
          scontactperson: buyer.scontactperson || buyer.scostumername,
          selectronicmail: buyer.selectronicmail,
          stelephone: buyer.stelephone?.replace(/^\+57/, '') || "3000000000" // Quitar +57
        }
      }
    }
  }
};

// 🔧 AGREGAR SERVICIOS ADICIONALES SI EXISTEN
if (extraAmount > 0) {
  documentBody.jParams.jDocument.jdocumentitems["1"] = {
    jextrainfo: {
      sbarcode: "SERV002"
    },
    sdescription: "Servicios adicionales",
    wunitcode: "und",
    sstandarditemidentification: "SERV002",
    sstandardidentificationcode: "999",
    nunitprice: extraAmount,
    nusertotal: extraAmount,
    nquantity: 1,
    jtax: {
      jiva: {
        nrate: 0,
        sname: "IVA",
        namount: 0,
        nbaseamount: extraAmount
      }
    }
  };
}

console.log('📄 Documento con estructura corregida:', JSON.stringify(documentBody, null, 2));
  
const token = await generateToken();
    if (!token) {
      await cancelInvoice(createdInvoice.id);
      throw new Error('No se pudo generar el token de autenticación');
    }

    console.log('=== Enviando documento a Taxxa ===');
    const taxxaPayload = {
      stoken: token,
      jApi: documentBody,
    };

    const taxxaResponse = await sendDocument(taxxaPayload);
    console.log('Respuesta de Taxxa:', JSON.stringify(taxxaResponse, null, 2));

if (taxxaResponse && taxxaResponse.rerror === 0) {
      console.log('=== Factura fiscal enviada exitosamente ===');
      
      // 🔧 MARCAR FACTURA FISCAL COMO ENVIADA
      await createdInvoice.markAsSent(taxxaResponse);
      
      // 🔧 ACTUALIZAR FACTURA INTERNA CON REFERENCIA
      await bill.update({
        taxxaStatus: 'sent',
        taxInvoiceId: createdInvoice.getFullInvoiceNumber(),
        cufe: taxxaResponse.scufe || taxxaResponse.cufe,
        taxxaResponse: taxxaResponse,
        sentToTaxxaAt: new Date()
      });

      return res.status(200).json({
        message: 'Factura fiscal enviada a Taxxa con éxito',
        success: true,
        data: {
          invoiceId: createdInvoice.id,
          invoiceNumber: createdInvoice.getFullInvoiceNumber(),
          billId: bill.idBill,
          cufe: createdInvoice.cufe,
          totalAmount: createdInvoice.totalAmount,
          sentAt: createdInvoice.sentToTaxxaAt
        }
      });
      
    } else {
      console.error('Error en respuesta de Taxxa:', taxxaResponse);
      
      // 🔧 MARCAR FACTURA FISCAL COMO FALLIDA
      await createdInvoice.markAsFailed(new Error(taxxaResponse?.smessage || 'Error desconocido'));
      
      throw new Error(`Error en la respuesta de Taxxa: ${taxxaResponse?.smessage || 'Respuesta inválida'}`);
    }

  } catch (error) {
    console.error('Error en el proceso de facturación fiscal:', error.message);
    
    // 🔧 CANCELAR FACTURA FISCAL SI SE CREÓ
    if (createdInvoice) {
      try {
        await cancelInvoice(createdInvoice.id);
      } catch (cancelError) {
        console.error('Error cancelando factura fiscal:', cancelError.message);
      }
    }
    
    return res.status(500).json({
      message: 'Error al procesar la factura fiscal',
      success: false,
      error: error.message,
    });
  }
};


module.exports = {
  createInvoice,
};