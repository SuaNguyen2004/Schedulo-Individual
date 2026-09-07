import React, { useState } from "react";
import { RegistrationRequest } from "../../types";
import { formatPhoneNumber, formatDateOnly } from "../../utils/formatters";
import { getPaginationRange } from "../../utils/pagination";

interface RequestsScreenProps {
    requests: RegistrationRequest[];
    onApproveRequest: (id: string) => void;
    onRejectRequest: (id: string) => void;
    onViewRequestDetail: (req: RegistrationRequest) => void;
}

export const RequestsScreen: React.FC<RequestsScreenProps> = ({
    requests,
    onApproveRequest,
    onRejectRequest,
    onViewRequestDetail,
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    // Filter requests (only show pending 'Chờ duyệt' requests)
    const filteredRequests = requests.filter((req) => {
        const isPending = !req.status || req.status === "Chờ duyệt";
        const matchesSearch =
            req.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.phone.includes(searchTerm);

        return isPending && matchesSearch;
    });

    const totalPages = Math.ceil(filteredRequests.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = filteredRequests.slice(startIndex, startIndex + itemsPerPage);

    const handleResetFilters = () => {
        setSearchTerm("");
        setCurrentPage(1);
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 sm:gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-[#1a1b1e] tracking-tight">Yêu cầu đăng ký</h2>
                    <p className="text-xs sm:text-sm text-[#44474e] mt-0.5 sm:mt-1">
                        Tổng số <span className="font-semibold text-[#1a1b1e]">{filteredRequests.length}</span> yêu cầu
                        đăng ký
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

            {/* Content Section: Table for Desktop/Tablet, Cards for Mobile */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl sm:rounded-2xl overflow-hidden shadow-xs flex flex-col">
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
                                    Ngày gửi
                                </th>
                                <th className="py-3 px-3.5 xl:px-6 text-xs font-semibold text-[#44474e] uppercase tracking-wider text-right">
                                    Thao tác
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-12 text-center text-[#74777f] text-sm">
                                        Không tìm thấy yêu cầu đăng ký phù hợp với điều kiện tìm kiếm.
                                    </td>
                                </tr>
                            ) : (
                                currentItems.map((req, index) => (
                                    <tr
                                        key={req.id}
                                        className="hover:bg-[#f4f3f7] transition-colors group cursor-default border-b border-[#E2E8F0] h-[68px]">
                                        <td className="py-3.5 px-3.5 xl:px-6 text-xs sm:text-sm text-[#44474e] text-center font-medium">
                                            {startIndex + index + 1}
                                        </td>
                                        <td className="py-3.5 px-3.5 xl:px-6">
                                            <div
                                                onClick={() => onViewRequestDetail(req)}
                                                className="inline-flex items-center gap-3 cursor-pointer group/name transition-colors max-w-full"
                                                title="Bấm để xem chi tiết hồ sơ đăng ký CTV">
                                                <div className="w-9 h-9 rounded-full bg-[#aec7f7] text-[#2e476f] flex items-center justify-center font-bold text-xs shrink-0 group-hover/name:ring-2 group-hover/name:ring-[#1b365d]/20 transition-all">
                                                    {req.initials || req.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="font-semibold text-xs sm:text-sm text-[#1b365d] group-hover/name:underline truncate max-w-[160px] md:max-w-[200px] xl:max-w-none">
                                                    {req.name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-3.5 px-3.5 xl:px-6 text-xs sm:text-sm text-[#1a1b1e] font-medium">
                                            {req.phone ? formatPhoneNumber(req.phone) : "---"}
                                        </td>
                                        <td className="py-3.5 px-3.5 xl:px-6 text-xs sm:text-sm text-[#44474e]">
                                            {formatDateOnly(req.submittedAt)}
                                        </td>
                                        <td className="py-3.5 px-3.5 xl:px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                {req.status === "Chờ duyệt" && (
                                                    <>
                                                        <button
                                                            onClick={() => onApproveRequest(req.id)}
                                                            className="w-10 h-10 rounded-xl text-[#16A34A] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 flex items-center justify-center transition-colors cursor-pointer shadow-2xs active:scale-95"
                                                            title="Duyệt hồ sơ">
                                                            <span className="material-symbols-outlined text-[20px]">
                                                                check_circle
                                                            </span>
                                                        </button>
                                                        <button
                                                            onClick={() => onRejectRequest(req.id)}
                                                            className="w-10 h-10 rounded-xl text-[#DC2626] bg-rose-50 hover:bg-rose-100 border border-rose-200/70 flex items-center justify-center transition-colors cursor-pointer shadow-2xs active:scale-95"
                                                            title="Từ chối và loại bỏ hồ sơ">
                                                            <span className="material-symbols-outlined text-[20px]">
                                                                cancel
                                                            </span>
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 2. CARD VIEW: Mobile (≤ 767px) */}
                <div className="block md:hidden p-3.5 space-y-2.5 min-h-[560px]">
                    {currentItems.length === 0 ? (
                        <div className="py-10 text-center text-[#74777f] text-sm bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                            Không tìm thấy yêu cầu đăng ký phù hợp.
                        </div>
                    ) : (
                        currentItems.map((req, index) => (
                            <div
                                key={req.id}
                                className="bg-white border border-[#E2E8F0] rounded-xl px-3.5 py-3 shadow-2xs space-y-2">
                                {/* Card Header: STT left, Date right */}
                                <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0]/60 pb-2">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-[#1b365d]">
                                        #{startIndex + index + 1}
                                    </span>
                                    <span className="text-xs text-[#74777f] flex items-center gap-1 font-medium">
                                        <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                        {formatDateOnly(req.submittedAt)}
                                    </span>
                                </div>

                                {/* Card User Details: Avatar + Name + Phone middle, Arrow right */}
                                <div
                                    onClick={() => onViewRequestDetail(req)}
                                    className="flex items-center gap-3 cursor-pointer group active:opacity-80 transition-opacity py-0.5">
                                    <div className="w-10 h-10 rounded-full bg-[#aec7f7] text-[#2e476f] flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                                        {req.initials || req.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-sm text-[#1b365d] group-hover:underline truncate">
                                            {req.name}
                                        </h4>
                                        <p className="text-xs text-[#44474e] flex items-center gap-1.5 mt-0.5">
                                            <span className="material-symbols-outlined text-[14px] text-[#74777f]">
                                                call
                                            </span>
                                            <span className="font-medium">
                                                {req.phone ? formatPhoneNumber(req.phone) : "---"}
                                            </span>
                                        </p>
                                    </div>
                                    <span className="material-symbols-outlined text-slate-400 text-[20px]">
                                        chevron_right
                                    </span>
                                </div>

                                {/* Card Actions: height ~40px (reduced by 1/8), font 14px/weight 600, icon 19px, gap 8px */}
                                {req.status === "Chờ duyệt" && (
                                    <div className="flex items-center gap-2 pt-2 mt-1 border-t border-[#E2E8F0]/60">
                                        <button
                                            onClick={() => onApproveRequest(req.id)}
                                            className="flex-1 h-[40px] px-3.5 rounded-[10px] bg-[#16A34A] hover:bg-[#15803d] active:scale-95 text-white font-semibold text-sm flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer">
                                            <span className="material-symbols-outlined text-[19px]">check_circle</span>
                                            <span>Duyệt</span>
                                        </button>
                                        <button
                                            onClick={() => onRejectRequest(req.id)}
                                            className="flex-1 h-[40px] px-3.5 rounded-[10px] bg-[#DC2626] hover:bg-[#b91c1c] active:scale-95 text-white font-semibold text-sm flex items-center justify-center gap-1.5 transition-all shadow-2xs cursor-pointer">
                                            <span className="material-symbols-outlined text-[19px]">cancel</span>
                                            <span>Từ chối</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* 3. PAGINATION FOOTER */}
                <div className="flex items-center justify-between sm:justify-end p-4 xl:px-6 border-t border-[#E2E8F0] bg-white min-h-[64px]">
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
        </div>
    );
};
