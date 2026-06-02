"use client";

import React from "react";
import { useTheme } from "./ThemeContext";

export default function ThemeToggle({ className = "" }) {
    const { theme, toggleTheme, mounted } = useTheme();

    if (!mounted) {
        // Return a placeholder structure during server render to prevent hydration mismatches
        return (
            <button 
                className={`theme-toggle ${className}`} 
                type="button" 
                aria-label="Switch theme" 
                title="Switch theme"
                style={{ visibility: "hidden" }}
            >
                <i className="fa-solid fa-sun"></i>
            </button>
        );
    }

    return (
        <button 
            id="themeToggle"
            className={`theme-toggle ${className}`} 
            type="button" 
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
            <i className={theme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon"}></i>
        </button>
    );
}
