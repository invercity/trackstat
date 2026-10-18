'use client';

import { Badge } from 'react-bootstrap';
import { useI18n } from '@/lib/i18n';

interface GenderBadgeProps {
  gender: 'M' | 'F' | string;
  variant?: 'primary' | 'info';
  className?: string;
  pill?: boolean;
}

export default function GenderBadge({
  gender,
  variant = 'info',
  className = '',
  pill = false,
}: GenderBadgeProps) {
  const { t } = useI18n();

  const isMale = gender === 'M';
  const bg = isMale ? (variant === 'info' ? 'info' : 'primary') : 'danger';
  const label = t(`f.${gender}`) || gender;

  return (
    <Badge bg={bg} text="white" pill={pill} className={className}>
      {label}
    </Badge>
  );
}
