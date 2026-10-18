'use client';

import { Badge } from 'react-bootstrap';
import { useI18n } from '@/lib/i18n';

interface CategoryBadgeProps {
  category: string;
  variant?: 'colored' | 'secondary';
  className?: string;
}

export default function CategoryBadge({
  category,
  variant = 'secondary',
  className = '',
}: CategoryBadgeProps) {
  const { t } = useI18n();

  const getVariant = (cat: string) => {
    if (variant === 'secondary') return 'secondary';
    switch (cat.toUpperCase()) {
      case 'U16':
        return 'info';
      case 'U18':
        return 'primary';
      case 'U20':
      case 'U21':
      case 'U23':
        return 'warning';
      case 'ADULT':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const label = t(`cat.${category}`) || category;

  return (
    <Badge bg={getVariant(category)} className={className}>
      {label}
    </Badge>
  );
}
