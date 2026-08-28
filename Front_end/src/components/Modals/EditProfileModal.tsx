import React, { useState, useEffect } from "react";
import { UserAccount } from "../../types";
import { updateProfile } from "../../utils/api";

interface EditProfileModalProps {
  isOpen: boolean;
  user: UserAccount;
  onClose: () => void;
  onSave: (updatedData: Partial<UserAccount>) => void;
  onShowToast?: (msg: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  user,
  onClose,
  onSave,
  onShowToast,
}) => {
  const parseDobParts = (dobStr: string) => {
    const match = dobStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    return { day: match ? match[1] : "", month: match ? match[2] : "", year: match ? match[3] : "" };
  };

  const initialDob = parseDobParts(user.dob || "");
  const [dobDay, setDobDay] = useState(initialDob.day);
  const [dobMonth, setDobMonth] = useState(initialDob.month);
  const [dobYear, setDobYear] = useState(initialDob.year);
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email || "");
  const [phone, setPhone] = useState(user.phone);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      const parts = parseDobParts(user.dob || "");
      setDobDay(parts.day);
      setDobMonth(parts.month);
      setDobYear(parts.year);
      setEmail(user.email || "");
      setPhone(user.phone);
      setErrorMsg("");
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      if (!/^[0-9]{10}$/.test(phone.trim())) {
        setErrorMsg("Số điện thoại phải đúng 10 chữ số!");
        setLoading(false);
        return;
      }
      const dob = dobDay && dobMonth && dobYear ? `${dobDay}/${dobMonth}/${dobYear}` : "";
      await updateProfile(user.id, { name, email, phone, dob });
      onSave({ name, email, phone, dob });
      if (onShowToast) onShowToast("Đã cập nhật thông tin hồ sơ cá nhân.");
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Không thể cập nhật hồ sơ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#25262b] rounded-xl border border-[#E2E8F0] dark:border-[#3b3d45] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0] dark:border-[#3b3d45] bg-[#F8FAFC] dark:bg-[#1f2023]">
          <h3 className="text-lg font-bold text-[#1a1b1e] dark:text-[#d6e3ff]">
            Chỉnh sửa thông tin cá nhân
          </h3>
          <button
            onClick={onClose}
            className="text-[#74777f] hover:text-[#1a1b1e] dark:hover:text-white p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-2.5 bg-[#ffdad6] text-[#ba1a1a] text-xs font-semibold rounded flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              <span>{errorMsg}</span>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1a1b1e] dark:text-[#d6e3ff] mb-1">
                Họ và tên
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-[#c4c6cf] dark:border-[#3b3d45] bg-white dark:bg-[#1e1f23] rounded text-sm text-[#1a1b1e] dark:text-white focus:border-[#002046] dark:focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1a1b1e] dark:text-[#d6e3ff] mb-1">
                Ngày sinh
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={dobDay}
                  onChange={(e) => setDobDay(e.target.value)}
                  className="px-2 py-1.5 border border-[#c4c6cf] dark:border-[#3b3d45] bg-white dark:bg-[#1e1f23] rounded text-xs text-[#1a1b1e] dark:text-white focus:border-[#002046] dark:focus:border-blue-500 outline-none h-[38px]"
                >
                  <option value="">Ngày</option>
                  {Array.from({ length: 31 }, (_, i) => {
                    const d = String(i + 1).padStart(2, "0");
                    return (
                      <option key={d} value={d}>{d}</option>
                    );
                  })}
                </select>
                <select
                  value={dobMonth}
                  onChange={(e) => setDobMonth(e.target.value)}
                  className="px-2 py-1.5 border border-[#c4c6cf] dark:border-[#3b3d45] bg-white dark:bg-[#1e1f23] rounded text-xs text-[#1a1b1e] dark:text-white focus:border-[#002046] dark:focus:border-blue-500 outline-none h-[38px]"
                >
                  <option value="">Tháng</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const m = String(i + 1).padStart(2, "0");
                    return (
                      <option key={m} value={m}>{m}</option>
                    );
                  })}
                </select>
                <select
                  value={dobYear}
                  onChange={(e) => setDobYear(e.target.value)}
                  className="px-2 py-1.5 border border-[#c4c6cf] dark:border-[#3b3d45] bg-white dark:bg-[#1e1f23] rounded text-xs text-[#1a1b1e] dark:text-white focus:border-[#002046] dark:focus:border-blue-500 outline-none h-[38px]"
                >
                  <option value="">Năm</option>
                  {Array.from({ length: 55 }, (_, i) => {
                    const y = String(1970 + i);
                    return (
                      <option key={y} value={y}>{y}</option>
                    );
                  })}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1a1b1e] dark:text-[#d6e3ff] mb-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[#c4c6cf] dark:border-[#3b3d45] bg-white dark:bg-[#1e1f23] rounded text-sm text-[#1a1b1e] dark:text-white focus:border-[#002046] dark:focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1a1b1e] dark:text-[#d6e3ff] mb-1">
                Số điện thoại
              </label>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]{10}"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full px-3 py-2 border border-[#c4c6cf] dark:border-[#3b3d45] bg-white dark:bg-[#1e1f23] rounded text-sm text-[#1a1b1e] dark:text-white focus:border-[#002046] dark:focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#3b3d45] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#E2E8F0] dark:border-[#3b3d45] rounded text-xs font-semibold text-[#44474e] dark:text-[#c4c6cf] hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-accent hover:opacity-90 text-white rounded text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
