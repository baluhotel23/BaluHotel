const { SellerData } = require('../../data');

// Crear los datos del comercio
const getOrCreateSellerData = async (req, res) => {
  try {
    const {
      wlegalorganizationtype,
      sfiscalresponsibilities,
      sdocno,
      sdoctype,
      ssellername,
      ssellerbrand,
      scontactperson,
      saddresszip,
      wdepartmentcode,
      wtowncode,
      scityname,
      jcontact: {
        selectronicmail: contact_selectronicmail = null,
        jregistrationaddress: {
          wdepartmentcode: registration_wdepartmentcode = null,
          scityname: registration_scityname = null,
          saddressline1: registration_saddressline1 = null,
          scountrycode: registration_scountrycode = null,
          wprovincecode: registration_wprovincecode = null,
          szip: registration_szip = null,
          sdepartmentname: registration_sdepartmentname = null,
        } = {},
      } = {},
    } = req.body;

    // Buscar o crear el registro
    const [sellerData, created] = await SellerData.findOrCreate({
      where: { sdocno },
      defaults: {
        wlegalorganizationtype,
        sfiscalresponsibilities,
        sdocno,
        sdoctype,
        ssellername,
        ssellerbrand,
        scontactperson,
        saddresszip,
        wdepartmentcode,
        wtowncode,
        scityname,
        contact_selectronicmail,
        registration_wdepartmentcode,
        registration_scityname,
        registration_saddressline1,
        registration_scountrycode,
        registration_wprovincecode,
        registration_szip,
        registration_sdepartmentname,
      },
    });

    // Respuesta
    if (created) {
      return res.status(201).json({ 
        message: 'Datos del comercio creados exitosamente', 
        data: sellerData 
      });
    }

    res.status(200).json({ 
      message: 'Datos del comercio encontrados exitosamente', 
      data: sellerData 
    });

  } catch (error) {
    console.error('Error al obtener o crear los datos del comercio:', error);
    res.status(500).json({ 
      message: 'Error al obtener o crear los datos del comercio', 
      error: error.message 
    });
  }
};


const updateSellerData = async (req, res) => {
  try {
    const { sdocno } = req.params;
    const updateData = req.body;

    // Validar que existen datos para actualizar
    if (!Object.keys(updateData).length) {
      return res.status(400).json({ message: 'No hay datos para actualizar' });
    }

    console.log("ID recibido para actualizar:", sdocno);
    console.log("Datos recibidos para actualizar:", updateData);

    // Actualizar el registro
    const [rowsUpdated, updatedRecords] = await SellerData.update(updateData, {
      where: { sdocno },
      returning: true,
    });

    if (rowsUpdated === 0) {
      return res.status(404).json({ message: 'Datos no encontrados' });
    }

    res.status(200).json({ 
      message: 'Datos del comercio actualizados exitosamente', 
      data: updatedRecords[0] 
    });

  } catch (error) {
    console.error('Error al actualizar los datos del comercio:', error);
    res.status(500).json({ 
      message: 'Error al actualizar los datos del comercio', 
      error: error.message 
    });
  }
};

const getSellerDataBySdocno = async (req, res) => {
  try {
    const { sdocno } = req.params;

    // Validar que el sdocno existe
    if (!sdocno) {
      return res.status(400).json({ message: 'SDocno es requerido' });
    }

    // Buscar el vendedor por sdocno
    const sellerData = await SellerData.findOne({
      where: { sdocno },
    });

    // Validar si se encontraron datos
    if (!sellerData) {
      return res.status(404).json({ message: 'Datos del vendedor no encontrados' });
    }

    // Responder con los datos del vendedor
    res.status(200).json({ message: 'Datos del vendedor encontrados exitosamente', data: sellerData });

  } catch (error) {
    console.error('Error al obtener los datos del vendedor:', error);
    res.status(500).json({ message: 'Error al obtener los datos del vendedor', error: error.message });
  }
};

module.exports = {
  getOrCreateSellerData,
  updateSellerData,
  getSellerDataBySdocno, // Exporta la nueva función
};


