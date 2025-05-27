// Opcional: utils/cloudinaryUploader.js
const { cloudinary } = require('./cloudinaryConfig'); // Asumiendo que ya lo tienes
const fs = require('fs');

const uploadToCloudinary = (filePath, folder = 'packs') => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { folder, resource_type: 'raw' }, // Asegura que el tipo de recurso sea 'raw'
      (error, result) => {
        if (error) {
          return reject(error);
        }
        resolve(result);
      }
    );
  });
};

const uploadBufferToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { ...options, resource_type: 'raw' }, // Asegura que el tipo de recurso sea 'raw'
      (error, result) => {
        if (error) {
          console.error('Error en upload_stream callback:', error);
          return reject(error);
        }
        if (!result) {
          console.error('Callback de Cloudinary no devolvió resultado.');
          return reject(new Error("Cloudinary did not return a result."));
        }
        resolve(result);
      }
    );
    uploadStream.on('error', (streamError) => {
      console.error('Error en el stream de subida de Cloudinary:', streamError);
      reject(streamError);
    });
    uploadStream.end(buffer);
  });
};

const deleteFromCloudinary = (publicId) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) return reject(error);
      resolve(result);
    });
  });
};

module.exports = { uploadToCloudinary, deleteFromCloudinary, uploadBufferToCloudinary };