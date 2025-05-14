import React, { useState } from "react";
import PropTypes from "prop-types";
import { useDispatch, useSelector } from "react-redux";
import { addExtraCharges } from "../../Redux/Actions/bookingActions";
import { toast } from "react-toastify";

const ExtraCharges = ({ bookingId, onAdded }) => {
  const dispatch = useDispatch();
  const [form, setForm] = useState({
    description: "",
    price: "",
    quantity: 1,
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.price || form.quantity <= 0) {
      toast.error("Completa todos los campos correctamente.");
      return;
    }
    setLoading(true);
    try {
      await dispatch(
        addExtraCharges(bookingId, {
          description: form.description,
          price: parseFloat(form.price),
          quantity: parseInt(form.quantity, 10),
        })
      );
      toast.success("Cargo extra agregado.");
      setForm({ description: "", price: "", quantity: 1 });
      if (onAdded) onAdded(); // Para refrescar la lista si lo necesitas
    } catch (err) {
      toast.error("Error al agregar el cargo extra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 mt-2">
      <div>
        <label className="block text-sm">Descripción</label>
        <input
          type="text"
          name="description"
          value={form.description}
          onChange={handleChange}
          className="border rounded px-2 py-1 w-full"
          required
        />
      </div>
      <div className="flex gap-2">
        <div>
          <label className="block text-sm">Precio</label>
          <input
            type="number"
            name="price"
            value={form.price}
            onChange={handleChange}
            className="border rounded px-2 py-1 w-full"
            min="0"
            step="0.01"
            required
          />
        </div>
        <div>
          <label className="block text-sm">Cantidad</label>
          <input
            type="number"
            name="quantity"
            value={form.quantity}
            onChange={handleChange}
            className="border rounded px-2 py-1 w-full"
            min="1"
            required
          />
        </div>
      </div>
      <button
        type="submit"
        className="bg-blue-600 text-white px-3 py-1 rounded mt-2"
        disabled={loading}
      >
        {loading ? "Agregando..." : "Agregar Cargo Extra"}
      </button>
    </form>
  );
};
ExtraCharges.propTypes = {
  bookingId: PropTypes.string.isRequired,
  onAdded: PropTypes.func,
};

export default ExtraCharges;
