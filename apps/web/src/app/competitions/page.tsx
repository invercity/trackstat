'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge, ButtonGroup, Form, Table, ToggleButton } from 'react-bootstrap';
import State from '@/components/State';
import PageHeader from '@/components/ui/PageHeader';
import { useFetch } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { Competition } from '@/lib/types';

export type CompLevel = 'city' | 'regional' | 'national' | 'international';

export function getCompetitionLevel(c: Competition): CompLevel {
  const l = c.level;
  if (l === 'city') return 'city';
  if (l === 'regional' || l === 'obl') return 'regional';
  if (l === 'national' || l === 'ukraine' || l === 'team_ukraine' || l === 'cup_ukraine') return 'national';
  if (
    l === 'international' ||
    l === 'europe' ||
    l === 'world' ||
    l === 'olympic' ||
    l === 'youth_olympic' ||
    l === 'universiade' ||
    l === 'euro_youth'
  ) {
    return 'international';
  }

  const name = (c.name || '').toLowerCase();
  if (
    name.includes('світ') ||
    name.includes('європ') ||
    name.includes('world') ||
    name.includes('europe') ||
    name.includes('міжнародн')
  ) {
    return 'international';
  }
  if (name.includes('україни') || name.includes('чу ') || name.includes('ч у')) return 'national';
  if (name.includes('област') || name.includes('обл')) return 'regional';
  if (name.includes('міст') || name.includes('чернігів')) return 'city';

  return 'regional';
}

function getLevelBadgeVariant(level: CompLevel): 'secondary' | 'info' | 'primary' | 'warning' {
  switch (level) {
    case 'city':
      return 'secondary';
    case 'regional':
      return 'info';
    case 'national':
      return 'primary';
    case 'international':
      return 'warning';
  }
}

