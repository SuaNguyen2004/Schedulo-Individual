import type { AssignedCTV, ShiftSlot, UserAccount } from "../types";

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date: Date, amount: number) =>
  new Date(startOfDay(date).getTime() + amount * DAY_MS);

const startOfWeek = (date: Date) => {
  const mondayOffset = (startOfDay(date).getDay() + 6) % 7;
  return addDays(startOfDay(date), -mondayOffset);
};

const toISODate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseISODate = (iso: string): Date | null => {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

export function getAssignedCTVsForDate(
  shifts: ShiftSlot[],
  accounts: UserAccount[],
  workDate: string,
  shiftType: "morning" | "afternoon",
): AssignedCTV[] {
  const dateObj = parseISODate(workDate);
  if (!dateObj) return [];

  // Only show shifts for dates up to the end of the current week.
  // Future weeks are not displayed until the CTV re-registers or the
  // week arrives.
  const today = startOfDay(new Date());
  const currentWeekSunday = addDays(startOfWeek(today), 4); // Friday
  if (dateObj > currentWeekSunday) {
    return [];
  }

  const uniqueCTVs = new Map<string, AssignedCTV>();

  shifts
    .filter((shift) => shift.workDate === workDate && shift.shiftType === shiftType)
    .forEach((shift) => {
      (shift.assignedCTVs || []).forEach((ctv) => {
        const account = accounts.find(
          (candidate) =>
            candidate.id === ctv.id ||
            candidate.name.trim().toLowerCase() === ctv.name.trim().toLowerCase(),
        );
        if (account?.role === "Admin") return;

        const key = ctv.id || ctv.name.trim().toLowerCase();
        const avatar = account?.avatar || ctv.avatar;
        const initials = account?.initials || ctv.initials;
        if (!uniqueCTVs.has(key)) {
          uniqueCTVs.set(key, {
            ...ctv,
            ...(avatar ? { avatar } : {}),
            ...(initials ? { initials } : {}),
            room: ctv.room || shift.room,
            taskContent: ctv.taskContent || shift.workContent,
          });
        }
      });
    });

  return Array.from(uniqueCTVs.values());
}
