import React, { createContext, useContext, useState, useEffect } from "react";
import { ContrastOption, AccentColorOption } from "../types";

export interface SystemSettingsContextType {
    isDarkMode: boolean;
    contrast: ContrastOption;
    accentColor: AccentColorOption;
    toggleDarkMode: () => void;
    setContrast: (contrast: ContrastOption) => void;
    setAccentColor: (color: AccentColorOption) => void;
}

const accentMap: Record<AccentColorOption, { primary: string; hover: string; light: string; text: string }> = {
    Trắng: { primary: "#475569", hover: "#334155", light: "#f1f5f9", text: "#ffffff" },
    Lục: { primary: "#10b981", hover: "#059669", light: "#ecfdf5", text: "#ffffff" },
    Lam: { primary: "#2563eb", hover: "#1d4ed8", light: "#eff6ff", text: "#ffffff" },
    Vàng: { primary: "#d97706", hover: "#b45309", light: "#fffbeb", text: "#ffffff" },
    Đỏ: { primary: "#dc2626", hover: "#b91c1c", light: "#fef2f2", text: "#ffffff" },
    Cam: { primary: "#ea580c", hover: "#c2410c", light: "#fff7ed", text: "#ffffff" },
    Tím: { primary: "#9333ea", hover: "#7e22ce", light: "#faf5ff", text: "#ffffff" },
};

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [contrast, setContrast] = useState<ContrastOption>("Trung bình");
    const [accentColor, setAccentColor] = useState<AccentColorOption>("Lam");

    // Apply dark mode class
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    }, [isDarkMode]);

    // Apply contrast attribute
    useEffect(() => {
        const contrastVal = contrast === "Cao" ? "high" : contrast === "Thấp" ? "low" : "medium";
        document.documentElement.setAttribute("data-contrast", contrastVal);
    }, [contrast]);

    // Apply accent color CSS variables
    useEffect(() => {
        const config = accentMap[accentColor] || accentMap["Lam"];
        document.documentElement.style.setProperty("--accent-primary", config.primary);
        document.documentElement.style.setProperty("--accent-hover", config.hover);
        document.documentElement.style.setProperty("--accent-light", config.light);
        document.documentElement.style.setProperty("--accent-text", config.text);
    }, [accentColor]);

    const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

    return (
        <SystemSettingsContext.Provider
            value={{
                isDarkMode,
                contrast,
                accentColor,
                toggleDarkMode,
                setContrast,
                setAccentColor,
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
