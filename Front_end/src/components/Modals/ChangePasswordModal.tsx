import React, { useState } from "react";
import { changePassword } from "../../utils/api";

interface ChangePasswordModalProps {
    isOpen: boolean;
    userId: string;
    onClose: () => void;
    onSuccess: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, userId, onClose, onSuccess }) => {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [errors, setErrors] = useState<{ oldPassword?: string; newPassword?: string; confirmPassword?: string }>({});
    const [loading, setLoading] = useState(false);

    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { oldPassword?: string; newPassword?: string; confirmPassword?: string } = {};

        if (!oldPassword.trim()) {
            newErrors.oldPassword = "Vui lòng nhập mật khẩu hiện tại!";
        }
        if (!newPassword.trim()) {
            newErrors.newPassword = "Vui lòng nhập mật khẩu mới!";
        } else if (newPassword.length < 6 || newPassword.length > 20) {
            newErrors.newPassword = "Mật khẩu mới phải từ 6 đến 20 ký tự!";
        }
        if (!confirmPassword.trim()) {
            newErrors.confirmPassword = "Vui lòng xác nhận mật khẩu mới!";
        } else if (newPassword && newPassword !== confirmPassword) {
            newErrors.confirmPassword = "Mật khẩu xác nhận không khớp!";
        }

        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        setErrorMsg("");
        setLoading(true);
        try {
            await changePassword(userId, oldPassword, newPassword);
            onSuccess();
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setErrors({});
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || "Đổi mật khẩu thất bại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <h3 className="text-base font-bold text-[#0F172A]">Đổi mật khẩu</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-slate-200/60 transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
                    {errorMsg && (
                        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs font-semibold rounded-xl flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                            Mật khẩu hiện tại <span className="text-[#DC2626]">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showOldPassword ? "text" : "password"}
                                value={oldPassword}
                                onChange={(e) => {
                                    setOldPassword(e.target.value);
                                    if (errors.oldPassword) setErrors((prev) => ({ ...prev, oldPassword: undefined }));
                                }}
                                placeholder="Nhập mật khẩu hiện tại"
                                autoComplete="current-password"
                                className={`w-full pl-3.5 pr-10 py-2 bg-[#F8FAFC] border rounded-xl text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none h-[44px] transition-colors ${
                                    errors.oldPassword
                                        ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20"
                                        : "border-[#E2E8F0] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#2563EB] transition-colors cursor-pointer"
                                title={showOldPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                                <span className="material-symbols-outlined text-[20px]">
                                    {showOldPassword ? "visibility_off" : "visibility"}
                                </span>
                            </button>
                        </div>
                        {errors.oldPassword && (
                            <p className="text-[11px] text-[#DC2626] mt-1 font-medium">{errors.oldPassword}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                            Mật khẩu mới <span className="text-[#DC2626]">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => {
                                    setNewPassword(e.target.value);
                                    if (errors.newPassword) setErrors((prev) => ({ ...prev, newPassword: undefined }));
                                }}
                                placeholder="Nhập mật khẩu mới"
                                maxLength={20}
                                autoComplete="new-password"
                                className={`w-full pl-3.5 pr-10 py-2 bg-[#F8FAFC] border rounded-xl text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none h-[44px] transition-colors ${
                                    errors.newPassword
                                        ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20"
                                        : "border-[#E2E8F0] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#2563EB] transition-colors cursor-pointer"
                                title={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                                <span className="material-symbols-outlined text-[20px]">
                                    {showNewPassword ? "visibility_off" : "visibility"}
                                </span>
                            </button>
                        </div>
                        {errors.newPassword && (
                            <p className="text-[11px] text-[#DC2626] mt-1 font-medium">{errors.newPassword}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                            Xác nhận mật khẩu mới <span className="text-[#DC2626]">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (errors.confirmPassword)
                                        setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                                }}
                                placeholder="Nhập lại mật khẩu mới"
                                maxLength={20}
                                autoComplete="new-password"
                                className={`w-full pl-3.5 pr-10 py-2 bg-[#F8FAFC] border rounded-xl text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none h-[44px] transition-colors ${
                                    errors.confirmPassword
                                        ? "border-[#DC2626] focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20"
                                        : "border-[#E2E8F0] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                                }`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#2563EB] transition-colors cursor-pointer"
                                title={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                                <span className="material-symbols-outlined text-[20px]">
                                    {showConfirmPassword ? "visibility_off" : "visibility"}
                                </span>
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <p className="text-[11px] text-[#DC2626] mt-1 font-medium">{errors.confirmPassword}</p>
                        )}
                    </div>

                    <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-sm font-semibold h-[42px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs">
                            {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
