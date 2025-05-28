import React from 'react';
import { FaLock } from 'react-icons/fa';

const LockedContent = () => (
  <div className="flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow p-6">
    <div className="text-gray-400 text-5xl mb-4">
      <FaLock />
    </div>
    <h3 className="text-xl font-medium text-gray-700 mb-2">This section is locked</h3>
    <p className="text-gray-500 text-center max-w-md">
      This content is only available after your shop has been approved.
      Please complete your profile information in the Settings section.
    </p>
  </div>
);

export default LockedContent;