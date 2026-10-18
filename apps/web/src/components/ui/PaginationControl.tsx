'use client';

import { Pagination } from 'react-bootstrap';
import { useI18n } from '@/lib/i18n';

interface PaginationControlProps {
  page: number;
  totalPages: number;
  total?: number;
  from?: number;
  to?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function PaginationControl({
  page,
  totalPages,
  total,
  from,
  to,
  onPageChange,
  className = 'd-flex justify-content-between align-items-center mt-3 flex-wrap gap-2',
}: PaginationControlProps) {
  const { t } = useI18n();

  if (totalPages <= 1) return null;

  const pageNumbers: number[] = [];
  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);
  for (let p = startPage; p <= endPage; p++) {
    pageNumbers.push(p);
  }

  return (
    <div className={className}>
      {total !== undefined && from !== undefined && to !== undefined && (
        <span className="text-muted small">
          {t('p.showing')} {from}–{to} {t('p.of')} {total}
        </span>
      )}
      <Pagination className="m-0">
        <Pagination.First disabled={page <= 1} onClick={() => onPageChange(1)} />
        <Pagination.Prev
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        />
        {startPage > 1 && (
          <>
            <Pagination.Item onClick={() => onPageChange(1)}>1</Pagination.Item>
            {startPage > 2 && <Pagination.Ellipsis disabled />}
          </>
        )}
        {pageNumbers.map((p) => (
          <Pagination.Item
            key={p}
            active={p === page}
            onClick={() => onPageChange(p)}
          >
            {p}
          </Pagination.Item>
        ))}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <Pagination.Ellipsis disabled />}
            <Pagination.Item onClick={() => onPageChange(totalPages)}>
              {totalPages}
            </Pagination.Item>
          </>
        )}
        <Pagination.Next
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        />
        <Pagination.Last
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
        />
      </Pagination>
    </div>
  );
}
