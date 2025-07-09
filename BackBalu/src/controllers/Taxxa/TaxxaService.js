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

    // 🔧 CONSTRUIR DOCUMENTO PARA TAXXA - ESTRUCTURA CORREGIDA SEGÚN TU PROYECTO QUE FUNCIONA
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

    // 🆕 FUNCIÓN PARA CONVERTIR NÚMERO A PALABRAS
    const numberToWords = (num) => {
      const numbers = {
        140000: "ciento cuarenta mil",
        160000: "ciento sesenta mil",
        100000: "cien mil",
        120000: "ciento veinte mil",
        150000: "ciento cincuenta mil",
        180000: "ciento ochenta mil",
        200000: "doscientos mil"
      };
      
      if (numbers[num]) return numbers[num];
      return `${num.toLocaleString()} pesos`;
    };

    const currentDate = new Date().toISOString().split('T')[0]; // "2025-06-22"

    // 🆕 ESTRUCTURA CORREGIDA SEGÚN TU PROYECTO QUE FUNCIONA
    const documentBody = {
      sMethod: 'classTaxxa.fjDocumentAdd',
      jParams: {
        wVersionUBL: "2.1", // ⭐ Como string, igual que tu proyecto
        wenvironment: "prod",
        jDocument: {
          // ⭐ CAMPOS DIRECTOS EN jDocument (IGUAL QUE TU PROYECTO QUE FUNCIONA)
          wversionubl: "2.1",
          wenvironment: "prod",
          wdocumenttype: "Invoice",
          wdocumenttypecode: "01",
          scustomizationid: "10",
          wcurrency: "COP",
          
          // 🔧 NUMERACIÓN
          sdocumentprefix: createdInvoice.prefix,
          sdocumentsuffix: parseInt(createdInvoice.invoiceSequentialNumber),
          
          // 🔧 FECHAS
          tissuedate: currentDate,
          tduedate: currentDate,
          
          // 🔧 INFORMACIÓN DE PAGO
          wpaymentmeans: 1,
          wpaymentmethod: "10",
          
          // 🔧 TOTALES
          nlineextensionamount: totalBase,
          ntaxexclusiveamount: totalBase,
          ntaxinclusiveamount: totalWithTax,
          npayableamount: totalWithTax,
          
          // 🔧 REFERENCIAS
          sorderreference: createdInvoice.orderReference,
          snotes: "",
          snotetop: "",
          
          // 🆕 INFORMACIÓN EXTRA
          jextrainfo: {
            ntotalinvoicepayment: totalWithTax,
            stotalinvoicewords: numberToWords(totalWithTax),
            iitemscount: extraAmount > 0 ? "2" : "1"
          },
          
          // 🔧 ITEMS
          jdocumentitems: {
            "0": {
              jextrainfo: {
                sbarcode: `SERV001-${booking.roomNumber}`
              },
              sdescription: `Servicios de hospedaje - Habitación ${booking.roomNumber}`,
              wunitcode: "und",
              sstandarditemidentification: `SERV001-${booking.roomNumber}`,
              sstandardidentificationcode: "999",
              nunitprice: totalBase, // 🔴 USAR totalBase COMO EN EL EJEMPLO
              nusertotal: totalBase,
              nquantity: 1,
              jtax: {
                jiva: {
                  nrate: taxAmount > 0 ? 19 : 0,
                  sname: "IVA",
                  namount: taxAmount,
                  nbaseamount: totalBase
                }
              }
            }
          },
          
          // 🔧 COMPRADOR - ESTRUCTURA IGUAL QUE EL EJEMPLO QUE FUNCIONA
          jbuyer: {
            wlegalorganizationtype: buyer.wlegalorganizationtype || "person",
            scostumername: buyer.scostumername,
            stributaryidentificationkey: "O-1",
            stributaryidentificationname: "IVA", // ⭐ CAMPO PRESENTE EN EL EJEMPLO
            sfiscalresponsibilities: buyer.sfiscalresponsibilities || "R-99-PN",
            sfiscalregime: "48",
            jpartylegalentity: {
              wdoctype: mapDocTypeToText(buyer.wdoctype),
              sdocno: buyer.sdocno,
              scorporateregistrationschemename: buyer.scostumername // ⭐ USAR NOMBRE DEL COMPRADOR
            },
            jcontact: {
              scontactperson: buyer.scontactperson || buyer.scostumername,
              selectronicmail: buyer.selectronicmail,
              stelephone: buyer.stelephone?.replace(/^\+57/, '') || "3000000000",
              // 🆕 DIRECCIÓN DEL COMPRADOR SI EXISTE
              ...(buyer.jregistrationaddress && {
                jregistrationaddress: {
                  scountrycode: buyer.jregistrationaddress.scountrycode || "CO",
                  wdepartmentcode: buyer.jregistrationaddress.wdepartmentcode || "11",
                  wtowncode: buyer.jregistrationaddress.wtowncode || "11001",
                  scityname: buyer.jregistrationaddress.scityname || "Bogotá",
                  saddressline1: buyer.jregistrationaddress.saddressline1 || "Dirección no especificada",
                  szip: buyer.jregistrationaddress.szip || "00000"
                }
              })
            }
          },
          
          // 🔧 VENDEDOR - ESTRUCTURA IGUAL QUE TU PROYECTO QUE FUNCIONA
          jseller: {
            wlegalorganizationtype: sellerData.wlegalorganizationtype === "person" ? "person" : "company",
            sfiscalresponsibilities: sellerData.sfiscalresponsibilities,
            sdocno: sellerData.sdocno,
            sdoctype: mapDocTypeToText(sellerData.sdoctype),
            ssellername: sellerData.scostumername,
            ssellerbrand: sellerData.ssellerbrand || sellerData.scostumername,
            scontactperson: sellerData.scontactperson?.trim(),
            saddresszip: sellerData.spostalcode || "00000",
            wdepartmentcode: sellerData.registration_wdepartmentcode || "11",
            wtowncode: sellerData.registration_wprovincecode || "11001",
            scityname: sellerData.registration_scityname || sellerData.scity,
            jcontact: {
              selectronicmail: sellerData.selectronicmail,
              jregistrationaddress: {
                wdepartmentcode: sellerData.registration_wdepartmentcode || "11",
                sdepartmentname: sellerData.registration_sdepartmentname || "Cundinamarca",
                scityname: sellerData.registration_scityname || sellerData.scity,
                saddressline1: sellerData.registration_saddressline1 || sellerData.saddress,
                scountrycode: sellerData.registration_scountrycode || "CO",
                wprovincecode: sellerData.registration_wprovincecode || "11",
                szip: sellerData.registration_szip || sellerData.spostalcode || "00000"
              }
            }
          }
        }
      }
    };

    // 🔧 AGREGAR SERVICIOS ADICIONALES SI EXISTEN
    if (extraAmount > 0) {
      documentBody.jParams.jDocument.jdocumentitems["1"] = {
        jextrainfo: {
          sbarcode: "SERV002-EXTRA"
        },
        sdescription: "Servicios adicionales y consumos",
        wunitcode: "und",
        sstandarditemidentification: "SERV002-EXTRA",
        sstandardidentificationcode: "999",
        nunitprice: extraAmount,
        nusertotal: extraAmount,
        nquantity: 1,
        jtax: {
          jiva: {
            nrate: 19, // IVA para extras
            sname: "IVA",
            namount: extraAmount * 0.19,
            nbaseamount: extraAmount
          }
        }
      };
      
      // Actualizar contador de items
      documentBody.jParams.jDocument.jextrainfo.iitemscount = "2";
    }

    console.log('📄 Documento con estructura corregida:', JSON.stringify(documentBody, null, 2));

    // 🔧 GENERAR TOKEN
    console.log('=== Generando token para Taxxa ===');
    const token = await generateToken();
    if (!token) {
      await cancelInvoice(createdInvoice.id);
      throw new Error('No se pudo generar el token de autenticación');
    }

    // 🔧 PREPARAR PAYLOAD FINAL - IGUAL QUE TU PROYECTO QUE FUNCIONA
    const taxxaPayload = {
      stoken: token,
      jApi: documentBody // ⭐ ESTRUCTURA IGUAL QUE TU PROYECTO
    };

    console.log('=== Enviando documento a Taxxa ===');
    console.log('Payload a enviar:', JSON.stringify(taxxaPayload, null, 2));

    // 🔧 ENVIAR DOCUMENTO
    const taxxaResponse = await sendDocument(taxxaPayload);
    console.log('Respuesta de Taxxa:', JSON.stringify(taxxaResponse, null, 2));

    // 🔧 PROCESAR RESPUESTA - IGUAL QUE TU PROYECTO QUE FUNCIONA
    if (taxxaResponse && taxxaResponse.rerror === 0) {
      console.log('=== Factura fiscal enviada exitosamente ===');
      
      // 🔧 MARCAR FACTURA FISCAL COMO ENVIADA
      await createdInvoice.markAsSent(taxxaResponse);
      
      // 🔧 ACTUALIZAR FACTURA INTERNA CON REFERENCIA
      await bill.update({
        taxxaStatus: 'sent',
        taxInvoiceId: createdInvoice.getFullInvoiceNumber(),
        cufe: taxxaResponse.jApiResponse?.cufe || taxxaResponse.scufe || taxxaResponse.cufe,
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
          cufe: taxxaResponse.jApiResponse?.cufe || taxxaResponse.scufe,
          totalAmount: createdInvoice.totalAmount,
          sentAt: createdInvoice.sentToTaxxaAt,
          taxxaResponse: taxxaResponse
        }
      });
      
    } else {
      console.error('Error en respuesta de Taxxa:', taxxaResponse);
      
      // 🔧 MARCAR FACTURA FISCAL COMO FALLIDA
      await createdInvoice.markAsFailed(new Error(taxxaResponse?.smessage || 'Error desconocido'));
      
      throw new Error(`Error en la respuesta de Taxxa: ${taxxaResponse?.smessage || JSON.stringify(taxxaResponse)}`);
    }

  } catch (error) {
    console.error('=== Error en el proceso de facturación fiscal ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
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



// 🆕 FUNCIÓN PARA CREAR NOTA DE CRÉDITO
const createCreditNote = async (req, res) => {
  let createdCreditNote = null;
  
  try {
    console.log('=== Iniciando proceso de nota de crédito ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const { 
      originalInvoiceId, // ID de la factura original a referenciar
      creditReason,      // Motivo de la nota de crédito (1-6)
      amount,           // Monto de la nota de crédito
      description,      // Descripción del motivo
      isPartial = false // Si es parcial o total
    } = req.body;

    // ⭐ VALIDACIONES REQUERIDAS
    if (!originalInvoiceId) {
      return res.status(400).json({
        message: 'El ID de la factura original es obligatorio',
        success: false,
      });
    }

    if (!creditReason || !['1', '2', '3', '4', '5', '6'].includes(creditReason.toString())) {
      return res.status(400).json({
        message: 'El motivo de la nota de crédito es obligatorio y debe ser válido (1-6)',
        success: false,
        validReasons: {
          '1': 'Devolución parcial de los bienes y/o no aceptación parcial del servicio',
          '2': 'Anulación de factura electrónica',
          '3': 'Rebaja o descuento parcial o total',
          '4': 'Ajuste de precio',
          '5': 'Descuento comercial por pronto pago',
          '6': 'Descuento comercial por volumen de ventas'
        }
      });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({
        message: 'El monto de la nota de crédito debe ser mayor a 0',
        success: false,
      });
    }

    // 🔧 BUSCAR LA FACTURA FISCAL ORIGINAL
    const originalInvoice = await Invoice.findOne({
      where: { 
        id: originalInvoiceId,
        status: 'sent' // Solo facturas enviadas pueden tener notas de crédito
      },
      include: [
        {
          model: Bill,
          as: 'bill',
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
        },
      ],
    });

    if (!originalInvoice) {
      return res.status(404).json({
        message: 'Factura fiscal original no encontrada o no está enviada',
        success: false,
      });
    }

    const bill = originalInvoice.bill;
    const booking = bill?.booking;
    const buyer = booking?.guest;

    if (!booking || !buyer) {
      return res.status(400).json({
        message: 'Datos incompletos de la factura original',
        success: false,
      });
    }

    // 🔧 VERIFICAR SI YA EXISTE UNA NOTA DE CRÉDITO PARA ESTA FACTURA
    const existingCreditNote = await Invoice.findOne({
      where: { 
        billId: bill.idBill,
        documentType: 'CreditNote',
        status: 'sent'
      }
    });

    if (existingCreditNote) {
      console.log('⚠️ Ya existe una nota de crédito para esta factura');
      return res.status(400).json({
        message: 'Ya existe una nota de crédito enviada para esta factura',
        success: false,
        data: {
          creditNoteId: existingCreditNote.id,
          creditNoteNumber: existingCreditNote.getFullInvoiceNumber()
        }
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

    // 🔧 CREAR NOTA DE CRÉDITO CON NUMERACIÓN SECUENCIAL
    try {
      createdCreditNote = await createInvoiceWithNumber({
        billId: bill.idBill,
        buyerId: buyer.sdocno,
        buyerName: buyer.scostumername,
        buyerEmail: buyer.selectronicmail,
        sellerId: sellerData.sdocno,
        sellerName: sellerData.scostumername,
        totalAmount: amount,
        taxAmount: amount * 0.19, // IVA 19%
        netAmount: amount,
        orderReference: `CREDIT-${booking.bookingId}-${originalInvoice.invoiceSequentialNumber}`,
        documentType: 'CreditNote',
        prefix: 'NC' // Prefijo para notas de crédito
      });

      console.log(`✅ Nota de crédito creada: ${createdCreditNote.getFullInvoiceNumber()}`);
    } catch (creditNoteError) {
      console.error('❌ Error creando nota de crédito:', creditNoteError.message);
      return res.status(500).json({
        message: 'Error en la numeración de notas de crédito',
        success: false,
        error: creditNoteError.message
      });
    }

    // 🔧 CONSTRUIR DOCUMENTO PARA TAXXA - NOTA DE CRÉDITO
    console.log('=== Construyendo nota de crédito para Taxxa ===');

    // 🔧 CALCULAR TOTALES
    const creditAmount = parseFloat(amount);
    const taxAmount = creditAmount * 0.19; // IVA 19%
    const totalWithTax = creditAmount + taxAmount;

    // 🔧 MAPEAR TIPOS DE DOCUMENTO
    const mapDocTypeToText = (code) => {
      const mapping = {
        11: "RC", 12: "TI", 13: "CC", 21: "CE", 22: "CD", 
        31: "NIT", 41: "PA", 42: "PEP", 50: "NIT", 91: "NUIP"
      };
      return mapping[code] || "CC";
    };

    // 🆕 FUNCIÓN PARA CONVERTIR NÚMERO A PALABRAS
    const numberToWords = (num) => {
      const numbers = {
        140000: "ciento cuarenta mil",
        160000: "ciento sesenta mil",
        100000: "cien mil",
        120000: "ciento veinte mil",
        150000: "ciento cincuenta mil",
        180000: "ciento ochenta mil",
        200000: "doscientos mil"
      };
      
      if (numbers[num]) return numbers[num];
      return `${num.toLocaleString()} pesos`;
    };

    const currentDate = new Date().toISOString().split('T')[0];
    const currentDateTime = new Date().toISOString().replace('T', ' ').split('.')[0];
    
    // 🔧 FECHAS DEL PERÍODO (mes actual)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
    
    const periodStartDate = startOfMonth.toISOString().split('T')[0];
    const periodEndDate = endOfMonth.toISOString().split('T')[0];

    // 🔧 MAPEAR DESCRIPCIÓN DEL MOTIVO
    const creditReasonDescriptions = {
      '1': 'Devolución parcial de los bienes y/o no aceptación parcial del servicio',
      '2': 'Anulación de factura electrónica',
      '3': 'Rebaja o descuento parcial o total',
      '4': 'Ajuste de precio',
      '5': 'Descuento comercial por pronto pago',
      '6': 'Descuento comercial por volumen de ventas'
    };

    // 🆕 ESTRUCTURA DE NOTA DE CRÉDITO SEGÚN DOCUMENTACIÓN TAXXA
    const creditNoteBody = {
      sMethod: 'classTaxxa.fjDocumentAdd',
      jParams: {
        wVersionUBL: "2.1",
        wenvironment: process.env.NODE_ENV === 'production' ? "prod" : "test",
        jDocument: {
          // ⭐ CAMPOS ESPECÍFICOS PARA NOTA DE CRÉDITO
          wdocumenttype: "CreditNote",
          wdocumenttypecode: "91",
          woperationtype: "20", // Nota Crédito que referencia una factura electrónica
          sdocsubtype: creditReason.toString(),
          wcurrency: "COP",
          
          // 🔧 NUMERACIÓN DE NOTA DE CRÉDITO
          sdocumentprefix: createdCreditNote.prefix,
          sdocumentsuffix: parseInt(createdCreditNote.invoiceSequentialNumber),
          
          // 🔧 PERÍODO QUE AFECTA (REQUERIDO PARA NC)
          sinvoiceperiodstartdate: periodStartDate,
          sinvoiceperiodstarttime: "00:00:00",
          sinvoiceperiodenddate: periodEndDate,
          sinvoiceperiodendtime: "23:59:59",
          
          // 🔧 FECHAS
          tissuedate: currentDateTime,
          tduedate: currentDate,
          
          // 🔧 INFORMACIÓN DE PAGO
          wpaymentmeans: 1,
          wpaymentmethod: "10",
          
          // 🔧 TOTALES
          nlineextensionamount: creditAmount,
          ntaxexclusiveamount: creditAmount,
          ntaxinclusiveamount: totalWithTax,
          npayableamount: totalWithTax,
          
          // 🔧 REFERENCIAS A LA FACTURA ORIGINAL
          sorderreference: createdCreditNote.orderReference,
          tdatereference: originalInvoice.sentToTaxxaAt?.toISOString().split('T')[0] || currentDate,
          jbillingreference: {
            sbillingreferenceid: originalInvoice.getFullInvoiceNumber(),
            sbillingreferenceissuedate: originalInvoice.sentToTaxxaAt?.toISOString().split('T')[0] || currentDate,
            sbillingreferenceuuid: originalInvoice.cufe
          },
          
          // 🔧 NOTAS
          snotes: description || creditReasonDescriptions[creditReason],
          snotetop: "Nota de Crédito - " + creditReasonDescriptions[creditReason],
          
          // 🆕 INFORMACIÓN EXTRA
          jextrainfo: {
            ntotalinvoicepayment: totalWithTax,
            stotalinvoicewords: numberToWords(totalWithTax),
            iitemscount: "1"
          },
          
          // 🔧 ITEMS DE LA NOTA DE CRÉDITO
          jdocumentitems: {
            "0": {
              jextrainfo: {
                sbarcode: `CREDIT-${booking.roomNumber || 'SERV'}`,
                tdateorder: currentDate,
                sBrandName: "BALU HOTEL",
                sModelName: "NOTA DE CREDITO"
              },
              sdescription: description || `${creditReasonDescriptions[creditReason]} - Habitación ${booking.roomNumber}`,
              snotes: `Referencia factura: ${originalInvoice.getFullInvoiceNumber()}`,
              wunitcode: "und",
              sgroupname: "servicios",
              sstandarditemidentification: `CREDIT-${originalInvoice.invoiceSequentialNumber}`,
              sstandardidentificationcode: "999",
              nunitprice: creditAmount,
              nusertotal: creditAmount,
              nquantity: "1.00",
              adescription: {
                "0": `Nota de crédito por: ${creditReasonDescriptions[creditReason]}`,
                "1": `Factura original: ${originalInvoice.getFullInvoiceNumber()}`,
                "2": `Habitación: ${booking.roomNumber}`,
                "3": `Huésped: ${buyer.scostumername}`,
                "4": `Monto: $${creditAmount.toLocaleString()}`
              },
              jtax: {
                jiva: {
                  nrate: 19,
                  sname: "IVA",
                  namount: taxAmount,
                  nbaseamount: creditAmount
                }
              }
            }
          },
          
          // 🔧 COMPRADOR (IGUAL QUE LA FACTURA ORIGINAL)
          jbuyer: {
            wlegalorganizationtype: buyer.wlegalorganizationtype || "person",
            scostumername: buyer.scostumername,
            stributaryidentificationkey: "O-1",
            stributaryidentificationname: "IVA",
            sfiscalresponsibilities: buyer.sfiscalresponsibilities || "R-99-PN",
            sfiscalregime: "48",
            jpartylegalentity: {
              wdoctype: mapDocTypeToText(buyer.wdoctype),
              sdocno: buyer.sdocno,
              scorporateregistrationschemename: buyer.scostumername
            },
            jcontact: {
              scontactperson: buyer.scontactperson || buyer.scostumername,
              selectronicmail: buyer.selectronicmail,
              stelephone: buyer.stelephone?.replace(/^\+57/, '') || "3000000000",
              ...(buyer.jregistrationaddress && {
                jregistrationaddress: {
                  scountrycode: buyer.jregistrationaddress.scountrycode || "CO",
                  wdepartmentcode: buyer.jregistrationaddress.wdepartmentcode || "11",
                  wtowncode: buyer.jregistrationaddress.wtowncode || "11001",
                  scityname: buyer.jregistrationaddress.scityname || "Bogotá",
                  saddressline1: buyer.jregistrationaddress.saddressline1 || "Dirección no especificada",
                  szip: buyer.jregistrationaddress.szip || "00000"
                }
              })
            }
          },
          
          // 🔧 VENDEDOR (IGUAL QUE LA FACTURA ORIGINAL)
          jseller: {
            wlegalorganizationtype: sellerData.wlegalorganizationtype === "person" ? "person" : "company",
            sfiscalresponsibilities: sellerData.sfiscalresponsibilities,
            sdocno: sellerData.sdocno,
            sdoctype: mapDocTypeToText(sellerData.sdoctype),
            ssellername: sellerData.scostumername,
            ssellerbrand: sellerData.ssellerbrand || sellerData.scostumername,
            scontactperson: sellerData.scontactperson?.trim(),
            saddresszip: sellerData.spostalcode || "00000",
            wdepartmentcode: sellerData.registration_wdepartmentcode || "11",
            wtowncode: sellerData.registration_wprovincecode || "11001",
            scityname: sellerData.registration_scityname || sellerData.scity,
            jcontact: {
              selectronicmail: sellerData.selectronicmail,
              jregistrationaddress: {
                wdepartmentcode: sellerData.registration_wdepartmentcode || "11",
                sdepartmentname: sellerData.registration_sdepartmentname || "Cundinamarca",
                scityname: sellerData.registration_scityname || sellerData.scity,
                saddressline1: sellerData.registration_saddressline1 || sellerData.saddress,
                scountrycode: sellerData.registration_scountrycode || "CO",
                wprovincecode: sellerData.registration_wprovincecode || "11",
                szip: sellerData.registration_szip || sellerData.spostalcode || "00000"
              }
            }
          }
        }
      }
    };

    console.log('📄 Nota de crédito construida:', JSON.stringify(creditNoteBody, null, 2));

    // 🔧 GENERAR TOKEN
    console.log('=== Generando token para Taxxa ===');
    const token = await generateToken();
    if (!token) {
      await cancelInvoice(createdCreditNote.id);
      throw new Error('No se pudo generar el token de autenticación');
    }

    // 🔧 PREPARAR PAYLOAD FINAL
    const taxxaPayload = {
      stoken: token,
      jApi: creditNoteBody
    };

    console.log('=== Enviando nota de crédito a Taxxa ===');
    console.log('Payload a enviar:', JSON.stringify(taxxaPayload, null, 2));

    // 🔧 ENVIAR DOCUMENTO
    const taxxaResponse = await sendDocument(taxxaPayload);
    console.log('Respuesta de Taxxa:', JSON.stringify(taxxaResponse, null, 2));

    // 🔧 PROCESAR RESPUESTA
    if (taxxaResponse && taxxaResponse.rerror === 0) {
      console.log('=== Nota de crédito enviada exitosamente ===');
      
      // 🔧 MARCAR NOTA DE CRÉDITO COMO ENVIADA
      await createdCreditNote.markAsSent(taxxaResponse);
      
      // 🔧 ACTUALIZAR FACTURA ORIGINAL CON REFERENCIA A LA NOTA DE CRÉDITO
      await originalInvoice.update({
        hasCreditNote: true,
        creditNoteId: createdCreditNote.id,
        creditNoteAmount: creditAmount
      });

      return res.status(200).json({
        message: 'Nota de crédito enviada a Taxxa con éxito',
        success: true,
        data: {
          creditNoteId: createdCreditNote.id,
          creditNoteNumber: createdCreditNote.getFullInvoiceNumber(),
          originalInvoiceNumber: originalInvoice.getFullInvoiceNumber(),
          creditAmount: creditAmount,
          creditReason: creditReasonDescriptions[creditReason],
          cufe: taxxaResponse.jApiResponse?.cufe || taxxaResponse.scufe,
          sentAt: createdCreditNote.sentToTaxxaAt,
          taxxaResponse: taxxaResponse
        }
      });
      
    } else {
      console.error('Error en respuesta de Taxxa:', taxxaResponse);
      
      // 🔧 MARCAR NOTA DE CRÉDITO COMO FALLIDA
      await createdCreditNote.markAsFailed(new Error(taxxaResponse?.smessage || 'Error desconocido'));
      
      throw new Error(`Error en la respuesta de Taxxa: ${taxxaResponse?.smessage || JSON.stringify(taxxaResponse)}`);
    }

  } catch (error) {
    console.error('=== Error en el proceso de nota de crédito ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    // 🔧 CANCELAR NOTA DE CRÉDITO SI SE CREÓ
    if (createdCreditNote) {
      try {
        await cancelInvoice(createdCreditNote.id);
      } catch (cancelError) {
        console.error('Error cancelando nota de crédito:', cancelError.message);
      }
    }
    
    return res.status(500).json({
      message: 'Error al procesar la nota de crédito',
      success: false,
      error: error.message,
    });
  }
};

// 🔧 ACTUALIZAR EXPORTS
module.exports = {
  createInvoice,
  createCreditNote, // ⭐ NUEVA FUNCIÓN EXPORTADA
};