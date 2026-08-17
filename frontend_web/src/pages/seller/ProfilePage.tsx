import React, { useState, useEffect } from 'react';
import {
  User,
  ShieldCheck,
  Save,
  CheckCircle2,
  Lock,
  CreditCard,
  MapPin,
  Camera,
  AlertCircle,
  Sparkles,
  Key,
  Building2,
  Plus,
  Trash2,
  Bell,
  Users,
  Power,
  ShieldAlert,
  X,
  QrCode,
  UploadCloud,
  FileCheck,
} from 'lucide-react';
import { useLocation } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth.api';
import { sellerApi } from '../../api/seller.api';
import type { PickupAddressItem, KycDocItem, SubAccountItem } from '../../api/seller.api';
import { VietnamAddressSelector } from '../../components/shared/VietnamAddressSelector';
import type { VietnamAddressData } from '../../components/shared/VietnamAddressSelector';
import { WarehouseMapPicker } from '../../components/shared/WarehouseMapPicker';

type TabType = 'PROFILE' | 'ADDRESS' | 'BANK' | 'KYC' | 'NOTIFICATIONS' | 'SECURITY' | 'SUB_ACCOUNTS';

const PERMISSION_LABELS: Record<string, string> = {
  VIEW_ORDERS: 'Xem đơn hàng',
  MANAGE_ORDERS: 'Quản lý đơn hàng (Tạo/Hủy)',
  VIEW_FINANCE: 'Xem số dư ví & Báo cáo COD',
  MANAGE_FINANCE: 'Yêu cầu rút tiền COD',
  MANAGE_PRODUCTS: 'Quản lý kho & Sản phẩm',
  MANAGE_COMPLAINTS: 'Xử lý khiếu nại khách hàng',
};

