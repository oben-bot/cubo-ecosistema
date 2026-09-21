import React from 'react';

const LayoutMain = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row">
          {children}
        </div>
      </div>
    </div>
  );
};

export default LayoutMain;