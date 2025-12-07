const permisos = {
  owner: {
      nombre: 'Dueño',
      permisos: [
          'manageUsers',
          'manageRooms',
          'viewDashboard',
          'manageInventory',
          'manageExpenses',
          'managePurchases',
          'manageBookings',
          'managePayments',
          'generateReports',
          'managePromotions'
      ]
  },
  admin: {
      nombre: 'Administrativo',
      permisos: [
        // Admin solo puede ver - no gestionar
        'viewDashboard',
        'viewInventory',
        'viewExpenses',
        'viewPurchases',
        'viewReports',
        'viewBookings',
        'viewPayments',
        'viewShifts',
        'viewBalance',
      ]
  },
  receptionist: {
      nombre: 'Recepcionista',
      permisos: [
          'createBooking',
          'checkInGuest',
          'checkOutGuest',
          'manageExtraCharges',
          'viewRoomStatus',
          'processPayments',
          'viewBasicReports'
      ]
  },
  client: {
      nombre: 'Cliente',
      permisos: [
          'viewRooms',
          'createBooking',
          'viewOwnBookings',
          'viewPromotions'
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