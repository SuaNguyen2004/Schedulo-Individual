import React, { useEffect, useState } from "react";
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
import { fetchBootstrapData } from "./utils/api";
import { approveRegistrationRequest, rejectRegistrationRequest, AuthenticatedUser } from "./utils/api";

const SHIFTS_STORAGE_KEY = "schedulo_shifts";
const AUTH_STORAGE_KEY = "schedulo_authenticated";
const AUTH_USER_EMAIL_KEY = "schedulo_authenticated_email";
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

    // Toast feedback state
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    useEffect(() => {
        window.localStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(shifts));
    }, [shifts]);

    useEffect(() => {
        const controller = new AbortController();

        fetchBootstrapData(controller.signal)
            .then((data) => {
                setAccounts(data.accounts);
                setRequests(data.requests);
                setShifts(data.shifts);
                setMeetings(data.meetings);
                setRooms(data.rooms);
                const authenticatedEmail = window.localStorage.getItem(AUTH_USER_EMAIL_KEY);
                const authenticatedAccount = data.accounts.find((account) => account.email === authenticatedEmail);
                if (authenticatedAccount) {
                    setCurrentUser(authenticatedAccount);
                    setCurrentTab(authenticatedAccount.role === "Admin" ? "accounts" : "schedule");
                }
            })
            .catch((error: unknown) => {
                if (error instanceof DOMException && error.name === "AbortError") return;
                console.warn("Không thể tải dữ liệu từ Backend, sử dụng dữ liệu cục bộ.", error);
            });

        return () => controller.abort();
    }, []);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => {
            setToastMessage(null);
        }, 3000);
    };

    // Handlers
    const handleLoginSuccess = (user: AuthenticatedUser) => {
        setIsLoggedIn(true);
        window.localStorage.setItem(AUTH_STORAGE_KEY, "true");
        window.localStorage.setItem(AUTH_USER_EMAIL_KEY, user.email);
        const account = accounts.find((item) => item.id === user.id || item.email === user.email);
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
                status: user.status === "PENDING" ? "Chờ duyệt" : "Kích hoạt",
            });
            setCurrentTab(user.role === "ADMIN" ? "accounts" : "schedule");
        }
        showToast(`Đăng nhập thành công với ${user.email}`);
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        window.localStorage.removeItem(AUTH_USER_EMAIL_KEY);
        window.localStorage.removeItem("schedulo_weekly_pattern");
        showToast("Đã đăng xuất khỏi hệ thống");
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

    const handleToggleAccountStatus = (id: string) => {
        setAccounts((prev) =>
            prev.map((acc) => {
                if (acc.id === id) {
                    const newStatus = acc.status === "Kích hoạt" ? "Vô hiệu hóa" : "Kích hoạt";
                    if (newStatus === "Vô hiệu hóa") {
                        // Automatically cancel future shift registrations for this CTV while keeping 1 month past history
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
                        showToast(
                            `Đã khóa tài khoản ${acc.name}. Giữ nguyên lịch 1 tháng quá khứ và tự động hủy ca đăng ký 2 tháng tương lai để giải phóng chỗ.`,
                        );
                    } else {
                        showToast(`Đã kích hoạt lại tài khoản ${acc.name}`);
                    }
                    return { ...acc, status: newStatus };
                }
                return acc;
            }),
        );
    };

    const handleDeleteAccount = (id: string) => {
        const target = accounts.find((a) => a.id === id);
        if (target && confirm(`Bạn có chắc chắn muốn xóa tài khoản ${target.name}?`)) {
            setAccounts((prev) => prev.filter((a) => a.id !== id));
            showToast(`Đã xóa tài khoản ${target.name}`);
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

    const handleResetPassword = (id: string, newPassword: string, requireChangeOnLogin: boolean) => {
        const target = accounts.find((a) => a.id === id);
        if (!target) return;

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
    };

    const handleSaveAccountNotes = (id: string, notes: string) => {
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

    // Request Operations
    const handleApproveRequest = async (id: string) => {
        const req = requests.find((r) => r.id === id);
        if (!req) return;

        try {
            await approveRegistrationRequest(id, currentUser.id);
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
            await rejectRegistrationRequest(id, currentUser.id);
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
        setCurrentUser({ ...currentUser, ...updated });
        showToast("Đã cập nhật thông tin hồ sơ cá nhân.");
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
                <div className="fixed bottom-6 right-6 z-50 bg-[#002046] text-white text-xs font-semibold px-4 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200">
                    <span className="material-symbols-outlined text-[18px] text-[#16A34A]">check_circle</span>
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Sidebar Navigation */}
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

            {/* Mobile Drawer Overlay */}
            {isMobileMenuOpen && (
                <div
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"></div>
            )}

            {/* Mobile Sidebar */}
            {isMobileMenuOpen && (
                <div className="fixed inset-y-0 left-0 w-[280px] bg-[#f4f3f7] z-40 md:hidden flex flex-col">
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
                {/* Mobile-Only Bar */}
                <div className="md:hidden p-3 border-b border-[#E2E8F0] dark:border-[#3b3d45] bg-[#f4f3f7] dark:bg-[#1a1b1e] flex items-center justify-between z-10 shrink-0">
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="p-2 text-[#002046] dark:text-[#d6e3ff] hover:bg-[#e3e2e6] rounded-lg flex items-center gap-2 font-semibold text-sm cursor-pointer">
                        <span className="material-symbols-outlined">menu</span>
                        <span>Danh mục</span>
                    </button>
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
                                onUpdateAvatar={(newAvatar) => {
                                    handleSaveProfile({ avatar: newAvatar });
                                    if (!newAvatar) {
                                        showToast("Đã xóa ảnh đại diện");
                                    } else {
                                        showToast("Đã thay đổi ảnh đại diện thành công");
                                    }
                                }}
                                onUpdateCccdFront={(url) => {
                                    handleSaveProfile({ cccdFront: url });
                                    if (!url) {
                                        showToast("Đã xóa ảnh CCCD mặt trước");
                                    } else {
                                        showToast("Đã thay đổi ảnh CCCD mặt trước thành công");
                                    }
                                }}
                                onUpdateCccdBack={(url) => {
                                    handleSaveProfile({ cccdBack: url });
                                    if (!url) {
                                        showToast("Đã xóa ảnh CCCD mặt sau");
                                    } else {
                                        showToast("Đã thay đổi ảnh CCCD mặt sau thành công");
                                    }
                                }}
                                onUpdateCvFile={(cvData) => {
                                    if (!cvData) {
                                        handleSaveProfile({
                                            cvFile: undefined,
                                            cvFileName: undefined,
                                            cvFileSize: undefined,
                                        });
                                        showToast("Đã xóa file CV");
                                    } else {
                                        handleSaveProfile({
                                            cvFile: cvData.cvFile,
                                            cvFileName: cvData.cvFileName,
                                            cvFileSize: cvData.cvFileSize,
                                        });
                                        showToast(`Đã cập nhật file CV: ${cvData.cvFileName}`);
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
            />

            <ChangePasswordModal
                isOpen={isChangePasswordOpen}
                onClose={() => setIsChangePasswordOpen(false)}
                onSuccess={() => showToast("Đổi mật khẩu thành công!")}
            />

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
};

export default App;
