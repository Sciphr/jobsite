"use client";

import Link from "next/link";

export function ThemedLink({ 
  href, 
  children, 
  className = "", 
  variant = "primary",
  ...props 
}) {
  const getStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: 'var(--site-primary)',
          hoverColor: 'var(--site-primary-hover)'
        };
      case "success":
        return {
          backgroundColor: 'var(--site-success)',
          hoverColor: 'var(--site-success)'
        };
      default:
        return {
          backgroundColor: 'var(--site-primary)',
          hoverColor: 'var(--site-primary-hover)'
        };
    }
  };

  const styles = getStyles();

  return (
    <Link
      href={href}
      className={`${className}`}
      style={{ backgroundColor: styles.backgroundColor }}
      onMouseEnter={(e) => e.target.style.backgroundColor = styles.hoverColor}
      onMouseLeave={(e) => e.target.style.backgroundColor = styles.backgroundColor}
      {...props}
    >
      {children}
    </Link>
  );
}

export function ThemedButton({ 
  children, 
  className = "", 
  variant = "primary",
  onClick,
  disabled = false,
  as = "button",
  ...props 
}) {
  const getStyles = () => {
    switch (variant) {
      case "primary":
        return {
          backgroundColor: 'var(--site-primary)',
          hoverColor: 'var(--site-primary-hover)'
        };
      case "success":
        return {
          backgroundColor: 'var(--site-success)',
          hoverColor: 'var(--site-success)'
        };
      default:
        return {
          backgroundColor: 'var(--site-primary)',
          hoverColor: 'var(--site-primary-hover)'
        };
    }
  };

  const styles = getStyles();
  const Component = as;

  const commonProps = {
    className: `${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    style: { backgroundColor: styles.backgroundColor },
    onMouseEnter: !disabled ? (e) => e.target.style.backgroundColor = styles.hoverColor : undefined,
    onMouseLeave: !disabled ? (e) => e.target.style.backgroundColor = styles.backgroundColor : undefined,
    ...props
  };

  if (as === "button") {
    return (
      <Component
        {...commonProps}
        onClick={onClick}
        disabled={disabled}
      >
        {children}
      </Component>
    );
  }

  return (
    <Component {...commonProps}>
      {children}
    </Component>
  );
}