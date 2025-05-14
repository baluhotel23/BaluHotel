import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
// *** 1. Importa la acción deleteOrderDetail ***
import { fetchAllOrders, fetchOrdersByIdOrder, deleteOrderDetail } from "../../Redux/Actions/actions";
import Swal from "sweetalert2";

const OrdenesPendientes = ({ filterType, mode, onSelectOrder }) => {
  const [expandedOrder, setExpandedOrder] = useState(null);
  const dispatch = useDispatch();
  const { orders, loading, error } = useSelector((state) => state.ordersGeneral);
  const [hoveredOrderId, setHoveredOrderId] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [currentOrderDetail, setCurrentOrderDetail] = useState(null);

  useEffect(() => {
    dispatch(fetchAllOrders());
  }, [dispatch]);

  const handleSelectOrder = (orderId) => {
    if (onSelectOrder) {
      onSelectOrder(orderId);
    }
  };

  const handleMouseEnter = async (id_orderDetail, event) => {
    // ... (código existente de handleMouseEnter) ...
    try {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left,
        y: rect.bottom + window.scrollY + 5,
      });
      setHoveredOrderId(id_orderDetail);
      setCurrentOrderDetail(null);

      const result = await dispatch(fetchOrdersByIdOrder(id_orderDetail));
      console.log("Fetched order details for tooltip:", result);

      if (result) {
        setCurrentOrderDetail(result);
      } else {
        const existingOrder = orders.find((o) => o.id_orderDetail === id_orderDetail);
        setCurrentOrderDetail(existingOrder || null);
      }
    } catch (error) {
      console.error("Error en handleMouseEnter:", error);
      setCurrentOrderDetail(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredOrderId(null);
    setCurrentOrderDetail(null);
  };

  // *** 2. Función para manejar la eliminación ***
  const handleDeleteOrder = async (id_orderDetail) => {
    const result = await Swal.fire({
      title: "¿Estás seguro?",
      text: `Esta acción borrará la orden N° ${id_orderDetail} definitivamente. ¡No podrás revertir esto!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Sí, ¡bórrala!",
      cancelButtonText: "Cancelar",
    });

    if (result.isConfirmed) {
      try {
        // Despacha la acción para borrar la orden
        await dispatch(deleteOrderDetail(id_orderDetail)); // Llama a la acción importada
        Swal.fire({
           title: "¡Borrada!",
           text: `La orden N° ${id_orderDetail} ha sido eliminada.`,
           icon: "success",
           timer: 1500, // Cierra automáticamente después de 1.5 segundos
           showConfirmButton: false
        });
        // La lista se actualizará automáticamente porque el reducer modifica el estado 'orders'
      } catch (deleteError) {
        // El error ya fue re-lanzado desde la acción, lo capturamos aquí
        console.error("Error al borrar la orden (capturado en componente):", deleteError);
        Swal.fire(
          "Error",
          deleteError.message || "No se pudo borrar la orden. Por favor, inténtalo de nuevo.", // Muestra el mensaje de error de la acción
          "error"
        );
      }
    }
  };
  // ----------------------------------------------------

  // ... (código de loading, error, no orders) ...
  if (loading) {
    return <p className="text-center mt-4">Cargando órdenes...</p>;
  }

  if (error) {
    // Muestra el error general de carga, no el de borrado que se maneja en handleDeleteOrder
    return (
      <p className="text-center mt-4 text-red-500">
        Error al cargar órdenes: {typeof error === 'string' ? error : 'Error desconocido'}
      </p>
    );
  }

  if (!orders || orders.length === 0) {
    return <p className="text-center mt-4">No hay órdenes disponibles.</p>;
  }


  let filteredOrders = orders;
  if (filterType === "facturablesPendientes") {
    filteredOrders = orders.filter(
      (order) =>
        order.isFacturable && order.status?.trim().toLowerCase() === "pendiente"
    );
  }

  // *** 3. Añadir el botón de borrar en renderActions ***
  const renderActions = (order) => {
    return (
      <div className="flex space-x-2"> {/* Contenedor flex para los botones */}
        {mode === "billingForm" && (
          <button
            onClick={() => handleSelectOrder(order.n_document)}
            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
          >
            Doc
          </button>
        )}
        {mode === "invoice" && (
          <button
            onClick={() => handleSelectOrder(order.id_orderDetail)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs"
          >
            Orden
          </button>
        )}
        {/* Botón de Borrar */}
        <button
          onClick={() => handleDeleteOrder(order.id_orderDetail)} // Llama a la función de borrado
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
          title="Borrar Orden"
        >
          Borrar
        </button>
      </div>
    );
  };
  // ----------------------------------------------------

  return (
    <div className="bg-colorFooter relative">
      <div className="container mx-auto px-4 py-8 mt-10">
        <h2 className="text-2xl font-semibold mb-4 font-nunito text-gray-900 bg-white p-2 rounded">
          Lista de Pedidos
        </h2>

        <div
          className="overflow-x-auto shadow-md sm:rounded-lg"
          style={{ maxHeight: "500px" }}
        >
          <table className="min-w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-500">
              <tr>
                <th scope="col" className="px-6 py-3">N° Pedido</th>
                <th scope="col" className="px-6 py-3">Fecha</th>
                <th scope="col" className="px-6 py-3">Cantidad</th>
                <th scope="col" className="px-6 py-3">Monto</th>
                <th scope="col" className="px-6 py-3">Documento Cliente</th>
                <th scope="col" className="px-6 py-3">Punto de Venta</th>
                <th scope="col" className="px-6 py-3">Estado</th>
                <th scope="col" className="px-6 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.id_orderDetail}
                  className="bg-white border-b text-black hover:bg-gray-100"
                  onMouseEnter={(event) =>
                    handleMouseEnter(order.id_orderDetail, event)
                  }
                  onMouseLeave={handleMouseLeave}
                >
                  <td className="px-6 py-4 font-medium text-black">
                    {order.id_orderDetail}
                  </td>
                  <td className="px-6 py-4">{order.date}</td>
                  <td className="px-6 py-4">{order.quantity}</td>
                  <td className="px-6 py-4">${order.amount?.toLocaleString('es-CO')}</td>
                  <td className="px-6 py-4">{order.n_document}</td>
                  <td className="px-6 py-4">{order.pointOfSale}</td>
                  <td className="px-6 py-4">{order.state_order}</td>
                  {/* Celda para las acciones */}
                  <td className="px-6 py-4">{renderActions(order)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tooltip JSX (sin cambios) */}
      {hoveredOrderId && currentOrderDetail && (
         <div
           className="absolute bg-gray-800 text-white p-4 rounded shadow-lg z-50 max-w-xs text-xs"
           style={{
             left: `${tooltipPosition.x}px`,
             top: `${tooltipPosition.y}px`,
             pointerEvents: "none",
           }}
         >
           <h4 className="font-bold mb-2 border-b pb-1">
             Detalle Pedido: {hoveredOrderId}
           </h4>
           {currentOrderDetail.userData ? (
             <p className="mb-1">
               Cliente: {currentOrderDetail.userData.first_name}{" "}
               {currentOrderDetail.userData.last_name} (
               {currentOrderDetail.n_document})
             </p>
           ) : (
             <p className="mb-1">Cliente: (No disponible)</p>
           )}
           <h5 className="font-semibold mt-2 mb-1">Productos:</h5>
           {currentOrderDetail.products &&
           currentOrderDetail.products.length > 0 ? (
             <ul className="list-disc list-inside space-y-1">
               {currentOrderDetail.products.map((product, index) => (
                 <li key={index}>
                   {product.description} (Cod: {product.codigoBarra})
                 </li>
               ))}
             </ul>
           ) : (
             <p>No hay detalles de productos.</p>
           )}
           {!currentOrderDetail.products && !currentOrderDetail.user_info && (
             <p>Cargando detalles...</p>
           )}
         </div>
       )}
    </div>
  );
};

export default OrdenesPendientes;