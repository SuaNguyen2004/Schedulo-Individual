import React, { useState } from "react";
import { UserRole } from "../../types";

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (userData: { name: string; email: string; phone: string; role: UserRole; address: string }) => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [role, setRole] = useState<UserRole>("Cộng tác viên");
    const [address, setAddress] = useState("");
    const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: { name?: string; email?: string } = {};
        if (!name.trim()) newErrors.name = "Vui lòng nhập họ và tên!";
        if (!email.trim()) newErrors.email = "Vui lòng nhập email!";
        setErrors(newErrors);
        if (Object.keys(newErrors).length > 0) return;

        onSubmit({ name, email, phone, role, address });
        setName("");
        setEmail("");
        setPhone("");
        setRole("Cộng tác viên");
        setAddress("");
        setErrors({});
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0] bg-[#F8FAFC] shrink-0">
                    <h3 className="text-lg font-bold text-[#1a1b1e]">Tạo tài khoản mới</h3>
                    <button
                        onClick={onClose}
                        type="button"
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-rose-500 dark:text-slate-400 dark:hover:bg-rose-600 transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden" noValidate>
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        <div>
                            <label className="block text-xs font-semibold text-[#1a1b1e] mb-1">Họ và tên *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                                }}
                                placeholder="Nguyễn Văn A"
                                className={`w-full px-3 py-2 border rounded text-sm text-[#1a1b1e] outline-none transition-colors ${
                                    errors.name
                                        ? "border-red-500 focus:border-red-500"
                                        : "border-[#c4c6cf] focus:border-[#002046]"
                                }`}
                            />
                            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-[#1a1b1e] mb-1">Email *</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                                    }}
                                    placeholder="example@vienkhcn.vn"
                                    className={`w-full px-3 py-2 border rounded text-sm text-[#1a1b1e] outline-none transition-colors ${
                                        errors.email
                                            ? "border-red-500 focus:border-red-500"
                                            : "border-[#c4c6cf] focus:border-[#002046]"
                                    }`}
                                />
                                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[#1a1b1e] mb-1">Số điện thoại</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="090 123 4567"
                                    className="w-full px-3 py-2 border border-[#c4c6cf] rounded text-sm text-[#1a1b1e] focus:border-[#002046] outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#1a1b1e] mb-1">Vai trò *</label>
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value as UserRole)}
                                className="w-full px-3 py-2 border border-[#c4c6cf] rounded text-sm text-[#1a1b1e] focus:border-[#002046] outline-none cursor-pointer">
                                <option value="Cộng tác viên">Cộng tác viên</option>
                                <option value="Admin">Admin</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#1a1b1e] mb-1">Địa chỉ</label>
                            <textarea
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                placeholder="Số 10, Trần Đại Nghĩa, Cầu Giấy, Hà Nội"
                                rows={3}
                                className="w-full px-3 py-2 border border-[#c4c6cf] rounded text-sm text-[#1a1b1e] focus:border-[#002046] outline-none resize-none"
                            />
                        </div>
                    </div>

                    <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-end gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-[#c4c6cf] rounded text-xs font-semibold text-[#44474e] hover:bg-slate-100 transition-colors cursor-pointer">
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold transition-colors cursor-pointer shadow-xs">
                            Tạo tài khoản
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
