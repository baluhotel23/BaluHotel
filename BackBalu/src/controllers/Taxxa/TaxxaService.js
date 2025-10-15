const { SellerData, User, Buyer, Booking, Bill, Invoice, CreditNote } = require('../../data');
const { generateToken, sendDocument } = require('./taxxaUtils');
const { createInvoiceWithNumber, cancelInvoice, getNextInvoiceNumber } = require('./invoiceNumberController');
const { Op } = require('sequelize');


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
    // ⭐ HOSPEDAJE NO LLEVA IVA - Total = Base
    const baseAmount = parseFloat(bill.reservationAmount);
    const extraAmount = parseFloat(bill.extraChargesAmount) || 0;
    const totalBase = baseAmount + extraAmount;
    const taxAmount = 0; // ⭐ SIN IVA para servicios de hospedaje
    const totalWithTax = totalBase; // ⭐ Total = Base (sin IVA)

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
              nunitprice: totalBase,
              nusertotal: totalBase,
              nquantity: 1,
              jtax: {
                jiva: {
                  nrate: 0, // ⭐ SIN IVA - Servicios de hospedaje exentos
                  sname: "IVA",
                  namount: 0, // ⭐ Monto de IVA = 0
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
            nrate: 0, // ⭐ SIN IVA - Servicios adicionales del hotel también exentos
            sname: "IVA",
            namount: 0, // ⭐ Monto de IVA = 0
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

if (taxxaResponse && taxxaResponse.rerror === 0) {
  console.log('=== Factura fiscal enviada exitosamente ===');

  // 🔧 EXTRAER QR CODE DE LA RESPUESTA
  let qrCode = null;
  if (taxxaResponse?.jret?.sqr) {
    const match = taxxaResponse.jret.sqr.match(/https?:\/\/[^\s]+/);
    if (match) {
      qrCode = match[0];
    }
  }

  // 🔧 MARCAR FACTURA FISCAL COMO ENVIADA
  await createdInvoice.markAsSent(taxxaResponse);

  // 🔧 ACTUALIZAR FACTURA INTERNA CON REFERENCIA Y QR
  await bill.update({
    taxxaStatus: 'sent',
    taxInvoiceId: createdInvoice.getFullInvoiceNumber(),
    cufe: taxxaResponse.jApiResponse?.cufe 
      || taxxaResponse.scufe 
      || taxxaResponse.cufe 
      || taxxaResponse.jret?.scufe,
    taxxaResponse: taxxaResponse,
    sentToTaxxaAt: new Date(),
    qrCode // <--- Guarda el QR aquí
  });

  return res.status(200).json({
    message: 'Factura fiscal enviada a Taxxa con éxito',
    success: true,
    data: {
      invoiceId: createdInvoice.id,
      invoiceNumber: createdInvoice.getFullInvoiceNumber(),
      billId: bill.idBill,
      cufe: taxxaResponse.jApiResponse?.cufe 
        || taxxaResponse.scufe 
        || taxxaResponse.jret?.scufe,
      qrCode, // <--- Devuelve el QR también
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

const createManualInvoice = async (req, res) => {
  let createdInvoice = null;
  
  try {
    console.log('=== Iniciando proceso de facturación MANUAL ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const { buyer, items, notes = 'Factura manual' } = req.body;

    // ✅ VALIDACIONES
    if (!buyer?.document || !buyer?.name) {
      return res.status(400).json({
        message: 'Datos del comprador son obligatorios (documento y nombre)',
        success: false,
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'Debe incluir al menos un item para facturar',
        success: false,
      });
    }

    // Validar cada item
    for (const item of items) {
      if (!item.description || !item.quantity || !item.unitPrice) {
        return res.status(400).json({
          message: 'Cada item debe tener descripción, cantidad y precio unitario',
          success: false,
        });
      }
    }

    // 🔧 CALCULAR TOTALES
    // ⭐ SIN IVA - Los servicios de hospedaje y adicionales están exentos
    const subtotal = items.reduce((sum, item) => {
      return sum + (parseFloat(item.quantity) * parseFloat(item.unitPrice));
    }, 0);
    
    const taxAmount = 0; // ⭐ Sin IVA para servicios de hotel
    const totalAmount = subtotal; // ⭐ Total = Subtotal (sin IVA)

    console.log('💰 Totales calculados:', { subtotal, taxAmount, totalAmount });

    // 🔧 CREAR O BUSCAR COMPRADOR (igual que tu lógica actual)
    let buyerRecord = await Buyer.findOne({
      where: { sdocno: buyer.document }
    });

    if (!buyerRecord) {
      console.log('👤 Creando nuevo comprador...');
      buyerRecord = await Buyer.create({
        sdocno: buyer.document,
        scostumername: buyer.name,
        selectronicmail: buyer.email || '',
        stelephone: buyer.phone || '',
        wdoctype: buyer.docType || 13, // CC por defecto
        sfiscalresponsibilities: 'R-99-PN', // Persona natural por defecto
        // Agregar dirección si viene
        ...(buyer.address && {
          jregistrationaddress: {
            scountrycode: buyer.country || "CO",
            wdepartmentcode: buyer.departmentCode || "11",
            wtowncode: buyer.cityCode || "11001",
            scityname: buyer.city || "Bogotá",
            saddressline1: buyer.address,
            szip: buyer.zipCode || "00000"
          }
        })
      });
    } else {
      console.log('👤 Comprador existente encontrado');
    }

    // 🔧 OBTENER VENDEDOR (igual que tu lógica actual)
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

    // 🔧 CREAR BILL MANUAL
    const bill = await Bill.create({
      buyerId: buyerRecord.sdocno,
      sellerId: sellerData.sdocno,
      totalAmount: totalAmount,
      taxAmount: taxAmount,
      reservationAmount: subtotal, // Base sin impuestos
      extraChargesAmount: 0,
      status: 'paid', // Las facturas manuales ya están pagadas
      billType: 'manual',
      notes: notes,
      paymentMethod: 'cash', // Por defecto efectivo
      taxxaStatus: 'pending'
    });

    console.log('📄 Bill manual creada:', bill.idBill);

    // ⭐ USAR TU LÓGICA EXISTENTE PARA CREAR INVOICE CON NUMERACIÓN
    try {
      createdInvoice = await createInvoiceWithNumber({
        billId: bill.idBill,
        buyerId: buyerRecord.sdocno,
        buyerName: buyerRecord.scostumername,
        buyerEmail: buyerRecord.selectronicmail,
        sellerId: sellerData.sdocno,
        sellerName: sellerData.scostumername,
        totalAmount: totalAmount,
        taxAmount: taxAmount,
        netAmount: subtotal,
        orderReference: `MANUAL-${Date.now()}-${bill.idBill.slice(-8)}`
      });

      console.log(`✅ Factura fiscal manual creada: ${createdInvoice.getFullInvoiceNumber()}`);
    } catch (invoiceError) {
      console.error('❌ Error creando factura fiscal:', invoiceError.message);
      return res.status(500).json({
        message: 'Error en la numeración de facturas fiscales',
        success: false,
        error: invoiceError.message
      });
    }

    // 🔧 CONSTRUIR DOCUMENTO PARA TAXXA (adaptando tu estructura existente)
    console.log('=== Construyendo documento MANUAL para Taxxa ===');

    const mapDocTypeToText = (code) => {
      const mapping = {
        11: "RC", 12: "TI", 13: "CC", 21: "CE", 22: "CD", 
        31: "NIT", 41: "PA", 42: "PEP", 50: "NIT", 91: "NUIP"
      };
      return mapping[code] || "CC";
    };

    const numberToWords = (num) => {
      // Función simplificada - puedes expandir según necesites
      return `${Math.round(num).toLocaleString()} pesos colombianos`;
    };

    const currentDate = new Date().toISOString().split('T')[0];

    // ⭐ ADAPTAR TU ESTRUCTURA EXISTENTE PARA ITEMS MANUALES
    const jdocumentitems = {};
    items.forEach((item, index) => {
      const itemSubtotal = parseFloat(item.quantity) * parseFloat(item.unitPrice);
      jdocumentitems[index.toString()] = {
        jextrainfo: {
          sbarcode: `MANUAL-${index + 1}`
        },
        sdescription: item.description,
        wunitcode: "und",
        sstandarditemidentification: `MANUAL-ITEM-${index + 1}`,
        sstandardidentificationcode: "999",
        nunitprice: parseFloat(item.unitPrice),
        nusertotal: itemSubtotal,
        nquantity: parseFloat(item.quantity),
        jtax: {
          jiva: {
            nrate: 0, // ⭐ SIN IVA por defecto (servicios de hotel)
            sname: "IVA",
            namount: 0, // ⭐ Monto de IVA = 0
            nbaseamount: itemSubtotal
          }
        }
      };
    });

    // ⭐ USAR EXACTAMENTE TU ESTRUCTURA EXISTENTE
    const documentBody = {
      sMethod: 'classTaxxa.fjDocumentAdd',
      jParams: {
        wVersionUBL: "2.1",
        wenvironment: "prod",
        jDocument: {
          wversionubl: "2.1",
          wenvironment: "prod",
          wdocumenttype: "Invoice",
          wdocumenttypecode: "01",
          scustomizationid: "10",
          wcurrency: "COP",
          
          // Numeración
          sdocumentprefix: createdInvoice.prefix,
          sdocumentsuffix: parseInt(createdInvoice.invoiceSequentialNumber),
          
          // Fechas
          tissuedate: currentDate,
          tduedate: currentDate,
          
          // Información de pago
          wpaymentmeans: 1,
          wpaymentmethod: "10",
          
          // Totales
          nlineextensionamount: subtotal,
          ntaxexclusiveamount: subtotal,
          ntaxinclusiveamount: totalAmount,
          npayableamount: totalAmount,
          
          // Referencias
          sorderreference: createdInvoice.orderReference,
          snotes: notes,
          snotetop: "",
          
          // Información extra
          jextrainfo: {
            ntotalinvoicepayment: totalAmount,
            stotalinvoicewords: numberToWords(totalAmount),
            iitemscount: items.length.toString()
          },
          
          // Items dinámicos
          jdocumentitems,
          
          // ⭐ COMPRADOR (igual que tu estructura)
          jbuyer: {
            wlegalorganizationtype: buyerRecord.wlegalorganizationtype || "person",
            scostumername: buyerRecord.scostumername,
            stributaryidentificationkey: "O-1",
            stributaryidentificationname: "IVA",
            sfiscalresponsibilities: buyerRecord.sfiscalresponsibilities || "R-99-PN",
            sfiscalregime: "48",
            jpartylegalentity: {
              wdoctype: mapDocTypeToText(buyerRecord.wdoctype),
              sdocno: buyerRecord.sdocno,
              scorporateregistrationschemename: buyerRecord.scostumername
            },
            jcontact: {
              scontactperson: buyerRecord.scontactperson || buyerRecord.scostumername,
              selectronicmail: buyerRecord.selectronicmail,
              stelephone: buyerRecord.stelephone?.replace(/^\+57/, '') || "3000000000",
              ...(buyerRecord.jregistrationaddress && {
                jregistrationaddress: buyerRecord.jregistrationaddress
              })
            }
          },
          
          // ⭐ VENDEDOR (exactamente igual que tu código existente)
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

    console.log('📄 Documento manual construido');

    // ⭐ USAR TU LÓGICA EXISTENTE PARA ENVÍO
    console.log('=== Generando token para Taxxa ===');
    const token = await generateToken();
    if (!token) {
      await cancelInvoice(createdInvoice.id);
      throw new Error('No se pudo generar el token de autenticación');
    }

    const taxxaPayload = {
      stoken: token,
      jApi: documentBody
    };

    console.log('=== Enviando factura MANUAL a Taxxa ===');
    const taxxaResponse = await sendDocument(taxxaPayload);

    if (taxxaResponse && taxxaResponse.rerror === 0) {
      console.log('=== Factura MANUAL enviada exitosamente ===');

      // QR Code
      let qrCode = null;
      if (taxxaResponse?.jret?.sqr) {
        const match = taxxaResponse.jret.sqr.match(/https?:\/\/[^\s]+/);
        if (match) {
          qrCode = match[0];
        }
      }

      // Marcar como enviada
      await createdInvoice.markAsSent(taxxaResponse);
      await bill.update({
        taxxaStatus: 'sent',
        taxInvoiceId: createdInvoice.getFullInvoiceNumber(),
        cufe: taxxaResponse.jApiResponse?.cufe || taxxaResponse.scufe || taxxaResponse.jret?.scufe,
        taxxaResponse: taxxaResponse,
        sentToTaxxaAt: new Date(),
        qrCode
      });

      return res.status(200).json({
        message: 'Factura manual enviada a Taxxa con éxito',
        success: true,
        data: {
          invoiceId: createdInvoice.id,
          invoiceNumber: createdInvoice.getFullInvoiceNumber(),
          billId: bill.idBill,
          cufe: taxxaResponse.jApiResponse?.cufe || taxxaResponse.scufe || taxxaResponse.jret?.scufe,
          qrCode,
          totalAmount: createdInvoice.totalAmount,
          sentAt: createdInvoice.sentToTaxxaAt,
          items: items
        }
      });

    } else {
      console.error('Error en respuesta de Taxxa:', taxxaResponse);
      await createdInvoice.markAsFailed(new Error(taxxaResponse?.smessage || 'Error desconocido'));
      throw new Error(`Error en la respuesta de Taxxa: ${taxxaResponse?.smessage || JSON.stringify(taxxaResponse)}`);
    }

  } catch (error) {
    console.error('=== Error en facturación MANUAL ===');
    console.error('Error:', error.message);
    
    if (createdInvoice) {
      try {
        await cancelInvoice(createdInvoice.id);
      } catch (cancelError) {
        console.error('Error cancelando factura fiscal:', cancelError.message);
      }
    }
    
    return res.status(500).json({
      message: 'Error al procesar la factura manual',
      success: false,
      error: error.message,
    });
  }
};

// ⭐ FUNCIÓN AUXILIAR PARA OBTENER DATOS DE FACTURACIÓN MANUAL
const getManualInvoiceData = async (req, res) => {
  try {
    console.log('📋 Obteniendo datos para facturación manual...');

    const nextInvoiceNumber = await getNextInvoiceNumber();
    
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

    res.json({
      success: true,
      data: {
        nextInvoiceNumber,
        fullInvoiceNumber: `FE${nextInvoiceNumber}`,
        seller: {
          id: sellerData.sdocno,
          name: sellerData.scostumername,
          email: sellerData.selectronicmail
        }
      },
      message: 'Datos obtenidos para facturación manual'
    });

  } catch (error) {
    console.error('❌ Error obteniendo datos para facturación manual:', error);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo datos',
      error: error.message
    });
  }
};

// ⭐ FUNCIÓN PARA BUSCAR COMPRADOR
const searchBuyerForManual = async (req, res) => {
  try {
    const { document } = req.params;
    
    const buyer = await Buyer.findOne({
      where: { sdocno: document },
      attributes: ['sdocno', 'scostumername', 'selectronicmail', 'stelephone', 'jregistrationaddress']
    });

    if (!buyer) {
      return res.json({
        success: true,
        found: false,
        message: 'Comprador no encontrado'
      });
    }

    res.json({
      success: true,
      found: true,
      data: {
        document: buyer.sdocno,
        name: buyer.scostumername,
        email: buyer.selectronicmail,
        phone: buyer.stelephone,
        address: buyer.jregistrationaddress
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error buscando comprador',
      error: error.message
    });
  }
};

// 🆕 FUNCIÓN PARA CREAR NOTA DE CRÉDITO
// 🆕 FUNCIÓN PARA CREAR NOTA DE CRÉDITO - CORREGIDA
// Al inicio de la función createCreditNote, después de la línea existente
const createCreditNote = async (req, res) => {
  console.log('\n🎯 === FUNCIÓN createCreditNote INICIADA ===');
  console.log('  - Timestamp:', new Date().toISOString());
  console.log('  - Request method:', req?.method);
  console.log('  - Request path:', req?.path);
  console.log('  - User info:', {
    id: req?.user?.id,
    role: req?.user?.role,
    email: req?.user?.email
  });

  let createdCreditNote = null;
  
  try {
    console.log('=== Iniciando proceso de nota de crédito ===');
    console.log('Body:', JSON.stringify(req.body, null, 2));

    console.log('🔍 [STEP 1] Extrayendo datos del body...');
    const { 
      originalInvoiceId,
      creditReason,
      amount,
      description,
      isPartial = false
    } = req.body;

    console.log('  - originalInvoiceId:', originalInvoiceId);
    console.log('  - creditReason:', creditReason);
    console.log('  - amount:', amount);
    console.log('  - description:', description);

    // ✅ VALIDACIONES CON DEBUG
    console.log('🔍 [STEP 2] Validando datos de entrada...');
    
    if (!originalInvoiceId) {
      console.log('❌ [VALIDATION] originalInvoiceId faltante');
      return res.status(400).json({
        message: 'El ID de la factura original es obligatorio',
        success: false,
      });
    }

    if (!creditReason || !['1', '2', '3', '4', '5', '6'].includes(creditReason.toString())) {
      console.log('❌ [VALIDATION] creditReason inválido:', creditReason);
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
      console.log('❌ [VALIDATION] amount inválido:', amount);
      return res.status(400).json({
        message: 'El monto de la nota de crédito debe ser mayor a 0',
        success: false,
      });
    }

    console.log('✅ [STEP 2] Validaciones básicas pasadas');

    // 🔧 IMPORTAR SEQUELIZE OP SI NO ESTÁ IMPORTADO
    console.log('🔍 [STEP 3] Verificando imports...');
    
    // Verificar si Op está disponible
    let Op;
    try {
      Op = require('sequelize').Op;
      console.log('✅ [STEP 3] Sequelize Op importado');
    } catch (error) {
      console.error('❌ [STEP 3] Error importando Sequelize Op:', error.message);
      return res.status(500).json({
        message: 'Error de configuración del servidor',
        success: false,
        error: 'Sequelize Op not available'
      });
    }

    // 🔧 BUSCAR FACTURA ORIGINAL CON DEBUG
    console.log('🔍 [STEP 4] Buscando factura original ID:', originalInvoiceId);
    console.log('🔍 [STEP 4] Tipo de originalInvoiceId:', typeof originalInvoiceId);
    
    let originalInvoice;
    try {
      // ⭐ PRIMERO BUSCAR SIN RESTRICCIONES PARA VER SI EXISTE (incluye soft-deleted)
      const invoiceCheck = await Invoice.findByPk(originalInvoiceId, { paranoid: false });
      console.log('🔍 [STEP 4] Factura encontrada (sin filtros):', invoiceCheck ? {
        id: invoiceCheck.id,
        status: invoiceCheck.status,
        cufe: invoiceCheck.cufe,
        prefix: invoiceCheck.prefix,
        number: invoiceCheck.invoiceSequentialNumber,
        deletedAt: invoiceCheck.deletedAt
      } : 'NO ENCONTRADA');

      // ⭐ AHORA BUSCAR CON CONDICIONES MÁS FLEXIBLES (incluye soft-deleted)
      originalInvoice = await Invoice.findOne({
        where: { 
          id: originalInvoiceId
          // ⭐ ELIMINAR RESTRICCIONES DE status y cufe para debug
          // Validaremos esto después manualmente
        },
        paranoid: false // ⭐ INCLUIR FACTURAS SOFT-DELETED
      });
      console.log('✅ [STEP 4] Query ejecutada exitosamente');
    } catch (dbError) {
      console.error('❌ [STEP 4] Error en query de factura original:', dbError.message);
      return res.status(500).json({
        message: 'Error al buscar factura original',
        success: false,
        error: dbError.message
      });
    }

    if (!originalInvoice) {
      console.log('❌ [STEP 4] Factura original no encontrada con ID:', originalInvoiceId);
      return res.status(404).json({
        message: `Factura fiscal con ID ${originalInvoiceId} no encontrada`,
        success: false,
      });
    }

    // ⭐ VALIDAR ESTADO
    if (originalInvoice.status !== 'sent') {
      console.log('❌ [STEP 4] Factura no está en estado "sent":', originalInvoice.status);
      return res.status(400).json({
        message: `La factura debe estar en estado "sent". Estado actual: ${originalInvoice.status}`,
        success: false,
      });
    }

    // 🔧 OBTENER BILL PRIMERO PARA VERIFICAR CUFE
    console.log('🔍 [STEP 4.5] Obteniendo Bill para verificar CUFE...');
    let bill;
    try {
      bill = await Bill.findOne({
        where: { idBill: originalInvoice.billId }
      });
      
      if (!bill) {
        console.log('❌ [STEP 4.5] Bill no encontrado');
        return res.status(404).json({
          message: 'Bill asociado a la factura no encontrado',
          success: false,
        });
      }
      
      console.log('✅ [STEP 4.5] Bill encontrado:', {
        idBill: bill.idBill,
        cufeInBill: bill.cufe ? 'Sí' : 'No'
      });
    } catch (billError) {
      console.error('❌ [STEP 4.5] Error buscando Bill:', billError.message);
      return res.status(500).json({
        message: 'Error al buscar Bill',
        success: false,
        error: billError.message
      });
    }

    // ⭐ VALIDAR CUFE (buscar en invoice o en bill)
    const cufeToUse = originalInvoice.cufe || bill.cufe;
    
    if (!cufeToUse) {
      console.log('❌ [STEP 4] CUFE no encontrado ni en Invoice ni en Bill');
      return res.status(400).json({
        message: 'La factura original no tiene CUFE válido, no se puede crear nota de crédito',
        success: false,
      });
    }

    // ⭐ Si el CUFE está en Bill pero no en Invoice, actualizarlo
    if (!originalInvoice.cufe && bill.cufe) {
      console.log('🔧 [STEP 4] Sincronizando CUFE de Bill a Invoice...');
      await originalInvoice.update({ cufe: bill.cufe });
      console.log('✅ [STEP 4] CUFE sincronizado');
    }

    console.log(`✅ [STEP 4] Factura original encontrada: ${originalInvoice.getFullInvoiceNumber()}`);
    console.log(`🔍 CUFE de la factura original: ${cufeToUse}`);

    // 🔧 OBTENER DATOS RELACIONADOS CON DEBUG
    console.log('🔍 [STEP 5] Obteniendo datos relacionados...');
    
    try {
      // Recargar bill con todas las relaciones
      bill = await Bill.findOne({
        where: { idBill: originalInvoice.billId },
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
      console.log('✅ [STEP 5] Query de datos relacionados ejecutada');
    } catch (dbError) {
      console.error('❌ [STEP 5] Error en query de datos relacionados:', dbError.message);
      return res.status(500).json({
        message: 'Error al obtener datos relacionados',
        success: false,
        error: dbError.message
      });
    }

    if (!bill) {
      console.log('❌ [STEP 5] Bill no encontrado');
      return res.status(404).json({
        message: 'Bill asociado a la factura no encontrado',
        success: false,
      });
    }

    console.log('✅ [STEP 5] Bill obtenido');

    // 🔍 DETERMINAR SI ES FACTURA MANUAL O DE RESERVA
    const isManualInvoice = bill.billType === 'manual' || !bill.bookingId;
    console.log(`📋 Tipo de factura: ${isManualInvoice ? 'MANUAL' : 'RESERVA'}`);

    let buyer;
    let booking = null;

    if (isManualInvoice) {
      // Para facturas manuales, buscar buyer directamente
      console.log('🔍 [STEP 5.1] Buscando buyer para factura manual...');
      buyer = await Buyer.findOne({
        where: { sdocno: originalInvoice.buyerId }
      });

      if (!buyer) {
        console.log('❌ [STEP 5.1] Buyer no encontrado');
        return res.status(404).json({
          message: 'Comprador no encontrado',
          success: false,
        });
      }
      console.log('✅ [STEP 5.1] Buyer obtenido:', buyer.scostumername);
    } else {
      // Para facturas de reserva, validar booking y guest
      if (!bill.booking || !bill.booking.guest) {
        console.log('❌ [STEP 5] Datos de reserva no encontrados');
        console.log('  - booking exists:', !!bill?.booking);
        console.log('  - guest exists:', !!bill?.booking?.guest);
        return res.status(404).json({
          message: 'Datos de reserva no encontrados (booking/guest)',
          success: false,
        });
      }
      booking = bill.booking;
      buyer = bill.booking.guest;
      console.log('✅ [STEP 5] Datos de reserva obtenidos');
    }

    console.log('✅ [STEP 5] Datos relacionados obtenidos exitosamente');

    // Continuar con el resto del proceso...
    console.log('🔍 [STEP 6] Proceso continúa...');

    // ⚡ RESPUESTA TEMPORAL PARA TESTING
    console.log('🧪 [TESTING] Enviando respuesta de prueba exitosa...');
    
    return res.status(200).json({
      message: 'Proceso de nota de crédito iniciado correctamente (TESTING)',
      success: true,
      debug: {
        step: 'STEP 6 - Datos validados correctamente',
        originalInvoiceFound: true,
        relatedDataFound: true,
        originalInvoiceNumber: originalInvoice.getFullInvoiceNumber(),
        billId: bill.idBill,
        buyerName: buyer.scostumername
      }
    });

  } catch (error) {
    console.error('=== Error en el proceso de nota de crédito ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    if (createdCreditNote) {
      try {
        await createdCreditNote.destroy();
        console.log('🗑️ [CLEANUP] Nota de crédito cancelada por error');
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
  createCreditNote,
  createManualInvoice,
  getManualInvoiceData,
  searchBuyerForManual
 
};
