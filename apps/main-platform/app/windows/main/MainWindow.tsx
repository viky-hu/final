"use client";

interface MainWindowProps {
  onBack?: () => void;
}

export function MainWindow({ onBack }: MainWindowProps) {
  return (
    <div className="main-window-page">
      <p className="main-window-placeholder">Main Application</p>
      {onBack && (
        <button type="button" className="main-window-back" onClick={onBack}>
          ← Back
        </button>
      )}
    </div>
  );
}
