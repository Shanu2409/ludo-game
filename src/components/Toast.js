import React, { useEffect, useState } from "react";
import "../styles.css";

/**
 * Toast notification component for game events
 */
export default function Toast({
  message,
  type = "info",
  duration = 3000,
  onClose,
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose && onClose(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return "✅";
      case "warning":
        return "⚠️";
      case "error":
        return "❌";
      case "capture":
        return "⚔️";
      case "bonus":
        return "🎁";
      default:
        return "ℹ️";
    }
  };

  const getColor = () => {
    switch (type) {
      case "success":
        return "#4CAF50";
      case "warning":
        return "#FF9800";
      case "error":
        return "#f44336";
      case "capture":
        return "#e91e63";
      case "bonus":
        return "#9c27b0";
      default:
        return "#2196F3";
    }
  };

  if (!visible) return null;

  return (
    <div
      className={`toast ${visible ? "toast-visible" : ""}`}
      style={{
        borderLeft: `4px solid ${getColor()}`,
        animation: visible
          ? "slideInRight 0.3s ease-out"
          : "slideOutRight 0.3s ease-out",
      }}
    >
      <span className="toast-icon">{getIcon()}</span>
      <span className="toast-message">{message}</span>
      <button
        className="toast-close"
        onClick={() => {
          setVisible(false);
          setTimeout(() => onClose && onClose(), 300);
        }}
      >
        ✕
      </button>
    </div>
  );
}
