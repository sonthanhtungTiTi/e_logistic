import React, { useState, useEffect, useCallback } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  PackageCheck,
  Scale,
  Ruler,
} from 'lucide-react';
import { productApi, type ProductItem } from '../../api/product.api';

export const ProductListPage: React.FC = () => {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [formLoading, setFormLoading] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState<string>('');
  const [sku, setSku] = useState<string>('');
  const [weightKg, setWeightKg] = useState<number>(0.5);
  const [lengthCm, setLengthCm] = useState<number>(15);
  const [widthCm, setWidthCm] = useState<number>(10);
  const [heightCm, setHeightCm] = useState<number>(5);
  const [priceVnd, setPriceVnd] = useState<number>(100000);
  const [category, setCategory] = useState<string>('Thời trang');
  const [description, setDescription] = useState<string>('');

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productApi.getProducts({
        search: searchTerm.trim() || undefined,
        category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      });
      setProducts(res.data?.data || []);
    } catch (err: any) {
      console.error('Lỗi lấy danh sách sản phẩm:', err);
      showToast('error', err.response?.data?.message || 'Không thể tải danh sách sản phẩm');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedCategory]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setWeightKg(0.5);
    setLengthCm(15);
    setWidthCm(10);
    setHeightCm(5);
    setPriceVnd(100000);
    setCategory('Thời trang');
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: ProductItem) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku || '');
    setWeightKg(p.weightKg || 0.5);
    setLengthCm(p.dimensions?.length || 15);
    setWidthCm(p.dimensions?.width || 10);
    setHeightCm(p.dimensions?.height || 5);
    setPriceVnd(p.priceVnd || 0);
    setCategory(p.category || 'Thời trang');
    setDescription(p.description || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('error', 'Vui lòng nhập tên sản phẩm');
      return;
    }
    if (weightKg <= 0) {
      showToast('error', 'Khối lượng phải lớn hơn 0 kg');
      return;
    }

    setFormLoading(true);
    try {
      const payload = {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        weightKg: Number(weightKg),
        dimensions: {
          length: Number(lengthCm) || 10,
          width: Number(widthCm) || 10,
          height: Number(heightCm) || 5,
        },
        priceVnd: Number(priceVnd) || 0,
        category: category.trim() || 'Chung',
        description: description.trim(),
      };

      if (editingProduct) {
        await productApi.updateProduct(editingProduct._id, payload);
        showToast('success', 'Cập nhật sản phẩm thành công!');
      } else {
        await productApi.createProduct(payload);
        showToast('success', 'Thêm mới sản phẩm vào danh mục thành công!');
      }

      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      console.error('Lỗi lưu sản phẩm:', err);
      showToast('error', err.response?.data?.message || 'Có lỗi xảy ra khi lưu sản phẩm');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string, prodName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${prodName}" khỏi danh mục?`)) {
      return;
    }

    try {
      await productApi.deleteProduct(id);
      showToast('success', 'Đã xóa sản phẩm khỏi danh mục');
      loadProducts();
    } catch (err: any) {
      showToast('error', err.response?.data?.message || 'Không thể xóa sản phẩm');
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
              : 'bg-rose-950/90 text-rose-300 border-rose-700'
          }`}
        >
          {toastMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-semibold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-2xl font-black text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-indigo-400" /> Quản Lý Sản Phẩm Mẫu (Catalog)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Lưu sẵn thông số sản phẩm mẫu giúp tự động điền kích thước, khối lượng và tiền giá trị khi tạo đơn hàng
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition"
          >
            <Plus className="w-4 h-4" /> Thêm Sản Phẩm Mới
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên sản phẩm hoặc mã SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs text-white"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="glass-input rounded-xl px-3 py-2 text-xs text-white bg-slate-900 border border-slate-700"
          >
            <option value="ALL">Tất cả danh mục</option>
            <option value="Thời trang">Thời trang & Phụ kiện</option>
            <option value="Điện tử">Điện tử & Gia dụng</option>
            <option value="Mỹ phẩm">Mỹ phẩm & Chăm sóc da</option>
            <option value="Thực phẩm">Thực phẩm & Đồ uống</option>
            <option value="Sách vở">Sách & Văn phòng phẩm</option>
            <option value="Chung">Khác / Chung</option>
          </select>
        </div>

        <button
          onClick={loadProducts}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          title="Tải lại danh sách"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Product Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
            Đang tải danh mục sản phẩm...
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Boxes className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-white mb-1">Chưa có sản phẩm mẫu nào</p>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              Hãy tạo sản phẩm mẫu đầu tiên để khi tạo vận đơn, bạn chỉ cần chọn tên sản phẩm là hệ thống sẽ tự điền trọng lượng và kích thước.
            </p>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Thêm Sản Phẩm Ngay
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="p-3.5">Mã SKU</th>
                  <th className="p-3.5">Tên Sản Phẩm</th>
                  <th className="p-3.5">Danh Mục</th>
                  <th className="p-3.5">Trọng Lượng (Kg)</th>
                  <th className="p-3.5">Kích Thước (D x R x C)</th>
                  <th className="p-3.5">Giá Trị Mặc Định</th>
                  <th className="p-3.5 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {products.map((p) => {
                  const volWeight = (
                    ((p.dimensions?.length || 0) * (p.dimensions?.width || 0) * (p.dimensions?.height || 0)) /
                    5000
                  ).toFixed(2);

                  return (
                    <tr key={p._id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-mono font-bold text-indigo-400">
                        {p.sku || <span className="text-slate-600 italic">Chưa đặt SKU</span>}
                      </td>
                      <td className="p-3.5">
                        <div className="font-bold text-white text-sm">{p.name}</div>
                        {p.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">{p.description}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 font-semibold text-[11px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 font-mono font-bold text-emerald-400">
                          <Scale className="w-3.5 h-3.5 text-emerald-500" />
                          {p.weightKg} kg
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1 font-mono text-slate-300">
                          <Ruler className="w-3.5 h-3.5 text-slate-500" />
                          {p.dimensions?.length} x {p.dimensions?.width} x {p.dimensions?.height} cm
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">Quy đổi: {volWeight} kg</span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-amber-400">
                        {formatCurrency(p.priceVnd)}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                          </button>
                          <button
                            onClick={() => handleDelete(p._id, p.name)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 transition"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL THÊM / SỬA SẢN PHẨM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-indigo-400" />
                {editingProduct ? 'Chỉnh Sửa Sản Phẩm Mẫu' : 'Thêm Sản Phẩm Mẫu Mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Tên sản phẩm <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Áo thun Oversize Cotton 100%"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Mã SKU (Tùy chọn)</label>
                  <input
                    type="text"
                    placeholder="VD: AT-COT-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Danh mục</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-white bg-slate-900 border border-slate-700"
                  >
                    <option value="Thời trang">Thời trang & Phụ kiện</option>
                    <option value="Điện tử">Điện tử & Gia dụng</option>
                    <option value="Mỹ phẩm">Mỹ phẩm & Chăm sóc da</option>
                    <option value="Thực phẩm">Thực phẩm & Đồ uống</option>
                    <option value="Sách vở">Sách & Văn phòng phẩm</option>
                    <option value="Chung">Khác / Chung</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Khối lượng (Kg) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.01"
                    required
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value))}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Giá trị hàng (VNĐ)</label>
                  <input
                    type="number"
                    step="1000"
                    min="0"
                    value={priceVnd}
                    onChange={(e) => setPriceVnd(Number(e.target.value))}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Kích thước bưu kiện (Dài x Rộng x Cao cm)</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      placeholder="Dài"
                      value={lengthCm}
                      onChange={(e) => setLengthCm(Number(e.target.value))}
                      className="w-full glass-input rounded-xl px-3 py-2 text-white font-mono text-center"
                    />
                    <span className="text-[10px] text-slate-500 absolute right-2 top-2">cm</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      placeholder="Rộng"
                      value={widthCm}
                      onChange={(e) => setWidthCm(Number(e.target.value))}
                      className="w-full glass-input rounded-xl px-3 py-2 text-white font-mono text-center"
                    />
                    <span className="text-[10px] text-slate-500 absolute right-2 top-2">cm</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      placeholder="Cao"
                      value={heightCm}
                      onChange={(e) => setHeightCm(Number(e.target.value))}
                      className="w-full glass-input rounded-xl px-3 py-2 text-white font-mono text-center"
                    />
                    <span className="text-[10px] text-slate-500 absolute right-2 top-2">cm</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Trọng lượng quy đổi tương đương:{' '}
                  <b className="text-amber-400 font-mono">
                    {((Number(lengthCm) * Number(widthCm) * Number(heightCm)) / 5000).toFixed(2)} kg
                  </b>
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Mô tả sản phẩm (Tùy chọn)</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm về chất liệu, đóng gói đặc biệt..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center gap-1.5 shadow-lg transition"
                >
                  {formLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingProduct ? 'Cập Nhật' : 'Lưu Sản Phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
