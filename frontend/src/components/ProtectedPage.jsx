import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

const ProtectedPage = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-950 flex transition-colors duration-200">
      {/* Sidebar navigation */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Backdrop cover for mobile drawer menu */}
      {sidebarOpen && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm lg:hidden"
        ></div>
      )}

      {/* Layout Content wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        <Header toggleSidebar={toggleSidebar} />
        
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto animate-[fadeIn_0.3s_ease-out_forwards]">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ProtectedPage;
