import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

const ApprovalPendingNotice = () => (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
    <div className="flex items-start">
      <div className="flex-shrink-0">
        <FaExclamationTriangle className="h-5 w-5 text-yellow-400" />
      </div>
      <div className="ml-3">
        <p className="text-sm text-yellow-700">
          <span className="font-medium">Your shop approval is pending.</span> Until your shop is approved, you can only access the Settings section.
        </p>
        <p className="mt-2 text-sm text-yellow-700">
          Please complete your profile information in Settings to help expedite the approval process.
        </p>
      </div>
    </div>
  </div>
);

export default ApprovalPendingNotice;