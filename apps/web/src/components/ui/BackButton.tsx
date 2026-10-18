'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';

interface BackButtonProps {
  href: string;
  label?: string;
  className?: string;
  variant?: 'outline-primary' | 'outline-secondary' | 'link';
}

export default function BackButton({
  href,
  label,
  className = 'mb-3',
  variant = 'outline-primary',
}: BackButtonProps) {
  const { t } = useI18n();
  // Strip any leading arrows/whitespace to avoid duplicate arrows (e.g. "← ←")
  const rawText = (label ?? t('common.back')).replace(/^[←\s]+/, '').trim();
  const displayText = `← ${rawText}`;

  const variantClass =
    variant === 'outline-secondary'
      ? 'btn btn-outline-secondary btn-sm text-primary'
      : variant === 'link'
      ? 'btn btn-link text-primary text-decoration-none p-0'
      : 'btn btn-outline-primary btn-sm';

  return (
    <Link
      href={href}
      className={`${variantClass} d-inline-flex align-items-center gap-1 ${className}`}
    >
      <span>{displayText}</span>
    </Link>
  );
}
