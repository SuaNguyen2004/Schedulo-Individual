import React from "react";
import { ShiftSlot, UserAccount } from "../../types";
import { CTVScheduleWorkspace } from "./CTVScheduleWorkspace";
import { SummaryScheduleScreen } from "./SummaryScheduleScreen";

interface ScheduleScreenProps {
    shifts: ShiftSlot[];
    history?: ShiftSlot[];
    accounts: UserAccount[];
    onUpdateShifts: (updatedShifts: ShiftSlot[]) => void;
    onShowToast: (msg: string) => void;
    onViewAccountDetail?: (account: UserAccount) => void;
    currentUser?: UserAccount;
    userRole?: "Admin" | "Cộng tác viên";
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
    shifts,
    history = [],
    accounts,
    onUpdateShifts,
    onShowToast,
    onViewAccountDetail,
    currentUser,
    userRole = "Admin",
}) => {
    const isCTV = userRole === "Cộng tác viên";
    const ctvUser = currentUser || accounts.find((a) => a.role === "Cộng tác viên") || {
        id: "empty-ctv",
        stt: 0,
        name: "",
        email: "",
        phone: "",
        role: "Cộng tác viên",
        status: "Kích hoạt",
        registerDate: "",
    };

    if (isCTV) {
        return (
            <CTVScheduleWorkspace
                shifts={shifts}
                history={history}
                currentUser={ctvUser}
                onUpdateShifts={onUpdateShifts}
                onShowToast={onShowToast}
            />
        );
    }

    return (
        <SummaryScheduleScreen
            shifts={shifts}
            history={history}
            accounts={accounts}
            onViewAccountDetail={onViewAccountDetail}
            onShowToast={onShowToast}
            currentUser={currentUser}
            userRole={userRole}
        />
    );
};
