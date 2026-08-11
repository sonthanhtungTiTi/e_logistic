import React from 'react';
import { OperationsOverview } from '../../components/admin/OperationsOverview';
import { INITIAL_ORDERS, INITIAL_USERS, INITIAL_AUDIT_LOGS } from '../../mockData';

export const OperationsDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <OperationsOverview
        orders={INITIAL_ORDERS}
        users={INITIAL_USERS}
        auditLogs={INITIAL_AUDIT_LOGS}
      />
    </div>
  );
};
