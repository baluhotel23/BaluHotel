const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  sequelize.define("Room", {
    roomNumber: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    description: {
      type: DataTypes.TEXT,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    available: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isPromo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    promotionPrice: {
      type: DataTypes.DECIMAL(10, 2),
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    image_url: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.ENUM,
      values: ["Limpia", "Ocupada", "Mantenimiento", "Reservada"],
      
    },
    service: {
      type: DataTypes.ENUM,
      values: [
        "Disponibilidad de cunas",
        "Kit de amenities",
        "Tina",
        "Selección de almohadas",
        "Televisión por cable",
        "Canales internacionales",
        "Caja fuerte digital",
        "Disponibilidad de cama adicional",
        "Internet inalámbrico gratuito (Wi-fi)",
        "Secador de pelo",
        "Minibar",
        "Pantuflas (zapatillas)",
        "Ducha",
        "Área de estar",
      ],
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  });
};
