import React, { useState, useMemo } from "react";
import { ShiftSlot, UserAccount, AssignedCTV } from "../../types";
import { getAssignedCTVsForDate } from "../../utils/scheduleSelectors";

interface SummaryScheduleScreenProps {
    shifts: ShiftSlot[];
    history?: ShiftSlot[];
    accounts: UserAccount[];
    onViewAccountDetail?: (account: UserAccount) => void;
    onShowToast?: (msg: string) => void;
    currentUser?: UserAccount;
    userRole?: "Admin" | "Cộng tác viên";
}

type CalendarView = "week" | "month";

const DAY_MS = 24 * 60 * 60 * 1000;

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

const toISODate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const formatShortDate = (date: Date) =>
    `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`;

const formatDateWithYear = (date: Date) => `${formatShortDate(date)}/${date.getFullYear()}`;

const WEEKDAYS = [
    { index: 0, short: "T2", label: "Thứ 2" },
    { index: 1, short: "T3", label: "Thứ 3" },
    { index: 2, short: "T4", label: "Thứ 4" },
    { index: 3, short: "T5", label: "Thứ 5" },
    { index: 4, short: "T6", label: "Thứ 6" },
] as const;

export const SummaryScheduleScreen: React.FC<SummaryScheduleScreenProps> = ({
    shifts,
    history = [],
    accounts,
    onViewAccountDetail,
    onShowToast,
}) => {
    const today = useMemo(() => startOfDay(new Date()), []);
    const todayISO = toISODate(today);

    // View mode: 'week' or 'month'
    const [calendarView, setCalendarView] = useState<CalendarView>("week");

    // Week navigation state
    const [currentWeekDate, setCurrentWeekDate] = useState<Date>(today);

    // Month navigation state
    const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth()); // 0-indexed

    // Shift Detail Modal State
    const [selectedShiftDetail, setSelectedShiftDetail] = useState<{
        dayName: string;
        dateFormatted: string;
        shiftName: "Ca Sáng" | "Ca Chiều";
        shiftTimeLabel: string;
        workDate: string;
        ctvList: Array<AssignedCTV & { email?: string; cctvCode?: string }>;
    } | null>(null);

    // Search query within shift detail modal
    const [detailSearchQuery, setDetailSearchQuery] = useState("");

    // Month Names Array
    const monthNames = [
        "Tháng 1",
        "Tháng 2",
        "Tháng 3",
        "Tháng 4",
        "Tháng 5",
        "Tháng 6",
        "Tháng 7",
        "Tháng 8",
        "Tháng 9",
        "Tháng 10",
        "Tháng 11",
        "Tháng 12",
    ];

    // Week navigation handlers
    const currentWeekStart = useMemo(() => startOfWeek(currentWeekDate), [currentWeekDate]);
    const weekDays = useMemo(
        () => Array.from({ length: 5 }, (_, index) => addDays(currentWeekStart, index)),
        [currentWeekStart],
    );
    const weekRangeLabel = `Tuần ${formatShortDate(weekDays[0])} - ${formatDateWithYear(weekDays[4])}`;

    const handlePrevWeek = () => {
        setCurrentWeekDate((prev) => addDays(prev, -7));
    };

    const handleNextWeek = () => {
        setCurrentWeekDate((prev) => addDays(prev, 7));
    };

    const handleTodayWeek = () => {
        setCurrentWeekDate(today);
    };

    // Month navigation handlers
    const handlePrevMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear((y) => y - 1);
        } else {
            setSelectedMonth((m) => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear((y) => y + 1);
        } else {
            setSelectedMonth((m) => m + 1);
        }
    };

    const getAssignedCTVs = (workDate: string, type: "morning" | "afternoon") =>
        getAssignedCTVsForDate(shifts, accounts, workDate, type);

    const getHistoryCTVs = (workDate: string, type: "morning" | "afternoon") =>
        getAssignedCTVsForDate(history, accounts, workDate, type);

    // Calculate Month Calendar Weeks & Days (Mon-Fri)
    const calendarWeeks = useMemo(() => {
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        const weeks: Array<
            Array<{
                dayNumber: number;
                dayIndex: number;
                dayName: string;
                dateFormatted: string;
                dateShort: string;
                dateISO: string;
                isToday: boolean;
                isValid: boolean;
            } | null>
        > = [];

        let currentWeek: Array<{
            dayNumber: number;
            dayIndex: number;
            dayName: string;
            dateFormatted: string;
            dateShort: string;
            dateISO: string;
            isToday: boolean;
            isValid: boolean;
        } | null> = [null, null, null, null, null];

        const dayNames = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6"];
        const realTodayYear = today.getFullYear();
        const realTodayMonth = today.getMonth();
        const realTodayDate = today.getDate();

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(selectedYear, selectedMonth, d);
            const dow = dateObj.getDay(); // 0 = CN, 1 = T2, 2 = T3, 3 = T4, 4 = T5, 5 = T6, 6 = T7

            if (dow >= 1 && dow <= 5) {
                const dayIndex = dow - 1;
                const dateFormatted = `${String(d).padStart(2, "0")}/${String(selectedMonth + 1).padStart(2, "0")}/${selectedYear}`;
                const dateShort = `${String(d).padStart(2, "0")}/${String(selectedMonth + 1).padStart(2, "0")}`;
                const dateISO = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                const isToday =
                    selectedYear === realTodayYear && selectedMonth === realTodayMonth && d === realTodayDate;

                currentWeek[dayIndex] = {
                    dayNumber: d,
                    dayIndex,
                    dayName: dayNames[dayIndex],
                    dateFormatted,
                    dateShort,
                    dateISO,
                    isToday,
                    isValid: true,
                };

                if (dayIndex === 4 || d === daysInMonth) {
                    weeks.push([...currentWeek]);
                    currentWeek = [null, null, null, null, null];
                }
            }
        }

        return weeks.filter((w) => w.some((cell) => cell !== null));
    }, [selectedYear, selectedMonth, today]);

    // Get CTV list for Today's quick view
    const todayData = useMemo(() => {
        const todayObj = new Date();
        const dayOfWeek = (todayObj.getDay() + 6) % 7; // 0: T2 ... 6: CN
        const dayNamesList = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ Nhật"];
        const dayNameStr = dayNamesList[dayOfWeek] || "Thứ 2";
        const dateStr = `${String(todayObj.getDate()).padStart(2, "0")}/${String(todayObj.getMonth() + 1).padStart(2, "0")}/${todayObj.getFullYear()}`;
        const dateISO = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, "0")}-${String(todayObj.getDate()).padStart(2, "0")}`;
        const dayLabel = `Hôm nay (${dayNameStr} - ${dateStr})`;

        const isWeekday = dayOfWeek >= 0 && dayOfWeek <= 4;
        const morningList = isWeekday ? getAssignedCTVs(dateISO, "morning") : [];
        const afternoonList = isWeekday ? getAssignedCTVs(dateISO, "afternoon") : [];

        type TodayCTVItem = {
            ctv: AssignedCTV;
            shifts: ("Ca Sáng" | "Ca Chiều")[];
            dayName: string;
        };

        const map = new Map<string, TodayCTVItem>();

        morningList.forEach((ctv) => {
            map.set(ctv.id, {
                ctv,
                shifts: ["Ca Sáng"],
                dayName: dayNameStr,
            });
        });

        afternoonList.forEach((ctv) => {
            if (map.has(ctv.id)) {
                map.get(ctv.id)!.shifts.push("Ca Chiều");
            } else {
                map.set(ctv.id, {
                    ctv,
                    shifts: ["Ca Chiều"],
                    dayName: dayNameStr,
                });
            }
        });

        return {
            dayLabel,
            list: Array.from(map.values()),
        };
    }, [shifts, accounts]);

    const handleCTVClick = (ctv: AssignedCTV) => {
        if (!onViewAccountDetail) return;
        const matched = accounts.find((a) => a.id === ctv.id || a.name.toLowerCase() === ctv.name.toLowerCase());
        if (matched) {
            onViewAccountDetail(matched);
        } else {
            onShowToast?.(`Không tìm thấy hồ sơ tài khoản của ${ctv.name}.`);
        }
    };

    const handleOpenShiftDetail = (
        dayName: string,
        dateFormatted: string,
        shiftName: "Ca Sáng" | "Ca Chiều",
        workDate: string,
        useHistory = false,
    ) => {
        setDetailSearchQuery("");
        const rawList = (useHistory ? getHistoryCTVs : getAssignedCTVs)(workDate, shiftName === "Ca Sáng" ? "morning" : "afternoon");

        // Enrich CTVs with account details
        const enrichedList = rawList.map((ctv) => {
            const acc = accounts.find((a) => a.id === ctv.id || a.name.toLowerCase() === ctv.name.toLowerCase());
            return {
                ...ctv,
                email: acc?.email || "",
                cctvCode: acc?.cctvCode || ctv.cctvCode || "",
                phone: acc?.phone || ctv.phone || "",
            };
        });

        setSelectedShiftDetail({
            dayName,
            dateFormatted,
            shiftName,
            shiftTimeLabel: shiftName === "Ca Sáng" ? "08:00 - 12:00" : "13:30 - 17:30",
            workDate,
            ctvList: enrichedList,
        });
    };

    // Filtered list inside detail modal
    const filteredDetailCTVs = useMemo(() => {
        if (!selectedShiftDetail) return [];
        if (!detailSearchQuery.trim()) return selectedShiftDetail.ctvList;

        const q = detailSearchQuery.toLowerCase().trim();
        return selectedShiftDetail.ctvList.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                (c.phone && c.phone.toLowerCase().includes(q)) ||
                (c.email && c.email.toLowerCase().includes(q)) ||
                (c.cctvCode && c.cctvCode.toLowerCase().includes(q)),
        );
    }, [selectedShiftDetail, detailSearchQuery]);

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <h2 className="text-2xl font-bold text-[#1a1b1e] dark:text-slate-100 tracking-tight">
                    Lịch làm việc tổng hợp
                </h2>
            </div>

            {/* Danh sách CTV đăng ký hôm nay (Khối thống kê nhanh) */}
            <div className="bg-white dark:bg-[#25262b] border border-[#E2E8F0] dark:border-[#3b3d45] rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                            <span className="material-symbols-outlined text-[20px]">badge</span>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                                <span>Danh sách CTV đăng ký hôm nay</span>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                                    {todayData.dayLabel}
                                </span>
                            </h3>
                        </div>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Tổng số: <strong className="text-slate-800 dark:text-slate-200">{todayData.list.length}</strong>{" "}
                        Cộng tác viên
                    </span>
                </div>

                {todayData.list.length === 0 ? (
                    <div className="text-center py-6 text-slate-400">
                        <span className="material-symbols-outlined text-[32px] block mb-1 opacity-50">person_off</span>
                        <p className="text-sm font-medium">Chưa có CTV nào đăng ký ca hôm nay</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {todayData.list.map(({ ctv, shifts: ctvShifts }) => {
                            return (
                                <div
                                    key={ctv.id}
                                    onClick={() => handleCTVClick(ctv)}
                                    className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-[#1f2023] border border-slate-200/80 dark:border-slate-800 hover:border-blue-600 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between group">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {ctv.avatar ? (
                                            <img
                                                src={ctv.avatar}
                                                alt={ctv.name}
                                                className="w-11 h-11 rounded-full object-cover shrink-0 ring-2 ring-slate-200 dark:ring-slate-700 group-hover:ring-blue-600 transition-all"
                                            />
                                        ) : (
                                            <div className="w-11 h-11 rounded-full bg-[#1b365d] text-white font-bold text-sm flex items-center justify-center shrink-0 ring-2 ring-slate-200 dark:ring-slate-700 group-hover:ring-blue-600 transition-all">
                                                {ctv.initials || ctv.name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}

                                        <div className="min-w-0">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors truncate">
                                                {ctv.name}
                                            </h4>

                                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap shrink-0 ${
                                                        ctvShifts.length > 1
                                                            ? "bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300"
                                                            : ctvShifts[0] === "Ca Sáng"
                                                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
                                                              : "bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300"
                                                    }`}>
                                                    <span className="whitespace-nowrap">
                                                        {ctvShifts.map((s) => s.replace("Ca ", "")).join(", ")}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Main Schedule Container (With View Toggle: Lịch tuần & Lịch tháng) */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-[#25262b]">
                {/* Navigation Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/35">
                    {/* View Switcher: Lịch tuần & Lịch tháng */}
                    <div
                        className="inline-flex w-fit rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900"
                        role="group"
                        aria-label="Chế độ xem lịch">
                        <button
                            type="button"
                            onClick={() => setCalendarView("week")}
                            aria-pressed={calendarView === "week"}
                            className={`min-h-10 rounded-lg px-4 text-xs font-bold transition-colors duration-200 cursor-pointer flex items-center gap-1.5 ${
                                calendarView === "week"
                                    ? "bg-blue-700 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                            }`}>
                            <span className="material-symbols-outlined text-[17px]">calendar_view_week</span>
                            <span>Lịch tuần</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setCalendarView("month")}
                            aria-pressed={calendarView === "month"}
                            className={`min-h-10 rounded-lg px-4 text-xs font-bold transition-colors duration-200 cursor-pointer flex items-center gap-1.5 ${
                                calendarView === "month"
                                    ? "bg-blue-700 text-white shadow-sm"
                                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                            }`}>
                            <span className="material-symbols-outlined text-[17px]">history</span>
                            <span>Lịch sử làm việc</span>
                        </button>
                    </div>

                    {/* Controls for Active View */}
                    {calendarView === "month" && (
                        <div className="flex items-center gap-2">
                            <div
                                className="inline-flex min-h-10 items-center rounded-xl border border-slate-200 bg-slate-100 p-1 shadow-2xs dark:border-slate-700 dark:bg-slate-900"
                                role="group"
                                aria-label="Chuyển tháng">
                                <button
                                    type="button"
                                    onClick={handlePrevMonth}
                                    className="flex min-h-8 min-w-8 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                                    aria-label="Tháng trước">
                                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                                </button>
                                <span className="min-w-[130px] px-2 text-center text-xs font-bold text-slate-900 dark:text-slate-100">
                                    {monthNames[selectedMonth]}, {selectedYear}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleNextMonth}
                                    className="flex min-h-8 min-w-8 items-center justify-center rounded-lg text-slate-700 transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                                    aria-label="Tháng sau">
                                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* VIEW 1: LỊCH TUẦN (Matching CTV schedule with CTV counts & detail popups) */}
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

                        <div className="overflow-x-auto">
                            <div className="min-w-[650px] space-y-3">
                                {/* Weekday Headers: THỨ 2, THỨ 3, THỨ 4, THỨ 5, THỨ 6 */}
                                <div className="grid grid-cols-5 gap-3">
                                    {WEEKDAYS.map((weekday) => (
                                        <div
                                            key={weekday.index}
                                            className="flex items-center justify-center rounded-xl py-2.5 text-center text-xs font-bold uppercase tracking-wider bg-slate-100/90 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                                            <span>{weekday.label}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Weekday Shift Cards */}
                                <div className="grid grid-cols-5 gap-3">
                                    {weekDays.map((date, index) => {
                                        const dateISO = toISODate(date);
                                        const dayName = WEEKDAYS[index].label;
                                        const dateFormatted = `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

                                        const morningCTVs = getAssignedCTVs(dateISO, "morning");
                                        const afternoonCTVs = getAssignedCTVs(dateISO, "afternoon");

                                        return (
                                            <div
                                                key={dateISO}
                                                className="rounded-2xl border-2 border-slate-200 bg-white p-3 min-h-[104px] shadow-2xs transition-colors dark:border-slate-800 dark:bg-slate-900">
                                                <div className="space-y-2">
                                                    {/* Ca Sáng Slot */}
                                                    {morningCTVs.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleOpenShiftDetail(
                                                                    dayName,
                                                                    dateFormatted,
                                                                    "Ca Sáng",
                                                                    dateISO,
                                                                )
                                                            }
                                                            className="w-full flex items-center justify-between gap-2 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-100 hover:border-amber-300 transition-all cursor-pointer group text-left dark:border-amber-800/50 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 dark:text-amber-200"
                                                            title="Bấm để xem chi tiết danh sách CTV ca sáng">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <span
                                                                    className="material-symbols-outlined text-[18px] text-amber-700 dark:text-amber-400 shrink-0"
                                                                    aria-hidden="true">
                                                                    wb_sunny
                                                                </span>
                                                            </div>
                                                            <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-200/90 text-amber-900 dark:bg-amber-900/80 dark:text-amber-200 transition-transform group-hover:scale-105">
                                                                {morningCTVs.length} CTV
                                                            </span>
                                                        </button>
                                                    ) : afternoonCTVs.length > 0 ? (
                                                        <div className="h-[38px]" aria-hidden="true" />
                                                    ) : null}

                                                    {/* Ca Chiều Slot */}
                                                    {afternoonCTVs.length > 0 ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleOpenShiftDetail(
                                                                    dayName,
                                                                    dateFormatted,
                                                                    "Ca Chiều",
                                                                    dateISO,
                                                                )
                                                            }
                                                            className="w-full flex items-center justify-between gap-2 rounded-xl border border-purple-200/90 bg-purple-50 px-3 py-2 text-xs font-bold text-purple-900 shadow-xs hover:bg-purple-100 hover:border-purple-300 transition-all cursor-pointer group text-left dark:border-purple-800/50 dark:bg-purple-950/40 dark:hover:bg-purple-950/70 dark:text-purple-200"
                                                            title="Bấm để xem chi tiết danh sách CTV ca chiều">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <span
                                                                    className="material-symbols-outlined text-[18px] text-purple-700 dark:text-purple-400 shrink-0"
                                                                    aria-hidden="true">
                                                                    wb_twilight
                                                                </span>
                                                            </div>
                                                            <span className="shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-200/90 text-purple-900 dark:bg-purple-900/80 dark:text-purple-200 transition-transform group-hover:scale-105">
                                                                {afternoonCTVs.length} CTV
                                                            </span>
                                                        </button>
                                                    ) : morningCTVs.length > 0 ? (
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
                    /* VIEW 2: LỊCH THÁNG (Monthly grid with Mon-Fri) */
                    <div className="space-y-4 p-4 sm:p-5">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-blue-700 dark:text-blue-300 text-[22px]">
                                    history
                                </span>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    Lịch sử làm việc - {monthNames[selectedMonth]}, {selectedYear}
                                </h3>
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                Dữ liệu từ bảng work_history
                            </span>
                        </div>

                        {/* Grid Table Container */}
                        <div className="overflow-x-auto">
                            <div className="min-w-[850px]">
                                {/* Header Columns (Mon to Fri) */}
                                <div className="grid grid-cols-5 gap-3 mb-3 text-center">
                                    {WEEKDAYS.map((day) => (
                                        <div
                                            key={day.index}
                                            className="py-2.5 px-3 bg-slate-100 dark:bg-[#1f2023] rounded-xl font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wider border border-slate-200/80 dark:border-slate-800">
                                            {day.label}
                                        </div>
                                    ))}
                                </div>

                                {/* Calendar Weeks Rows */}
                                <div className="space-y-3">
                                    {calendarWeeks.map((week, weekIdx) => (
                                        <div key={weekIdx} className="grid grid-cols-5 gap-3">
                                            {week.map((cell, colIdx) => {
                                                if (!cell) {
                                                    return (
                                                        <div
                                                            key={colIdx}
                                                            className="min-h-[110px] bg-slate-50/50 dark:bg-[#1f2023]/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-800/60 opacity-40"
                                                        />
                                                    );
                                                }

                                                const morningCTVs = getHistoryCTVs(cell.dateISO, "morning");
                                                const afternoonCTVs = getHistoryCTVs(cell.dateISO, "afternoon");

                                                return (
                                                    <div
                                                        key={colIdx}
                                                        className={`min-h-[110px] p-3 rounded-xl border transition-all flex flex-col ${
                                                            cell.isToday
                                                                ? "border-blue-700 bg-blue-50/40 ring-2 ring-blue-700/20 dark:border-blue-500 dark:bg-blue-950/20"
                                                                : "bg-white dark:bg-[#222327] border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                                                        }`}>
                                                        {/* Day Cell Header */}
                                                        <div className="flex items-center justify-center border-b border-slate-100 dark:border-slate-800/80 pb-1.5 mb-2">
                                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                                                <span>{cell.dateShort}</span>
                                                                {cell.isToday && (
                                                                    <span className="rounded bg-blue-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                                                        Hôm nay
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>

                                                        {/* Shift Buttons inside Day Cell */}
                                                        <div className="space-y-1.5 min-h-[58px] flex flex-col justify-start">
                                                            {/* Ca Sáng Button */}
                                                            {morningCTVs.length > 0 ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleOpenShiftDetail(
                                                                            cell.dayName,
                                                                            cell.dateFormatted,
                                                                            "Ca Sáng",
                                                                            cell.dateISO,
                                                                            true,
                                                                        )
                                                                    }
                                                                    className="w-full px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-950/80 border border-amber-200/80 dark:border-amber-900/40 flex items-center justify-between text-left transition-all cursor-pointer group"
                                                                    title="Bấm xem danh sách CTV ca sáng">
                                                                    <div className="flex items-center text-amber-800 dark:text-amber-300">
                                                                        <span className="material-symbols-outlined text-[16px]">
                                                                            wb_sunny
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold bg-amber-200/80 dark:bg-amber-900/70 text-amber-900 dark:text-amber-200 px-1.5 py-0.5 rounded group-hover:scale-105 transition-transform">
                                                                        {morningCTVs.length} CTV
                                                                    </span>
                                                                </button>
                                                            ) : afternoonCTVs.length > 0 ? (
                                                                <div className="h-[32px]" aria-hidden="true" />
                                                            ) : null}

                                                            {/* Ca Chiều Button */}
                                                            {afternoonCTVs.length > 0 ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleOpenShiftDetail(
                                                                            cell.dayName,
                                                                            cell.dateFormatted,
                                                                            "Ca Chiều",
                                                                            cell.dateISO,
                                                                            true,
                                                                        )
                                                                    }
                                                                    className="w-full px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-950/80 border border-purple-200/80 dark:border-purple-900/40 flex items-center justify-between text-left transition-all cursor-pointer group"
                                                                    title="Bấm xem danh sách CTV ca chiều">
                                                                    <div className="flex items-center text-purple-800 dark:text-purple-300">
                                                                        <span className="material-symbols-outlined text-[16px]">
                                                                            wb_twilight
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold bg-purple-200/80 dark:bg-purple-900/70 text-purple-900 dark:text-purple-200 px-1.5 py-0.5 rounded group-hover:scale-105 transition-transform">
                                                                        {afternoonCTVs.length} CTV
                                                                    </span>
                                                                </button>
                                                            ) : morningCTVs.length > 0 ? (
                                                                <div className="h-[32px]" aria-hidden="true" />
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

            {/* Modal "Chi tiết ca làm việc" */}
            {selectedShiftDetail && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
                    role="presentation"
                    onMouseDown={(e) => e.target === e.currentTarget && setSelectedShiftDetail(null)}>
                    <div className="bg-white dark:bg-[#25262b] rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                        {/* Modal Header */}
                        <div className="p-4 sm:p-5 bg-slate-50 dark:bg-[#1f2023] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
                            <div>
                                <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400 mb-1">
                                    <span className="material-symbols-outlined text-[18px]">event_note</span>
                                    <span>CHI TIẾT CA LÀM VIỆC</span>
                                </div>
                                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
                                    <span>
                                        {selectedShiftDetail.shiftName} - {selectedShiftDetail.dayName} (
                                        {selectedShiftDetail.dateFormatted})
                                    </span>
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedShiftDetail(null)}
                                className="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors cursor-pointer">
                                <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
                            {/* Filter and stats row */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-blue-50/80 dark:bg-blue-950/40 p-3 rounded-xl border border-blue-100 dark:border-blue-900/60 text-xs">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-blue-900 dark:text-blue-200">
                                        Danh sách CTV trong ca:
                                    </span>
                                    <span className="font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2.5 py-0.5 rounded-lg">
                                        {selectedShiftDetail.ctvList.length} CTV
                                    </span>
                                </div>

                                {selectedShiftDetail.ctvList.length > 3 && (
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={detailSearchQuery}
                                            onChange={(e) => setDetailSearchQuery(e.target.value)}
                                            placeholder="Tìm CTV theo tên, SĐT..."
                                            className="w-full sm:w-56 pl-7 pr-3 py-1.5 text-xs bg-white dark:bg-[#1a1b1e] border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                                        />
                                        <span className="material-symbols-outlined text-[15px] text-slate-400 absolute left-2 top-2">
                                            search
                                        </span>
                                    </div>
                                )}
                            </div>

                            {filteredDetailCTVs.length === 0 ? (
                                <div className="text-center py-12 text-slate-400 space-y-2">
                                    <span className="material-symbols-outlined text-[44px] block opacity-40">
                                        group_off
                                    </span>
                                    <p className="text-sm font-semibold">
                                        {selectedShiftDetail.ctvList.length === 0
                                            ? "Chưa có CTV nào đăng ký ca làm việc này"
                                            : "Không tìm thấy CTV phù hợp với từ khóa"}
                                    </p>
                                </div>
                            ) : (
                                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-[#1f2023] border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                                    <th className="py-3.5 px-4">Họ tên CTV</th>
                                                    <th className="py-3.5 px-4">Số điện thoại</th>
                                                    <th className="py-3.5 px-4">Email</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                                {filteredDetailCTVs.map((ctv, idx) => (
                                                    <tr
                                                        key={ctv.id || idx}
                                                        className="hover:bg-slate-50/80 dark:hover:bg-[#1f2023]/60 transition-colors">
                                                        {/* Họ tên CTV */}
                                                        <td className="py-3.5 px-4">
                                                            <div
                                                                onClick={() => {
                                                                    handleCTVClick(ctv);
                                                                    setSelectedShiftDetail(null);
                                                                }}
                                                                className="inline-flex items-center gap-3 cursor-pointer group"
                                                                title="Bấm xem chi tiết thông tin CTV">
                                                                {ctv.avatar ? (
                                                                    <img
                                                                        src={ctv.avatar}
                                                                        alt={ctv.name}
                                                                        className="w-9 h-9 rounded-full object-cover shrink-0 ring-2 ring-slate-200 dark:ring-slate-700 group-hover:ring-blue-600 transition-all"
                                                                    />
                                                                ) : (
                                                                    <div className="w-9 h-9 rounded-full bg-[#1b365d] text-white font-bold text-xs flex items-center justify-center shrink-0 ring-2 ring-slate-200 dark:ring-slate-700 group-hover:ring-blue-600 transition-all">
                                                                        {ctv.initials ||
                                                                            ctv.name.substring(0, 2).toUpperCase()}
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <span className="font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors block">
                                                                        {ctv.name}
                                                                    </span>
                                                                    {ctv.cctvCode && (
                                                                        <span className="text-[10px] text-slate-400">
                                                                            Mã: {ctv.cctvCode}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Số điện thoại */}
                                                        <td className="py-3.5 px-4">
                                                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                                                                <span className="material-symbols-outlined text-[15px] text-slate-400">
                                                                    call
                                                                </span>
                                                                <span>{ctv.phone || "Chưa cập nhật"}</span>
                                                            </div>
                                                        </td>

                                                        {/* Email */}
                                                        <td className="py-3.5 px-4">
                                                            <span className="text-slate-600 dark:text-slate-300 font-medium">
                                                                {ctv.email || "—"}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
