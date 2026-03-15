import type { ReactNode } from "react";

type ERPHeaderProps = {
  title: string;
  subtitle?: string;
  onSave: () => void;
  onCancel: () => void;
  children: ReactNode;
  saveLabel?: string;
  cancelLabel?: string;
  saveDisabled?: boolean;
};

export function ERPHeader({
  title,
  subtitle,
  onSave,
  onCancel,
  children,
  saveLabel = "Save",
  cancelLabel = "Cancel",
  saveDisabled = false,
}: ERPHeaderProps) {
  return (
    <div className="erp-header-card">
      <div className="erp-header-top">
        <div className="erp-title-section">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>

        <div className="erp-actions">
          <button type="button" onClick={onCancel}>
            {cancelLabel || "Cancel"}
          </button>

          <button type="button" onClick={onSave} className="primary" disabled={saveDisabled}>
            {saveLabel || "Save"}
          </button>
        </div>
      </div>

      <div className="erp-header-fields">{children}</div>
    </div>
  );
}