export const ProfilePage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const location = useLocation();

  const getInitialTab = (): TabType => {
    if (location.state?.tab) return location.state.tab as TabType;
    const params = new URLSearchParams(location.search);
    const t = params.get('tab')?.toUpperCase() as TabType;
    if (['PROFILE', 'ADDRESS', 'BANK', 'KYC', 'NOTIFICATIONS', 'SECURITY', 'SUB_ACCOUNTS'].includes(t)) {
      return t;
    }
    return 'PROFILE';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab as TabType);
    }
  }, [location.state]);

  // General state
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Profile Form state
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [companyName, setCompanyName] = useState(user?.companyName || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [taxCode, setTaxCode] = useState(user?.taxCode || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');

  // 1. Pickup Addresses State
  const [pickupAddresses, setPickupAddresses] = useState<PickupAddressItem[]>([]);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState('');
  const [newAddressContactName, setNewAddressContactName] = useState('');
  const [newAddressContactPhone, setNewAddressContactPhone] = useState('');
  const [newAddressData, setNewAddressData] = useState<VietnamAddressData>({
    province: 'Thành phố Hồ Chí Minh',
    district: 'Quận 5',
    ward: 'Phường 1',
    address: '',
  });
  const [newAddressLat, setNewAddressLat] = useState('10.812569');
  const [newAddressLng, setNewAddressLng] = useState('106.668425');

  // 2. Bank Details State
  const [bankName, setBankName] = useState(user?.bankName || 'Vietcombank');
  const [bankAccount, setBankAccount] = useState(user?.bankAccount || '');
  const [bankAccountName, setBankAccountName] = useState(user?.bankAccountName || '');

  // 3. KYC Verification State
  const [kycStatus, setKycStatus] = useState<string>('NOT_SUBMITTED');
  const [kycDocs, setKycDocs] = useState<KycDocItem[]>([]);
  const [uploadDocType, setUploadDocType] = useState<string>('BUSINESS_LICENSE');
  const [uploadFileUrl, setUploadFileUrl] = useState<string>('');

  // 4. Notification Preferences State
  const [notifPreferences, setNotifPreferences] = useState<any>({
    NEW_ORDER: { email: true, sms: false, push: true },
    ORDER_FAILED: { email: true, sms: true, push: true },
    COD_SETTLED: { email: true, sms: false, push: true },
    COMPLAINT_RECEIVED: { email: true, sms: false, push: true },
    KYC_STATUS_CHANGED: { email: true, sms: false, push: true },
  });

  // 5. 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [totpInput, setTotpInput] = useState('');
  const [is2FASetupOpen, setIs2FASetupOpen] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [disable2FAPassword, setDisable2FAPassword] = useState('');
  const [isDisable2FAOpen, setIsDisable2FAOpen] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 6. Self Deactivation State
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [deactivateConfirmToken, setDeactivateConfirmToken] = useState('');
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [deactivateReason, setDeactivateReason] = useState('');

  // 7. Sub-Account State
  const [subAccounts, setSubAccounts] = useState<SubAccountItem[]>([]);
  const [isAddSubAccountOpen, setIsAddSubAccountOpen] = useState(false);
  const [subFullName, setSubFullName] = useState('');
  const [subEmail, setSubEmail] = useState('');
  const [subPhone, setSubPhone] = useState('');
  const [subPassword, setSubPassword] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(['VIEW_ORDERS']);

  // Fetch initial profile & data
  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    if (activeTab === 'ADDRESS') fetchAddresses();
    if (activeTab === 'KYC') fetchKyc();
    if (activeTab === 'NOTIFICATIONS') fetchNotificationPref();
    if (activeTab === 'SUB_ACCOUNTS') fetchSubAccounts();
  }, [activeTab]);

  const showFeedback = (msg: string, isErr = false) => {
    if (isErr) {
      setErrorMsg(msg);
      setSuccessMsg('');
    } else {
      setSuccessMsg(msg);
      setErrorMsg('');
    }
    setTimeout(() => {
      setSuccessMsg('');
      setErrorMsg('');
    }, 5000);
  };

  const fetchProfileData = async () => {
    try {
      const res = await authApi.getProfile();
      if (res.data) {
        const u = res.data;
        updateUser(u);
        setFullName(u.fullName || '');
        setCompanyName(u.companyName || '');
        setPhone(u.phoneNumber || '');
        setTaxCode(u.taxCode || '');
        setAvatarUrl(u.avatarUrl || '');
        setBankName(u.bankName || 'Vietcombank');
        setBankAccount(u.bankAccount || '');
        setBankAccountName(u.bankAccountName || '');
        setTwoFactorEnabled(!!u.twoFactorEnabled);
        setKycStatus(u.kycStatus || 'NOT_SUBMITTED');
      }
    } catch (e) {
      console.warn('Profile sync failed:', e);
    }
  };

  // API Callers
  const fetchAddresses = async () => {
    try {
      const res = await sellerApi.getPickupAddresses();
      setPickupAddresses(res.data || []);
    } catch (e: any) {
      console.warn('Addresses fetch failed:', e);
    }
  };

  const fetchKyc = async () => {
    try {
      const res = await sellerApi.getKycStatus();
      setKycStatus(res.data.kycStatus || 'NOT_SUBMITTED');
      setKycDocs(res.data.documents || []);
    } catch (e) {
      console.warn('KYC fetch failed:', e);
    }
  };

  const fetchNotificationPref = async () => {
    try {
      const res = await sellerApi.getNotificationPreferences();
      if (res.data?.preferences) {
        setNotifPreferences(res.data.preferences);
      }
    } catch (e) {
      console.warn('Notification pref fetch failed:', e);
    }
  };

  const fetchSubAccounts = async () => {
    try {
      const res = await sellerApi.listSubAccounts();
      setSubAccounts(res.data || []);
    } catch (e) {
      console.warn('Sub accounts fetch failed:', e);
    }
  };

  // Handlers
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = { fullName, companyName, phoneNumber: phone, taxCode, avatarUrl };
      await authApi.updateProfile(payload);
      updateUser(payload);
      showFeedback('Cập nhật hồ sơ thành công!');
    } catch (err: any) {
      showFeedback(err.response?.data?.message || 'Không thể cập nhật hồ sơ', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePickupAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressLabel || !newAddressData.address) {
      showFeedback('Vui lòng điền đầy đủ tên kho và địa chỉ chi tiết', true);
      return;
    }
    setIsLoading(true);
    try {
      await sellerApi.createPickupAddress({
        label: newAddressLabel,
        province: newAddressData.province,
        district: newAddressData.district,
        ward: newAddressData.ward,
        addressDetail: newAddressData.address,
        contactName: newAddressContactName || fullName,
        contactPhone: newAddressContactPhone || phone,
        latitude: parseFloat(newAddressLat) || 10.812569,
        longitude: parseFloat(newAddressLng) || 106.668425,
      });
      showFeedback('Thêm địa chỉ kho thành công!');
      setIsAddAddressOpen(false);
      setNewAddressLabel('');
      setNewAddressData({ province: 'Thành phố Hồ Chí Minh', district: 'Quận 5', ward: 'Phường 1', address: '' });
      fetchAddresses();
    } catch (err: any) {
      showFeedback(err.response?.data?.message || 'Không thể tạo địa chỉ kho mới', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      await sellerApi.setDefaultPickupAddress(id);
      showFeedback('Đã đặt làm kho lấy hàng mặc định!');
      fetchAddresses();
    } catch (err: any) {
      showFeedback(err.response?.data?.message || 'Lỗi khi đặt mặc định', true);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await sellerApi.deletePickupAddress(id);
      showFeedback('Đã xóa kho lấy hàng thành công!');
      fetchAddresses();
    } catch (err: any) {
      showFeedback(err.response?.data?.message || 'Không thể xóa kho', true);
    }
  };

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const payload = { bankName, bankAccount, bankAccountName };
      await authApi.updateProfile(payload);
      updateUser(payload);
      showFeedback('Cập nhật tài khoản ngân hàng đối soát COD thành công!');
    } catch (err: any) {
      showFeedback(err.response?.data?.message || 'Lỗi khi lưu tài khoản ngân hàng', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFileUrl) {
      showFeedback('Vui lòng nhập URL tài liệu / ảnh giấy tờ KYC', true);
      return;
    }
    setIsLoading(true);
    try {
      await sellerApi.submitKycDoc({
        documentType: uploadDocType,
        fileUrl: uploadFileUrl,
      });
      showFeedback('Đã gửi tài liệu KYC thành công. Đang chờ Admin phê duyệt!');
      setUploadFileUrl('');
      fetchKyc();
    } catch (err: any) {
      showFeedback(err.response?.data?.message || 'Không thể nộp hồ sơ KYC', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleNotif = async (eventType: string, channel: 'email' | 'sms' | 'push', currentVal: boolean) => {
    const newVal = !currentVal;
    setNotifPreferences((prev: any) => ({
      ...prev,
      [eventType]: {
        ...prev[eventType],
        [channel]: newVal,
      },
    }));
    try {
      await sellerApi.updateNotificationPreference({ eventType, channel, enabled: newVal });
    } catch (e) {
      console.warn('Failed to save notification pref:', e);
    }
  };

  // 2FA TOTP Handlers
  const handleStart2FASetup = async () => {
    try {
      const res = await sellerApi.setup2FA();
      setQrCodeUrl(res.data.qrCodeUrl);
      setManualKey(res.data.manualEntryKey);
      setIs2FASetupOpen(true);
    } catch (err: any) {
      showFeedback(err.response?.data?.message || 'Lỗi khởi tạo 2FA', true);
    }
  };

  const handleVerify2FA = async () => {
    if (!totpInput || totpInput.length < 6) {
      showFeedback('Vui lòng nhập đủ 6 chữ số TOTP', true);
      return;
    }
    try {
      const res = await sellerApi.verifyEnable2FA(totpInput);
      setBackupCodes(res.data.backupCodes || []);
      setTwoFactorEnabled(true);
      showFeedback('Kích hoạt Bảo mật 2 lớp (2FA) thành công!');
    } catch (err: any) {
      showFeedback(err.response?.data?.message || 'Mã 2FA không chính xác', true);
    }
  };

  const handleDisable2FA = async () => {
    if (!disable2FAPassword) {
      showFeedback('Vui lòng nhập mật khẩu xác nhận', true);
      return;
    }
    try {
      await sellerApi.disable2FA(disable2FAPassword);
      setTwoFactorEnabled(false);
      setIsDisable2FAOpen(false);
      setDisable2FAPassword('');
      showFeedback('Đã tắt Bảo mật 2FA thành công.');
    } catch (err: any) {
      showFeedback(err.response?.data?.message || 'Mật khẩu không chính xác', true);
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showFeedback('Mật khẩu mới phải từ 6 ký tự trở lên', true);
      return;
    }
    if (newPassword !== confirmPassword) {
      showFeedback('Mật khẩu xác nhận không khớp', true);
      return;
    }
    setIsLoading(true);
    try {
      await authApi.changePassword({ currentPassword, newPassword, confirmNewPassword: confirmPassword });
      showFeedback('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showFeedback(err.response?.data?.message || 'Lỗi đổi mật khẩu', true);
    } finally {
      setIsLoading(false);
    }
  };

  // Self Deactivation Handlers
  const handleRequestDeactivation = async () => {
    try {
      const res = await sellerApi.requestDeactivation();
      if (res.data.confirmToken) {
        setDeactivateConfirmToken(res.data.confirmToken);
        setIsDeactivateModalOpen(true);
      }
    } catch (err: any) {
      const data = err.response?.data;
      showFeedback(data?.message || 'Không thể yêu cầu tạm ngưng tài khoản', true);
    }
  };

  const handleConfirmDeactivation = async () => {
    if (!deactivatePassword) {
      showFeedback('Vui lòng nhập mật khẩu xác nhận', true);
      return;
    }
    try {
      await sellerApi.confirmDeactivation({
        confirmToken: deactivateConfirmToken,
        password: deactivatePassword,
        reason: deactivateReason,
      });
      showFeedback('Tài khoản đã tạm ngưng. Đang đăng xuất...');
      setTimeout(() => logout(), 2000);
    } catch (err: any) {
      showFeedback(err.response?.data?.message || 'Mật khẩu xác nhận không đúng', true);
    }
  };

  // Sub-Account Handlers
  const handleCreateSubAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subFullName || !subEmail || !subPhone || !subPassword) {
      showFeedback('Vui lòng nhập đầy đủ thông tin nhân viên', true);
      return;
    }
    setIsLoading(true);
    try {
      await sellerApi.createSubAccount({
        fullName: subFullName,
        email: subEmail,
        phoneNumber: subPhone,
        password: subPassword,
        permissions: selectedPermissions,
      });
      showFeedback('Tạo tài khoản nhân viên phụ thành công!');
      setIsAddSubAccountOpen(false);
      setSubFullName('');
      setSubEmail('');
      setSubPhone('');
      setSubPassword('');
      fetchSubAccounts();
    } catch (err: any) {
      showFeedback(err.response?.data?.message || 'Không thể tạo nhân viên phụ', true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubAccount = async (id: string) => {
    try {
      await sellerApi.deleteSubAccount(id);
      showFeedback('Đã vô hiệu hóa tài khoản nhân viên phụ!');
      fetchSubAccounts();
    } catch (err: any) {
      showFeedback(err.response?.data?.message || 'Lỗi khi xóa nhân viên phụ', true);
    }
  };

  const initialLetter = (companyName || fullName || 'S').charAt(0).toUpperCase();

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Toast Feedback */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-bold flex items-center gap-3 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm font-bold flex items-center gap-3 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Top Banner Header Profile Card */}
      <div className="glass-panel rounded-3xl border border-slate-800 overflow-hidden relative shadow-xl">
        <div className="h-40 bg-gradient-to-r from-blue-900 via-indigo-900 to-cyan-900 relative">
          <div className="absolute right-6 top-6 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/60 backdrop-blur-md border border-slate-700/80 text-xs font-semibold text-cyan-300">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Đối tác Bạch Kim (Platinum)
          </div>
        </div>

        <div className="px-6 pb-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-14">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 text-center sm:text-left">
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
              >
                <Camera className="w-4 h-4 text-cyan-400" />
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="text-2xl font-black text-white">{companyName || 'Chưa cập nhật tên Shop'}</h2>
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
                <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${kycStatus === 'VERIFIED_KYC' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : kycStatus === 'PENDING_KYC' ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  KYC: {kycStatus === 'VERIFIED_KYC' ? 'Đã Xác Minh' : kycStatus === 'PENDING_KYC' ? 'Đang Chờ Duyệt' : 'Chưa Nộp'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === 'PROFILE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
        >
          <User className="w-4 h-4" /> Hồ Sơ Shop
        </button>

        <button
          onClick={() => setActiveTab('ADDRESS')}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === 'ADDRESS' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
        >
          <MapPin className="w-4 h-4" /> Kho Lấy Hàng
        </button>

        <button
          onClick={() => setActiveTab('BANK')}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === 'BANK' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
        >
          <CreditCard className="w-4 h-4" /> Ngân Hàng COD
        </button>

        <button
          onClick={() => setActiveTab('KYC')}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === 'KYC' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
        >
          <FileCheck className="w-4 h-4" /> Xác Minh KYC
        </button>

        <button
          onClick={() => setActiveTab('NOTIFICATIONS')}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === 'NOTIFICATIONS' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
        >
          <Bell className="w-4 h-4" /> Thông Báo
        </button>

        <button
          onClick={() => setActiveTab('SECURITY')}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === 'SECURITY' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
        >
          <Lock className="w-4 h-4" /> Bảo Mật & 2FA
        </button>

        <button
          onClick={() => setActiveTab('SUB_ACCOUNTS')}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeTab === 'SUB_ACCOUNTS' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`}
        >
          <Users className="w-4 h-4" /> Nhân Viên Phụ
        </button>
      </div>

      {/* TAB 1: PROFILE */}
      {activeTab === 'PROFILE' && (
        <form onSubmit={handleSaveProfile} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
            <Building2 className="w-5 h-5 text-blue-400" /> Thông Tin Doanh Nghiệp & Hồ Sơ
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Tên Cửa Hàng / Công Ty *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Họ Và Tên Đại Diện *</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Số Điện Thoại *</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Mã Số Thuế / ĐKKD *</label>
              <input
                type="text"
                required
                value={taxCode}
                onChange={(e) => setTaxCode(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Save className="w-4 h-4" /> Lưu Hồ Sơ
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: MULTIPLE PICKUP POINTS */}
      {activeTab === 'ADDRESS' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-cyan-400" /> Quản Lý Nhiều Địa Chỉ Kho Lấy Hàng
                </h3>
                <p className="text-xs text-slate-400">Thiết lập danh sách các kho lấy hàng và chọn kho mặc định khi tạo đơn</p>
              </div>
              <button
                onClick={() => setIsAddAddressOpen(true)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Thêm Kho Mới
              </button>
            </div>

            {/* Address List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pickupAddresses.map((addr) => (
                <div key={addr._id} className={`p-5 rounded-2xl border transition-all ${addr.isDefault ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10' : 'bg-slate-900/60 border-slate-800'}`}>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white text-sm">{addr.label}</h4>
                      {addr.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                          Mặc định
                        </span>
                      )}
                    </div>
                    {!addr.isDefault && (
                      <button
                        onClick={() => handleDeleteAddress(addr._id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition"
                        title="Xóa địa chỉ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 mb-1">{addr.addressDetail}, {addr.ward}, {addr.district}, {addr.province}</p>
                  <p className="text-[11px] text-slate-400 mb-3 font-mono">
                    GPS: {addr.latitude}, {addr.longitude} • Liên hệ: {addr.contactName || fullName} ({addr.contactPhone || phone})
                  </p>

                  {!addr.isDefault && (
                    <button
                      onClick={() => handleSetDefaultAddress(addr._id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-semibold cursor-pointer transition"
                    >
                      Đặt Làm Mặc Định
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add Address Modal */}
          {isAddAddressOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Plus className="w-5 h-5 text-cyan-400" /> Thêm Địa Chỉ Kho Lấy Hàng Mới
                  </h3>
                  <button onClick={() => setIsAddAddressOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreatePickupAddress} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Tên Kho Gợi Nhớ (VD: Kho Hóc Môn) *</label>
                    <input
                      type="text"
                      required
                      value={newAddressLabel}
                      onChange={(e) => setNewAddressLabel(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Người Phụ Trách Kho</label>
                      <input
                        type="text"
                        value={newAddressContactName}
                        onChange={(e) => setNewAddressContactName(e.target.value)}
                        placeholder={fullName}
                        className="w-full glass-input rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Số Điện Thoại Kho</label>
                      <input
                        type="text"
                        value={newAddressContactPhone}
                        onChange={(e) => setNewAddressContactPhone(e.target.value)}
                        placeholder={phone}
                        className="w-full glass-input rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <VietnamAddressSelector
                      value={newAddressData}
                      onChange={setNewAddressData}
                      layout="grid"
                      darkTheme={true}
                    />
                  </div>

                  <WarehouseMapPicker
                    latitude={newAddressLat}
                    longitude={newAddressLng}
                    onChange={(lat, lng) => {
                      setNewAddressLat(lat);
                      setNewAddressLng(lng);
                    }}
                  />

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddAddressOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-bold text-xs flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Thêm Địa Chỉ Kho
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BANK DETAILS */}
      {activeTab === 'BANK' && (
        <form onSubmit={handleSaveBank} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
            <CreditCard className="w-5 h-5 text-amber-400" /> Tài Khoản Ngân Hàng Đối Soát COD
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Ngân Hàng *</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                <option value="Vietcombank" className="bg-slate-900">Vietcombank</option>
                <option value="Techcombank" className="bg-slate-900">Techcombank</option>
                <option value="MBBank" className="bg-slate-900">MB Bank</option>
                <option value="VPBank" className="bg-slate-900">VPBank</option>
                <option value="ACB" className="bg-slate-900">ACB</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Số Tài Khoản *</label>
              <input
                type="text"
                required
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1.5">Tên Chủ Tài Khoản (Viết hoa không dấu) *</label>
              <input
                type="text"
                required
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white font-mono uppercase"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Save className="w-4 h-4" /> Lưu Ngân Hàng
            </button>
          </div>
        </form>
      )}

      {/* TAB 4: KYC VERIFICATION */}
      {activeTab === 'KYC' && (
        <div className="space-y-6">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-emerald-400" /> Xác Minh Hồ Sơ Pháp Lý (KYC)
                </h3>
                <p className="text-xs text-slate-400">Nộp giấy phép ĐKKD và CCCD để kích hoạt tính năng nhận đơn chính thức</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${kycStatus === 'VERIFIED_KYC' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : kycStatus === 'PENDING_KYC' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                {kycStatus === 'VERIFIED_KYC' ? 'ĐÃ ĐƯỢC DUYỆT KYC' : kycStatus === 'PENDING_KYC' ? 'ĐANG CHỜ ADMIN DUYỆT' : 'CHƯA DUYỆT KYC'}
              </span>
            </div>

            {/* Upload Form */}
            <form onSubmit={handleSubmitKyc} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4 text-xs">
              <h4 className="font-bold text-white text-sm flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-cyan-400" /> Nộp / Cập Nhật Tài Liệu Pháp Lý
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Loại Giấy Tờ *</label>
                  <select
                    value={uploadDocType}
                    onChange={(e) => setUploadDocType(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-white"
                  >
                    <option value="BUSINESS_LICENSE" className="bg-slate-900">Giấy phép đăng ký kinh doanh (ĐKKD)</option>
                    <option value="ID_CARD_FRONT" className="bg-slate-900">Mặt trước CCCD / CMND người đại diện</option>
                    <option value="ID_CARD_BACK" className="bg-slate-900">Mặt sau CCCD / CMND người đại diện</option>
                    <option value="TAX_CERTIFICATE" className="bg-slate-900">Giấy chứng nhận Mã số thuế</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">URL Ảnh / Tài Liệu (HTTPS) *</label>
                  <input
                    type="url"
                    required
                    value={uploadFileUrl}
                    onChange={(e) => setUploadFileUrl(e.target.value)}
                    placeholder="https://example.com/kyc-doc.jpg"
                    className="w-full glass-input rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <Save className="w-4 h-4" /> Nộp Hồ Sơ Duyệt KYC
                </button>
              </div>
            </form>

            {/* Submitted Documents History */}
            <div className="space-y-3">
              <h4 className="font-bold text-white text-xs uppercase tracking-wider">Danh Sách Giấy Tờ Đã Nộp</h4>
              {kycDocs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Chưa có tài liệu KYC nào được nộp.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {kycDocs.map((doc) => (
                    <div key={doc._id} className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-200">{doc.documentType}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${doc.status === 'VERIFIED_KYC' ? 'bg-emerald-500/20 text-emerald-400' : doc.status === 'REJECTED_KYC' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-300'}`}>
                          {doc.status}
                        </span>
                      </div>
                      {doc.rejectReason && (
                        <p className="text-[11px] text-rose-400">Lý do từ chối: {doc.rejectReason}</p>
                      )}
                      <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-[11px] text-cyan-400 hover:underline block truncate font-mono">
                        {doc.fileUrl}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: NOTIFICATION PREFERENCES */}
      {activeTab === 'NOTIFICATIONS' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="border-b border-slate-800 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" /> Tùy Chỉnh Kênh Nhận Thông Báo
            </h3>
            <p className="text-xs text-slate-400">Bật/Tắt các kênh nhận thông báo Email, SMS và Push cho từng loại sự kiện</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase font-bold">
                  <th className="py-3 px-4">Loại Sự Kiện</th>
                  <th className="py-3 px-4 text-center">Email</th>
                  <th className="py-3 px-4 text-center">SMS</th>
                  <th className="py-3 px-4 text-center">Push App</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {[
                  { key: 'NEW_ORDER', name: 'Có đơn hàng mới phát sinh' },
                  { key: 'ORDER_FAILED', name: 'Đơn hàng giao thất bại / sự cố' },
                  { key: 'COD_SETTLED', name: 'Đối soát & Chuyển tiền COD' },
                  { key: 'COMPLAINT_RECEIVED', name: 'Khiếu nại khách hàng mới' },
                  { key: 'KYC_STATUS_CHANGED', name: 'Cập nhật trạng thái duyệt KYC' },
                ].map((item) => {
                  const prefs = notifPreferences[item.key] || { email: true, sms: false, push: true };
                  return (
                    <tr key={item.key} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-semibold text-white">{item.name}</td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={prefs.email}
                          onChange={() => handleToggleNotif(item.key, 'email', prefs.email)}
                          className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={prefs.sms}
                          onChange={() => handleToggleNotif(item.key, 'sms', prefs.sms)}
                          className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={prefs.push}
                          onChange={() => handleToggleNotif(item.key, 'push', prefs.push)}
                          className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: SECURITY & 2FA & SELF DEACTIVATION */}
      {activeTab === 'SECURITY' && (
        <div className="space-y-6">
          {/* 2FA TOTP Card */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-indigo-400" /> Bảo Mật 2 Lớp (2FA TOTP)
                </h3>
                <p className="text-xs text-slate-400">Sử dụng Google Authenticator hoặc Authy để bảo vệ tài khoản</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${twoFactorEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                {twoFactorEnabled ? 'ĐÃ BẬT 2FA' : 'CHƯA KÍCH HOẠT'}
              </span>
            </div>

            {!twoFactorEnabled ? (
              <div>
                <button
                  onClick={handleStart2FASetup}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <QrCode className="w-4 h-4" /> Thiết Lập Bảo Mật 2 Lớp
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-emerald-400 font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Tài khoản đã được bảo vệ với 2FA TOTP
                </p>
                <button
                  onClick={() => setIsDisable2FAOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-rose-300 border border-slate-700 text-xs font-bold cursor-pointer"
                >
                  Tắt Bảo Mật 2FA
                </button>
              </div>
            )}
          </div>

          {/* Password Form */}
          <form onSubmit={handleChangePasswordSubmit} className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-4">
              <Key className="w-5 h-5 text-purple-400" /> Đổi Mật Khẩu
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mật Khẩu Hiện Tại *</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Mật Khẩu Mới *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Xác Nhận Mật Khẩu Mới *</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
              >
                <Lock className="w-4 h-4" /> Cập Nhật Mật Khẩu
              </button>
            </div>
          </form>

          {/* Danger Zone: Self Deactivation */}
          <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-500/30 space-y-4">
            <h3 className="text-base font-bold text-rose-300 flex items-center gap-2">
              <Power className="w-5 h-5 text-rose-400" /> Vùng Nguy Hiểm: Tạm Ngưng Hoạt Động Tài Khoản
            </h3>
            <p className="text-xs text-slate-300">
              Khi tạm ngưng hoạt động Shop, bạn sẽ không thể tạo đơn hàng mới. Điều kiện: Đã xử lý xong toàn bộ đơn hàng hiện có và rút hết số dư ví COD.
            </p>
            <button
              onClick={handleRequestDeactivation}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Power className="w-4 h-4" /> Yêu Cầu Tạm Ngưng Hoạt Động Tài Khoản
            </button>
          </div>

          {/* Disable 2FA Modal */}
          {isDisable2FAOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="glass-panel p-6 rounded-3xl border border-slate-700 max-w-md w-full space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base">Xác Nhận Tắt 2FA</h3>
                  <button onClick={() => setIsDisable2FAOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-slate-300">Nhập mật khẩu tài khoản để vô hiệu hóa bảo mật 2 lớp:</p>
                <input
                  type="password"
                  value={disable2FAPassword}
                  onChange={(e) => setDisable2FAPassword(e.target.value)}
                  placeholder="Mật khẩu hiện tại"
                  className="w-full glass-input rounded-xl px-3 py-2 text-white"
                />
                <div className="flex justify-end gap-3 pt-3">
                  <button onClick={() => setIsDisable2FAOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold">Hủy Bỏ</button>
                  <button onClick={handleDisable2FA} className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold">Tắt 2FA</button>
                </div>
              </div>
            </div>
          )}

          {/* 2FA Setup Modal */}
          {is2FASetupOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 max-w-md w-full space-y-5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base">Quét Mã QR Đổ Vào App Authenticator</h3>
                  <button onClick={() => setIs2FASetupOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {qrCodeUrl && (
                  <div className="flex flex-col items-center gap-3">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="w-44 h-44 rounded-2xl border border-slate-700" />
                    <p className="text-[11px] text-slate-400 font-mono text-center">Khóa thủ công: {manualKey}</p>
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Nhập mã 6 chữ số từ App Authenticator *</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={totpInput}
                    onChange={(e) => setTotpInput(e.target.value)}
                    placeholder="123456"
                    className="w-full glass-input rounded-xl px-3 py-2 text-center text-lg font-mono text-cyan-400 tracking-widest"
                  />
                </div>

                {backupCodes.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/40 space-y-2">
                    <p className="font-bold text-emerald-400">10 Mã Dự Phòng (Lưu lại ngay):</p>
                    <div className="grid grid-cols-2 gap-1 font-mono text-[11px] text-slate-300">
                      {backupCodes.map((c, idx) => <span key={idx}>{c}</span>)}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <button onClick={() => setIs2FASetupOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold">Đóng</button>
                  <button onClick={handleVerify2FA} className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold">Xác Nhận Kích Hoạt</button>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Deactivation Modal */}
          {isDeactivateModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="glass-panel p-6 rounded-3xl border border-rose-500/40 max-w-md w-full space-y-4 text-xs">
                <h3 className="font-bold text-rose-400 text-base flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" /> Xác Nhận Tạm Ngưng Tài Khoản
                </h3>
                <p className="text-slate-300">Nhập mật khẩu để hoàn tất tạm ngưng hoạt động Shop:</p>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mật khẩu của bạn *</label>
                  <input
                    type="password"
                    value={deactivatePassword}
                    onChange={(e) => setDeactivatePassword(e.target.value)}
                    className="w-full glass-input rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Lý do tạm ngưng (Tùy chọn)</label>
                  <input
                    type="text"
                    value={deactivateReason}
                    onChange={(e) => setDeactivateReason(e.target.value)}
                    placeholder="VD: Nghỉ lễ / chuyển địa điểm"
                    className="w-full glass-input rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-3">
                  <button onClick={() => setIsDeactivateModalOpen(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold">Hủy Bỏ</button>
                  <button onClick={handleConfirmDeactivation} className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold">Xác Nhận Tạm Ngưng</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: SUB ACCOUNTS */}
      {activeTab === 'SUB_ACCOUNTS' && (
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" /> Phân Quyền Nhân Viên Phụ (Sub-Account)
              </h3>
              <p className="text-xs text-slate-400">Tạo tài khoản nhân viên phụ và ủy quyền chức năng làm việc riêng biệt</p>
            </div>
            <button
              onClick={() => setIsAddSubAccountOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Thêm Nhân Viên Mới
            </button>
          </div>

          <div className="space-y-3">
            {subAccounts.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Chưa có tài khoản nhân viên phụ nào.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {subAccounts.map((sub) => (
                  <div key={sub._id} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-white">{sub.fullName}</h4>
                      <button
                        onClick={() => handleDeleteSubAccount(sub._id)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Vô hiệu hóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-slate-400 font-mono">{sub.email} • {sub.phoneNumber}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {sub.subAccountPermissions.map((perm) => (
                        <span key={perm} className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-semibold">
                          {PERMISSION_LABELS[perm] || perm}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Sub Account Modal */}
          {isAddSubAccountOpen && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700 max-w-lg w-full space-y-5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-400" /> Tạo Tài Khoản Nhân Viên Phụ
                  </h3>
                  <button onClick={() => setIsAddSubAccountOpen(false)} className="text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleCreateSubAccount} className="space-y-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Họ Và Tên Nhân Viên *</label>
                    <input
                      type="text"
                      required
                      value={subFullName}
                      onChange={(e) => setSubFullName(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Email Đăng Nhập *</label>
                      <input
                        type="email"
                        required
                        value={subEmail}
                        onChange={(e) => setSubEmail(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1">Số Điện Thoại *</label>
                      <input
                        type="text"
                        required
                        value={subPhone}
                        onChange={(e) => setSubPhone(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Mật Khẩu Đăng Nhập *</label>
                    <input
                      type="password"
                      required
                      value={subPassword}
                      onChange={(e) => setSubPassword(e.target.value)}
                      className="w-full glass-input rounded-xl px-3 py-2 text-white"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="block text-slate-300 font-semibold">Phân Quyền Sử Dụng System *</label>
                    <div className="grid grid-cols-1 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                      {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                        <label key={key} className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={selectedPermissions.includes(key)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedPermissions([...selectedPermissions, key]);
                              else setSelectedPermissions(selectedPermissions.filter((p) => p !== key));
                            }}
                            className="w-4 h-4 rounded border-slate-700 text-blue-600 focus:ring-blue-500"
                          />
                          <span>{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsAddSubAccountOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-bold"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold shadow-lg"
                    >
                      Tạo Nhân Viên
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
