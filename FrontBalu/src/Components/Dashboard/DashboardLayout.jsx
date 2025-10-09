
import DashboardNavbar from './DashboardNavbar';

// eslint-disable-next-line react/prop-types
const DashboardLayout = ({ children }) => {
  return (
    <div>
      <DashboardNavbar />
      <div className="container mx-auto p-4">
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;