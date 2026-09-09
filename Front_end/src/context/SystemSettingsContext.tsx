import React, { createContext, useContext, useState, useEffect } from "react";

export interface SystemSettingsContextType {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Apply dark mode class
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [isDarkMode]);

    const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

    return (
        <SystemSettingsContext.Provider
            value={{
                isDarkMode,
                toggleDarkMode,
            }}>
            {children}
        </SystemSettingsContext.Provider>
    );
};

export const useSystemSettings = () => {
    const context = useContext(SystemSettingsContext);
    if (!context) {
        throw new Error("useSystemSettings must be used within a SystemSettingsProvider");
    }
    return context;
};
