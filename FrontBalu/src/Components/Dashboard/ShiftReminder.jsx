import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getCurrentShift } from '../../Redux/Actions/shiftActions';
import { toast } from 'react-toastify';

/**
 * Componente que muestra un recordatorio para abrir turno
 * Solo para usuarios con rol 'recept'
 */
const ShiftReminder = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const { currentShift } = useSelector(state => state.shift || { currentShift: null });
  const [hasChecked, setHasChecked] = useState(false);
  const [reminderShown, setReminderShown] = useState(false);

  const handleGoToShifts = () => {
    navigate('/admin/rooms-dashboard');
  };

  const showReminderToast = () => {
    toast.warning(
      <div onClick={handleGoToShifts} className="cursor-pointer">
        <div className="font-bold mb-1">💼 Recordatorio de Turno</div>
        <div className="text-sm mb-2">
          No tienes un turno abierto. Recuerda abrir tu turno para registrar ventas.
        </div>
        <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded inline-block">
          👆 Click aquí para ir al panel de turnos
        </div>
      </div>,
      {
        position: "top-center",
        autoClose: 8000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        onClick: handleGoToShifts,
        className: 'shift-reminder-toast',
        style: {
          background: '#FEF3C7',
          color: '#92400E',
          border: '2px solid #F59E0B',
          cursor: 'pointer'
        }
      }
    );
  };

  useEffect(() => {
    // Solo ejecutar para usuarios recepcionistas
    if (!user || user.role !== 'recept') {
      return;
    }

    // Solo verificar una vez por sesión
    if (hasChecked || reminderShown) {
      return;
    }

    // Verificar si ya se mostró el recordatorio en esta sesión
    const shownInSession = sessionStorage.getItem('shiftReminderShown');
    if (shownInSession === 'true') {
      setReminderShown(true);
      return;
    }

    // Verificar si hay un turno activo
    const checkShift = async () => {
      try {
        await dispatch(getCurrentShift());
        setHasChecked(true);

        // Esperar un momento para que el estado se actualice
        setTimeout(() => {
          // Si ya hay un turno abierto, no mostrar recordatorio
          if (currentShift && currentShift.status === 'open') {
            console.log('✅ [SHIFT-REMINDER] Turno ya está abierto, no mostrar recordatorio');
            setReminderShown(true);
            sessionStorage.setItem('shiftReminderShown', 'true');
            return;
          }

          // Si no hay turno, mostrar recordatorio
          console.log('⚠️ [SHIFT-REMINDER] No hay turno abierto, mostrando recordatorio');
          showReminderToast();
          setReminderShown(true);
          sessionStorage.setItem('shiftReminderShown', 'true');
        }, 500);
      } catch (error) {
        console.log('📋 [SHIFT-REMINDER] Error al verificar turno (normal si no hay turno):', error);
        setHasChecked(true);
        setTimeout(() => {
          // Mostrar recordatorio si hay error (probablemente no hay turno)
          console.log('⚠️ [SHIFT-REMINDER] No se pudo verificar turno, mostrando recordatorio');
          showReminderToast();
          setReminderShown(true);
          sessionStorage.setItem('shiftReminderShown', 'true');
        }, 500);
      }
    };

    checkShift();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hasChecked, reminderShown, dispatch, currentShift]);

  // Este componente no renderiza nada visible
  return null;
};

export default ShiftReminder;
