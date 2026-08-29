import React, { useEffect, useState, useRef } from "react";
import {
    UserAccount,
    UserRole,
    RegistrationRequest,
    ShiftSlot,
    MeetingItem,
    Participant,
    ViewTab,
    WorkRoom,
    RoomStatus,
} from "./types";

import { Sidebar } from "./components/Navigation/Sidebar";

import { LoginScreen } from "./components/Screens/LoginScreen";
import { AccountListScreen } from "./components/Screens/AccountListScreen";
import { ScheduleScreen } from "./components/Screens/ScheduleScreen";
import { SummaryScheduleScreen } from "./components/Screens/SummaryScheduleScreen";
import { RequestsScreen } from "./components/Screens/RequestsScreen";
import { ProfileScreen } from "./components/Screens/ProfileScreen";

import { CreateUserModal } from "./components/Modals/CreateUserModal";
import { ViewRequestModal } from "./components/Modals/ViewRequestModal";
import { ViewAccountDetailModal } from "./components/Modals/ViewAccountDetailModal";
import { EditProfileModal } from "./components/Modals/EditProfileModal";
import { ChangePasswordModal } from "./components/Modals/ChangePasswordModal";
import { SettingsModal } from "./components/Modals/SettingsModal";
import { useSystemSettings } from "./context/SystemSettingsContext";
import { parseStoredShifts } from "./utils/shiftStorage";
import { formatDateOnly } from "./utils/formatters";
import { fetchBootstrapData, updateProfile, saveAdminNotes, toggleAccountStatus, resetPassword, deleteAccount } from "./utils/api";
import { approveRegistrationRequest, rejectRegistrationRequest, AuthenticatedUser } from "./utils/api";

const SHIFTS_STORAGE_KEY = "schedulo_shifts";
const AUTH_STORAGE_KEY = "schedulo_authenticated";
const AUTH_USER_EMAIL_KEY = "schedulo_authenticated_email";
const AUTH_USER_ID_KEY = "schedulo_authenticated_id";
const EMPTY_USER: UserAccount = {
    id: "current-user",
    stt: 0,
    name: "",
    email: "",
    phone: "",
    role: "Cộng tác viên",
    status: "Kích hoạt",
    registerDate: "",
};

const loadStoredShifts = (): ShiftSlot[] => {
    try {
        const parsed = parseStoredShifts(window.localStorage.getItem(SHIFTS_STORAGE_KEY));
        if (parsed !== null) return parsed;
    } catch {
        // Use an empty state when localStorage is unavailable.
    }

    return [];
};

const loadAuthenticationState = (): boolean => {
    try {
        return (
            window.localStorage.getItem(AUTH_STORAGE_KEY) === "true" &&
            Boolean(window.localStorage.getItem(AUTH_USER_EMAIL_KEY))
        );
    } catch {
        return false;
    }
};

