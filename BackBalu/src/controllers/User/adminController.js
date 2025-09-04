const { User } = require('../../data');
const { CustomError } = require('../../middleware/error');
const { catchedAsync } = require('../../utils/catchedAsync');
const bcrypt = require('bcrypt');
const { Op } = require('sequelize'); // ⭐ AGREGAR ESTA LÍNEA FALTANTE

const getAllUsers = async (req, res) => {
    const users = await User.findAll({
        attributes: { exclude: ['password'] },
        order: [['createdAt', 'DESC']]
    });

    res.json({
        error: false,
        message: 'Usuarios recuperados exitosamente',
        data: users
    });
};

const createStaffUser = async (req, res) => {
  try {
    console.log('🔍 [CREATE-STAFF] Datos recibidos:', req.body);
    
    const { email, password, role, n_document, wdoctype, phone } = req.body;

    // ⭐ ROLES VÁLIDOS SEGÚN EL MODELO
    const validRoles = ['recept', 'admin', 'owner'];

    // ✅ VALIDACIÓN DE ROL
    if (!role || !validRoles.includes(role)) {
      console.log('❌ [CREATE-STAFF] Rol inválido:', { 
        received: role, 
        valid: validRoles 
      });
      
      return res.status(400).json({
        error: true,
        message: `Rol no válido. Roles permitidos: ${validRoles.join(', ')}`,
        received: role,
        valid: validRoles
      });
    }

    // ✅ VALIDACIONES ADICIONALES
    if (!email || !password || !n_document) {
      return res.status(400).json({
        error: true,
        message: 'Email, contraseña y número de documento son obligatorios'
      });
    }

    // ✅ VERIFICAR SI YA EXISTE
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          { n_document }
        ]
      }
    });

    if (existingUser) {
      return res.status(400).json({
        error: true,
        message: 'Ya existe un usuario con ese email o documento'
      });
    }

    // ✅ HASH DE CONTRASEÑA
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ CREAR USUARIO
    const userData = {
      n_document,
      email,
      password: hashedPassword,
      role,
      wdoctype: wdoctype || 'CC',
      phone: phone || null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    console.log('📝 [CREATE-STAFF] Creando usuario con datos:', {
      ...userData,
      password: '[HIDDEN]'
    });

    const newUser = await User.create(userData);

    console.log('✅ [CREATE-STAFF] Usuario creado exitosamente:', {
      n_document: newUser.n_document,
      email: newUser.email,
      role: newUser.role
    });

    res.status(201).json({
      error: false,
      message: 'Usuario staff creado exitosamente',
      data: {
        n_document: newUser.n_document,
        email: newUser.email,
        role: newUser.role,
        wdoctype: newUser.wdoctype,
        phone: newUser.phone,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      }
    });

  } catch (error) {
    console.error('❌ [CREATE-STAFF] Error completo:', error);
    
    // ✅ MANEJO DE ERRORES ESPECÍFICOS
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: true,
        message: 'Error de validación',
        details: error.errors.map(e => e.message)
      });
    }

    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: true,
        message: 'Email o documento ya existe'
      });
    }

    res.status(500).json({
      error: true,
      message: 'Error interno al crear usuario staff',
      details: error.message
    });
  }
};

const updateUser = async (req, res) => {
    const { n_document } = req.params;
    console.log("ID recibido para updateUser:", n_document);
    const { email, role, ...updateData } = req.body;

    const user = await User.findByPk(n_document);
    if (!user) {
        throw new CustomError('Usuario no encontrado', 404);
    }

    // Verificar email único si se está actualizando
    if (email && email !== user.email) {
        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            throw new CustomError('El correo ya está en uso', 400);
        }
    }

    // Validar rol si se está actualizando
    if (role && !['admin', 'recept'].includes(role)) {
        throw new CustomError('Rol no válido para staff', 400);
    }

    await user.update({
        ...updateData,
        email,
        role,
        updatedBy: req.user.id
    });

    const userResponse = { ...user.toJSON() };
    delete userResponse.password;

    res.json({
        error: false,
        message: 'Usuario actualizado exitosamente',
        data: userResponse
    });
};

const deactivateUser = async (req, res) => {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
        throw new CustomError('Usuario no encontrado', 404);
    }

    // Prevenir desactivación del usuario owner principal
    if (user.role === 'owner' && user.id === 1) {
        throw new CustomError('No se puede desactivar al usuario principal', 403);
    }

    await user.update({ 
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: req.user.id
    });

    res.json({
        error: false,
        message: 'Usuario desactivado exitosamente'
    });
};

module.exports = {
    getAllUsers,
    createStaffUser,
    updateUser,
    deactivateUser
};