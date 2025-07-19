import React from 'react';

const EmptyState = ({ 
  type = "no-bookings",
  onRefresh,
  onClearFilters,
  hasFiltersActive = false 
}) => {
  const getEmptyStateConfig = () => {
    switch (type) {
      case "no-bookings":
        return {
          icon: "🏨",
          title: "No hay reservas para check-out",
          subtitle: "No se encontraron reservas que requieran gestión de check-out en este momento.",
          suggestions: [
            "• Todas las reservas están completadas",
            "• No hay huéspedes próximos a realizar check-out",
            "• Verifica que las fechas de las reservas sean correctas"
          ],
          actions: [
            {
              label: "🔄 Actualizar",
              onClick: onRefresh,
              variant: "primary"
            }
          ]
        };
      
      case "filtered":
        return {
          icon: "🔍",
          title: "No se encontraron resultados",
          subtitle: "Los filtros aplicados no devolvieron ninguna reserva.",
          suggestions: [
            "• Revisa los criterios de búsqueda",
            "• Intenta con filtros menos específicos",
            "• Verifica que los datos sean correctos"
          ],
          actions: [
            {
              label: "🗑️ Limpiar Filtros",
              onClick: onClearFilters,
              variant: "secondary"
            },
            {
              label: "🔄 Actualizar",
              onClick: onRefresh,
              variant: "primary"
            }
          ]
        };
      
      case "loading-error":
        return {
          icon: "⚠️",
          title: "Error al cargar las reservas",
          subtitle: "Ocurrió un problema al obtener los datos del servidor.",
          suggestions: [
            "• Verifica tu conexión a internet",
            "• El servidor podría estar temporalmente no disponible",
            "• Contacta al soporte técnico si el problema persiste"
          ],
          actions: [
            {
              label: "🔄 Reintentar",
              onClick: onRefresh,
              variant: "primary"
            }
          ]
        };
      
      case "all-completed":
        return {
          icon: "✅",
          title: "¡Todos los check-outs completados!",
          subtitle: "Excelente trabajo. No hay reservas pendientes de check-out.",
          suggestions: [
            "• Todas las reservas están gestionadas correctamente",
            "• Puedes revisar el historial de check-outs",
            "• Prepárate para las próximas llegadas"
          ],
          actions: [
            {
              label: "🔄 Actualizar",
              onClick: onRefresh,
              variant: "primary"
            }
          ]
        };
      
      default:
        return {
          icon: "📋",
          title: "Sin datos disponibles",
          subtitle: "No hay información para mostrar en este momento.",
          suggestions: [],
          actions: [
            {
              label: "🔄 Actualizar",
              onClick: onRefresh,
              variant: "primary"
            }
          ]
        };
    }
  };

  const config = getEmptyStateConfig();

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-center max-w-md mx-auto">
        {/* Icono principal */}
        <div className="text-6xl mb-6 opacity-60">
          {config.icon}
        </div>

        {/* Título y subtítulo */}
        <h2 className="text-2xl font-bold text-gray-800 mb-3">
          {config.title}
        </h2>
        <p className="text-gray-600 mb-6 leading-relaxed">
          {config.subtitle}
        </p>

        {/* Sugerencias */}
        {config.suggestions.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
              💡 Sugerencias:
            </h4>
            <ul className="text-blue-700 text-sm space-y-1">
              {config.suggestions.map((suggestion, index) => (
                <li key={index}>{suggestion}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {config.actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                action.variant === "primary"
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Información adicional para filtros activos */}
        {hasFiltersActive && type === "filtered" && (
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            <strong>Filtros activos:</strong> Algunos criterios de búsqueda están aplicados
          </div>
        )}
      </div>

      {/* Decoración de fondo sutil */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-100 rounded-full opacity-20 transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-green-100 rounded-full opacity-20 transform translate-x-1/2 translate-y-1/2"></div>
      </div>
    </div>
  );
};

// Variantes predefinidas para casos específicos
export const EmptyStateNoBookings = ({ onRefresh }) => (
  <EmptyState type="no-bookings" onRefresh={onRefresh} />
);

export const EmptyStateFiltered = ({ onRefresh, onClearFilters }) => (
  <EmptyState 
    type="filtered" 
    onRefresh={onRefresh} 
    onClearFilters={onClearFilters}
    hasFiltersActive={true}
  />
);

export const EmptyStateError = ({ onRefresh }) => (
  <EmptyState type="loading-error" onRefresh={onRefresh} />
);

export const EmptyStateCompleted = ({ onRefresh }) => (
  <EmptyState type="all-completed" onRefresh={onRefresh} />
);

export default EmptyState;