'use client';

import type { ReactNode } from 'react';

export interface PageHeaderProps {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export default function PageHeader({
  icon,
  title,
  subtitle,
  badge,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4 ${className}`}
    >
      <div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          {icon && (
            <span
              className="page-header-icon fs-3 lh-1 d-inline-flex align-items-center justify-content-center"
              aria-hidden="true"
              style={{ minWidth: '32px' }}
            >
              {icon}
            </span>
          )}
          <h1 className="h3 mb-0 fw-bold d-inline-flex align-items-center gap-2 flex-wrap">
            <span>{title}</span>
            {badge && <span>{badge}</span>}
          </h1>
        </div>
        {subtitle && (
          <div className="text-muted small mt-1 page-header-subtitle">
            {subtitle}
          </div>
        )}
      </div>

      {actions && (
        <div className="d-flex align-items-center gap-2 flex-wrap ms-md-auto">
          {actions}
        </div>
      )}
    </div>
  );
}
