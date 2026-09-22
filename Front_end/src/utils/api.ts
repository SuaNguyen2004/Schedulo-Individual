import type { RegistrationRequest, ShiftSlot, UserAccount } from "../types";

const TOKEN_KEY = "schedulo_auth_token";

export function getAuthToken(): string | null {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

export function setAuthToken(token: string | null): void {
    try {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    } catch {
        // Ignore storage errors
    }
}

function authHeaders(): Record<string, string> {
    const token = getAuthToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
}

export interface BootstrapData {
    accounts: UserAccount[];
    requests: RegistrationRequest[];
    /** Registered plan, drives the "Lịch tuần" grid. Rewritten on every registration. */
    shifts: ShiftSlot[];
    /** Elapsed shifts frozen server-side, drives "Lịch sử làm việc". Never rewritten. */
    history: ShiftSlot[];
}

export async function fetchBootstrapData(signal?: AbortSignal): Promise<BootstrapData> {
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }
    const response = await fetch("/api/bootstrap", { signal, headers });
    if (!response.ok) throw new Error(`Bootstrap request failed: ${response.status}`);
    return response.json() as Promise<BootstrapData>;
}

export interface AuthenticatedUser {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "CTV";
    status: "ACTIVE" | "PENDING";
    token?: string;
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
    const user = (await response.json()) as AuthenticatedUser;
    if (user.token) {
        setAuthToken(user.token);
    }
    return user;
}

export async function logoutDatabase(): Promise<void> {
    const token = getAuthToken();
    try {
        if (token) {
            await fetch("/api/auth/logout", {
                method: "POST",
                headers: authHeaders(),
            });
        }
    } finally {
        setAuthToken(null);
    }
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
        const data = (await response.json().catch(() => null)) as { message?: string; detail?: string } | null;
        throw new Error(data?.detail || data?.message || "Không thể gửi yêu cầu đăng ký.");
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
        headers: authHeaders(),
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
        headers: authHeaders(),
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
        headers: authHeaders(),
        body: JSON.stringify({ userId, oldPassword, newPassword }),
    });
    if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể đổi mật khẩu.");
    }
}

export async function resetPassword(userId: string, newPassword: string): Promise<void> {
    const response = await fetch("/api/auth/reset-password", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ userId, newPassword }),
    });
    if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể đặt lại mật khẩu.");
    }
}

export interface ProfileUpdatePayload {
    name?: string;
    email?: string;
    phone?: string;
    dob?: string;
    avatar?: string;
    cccdFront?: string;
    cccdBack?: string;
    cvFile?: string;
    cvFileName?: string;
}

export interface ProfileUpdateResponse {
    message: string;
    avatar?: string;
    cccdFront?: string;
    cccdBack?: string;
    cvFile?: string;
}

export async function updateProfile(userId: string, profile: ProfileUpdatePayload): Promise<ProfileUpdateResponse> {
    const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ userId, ...profile }),
    });
    if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể cập nhật hồ sơ.");
    }
    return response.json();
}

export async function saveAdminNotes(userId: string, notes: string): Promise<void> {
    const response = await fetch("/api/admin/notes", {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ userId, notes }),
    });
    if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể lưu ghi chú.");
    }
}

export async function toggleAccountStatus(userId: string, status: "active" | "disabled"): Promise<void> {
    const response = await fetch(`/api/users/${encodeURIComponent(userId)}/status`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ status }),
    });
    if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể cập nhật trạng thái tài khoản.");
    }
}

export async function deleteAccount(userId: string): Promise<void> {
    const response = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: "DELETE",
        headers: authHeaders(),
    });
    if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(data?.message || "Không thể xóa tài khoản.");
    }
}
