const { User } = require('../../data');
const { CustomError } = require('../../middleware/error');
const { catchedAsync } = require('../../utils/catchedAsync');
const bcrypt = require('bcrypt');

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
    const { email, password, role, ...userData } = req.body;

    // Validar rol permitido
    const allowedRoles = ['admin', 'receptionist'];
    if (!allowedRoles.includes(role)) {
        throw new CustomError('Rol no válido para staff', 400);
    }

    // Verificar email único
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        throw new CustomError('El correo ya está registrado', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const newUser = await User.create({
        ...userData,
        email,
        password: hashedPassword,
        role,
        isActive: true,
        createdBy: req.user.id
    });

    // Remove password from response
    const userResponse = { ...newUser.toJSON() };
    delete userResponse.password;

    res.status(201).json({
        error: false,
        message: 'Usuario staff creado exitosamente',
        data: userResponse
    });
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