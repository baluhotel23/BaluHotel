/* eslint-disable react/prop-types */
import { useState } from 'react';


const DocumentTypePopup = ({ onClose, onSubmit }) => {
    const [documentType, setDocumentType] = useState("01"); // "01" para factura, "91" para nota de crédito
  
    const handleDocumentChange = (e) => setDocumentType(e.target.value);
  
    const handleConfirm = () => {
      onSubmit(documentType); // Enviar el tipo seleccionado
      onClose(); // Cerrar popup
    };
  
    return (
      <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded shadow-lg max-w-sm">
          <h2 className="text-lg font-bold mb-4">Selecciona el Tipo de Documento</h2>
          <div className="flex flex-col gap-4">
            <label>
              <input
                type="radio"
                value="01"
                checked={documentType === "01"}
                onChange={handleDocumentChange}
              />
              Factura
            </label>
            <label>
              <input
                type="radio"
                value="91"
                checked={documentType === "91"}
                onChange={handleDocumentChange}
              />
              Nota de Crédito
            </label>
          </div>
          <div className="flex justify-end mt-4">
            <button
              className="bg-gray-400 text-white px-4 py-2 rounded mr-2 hover:bg-gray-500"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={handleConfirm}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  };
  export default DocumentTypePopup