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
    const [loading, setLoading] = useState(false);

    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!oldPassword) {
            setErrorMsg("Vui lòng nhập mật khẩu hiện tại");
            return;
        }
        if (newPassword.length < 6 || newPassword.length > 20) {
            setErrorMsg("Mật khẩu mới phải từ 6 đến 20 ký tự!");
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMsg("Mật khẩu xác nhận không khớp");
            return;
        }
        setErrorMsg("");
        setLoading(true);
        try {
            await changePassword(userId, oldPassword, newPassword);
            onSuccess();
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
            onClose();
        } catch (err: any) {
            setErrorMsg(err.message || "Đổi mật khẩu thất bại.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <h3 className="text-lg font-bold text-[#1a1b1e]">Đổi mật khẩu</h3>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-rose-500 transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {errorMsg && (
                        <div className="p-2.5 bg-[#ffdad6] text-[#ba1a1a] text-xs font-semibold rounded flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px]">error</span>
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-[#1a1b1e] mb-1">Mật khẩu hiện tại</label>
                        <input
                            type="password"
                            required
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            autoComplete="current-password"
                            className="w-full px-3 py-2 border border-[#c4c6cf] rounded text-sm text-[#1a1b1e] focus:border-[#002046] outline-none"
                        />
                        <div className="relative">
                            <input
                                type={showOldPassword ? "text" : "password"}
                                required
                                value={oldPassword}
                                onChange={(e) => setOldPassword(e.target.value)}
                                autoComplete="current-password"
                                className="w-full pl-3 pr-10 py-2 border border-[#c4c6cf] rounded text-sm text-[#1a1b1e] focus:border-[#002046] outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowOldPassword(!showOldPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#74777f] hover:text-[#002046] cursor-pointer"
                                title={showOldPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                                <span className="material-symbols-outlined text-[20px]">
                                    {showOldPassword ? "visibility_off" : "visibility"}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#1a1b1e] mb-1">Mật khẩu mới</label>
                        <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            maxLength={20}
                            autoComplete="new-password"
                            className="w-full px-3 py-2 border border-[#c4c6cf] rounded text-sm text-[#1a1b1e] focus:border-[#002046] outline-none"
                        />
                        <div className="relative">
                            <input
                                type={showNewPassword ? "text" : "password"}
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                maxLength={20}
                                autoComplete="new-password"
                                className="w-full pl-3 pr-10 py-2 border border-[#c4c6cf] rounded text-sm text-[#1a1b1e] focus:border-[#002046] outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#74777f] hover:text-[#002046] cursor-pointer"
                                title={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                                <span className="material-symbols-outlined text-[20px]">
                                    {showNewPassword ? "visibility_off" : "visibility"}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#1a1b1e] mb-1">Xác nhận mật khẩu mới</label>
                        <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            maxLength={20}
                            autoComplete="new-password"
                            className="w-full px-3 py-2 border border-[#c4c6cf] rounded text-sm text-[#1a1b1e] focus:border-[#002046] outline-none"
                        />
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? "text" : "password"}
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                maxLength={20}
                                autoComplete="new-password"
                                className="w-full pl-3 pr-10 py-2 border border-[#c4c6cf] rounded text-sm text-[#1a1b1e] focus:border-[#002046] outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#74777f] hover:text-[#002046] cursor-pointer"
                                title={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}>
                                <span className="material-symbols-outlined text-[20px]">
                                    {showConfirmPassword ? "visibility_off" : "visibility"}
                                </span>
                            </button>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-accent hover:opacity-90 text-white rounded text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? "Đang xử lý..." : "Đổi mật khẩu"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
