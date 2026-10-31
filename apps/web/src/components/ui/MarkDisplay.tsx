'use client';

import { Badge } from 'react-bootstrap';
import { formatValue } from '@/lib/format';

interface MarkDisplayProps {
  value?: number | string | null;
  type?: any;
  timing?: 'manual' | 'electronic' | string | null;
  status?: string;
  wind?: number | null;
  rank?: string | null;
  waScore?: number | null;
  rankVariant?: string;
  showWaTag?: boolean;
  className?: string;
}

export default function MarkDisplay({
  value,
  type = 'time',
  timing,
  status = 'OK',
  wind,
  rank,
  waScore,
  rankVariant = 'primary',
  showWaTag = false,
  className = '',
}: MarkDisplayProps) {
  if (value === undefined || value === null) {
    if (status && status !== 'OK') {
      return <strong className={className}>{status}</strong>;
    }
    return <span className="text-muted">–</span>;
  }

  const isOk = !status || status === 'OK';
  let displayValue: string = status;
  if (isOk) {
    if (typeof value === 'number') {
      displayValue = formatValue(value, type, timing as any);
    } else {
      displayValue = String(value);
    }
  }

  return (
    <span className={`d-inline-flex align-items-center gap-1 flex-wrap ${className}`}>
      <strong>{displayValue}</strong>
      {wind !== undefined && wind !== null && (
        <small className="text-muted">
          ({wind > 0 ? '+' : ''}
          {wind})
        </small>
      )}
      {rank && (
        <Badge bg={rankVariant} style={{ fontSize: '0.75rem' }}>
          {rank}
        </Badge>
      )}
      {waScore !== undefined && waScore !== null && (
        <small className="text-muted" title="Очки World Athletics">
          {waScore}
          {showWaTag ? ' WA' : ''}
        </small>
      )}
    </span>
  );
}
