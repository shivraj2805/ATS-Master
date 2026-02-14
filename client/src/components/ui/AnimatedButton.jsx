import { useState } from 'prop-types';
import { Loader2 } from 'lucide-react';
import PropTypes from 'prop-types';

export default function AnimatedButton({
    children,
    onClick,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    icon: Icon,
    className = '',
    ...props
}) {
    const [ripples, setRipples] = useState([]);

    const variants = {
        primary: 'bg-gradient-to-r from-primary-600 via-secondary-600 to-accent-600 text-white hover:shadow-glow-lg',
        secondary: 'bg-gradient-to-r from-secondary-600 to-accent-600 text-white hover:shadow-glow',
        outline: 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50',
        ghost: 'text-primary-600 hover:bg-primary-50',
        success: 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-colored',
        danger: 'bg-gradient-to-r from-red-600 to-pink-600 text-white hover:shadow-colored',
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3 text-base',
        lg: 'px-8 py-4 text-lg',
    };

    const handleClick = (e) => {
        if (disabled || loading) return;

        // Create ripple effect
        const button = e.currentTarget;
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const newRipple = {
            x,
            y,
            id: Date.now(),
        };

        setRipples([...ripples, newRipple]);

        setTimeout(() => {
            setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
        }, 600);

        if (onClick) onClick(e);
    };

    return (
        <button
            onClick={handleClick}
            disabled={disabled || loading}
            className={`
        relative overflow-hidden
        inline-flex items-center justify-center gap-2
        font-semibold rounded-xl
        transition-all duration-300
        hover:scale-105 hover:-translate-y-0.5
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:translate-y-0
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
            {...props}
        >
            {/* Ripple Effect */}
            {ripples.map((ripple) => (
                <span
                    key={ripple.id}
                    className="absolute w-4 h-4 bg-white/30 rounded-full animate-ping"
                    style={{
                        left: ripple.x - 8,
                        top: ripple.y - 8,
                    }}
                />
            ))}

            {/* Content */}
            <span className="relative z-10 flex items-center gap-2">
                {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                ) : Icon ? (
                    <Icon className="w-5 h-5" />
                ) : null}
                {children}
            </span>

            {/* Gradient Overlay on Hover */}
            {variant === 'primary' && (
                <div className="absolute inset-0 bg-gradient-to-r from-accent-600 via-secondary-600 to-primary-600 opacity-0 hover:opacity-100 transition-opacity duration-500" />
            )}
        </button>
    );
}

AnimatedButton.propTypes = {
    children: PropTypes.node.isRequired,
    onClick: PropTypes.func,
    variant: PropTypes.oneOf(['primary', 'secondary', 'outline', 'ghost', 'success', 'danger']),
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    loading: PropTypes.bool,
    disabled: PropTypes.bool,
    icon: PropTypes.elementType,
    className: PropTypes.string,
};
