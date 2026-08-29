import React, { useEffect, useMemo, useState } from "react";
import { AssignedCTV, ShiftSlot, UserAccount } from "../../types";
import { saveShiftRegistrations } from "../../utils/api";

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
const DEFAULT_REGISTRATION_DAYS = 60;

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
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/35 dark:text-amber-300 dark:border-amber-800",
    },
    {
        type: "afternoon",
        label: "Ca chiều",
        icon: "wb_twilight",
        surface:
            "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/35 dark:text-purple-300 dark:border-purple-800",
    },
];

const createEmptyPattern = (): WeeklyPattern => ({ 0: [], 1: [], 2: [], 3: [], 4: [] });

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
    const legacyWeekStart = useMemo(() => startOfWeek(today), [today]);

    const [calendarView, setCalendarView] = useState<CalendarView>("week");
    const [calendarDate, setCalendarDate] = useState(today);
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
    const [editingRegistrationId, setEditingRegistrationId] = useState<string | null>(null);
    const [selectedShift, setSelectedShift] = useState<ShiftSlot | null>(null);

    const [startDate, setStartDate] = useState(todayISO);
    const [endDate, setEndDate] = useState(toISODate(addDays(today, DEFAULT_REGISTRATION_DAYS)));
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
        (shift.assignedCTVs || []).some((ctv) => ctv.id === currentUser.id || ctv.name === currentUser.name);

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
        [shifts, currentUser.id, currentUser.name, legacyWeekStart],
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
        [history, currentUser.id, currentUser.name],
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
        // Derive the dialog state from the shifts that really exist in the database
        // (including the current active week).
        const currentWeekMonday = startOfWeek(today);
        const currentWeekMondayISO = toISODate(currentWeekMonday);
        const activeShifts = myShifts.filter(
            (shift) => shift.workDate && shift.workDate >= currentWeekMondayISO,
        );

        const restoredPattern = createEmptyPattern();
        for (const shift of activeShifts) {
            if (!shift.workDate) continue;
            const dayIndex = getDayIndex(parseISODate(shift.workDate));
            const shiftType = shift.shiftType as ShiftType;
            if (dayIndex < 0 || dayIndex > 4) continue;
            if (shiftType !== "morning" && shiftType !== "afternoon") continue;
            if (!restoredPattern[dayIndex].includes(shiftType)) {
                restoredPattern[dayIndex].push(shiftType);
            }
        }

        const registrationIds = Array.from(
            new Set(activeShifts.map((shift) => shift.registrationId).filter(Boolean) as string[]),
        ).sort();
        setEditingRegistrationId(registrationIds[registrationIds.length - 1] || null);

        if (activeShifts.length > 0) {
            const workDates = activeShifts.map((shift) => shift.workDate as string).sort();
            setStartDate(todayISO);
            setEndDate(workDates[workDates.length - 1]);
            setCalendarDate(today);
            setWorkContent(
                activeShifts[0].workContent ||
                    activeShifts[0].title ||
                    "Hỗ trợ điều phối lịch, kiểm tra dữ liệu và cập nhật tiến độ công việc trong ca.",
            );
        } else {
            setStartDate(todayISO);
            setEndDate(toISODate(addDays(today, DEFAULT_REGISTRATION_DAYS)));
            setCalendarDate(today);
            setWorkContent("Hỗ trợ điều phối lịch, kiểm tra dữ liệu và cập nhật tiến độ công việc trong ca.");
        }

        setWeeklyPattern(restoredPattern);
        setTempWeeklyPattern(JSON.parse(JSON.stringify(restoredPattern)));
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
        // Discard temporary selections when closing without saving
        setIsRegistrationOpen(false);
        setTempWeeklyPattern(createEmptyPattern());
    };

    const getFirstRegistrationDate = (dayIndex: number) => {
        if (!startDate || !endDate) return undefined;
        const rangeStart = parseISODate(startDate);
        const rangeEnd = parseISODate(endDate);
        if (rangeEnd < rangeStart) return undefined;

        const offset = (dayIndex - getDayIndex(rangeStart) + 7) % 7;
        const firstDate = addDays(rangeStart, offset);
        return firstDate <= rangeEnd ? firstDate : undefined;
    };

    const createCTVRecord = (): AssignedCTV => ({
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
        initials: currentUser.initials || currentUser.name.slice(0, 2).toUpperCase(),
        phone: currentUser.phone,
        cctvCode: currentUser.cctvCode,
        status: "Đã duyệt",
    });

    const handleRegisterSchedule = (event: React.FormEvent) => {
        event.preventDefault();
        const rangeStart = parseISODate(startDate);
        const rangeEnd = parseISODate(endDate);

        if (rangeEnd < rangeStart) {
            onShowToast("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu.");
            return;
        }

        // Mirror the backend, which snaps the window back to the Monday of the week
        // containing startDate. Without this the optimistic update below skipped the
        // already-elapsed days of the current week (register on Wednesday → Mon/Tue were
        // written server-side but only showed up in the week grid after a page reload).
        const materializeStart = startOfWeek(rangeStart);

        if ((rangeEnd.getTime() - materializeStart.getTime()) / DAY_MS > 180) {
            onShowToast("Mỗi lần đăng ký tối đa 180 ngày.");
            return;
        }

        const selectedOccurrences: Array<{
            date: Date;
            dayIndex: number;
            workDate: string;
            shiftType: ShiftType;
        }> = [];

        for (let cursor = materializeStart; cursor <= rangeEnd; cursor = addDays(cursor, 1)) {
            const dayIndex = getDayIndex(cursor);
            const selectedShiftTypes = tempWeeklyPattern[dayIndex] || [];

            selectedShiftTypes.forEach((shiftType) => {
                selectedOccurrences.push({
                    date: cursor,
                    dayIndex,
                    workDate: toISODate(cursor),
                    shiftType,
                });
            });
        }

        const windowStartISO = toISODate(materializeStart);

        if (selectedOccurrences.length === 0) {
            const updatedShifts = shifts.map((shift) => {
                if (
                    !shift.workDate ||
                    shift.workDate < windowStartISO ||
                    !isAssignedToCurrentUser(shift)
                ) {
                    return shift;
                }

                return removeCurrentUserFromShift(shift);
            });

            saveShiftRegistrations({
                userId: currentUser.id,
                startDate: windowStartISO,
                endDate,
                registrations: [],
            })
                .then(() => {
                    onUpdateShifts(updatedShifts);
                    setWeeklyPattern(createEmptyPattern());
                    setTempWeeklyPattern(createEmptyPattern());
                    setEditingRegistrationId(null);
                    setIsRegistrationOpen(false);
                    onShowToast("Đã hủy và xóa toàn bộ lịch đăng ký.");
                })
                .catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : "Không thể hủy lịch làm việc.";
                    onShowToast(message);
                });
            return;
        }

        const registrationId = editingRegistrationId || `registration-${Date.now()}`;
        const ctvRecord = createCTVRecord();
        const desiredShiftKeys = new Set(
            selectedOccurrences.map(({ workDate, shiftType }) => `${workDate}:${shiftType}`),
        );
        // Same rule as the backend's "DELETE ... WHERE user_id = ? AND work_date >= ?":
        // every shift of this CTV from the window start onwards that the new pattern no
        // longer contains is dropped.
        const updatedShifts = shifts.map((shift) => {
            if (
                !shift.workDate ||
                shift.workDate < windowStartISO ||
                !isAssignedToCurrentUser(shift) ||
                desiredShiftKeys.has(`${shift.workDate}:${shift.shiftType}`)
            ) {
                return shift;
            }

            return removeCurrentUserFromShift(shift);
        });

        for (const { date, dayIndex, workDate, shiftType } of selectedOccurrences) {
            let existingIndex = updatedShifts.findIndex(
                (shift) =>
                    shift.workDate === workDate &&
                    shift.shiftType === shiftType &&
                    (shift.registrationId === registrationId || isAssignedToCurrentUser(shift)),
            );

            if (existingIndex < 0) {
                existingIndex = updatedShifts.findIndex(
                    (shift) => resolveShiftDate(shift) === workDate && shift.shiftType === shiftType,
                );
            }

            if (existingIndex >= 0) {
                const existing = updatedShifts[existingIndex];
                const alreadyRegistered = (existing.assignedCTVs || []).some(
                    (ctv) => ctv.id === currentUser.id || ctv.name === currentUser.name,
                );

                updatedShifts[existingIndex] = {
                    ...existing,
                    workDate,
                    dateStr: formatShortDate(date),
                    workContent: workContent.trim(),
                    registrationId,
                    registrationStartDate: startDate,
                    registrationEndDate: endDate,
                    status: "Đã đăng ký",
                    allowRegister: true,
                    assignedCTVs: alreadyRegistered
                        ? existing.assignedCTVs
                        : [...(existing.assignedCTVs || []), ctvRecord],
                };
            } else {
                const weekday = WEEKDAYS[dayIndex];
                updatedShifts.push({
                    id: `${registrationId}-${workDate}-${shiftType}`,
                    dayIndex,
                    dayName: weekday.label,
                    dateStr: formatShortDate(date),
                    workDate,
                    shiftType,
                    shiftTimeLabel: shiftType === "morning" ? "Ca sáng" : "Ca chiều",
                    title: workContent.trim(),
                    workContent: workContent.trim(),
                    registrationId,
                    registrationStartDate: startDate,
                    registrationEndDate: endDate,
                    status: "Đã đăng ký",
                    allowRegister: true,
                    assignedCTVs: [ctvRecord],
                });
            }
        }

        saveShiftRegistrations({
            userId: currentUser.id,
            startDate,
            endDate,
            registrations: selectedOccurrences.map(({ dayIndex, shiftType }) => ({
                dayOfWeek: dayIndex,
                shiftType,
            })),
        })
            .then(() => {
                onUpdateShifts(updatedShifts);
                // Commit temp pattern to actual pattern after successful registration
                setWeeklyPattern(JSON.parse(JSON.stringify(tempWeeklyPattern)));
                setEditingRegistrationId(registrationId);
                setCalendarDate(selectedOccurrences[0]?.date || rangeStart);
                setCalendarView("week");
                setIsRegistrationOpen(false);
                onShowToast(
                    "Bạn đã đăng ký ca làm việc thành công.",
                );
            })
            .catch((error: unknown) => {
                const message = error instanceof Error ? error.message : "Không thể lưu lịch làm việc.";
                onShowToast(message);
            });
    };

    const removeCurrentUserFromShift = (shift: ShiftSlot) => {
        const assignedCTVs = (shift.assignedCTVs || []).filter(
            (ctv) => ctv.id !== currentUser.id && ctv.name !== currentUser.name,
        );

        return {
            ...shift,
            assignedCTVs,
            status: assignedCTVs.length > 0 ? shift.status : ("Chưa đăng ký" as const),
        };
    };

    const handleCancelShift = () => {
        if (!selectedShift) return;

        const selectedShiftDate = resolveShiftDate(selectedShift);

        if (selectedShiftDate < todayISO) {
            onShowToast("Ca làm việc đã qua nên không thể hủy.");
            return;
        }

        let cancelled = false;
        const resultShifts = shifts.map((shift) => {
            if (shift.id !== selectedShift.id || !isAssignedToCurrentUser(shift)) {
                return shift;
            }
            cancelled = true;
            return removeCurrentUserFromShift(shift);
        });

        const dayIdx = selectedShift.dayIndex;
        const sType = selectedShift.shiftType as ShiftType;
        setWeeklyPattern((prev) => ({
            ...prev,
            [dayIdx]: (prev[dayIdx] || []).filter((st) => st !== sType),
        }));

        onUpdateShifts(resultShifts);
        setSelectedShift(null);
        onShowToast(
            cancelled || true
                ? `Đã hủy ${getShiftMeta(selectedShift.shiftType as ShiftType).label.toLowerCase()} ngày ${formatShortDate(parseISODate(selectedShiftDate))}.`
                : "Không tìm thấy ca cần hủy.",
        );
    };

    const handleCancelRecurringShift = () => {
        if (!selectedShift) return;

        const selectedShiftDate = resolveShiftDate(selectedShift);

        if (selectedShiftDate < todayISO) {
            onShowToast("Ca làm việc đã qua nên không thể hủy.");
            return;
        }

        let cancelCount = 0;
        const resultShifts = shifts.map((shift) => {
            const shiftDate = resolveShiftDate(shift);
            const isSameDayOfWeek = shift.dayIndex === selectedShift.dayIndex;
            const isSameShiftType = shift.shiftType === selectedShift.shiftType;
            const isCurrentOrFuture = shiftDate >= selectedShiftDate;

            if (isSameDayOfWeek && isSameShiftType && isCurrentOrFuture && isAssignedToCurrentUser(shift)) {
                cancelCount += 1;
                return removeCurrentUserFromShift(shift);
            }

            return shift;
        });

        const dayIdx = selectedShift.dayIndex;
        const sType = selectedShift.shiftType as ShiftType;
        setWeeklyPattern((prev) => ({
            ...prev,
            [dayIdx]: (prev[dayIdx] || []).filter((st) => st !== sType),
        }));

        onUpdateShifts(resultShifts);
        setSelectedShift(null);
        onShowToast(
            `Đã hủy ca ${getShiftMeta(selectedShift.shiftType as ShiftType).label.toLowerCase()} định kỳ (${selectedShift.dayName || WEEKDAYS[selectedShift.dayIndex]?.label || "thứ"}) từ ngày ${formatShortDate(parseISODate(selectedShiftDate))} trở đi.`,
        );
    };

    const handleRoomChange = (nextRoom: string) => {
        if (!selectedShift || nextRoom === (selectedShift.room || "Buồng 1")) return;

        const selectedShiftDate = resolveShiftDate(selectedShift);
        if (selectedShiftDate < todayISO) {
            onShowToast("Không thể thay đổi buồng làm việc của ca trong quá khứ.");
            return;
        }

        const updatedShifts = [...shifts];

        const isMatchingPattern = (shift: ShiftSlot) => {
            if (selectedShift.registrationId) {
                return (
                    shift.registrationId === selectedShift.registrationId &&
                    shift.dayIndex === selectedShift.dayIndex &&
                    shift.shiftType === selectedShift.shiftType
                );
            }
            return (
                shift.id === selectedShift.id ||
                (!shift.registrationId &&
                    shift.dayIndex === selectedShift.dayIndex &&
                    shift.shiftType === selectedShift.shiftType)
            );
        };

        const templateShifts = updatedShifts.filter(
            (s) => isMatchingPattern(s) && !s.workDate && isAssignedToCurrentUser(s),
        );

        if (templateShifts.length > 0) {
            const startDateToCheck = addDays(parseISODate(selectedShiftDate), -90);
            const cutoffDate = parseISODate(selectedShiftDate);

            for (let cur = startDateToCheck; cur < cutoffDate; cur = addDays(cur, 1)) {
                if (getDayIndex(cur) === selectedShift.dayIndex) {
                    const pastDateISO = toISODate(cur);
                    const existingShift = updatedShifts.find(
                        (s) => resolveShiftDate(s) === pastDateISO && s.shiftType === selectedShift.shiftType,
                    );

                    if (!existingShift) {
                        templateShifts.forEach((tmpl) => {
                            updatedShifts.push({
                                ...tmpl,
                                id: `past-${tmpl.id}-${pastDateISO}`,
                                workDate: pastDateISO,
                                dateStr: formatShortDate(cur),
                            });
                        });
                    }
                }
            }
        }

        let updatedCount = 0;

        const resultShifts = updatedShifts.map((shift) => {
            const matched = isMatchingPattern(shift);
            if (!matched || !isAssignedToCurrentUser(shift)) {
                return shift;
            }

            if (shift.workDate) {
                if (shift.workDate >= selectedShiftDate) {
                    updatedCount += 1;
                    return { ...shift, room: nextRoom };
                }
                return shift;
            }

            updatedCount += 1;
            return { ...shift, room: nextRoom };
        });

        onUpdateShifts(resultShifts);
        setSelectedShift({ ...selectedShift, room: nextRoom });
        onShowToast(
            updatedCount > 0
                ? `Đã đổi sang ${nextRoom} cho ca từ ngày ${formatShortDate(parseISODate(selectedShiftDate))} trở đi.`
                : "Không có ca phù hợp để đổi buồng.",
        );
    };

    const selectedShiftDate = selectedShift ? resolveShiftDate(selectedShift) : "";
    const canCancelSelectedShift = Boolean(selectedShift) && selectedShiftDate >= todayISO;

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
                <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-900 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-outlined text-[24px] text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
                            pending
                        </span>
                        <div>
                            <h4 className="font-bold text-sm text-amber-900 dark:text-amber-100">
                                Tài khoản đang chờ duyệt
                            </h4>
                            <p className="text-xs text-amber-800 dark:text-amber-300 mt-1">
                                Tài khoản của bạn đang ở trạng thái <strong>Chờ duyệt</strong> bởi Quản trị viên. Trong
                                thời gian này, bạn chưa thể đăng ký lịch làm việc. Bạn vẫn có thể xem và cập nhật hồ sơ
                                cá nhân trong mục <strong>Hồ sơ</strong>.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-white to-blue-50/70 p-4 shadow-sm dark:border-slate-700 dark:from-[#25262b] dark:via-[#25262b] dark:to-blue-950/25">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                            calendar_month
                        </span>
                        Lịch làm việc
                    </div>
                    {isPending ? (
                        <button
                            type="button"
                            disabled
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-300 px-5 py-3 text-sm font-bold text-slate-500 cursor-not-allowed sm:w-auto dark:bg-slate-800 dark:text-slate-500"
                            title="Tài khoản chờ duyệt chưa thể đăng ký lịch làm việc">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                                lock
                            </span>
                            Chờ duyệt để đăng ký ca
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={openRegistration}
                            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors duration-200 hover:bg-blue-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 sm:w-auto dark:focus-visible:ring-offset-slate-900">
                            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                                edit_calendar
                            </span>
                            Đăng ký lịch làm việc
                        </button>
                    )}
                </div>
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#25262b]">
                <div className="flex flex-row items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/35">
                    <div
                        className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
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
                                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
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
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                            <span
                                className="material-symbols-outlined text-[22px] text-blue-700 dark:text-blue-300"
                                aria-hidden="true">
                                calendar_view_week
                            </span>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Lịch tuần</h3>
                        </div>

                        {/* Mobile View: 1 cột thứ & 1 cột ca (< md) */}
                        <div className="md:hidden space-y-2.5">
                            {weekDays.map((date, index) => {
                                const dateISO = toISODate(date);
                                const isToday = dateISO === todayISO;
                                const weekday = WEEKDAYS[index];
                                const morningShift = getVisibleShift(date, "morning");
                                const afternoonShift = getVisibleShift(date, "afternoon");

                                return (
                                    <div
                                        key={dateISO}
                                        className={`p-3 rounded-2xl border-2 bg-white dark:bg-slate-900 flex items-center gap-3 transition-colors ${
                                            isToday
                                                ? "border-blue-600 dark:border-blue-400"
                                                : "border-slate-200 dark:border-slate-800"
                                        }`}>
                                        {/* Cột Thứ */}
                                        <div
                                            className={`w-24 shrink-0 flex flex-col items-center justify-center py-2 px-2 rounded-xl text-center font-bold text-xs uppercase tracking-wider transition-colors ${
                                                isToday
                                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                                                    : "bg-slate-100/90 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                            }`}>
                                            <span>{weekday.label}</span>
                                            {isToday && (
                                                <span className="mt-1 rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white normal-case tracking-normal">
                                                    Hôm nay
                                                </span>
                                            )}
                                        </div>

                                        {/* Cột Ca */}
                                        <div className="flex-1 space-y-1.5 min-w-0">
                                            {morningShift && (
                                                <div className="flex w-full items-center gap-2 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 shadow-xs select-none pointer-events-none transition-colors dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                                                    <span
                                                        className="material-symbols-outlined text-[18px] text-amber-700 dark:text-amber-400"
                                                        aria-hidden="true">
                                                        wb_sunny
                                                    </span>
                                                    <span className="text-amber-900 dark:text-amber-100">
                                                        Ca Sáng
                                                    </span>
                                                </div>
                                            )}

                                            {afternoonShift && (
                                                <div className="flex w-full items-center gap-2 rounded-xl border border-purple-200/90 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-900 shadow-xs select-none pointer-events-none transition-colors dark:border-purple-800/50 dark:bg-purple-950/40 dark:text-purple-200">
                                                    <span
                                                        className="material-symbols-outlined text-[18px] text-purple-700 dark:text-purple-400"
                                                        aria-hidden="true">
                                                        wb_twilight
                                                    </span>
                                                    <span className="text-purple-900 dark:text-purple-100">
                                                        Ca Chiều
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Desktop View: Grid 5 cột (hidden md:block) */}
                        <div className="hidden md:block overflow-x-auto">
                            <div className="min-w-[650px] space-y-3">
                                {/* Header: THỨ 2, THỨ 3, THỨ 4, THỨ 5, THỨ 6 */}
                                <div className="grid grid-cols-5 gap-3">
                                    {WEEKDAYS.map((weekday, index) => {
                                        const date = weekDays[index];
                                        const isToday = toISODate(date) === todayISO;
                                        return (
                                            <div
                                                key={weekday.index}
                                                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                                                    isToday
                                                        ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                                                        : "bg-slate-100/90 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                                }`}>
                                                <span>{weekday.label}</span>
                                                {isToday && (
                                                    <span className="rounded-md bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white normal-case tracking-normal">
                                                        Hôm nay
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Day Cards */}
                                <div className="grid grid-cols-5 gap-3">
                                    {weekDays.map((date) => {
                                        const dateISO = toISODate(date);
                                        const isToday = dateISO === todayISO;
                                        const morningShift = getVisibleShift(date, "morning");
                                        const afternoonShift = getVisibleShift(date, "afternoon");

                                        return (
                                            <div
                                                key={dateISO}
                                                className={`rounded-2xl border-2 bg-white p-3 min-h-[104px] shadow-2xs transition-colors dark:bg-slate-900 ${
                                                    isToday
                                                        ? "border-blue-600 dark:border-blue-400"
                                                        : "border-slate-200 dark:border-slate-800"
                                                }`}>
                                                <div className="space-y-2">
                                                    {morningShift ? (
                                                        <div className="flex w-full items-center gap-2 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 shadow-xs select-none pointer-events-none transition-colors dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200">
                                                            <span
                                                                className="material-symbols-outlined text-[18px] text-amber-700 dark:text-amber-400"
                                                                aria-hidden="true">
                                                                wb_sunny
                                                            </span>
                                                            <span className="text-amber-900 dark:text-amber-100">
                                                                Ca Sáng
                                                            </span>
                                                        </div>
                                                    ) : afternoonShift ? (
                                                        <div className="h-[38px]" aria-hidden="true" />
                                                    ) : null}

                                                    {afternoonShift ? (
                                                        <div className="flex w-full items-center gap-2 rounded-xl border border-purple-200/90 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-900 shadow-xs select-none pointer-events-none transition-colors dark:border-purple-800/50 dark:bg-purple-950/40 dark:text-purple-200">
                                                            <span
                                                                className="material-symbols-outlined text-[18px] text-purple-700 dark:text-purple-400"
                                                                aria-hidden="true">
                                                                wb_twilight
                                                            </span>
                                                            <span className="text-purple-900 dark:text-purple-100">
                                                                Ca Chiều
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
                        <div className="flex flex-col gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <span
                                    className="material-symbols-outlined text-[22px] text-blue-700 dark:text-blue-300"
                                    aria-hidden="true">
                                    calendar_month
                                </span>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Lịch sử làm việc
                                </h3>
                            </div>
                            <div
                                className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                                role="group"
                                aria-label="Chuyển tháng">
                                <button
                                    type="button"
                                    onClick={() => changeMonth(-1)}
                                    className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-slate-200 dark:hover:bg-slate-800"
                                    aria-label="Xem tháng trước">
                                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                                        chevron_left
                                    </span>
                                </button>
                                <span
                                    className="min-w-[112px] px-2 text-center text-xs font-bold text-slate-900 dark:text-slate-100"
                                    aria-live="polite">
                                    Tháng {monthStart.getMonth() + 1}, {monthStart.getFullYear()}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => changeMonth(1)}
                                    className="flex min-h-9 min-w-9 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-slate-200 dark:hover:bg-slate-800"
                                    aria-label="Xem tháng sau">
                                    <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                                        chevron_right
                                    </span>
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <div className="min-w-[850px]">
                                <div className="mb-3 grid grid-cols-5 gap-3 text-center">
                                    {WEEKDAYS.map((day) => (
                                        <div
                                            key={day.index}
                                            className="rounded-xl border border-slate-200/80 bg-slate-100 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:border-slate-800 dark:bg-[#1f2023] dark:text-slate-200">
                                            {day.label}
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    {monthWeeks.map((week, weekIndex) => (
                                        <div key={weekIndex} className="grid grid-cols-5 gap-3">
                                            {week.map((date, dayIndex) => {
                                                if (!date) {
                                                    return (
                                                        <div
                                                            key={dayIndex}
                                                            className="min-h-[110px] rounded-xl border border-dashed border-slate-200 bg-slate-50/50 opacity-40 dark:border-slate-800/60 dark:bg-[#1f2023]/30"
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
                                                        className={`flex min-h-[110px] flex-col rounded-xl border p-2.5 transition-all ${isToday ? "border-blue-700 bg-blue-50/40 ring-2 ring-blue-700/20 dark:border-blue-500 dark:bg-blue-950/20" : "border-slate-200/90 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-[#222327] dark:hover:border-slate-700"}`}>
                                                        <div className="mb-2 flex min-h-6 items-center justify-center gap-2 border-b border-slate-100 pb-1.5 text-center dark:border-slate-800/80">
                                                            <span className="flex items-center justify-center gap-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                                                                {formatShortDate(date)}
                                                                {isToday && (
                                                                    <span className="rounded bg-blue-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                                        Hôm nay
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            {morningShift ? (
                                                                <div
                                                                    key={`${dateISO}-morning`}
                                                                    className="flex w-full items-center gap-2 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 shadow-xs select-none pointer-events-none transition-colors dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-200"
                                                                    aria-label={`Ca Sáng, ${formatShortDate(date)}`}>
                                                                    <span
                                                                        className="material-symbols-outlined text-[18px] text-amber-700 dark:text-amber-400"
                                                                        aria-hidden="true">
                                                                        wb_sunny
                                                                    </span>
                                                                    <span className="text-amber-900 dark:text-amber-100">
                                                                        Ca Sáng
                                                                    </span>
                                                                </div>
                                                            ) : afternoonShift ? (
                                                                <div className="h-[38px]" aria-hidden="true" />
                                                            ) : null}

                                                            {afternoonShift ? (
                                                                <div
                                                                    key={`${dateISO}-afternoon`}
                                                                    className="flex w-full items-center gap-2 rounded-xl border border-purple-200/90 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-900 shadow-xs select-none pointer-events-none transition-colors dark:border-purple-800/50 dark:bg-purple-950/40 dark:text-purple-200"
                                                                    aria-label={`Ca Chiều, ${formatShortDate(date)}`}>
                                                                    <span
                                                                        className="material-symbols-outlined text-[18px] text-purple-700 dark:text-purple-400"
                                                                        aria-hidden="true">
                                                                        wb_twilight
                                                                    </span>
                                                                    <span className="text-purple-900 dark:text-purple-100">
                                                                        Ca Chiều
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
                        className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#25262b]">
                        <form onSubmit={handleRegisterSchedule}>
                            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 p-5 backdrop-blur dark:border-slate-700 dark:bg-[#25262b]/95">
                                <div>
                                    <h3
                                        id="registration-title"
                                        className="text-xl font-bold text-slate-950 dark:text-white">
                                        Đăng ký lịch làm việc
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => closeRegistrationModal()}
                                    aria-label="Đóng cửa sổ đăng ký"
                                    className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-slate-300 dark:hover:bg-slate-800">
                                    <span className="material-symbols-outlined" aria-hidden="true">
                                        close
                                    </span>
                                </button>
                            </div>

                            <div className="space-y-5 p-5">
                                <fieldset>
                                    <legend className="text-sm font-bold text-slate-900 dark:text-white">
                                        Mẫu ca làm việc theo tuần
                                    </legend>
                                    <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div className="min-w-[500px]">
                                            <div className="grid grid-cols-[120px_repeat(5,1fr)] bg-slate-50 dark:bg-slate-900/40">
                                                <div className="border-r border-slate-200 p-2 text-xs font-bold text-slate-600 dark:border-slate-700 dark:text-slate-300 flex items-center justify-center">
                                                    Ca / Thứ
                                                </div>
                                                {WEEKDAYS.map((day) => (
                                                    <div
                                                        key={day.index}
                                                        className="border-r border-slate-200 p-2 text-center last:border-r-0 dark:border-slate-700 flex items-center justify-center">
                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                            {day.short}
                                                        </p>
                                                    </div>
                                                ))}
                                            </div>
                                            {SHIFT_OPTIONS.map((shiftOption) => (
                                                <div
                                                    key={shiftOption.type}
                                                    className="grid grid-cols-[120px_repeat(5,1fr)] border-t border-slate-200 dark:border-slate-700">
                                                    <div className="flex items-center justify-center gap-2 border-r border-slate-200 p-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                                                        <span
                                                            className="material-symbols-outlined text-[16px]"
                                                            aria-hidden="true">
                                                            {shiftOption.icon}
                                                        </span>
                                                        {shiftOption.label}
                                                    </div>
                                                    {WEEKDAYS.map((day) => {
                                                        const firstDate = getFirstRegistrationDate(day.index);
                                                        const selected =
                                                            Boolean(firstDate) &&
                                                            (tempWeeklyPattern[day.index] || []).includes(
                                                                shiftOption.type,
                                                            );
                                                        return (
                                                            <div
                                                                key={day.index}
                                                                className="flex items-center justify-center border-r border-slate-200 p-1.5 last:border-r-0 dark:border-slate-700">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        togglePattern(day.index, shiftOption.type)
                                                                    }
                                                                    disabled={!firstDate}
                                                                    aria-pressed={selected}
                                                                    aria-label={`${selected ? "Bỏ chọn" : "Chọn"} ${shiftOption.label} ${day.label}${firstDate ? `, ngày đầu tiên ${formatCalendarDate(firstDate)}` : ", ngoài khoảng đăng ký"}`}
                                                                    className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-300 dark:disabled:border-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-600 ${selected ? "border-blue-700 bg-blue-700 text-white shadow-xs" : "border-slate-200 bg-white text-slate-400 hover:border-blue-300 hover:text-blue-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-500 dark:hover:text-blue-300"}`}>
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

                            <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-end dark:border-slate-700 dark:bg-[#25262b]/95">
                                {Object.keys(tempWeeklyPattern).some((key) => (tempWeeklyPattern[Number(key)] || []).length > 0) && (
                                    <button
                                        type="button"
                                        onClick={() => setTempWeeklyPattern(createEmptyPattern())}
                                        className="min-h-11 rounded-xl px-4 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 transition-colors flex items-center justify-center gap-1.5 sm:mr-auto cursor-pointer">
                                        <span className="material-symbols-outlined text-[16px]">clear_all</span>
                                        <span>Bỏ chọn tất cả</span>
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => closeRegistrationModal()}
                                    className="min-h-11 rounded-xl px-5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer">
                                    Đóng
                                </button>
                                <button
                                    type="submit"
                                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-bold text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 cursor-pointer ${
                                        Object.keys(tempWeeklyPattern).some((key) => (tempWeeklyPattern[Number(key)] || []).length > 0)
                                            ? "bg-blue-700 hover:bg-blue-800 focus-visible:ring-blue-600"
                                            : "bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500"
                                    }`}>
                                    <span className="material-symbols-outlined text-[19px]" aria-hidden="true">
                                        {Object.keys(tempWeeklyPattern).some((key) => (tempWeeklyPattern[Number(key)] || []).length > 0)
                                            ? "event_available"
                                            : "event_busy"}
                                    </span>
                                    {Object.keys(tempWeeklyPattern).some((key) => (tempWeeklyPattern[Number(key)] || []).length > 0)
                                        ? "Đăng ký lịch"
                                        : "Lưu thay đổi (Hủy toàn bộ lịch)"}
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
                        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-[#25262b]">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-700">
                            <div className="flex gap-3">
                                <span
                                    className={`material-symbols-outlined rounded-xl border p-2.5 text-[22px] ${getShiftMeta(selectedShift.shiftType as ShiftType).surface}`}
                                    aria-hidden="true">
                                    {getShiftMeta(selectedShift.shiftType as ShiftType).icon}
                                </span>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                                        Chi tiết ca làm việc
                                    </p>
                                    <h3
                                        id="shift-detail-title"
                                        className="mt-1 text-lg font-bold text-slate-950 dark:text-white">
                                        {getShiftMeta(selectedShift.shiftType as ShiftType).label}
                                    </h3>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedShift(null)}
                                aria-label="Đóng chi tiết ca"
                                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-slate-300 dark:hover:bg-slate-800">
                                <span className="material-symbols-outlined" aria-hidden="true">
                                    close
                                </span>
                            </button>
                        </div>

                        <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/45">
                                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Ngày làm việc
                                </dt>
                                <dd className="mt-1 text-sm font-bold capitalize text-slate-900 dark:text-white">
                                    {formatFullDate(parseISODate(resolveShiftDate(selectedShift)))}
                                </dd>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900/45">
                                <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Trạng thái
                                </dt>
                                <dd className="mt-1 flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-white text-[12px]">
                                        <span className="material-symbols-outlined text-[13px]">check</span>
                                    </span>
                                    <span>Đi làm</span>
                                </dd>
                            </div>
                        </dl>

                        <div className="mt-4">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-200">CTV làm cùng ca</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {(selectedShift.assignedCTVs || []).filter(
                                    (ctv) => ctv.id !== currentUser.id && ctv.name !== currentUser.name,
                                ).length > 0 ? (
                                    (selectedShift.assignedCTVs || [])
                                        .filter((ctv) => ctv.id !== currentUser.id && ctv.name !== currentUser.name)
                                        .map((ctv) => (
                                            <div
                                                key={ctv.id}
                                                className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-1 pl-1 pr-3 dark:border-slate-700 dark:bg-slate-900/45">
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
                                                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                                    {ctv.name}
                                                </span>
                                            </div>
                                        ))
                                ) : (
                                    <span className="text-xs text-slate-500 dark:text-slate-400">
                                        Chưa có CTV khác trong ca này.
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-200 pt-4 dark:border-slate-700">
                            {canCancelSelectedShift ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleCancelShift}
                                        className="min-h-11 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs sm:text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 dark:border-rose-800 dark:bg-rose-950/35 dark:text-rose-300 dark:hover:bg-rose-950/55">
                                        Chỉ hủy ca này
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleCancelRecurringShift}
                                        className="min-h-11 rounded-xl border border-rose-300 bg-rose-100/70 px-3 text-xs sm:text-sm font-bold text-rose-800 transition-colors hover:bg-rose-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-600 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-200 dark:hover:bg-rose-900/60">
                                        Hủy ca định kỳ
                                    </button>
                                </>
                            ) : (
                                <>
                                    <p className="col-span-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-900/45 dark:text-slate-400">
                                        Ca làm việc đã qua nên không thể hủy.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedShift(null)}
                                        className="col-span-2 min-h-11 rounded-xl px-4 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-slate-300 dark:hover:bg-slate-800">
                                        Đóng
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
