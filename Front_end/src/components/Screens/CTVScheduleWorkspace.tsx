import React, { useEffect, useMemo, useState } from "react";
import { AssignedCTV, ShiftSlot, UserAccount } from "../../types";
import { saveShiftRegistrations, fetchBootstrapData } from "../../utils/api";

interface CTVScheduleWorkspaceProps {
    /** Registered plan. Drives "Lịch tuần", including days of the current week that already passed. */
    shifts: ShiftSlot[];
    /** Elapsed shifts frozen server-side. Drives "Lịch sử làm việc" and is never derived from `shifts`. */
    history: ShiftSlot[];
    currentUser: UserAccount;
    onUpdateShifts: (updatedShifts: ShiftSlot[]) => void;
    onShowToast: (message: string) => void;
}

type CalendarView = "week" | "month";
type ShiftType = "morning" | "afternoon";
type WeeklyPattern = Record<number, ShiftType[]>;

const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS = [
    { index: 0, short: "T2", label: "Thứ 2" },
    { index: 1, short: "T3", label: "Thứ 3" },
    { index: 2, short: "T4", label: "Thứ 4" },
    { index: 3, short: "T5", label: "Thứ 5" },
    { index: 4, short: "T6", label: "Thứ 6" },
] as const;

const SHIFT_OPTIONS: Array<{
    type: ShiftType;
    label: string;
    icon: string;
    surface: string;
}> = [
    {
        type: "morning",
        label: "Ca sáng",
        icon: "light_mode",
        surface:
            "bg-amber-50 text-amber-700 border-amber-200",
    },
    {
        type: "afternoon",
        label: "Ca chiều",
        icon: "wb_twilight",
        surface:
            "bg-purple-50 text-purple-700 border-purple-200",
    },
];

const createEmptyPattern = (): WeeklyPattern => ({ 0: [], 1: [], 2: [], 3: [], 4: [] });

const clonePattern = (pattern?: WeeklyPattern | null): WeeklyPattern => {
    if (!pattern) return createEmptyPattern();
    const cloned = createEmptyPattern();
    for (const key of [0, 1, 2, 3, 4] as const) {
        if (Array.isArray(pattern[key])) {
            cloned[key] = [...pattern[key]];
        }
    }
    return cloned;
};

const startOfDay = (date: Date) => {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
};

const addDays = (date: Date, amount: number) => new Date(startOfDay(date).getTime() + amount * DAY_MS);

const startOfWeek = (date: Date) => {
    const normalized = startOfDay(date);
    const mondayOffset = (normalized.getDay() + 6) % 7;
    return addDays(normalized, -mondayOffset);
};

const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

const toISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const parseISODate = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
};

