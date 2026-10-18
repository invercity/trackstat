'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { Alert, Badge, Button, Form } from 'react-bootstrap';
import AthletesTable from '@/components/athletes/AthletesTable';
import State from '@/components/State';
import PaginationControl from '@/components/ui/PaginationControl';
import { useFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { PaginatedAthletes, School } from '@/lib/types';

function AthletesListContent() {
  const { t, lang } = useI18n();
  const searchParams = useSearchParams();
  const urlSchoolId = searchParams.get('schoolId') || '';

  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>(urlSchoolId);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'lastName' | 'birthDate' | 'club'>('lastName');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch list of schools for filter dropdown
  const { data: schools } = useFetch<School[]>('/schools');

  // Synchronize when URL schoolId changes
  useEffect(() => {
    setSelectedSchoolId(urlSchoolId);
  }, [urlSchoolId]);

  // Debounce for search
  useEffect(() => {
    const id = setTimeout(() => {
      setQ(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [search]);

  // Request URL with pagination, language sort, search, and schoolId
  const queryParts = [
    `page=${page}`,
    'limit=20',
    `sortBy=${sortBy}`,
    `order=${order}`,
    `lang=${lang}`,
    `search=${encodeURIComponent(q)}`,
  ];
  if (selectedSchoolId) {
    queryParts.push(`schoolId=${encodeURIComponent(selectedSchoolId)}`);
  }

  const url = `/athletes?${queryParts.join('&')}`;
  const { data, loading, error } = useFetch<PaginatedAthletes>(url);

  const toggleSort = (field: 'lastName' | 'birthDate' | 'club') => {
    if (sortBy === field) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setOrder('asc');
    }
    setPage(1);
  };

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const from = total === 0 ? 0 : (page - 1) * 20 + 1;
  const to = Math.min(page * 20, total);

  const currentSchool = useMemo(() => {
    if (!selectedSchoolId || !schools) return null;
    return schools.find((s) => s._id === selectedSchoolId) || null;
  }, [selectedSchoolId, schools]);

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
        <div>
          <h1 className="h3 m-0">{t('nav.athletes')}</h1>
          {total > 0 && (
            <small className="text-muted">
              {t('p.showing')} {from}–{to} {t('p.of')} {total}
            </small>
          )}
        </div>
        <div className="d-flex flex-wrap gap-2" style={{ maxWidth: 620, width: '100%' }}>
          <Form.Select
            style={{ maxWidth: 280 }}
            value={selectedSchoolId}
            onChange={(e) => {
              setSelectedSchoolId(e.target.value);
              setPage(1);
            }}
          >
            <option value="">{t('school.allSchools')}</option>
            {schools?.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} {s.athleteCount !== undefined ? `(${s.athleteCount})` : ''}
              </option>
            ))}
          </Form.Select>
          <Form.Control
            style={{ minWidth: 200, flex: 1 }}
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {currentSchool && (
        <Alert variant="info" className="d-flex flex-wrap justify-content-between align-items-center py-2 px-3 mb-3 gap-2 shadow-sm">
          <div>
            <span className="me-2">
              🏫 <strong>{currentSchool.name}</strong>
            </span>
            {currentSchool.city && (
              <Badge bg="light" text="dark" className="me-2">
                {currentSchool.city}
              </Badge>
            )}
            <small className="text-muted">
              ({total} {t('school.athletesCount')})
            </small>
          </div>
          <div className="d-flex gap-2">
            <Link href={`/schools/${currentSchool._id}`} className="btn btn-sm btn-outline-primary">
              {t('school.viewSchool')} →
            </Link>
            <Button
              size="sm"
              variant="outline-secondary"
              onClick={() => {
                setSelectedSchoolId('');
                setPage(1);
              }}
            >
              ✕ {t('common.all')}
            </Button>
          </div>
        </Alert>
      )}

      <State loading={loading && !data} error={error} empty={!!data && data.items.length === 0}>
        <AthletesTable
          items={data?.items || []}
          showSchool={true}
          sortBy={sortBy}
          order={order}
          onSort={toggleSort}
        />

        <PaginationControl
          page={page}
          totalPages={totalPages}
          total={total}
          from={from}
          to={to}
          onPageChange={setPage}
        />
      </State>
    </>
  );
}

export default function AthletesPage() {
  return (
    <Suspense fallback={<div className="text-muted py-4">Завантаження…</div>}>
      <AthletesListContent />
    </Suspense>
  );
}
