import * as React from "react";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  "Airbnb",
  "Booking",
  "Abritel",
  "VRBO",
  "Autre"
];

export interface ComboboxPlatformProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const ComboboxPlatform: React.FC<ComboboxPlatformProps> = ({
  value,
  onChange,
  placeholder = "ex: Airbnb, Booking, Abritel...",
  disabled = false,
  className = ""
}) => {
  const [input, setInput] = React.useState(value || "");
  const [open, setOpen] = React.useState(false);
  const filtered = input
    ? PLATFORMS.filter(p => p.toLowerCase().includes(input.toLowerCase()))
    : PLATFORMS;

  React.useEffect(() => {
    setInput(value || "");
  }, [value]);

  return (
    <div className={cn("relative", className)}>
      <input
        type="text"
        value={input}
        disabled={disabled}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
        onChange={e => {
          setInput(e.target.value);
          onChange(e.target.value);
        }}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-40 overflow-y-auto">
          {filtered.map(option => (
            <li
              key={option}
              className={cn(
                "px-4 py-2 cursor-pointer hover:bg-blue-50",
                option === value && "bg-blue-100 font-semibold"
              )}
              onMouseDown={e => {
                e.preventDefault();
                setInput(option);
                onChange(option);
                setOpen(false);
              }}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