const formatShortDate = (date: Date) =>
    `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;

const formatDateWithYear = (date: Date) => `${formatShortDate(date)}/${date.getFullYear()}`;

const formatCalendarDate = (date: Date) => `${date.getDate()}/${date.getMonth() + 1}`;

const formatFullDate = (date: Date) =>
    new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);

const getShiftMeta = (type: ShiftType) => SHIFT_OPTIONS.find((option) => option.type === type) || SHIFT_OPTIONS[0];

const getDayIndex = (date: Date) => (date.getDay() + 6) % 7;

export const CTVScheduleWorkspace: React.FC<CTVScheduleWorkspaceProps> = ({
    shifts,
    history,
    currentUser,
    onUpdateShifts,
    onShowToast,
}) => {
    const today = useMemo(() => startOfDay(new Date()), []);
    const todayISO = toISODate(today);

    const nextMondayDate = useMemo(() => {
        const mondayOffset = (startOfDay(today).getDay() + 6) % 7;
        return addDays(startOfDay(today), 7 - mondayOffset);
    }, [today]);

    const legacyWeekStart = useMemo(() => startOfWeek(today), [today]);

    const [calendarView, setCalendarView] = useState<CalendarView>("week");
    const [calendarDate, setCalendarDate] = useState(today);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
    const [editingRegistrationId, setEditingRegistrationId] = useState<string | null>(null);
    const [selectedShift, setSelectedShift] = useState<ShiftSlot | null>(null);

    // The weekly pattern is only the state of the registration dialog. It must never
    // be persisted, otherwise a stale pattern from a previous session/user would be
    // rendered as shifts that do not exist in the database.
    const [weeklyPattern, setWeeklyPattern] = useState<WeeklyPattern>(createEmptyPattern);

    // Temporary pattern for modal selections - only committed when "Đăng ký lịch" is clicked
    const [tempWeeklyPattern, setTempWeeklyPattern] = useState<WeeklyPattern>(createEmptyPattern);

    // Drop any dialog state left over from a previous account.
    useEffect(() => {
        setWeeklyPattern(createEmptyPattern());
        setTempWeeklyPattern(createEmptyPattern());
    }, [currentUser.id]);

    const [workContent, setWorkContent] = useState(
        "Hỗ trợ điều phối lịch, kiểm tra dữ liệu và cập nhật tiến độ công việc trong ca.",
    );

    useEffect(() => {
        if (!isRegistrationOpen && !selectedShift) return;
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            setIsRegistrationOpen(false);
            setSelectedShift(null);
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isRegistrationOpen, selectedShift]);

    const resolveShiftDate = (shift: ShiftSlot) =>
        shift.workDate || toISODate(addDays(legacyWeekStart, shift.dayIndex));

    const isAssignedToCurrentUser = (shift: ShiftSlot) =>
        (shift.assignedCTVs || []).some((ctv) => String(ctv.id) === String(currentUser.id));

    const myShifts = useMemo(
        () =>
            shifts
                .filter(
                    (shift) =>
                        shift.dayIndex >= 0 &&
                        shift.dayIndex <= 4 &&
                        (shift.shiftType === "morning" || shift.shiftType === "afternoon") &&
                        isAssignedToCurrentUser(shift),
                )
                .sort((a, b) => resolveShiftDate(a).localeCompare(resolveShiftDate(b))),
        [shifts, currentUser.id, legacyWeekStart],
    );

    const getMyShift = (date: Date, shiftType: ShiftType) => {
        const dateISO = toISODate(date);
        return myShifts.find((shift) => shift.workDate === dateISO && shift.shiftType === shiftType);
    };

    // "Lịch sử làm việc" reads the frozen history feed, never `shifts`. That is what
    // lets a pattern registered today cover an already-elapsed day of this week (it
    // appears in the week grid) without rewriting what that day's history says.
    const myHistory = useMemo(
        () =>
            history.filter(
                (shift) =>
                    Boolean(shift.workDate) &&
                    (shift.shiftType === "morning" || shift.shiftType === "afternoon") &&
                    isAssignedToCurrentUser(shift),
            ),
        [history, currentUser.id],
    );

    const getHistoryShift = (date: Date, shiftType: ShiftType) => {
        const dateISO = toISODate(date);
        return myHistory.find((shift) => shift.workDate === dateISO && shift.shiftType === shiftType) || null;
    };

    // Only shifts that actually exist in the database are rendered. Previously this
    // also synthesised shifts from `weeklyPattern`, which produced phantom entries
    // in both the week grid and the monthly history.
    const getVisibleShift = (date: Date, shiftType: ShiftType) => {
        const existing = getMyShift(date, shiftType);
        return existing && isAssignedToCurrentUser(existing) ? existing : null;
    };

    const weekStart = startOfWeek(calendarDate);
    const weekDays = Array.from({ length: 5 }, (_, index) => addDays(weekStart, index));
    const weekRangeLabel = `${formatShortDate(weekDays[0])} - ${formatDateWithYear(weekDays[4])}`;

    const monthStart = startOfMonth(calendarDate);
    const monthWeeks: Array<Array<Date | null>> = [];
    let currentMonthWeek: Array<Date | null> = [null, null, null, null, null];
    const daysInMonth = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate();

    for (let day = 1; day <= daysInMonth; day += 1) {
        const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
        const weekDay = date.getDay();
        if (weekDay < 1 || weekDay > 5) continue;

        currentMonthWeek[weekDay - 1] = date;
        if (weekDay === 5) {
            monthWeeks.push(currentMonthWeek);
            currentMonthWeek = [null, null, null, null, null];
        }
    }

    if (currentMonthWeek.some(Boolean)) monthWeeks.push(currentMonthWeek);

    const todayShifts = myShifts.filter((shift) => shift.workDate === todayISO);

    const openRegistration = () => {
        const restoredPattern = createEmptyPattern();
        const sourcePattern =
            (currentUser.nextPattern && currentUser.nextPattern.length > 0)
                ? currentUser.nextPattern
                : (currentUser.currentPattern && currentUser.currentPattern.length > 0)
                ? currentUser.currentPattern
                : null;

        if (sourcePattern && sourcePattern.length > 0) {
            sourcePattern.forEach((item) => {
                if (item.dayOfWeek >= 0 && item.dayOfWeek <= 4) {
                    if (!restoredPattern[item.dayOfWeek].includes(item.shiftType)) {
                        restoredPattern[item.dayOfWeek].push(item.shiftType);
                    }
                }
            });
        } else {
            const currentWeekMonday = startOfWeek(today);
            const currentWeekMondayISO = toISODate(currentWeekMonday);
            const activeShifts = myShifts.filter((shift) => shift.workDate && shift.workDate >= currentWeekMondayISO);
            for (const shift of activeShifts) {
                if (!shift.workDate) continue;
                const dayIndex = getDayIndex(parseISODate(shift.workDate));
                const shiftType = shift.shiftType as ShiftType;
                if (dayIndex >= 0 && dayIndex <= 4 && (shiftType === "morning" || shiftType === "afternoon")) {
                    if (!restoredPattern[dayIndex].includes(shiftType)) {
                        restoredPattern[dayIndex].push(shiftType);
                    }
                }
            }
        }

        setWeeklyPattern(restoredPattern);
        setTempWeeklyPattern(clonePattern(restoredPattern));
        setIsRegistrationOpen(true);
    };

    const changeMonth = (amount: number) => {
        setCalendarDate((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    };

    const changeWeek = (amount: number) => {
        setCalendarDate((current) => addDays(current, amount * 7));
    };

    const togglePattern = (dayIndex: number, shiftType: ShiftType) => {
        setTempWeeklyPattern((current) => {
            const selectedShifts = current[dayIndex] || [];
            return {
                ...current,
                [dayIndex]: selectedShifts.includes(shiftType)
                    ? selectedShifts.filter((selected) => selected !== shiftType)
                    : [...selectedShifts, shiftType],
            };
        });
    };

    const closeRegistrationModal = () => {
        setIsRegistrationOpen(false);
        setTempWeeklyPattern(createEmptyPattern());
    };

    const handleRegisterSchedule = async (event: React.FormEvent) => {
        event.preventDefault();

        const flatRegistrations: Array<{ dayOfWeek: number; shiftType: "morning" | "afternoon" }> = [];
        for (let dayIndex = 0; dayIndex <= 4; dayIndex++) {
            const shiftTypes = tempWeeklyPattern[dayIndex] || [];
            shiftTypes.forEach((shiftType) => {
                flatRegistrations.push({ dayOfWeek: dayIndex, shiftType });
            });
        }

        const nextMondayLabel = formatShortDate(nextMondayDate);

        if (flatRegistrations.length === 0) {
            const confirmed = window.confirm(
                `Xác nhận hủy đăng ký lịch từ Thứ Hai ngày ${nextMondayLabel}? Lịch tuần hiện tại sẽ được giữ nguyên.`
            );
            if (!confirmed) return;

            try {
                const res = await saveShiftRegistrations({
                    userId: currentUser.id,
                    registrations: [],
                });
                const fresh = await fetchBootstrapData();
                if (fresh?.shifts) onUpdateShifts(fresh.shifts);
                setWeeklyPattern(createEmptyPattern());
                setTempWeeklyPattern(createEmptyPattern());
                setIsRegistrationOpen(false);
                onShowToast(res.message || `Đã hủy lịch làm việc từ Thứ Hai ngày ${nextMondayLabel}.`);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Không thể hủy lịch làm việc.";
                onShowToast(message);
            }
            return;
        }

        try {
            const res = await saveShiftRegistrations({
                userId: currentUser.id,
                registrations: flatRegistrations,
            });
            const fresh = await fetchBootstrapData();
            if (fresh?.shifts) onUpdateShifts(fresh.shifts);
            setWeeklyPattern(clonePattern(tempWeeklyPattern));
            setIsRegistrationOpen(false);
            onShowToast(res.message || `Đã lưu mẫu lịch làm việc thành công. Áp dụng từ Thứ Hai ngày ${nextMondayLabel}.`);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Không thể lưu lịch làm việc.";
            onShowToast(message);
        }
    };

    const removeCurrentUserFromShift = (shift: ShiftSlot) => {
        const assignedCTVs = (shift.assignedCTVs || []).filter(
            (ctv) => String(ctv.id) !== String(currentUser.id),
        );

        return {
            ...shift,
            assignedCTVs,
            status: assignedCTVs.length > 0 ? shift.status : ("Chưa đăng ký" as const),
        };
    };



    const renderShiftCard = (shift: ShiftSlot, _compact = false, _showShiftLabel = false) => {
        const meta = getShiftMeta(shift.shiftType as ShiftType);

        return (
            <div
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs mx-auto select-none pointer-events-none"
                aria-label={meta.label}>
                <span className="material-symbols-outlined text-[20px] font-bold">check</span>
            </div>
        );
    };

    const isPending = currentUser.status === "Chờ duyệt";

    return (
        <div className="space-y-5 pb-8">
            {isPending && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-[24px] text-amber-600 shrink-0 mt-0.5">
                            pending
                        </span>
                        <div>
                            <h4 className="font-bold text-sm text-amber-900">
                                Tài khoản đang chờ duyệt
                            </h4>
                            <p className="text-xs text-amber-800 mt-1">
                                Tài khoản của bạn đang ở trạng thái <strong>Chờ duyệt</strong> bởi Quản trị viên. Trong
                                thời gian này, bạn chưa thể đăng ký lịch làm việc. Bạn vẫn có thể xem và cập nhật hồ sơ
                                cá nhân trong mục <strong>Hồ sơ</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-blue-50/70 p-3 sm:p-4 shadow-sm space-y-3">
                <div className="flex flex-row items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider sm:tracking-[0.16em] text-blue-700 shrink-0">
                        <span className="material-symbols-outlined text-[16px] sm:text-[18px]" aria-hidden="true">
                            calendar_month
                        </span>
                        Lịch làm việc
                    </div>
                    {isPending ? (
                        <button
                            type="button"
                            disabled
                            className="inline-flex min-h-9 sm:min-h-11 shrink-0 items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-slate-300 px-3 py-1.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-bold text-slate-500 cursor-not-allowed whitespace-nowrap"
                            title="Tài khoản chờ duyệt chưa thể đăng ký lịch làm việc">
                            <span className="material-symbols-outlined text-[18px] sm:text-[20px]" aria-hidden="true">
                                lock
                            </span>
                            Chờ duyệt để đăng ký ca
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={openRegistration}
                            className="inline-flex min-h-9 sm:min-h-11 shrink-0 items-center justify-center gap-1.5 sm:gap-2 rounded-xl bg-blue-700 px-3 py-1.5 sm:px-5 sm:py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition-colors duration-200 hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 cursor-pointer whitespace-nowrap">
                            <span className="material-symbols-outlined text-[18px] sm:text-[20px]" aria-hidden="true">
                                edit_calendar
                            </span>
                            Đăng ký lịch làm việc
                        </button>
                    )}
                </div>

                {currentUser.isCancelledNextWeek ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-2.5 sm:p-3 text-amber-900 text-xs flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-amber-600">event_busy</span>
                        <span>
                            Bạn đã hủy lịch làm việc từ Thứ Hai ngày <strong>{formatShortDate(nextMondayDate)}</strong>. Lịch tuần hiện tại được giữ nguyên.
                        </span>
                    </div>
                ) : currentUser.nextPattern && currentUser.nextPattern.length > 0 && JSON.stringify(currentUser.nextPattern) !== JSON.stringify(currentUser.currentPattern) ? (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 sm:p-3 text-blue-950 text-xs flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-blue-700">update</span>
                        <span>
                            Mẫu lịch mới ({currentUser.nextPattern.length} ca/tuần) đã lưu và sẽ áp dụng từ Thứ Hai ngày <strong>{formatShortDate(nextMondayDate)}</strong>. Lịch tuần hiện tại được giữ nguyên.
                        </span>
                    </div>
                ) : currentUser.currentPattern && currentUser.currentPattern.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 sm:p-3 text-slate-700 text-xs flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-slate-500">repeat</span>
                        <span>
                            Mẫu lịch lặp hiện tại: <strong>{currentUser.currentPattern.length} ca/tuần</strong> (tự động duy trì hàng tuần).
                        </span>
                    </div>
                ) : null}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-row items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-4">
                    <div
                        className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1"
                        role="group"
                        aria-label="Chế độ xem lịch">
                        {(["week", "month"] as CalendarView[]).map((view) => (
                            <button
                                key={view}
                                type="button"
                                onClick={() => setCalendarView(view)}
                                aria-pressed={calendarView === view}
                                className={`min-h-11 rounded-lg px-4 text-xs font-bold transition-colors duration-200 cursor-pointer flex items-center gap-1.5 ${
                                    calendarView === view
                                        ? "bg-blue-700 text-white shadow-sm"
                                        : "text-slate-600 hover:bg-slate-100"
                                }`}>
                                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                                    {view === "week" ? "calendar_view_week" : "history"}
                                </span>
                                <span>{view === "week" ? "Lịch tuần" : "Lịch sử làm việc"}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {calendarView === "week" ? (
                    <div className="space-y-4 p-4 sm:p-5">
                        <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <span
                                    className="material-symbols-outlined text-[22px] text-blue-700"
                                    aria-hidden="true">
                                    calendar_view_week
                                </span>
                                <h3 className="text-base font-bold text-slate-900">Lịch tuần</h3>
                            </div>
                            <div
                                className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-sm"
                                role="group"
                                aria-label="Điều hướng tuần">
                                <button
                                    type="button"
                                    onClick={() => changeWeek(-1)}
                                    className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
                                    aria-label="Tuần trước">
                                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                                        chevron_left
                                    </span>
                                </button>
                                <span
                                    className="min-w-[140px] sm:min-w-[170px] px-2 text-center text-xs font-bold text-slate-900"
                                    aria-live="polite">
                                    {weekRangeLabel}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => changeWeek(1)}
                                    className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
                                    aria-label="Tuần sau">
                                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                                        chevron_right
                                    </span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCalendarDate(today)}
                                    className="ml-1 px-2.5 py-1 text-xs font-bold rounded-lg text-blue-700 hover:bg-white transition-colors cursor-pointer"
                                    title="Về tuần hiện tại">
                                    Hiện tại
                                </button>
                            </div>
                        </div>

                        {!weekDays.some((d) => Boolean(getVisibleShift(d, "morning") || getVisibleShift(d, "afternoon"))) && (
                            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-center">
                                <p className="text-sm font-semibold text-slate-700">
                                    Bạn chưa có ca làm việc nào trong tuần này ({weekRangeLabel}).
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Nhấn nút <strong>Đăng ký lịch làm việc</strong> ở trên để đăng ký mẫu ca lặp lại bắt đầu từ Thứ Hai tuần sau.
                                </p>
                            </div>
                        )}

                        {/* Mobile View: Grid 5 cột (< md) */}
                        <div className="md:hidden space-y-2">
                            {/* Dòng 1: Thứ 2 -> Thứ 6 */}
                            <div className="grid grid-cols-5 gap-1.5">
                                {WEEKDAYS.map((weekday, index) => {
                                    const date = weekDays[index];
                                    const isToday = toISODate(date) === todayISO;
                                    return (
                                        <div
                                            key={weekday.index}
                                            className={`flex flex-col items-center justify-center rounded-xl py-1.5 px-1 text-center font-bold transition-colors ${
                                                isToday
                                                    ? "bg-blue-50 text-blue-700"
                                                    : "bg-slate-100/90 text-slate-700"
                                            }`}>
                                            <span className="text-[11px] uppercase tracking-wider">
                                                {weekday.label}
                                            </span>
                                            {isToday && (
                                                <span className="mt-0.5 rounded bg-blue-600 px-1 py-0.2 text-[9px] font-bold text-white normal-case leading-tight">
                                                    Hôm nay
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Dòng 2: Ca Sáng / Ca Chiều (Chỉ hiển thị Icon, không có text "Ca Sáng/Chiều") */}
                            <div className="grid grid-cols-5 gap-1.5">
                                {weekDays.map((date) => {
                                    const dateISO = toISODate(date);
                                    const isToday = dateISO === todayISO;
                                    const morningShift = getVisibleShift(date, "morning");
                                    const afternoonShift = getVisibleShift(date, "afternoon");

                                    return (
                                        <div
                                            key={dateISO}
                                            className={`rounded-xl border-2 bg-white p-1.5 min-h-[64px] flex flex-col justify-center shadow-2xs transition-colors ${
                                                isToday
                                                    ? "border-blue-600"
                                                    : "border-slate-200"
                                            }`}>
                                            <div className="space-y-1">
                                                {morningShift ? (
                                                    <div
                                                        className="flex w-full items-center justify-center rounded-lg border border-amber-200/90 bg-amber-50 h-[28px] text-amber-700 shadow-2xs select-none cursor-pointer hover:opacity-90 transition-colors"
                                                        title="Ca Sáng" onClick={() => morningShift && setSelectedShift(morningShift)}>
                                                        <span className="material-symbols-outlined text-[18px] leading-none">
                                                            wb_sunny
                                                        </span>
                                                    </div>
                                                ) : afternoonShift ? (
                                                    <div className="h-[28px]" aria-hidden="true" />
                                                ) : null}

                                                {afternoonShift ? (
                                                    <div
                                                        className="flex w-full items-center justify-center rounded-lg border border-purple-200/90 bg-purple-50 h-[28px] text-purple-700 shadow-2xs select-none cursor-pointer hover:opacity-90 transition-colors"
                                                        title="Ca Chiều" onClick={() => afternoonShift && setSelectedShift(afternoonShift)}>
                                                        <span className="material-symbols-outlined text-[18px] leading-none">
                                                            wb_twilight
                                                        </span>
                                                    </div>
                                                ) : morningShift ? (
                                                    <div className="h-[28px]" aria-hidden="true" />
                                                ) : null}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Desktop View: Grid 5 cột (hidden md:block) */}
                        <div className="hidden md:block">
                            <div className="w-full space-y-3">
                                {/* Header: THỨ 2, THỨ 3, THỨ 4, THỨ 5, THỨ 6 */}
                                <div className="grid grid-cols-5 gap-2.5">
                                    {WEEKDAYS.map((weekday, index) => {
                                        const date = weekDays[index];
                                        const isToday = toISODate(date) === todayISO;
                                        return (
                                            <div
                                                key={weekday.index}
                                                className={`flex items-center justify-center gap-1 rounded-xl py-2 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                                                    isToday
                                                        ? "bg-blue-50 text-blue-700"
                                                        : "bg-slate-100/90 text-slate-700"
                                                }`}>
                                                <span>{weekday.label}</span>
                                                {isToday && (
                                                    <span className="rounded-md bg-blue-600 px-1 py-0.5 text-[9px] font-bold text-white normal-case tracking-normal shrink-0">
                                                        Hôm nay
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Day Cards */}
                                <div className="grid grid-cols-5 gap-2.5">
                                    {weekDays.map((date) => {
                                        const dateISO = toISODate(date);
                                        const isToday = dateISO === todayISO;
                                        const morningShift = getVisibleShift(date, "morning");
                                        const afternoonShift = getVisibleShift(date, "afternoon");

                                        return (
                                            <div
                                                key={dateISO}
                                                className={`rounded-2xl border-2 bg-white p-2.5 min-h-[104px] shadow-2xs transition-colors ${
                                                    isToday
                                                        ? "border-blue-600"
                                                        : "border-slate-200"
                                                }`}>
                                                <div className="space-y-2">
                                                    {morningShift ? (
                                                        <div
                                                            className="flex w-full items-center justify-center rounded-xl border border-amber-200/90 bg-amber-50 h-[38px] text-amber-700 shadow-2xs select-none cursor-pointer hover:opacity-90 transition-colors"
                                                            title="Ca Sáng" onClick={() => morningShift && setSelectedShift(morningShift)}>
                                                            <span
                                                                className="material-symbols-outlined text-[20px] leading-none"
                                                                aria-hidden="true">
                                                                wb_sunny
                                                            </span>
                                                        </div>
                                                    ) : afternoonShift ? (
                                                        <div className="h-[38px]" aria-hidden="true" />
                                                    ) : null}

                                                    {afternoonShift ? (
                                                        <div
                                                            className="flex w-full items-center justify-center rounded-xl border border-purple-200/90 bg-purple-50 h-[38px] text-purple-700 shadow-2xs select-none cursor-pointer hover:opacity-90 transition-colors"
                                                            title="Ca Chiều" onClick={() => afternoonShift && setSelectedShift(afternoonShift)}>
                                                            <span
                                                                className="material-symbols-outlined text-[20px] leading-none"
                                                                aria-hidden="true">
                                                                wb_twilight
                                                            </span>
                                                        </div>
                                                    ) : morningShift ? (
                                                        <div className="h-[38px]" aria-hidden="true" />
                                                    ) : null}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4 p-5">
                        <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-2">
                                <span
                                    className="material-symbols-outlined text-[22px] text-blue-700"
                                    aria-hidden="true">
                                    calendar_month
                                </span>
                                <h3 className="text-base font-bold text-slate-900">
                                    Lịch sử làm việc
                                </h3>
                            </div>
                            <div
                                className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-sm"
                                role="group"
                                aria-label="Chuyển tháng">
                                <button
                                    type="button"
                                    onClick={() => changeMonth(-1)}
                                    className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
                                    aria-label="Xem tháng trước">
                                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                                        chevron_left
                                    </span>
                                </button>
                                <span
                                    className="min-w-[112px] px-2 text-center text-xs font-bold text-slate-900"
                                    aria-live="polite">
                                    Tháng {monthStart.getMonth() + 1}, {monthStart.getFullYear()}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => changeMonth(1)}
                                    className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer"
                                    aria-label="Xem tháng sau">
                                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                                        chevron_right
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="w-full">
                            <div className="w-full">
                                <div className="mb-2 sm:mb-3 grid grid-cols-5 gap-1.5 sm:gap-3 text-center">
                                    {WEEKDAYS.map((day) => (
                                        <div
                                            key={day.index}
                                            className="rounded-xl border border-slate-200/80 bg-slate-100 py-1.5 px-1 sm:py-2.5 sm:px-3 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-700">
                                            {day.label}
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-1.5 sm:space-y-3">
                                    {monthWeeks.map((week, weekIndex) => (
                                        <div key={weekIndex} className="grid grid-cols-5 gap-1.5 sm:gap-3">
                                            {week.map((date, dayIndex) => {
                                                if (!date) {
                                                    return (
                                                        <div
                                                            key={dayIndex}
                                                            className="min-h-[88px] sm:min-h-[110px] rounded-xl border border-dashed border-slate-200 bg-slate-50/50 opacity-40"
                                                            aria-hidden="true"
                                                        />
                                                    );
                                                }

                                                const dateISO = toISODate(date);
                                                const isToday = dateISO === todayISO;
                                                const isPast = dateISO < todayISO;
                                                const morningShift = isPast ? getHistoryShift(date, "morning") : null;
                                                const afternoonShift = isPast
                                                    ? getHistoryShift(date, "afternoon")
                                                    : null;

                                                return (
                                                    <div
                                                        key={dateISO}
                                                        className={`flex min-h-[88px] sm:min-h-[110px] flex-col rounded-xl border p-1.5 sm:p-2.5 transition-all ${isToday ? "border-blue-700 bg-blue-50/40 ring-2 ring-blue-700/20" : "border-slate-200/90 bg-white hover:border-slate-300"}`}>
                                                        <div className="mb-1.5 sm:mb-2 flex min-h-5 sm:min-h-6 items-center justify-center border-b border-slate-100 pb-1 sm:pb-1.5 text-center">
                                                            {isToday ? (
                                                                <span className="inline-flex items-center justify-center rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] sm:text-xs font-bold text-white shadow-2xs">
                                                                    {formatShortDate(date)}
                                                                </span>
                                                            ) : (
                                                                <span className="text-[11px] sm:text-xs font-bold text-slate-800">
                                                                    {formatShortDate(date)}
                                                                </span>
                                                            )}
                                                        </div>

                                                        <div className="space-y-1 sm:space-y-1.5 min-h-[56px] flex flex-col justify-start">
                                                            {morningShift ? (
                                                                <div
                                                                    key={`${dateISO}-morning`}
                                                                    className="flex w-full items-center justify-center rounded-xl border border-amber-200/90 bg-amber-50 h-[28px] sm:h-[32px] text-amber-700 shadow-2xs select-none cursor-pointer hover:opacity-90 transition-colors"
                                                                    title={`Ca Sáng, ${formatShortDate(date)}`}>
                                                                    <span
                                                                        className="material-symbols-outlined text-[18px] sm:text-[20px] leading-none"
                                                                        aria-hidden="true">
                                                                        wb_sunny
                                                                    </span>
                                                                </div>
                                                            ) : afternoonShift ? (
                                                                <div
                                                                    className="h-[28px] sm:h-[32px]"
                                                                    aria-hidden="true"
                                                                />
                                                            ) : null}

                                                            {afternoonShift ? (
                                                                <div
                                                                    key={`${dateISO}-afternoon`}
                                                                    className="flex w-full items-center justify-center rounded-xl border border-purple-200/90 bg-purple-50 h-[28px] sm:h-[32px] text-purple-700 shadow-2xs select-none cursor-pointer hover:opacity-90 transition-colors"
                                                                    title={`Ca Chiều, ${formatShortDate(date)}`}>
                                                                    <span
                                                                        className="material-symbols-outlined text-[18px] sm:text-[20px] leading-none"
                                                                        aria-hidden="true">
                                                                        wb_twilight
                                                                    </span>
                                                                </div>
                                                            ) : morningShift ? (
                                                                <div
                                                                    className="h-[28px] sm:h-[32px]"
                                                                    aria-hidden="true"
                                                                />
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </section>

            {isRegistrationOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm"
                    role="presentation"
                    onMouseDown={(event) => event.target === event.currentTarget && closeRegistrationModal()}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="registration-title"
                        className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
                        <form onSubmit={handleRegisterSchedule}>
                            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 p-5 backdrop-blur">
                                <div>
                                    <h3
                                        id="registration-title"
                                        className="text-xl font-bold text-slate-950">
                                        Đăng ký lịch làm việc
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => closeRegistrationModal()}
                                    aria-label="Đóng cửa sổ đăng ký"
                                    className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-rose-500 transition-colors cursor-pointer">
                                    <span className="material-symbols-outlined" aria-hidden="true">
                                        close
                                    </span>
                                </button>
                            </div>

                            <div className="space-y-5 p-5">
                                <div className="rounded-xl border border-blue-200 bg-blue-50/90 p-3.5 text-blue-900 text-xs sm:text-sm flex items-start gap-2.5">
                                    <span className="material-symbols-outlined text-[20px] text-blue-700 shrink-0 mt-0.5">
                                        info
                                    </span>
                                    <div>
                                        <p className="font-semibold text-blue-950">
                                            Thay đổi áp dụng từ Thứ Hai ngày {formatShortDate(nextMondayDate)}/{nextMondayDate.getFullYear()}; lịch tuần hiện tại được giữ nguyên.
                                        </p>
                                        <p className="text-xs text-blue-800 mt-0.5">
                                            Mẫu lịch được tự động duy trì hàng tuần. Bạn không cần phải đăng ký lại định kỳ.
                                        </p>
                                    </div>
                                </div>
                                <fieldset>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <legend className="text-sm font-bold text-slate-900">
                                            Mẫu ca làm việc theo tuần
                                        </legend>
                                        {Object.keys(tempWeeklyPattern).some(
                                            (key) => (tempWeeklyPattern[Number(key)] || []).length > 0,
                                        ) && (
                                            <button
                                                type="button"
                                                onClick={() => setTempWeeklyPattern(createEmptyPattern())}
                                                className="sm:hidden inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer shadow-xs whitespace-nowrap">
                                                <span className="material-symbols-outlined text-[16px]">clear_all</span>
                                                <span>Bỏ chọn tất cả</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="w-full overflow-hidden rounded-xl border border-slate-200">
                                        <div className="w-full">
                                            <div className="grid grid-cols-[48px_repeat(5,1fr)] sm:grid-cols-[100px_repeat(5,1fr)] bg-slate-50">
                                                <div
                                                    className="border-r border-slate-200 p-2 text-xs font-bold text-slate-500 flex items-center justify-center"
                                                    title="Ca làm việc">
                                                    <span className="sm:hidden material-symbols-outlined text-[16px]">
                                                        schedule
                                                    </span>
                                                    <span className="hidden sm:inline font-bold text-slate-600">
                                                        Ca / Thứ
                                                    </span>
                                                </div>
                                                {WEEKDAYS.map((day) => (
                                                    <div
                                                        key={day.index}
                                                        className="border-r border-slate-200 p-2 text-center last:border-r-0 flex items-center justify-center">
                                                        <p className="text-xs font-bold text-slate-700">
                                                            {day.short}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                            {SHIFT_OPTIONS.map((shiftOption) => (
                                                <div
                                                    key={shiftOption.type}
                                                    className="grid grid-cols-[48px_repeat(5,1fr)] sm:grid-cols-[100px_repeat(5,1fr)] border-t border-slate-200">
                                                    <div className="flex items-center justify-center gap-1.5 border-r border-slate-200 p-1.5">
                                                        {shiftOption.type === "morning" ? (
                                                            <>
                                                                <div
                                                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200/90 bg-amber-50 text-amber-700 shadow-2xs transition-colors shrink-0"
                                                                    title="Ca sáng">
                                                                    <span className="material-symbols-outlined text-[18px] leading-none">
                                                                        wb_sunny
                                                                    </span>
                                                                </div>
                                                                <span className="hidden sm:inline text-xs font-extrabold text-amber-900">
                                                                    Sáng
                                                                </span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <div
                                                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-purple-200/90 bg-purple-50 text-purple-700 shadow-2xs transition-colors shrink-0"
                                                                    title="Ca chiều">
                                                                    <span className="material-symbols-outlined text-[18px] leading-none">
                                                                        wb_twilight
                                                                    </span>
                                                                </div>
                                                                <span className="hidden sm:inline text-xs font-extrabold text-purple-900">
                                                                    Chiều
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    {WEEKDAYS.map((day) => {
                                                        const targetDayDate = addDays(nextMondayDate, day.index);
                                                        const selected = (tempWeeklyPattern[day.index] || []).includes(
                                                            shiftOption.type,
                                                        );
                                                        return (
                                                            <div
                                                                key={day.index}
                                                                onClick={() => togglePattern(day.index, shiftOption.type)}
                                                                className="flex items-center justify-center border-r border-slate-200 p-1.5 last:border-r-0 transition-colors cursor-pointer hover:bg-blue-50/50">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        togglePattern(day.index, shiftOption.type);
                                                                    }}
                                                                    aria-pressed={selected}
                                                                    aria-label={`${selected ? "Bỏ chọn" : "Chọn"} ${shiftOption.label} ${day.label}, ngày ${formatCalendarDate(targetDayDate)}`}
                                                                    className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 cursor-pointer ${
                                                                        selected
                                                                            ? "border-blue-700 bg-blue-700 text-white shadow-xs hover:bg-blue-800"
                                                                            : "border-slate-200 bg-white text-slate-400 hover:border-blue-300 hover:text-blue-700"
                                                                    }`}>
                                                                    <span
                                                                        className="material-symbols-outlined text-[18px]"
                                                                        aria-hidden="true">
                                                                        {selected ? "check" : "add"}
                                                                    </span>
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </fieldset>
                            </div>

                            <div className="sticky bottom-0 flex items-center justify-center sm:justify-end gap-3 border-t border-slate-200 bg-white/95 p-4 backdrop-blur">
                                {Object.keys(tempWeeklyPattern).some(
                                    (key) => (tempWeeklyPattern[Number(key)] || []).length > 0,
                                ) && (
                                    <button
                                        type="button"
                                        onClick={() => setTempWeeklyPattern(createEmptyPattern())}
                                        className="hidden sm:inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2 text-xs font-bold transition-colors sm:mr-auto cursor-pointer shadow-xs whitespace-nowrap">
                                        <span className="material-symbols-outlined text-[16px]">clear_all</span>
                                        <span>Bỏ chọn tất cả</span>
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="inline-flex min-h-10 sm:min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white bg-blue-700 hover:bg-blue-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 cursor-pointer whitespace-nowrap">
                                    <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                                        event_available
                                    </span>
                                    {Object.keys(tempWeeklyPattern).some(
                                        (key) => (tempWeeklyPattern[Number(key)] || []).length > 0,
                                    )
                                        ? "Đăng ký lịch"
                                        : "Lưu thay đổi"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedShift && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm"
                    role="presentation"
                    onMouseDown={(event) => event.target === event.currentTarget && setSelectedShift(null)}>
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="shift-detail-title"
                        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
                            <div className="flex gap-3">
                                <span
                                    className={`material-symbols-outlined rounded-xl border p-2.5 text-[22px] ${getShiftMeta(selectedShift.shiftType as ShiftType).surface}`}
                                    aria-hidden="true">
                                    {getShiftMeta(selectedShift.shiftType as ShiftType).icon}
                                </span>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                                        Chi tiết ca làm việc
                                    </p>
                                    <h3
                                        id="shift-detail-title"
                                        className="mt-1 text-lg font-bold text-slate-950">
                                        {getShiftMeta(selectedShift.shiftType as ShiftType).label}
                                    </h3>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedShift(null)}
                                aria-label="Đóng chi tiết ca"
                                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-rose-500 transition-colors cursor-pointer">
                                <span className="material-symbols-outlined" aria-hidden="true">
                                    close
                                </span>
                            </button>
                        </div>

                        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-50 p-3">
                                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    Ngày làm việc
                                </dt>
                                <dd className="mt-1 text-sm font-bold capitalize text-slate-900">
                                    {formatFullDate(parseISODate(resolveShiftDate(selectedShift)))}
                                </dd>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    Trạng thái
                                </dt>
                                <dd className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[12px]">
                                        <span className="material-symbols-outlined text-[13px]">check</span>
                                    </span>
                                    <span>Đi làm</span>
                                </dd>
                            </div>
                        </dl>

                        <div className="mt-4">
                            <p className="text-xs font-bold text-slate-700">CTV làm cùng ca</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {(selectedShift.assignedCTVs || []).filter(
                                    (ctv) => String(ctv.id) !== String(currentUser.id),
                                ).length > 0 ? (
                                    (selectedShift.assignedCTVs || [])
                                        .filter((ctv) => String(ctv.id) !== String(currentUser.id))
                                        .map((ctv) => (
                                            <div
                                                key={ctv.id}
                                                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3">
                                                {ctv.avatar ? (
                                                    <img
                                                        src={ctv.avatar}
                                                        alt=""
                                                        className="h-7 w-7 rounded-full object-cover"
                                                    />
                                                ) : (
                                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-700 text-[10px] font-bold text-white">
                                                        {ctv.initials || "CTV"}
                                                    </span>
                                                )}
                                                <span className="text-xs font-semibold text-slate-700">
                                                    {ctv.name}
                                                </span>
                                            </div>
                                        ))
                                ) : (
                                    <span className="text-xs text-slate-500">
                                        Chưa có CTV khác trong ca này.
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end border-t border-slate-200 pt-4">
                            <button
                                type="button"
                                onClick={() => setSelectedShift(null)}
                                className="w-full sm:w-auto min-h-10 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold transition-colors cursor-pointer">
                                Đóng
                            </button></div>
                    </div>
                </div>
            )}
        </div>
    );
};
