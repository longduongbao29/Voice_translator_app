import React from 'react';

interface TextAreaProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    readOnly?: boolean;
}

const TextArea: React.FC<TextAreaProps> = ({
    value,
    onChange,
    placeholder,
    className = '',
    readOnly = false,
}) => {
    return (
        <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            readOnly={readOnly}
            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none text-base ${className}`}
            rows={6}
        />
    );
};

export default TextArea;
