const TICKET_STATUS = {
  NEW: 'NEW',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_USER: 'WAITING_USER',
  ESCALATED: 'ESCALATED',
  PENDING_REFUND: 'PENDING_REFUND',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
  REOPENED: 'REOPENED',
};

const TRANSITIONS = {
  [TICKET_STATUS.NEW]: [TICKET_STATUS.ASSIGNED, TICKET_STATUS.CLOSED],
  [TICKET_STATUS.ASSIGNED]: [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.NEW, TICKET_STATUS.ESCALATED],
  [TICKET_STATUS.IN_PROGRESS]: [
    TICKET_STATUS.WAITING_USER,
    TICKET_STATUS.ESCALATED,
    TICKET_STATUS.PENDING_REFUND,
    TICKET_STATUS.RESOLVED,
  ],
  [TICKET_STATUS.WAITING_USER]: [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.CLOSED],
  [TICKET_STATUS.ESCALATED]: [TICKET_STATUS.IN_PROGRESS, TICKET_STATUS.PENDING_REFUND, TICKET_STATUS.RESOLVED],
  [TICKET_STATUS.PENDING_REFUND]: [TICKET_STATUS.RESOLVED, TICKET_STATUS.IN_PROGRESS],
  [TICKET_STATUS.RESOLVED]: [TICKET_STATUS.CLOSED, TICKET_STATUS.REOPENED],
  [TICKET_STATUS.REOPENED]: [TICKET_STATUS.IN_PROGRESS],
  [TICKET_STATUS.CLOSED]: [], // Terminal state
};

// Transition Role Permissions: Map "FROM->TO" => Allowed Roles
const ALLOWED_TRANSITION_ROLES = {
  'NEW->ASSIGNED': ['CS', 'CUSTOMER_SERVICE', 'ADMIN'],
  'NEW->CLOSED': ['CS', 'CUSTOMER_SERVICE', 'ADMIN'],
  'ASSIGNED->IN_PROGRESS': ['CS', 'CUSTOMER_SERVICE', 'ADMIN'],
  'ASSIGNED->NEW': ['CS', 'CUSTOMER_SERVICE', 'ADMIN'], // Unassign
  'ASSIGNED->ESCALATED': ['CS', 'CUSTOMER_SERVICE', 'ADMIN'],
  'IN_PROGRESS->WAITING_USER': ['CS', 'CUSTOMER_SERVICE', 'ADMIN'],
  'IN_PROGRESS->ESCALATED': ['CS', 'CUSTOMER_SERVICE', 'ADMIN'],
  'IN_PROGRESS->PENDING_REFUND': ['CS', 'CUSTOMER_SERVICE', 'ADMIN'],
  'IN_PROGRESS->RESOLVED': ['CS', 'CUSTOMER_SERVICE', 'ADMIN'],
  'WAITING_USER->IN_PROGRESS': ['SELLER', 'BUYER', 'CS', 'CUSTOMER_SERVICE', 'ADMIN'],
  'WAITING_USER->CLOSED': ['CS', 'CUSTOMER_SERVICE', 'ADMIN', 'SYSTEM'],
  'ESCALATED->IN_PROGRESS': ['HUB_COORDINATOR', 'DRIVER_MANAGER', 'LAST_MILE_DISPATCHER', 'CS', 'ADMIN'],
  'ESCALATED->PENDING_REFUND': ['HUB_COORDINATOR', 'DRIVER_MANAGER', 'CS', 'ADMIN'],
  'ESCALATED->RESOLVED': ['HUB_COORDINATOR', 'DRIVER_MANAGER', 'CS', 'ADMIN'],
  'PENDING_REFUND->RESOLVED': ['ACCOUNTANT', 'ADMIN', 'SYSTEM'],
  'PENDING_REFUND->IN_PROGRESS': ['ACCOUNTANT', 'ADMIN'],
  'RESOLVED->CLOSED': ['CS', 'CUSTOMER_SERVICE', 'ADMIN', 'SYSTEM'],
  'RESOLVED->REOPENED': ['SELLER', 'BUYER', 'CS', 'CUSTOMER_SERVICE', 'ADMIN'],
  'REOPENED->IN_PROGRESS': ['CS', 'CUSTOMER_SERVICE', 'ADMIN'],
};

/**
 * Validates whether a status transition is allowed for a given actor
 */
function canTransition(fromStatus, toStatus, actor) {
  if (!fromStatus || !toStatus) {
    return { ok: false, reason: 'Trạng thái bắt đầu và trạng thái đích không được để trống' };
  }

  if (fromStatus === toStatus) {
    return { ok: true, reason: 'Không có thay đổi trạng thái' };
  }

  const allowedNextStatuses = TRANSITIONS[fromStatus];
  if (!allowedNextStatuses || !allowedNextStatuses.includes(toStatus)) {
    return {
      ok: false,
      reason: `Không thể chuyển trạng thái ticket từ '${fromStatus}' sang '${toStatus}'`,
    };
  }

  if (actor) {
    const key = `${fromStatus}->${toStatus}`;
    const allowedRoles = ALLOWED_TRANSITION_ROLES[key] || ['ADMIN'];
    const actorRole = actor.role || 'SELLER';

    if (!allowedRoles.includes(actorRole) && actorRole !== 'ADMIN') {
      return {
        ok: false,
        reason: `Role '${actorRole}' không có quyền thực hiện chuyển trạng thái '${key}'`,
      };
    }
  }

  return { ok: true };
}

module.exports = {
  TICKET_STATUS,
  TRANSITIONS,
  ALLOWED_TRANSITION_ROLES,
  canTransition,
};
