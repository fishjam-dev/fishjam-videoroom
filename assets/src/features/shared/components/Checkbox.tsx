import clsx from "clsx";
import { FC } from "react";

export type CheckboxProps = {
  label: string;
  id: string;
  status: boolean;
  onChange: () => void;
  disabled?: boolean;
  textSize?: "small" | "base";
};


export const Checkbox: FC<CheckboxProps> = ({ label, id, status, onChange, disabled, textSize = "small" }: CheckboxProps) => {
  return (
    <div className="form-check flex items-center justify-center gap-x-1">
      <label className={clsx("form-check-label font-aktivGrotesk text-brand-dark-blue-500", textSize === "small" ? "text-sm" : "text-base")} htmlFor={id}>
        {label}
      </label>
      <input
        onChange={onChange}
        disabled={disabled}
        className="form-check-input"
        type="checkbox"
        checked={status}
        id={id}
        name={id}
      />
    </div>
  );
};
