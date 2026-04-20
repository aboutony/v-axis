import React, { useState, useEffect } from "react";

interface StatusBadgeProps {
  color: string;
  children: React.ReactNode;
  className?: string;
}

const StatusBadge = ({ color, children, className }: StatusBadgeProps) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Detect dark mode based on system preference or user settings
  useEffect(() => {
    const prefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setIsDarkMode(prefersDarkMode);
  }, []);

  return (
    <div
      className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}
      style={{
        backgroundColor:
          color === "CRITICAL"
            ? "#ef4444"
            : color === "WARNING"
              ? "#ffcc00"
              : color === "COMPLIANT"
                ? "#2563ab"
                : "white",
        color: isDarkMode ? "white" : "black",
        transition: "background-color 0.3s ease",
      }}
    >
      {children}
    </div>
  );
};

export default StatusBadge;
