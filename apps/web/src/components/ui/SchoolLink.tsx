import Link from 'next/link';
import type { School } from '@/lib/types';

interface SchoolLinkProps {
  school?: Partial<School> | null;
  club?: string | null;
  withIcon?: boolean;
  preferShortName?: boolean;
  showCity?: boolean;
  fallback?: React.ReactNode;
  className?: string;
}

export default function SchoolLink({
  school,
  club,
  withIcon = true,
  preferShortName = true,
  showCity = false,
  fallback = '–',
  className = 'text-decoration-none fw-medium text-dark',
}: SchoolLinkProps) {
  if (school && school._id) {
    const displayName = (preferShortName ? school.shortName : null) || school.name;
    return (
      <Link
        href={`/schools/${school._id}`}
        className={className}
        title={school.name}
      >
        {withIcon && <span className="me-1">🏫</span>}
        {displayName}
        {showCity && school.city && (
          <span className="text-muted small fw-normal ms-1">
            ({school.city})
          </span>
        )}
      </Link>
    );
  }

  if (club) {
    return <span className="text-muted">{club}</span>;
  }

  return <>{fallback}</>;
}
