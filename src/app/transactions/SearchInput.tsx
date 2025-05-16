import React from "react";

interface SearchInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder = "Rechercher...", className = "" }) => (
  <div style={{ width: '320px', display: 'flex', alignItems: 'center' }}>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      style={{
        height: '44px',
        width: '100%',
        fontSize: '1.05rem',
        borderRadius: '1em',
        border: '1.5px solid #e0e7ef',
        background: 'rgba(255,255,255,0.7)',
        boxSizing: 'border-box'
      }}
    />
  </div>
);
