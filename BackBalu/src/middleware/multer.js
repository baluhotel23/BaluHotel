const multer = require('multer');

// Almacenar el archivo en memoria como Buffer
const storage = multer.memoryStorage();

// Filtrar para aceptar PDF e imágenes
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf', 
    'image/jpeg', 
    'image/png', 
    'image/gif',
    'image/webp' 
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true); // Archivo permitido
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se aceptan PDF, JPG, PNG, GIF y WEBP.'), false); // Archivo rechazado
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Límite de tamaño de archivo: 5 MB
});

module.exports = { upload };