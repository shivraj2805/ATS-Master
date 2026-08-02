import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';

export default function ProgressRing({
    value,
    max = 100,
    size = 120,
    strokeWidth = 8,
    color = 'primary',
    showValue = true,
    label = '',
    animate = true,
    className = ''
}) {
    const [progress, setProgress] = useState(0);

    const colors = {
        primary: { from: '#0ea5e9', to: '#9333ea' },
        secondary: { from: '#a855f7', to: '#c026d3' },
        success: { from: '#22c55e', to: '#10b981' },
        warning: { from: '#f59e0b', to: '#ef4444' },
        accent: { from: '#d946ef', to: '#c026d3' },
    };

    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (progress / max) * circumference;

    useEffect(() => {
        if (animate) {
            let start = 0;
            const duration = 1500;
            const startTime = Date.now();

            const animateProgress = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min((elapsed / duration) * value, value);

                setProgress(progress);

                if (progress < value) {
                    requestAnimationFrame(animateProgress);
                }
            };

            requestAnimationFrame(animateProgress);
        } else {
            setProgress(value);
        }
    }, [value, animate]);

    const percentage = Math.round((progress / max) * 100);

    return (
        <div className={`relative inline-flex items-center justify-center ${className}`}>
            <svg
                width={size}
                height={size}
                className="transform -rotate-90"
            >
                {/* Background Circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="none"
                    className="text-gray-200"
                />

                {/* Progress Circle with Gradient */}
                <defs>
                    <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={colors[color].from} />
                        <stop offset="100%" stopColor={colors[color].to} />
                    </linearGradient>
                </defs>

                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={`url(#gradient-${color})`}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out drop-shadow-lg"
                    style={{
                        filter: `drop-shadow(0 0 8px ${colors[color].from}40)`,
                    }}
                />
            </svg>

            {/* Center Content */}
            {showValue && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent animate-count-up">
                        {percentage}
                    </span>
                    {label && (
                        <span className="text-xs font-medium text-gray-600 mt-1">{label}</span>
                    )}
                </div>
            )}

            {/* Glow Effect */}
            {progress === max && (
                <div
                    className="absolute inset-0 rounded-full animate-glow-pulse"
                    style={{
                        background: `radial-gradient(circle, ${colors[color].from}20 0%, transparent 70%)`,
                    }}
                />
            )}
        </div>
    );
}

ProgressRing.propTypes = {
    value: PropTypes.number.isRequired,
    max: PropTypes.number,
    size: PropTypes.number,
    strokeWidth: PropTypes.number,
    color: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'accent']),
    showValue: PropTypes.bool,
    label: PropTypes.string,
    animate: PropTypes.bool,
    className: PropTypes.string,
};
