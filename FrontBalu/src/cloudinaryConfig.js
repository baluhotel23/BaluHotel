

const cloudinaryConfig = {
  cloudName: 'dv1xvijmn',
  uploadPreset: 'balu_rooms',
};

export const openCloudinaryWidget = (callback) => {
  const cloudinaryWidget = window.cloudinary.createUploadWidget(
    {
      cloudName: cloudinaryConfig.cloudName,
      uploadPreset: cloudinaryConfig.uploadPreset,
      multiple: false,
      folder: 'packs', // Carpeta donde se almacenarán los archivos
      resourceType: 'raw', // Asegura que se carguen archivos como PDFs
      public_id: `${Date.now()}_custom_suffix`, // Agrega un sufijo único al public_id
      format: 'pdf', // Forzar el formato PDF
    },
    (error, result) => {
      if (error) {
        console.error('Error en el widget de Cloudinary:', error);
      }
      if (result.event === 'success') {
        console.log('Archivo cargado exitosamente:', result.info.secure_url);
        callback(result.info.secure_url); // URL del archivo cargado
      }
    }
  );
  cloudinaryWidget.open();
};
