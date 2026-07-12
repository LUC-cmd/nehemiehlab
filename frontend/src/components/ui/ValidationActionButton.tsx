import React from 'react';
import { motion } from 'framer-motion';
import { Loader2, type LucideIcon } from 'lucide-react';

export type ValidationButtonVariant = 'success' | 'danger' | 'primary' | 'warning' | 'sky' | 'violet';

const styles: Record<ValidationButtonVariant, string> = {
  success:
    'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/40 hover:shadow-emerald-500/50',
  danger:
    'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-400/40 hover:shadow-rose-500/50',
  primary:
    'bg-gradient-to-r from-[#004b57] to-teal-600 text-white shadow-lg shadow-teal-900/30 ring-2 ring-teal-400/35 hover:shadow-teal-600/40',
  warning:
    'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 shadow-lg shadow-amber-500/35 ring-2 ring-amber-300/50',
  sky:
    'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/30 ring-2 ring-sky-400/40',
  violet:
    'bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 ring-2 ring-violet-400/40',
};

type Props = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  variant?: ValidationButtonVariant;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
  title?: string;
};

export default function ValidationActionButton({
  children,
  onClick,
  type = 'button',
  disabled,
  loading,
  variant = 'primary',
  icon: Icon,
  size = 'md',
  fullWidth,
  className = '',
  title,
}: Props) {
  const sizeClass =
    size === 'sm'
      ? 'px-3 py-2 text-xs gap-1.5 rounded-xl'
      : size === 'lg'
        ? 'px-6 py-3.5 text-base gap-2.5 rounded-2xl'
        : 'px-4 py-2.5 text-sm gap-2 rounded-xl';

  return (
    <motion.button
      type={type}
      title={title}
      disabled={disabled || loading}
      onClick={onClick}
      whileHover={disabled || loading ? undefined : { scale: 1.03, y: -1 }}
      whileTap={disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22 }}
      className={`relative inline-flex items-center justify-center font-bold tracking-wide transition-all duration-300 overflow-hidden ${sizeClass} ${styles[variant]} ${fullWidth ? 'w-full' : ''} disabled:opacity-55 disabled:cursor-not-allowed disabled:shadow-none ${className}`}
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/25 to-white/0 -skew-x-12"
        initial={{ x: '-120%' }}
        whileHover={{ x: '120%' }}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
      />
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className={`${size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} shrink-0`} />
      ) : null}
      <span className="relative z-[1]">{children}</span>
    </motion.button>
  );
}
