import type { MeetingItem, RegistrationRequest, ShiftSlot, UserAccount, WorkRoom } from "../types";

export interface BootstrapData {
    accounts: UserAccount[];
    requests: RegistrationRequest[];
    /** Registered plan, drives the "Lịch tuần" grid. Rewritten on every registration. */
    shifts: ShiftSlot[];
    /** Elapsed shifts frozen server-side, drives "Lịch sử làm việc". Never rewritten. */
    history: ShiftSlot[];
    meetings: MeetingItem[];
    rooms: WorkRoom[];
}

export async function fetchBootstrapData(signal?: AbortSignal): Promise<BootstrapData> {
    const response = await fetch("/api/bootstrap", { signal });
    if (!response.ok) throw new Error(`Bootstrap request failed: ${response.status}`);
    return response.json() as Promise<BootstrapData>;
}

export interface AuthenticatedUser {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "CTV";
    status: "ACTIVE" | "PENDING";
}

export async function loginWithDatabase(email: string, password: string): Promise<AuthenticatedUser> {
    const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Đăng nhập thất bại.");
    }
    return response.json() as Promise<AuthenticatedUser>;
}

export interface RegistrationPayload {
    name: string;
    email: string;
    phone: string;
    dob: string;
    password: string;
    attachments: Array<{ fileType: string; fileName: string; filePath: string; fileSize?: number }>;
}

export interface CreatedRegistration {
    id: string;
    status: string;
}

export async function registerWithDatabase(payload: RegistrationPayload): Promise<CreatedRegistration> {
    const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể gửi yêu cầu đăng ký.");
    }
    return response.json() as Promise<CreatedRegistration>;
}

export interface ShiftRegistrationPayload {
    userId: string;
    startDate?: string;
    endDate?: string;
    registrations: Array<{
        dayOfWeek: number;
        shiftType: "morning" | "afternoon";
    }>;
}

export async function saveShiftRegistrations(payload: ShiftRegistrationPayload): Promise<void> {
    const response = await fetch("/api/shifts/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể lưu lịch làm việc.");
    }
}

async function reviewRegistrationRequest(id: string, adminId: string, action: "approve" | "reject"): Promise<void> {
    const response = await fetch(`/api/registration-requests/${encodeURIComponent(id)}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
    });
    if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể cập nhật hồ sơ.");
    }
}

export function approveRegistrationRequest(id: string, adminId: string): Promise<void> {
    return reviewRegistrationRequest(id, adminId, "approve");
}

export function rejectRegistrationRequest(id: string, adminId: string): Promise<void> {
    return reviewRegistrationRequest(id, adminId, "reject");
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const response = await fetch("/api/auth/change-password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, oldPassword, newPassword }),
    });
    if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể đổi mật khẩu.");
    }
}

export async function updateProfile(userId: string, profile: { name?: string; email?: string; phone?: string; dob?: string }): Promise<void> {
    const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...profile }),
    });
    if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể cập nhật hồ sơ.");
    }
}
