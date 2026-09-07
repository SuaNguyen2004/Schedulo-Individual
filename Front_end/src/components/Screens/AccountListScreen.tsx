import React, { useState } from "react";
import { UserAccount, UserRole } from "../../types";
import { formatPhoneNumber } from "../../utils/formatters";
import { ResetPasswordModal } from "../Modals/ResetPasswordModal";
import { getPaginationRange } from "../../utils/pagination";

interface AccountListScreenProps {
    accounts: UserAccount[];
    onCreateAccount?: () => void;
    onToggleAccountStatus: (id: string) => void;
    onDeleteAccount: (id: string) => void;
    onViewAccountDetail: (account: UserAccount) => void;
    onChangeRole?: (id: string, newRole: UserRole) => void;
    onResetPassword?: (id: string, newPassword: string, requireChangeOnLogin: boolean) => void;
    onShowToast?: (msg: string, type?: "success" | "error") => void;
}

export const AccountListScreen: React.FC<AccountListScreenProps> = ({
    accounts,
    onToggleAccountStatus,
    onDeleteAccount,
    onViewAccountDetail,
    onResetPassword,
    onShowToast,
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Confirm Modals state
    const [accountToToggle, setAccountToToggle] = useState<UserAccount | null>(null);
    const [accountToDelete, setAccountToDelete] = useState<UserAccount | null>(null);
    const [accountToResetPassword, setAccountToResetPassword] = useState<UserAccount | null>(null);

    // Filter out Admin accounts strictly (Only display Cộng tác viên accounts)
    const ctvAccounts = accounts.filter((acc) => acc.role !== "Admin");

    // Filter CTV accounts by search term
    const filteredAccounts = ctvAccounts.filter((acc) => {
        const matchSearch =
            acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            acc.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            acc.phone.includes(searchTerm);

        return matchSearch;
    });

    const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredAccounts.slice(startIndex, startIndex + itemsPerPage);

    const handleResetFilters = () => {
        setSearchTerm("");
        setCurrentPage(1);
    };

    return (
        <div className="w-full max-w-full space-y-4 sm:space-y-6 overflow-x-hidden">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#1a1b1e] tracking-tight">Danh sách tài khoản</h2>
                    <p className="text-xs sm:text-sm text-[#44474e] mt-0.5 sm:mt-1">
                        Tổng số <span className="font-semibold text-[#1a1b1e]">{ctvAccounts.length}</span> tài khoản
                    </p>
                </div>
            </div>

            {/* Toolbar Section */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xs">
                <div className="flex items-center justify-between gap-2 sm:gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#44474e] text-[20px]">
                            search
                        </span>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            placeholder="Tìm theo họ tên, email, sđt..."
                            className="w-full pl-10 pr-4 h-[40px] sm:h-[44px] border border-[#E2E8F0] rounded-xl text-xs sm:text-sm bg-white text-[#1a1b1e] focus:border-[#1b365d] focus:ring-1 focus:ring-[#1b365d] outline-none transition-all"
                        />
                    </div>

                    {/* Reset Action */}
                    <div className="flex items-center justify-end shrink-0">
                        <button
                            onClick={handleResetFilters}
                            className="h-[40px] sm:h-[44px] px-3 sm:px-4 border border-[#E2E8F0] rounded-xl text-[#44474e] hover:text-[#1b365d] hover:bg-slate-50 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Đặt lại bộ lọc">
                            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                            <span className="hidden sm:inline">Đặt lại</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Data Container: Table for Desktop/Tablet, Cards for Mobile */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl sm:rounded-2xl overflow-hidden shadow-xs flex flex-col w-full max-w-full">
                {/* 1. TABLE VIEW: Desktop & Tablet (≥ 768px) */}
                <div className="hidden md:block overflow-x-auto min-h-[388px]">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/80 border-b border-[#E2E8F0]">
                            <tr>
                                <th className="py-3 px-3.5 xl:px-6 text-xs font-semibold text-[#44474e] uppercase tracking-wider text-center w-16">
                                    STT
                                </th>
                                <th className="py-3 px-3.5 xl:px-6 text-xs font-semibold text-[#44474e] uppercase tracking-wider">
                                    Họ và tên
                                </th>
                                <th className="py-3 px-3.5 xl:px-6 text-xs font-semibold text-[#44474e] uppercase tracking-wider">
                                    Số điện thoại
                                </th>
                                <th className="py-3 px-3.5 xl:px-6 text-xs font-semibold text-[#44474e] uppercase tracking-wider">
                                    Ngày đăng ký
                                </th>
                                <th className="py-3 px-3.5 xl:px-6 text-xs font-semibold text-[#44474e] uppercase tracking-wider text-center">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-[#74777f] text-sm">
                                        Không tìm thấy tài khoản phù hợp với điều kiện tìm kiếm.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((acc, index) => (
                                    <tr
                                        key={acc.id}
                                        className="hover:bg-[#f4f3f7] transition-colors group cursor-default border-b border-[#E2E8F0] h-[68px]">
                                        <td className="py-3.5 px-3.5 xl:px-6 text-xs sm:text-sm text-[#44474e] text-center font-medium">
                                            {startIndex + index + 1}
                                        </td>
                                        <td className="py-3.5 px-3.5 xl:px-6">
                                            <div
                                                onClick={() => onViewAccountDetail(acc)}
                                                className="flex items-center gap-3 cursor-pointer group/user inline-flex max-w-full"
                                                title={`Xem hồ sơ chi tiết của ${acc.name}`}>
                                                {acc.avatar ? (
                                                    <img
                                                        src={acc.avatar}
                                                        alt={acc.name}
                                                        className="w-9 h-9 rounded-full object-cover border border-[#E2E8F0] group-hover/user:border-[#1b365d] group-hover/user:scale-105 transition-all shrink-0"
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-[#aec7f7] text-[#2e476f] flex items-center justify-center font-bold text-xs group-hover/user:scale-105 transition-all shrink-0">
                                                        {acc.initials || acc.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-xs sm:text-sm text-[#1a1b1e] group-hover/user:text-[#1b365d] group-hover/user:underline transition-colors truncate max-w-[160px] md:max-w-[200px] xl:max-w-none">
                                                        {acc.name}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-3.5 xl:px-6 text-xs sm:text-sm text-[#44474e] font-medium">
                                            {acc.phone ? formatPhoneNumber(acc.phone) : "---"}
                                        </td>
                                        <td className="py-3.5 px-3.5 xl:px-6 text-xs sm:text-sm text-[#44474e]">
                                            {acc.registerDate}
                                        </td>
                                        <td className="py-3.5 px-3.5 xl:px-6 text-center">
                                            {acc.role !== "Admin" && (
                                                <div className="flex items-center justify-center gap-2 xl:gap-2.5">
                                                    <button
                                                        onClick={() => setAccountToResetPassword(acc)}
                                                        className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                                        title="Đặt lại mật khẩu mặc định (Quên MK)">
                                                        <span className="material-symbols-outlined text-[20px] xl:text-[22px]">
                                                            lock_reset
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() => setAccountToToggle(acc)}
                                                        className={`w-10 h-10 xl:w-11 xl:h-11 rounded-xl border flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 ${
                                                            acc.status === "Kích hoạt"
                                                                ? "bg-orange-50 hover:bg-orange-100 border-orange-200 text-[#EA580C]"
                                                                : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                                                        }`}
                                                        title={
                                                            acc.status === "Kích hoạt"
                                                                ? "Vô hiệu hóa tài khoản"
                                                                : "Kích hoạt tài khoản"
                                                        }>
                                                        <span className="material-symbols-outlined text-[20px] xl:text-[22px]">
                                                            {acc.status === "Kích hoạt" ? "lock" : "lock_open"}
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() => setAccountToDelete(acc)}
                                                        className="w-10 h-10 xl:w-11 xl:h-11 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[#DC2626] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95"
                                                        title="Xóa tài khoản">
                                                        <span className="material-symbols-outlined text-[20px] xl:text-[22px]">
                                                            delete
                                                        </span>
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 2. CARD VIEW: Mobile (≤ 767px) */}
                <div className="block md:hidden p-3.5 space-y-2.5 min-h-[560px] w-full">
                    {currentItems.length === 0 ? (
                        <div className="py-10 text-center text-[#74777f] text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            Không tìm thấy tài khoản phù hợp.
                        </div>
                    ) : (
                        currentItems.map((acc, index) => (
                            <div
                                key={acc.id}
                                className="bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-3 shadow-2xs space-y-2 w-full">
                                {/* Card Header: STT left, Date right */}
                                <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0]/60 pb-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-[#1b365d]">
                                        #{startIndex + index + 1}
                                    </span>
                                    <span className="text-[15px] text-[#74777f] flex items-center gap-1 font-medium">
                                        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                                        {acc.registerDate}
                                    </span>
                                </div>

                                {/* Card User Details: Avatar + Name (18px) + Phone (15px) middle, Arrow (22px) right */}
                                <div
                                    onClick={() => onViewAccountDetail(acc)}
                                    className="flex items-center gap-3 cursor-pointer group active:opacity-80 transition-opacity py-0.5">
                                    {acc.avatar ? (
                                        <img
                                            src={acc.avatar}
                                            alt={acc.name}
                                            className="w-11 h-11 rounded-full object-cover border border-[#E2E8F0] shrink-0 shadow-2xs"
                                        />
                                    ) : (
                                        <div className="w-11 h-11 rounded-full bg-[#aec7f7] text-[#2e476f] flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                                            {acc.initials || acc.name.substring(0, 2).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-[18px] text-[#1b365d] group-hover:underline truncate leading-snug">
                                            {acc.name}
                                        </h4>
                                        <p className="text-[15px] text-[#44474e] flex items-center gap-1.5 mt-0.5">
                                            <span className="material-symbols-outlined text-[16px] text-[#74777f]">
                                                call
                                            </span>
                                            <span className="font-medium">
                                                {acc.phone ? formatPhoneNumber(acc.phone) : "---"}
                                            </span>
                                        </p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400 text-[22px]">
                                        chevron_right
                                    </span>
                                </div>

                                {/* Card Actions: 3 icon buttons (46px, icon 22px, gap 10px, rounded 12px) */}
                                {acc.role !== "Admin" && (
                                    <div className="flex items-center justify-end gap-[10px] pt-2 mt-1 border-t border-[#E2E8F0]/60">
                                        <button
                                            onClick={() => setAccountToResetPassword(acc)}
                                            className="w-[46px] h-[46px] rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 flex items-center justify-center active:scale-95 transition-all shadow-2xs cursor-pointer"
                                            title="Đặt lại mật khẩu mặc định">
                                            <span className="material-symbols-outlined text-[22px]">lock_reset</span>
                                        </button>
                                        <button
                                            onClick={() => setAccountToToggle(acc)}
                                            className={`w-[46px] h-[46px] rounded-xl border flex items-center justify-center active:scale-95 transition-all shadow-2xs cursor-pointer ${
                                                acc.status === "Kích hoạt"
                                                    ? "bg-orange-50 hover:bg-orange-100 border-orange-200 text-[#EA580C]"
                                                    : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700"
                                            }`}
                                            title={
                                                acc.status === "Kích hoạt"
                                                    ? "Vô hiệu hóa tài khoản"
                                                    : "Kích hoạt tài khoản"
                                            }>
                                            <span className="material-symbols-outlined text-[22px]">
                                                {acc.status === "Kích hoạt" ? "lock" : "lock_open"}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => setAccountToDelete(acc)}
                                            className="w-[46px] h-[46px] rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-[#DC2626] flex items-center justify-center active:scale-95 transition-all shadow-2xs cursor-pointer"
                                            title="Xóa tài khoản">
                                            <span className="material-symbols-outlined text-[22px]">delete</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* 3. PAGINATION FOOTER */}
                <div className="flex items-center justify-between sm:justify-end p-4 xl:px-6 border-t border-[#E2E8F0] bg-white min-h-[64px] w-full">
                    {/* Desktop & Tablet Pagination (≥ 768px): Fixed Layout Numbered Buttons */}
                    <div className="hidden md:flex items-center gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                            className="w-12 h-12 flex items-center justify-center rounded-xl border border-[#E2E8F0] text-[#44474e] hover:bg-[#f4f3f7] transition-colors disabled:opacity-40 cursor-pointer shadow-2xs shrink-0"
                            aria-label="Trang trước">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>

                        {getPaginationRange(currentPage, totalPages).map((item, idx) =>
                            typeof item === "number" ? (
                                <button
                                    key={item}
                                    onClick={() => setCurrentPage(item)}
                                    className={`w-12 h-12 flex items-center justify-center rounded-xl text-sm font-bold transition-all cursor-pointer shadow-2xs shrink-0 ${
                                        currentPage === item
                                            ? "bg-[#1b365d] text-white border-transparent"
                                            : "border border-[#E2E8F0] text-[#44474e] hover:bg-[#f4f3f7]"
                                    }`}>
                                    {item}
                                </button>
                            ) : (
                                <span
                                    key={`ellipsis-${idx}`}
                                    className="w-[40px] h-12 flex items-center justify-center text-sm font-bold text-[#74777f] select-none shrink-0">
                                    {item}
                                </span>
                            ),
                        )}

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                            className="w-12 h-12 flex items-center justify-center rounded-xl border border-[#E2E8F0] text-[#44474e] hover:bg-[#f4f3f7] transition-colors disabled:opacity-40 cursor-pointer shadow-2xs shrink-0"
                            aria-label="Trang sau">
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                    </div>

                    {/* Mobile Pagination (≤ 767px): ‹ Trang X / Y › with fixed button and width sizes */}
                    <div className="flex md:hidden items-center justify-between w-full">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                            className="w-12 h-12 flex items-center justify-center rounded-xl border border-[#E2E8F0] text-[#44474e] hover:bg-[#f4f3f7] transition-colors disabled:opacity-40 cursor-pointer shadow-2xs shrink-0">
                            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                        </button>

                        <span className="w-[120px] text-center text-xs font-bold text-[#1a1b1e] px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 shrink-0">
                            Trang {currentPage} / {totalPages}
                        </span>

                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                            className="w-12 h-12 flex items-center justify-center rounded-xl border border-[#E2E8F0] text-[#44474e] hover:bg-[#f4f3f7] transition-colors disabled:opacity-40 cursor-pointer shadow-2xs shrink-0">
                            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* UC 1.6 Modal: Confirm Activate / Disable */}
            {accountToToggle && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 rounded-full bg-[#ffddb9] text-[#EA580C] flex items-center justify-center mx-auto">
                            <span className="material-symbols-outlined text-2xl">warning</span>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-[#1a1b1e]">
                                {accountToToggle.status === "Kích hoạt"
                                    ? "Vô hiệu hóa tài khoản?"
                                    : "Kích hoạt tài khoản?"}
                            </h3>
                            <p className="text-xs text-[#44474e] mt-2">
                                Họ và tên: <span className="font-semibold text-[#1a1b1e]">{accountToToggle.name}</span>
                                <br />
                                Email: <span className="font-semibold text-[#1a1b1e]">{accountToToggle.email}</span>
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                            <button
                                onClick={() => setAccountToToggle(null)}
                                className="px-4 py-2 text-xs font-semibold text-[#44474e] hover:bg-gray-100 rounded transition-colors cursor-pointer">
                                Hủy
                            </button>
                            <button
                                onClick={() => {
                                    onToggleAccountStatus(accountToToggle.id);
                                    setAccountToToggle(null);
                                }}
                                className={`px-4 py-2 text-xs font-semibold text-white rounded transition-colors cursor-pointer ${
                                    accountToToggle.status === "Kích hoạt"
                                        ? "bg-[#EA580C] hover:bg-[#c2410c]"
                                        : "bg-[#16A34A] hover:bg-[#15803d]"
                                }`}>
                                {accountToToggle.status === "Kích hoạt" ? "Vô hiệu hóa" : "Kích hoạt"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* UC 1.7 Modal: Confirm Delete */}
            {accountToDelete && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-2xl w-full max-w-sm p-6 space-y-4 animate-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 rounded-full bg-[#ffdad6] text-[#DC2626] flex items-center justify-center mx-auto">
                            <span className="material-symbols-outlined text-2xl">error</span>
                        </div>
                        <div className="text-center">
                            <h3 className="text-base font-bold text-[#1a1b1e]">Xóa tài khoản?</h3>
                            <p className="text-xs text-[#DC2626] font-semibold mt-1">Thao tác này không thể hoàn tác</p>
                            <p className="text-xs text-[#44474e] mt-2">
                                Họ và tên: <span className="font-semibold text-[#1a1b1e]">{accountToDelete.name}</span>
                                <br />
                                Email: <span className="font-semibold text-[#1a1b1e]">{accountToDelete.email}</span>
                            </p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-[#E2E8F0]">
                            <button
                                onClick={() => setAccountToDelete(null)}
                                className="px-4 py-2 text-xs font-semibold text-[#44474e] hover:bg-gray-100 rounded transition-colors cursor-pointer">
                                Hủy
                            </button>
                            <button
                                onClick={() => {
                                    onDeleteAccount(accountToDelete.id);
                                    setAccountToDelete(null);
                                }}
                                className="px-4 py-2 text-xs font-semibold text-white bg-[#DC2626] hover:bg-[#b91c1c] rounded transition-colors cursor-pointer">
                                Xóa tài khoản
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {accountToResetPassword && (
                <ResetPasswordModal
                    account={accountToResetPassword}
                    onClose={() => setAccountToResetPassword(null)}
                    onShowToast={onShowToast}
                    onConfirmReset={(id, newPassword, requireChange) => {
                        if (onResetPassword) {
                            onResetPassword(id, newPassword, requireChange);
                        }
                    }}
                />
            )}
        </div>
    );
};
