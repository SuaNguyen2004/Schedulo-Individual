import React, { useState, useEffect } from "react";
import { UserAccount } from "../../types";
import { updateProfile } from "../../utils/api";
import { isValidDateOfBirth } from "../../utils/formatters";

interface EditProfileModalProps {
    isOpen: boolean;
    user: UserAccount;
    onClose: () => void;
    onSave: (updatedData: Partial<UserAccount>) => void;
    onShowToast?: (msg: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, user, onClose, onSave, onShowToast }) => {
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

    const dayOptions = Array.from({ length: 31 }, (_, i) => {
        const d = String(i + 1).padStart(2, "0");
        return { value: d, label: d };
    });

    const monthOptions = Array.from({ length: 12 }, (_, i) => {
        const m = String(i + 1).padStart(2, "0");
        return { value: m, label: m };
    });

    const yearOptions = Array.from({ length: 55 }, (_, i) => {
        const y = String(1970 + i);
        return { value: y, label: y };
    });

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
            if (!name.trim()) {
                setErrorMsg("Vui lòng nhập họ và tên!");
                setLoading(false);
                return;
            }
            if (name.trim().length > 100) {
                setErrorMsg("Họ và tên không được vượt quá 100 ký tự!");
                setLoading(false);
                return;
            }
            if (!phone.trim()) {
                setErrorMsg("Vui lòng nhập số điện thoại!");
                setLoading(false);
                return;
            }
            if (!/^[0-9]{10}$/.test(phone.trim())) {
                setErrorMsg("Số điện thoại phải đúng 10 chữ số!");
                setLoading(false);
                return;
            }
            if (!dobDay || !dobMonth || !dobYear) {
                setErrorMsg("Vui lòng chọn ngày sinh!");
                setLoading(false);
                return;
            }
            if (!isValidDateOfBirth(dobDay, dobMonth, dobYear)) {
                setErrorMsg("Vui lòng nhập ngày sinh hợp lệ (định dạng DD/MM/YYYY)!");
                setLoading(false);
                return;
            }
            const birthDate = new Date(parseInt(dobYear, 10), parseInt(dobMonth, 10) - 1, parseInt(dobDay, 10));
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age < 16 || age > 80) {
                setErrorMsg("Độ tuổi cộng tác viên phải từ 16 đến 80 tuổi!");
                setLoading(false);
                return;
            }
            const dob = `${dobDay}/${dobMonth}/${dobYear}`;
            await updateProfile(user.id, { name: name.trim(), email: user.email, phone: phone.trim(), dob });
            onSave({ name: name.trim(), email: user.email, phone: phone.trim(), dob });
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
            <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
                    <h3 className="text-base font-bold text-[#0F172A]">
                        Chỉnh sửa thông tin cá nhân
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-slate-200/60 transition-colors cursor-pointer">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto" noValidate>
                    {errorMsg && (
                        <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] text-[#DC2626] text-xs font-semibold rounded-xl flex items-center gap-2">
                            <span className="material-symbols-outlined text-[18px]">error</span>
                            <span>{errorMsg}</span>
                        </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                                Họ và tên <span className="text-[#DC2626]">*</span>
                            </label>
                            <input
                                type="text"
                                maxLength={100}
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    setErrorMsg("");
                                }}
                                placeholder="Nhập họ và tên"
                                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 h-[44px] transition-colors"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                                Số điện thoại <span className="text-[#DC2626]">*</span>
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => {
                                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                                    setErrorMsg("");
                                }}
                                placeholder="0901234567"
                                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] placeholder-[#64748B] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 h-[44px] transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-[#0F172A] mb-1.5">
                            Ngày sinh <span className="text-[#DC2626]">*</span>
                        </label>
                        <div className="grid grid-cols-3 gap-3 w-full">
                            <select
                                value={dobDay}
                                onChange={(e) => {
                                    setDobDay(e.target.value);
                                    setErrorMsg("");
                                }}
                                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 h-[44px] transition-colors cursor-pointer">
                                <option value="">Ngày</option>
                                {dayOptions.map((d) => (
                                    <option key={d.value} value={d.value}>
                                        {d.label}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={dobMonth}
                                onChange={(e) => {
                                    setDobMonth(e.target.value);
                                    setErrorMsg("");
                                }}
                                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 h-[44px] transition-colors cursor-pointer">
                                <option value="">Tháng</option>
                                {monthOptions.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={dobYear}
                                onChange={(e) => {
                                    setDobYear(e.target.value);
                                    setErrorMsg("");
                                }}
                                className="w-full px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 h-[44px] transition-colors cursor-pointer">
                                <option value="">Năm</option>
                                {yearOptions.map((y) => (
                                    <option key={y.value} value={y.value}>
                                        {y.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 border border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100 rounded-xl text-sm font-semibold h-[42px] transition-colors cursor-pointer">
                            Hủy
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-sm font-semibold h-[42px] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs">
                            {loading ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
