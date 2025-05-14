import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getRegistrationPasses,
  deleteRegistrationPass,
} from "../../Redux/Actions/registerActions";  

const RegistrationPassList = () => {
  const dispatch = useDispatch();
  const { registrationPasses } = useSelector((state) => state.registrationPasses);

  useEffect(() => {
    dispatch(getRegistrationPasses());
  }, [dispatch]);

  const handleDelete = (registrationNumber) => {
    dispatch(deleteRegistrationPass(registrationNumber));
  };

  return (
    <div>
      <h1>Lista de Registros de Pasajeros</h1>
      <ul>
        {registrationPasses.map((pass) => (
          <li key={pass.registrationNumber}>
            {pass.name} - {pass.nationality}
            <button onClick={() => handleDelete(pass.registrationNumber)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default RegistrationPassList;