function formatMonth(dateStr: string, lang: string): string {
  const d = new Date(dateStr);
  const monthName = d.toLocaleDateString(lang === 'uk' ? 'uk-UA' : 'en-US', {
    month: 'long',
  });
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

function getMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export default function CompetitionsPage() {
  const { t, lang } = useI18n();
  const { data, loading, error } = useFetch<Competition[]>('/competitions');

  const [selectedLevel, setSelectedLevel] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('2026');

  // Dynamically aggregate years from existing competitions (манеж + стадіон)
  const availableYears = useMemo(() => {
    if (!data || data.length === 0) return [2026];
    const set = new Set<number>();
    for (const c of data) {
      const yr = c.season?.year || (c.date ? new Date(c.date).getFullYear() : null);
      if (yr) set.add(yr);
    }
    const arr = Array.from(set).sort((a, b) => b - a);
    return arr.length > 0 ? arr : [2026];
  }, [data]);

  // Synchronize selected year with available list
  useEffect(() => {
    if (availableYears.length > 0 && !availableYears.includes(Number(selectedYear))) {
      setSelectedYear(String(availableYears[0]));
    }
  }, [availableYears, selectedYear]);

  // Filter competitions by level and selected year
  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((c) => {
      const level = getCompetitionLevel(c);
      if (selectedLevel !== 'ALL' && level !== selectedLevel) return false;
      const compYear = c.season?.year ?? (c.date ? new Date(c.date).getFullYear() : null);
      if (selectedYear && compYear !== Number(selectedYear)) return false;
      return true;
    });
  }, [data, selectedLevel, selectedYear]);

  // Group filtered competitions by month (just the month name)
  const groupedByMonth = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const groupMap = new Map<string, Competition[]>();

    for (const c of sorted) {
      const key = getMonthKey(c.date);
      if (!groupMap.has(key)) {
        groupMap.set(key, []);
      }
      groupMap.get(key)!.push(c);
    }

    const groups: { monthKey: string; monthLabel: string; items: Competition[] }[] = [];
    const sortedKeys = Array.from(groupMap.keys()).sort().reverse();
    for (const key of sortedKeys) {
      const items = groupMap.get(key)!;
      groups.push({
        monthKey: key,
        monthLabel: formatMonth(items[0].date, lang),
        items,
      });
    }

    return groups;
  }, [filtered, lang]);

  const pageTitle = `${t('competitions.seasonTitle')} ${selectedYear}`;

  return (
    <>
      {/* Page Title & Filter Controls */}
      <PageHeader
        icon="📅"
        title={pageTitle}
        subtitle={`${filtered.length} ${filtered.length === 1 ? 'змагання' : 'змагань'}`}
        actions={
          <div className="d-flex flex-wrap gap-3 align-items-center">
          {/* Year Combobox */}
          <div className="d-flex align-items-center gap-2">
            <label htmlFor="comp-year-select" className="small text-muted fw-semibold text-nowrap mb-0">
              Рік:
            </label>
            <Form.Select
              id="comp-year-select"
              size="sm"
              style={{ width: 'auto', minWidth: '110px' }}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="fw-semibold bg-white shadow-sm"
              aria-label="Оберіть рік змагань"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  {yr}
                </option>
              ))}
            </Form.Select>
          </div>

          {/* Level Filter */}
          <div className="d-flex align-items-center gap-1 flex-wrap" style={{ maxWidth: '100%' }}>
            <ButtonGroup size="sm" className="d-none d-md-inline-flex">
              <ToggleButton
                id="level-all"
                type="radio"
                variant="outline-secondary"
                name="level"
                value="ALL"
                checked={selectedLevel === 'ALL'}
                onChange={(e) => setSelectedLevel(e.currentTarget.value)}
              >
                {t('level.all')}
              </ToggleButton>
              <ToggleButton
                id="level-city"
                type="radio"
                variant="outline-secondary"
                name="level"
                value="city"
                checked={selectedLevel === 'city'}
                onChange={(e) => setSelectedLevel(e.currentTarget.value)}
              >
                {t('level.city')}
              </ToggleButton>
              <ToggleButton
                id="level-reg"
                type="radio"
                variant="outline-info"
                name="level"
                value="regional"
                checked={selectedLevel === 'regional'}
                onChange={(e) => setSelectedLevel(e.currentTarget.value)}
              >
                {t('level.regional')}
              </ToggleButton>
              <ToggleButton
                id="level-nat"
                type="radio"
                variant="outline-primary"
                name="level"
                value="national"
                checked={selectedLevel === 'national'}
                onChange={(e) => setSelectedLevel(e.currentTarget.value)}
              >
                {t('level.national')}
              </ToggleButton>
              <ToggleButton
                id="level-intl"
                type="radio"
                variant="outline-warning"
                name="level"
                value="international"
                checked={selectedLevel === 'international'}
                onChange={(e) => setSelectedLevel(e.currentTarget.value)}
              >
                {t('level.international')}
              </ToggleButton>
            </ButtonGroup>
            <div className="d-flex d-md-none flex-wrap gap-1">
              <ToggleButton
                id="m-level-all"
                type="radio"
                variant={selectedLevel === 'ALL' ? 'secondary' : 'outline-secondary'}
                name="m-level"
                value="ALL"
                checked={selectedLevel === 'ALL'}
                onChange={(e) => setSelectedLevel(e.currentTarget.value)}
                size="sm"
                className="rounded-pill px-2"
              >
                {t('level.all')}
              </ToggleButton>
              <ToggleButton
                id="m-level-city"
                type="radio"
                variant={selectedLevel === 'city' ? 'secondary' : 'outline-secondary'}
                name="m-level"
                value="city"
                checked={selectedLevel === 'city'}
                onChange={(e) => setSelectedLevel(e.currentTarget.value)}
                size="sm"
                className="rounded-pill px-2"
              >
                {t('level.city')}
              </ToggleButton>
              <ToggleButton
                id="m-level-reg"
                type="radio"
                variant={selectedLevel === 'regional' ? 'info' : 'outline-info'}
                name="m-level"
                value="regional"
                checked={selectedLevel === 'regional'}
                onChange={(e) => setSelectedLevel(e.currentTarget.value)}
                size="sm"
                className="rounded-pill px-2"
              >
                {t('level.regional')}
              </ToggleButton>
              <ToggleButton
                id="m-level-nat"
                type="radio"
                variant={selectedLevel === 'national' ? 'primary' : 'outline-primary'}
                name="m-level"
                value="national"
                checked={selectedLevel === 'national'}
                onChange={(e) => setSelectedLevel(e.currentTarget.value)}
                size="sm"
                className="rounded-pill px-2"
              >
                {t('level.national')}
              </ToggleButton>
              <ToggleButton
                id="m-level-intl"
                type="radio"
                variant={selectedLevel === 'international' ? 'warning' : 'outline-warning'}
                name="m-level"
                value="international"
                checked={selectedLevel === 'international'}
                onChange={(e) => setSelectedLevel(e.currentTarget.value)}
                size="sm"
                className="rounded-pill px-2"
              >
                {t('level.international')}
              </ToggleButton>
            </div>
          </div>
        </div>
      }
    />

      <State loading={loading} error={error} empty={filtered.length === 0}>
        <div className="d-flex flex-column gap-4" style={{ minWidth: 0, maxWidth: '100%' }}>
          {groupedByMonth.map((group) => (
            <div key={group.monthKey} style={{ minWidth: 0, maxWidth: '100%' }}>
              <div className="d-flex align-items-center gap-2 mb-2">
                <h5 className="mb-0 text-primary fw-semibold">📅 {group.monthLabel}</h5>
                <Badge bg="secondary" pill style={{ fontSize: '0.75rem' }}>
                  {group.items.length}
                </Badge>
              </div>
              <Table hover responsive bordered className="bg-white align-middle shadow-sm mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '130px' }}>{t('f.date')}</th>
                    <th>{t('f.name')}</th>
                    <th style={{ width: '140px' }}>{t('f.competitionLevel')}</th>
                    <th>{t('f.location')}</th>
                    <th style={{ width: '110px' }}>{t('f.season')}</th>
                    <th>{t('f.ageCategories')}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((c) => {
                    const level = getCompetitionLevel(c);
                    const variant = getLevelBadgeVariant(level);
                    return (
                      <tr key={c._id}>
                        <td>{formatDate(c.date)}</td>
                        <td>
                          <Link href={`/competitions/${c._id}`} className="fw-medium text-decoration-none">
                            {c.name}
                          </Link>
                        </td>
                        <td>
                          <Badge
                            bg={variant}
                            className={variant === 'info' || variant === 'warning' ? 'text-dark' : ''}
                            style={{ fontSize: '0.75rem' }}
                          >
                            {t(`level.${level}`)}
                          </Badge>
                        </td>
                        <td>{c.location}</td>
                        <td>{c.season?.label}</td>
                        <td>
                          {c.ageCategories.length
                            ? c.ageCategories.map((x) => (
                                <Badge key={x} bg="secondary" className="me-1">
                                  {t(`cat.${x}`)}
                                </Badge>
                              ))
                            : t('common.all')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          ))}
        </div>
      </State>
    </>
  );
}
