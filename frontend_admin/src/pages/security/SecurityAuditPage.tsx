import React, { useState } from 'react';
import { AuditStreamViewer } from '../../components/admin/AuditStreamViewer';
import { AuditFilterBar } from '../../components/shared/AuditFilterBar';
import { INITIAL_AUDIT_LOGS } from '../../mockData';

export const SecurityAuditPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');

  const filteredLogs = INITIAL_AUDIT_LOGS.filter((log) => {
    const matchesSearch =
      log.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress.includes(searchTerm) ||
      log.note.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6">
      <AuditFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedAction={selectedAction}
        onActionChange={setSelectedAction}
      />
      <AuditStreamViewer logs={filteredLogs} />
    </div>
  );
};
