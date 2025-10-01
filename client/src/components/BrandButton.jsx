// src/components/BrandButton.jsx
import React, { forwardRef } from 'react';
import { Link } from 'react-router-dom';

const BrandButton = forwardRef(function BrandButton(
  {
    to,
    href,
    onClick,
    type = 'button',
    variant = 'solid', // 'solid' | 'outline' | 'ghost' | 'danger'
    size = 'md', // 'sm' | 'md' | 'lg'
    block = false,
    disabled = false,
    className = '',
    leftIcon,
    rightIcon,
    target,
    rel,
    children,
    ...rest
  },
  ref
) {
  const classes = [
    'brand-btn',
    `brand-btn--${variant}`,
    `brand-btn--${size}`,
    block ? 'brand-btn--block' : '',
    disabled ? 'is-disabled' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = (e) => {
    if (disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    onClick?.(e);
  };

  if (to) {
    return (
      <Link
        ref={ref}
        to={to}
        className={classes}
        aria-disabled={disabled || undefined}
        onClick={handleClick}
        {...rest}
      >
        {leftIcon && <span className="brand-btn__icon">{leftIcon}</span>}
        <span className="brand-btn__label">{children}</span>
        {rightIcon && <span className="brand-btn__icon">{rightIcon}</span>}
      </Link>
    );
  }

  if (href) {
    const safeRel = target === '_blank' ? (rel ?? 'noopener noreferrer') : rel;
    return (
      <a
        ref={ref}
        href={href}
        className={classes}
        target={target}
        rel={safeRel}
        aria-disabled={disabled || undefined}
        onClick={handleClick}
        {...rest}
      >
        {leftIcon && <span className="brand-btn__icon">{leftIcon}</span>}
        <span className="brand-btn__label">{children}</span>
        {rightIcon && <span className="brand-btn__icon">{rightIcon}</span>}
      </a>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
      {...rest}
    >
      {leftIcon && <span className="brand-btn__icon">{leftIcon}</span>}
      <span className="brand-btn__label">{children}</span>
      {rightIcon && <span className="brand-btn__icon">{rightIcon}</span>}
    </button>
  );
});

BrandButton.displayName = 'BrandButton'; // ✅ appease react/display-name

export default BrandButton;