export const App: React.FC = () => {
    const { isDarkMode } = useSystemSettings();

    // Auth state
    const [isLoggedIn, setIsLoggedIn] = useState(loadAuthenticationState);

    // Active view tab
    const [currentTab, setCurrentTab] = useState<ViewTab>("accounts");

    // Mobile sidebar state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Desktop sidebar collapsed state
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

    // App Data State
    const [accounts, setAccounts] = useState<UserAccount[]>([]);
    const [requests, setRequests] = useState<RegistrationRequest[]>([]);
    const [shifts, setShifts] = useState<ShiftSlot[]>(loadStoredShifts);
    // Elapsed shifts, served frozen by the API. Deliberately not persisted to
    // localStorage: history must always come from the server so a stale local copy can
    // never contradict it.
    const [history, setHistory] = useState<ShiftSlot[]>([]);
    const [meetings, setMeetings] = useState<MeetingItem[]>([]);
    const [rooms, setRooms] = useState<WorkRoom[]>([]);

    // Workroom Operations
    const handleAddRoom = (newRoomData: { name: string; descriptionAndLocation: string; status: RoomStatus }) => {
        const newRoom: WorkRoom = {
            id: `room-${Date.now()}`,
            ...newRoomData,
        };
        setRooms((prev) => [...prev, newRoom]);
    };

    const handleUpdateRoom = (updatedRoom: WorkRoom) => {
        setRooms((prev) => prev.map((r) => (r.id === updatedRoom.id ? updatedRoom : r)));
    };

    const handleDeleteRoom = (id: string) => {
        setRooms((prev) => prev.filter((r) => r.id !== id));
    };

    const handleToggleRoomStatus = (id: string) => {
        setRooms((prev) =>
            prev.map((r) => {
                if (r.id === id) {
                    const nextStatus: RoomStatus = r.status === "Hoạt động" ? "Bảo trì" : "Hoạt động";
                    showToast(`Đã chuyển trạng thái ${r.name} sang "${nextStatus}"`);
                    return { ...r, status: nextStatus };
                }
                return r;
            }),
        );
    };

    // Current logged in user details
    const [currentUser, setCurrentUser] = useState<UserAccount>(EMPTY_USER);

    // Modal states
    const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
    const [selectedAccountDetail, setSelectedAccountDetail] = useState<UserAccount | null>(null);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Store bootstrap promise so handleLoginSuccess can await it
    const bootstrapRef = useRef<Promise<import("./utils/api").BootstrapData> | null>(null);

    // Toast feedback state
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => {
            setToastMessage(null);
        }, 3000);
    };

    const clearAuthState = (toastMsg?: string) => {
        setIsLoggedIn(false);
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        window.localStorage.removeItem(AUTH_USER_EMAIL_KEY);
        window.localStorage.removeItem(AUTH_USER_ID_KEY);
        window.localStorage.removeItem("schedulo_weekly_pattern");
        if (toastMsg) {
            showToast(toastMsg);
        }
    };

    useEffect(() => {
        window.localStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(shifts));
    }, [shifts]);

    useEffect(() => {
        const controller = new AbortController();

        const promise = fetchBootstrapData(controller.signal)
            .then((data) => {
                setAccounts(data.accounts);
                setRequests(data.requests);
                setShifts(data.shifts);
                setHistory(data.history || []);
                setMeetings(data.meetings);
                setRooms(data.rooms);
                const authenticatedEmail = window.localStorage.getItem(AUTH_USER_EMAIL_KEY);
                const authenticatedAccount = data.accounts.find((account) => account.email === authenticatedEmail);
                if (authenticatedAccount) {
                    setCurrentUser(authenticatedAccount);
                    setCurrentTab(authenticatedAccount.role === "Admin" ? "accounts" : "schedule");
                } else if (authenticatedEmail) {
                    clearAuthState();
                }
                return data;
            })
            .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === "AbortError") return;
                console.warn("Không thể tải dữ liệu từ Backend, sử dụng dữ liệu cục bộ.", error);
                
                // If there's an active session but bootstrap failed (e.g. database offline),
                // clear auth state and redirect to login screen
                const authenticatedEmail = window.localStorage.getItem(AUTH_USER_EMAIL_KEY);
                if (authenticatedEmail) {
                    clearAuthState("Không thể kết nối cơ sở dữ liệu. Vui lòng kiểm tra lại!");
                }
                throw error;
            });

        bootstrapRef.current = promise;

        return () => controller.abort();
    }, []);

    // Handlers
    const handleLoginSuccess = async (user: AuthenticatedUser) => {
        setIsLoggedIn(true);
        window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
        window.localStorage.setItem(AUTH_USER_EMAIL_KEY, user.email);
        window.localStorage.setItem(AUTH_USER_ID_KEY, user.id);

        // Wait for bootstrap data to be available so we can look up full profile
        let bootstrapData: import("./utils/api").BootstrapData | null = null;
        if (bootstrapRef.current) {
            try { bootstrapData = await bootstrapRef.current; } catch { /* ignore */ }
        }

        const account = (bootstrapData?.accounts || accounts).find(
            (item) => item.id === user.id || item.email === user.email,
        );
        if (account) {
            setCurrentUser(account);
            setCurrentTab(account.role === "Admin" ? "accounts" : "schedule");
        } else {
            setCurrentUser({
                ...EMPTY_USER,
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role === "ADMIN" ? "Admin" : "Cộng tác viên",
                status: "Kích hoạt",
            });
            setCurrentTab(user.role === "ADMIN" ? "accounts" : "schedule");
        }
        showToast(`Đăng nhập thành công với ${user.email}`);
    };

    const handleLogout = () => {
        clearAuthState("Đã đăng xuất khỏi hệ thống");
    };

    // Account Operations
    const handleCreateAccount = (userData: {
        name: string;
        email: string;
        phone: string;
        role: any;
        address: string;
    }) => {
        const newAcc: UserAccount = {
            id: `usr-${Date.now()}`,
            stt: accounts.length + 1,
            name: userData.name,
            email: userData.email,
            phone: userData.phone || "090 000 0000",
            role: userData.role,
            status: "Kích hoạt",
            registerDate: new Date().toLocaleDateString("vi-VN"),
            address: userData.address,
            initials: userData.name.substring(0, 2).toUpperCase(),
            cctvCode: `CTV-2023-${Math.floor(100 + Math.random() * 900)}`,
            joinDate: new Date().toLocaleDateString("vi-VN"),
            shiftsCompleted: 0,
            rating: 5.0,
        };
        setAccounts([newAcc, ...accounts]);
        showToast(`Đã tạo tài khoản thành công cho ${userData.name}`);
    };

    const handleToggleAccountStatus = async (id: string) => {
        const target = accounts.find((a) => a.id === id);
        if (!target) return;
        const isDisabling = target.status === "Kích hoạt";
        const newStatus = isDisabling ? "Vô hiệu hóa" : "Kích hoạt";

        try {
            await toggleAccountStatus(id, isDisabling ? "disabled" : "active");
            setAccounts((prev) => prev.map((acc) => acc.id === id ? { ...acc, status: newStatus } : acc));
            if (isDisabling) {
                setShifts((prevShifts) =>
                    prevShifts.map((shift) => {
                        if (shift.assignedCTVs && shift.assignedCTVs.some((c) => c.id === id)) {
                            return {
                                ...shift,
                                assignedCTVs: shift.assignedCTVs.filter((c) => c.id !== id),
                            };
                        }
                        return shift;
                    }),
                );
                showToast(`Tài khoản "${target.name}" đã bị vô hiệu hoá.`);
            } else {
                showToast(`Đã kích hoạt lại tài khoản "${target.name}"`);
            }
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Không thể cập nhật trạng thái tài khoản.");
        }
    };

    const handleDeleteAccount = async (id: string) => {
        const target = accounts.find((a) => a.id === id);
        if (!target) return;

        try {
            await deleteAccount(id);

            setAccounts((prev) => prev.filter((a) => a.id !== id));

            setShifts((prevShifts) =>
                prevShifts.map((shift) => {
                    if (shift.assignedCTVs && shift.assignedCTVs.some((c) => c.id === id)) {
                        return {
                            ...shift,
                            assignedCTVs: shift.assignedCTVs.filter((c) => c.id !== id),
                        };
                    }
                    return shift;
                }),
            );

            if (selectedAccountDetail && selectedAccountDetail.id === id) {
                setSelectedAccountDetail(null);
            }

            showToast(`Đã xóa tài khoản ${target.name} và toàn bộ dữ liệu liên quan (lịch, lịch sử, hồ sơ).`);
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Không thể xóa tài khoản.");
        }
    };

    const handleChangeRole = (id: string, newRole: UserRole) => {
        setAccounts((prev) =>
            prev.map((acc) => {
                if (acc.id === id) {
                    showToast(`Đã đổi vai trò của ${acc.name} thành "${newRole}"`);
                    return { ...acc, role: newRole };
                }
                return acc;
            }),
        );
    };

    const handleResetPassword = async (id: string, newPassword: string, requireChangeOnLogin: boolean) => {
        const target = accounts.find((a) => a.id === id);
        if (!target) return;

        try {
            await resetPassword(id, newPassword);

            setAccounts((prev) =>
                prev.map((acc) => {
                    if (acc.id === id) {
                        return {
                            ...acc,
                            password: newPassword,
                            mustChangePassword: requireChangeOnLogin,
                        };
                    }
                    return acc;
                }),
            );

            if (selectedAccountDetail && selectedAccountDetail.id === id) {
                setSelectedAccountDetail((prev) =>
                    prev
                        ? {
                              ...prev,
                              password: newPassword,
                              mustChangePassword: requireChangeOnLogin,
                          }
                        : null,
                );
            }

            showToast(`Đã đặt lại mật khẩu cho ${target.name} thành công. Mật khẩu mới: ${newPassword}`);
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Không thể đặt lại mật khẩu.");
        }
    };

    const handleSaveAccountNotes = async (id: string, notes: string) => {
        try {
            await saveAdminNotes(id, notes);
            setAccounts((prev) =>
                prev.map((acc) => {
                    if (acc.id === id) {
                        return { ...acc, notes };
                    }
                    return acc;
                }),
            );
            setSelectedAccountDetail((prev) => (prev && prev.id === id ? { ...prev, notes } : prev));
            showToast("Đã lưu ghi chú quản trị viên thành công");
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Không thể lưu ghi chú.");
        }
    };

    const handleEndAccountSchedule = (accountId: string, startDate: string, endDate: string, reason: string) => {
        const targetAcc = accounts.find((a) => a.id === accountId);
        const accName = targetAcc?.name || "CTV";

        // Filter out shifts for this account that happen after endDate
        setShifts((prevShifts) =>
            prevShifts.map((shift) => {
                const isAssigned = (shift.assignedCTVs || []).some((c) => c.id === accountId || c.name === accName);
                if (!isAssigned) return shift;

                const shiftDate = shift.workDate;
                if (shiftDate && shiftDate > endDate) {
                    return {
                        ...shift,
                        assignedCTVs: (shift.assignedCTVs || []).filter(
                            (c) => c.id !== accountId && c.name !== accName,
                        ),
                    };
                }
                return shift;
            }),
        );

        // Update account note with end schedule record
        const formattedReason = reason.trim() ? reason.trim() : "Không có lý do ghi chú";
        const logEntry = `[Kết thúc lịch: ${startDate} - ${endDate} | Lý do: ${formattedReason}]`;

        setAccounts((prev) =>
            prev.map((acc) => {
                if (acc.id === accountId) {
                    const newNotes = acc.notes ? `${acc.notes}\n${logEntry}` : logEntry;
                    return { ...acc, notes: newNotes };
                }
                return acc;
            }),
        );

        setSelectedAccountDetail((prev) => {
            if (prev && prev.id === accountId) {
                const newNotes = prev.notes ? `${prev.notes}\n${logEntry}` : logEntry;
                return { ...prev, notes: newNotes };
            }
            return prev;
        });

        showToast(`Đã kết thúc lịch làm việc của ${accName} từ ${endDate}. Các ca sau ngày này đã được hủy bỏ.`);
    };

    // The backend only accepts numeric database ids for the request and the reviewing admin.
    const requireAdminId = (requestId: string): string => {
        if (!/^[0-9]+$/.test(requestId)) {
            throw new Error("Hồ sơ này chưa được đồng bộ với database. Vui lòng tải lại trang rồi duyệt lại.");
        }
        const storedAdminId = window.localStorage.getItem(AUTH_USER_ID_KEY) || "";
        const adminId = [currentUser.id, storedAdminId].find((value) => /^[0-9]+$/.test(value));
        if (!adminId) {
            throw new Error("Không xác định được quản trị viên đang đăng nhập. Vui lòng đăng nhập lại.");
        }
        return adminId;
    };

    // Request Operations
    const handleApproveRequest = async (id: string) => {
        const req = requests.find((r) => r.id === id);
        if (!req) return;

        try {
            await approveRegistrationRequest(id, requireAdminId(id));
            setRequests((prev) => prev.filter((r) => r.id !== id));
            showToast(`Đã phê duyệt hồ sơ của ${req.name} và lưu vào database`);
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Không thể phê duyệt hồ sơ");
        }
    };

    const handleRejectRequest = async (id: string) => {
        const req = requests.find((r) => r.id === id);
        if (!req) return;

        try {
            await rejectRegistrationRequest(id, requireAdminId(id));
            setRequests((prev) => prev.filter((r) => r.id !== id));
            if (selectedRequest?.id === id) {
                setSelectedRequest(null);
            }
            showToast(`Đã từ chối hồ sơ của ${req.name} và lưu vào database`);
        } catch (error) {
            showToast(error instanceof Error ? error.message : "Không thể từ chối hồ sơ");
        }
    };

    // Shift Operations
    const handleRegisterShift = (shiftId: string) => {
        setShifts((prev) => prev.map((s) => (s.id === shiftId ? { ...s, status: "Đã đăng ký" } : s)));
        showToast("Đăng ký ca làm thành công!");
    };

    const handleCancelShift = (shiftId: string) => {
        setShifts((prev) => prev.map((s) => (s.id === shiftId ? { ...s, status: "Chưa đăng ký" } : s)));
        showToast("Đã hủy đăng ký ca làm.");
    };

    // Meeting Operations
    const handleCancelMeeting = (meetingId: string) => {
        setMeetings((prev) => prev.filter((m) => m.id !== meetingId));
        showToast("Đã hủy cuộc họp thành công.");
    };

    const handleSendNotification = (meetingId: string) => {
        const meet = meetings.find((m) => m.id === meetingId);
        showToast(`Đã gửi thông báo nhắc nhở cuộc họp "${meet?.title}" tới tất cả thành viên.`);
    };

    // Profile Skills
    const handleAddSkill = (skill: string) => {
        const updatedSkills = [...(currentUser.skills || []), skill];
        setCurrentUser({ ...currentUser, skills: updatedSkills });
        showToast(`Đã thêm kỹ năng "${skill}" vào hồ sơ.`);
    };

    const handleSaveProfile = (updated: Partial<UserAccount>) => {
        setCurrentUser((prev) => {
            const next = { ...prev, ...updated };
            setAccounts((prevAccounts) =>
                prevAccounts.map((acc) => (acc.id === next.id ? { ...acc, ...updated } : acc)),
            );
            return next;
        });
    };

    const pendingRequestsCount = requests.filter((r) => r.status === "Chờ duyệt").length;

    if (!isLoggedIn) {
        return (
            <LoginScreen
                onLoginSuccess={handleLoginSuccess}
                onRequestRegister={(newRequest) => {
                    setRequests((prev) => [newRequest, ...prev]);
                }}
            />
        );
    }

    return (
        <div className={`h-screen flex overflow-hidden bg-[#faf9fd] text-[#1a1b1e] ${isDarkMode ? "dark" : ""}`}>
            {/* Toast Notification Banner */}
            {toastMessage && (
                <div className="fixed bottom-6 right-6 z-[100] bg-[#002046] text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200">
                    <span className="material-symbols-outlined text-[18px] text-[#16A34A]">check_circle</span>
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Sidebar Navigation (Desktop) */}
            <div className="hidden md:block">
                <Sidebar
                    currentTab={currentTab}
                    onSelectTab={(tab) => {
                        setCurrentTab(tab);
                        setIsMobileMenuOpen(false);
                    }}
                    pendingRequestsCount={pendingRequestsCount}
                    onLogout={handleLogout}
                    userName={currentUser.name}
                    userRole={currentUser.role}
                    userAvatar={currentUser.avatar}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />
            </div>

            {/* Mobile Drawer Overlay */}
            {isMobileMenuOpen && (
                <div
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="fixed inset-0 bg-black/50 z-30 md:hidden animate-in fade-in duration-150"></div>
            )}

            {/* Mobile Sidebar Drawer */}
            {isMobileMenuOpen && (
                <div className="fixed inset-y-0 left-0 w-[280px] bg-[#f4f3f7] z-40 md:hidden flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
                    <Sidebar
                        currentTab={currentTab}
                        onSelectTab={(tab) => {
                            setCurrentTab(tab);
                            setIsMobileMenuOpen(false);
                        }}
                        pendingRequestsCount={pendingRequestsCount}
                        onLogout={handleLogout}
                        userName={currentUser.name}
                        userRole={currentUser.role}
                        userAvatar={currentUser.avatar}
                        onOpenSettings={() => {
                            setIsSettingsOpen(true);
                            setIsMobileMenuOpen(false);
                        }}
                        isCollapsed={false}
                    />
                </div>
            )}

            {/* Main Content Area */}
            <div
                className={`flex-1 flex flex-col h-screen min-w-0 overflow-hidden relative transition-all duration-300 ease-in-out ${
                    isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-[280px]"
                }`}>
                {/* Mobile-Only Navigation Bar */}
                <div className="md:hidden px-4 py-3 border-b border-[#E2E8F0] dark:border-[#3b3d45] bg-[#f4f3f7] dark:bg-[#1a1b1e] flex items-center justify-between z-10 shrink-0 shadow-2xs">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 text-[#002046] dark:text-[#d6e3ff] hover:bg-[#e3e2e6] dark:hover:bg-[#2c2d33] rounded-lg flex items-center gap-2 font-bold text-sm cursor-pointer transition-colors">
                        <span className="material-symbols-outlined text-[22px]">menu</span>
                        <span>Danh mục</span>
                    </button>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#1b365d] dark:text-[#d6e3ff] truncate max-w-[150px]">
                            {currentTab === "accounts"
                                ? "Tài khoản"
                                : currentTab === "requests"
                                ? "Yêu cầu đăng ký"
                                : currentTab === "schedule"
                                ? "Lịch làm việc"
                                : currentTab === "meetings"
                                ? "Lịch tổng hợp"
                                : "Hồ sơ cá nhân"}
                        </span>
                    </div>
                </div>

                {/* Dynamic Page Views */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="max-w-7xl w-full mx-auto">
                        {currentTab === "accounts" && (
                            <AccountListScreen
                                accounts={accounts}
                                onCreateAccount={() => setIsCreateUserOpen(true)}
                                onToggleAccountStatus={handleToggleAccountStatus}
                                onDeleteAccount={handleDeleteAccount}
                                onViewAccountDetail={(acc) => setSelectedAccountDetail(acc)}
                                onChangeRole={handleChangeRole}
                                onResetPassword={handleResetPassword}
                            />
                        )}

                        {currentTab === "requests" && (
                            <RequestsScreen
                                requests={requests}
                                onApproveRequest={handleApproveRequest}
                                onRejectRequest={handleRejectRequest}
                                onViewRequestDetail={(req) => setSelectedRequest(req)}
                            />
                        )}

                        {currentTab === "schedule" && (
                            <ScheduleScreen
                                shifts={shifts}
                                history={history}
                                accounts={accounts}
                                onUpdateShifts={setShifts}
                                onShowToast={showToast}
                                onViewAccountDetail={(acc) => setSelectedAccountDetail(acc)}
                                currentUser={currentUser}
                                userRole={currentUser.role}
                            />
                        )}

                        {currentTab === "meetings" && (
                            <SummaryScheduleScreen
                                shifts={shifts}
                                history={history}
                                accounts={accounts}
                                onViewAccountDetail={(acc) => setSelectedAccountDetail(acc)}
                                onShowToast={showToast}
                                currentUser={currentUser}
                                userRole={currentUser.role}
                            />
                        )}

                        {currentTab === "profile" && (
                            <ProfileScreen
                                user={currentUser}
                                onOpenEditProfile={() => setIsEditProfileOpen(true)}
                                onOpenChangePassword={() => setIsChangePasswordOpen(true)}
                                onUpdateAvatar={async (newAvatar) => {
                                    try {
                                        const result = await updateProfile(currentUser.id, { name: currentUser.name, avatar: newAvatar || "" });
                                        const savedUrl = result.avatar ?? newAvatar;
                                        handleSaveProfile({ avatar: savedUrl });
                                        if (!newAvatar) { showToast("Đã xóa ảnh đại diện"); }
                                        else { showToast("Đã thay đổi ảnh đại diện thành công"); }
                                    } catch (err) {
                                        showToast(err instanceof Error ? err.message : "Không thể cập nhật ảnh đại diện.");
                                    }
                                }}
                                onUpdateCccdFront={async (url) => {
                                    try {
                                        const result = await updateProfile(currentUser.id, { name: currentUser.name, cccdFront: url || "" });
                                        const savedUrl = result.cccdFront ?? url;
                                        handleSaveProfile({ cccdFront: savedUrl });
                                        if (!url) { showToast("Đã xóa ảnh CCCD mặt trước"); }
                                        else { showToast("Đã thay đổi ảnh CCCD mặt trước thành công"); }
                                    } catch (err) {
                                        showToast(err instanceof Error ? err.message : "Không thể cập nhật CCCD mặt trước.");
                                    }
                                }}
                                onUpdateCccdBack={async (url) => {
                                    try {
                                        const result = await updateProfile(currentUser.id, { name: currentUser.name, cccdBack: url || "" });
                                        const savedUrl = result.cccdBack ?? url;
                                        handleSaveProfile({ cccdBack: savedUrl });
                                        if (!url) { showToast("Đã xóa ảnh CCCD mặt sau"); }
                                        else { showToast("Đã thay đổi ảnh CCCD mặt sau thành công"); }
                                    } catch (err) {
                                        showToast(err instanceof Error ? err.message : "Không thể cập nhật CCCD mặt sau.");
                                    }
                                }}
                                onUpdateCvFile={async (cvData) => {
                                    try {
                                        if (!cvData) {
                                            await updateProfile(currentUser.id, { name: currentUser.name, cvFile: "", cvFileName: "" });
                                            handleSaveProfile({ cvFile: undefined, cvFileName: undefined, cvFileSize: undefined });
                                            showToast("Đã xóa file CV");
                                        } else {
                                            const result = await updateProfile(currentUser.id, { name: currentUser.name, cvFile: cvData.cvFile, cvFileName: cvData.cvFileName });
                                            const savedUrl = result.cvFile ?? cvData.cvFile;
                                            handleSaveProfile({ cvFile: savedUrl, cvFileName: cvData.cvFileName, cvFileSize: cvData.cvFileSize });
                                            showToast(`Đã cập nhật file CV: ${cvData.cvFileName}`);
                                        }
                                    } catch (err) {
                                        showToast(err instanceof Error ? err.message : "Không thể cập nhật file CV.");
                                    }
                                }}
                            />
                        )}
                    </div>
                </main>
            </div>

            {/* Global Modals */}
            <CreateUserModal
                isOpen={isCreateUserOpen}
                onClose={() => setIsCreateUserOpen(false)}
                onSubmit={handleCreateAccount}
            />

            <ViewRequestModal
                request={selectedRequest}
                onClose={() => setSelectedRequest(null)}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
            />

            <ViewAccountDetailModal
                account={selectedAccountDetail}
                shifts={shifts}
                history={history}
                onClose={() => setSelectedAccountDetail(null)}
                onToggleStatus={handleToggleAccountStatus}
                onSaveNotes={handleSaveAccountNotes}
                onEndSchedule={handleEndAccountSchedule}
                onResetPassword={handleResetPassword}
            />

            <EditProfileModal
                isOpen={isEditProfileOpen}
                user={currentUser}
                onClose={() => setIsEditProfileOpen(false)}
                onSave={handleSaveProfile}
                onShowToast={showToast}
            />

            <ChangePasswordModal
                isOpen={isChangePasswordOpen}
                userId={currentUser.id}
                onClose={() => setIsChangePasswordOpen(false)}
                onSuccess={() => showToast("Đổi mật khẩu thành công!")}
            />

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};

export default App;
