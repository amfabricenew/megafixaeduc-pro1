import React from 'react';
import GmailInboxView from '../components/GmailInboxView';

export default function GmailPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <GmailInboxView />
    </div>
  );
}
