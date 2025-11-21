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
        // ⭐ VERIFICAR LOCALSTORAGE PRIMERO (más confiable con mala conexión)
        const cachedShift = localStorage.getItem('currentShift');
        const lastSync = localStorage.getItem('shiftLastSync');
        
        if (cachedShift && lastSync) {
          const timeSinceSync = Date.now() - parseInt(lastSync);
          // Si hay turno en caché reciente (menos de 5 minutos), confiar en él
          if (timeSinceSync < 300000) {
            const shift = JSON.parse(cachedShift);
            if (shift.status === 'open') {
              console.log('✅ [SHIFT-REMINDER] Turno encontrado en caché, no mostrar recordatorio');
              setHasChecked(true);
              setReminderShown(true);
              sessionStorage.setItem('shiftReminderShown', 'true');
              return;
            }
          }
        }

        // ⭐ VERIFICAR CON BACKEND (con reintento)
        const result = await dispatch(getCurrentShift());
        setHasChecked(true);

        // Esperar un momento para que el estado se actualice
        setTimeout(() => {
          // Si hay turno (de backend o caché), no mostrar recordatorio
          if ((result?.shift && result.shift.status === 'open') || 
              (currentShift && currentShift.status === 'open')) {
            console.log('✅ [SHIFT-REMINDER] Turno abierto confirmado, no mostrar recordatorio');
            setReminderShown(true);
            sessionStorage.setItem('shiftReminderShown', 'true');
            return;
          }

          // Si definitivamente no hay turno, mostrar recordatorio
          console.log('⚠️ [SHIFT-REMINDER] No hay turno abierto, mostrando recordatorio');
          showReminderToast();
          setReminderShown(true);
          sessionStorage.setItem('shiftReminderShown', 'true');
        }, 500);
      } catch (error) {
        console.log('📋 [SHIFT-REMINDER] Error al verificar turno:', error);
        setHasChecked(true);
        
        // ⭐ INTENTAR USAR CACHÉ COMO FALLBACK ANTES DE MOSTRAR ALARMA
        const cachedShift = localStorage.getItem('currentShift');
        if (cachedShift) {
          try {
            const shift = JSON.parse(cachedShift);
            if (shift.status === 'open') {
              console.log('📦 [SHIFT-REMINDER] Error de conexión pero hay turno en caché');
              setReminderShown(true);
              sessionStorage.setItem('shiftReminderShown', 'true');
              return;
            }
          } catch (parseError) {
            console.error('Error al parsear caché:', parseError);
          }
        }

        // Solo mostrar recordatorio si no hay caché y hubo error
        setTimeout(() => {
          console.log('⚠️ [SHIFT-REMINDER] No se pudo verificar turno y no hay caché');
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
