'use client';
import type { ReactNode } from 'react';
import { Alert, Spinner } from 'react-bootstrap';
import { useI18n } from '@/lib/i18n';

/** Показує спінер/помилку/порожній стан, інакше — вміст */
export default function State({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty?: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  if (loading) return <Spinner animation="border" size="sm" />;
  if (error) return <Alert variant="danger">{error}</Alert>;
  if (empty) return <p className="text-muted">{t('common.empty')}</p>;
  return <>{children}</>;
}
