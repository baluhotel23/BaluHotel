const permisos = {
    Owner: {
      nombre: 'Dueño',
      permisos: [
        'gestionarUsuarios',
        'gestionarProductos',
        'verEstadisticas',
        'gestionarDescuentos',
        'gestionarInventario',
        'gestionarVentas',
        'gestionarCaja'
      ]
    },
    Admin: {
      nombre: 'Cajero',
      permisos: [
        'realizarVentas',
        'gestionarInventario',
        'verProductos',
        'generarRecibos'
      ]
    },
    Recept: {
      nombre: 'Distribuidor',
      permisos: [
        'verProductos',
        'realizarPedidos',
        'verPedidosPropios',
        'verPreferenciales'
      ]
    },
    Customer: {
      nombre: 'Cliente',
      permisos: [
        'verProductos',
        'realizarPedidos',
        'verPedidosPropios'
      ]
    }
  };
  
  const verificarRol = (rolesPermitidos) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ mensaje: 'No autorizado' });
      }
  
      if (!rolesPermitidos.includes(req.user.role)) {
        return res.status(403).json({ mensaje: 'Acceso denegado' });
      }
  
      next();
    };
  };
  
  const verificarPermiso = (permisoRequerido) => {
    return (req, res, next) => {
      const rolUsuario = req.user.role;
      const permisosUsuario = permisos[rolUsuario].permisos;
  
      if (!permisosUsuario.includes(permisoRequerido)) {
        return res.status(403).json({ mensaje: 'Permiso denegado' });
      }
  
      next();
    };
  };
  
  module.exports = { verificarRol, verificarPermiso, permisos };