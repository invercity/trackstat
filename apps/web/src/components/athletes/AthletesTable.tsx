'use client';

import Link from 'next/link';
import { Table } from 'react-bootstrap';
import CategoryBadge from '@/components/ui/CategoryBadge';
import GenderBadge from '@/components/ui/GenderBadge';
import SchoolLink from '@/components/ui/SchoolLink';
import { formatDate, fullName } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { Athlete } from '@/lib/types';

interface AthletesTableProps {
  items: Athlete[];
  showSchool?: boolean;
  showGender?: boolean;
  sortBy?: 'lastName' | 'birthDate' | 'club';
  order?: 'asc' | 'desc';
  onSort?: (field: 'lastName' | 'birthDate' | 'club') => void;
  className?: string;
}

export default function AthletesTable({
  items,
  showSchool = true,
  showGender = false,
  sortBy,
  order = 'asc',
  onSort,
  className = 'bg-white align-middle shadow-sm',
}: AthletesTableProps) {
  const { t, dName } = useI18n();

  const sortIcon = (field: 'lastName' | 'birthDate' | 'club') => {
    if (!onSort) return null;
    if (sortBy !== field) return <span className="text-muted ms-1 opacity-25">↕</span>;
    return <span className="text-primary ms-1 fw-bold">{order === 'asc' ? '↑' : '↓'}</span>;
  };

  const getSortHeaderProps = (field: 'lastName' | 'birthDate' | 'club') => {
    if (!onSort) return {};
    return {
      className: 'sortable',
      style: { cursor: 'pointer', whiteSpace: 'nowrap' as const },
      onClick: () => onSort(field),
    };
  };

  return (
    <Table hover responsive bordered className={`table-fixed ${className}`}>
      <thead className="table-light">
        <tr>
          <th
            {...getSortHeaderProps('lastName')}
            className={`col-athlete ${onSort ? 'sortable' : ''}`}
          >
            {t('f.fullName')} {sortIcon('lastName')}
          </th>
          <th
            {...getSortHeaderProps('birthDate')}
            className={`col-date ${onSort ? 'sortable' : ''}`}
          >
            {t('f.birthDate')} {sortIcon('birthDate')}
          </th>
          <th className="col-cat">{t('f.category')}</th>
          {showGender && <th className="col-gender">{t('f.gender')}</th>}
          {showSchool && (
            <th
              {...getSortHeaderProps('club')}
              className={`col-school ${onSort ? 'sortable' : ''}`}
            >
              {t('f.school')} / {t('f.club')} {sortIcon('club')}
            </th>
          )}
          <th className="col-coach">{t('f.coach')}</th>
          <th>{t('f.mainDisciplines')}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((a) => (
          <tr key={a._id}>
            <td>
              <Link href={`/athletes/${a._id}`} className="fw-semibold text-primary text-decoration-none">
                {fullName(a)}
              </Link>
            </td>
            <td>{formatDate(a.birthDate)}</td>
            <td>
              <CategoryBadge category={a.ageCategory} />
            </td>
            {showGender && (
              <td>
                <GenderBadge gender={a.gender} />
              </td>
            )}
            {showSchool && (
              <td>
                <SchoolLink school={a.school} club={a.club} />
              </td>
            )}
            <td>{a.coaches?.join(', ') || '–'}</td>
            <td>{a.mainDisciplines?.map(dName).join(', ') || '–'}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
