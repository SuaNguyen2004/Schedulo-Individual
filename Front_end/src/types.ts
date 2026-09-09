export type UserRole = "Admin" | "Cộng tác viên";

export type AccountStatus = "Kích hoạt" | "Vô hiệu hóa" | "Chờ duyệt";

export type RequestStatus = "Chờ duyệt" | "Đã duyệt" | "Từ chối";

export type ShiftStatus = "Đã đăng ký" | "Chưa đăng ký" | "Chờ duyệt" | "Nghỉ";

export type ViewTab = "accounts" | "requests" | "schedule" | "meetings" | "profile";

export interface UserAccount {
    id: string;
    stt: number;
    name: string;
    email: string;
    phone: string;
    role: UserRole;
    status: AccountStatus;
    avatar?: string;
    initials?: string;
    registerDate: string;
    dob?: string;
    gender?: string;
    cccd?: string;
    cccdFront?: string;
    cccdBack?: string;
    cvFile?: string;
    cvFileName?: string;
    cvFileSize?: string;
    address?: string;
    cctvCode?: string;
    joinDate?: string;
    region?: string;
    shiftsCompleted?: number;
    rating?: number;
    skills?: string[];
    notes?: string;
    adminNote?: string;
}

export interface RegistrationRequest {
    id: string;
    stt: number;
    name: string;
    email: string;
    phone: string;
    submittedAt: string;
    status: RequestStatus;
    initials?: string;
    notes?: string;
    dob?: string;
    cccd?: string;
    address?: string;
    experience?: string;
    cccdFront?: string;
    cccdBack?: string;
    cvFile?: string;
    cvFileName?: string;
    cvFileSize?: string;
}

export interface AssignedCTV {
    id: string;
    name: string;
    avatar?: string;
    initials?: string;
    phone?: string;
    cctvCode?: string;
    status: "Đã duyệt" | "Chờ duyệt";
}

export interface ShiftSlot {
    id: string;
    dayIndex: number; // 0 for Mon to 6 for Sun
    dayName: string; // "Thứ 2", "Thứ 3", etc.
    dateStr: string; // "06/07", "07/07", etc.
    shiftType: "morning" | "afternoon" | "evening";
    shiftTimeLabel: string; // "08:00 - 12:00", "13:30 - 17:30", "18:00 - 21:00"
    title?: string;
    status: ShiftStatus;
    allowRegister: boolean;
    assignedCTVs?: AssignedCTV[];
    targetCapacity?: number;
    notes?: string;
    workDate?: string; // ISO date (YYYY-MM-DD) for calendar navigation
    registrationId?: string;
    registrationStartDate?: string;
    registrationEndDate?: string;
}

export * from "./utils/formatters";
