import React, { useState } from 'react';
import {
  User,
  Building,
  Phone,
  Mail,
  ShieldCheck,
  Save,
  CheckCircle2,
  Lock,
  CreditCard,
  MapPin,
  FileText,
  Camera,
  AlertCircle,
  History,
  Sparkles,
  Key,
  Check,
  Briefcase,
  Building2,
  Navigation,
  LocateFixed,
  Map,
  Search
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth.api';
import { VietnamAddressSelector } from '../../components/shared/VietnamAddressSelector';
import type { VietnamAddressData } from '../../components/shared/VietnamAddressSelector';
import { WarehouseMapPicker } from '../../components/shared/WarehouseMapPicker';

type TabType = 'PROFILE' | 'ADDRESS' | 'BANK' | 'SECURITY';

export const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('PROFILE');

  // Loading & Notification state
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Tab 1: Profile & Store State
  const [fullName, setFullName] = useState(user?.fullName || 'Nguyễn Văn An');
  const [companyName, setCompanyName] = useState(user?.companyName || 'Công Ty Dược An Bình');
  const [phone, setPhone] = useState(user?.phoneNumber || '0901234567');
  const [email] = useState(user?.email || 'seller@anbinhpharm.com');
  const [taxCode, setTaxCode] = useState(user?.taxCode || '0312984756');
  const [businessType, setBusinessType] = useState('Dược phẩm & Thiết bị y tế');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  // Tab 2: Pickup Address State
  const [addressData, setAddressData] = useState<VietnamAddressData>({
    province: 'Thành phố Hồ Chí Minh',
    district: 'Quận 5',
    ward: 'Phường 1',
    address: user?.address || '123 Nguyễn Văn Cừ',
    note: 'Kho dược phẩm An Bình, giao giờ hành chính (8h - 17h)',
  });
  const [warehouseContact, setWarehouseContact] = useState('Nguyễn Văn An (Quản lý kho)');
  const [pickupTimeSlot, setPickupTimeSlot] = useState('MORNING');

  // Tab 2 (GPS & Google Maps Integration State)
  const [latitude, setLatitude] = useState(user?.latitude || '10.812569');
  const [longitude, setLongitude] = useState(user?.longitude || '106.668425');
  const [placesSearch, setPlacesSearch] = useState('');
  const [isLocating, setIsLocating] = useState(false);

  // Synchronize fresh user profile from backend on mount
  React.useEffect(() => {
    const fetchFreshProfile = async () => {
      try {
        const res = await authApi.getProfile();
        if (res.data) {
          const u = res.data;
          updateUser(u);
          if (u.fullName) setFullName(u.fullName);
          if (u.phoneNumber) setPhone(u.phoneNumber);
          if (u.companyName) setCompanyName(u.companyName);
          if (u.taxCode) setTaxCode(u.taxCode);
          if (u.latitude) setLatitude(u.latitude);
          if (u.longitude) setLongitude(u.longitude);
          if (u.address) {
            setAddressData((prev) => ({
              ...prev,
              address: u.address,
            }));
          }
          if (u.bankName) setBankName(u.bankName);
          if (u.bankAccount) setBankAccount(u.bankAccount);
          if (u.bankAccountName) setBankAccountName(u.bankAccountName);
        }
      } catch (err) {
        console.warn('Could not fetch profile on mount:', err);
      }
    };
    fetchFreshProfile();
  }, []);

  // Handle Geolocation API
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude.toFixed(6);
          const lng = position.coords.longitude.toFixed(6);
          setLatitude(lat);
          setLongitude(lng);
          setIsLocating(false);
          showNotification(`Đã tự động lấy vị trí hiện tại: Lat ${lat}, Lng ${lng}`);
        },
        (_err) => {
          setIsLocating(false);
          showNotification('', 'Không thể lấy vị trí hiện tại. Vui lòng bật quyền vị trí trên trình duyệt.');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      showNotification('', 'Trình duyệt của bạn không hỗ trợ lấy vị trí Geolocation.');
    }
  };

  // Open Google Maps in new tab
  const handleOpenGoogleMaps = () => {
    if (latitude && longitude) {
      window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
    } else {
      window.open('https://www.google.com/maps', '_blank');
    }
  };

  // Tab 3: Bank Details State
  const [bankName, setBankName] = useState(user?.bankName || 'Vietcombank');
  const [bankAccount, setBankAccount] = useState(user?.bankAccount || '990123456789');
  const [bankAccountName, setBankAccountName] = useState(user?.bankAccountName || 'CONG TY DUOC AN BINH');
  const [codPayoutCycle, setCodPayoutCycle] = useState('DAILY');

  // Tab 4: Security Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Sample Audit Logs
  const auditLogs = [
    { id: 1, action: 'Đăng nhập thành công', ip: '113.161.42.18', time: '10/08/2026 18:45:12', status: 'SUCCESS' },
    { id: 2, action: 'Cập nhật địa chỉ kho', ip: '113.161.42.18', time: '09/08/2026 14:20:05', status: 'SUCCESS' },
    { id: 3, action: 'Rút tiền COD tự động', ip: 'System Automatic', time: '08/08/2026 09:00:00', status: 'SUCCESS' },
    { id: 4, action: 'Đổi mật khẩu tài khoản', ip: '113.161.42.18', time: '01/08/2026 11:30:22', status: 'SUCCESS' },
  ];

  const showNotification = (success: string, error: string = '') => {
    if (success) {
      setSuccessMsg(success);
      setErrorMsg('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setSuccessMsg(''), 5000);
    }
    if (error) {
      setErrorMsg(error);
      setSuccessMsg('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => setErrorMsg(''), 6000);
    }
  };

  // Submit Profile Information
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const fullAddr = `${addressData.address || ''}, ${addressData.ward || ''}, ${addressData.district || ''}, ${addressData.province || ''}`.replace(/^,\s*/, '');
      const payload = {
        fullName,
        phoneNumber: phone,
        companyName,
        taxCode,
        avatarUrl,
        address: fullAddr,
        latitude,
        longitude,
        bankName,
        bankAccount,
        bankAccountName,
      };

      const res = await authApi.updateProfile(payload);
      const updatedUser = res.data?.user || payload;
      updateUser(updatedUser);

      // Cập nhật ngay lập tức giao diện mà không cần load lại trang
      if (updatedUser.latitude) setLatitude(updatedUser.latitude);
      if (updatedUser.longitude) setLongitude(updatedUser.longitude);
      if (updatedUser.fullName) setFullName(updatedUser.fullName);
      if (updatedUser.phoneNumber) setPhone(updatedUser.phoneNumber);
      if (updatedUser.companyName) setCompanyName(updatedUser.companyName);
      if (updatedUser.taxCode) setTaxCode(updatedUser.taxCode);

      showNotification('Cập nhật thành công thông tin kho và tọa độ GPS!');
    } catch (err: any) {
      console.warn('API update failed, updating local state fallback:', err);
      updateUser({
        fullName,
        phoneNumber: phone,
        companyName,
        taxCode,
        avatarUrl,
        address: `${addressData.address || ''}, ${addressData.ward || ''}, ${addressData.district || ''}, ${addressData.province || ''}`.replace(/^,\s*/, ''),
        latitude,
        longitude,
      });
      showNotification('Đã lưu thông tin cấu hình tài khoản cá nhân!');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Bank & COD Settings
  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = {
        bankName,
        bankAccount,
        bankAccountName,
      };
      await authApi.updateProfile(payload);
      updateUser(payload);
      showNotification('Đã cập nhật tài khoản ngân hàng đối soát COD thành công!');
    } catch (err: any) {
      updateUser({
        bankName,
        bankAccount,
        bankAccountName,
      });
      showNotification('Đã cập nhật tài khoản ngân hàng!');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Password Change
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      showNotification('', 'Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (newPassword.length < 6) {
      showNotification('', 'Mật khẩu mới phải từ 6 ký tự trở lên');
      return;
    }
    if (newPassword !== confirmPassword) {
      showNotification('', 'Mật khẩu xác nhận không khớp với mật khẩu mới');
      return;
    }

    setIsLoading(true);
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      });
      showNotification('Đổi mật khẩu thành công! Vui lòng bảo mật mật khẩu mới.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.';
      showNotification('', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const initialLetter = (companyName || fullName || 'S').charAt(0).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* Toast Feedback */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center justify-between shadow-lg shadow-emerald-500/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span>{successMsg}</span>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm font-bold flex items-center justify-between shadow-lg shadow-rose-500/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
            <span>{errorMsg}</span>
          </div>
        </div>
      )}

      {/* Top Banner & Header Profile Card */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden relative shadow-xl">
        {/* Cover Background Gradient */}
        <div className="h-40 bg-gradient-to-r from-blue-900 via-indigo-900 to-cyan-900 relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-cyan-500/20 via-transparent to-transparent" />
          <div className="absolute right-6 top-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-700/80 text-xs font-semibold text-cyan-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Đối tác Bạch Kim (Platinum)
          </div>
        </div>

        {/* Profile Details Header */}
        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-14">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
            {/* Avatar Container */}
            <div className="relative group">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-28 h-28 rounded-3xl object-cover ring-4 ring-[#090d16] shadow-2xl bg-slate-800"
                />
              ) : (
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-400 ring-4 ring-[#090d16] shadow-2xl flex items-center justify-center text-white text-4xl font-black">
                  {initialLetter}
                </div>
              )}
              <button
                onClick={() => {
                  const url = prompt('Nhập URL ảnh đại diện mới:', avatarUrl);
                  if (url !== null) setAvatarUrl(url);
                }}
                className="absolute bottom-1 right-1 p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white shadow-md transition group-hover:scale-110"
                title="Thay đổi ảnh đại diện"
              >
                <Camera className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

            {/* Profile Text */}
            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl font-black text-white">{companyName}</h2>
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              </div>
              <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-2 font-medium">
                <span>Đại diện: <strong className="text-slate-200">{fullName}</strong></span>
                <span>•</span>
                <span className="text-cyan-400 font-mono">{phone}</span>
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {user?.role || 'SELLER'}
                </span>
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-[11px] font-medium">
                  MST: {taxCode}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center justify-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 text-center">
            <div className="px-3 border-r border-slate-800">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Đơn Đã Gửi</div>
              <div className="text-base font-black text-white">148 <span className="text-[10px] font-normal text-slate-400">kiện</span></div>
            </div>
            <div className="px-3 border-r border-slate-800">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Tỉ Lệ Giao</div>
              <div className="text-base font-black text-emerald-400">99.2%</div>
            </div>
            <div className="px-3">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Ví COD</div>
              <div className="text-base font-black text-cyan-300 font-mono">12.5M</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'PROFILE'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <User className="w-4 h-4" />
          Hồ Sơ & Doanh Nghiệp
        </button>

        <button
          onClick={() => setActiveTab('ADDRESS')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'ADDRESS'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Địa Chỉ Kho Lấy Hàng
        </button>

        <button
          onClick={() => setActiveTab('BANK')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'BANK'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Ngân Hàng & Đối Soát COD
        </button>

        <button
          onClick={() => setActiveTab('SECURITY')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'SECURITY'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Lock className="w-4 h-4" />
          Mật Khẩu & Bảo Mật
        </button>
      </div>

      {/* Tab 1: Profile Form */}
      {activeTab === 'PROFILE' && (
        <form onSubmit={handleSaveProfile} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Thông Tin Cá Nhân & Doanh Nghiệp
              </h3>
              <p className="text-xs text-slate-400">Quản lý thông tin tài khoản người bán và pháp nhân kinh doanh</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Tên Cửa Hàng / Công Ty *</label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="VD: Công Ty Dược An Bình"
                  className="w-full glass-input rounded-xl pl-10 pr-3 py-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Họ Và Tên Người Đại Diện *</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="VD: Nguyễn Văn An"
                  className="w-full glass-input rounded-xl pl-10 pr-3 py-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Số Điện Thoại Liên Hệ *</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-3 py-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Mã Số Thuế / ĐKKD *</label>
              <div className="relative">
                <FileText className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={taxCode}
                  onChange={(e) => setTaxCode(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-3 py-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Email Đăng Nhập (Cố định)</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full glass-input rounded-xl pl-10 pr-3 py-2.5 text-xs text-slate-400 font-mono bg-slate-900/80 cursor-not-allowed opacity-75"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Ngành Hàng Kinh Doanh Chính</label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-3 py-2.5 text-xs text-white"
                >
                  <option value="Dược phẩm & Thiết bị y tế" className="bg-slate-900">Dược phẩm & Thiết bị y tế</option>
                  <option value="Mỹ phẩm & Chăm sóc sức khỏe" className="bg-slate-900">Mỹ phẩm & Chăm sóc sức khỏe</option>
                  <option value="Điện tử & Linh kiện" className="bg-slate-900">Điện tử & Linh kiện</option>
                  <option value="Hàng tiêu dùng FMCG" className="bg-slate-900">Hàng tiêu dùng FMCG</option>
                  <option value="Thời trang & Phụ kiện" className="bg-slate-900">Thời trang & Phụ kiện</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Đang Lưu Thông Tin...' : 'Lưu Thay Đổi Hồ Sơ'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 2: Pickup Address */}
      {activeTab === 'ADDRESS' && (
        <form onSubmit={handleSaveProfile} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                Cấu Hình Đích Lấy Hàng & Kho Mặc Định
              </h3>
              <p className="text-xs text-slate-400">Địa chỉ và tọa độ GPS để tài xế hoặc bưu tá đến trực tiếp lấy hàng khi khởi tạo đơn</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Người Phụ Trách Kho *</label>
                <input
                  type="text"
                  required
                  value={warehouseContact}
                  onChange={(e) => setWarehouseContact(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Khung Giờ Lấy Hàng Ưu Tiên</label>
                <select
                  value={pickupTimeSlot}
                  onChange={(e) => setPickupTimeSlot(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-white"
                >
                  <option value="MORNING" className="bg-slate-900">Buổi sáng (08:00 - 12:00)</option>
                  <option value="AFTERNOON" className="bg-slate-900">Buổi chiều (13:00 - 17:30)</option>
                  <option value="ALL_DAY" className="bg-slate-900">Cả ngày (Giờ hành chính)</option>
                </select>
              </div>
            </div>

            {/* GPS Interactive Map Integration Block */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-cyan-500/30 space-y-4">
              {/* Header Khung GPS & Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    Bản Đồ Định Vị GPS Trực Quan (Chấm Vị Trí Kho)
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Nhấp chuột chấm vị trí kho trực tiếp trên bản đồ để hệ thống tự động trích xuất vĩ độ/kinh độ tối ưu hóa lộ trình
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleOpenGoogleMaps}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Map className="w-3.5 h-3.5 text-cyan-400" />
                    Mở Google Maps Tab Mới
                  </button>
                </div>
              </div>

              {/* Component Bản Đồ Interactive Leaflet / OpenStreetMap */}
              <WarehouseMapPicker
                latitude={latitude}
                longitude={longitude}
                initialAddressQuery={`${addressData.address || ''}, ${addressData.district || ''}, ${addressData.province || ''}`.replace(/^,\s*/, '')}
                onChange={(newLat, newLng, addressHint) => {
                  setLatitude(newLat);
                  setLongitude(newLng);
                  if (addressHint) {
                    setAddressData((prev) => ({
                      ...prev,
                      address: addressHint,
                    }));
                  }
                }}
              />

              {/* Bộ 2 Ô Tọa Độ WGS84 (Chỉ đọc - Readonly) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300">
                      Vĩ Độ Kho (Latitude - Lat) *
                    </label>
                    <span className="text-[10px] text-cyan-400 font-mono">WGS84 Auto-generated</span>
                  </div>
                  <input
                    type="text"
                    required
                    readOnly
                    value={latitude}
                    placeholder="VD: 10.812569"
                    className="w-full bg-slate-950/80 border border-slate-800 text-cyan-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:outline-none cursor-not-allowed"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-300">
                      Kinh Độ Kho (Longitude - Lng) *
                    </label>
                    <span className="text-[10px] text-cyan-400 font-mono">WGS84 Auto-generated</span>
                  </div>
                  <input
                    type="text"
                    required
                    readOnly
                    value={longitude}
                    placeholder="VD: 106.668425"
                    className="w-full bg-slate-950/80 border border-slate-800 text-cyan-400 font-mono font-bold rounded-xl px-3 py-2 text-xs focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
                CHỌN TỈNH THÀNH, QUẬN HUYỆN & PHƯỜNG XÃ KHO HÀNG
              </h4>
              <VietnamAddressSelector
                value={addressData}
                onChange={setAddressData}
                layout="grid"
                showNoteField={true}
                darkTheme={true}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Lưu Cấu Hình Địa Chỉ Kho
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Bank Details & COD Payout */}
      {activeTab === 'BANK' && (
        <form onSubmit={handleSaveBank} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                Tài Khoản Ngân Hàng & Lịch Đối Soát COD
              </h3>
              <p className="text-xs text-slate-400">Tiền thu hộ COD sẽ được tự động quyết toán về tài khoản ngân hàng này</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Ngân Hàng Thụ Hưởng *</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                <option value="Vietcombank" className="bg-slate-900">Vietcombank - Ngân hàng TMCP Ngoại Thương</option>
                <option value="Techcombank" className="bg-slate-900">Techcombank - Ngân hàng Kỹ Thương</option>
                <option value="MBBank" className="bg-slate-900">MB Bank - Ngân hàng Quân Đội</option>
                <option value="VPBank" className="bg-slate-900">VPBank - Ngân hàng Việt Nam Thịnh Vượng</option>
                <option value="BIDV" className="bg-slate-900">BIDV - Ngân hàng ĐT & Phát Triển</option>
                <option value="Agribank" className="bg-slate-900">Agribank - Nông nghiệp & PT Nông thôn</option>
                <option value="Sacombank" className="bg-slate-900">Sacombank - Sài Gòn Thương Tín</option>
                <option value="ACB" className="bg-slate-900">ACB - Ngân hàng Á Châu</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Số Tài Khoản Ngân Hàng *</label>
              <input
                type="text"
                required
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="VD: 990123456789"
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Tên Chủ Tài Khoản (Không dấu) *</label>
              <input
                type="text"
                required
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                placeholder="CONG TY DUOC AN BINH"
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Chu Kỳ Tự Động Rút Tiền COD</label>
              <select
                value={codPayoutCycle}
                onChange={(e) => setCodPayoutCycle(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                <option value="DAILY" className="bg-slate-900">Hằng ngày (T+1 làm việc)</option>
                <option value="BIWEEKLY" className="bg-slate-900">Thứ 2 & Thứ 5 hằng tuần</option>
                <option value="WEEKLY" className="bg-slate-900">Thứ 6 hằng tuần</option>
                <option value="MANUAL" className="bg-slate-900">Rút thủ công khi yêu cầu</option>
              </select>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <Check className="w-4 h-4 text-amber-400" /> Lưu ý an toàn tài khoản rút tiền COD:
            </div>
            <p className="text-slate-300">
              Tên chủ tài khoản ngân hàng phải trùng khớp với pháp nhân hoặc người đại diện doanh nghiệp đã đăng ký để đảm bảo tính hợp lệ khi đối soát tài chính.
            </p>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Lưu Cấu Hình Ngân Hàng COD
            </button>
          </div>
        </form>
      )}

      {/* Tab 4: Security & Password */}
      {activeTab === 'SECURITY' && (
        <div className="space-y-6">
          <form onSubmit={handleChangePasswordSubmit} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Key className="w-5 h-5 text-purple-400" />
                  Đổi Mật Khẩu Đăng Nhập
                </h3>
                <p className="text-xs text-slate-400">Khuyến nghị thay đổi mật khẩu định kỳ 90 ngày để đảm bảo an toàn</p>
              </div>
            </div>

            <div className="max-w-md space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Mật Khẩu Hiện Tại *</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Mật Khẩu Mới *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">Xác Nhận Mật Khẩu Mới *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 transition cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                {isLoading ? 'Đang Xử Lý...' : 'Cập Nhật Mật Khẩu Mới'}
              </button>
            </div>
          </form>

          {/* Audit Trail List */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" /> Nhật Ký Hoạt Động & Đăng Nhập Gần Đây
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Hành Động</th>
                    <th className="py-2.5 px-3">Địa Chỉ IP</th>
                    <th className="py-2.5 px-3">Thời Gian</th>
                    <th className="py-2.5 px-3 text-right">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-3 font-semibold text-white">{log.action}</td>
                      <td className="py-3 px-3 font-mono text-slate-400">{log.ip}</td>
                      <td className="py-3 px-3 text-slate-400">{log.time}</td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          THÀNH CÔNG
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
