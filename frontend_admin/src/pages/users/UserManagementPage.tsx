import React, { useState } from 'react';
import { UserSecurityControl } from '../../components/admin/UserSecurityControl';
import { INITIAL_USERS } from '../../mockData';
import type { UserAccount } from '../../types';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);

  const handleToggleLock = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              isActive: !u.isActive,
              failedLoginAttempts: u.isActive ? 5 : 0,
            }
          : u
      )
    );
  };

  const handleCreateUser = (newUser: Partial<UserAccount>) => {
    const created: UserAccount = {
      id: `USR-${Date.now()}`,
      fullName: newUser.fullName || 'Người dùng mới',
      email: newUser.email || 'user@elogistic.vn',
      phoneNumber: newUser.phoneNumber || '0900000000',
      role: newUser.role || 'SELLER',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date().toISOString().substring(0, 10),
    };
    setUsers([created, ...users]);
  };

  return (
    <div className="space-y-6">
      <UserSecurityControl
        users={users}
        onToggleLock={handleToggleLock}
        onCreateUser={handleCreateUser}
      />
    </div>
  );
};
