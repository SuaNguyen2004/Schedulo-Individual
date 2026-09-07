import React from "react";
import { ViewTab } from "../../types";

interface SidebarProps {
    currentTab: ViewTab;
    onSelectTab: (tab: ViewTab) => void;
    pendingRequestsCount: number;
    onLogout: () => void;
    userName?: string;
    userRole?: string;
    userAvatar?: string;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    currentTab,
    onSelectTab,
    pendingRequestsCount,
    onLogout,
    userName = "",
    userRole = "",
    userAvatar = "",
    isCollapsed = false,
    onToggleCollapse,
}) => {
    const isAdmin = userRole === "Admin";

    return (
        <aside
            className={`bg-[#f4f3f7] dark:bg-[#1a1b1e] h-screen max-h-screen overflow-hidden fixed left-0 top-0 border-r border-[#E2E8F0] dark:border-[#c4c6cf] flex flex-col z-20 transition-all duration-300 ease-in-out ${
                isCollapsed ? "w-[72px]" : "w-[280px]"
            }`}>
            {/* Header */}
            <div
                className={`px-3 py-3.5 border-b border-[#E2E8F0] dark:border-[#c4c6cf] flex items-center shrink-0 ${isCollapsed ? "justify-center" : "justify-between gap-1.5"}`}>
                {!isCollapsed && (
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-accent text-white flex items-center justify-center shadow-xs shrink-0 border border-white/20">
                            <span className="material-symbols-outlined text-[20px]">badge</span>
                        </div>
                        <div className="min-w-0">
                            <h1 className="font-bold text-sm text-[#1b365d] dark:text-[#d6e3ff] leading-tight tracking-tight whitespace-nowrap">
                                Hệ thống Quản lý CTV
                            </h1>
                        </div>
                    </div>
                )}

                {onToggleCollapse && (
                    <button
                        onClick={onToggleCollapse}
                        title={isCollapsed ? "Mở rộng Sidebar" : "Thu gọn Sidebar"}
                        className="p-1 text-[#44474e] dark:text-[#c4c6cf] hover:text-[#002046] dark:hover:text-white hover:bg-[#e9e8ec] dark:hover:bg-[#2c2d33] rounded-md transition-colors cursor-pointer shrink-0">
                        <span className="material-symbols-outlined text-[20px]">
                            {isCollapsed ? "side_navigation" : "first_page"}
                        </span>
                    </button>
                )}
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 py-3 flex flex-col gap-1.5 px-3 overflow-y-auto overflow-x-hidden min-h-0">
                {/* Admin only: Tài khoản */}
                {isAdmin && (
                    <button
                        onClick={() => onSelectTab("accounts")}
                        title={isCollapsed ? "Quản lý tài khoản" : undefined}
                        className={`flex items-center ${
                            isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-3"
                        } rounded-lg text-sm font-semibold transition-all duration-150 text-left w-full cursor-pointer relative ${
                            currentTab === "accounts"
                                ? "bg-accent text-white shadow-xs"
                                : "text-[#44474e] dark:text-slate-200 hover:bg-[#e9e7eb] dark:hover:bg-[#2a2b30] hover:text-[#002046]"
                        }`}>
                        <span
                            className="material-symbols-outlined text-[22px] shrink-0"
                            style={{ fontVariationSettings: currentTab === "accounts" ? "'FILL' 1" : "'FILL' 0" }}>
                            group
                        </span>
                        {!isCollapsed && <span className="truncate">Quản lý tài khoản</span>}
                    </button>
                )}

                {/* Admin only: Yêu cầu đăng ký */}
                {isAdmin && (
                    <button
                        onClick={() => onSelectTab("requests")}
                        title={isCollapsed ? `Yêu cầu đăng ký (${pendingRequestsCount})` : undefined}
                        className={`flex items-center ${
                            isCollapsed ? "justify-center px-0 py-3" : "justify-between px-3.5 py-3"
                        } rounded-lg text-sm font-semibold transition-all duration-150 text-left w-full cursor-pointer relative ${
                            currentTab === "requests"
                                ? "bg-accent text-white shadow-xs"
                                : "text-[#44474e] dark:text-slate-200 hover:bg-[#e9e7eb] dark:hover:bg-[#2a2b30] hover:text-[#002046]"
                        }`}>
                        <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"} truncate`}>
                            <span
                                className="material-symbols-outlined text-[22px] shrink-0"
                                style={{
                                    fontVariationSettings: currentTab === "requests" ? "'FILL' 1" : "'FILL' 0",
                                }}>
                                person_add
                            </span>
                            {!isCollapsed && <span className="truncate">Yêu cầu đăng ký</span>}
                        </div>
                        {pendingRequestsCount > 0 && (
                            <span
                                className={
                                    isCollapsed
                                        ? "absolute top-1 right-1 bg-[#EA580C] text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center"
                                        : "bg-[#EA580C] text-white text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
                                }>
                                {pendingRequestsCount}
                            </span>
                        )}
                    </button>
                )}

                {/* CTV only: Lịch làm việc */}
                {!isAdmin && (
                    <button
                        onClick={() => onSelectTab("schedule")}
                        title={isCollapsed ? "Lịch làm việc" : undefined}
                        className={`flex items-center ${
                            isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-3"
                        } rounded-lg text-sm font-semibold transition-all duration-150 text-left w-full cursor-pointer relative ${
                            currentTab === "schedule"
                                ? "bg-accent text-white shadow-xs"
                                : "text-[#44474e] dark:text-slate-200 hover:bg-[#e9e7eb] dark:hover:bg-[#2a2b30] hover:text-[#002046]"
                        }`}>
                        <span
                            className="material-symbols-outlined text-[22px] shrink-0"
                            style={{ fontVariationSettings: currentTab === "schedule" ? "'FILL' 1" : "'FILL' 0" }}>
                            calendar_month
                        </span>
                        {!isCollapsed && <span className="truncate">Lịch làm việc</span>}
                    </button>
                )}

                {/* Admin only: Lịch làm việc tổng hợp */}
                {isAdmin && (
                    <button
                        onClick={() => onSelectTab("meetings")}
                        title={isCollapsed ? "Lịch làm việc tổng hợp" : undefined}
                        className={`flex items-center ${
                            isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-3"
                        } rounded-lg text-sm font-semibold transition-all duration-150 text-left w-full cursor-pointer relative ${
                            currentTab === "meetings"
                                ? "bg-accent text-white shadow-xs"
                                : "text-[#44474e] dark:text-slate-200 hover:bg-[#e9e7eb] dark:hover:bg-[#2a2b30] hover:text-[#002046]"
                        }`}>
                        <span
                            className="material-symbols-outlined text-[22px] shrink-0"
                            style={{ fontVariationSettings: currentTab === "meetings" ? "'FILL' 1" : "'FILL' 0" }}>
                            calendar_view_week
                        </span>
                        {!isCollapsed && <span className="truncate">Lịch làm việc tổng hợp</span>}
                    </button>
                )}

                {/* Hồ sơ cá nhân */}
                <button
                    onClick={() => onSelectTab("profile")}
                    title={isCollapsed ? "Hồ sơ cá nhân" : undefined}
                    className={`flex items-center ${
                        isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-3"
                    } rounded-lg text-sm font-semibold transition-all duration-150 text-left w-full cursor-pointer relative ${
                        currentTab === "profile"
                            ? "bg-accent text-white shadow-xs"
                            : "text-[#44474e] dark:text-slate-200 hover:bg-[#e9e7eb] dark:hover:bg-[#2a2b30] hover:text-[#002046]"
                    }`}>
                    <span
                        className="material-symbols-outlined text-[22px] shrink-0"
                        style={{ fontVariationSettings: currentTab === "profile" ? "'FILL' 1" : "'FILL' 0" }}>
                        account_circle
                    </span>
                    {!isCollapsed && <span className="truncate">Hồ sơ cá nhân</span>}
                </button>
            </nav>

            {/* User Profile Widget Footer with Direct Logout */}
            <div className="p-3 border-t border-[#E2E8F0] dark:border-[#c4c6cf] shrink-0">
                <div
                    className={`flex items-center ${
                        isCollapsed ? "flex-col gap-2 justify-center" : "justify-between gap-2"
                    }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                        {userAvatar ? (
                            <img
                                src={userAvatar}
                                alt={userName}
                                className="w-9 h-9 rounded-full object-cover border border-white dark:border-[#3b3d45] shadow-2xs shrink-0"
                            />
                        ) : (
                            <div className="w-9 h-9 rounded-full bg-accent text-white font-bold flex items-center justify-center text-xs shrink-0">
                                {(userName || "").slice(0, 2).toUpperCase() || "US"}
                            </div>
                        )}
                        {!isCollapsed && (
                            <div className="min-w-0">
                                <h4 className="text-xs font-bold text-[#1a1b1e] dark:text-white truncate">
                                    {userName}
                                </h4>
                                <p className="text-[10px] text-[#74777f] dark:text-[#c4c6cf] truncate">{userRole}</p>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={onLogout}
                        title="Đăng xuất"
                        className={`flex items-center justify-center bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold transition-colors duration-200 cursor-pointer shrink-0 shadow-xs ${
                            isCollapsed
                                ? "w-9 h-9 rounded-xl p-0"
                                : "px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap"
                        }`}>
                        {isCollapsed ? (
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                        ) : (
                            <span>Đăng xuất</span>
                        )}
                    </button>
                </div>
            </div>
        </aside>
    );
};
