/**
 * Middleware phân quyền cho WAREHOUSE_MANAGER
 * Đảm bảo Warehouse Manager chỉ thao tác trên Hub được phân công (assignedHubId)
 */
exports.requireOwnHub = (req, res, next) => {
  const requestedHubId = req.body?.hubId || req.params?.hubId || req.query?.hubId;
  
  if (req.user && req.user.role === 'WAREHOUSE_MANAGER') {
    if (!req.user.assignedHubId) {
      return res.status(403).json({ message: 'Tài khoản Quản lý Kho chưa được gán bưu cục/kho phụ trách' });
    }

    if (requestedHubId && req.user.assignedHubId.toString() !== requestedHubId.toString()) {
      return res.status(403).json({ message: 'Không có quyền thao tác trên bưu cục/kho này' });
    }
  }

  next();
};
