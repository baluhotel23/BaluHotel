import React from 'react';
import DashboardNavbar from './DashboardNavbar';

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