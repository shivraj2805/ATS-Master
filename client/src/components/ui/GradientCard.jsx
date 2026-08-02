import PropTypes from 'prop-types';

export default function GradientCard({
    children,
    className = '',
    variant = 'primary',
    hover = true,
    glow = false
}) {
    const variants = {
        primary: 'from-primary-500/10 via-secondary-500/10 to-accent-500/10 border-primary-200/50',
        secondary: 'from-secondary-500/10 via-accent-500/10 to-primary-500/10 border-secondary-200/50',
        success: 'from-green-500/10 via-emerald-500/10 to-teal-500/10 border-green-200/50',
        warning: 'from-yellow-500/10 via-orange-500/10 to-red-500/10 border-yellow-200/50',
        glass: 'bg-white/70 backdrop-blur-xl border-white/20',
    };

    const hoverClass = hover ? 'hover-lift hover:shadow-medium' : '';
    const glowClass = glow ? 'hover-glow' : '';

    return (
        <div
            className={`
        relative rounded-2xl p-6 border-2
        bg-gradient-to-br ${variants[variant]}
        ${hoverClass} ${glowClass}
        transition-all duration-300
        ${className}
      `}
        >
            {glow && (
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 via-secondary-500/20 to-accent-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
            )}
            {children}
        </div>
    );
}

GradientCard.propTypes = {
    children: PropTypes.node.isRequired,
    className: PropTypes.string,
    variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'glass']),
    hover: PropTypes.bool,
    glow: PropTypes.bool,
};
