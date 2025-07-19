import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium', 
  color = 'blue', 
  text = 'Cargando...', 
  fullScreen = false,
  className = ''
}) => {
  // Configuraciones de tamaño
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  // Configuraciones de color
  const colorClasses = {
    blue: 'border-blue-600 border-t-blue-200',
    green: 'border-green-600 border-t-green-200',
    red: 'border-red-600 border-t-red-200',
    orange: 'border-orange-600 border-t-orange-200',
    purple: 'border-purple-600 border-t-purple-200',
    gray: 'border-gray-600 border-t-gray-200',
    white: 'border-white border-t-gray-300'
  };

  // Configuraciones de texto por color
  const textColorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    red: 'text-red-600',
    orange: 'text-orange-600',
    purple: 'text-purple-600',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  const spinnerClasses = `
    ${sizeClasses[size] || sizeClasses.medium}
    ${colorClasses[color] || colorClasses.blue}
    border-2 border-solid rounded-full animate-spin
  `;

  const textClasses = `
    ${textColorClasses[color] || textColorClasses.blue}
    text-sm font-medium mt-3
  `;

  // Componente básico del spinner
  const SpinnerContent = () => (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className={spinnerClasses}></div>
      {text && (
        <div className={textClasses}>
          {text}
        </div>
      )}
    </div>
  );

  // Si es fullScreen, envolver en overlay
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 shadow-xl">
          <SpinnerContent />
        </div>
      </div>
    );
  }

  return <SpinnerContent />;
};

// Variantes predefinidas para casos comunes
export const LoadingSpinnerInline = ({ text = "Cargando...", color = "blue" }) => (
  <LoadingSpinner 
    size="small" 
    color={color} 
    text={text}
    className="inline-flex items-center gap-2"
  />
);

export const LoadingSpinnerCard = ({ text = "Cargando datos...", color = "blue" }) => (
  <div className="flex items-center justify-center p-12 bg-gray-50 rounded-lg border border-gray-200">
    <LoadingSpinner size="large" color={color} text={text} />
  </div>
);

export const LoadingSpinnerButton = ({ text = "Procesando...", color = "white" }) => (
  <LoadingSpinner 
    size="small" 
    color={color} 
    text={text}
    className="flex-row items-center gap-2"
  />
);

export const LoadingSpinnerPage = ({ 
  text = "Cargando página...", 
  subtitle = "Por favor espere un momento",
  color = "blue" 
}) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center p-8">
      <LoadingSpinner size="xl" color={color} text={text} />
      {subtitle && (
        <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
          {subtitle}
        </p>
      )}
    </div>
  </div>
);

// Spinner con múltiples puntos (alternativa)
export const LoadingDots = ({ color = "blue", text = "Cargando" }) => {
  const dotColor = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    orange: 'bg-orange-600',
    purple: 'bg-purple-600',
    gray: 'bg-gray-600'
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="flex space-x-1">
        <div className={`w-2 h-2 ${dotColor[color]} rounded-full animate-bounce`}></div>
        <div className={`w-2 h-2 ${dotColor[color]} rounded-full animate-bounce`} style={{animationDelay: '0.1s'}}></div>
        <div className={`w-2 h-2 ${dotColor[color]} rounded-full animate-bounce`} style={{animationDelay: '0.2s'}}></div>
      </div>
      {text && (
        <span className={`text-sm font-medium mt-2 ${textColorClasses[color]}`}>
          {text}
        </span>
      )}
    </div>
  );
};

// Spinner para tablas/listas
export const LoadingSpinnerTable = ({ rows = 5, columns = 4 }) => (
  <div className="animate-pulse">
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex space-x-4 p-4 border-b border-gray-200">
        {[...Array(columns)].map((_, j) => (
          <div key={j} className="flex-1 h-4 bg-gray-200 rounded"></div>
        ))}
      </div>
    ))}
  </div>
);

export default LoadingSpinner;