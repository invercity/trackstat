'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Form,
  Row,
  Table,
  ToggleButton,
} from 'react-bootstrap';
import State from '@/components/State';
import CategoryBadge from '@/components/ui/CategoryBadge';
import GenderBadge from '@/components/ui/GenderBadge';
import MarkDisplay from '@/components/ui/MarkDisplay';
import PageHeader from '@/components/ui/PageHeader';
import SchoolLink from '@/components/ui/SchoolLink';
import { auth, useFetch } from '@/lib/api';
import { formatDate, fullName } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { LeaderboardGroup, LeaderboardResponse } from '@/lib/types';

const CATEGORY_ORDER: Record<string, number> = {
  U14: 10,
  U16: 20,
  U18: 30,
  U20: 40,
  U21: 45,
  U23: 50,
  ADULT: 60,
};

const getCategoryWeight = (cat: string) => CATEGORY_ORDER[cat.toUpperCase()] ?? 500;

const getCategoryToggleVariant = (cat: string) => {
  switch (cat.toUpperCase()) {
    case 'U16':
      return 'outline-info';
    case 'U18':
      return 'outline-primary';
    case 'U20':
    case 'U21':
    case 'U23':
      return 'outline-warning';
    case 'ADULT':
      return 'outline-success';
    default:
      return 'outline-secondary';
  }
};

export default function ResultsLeaderboardPage() {
  const { t, dName } = useI18n();

  const [mode, setMode] = useState<'sb' | 'pb'>('sb');
  const [year, setYear] = useState<number | undefined>(undefined);
  const [selectedIndoor, setSelectedIndoor] = useState<'ALL' | 'outdoor' | 'indoor'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedGender, setSelectedGender] = useState<'ALL' | 'M' | 'F'>('ALL');
  const [search, setSearch] = useState<string>('');
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    setIsAdmin(!!auth.get());
  }, []);

  const queryUrl = `/results/leaderboard?mode=${mode}${mode === 'sb' && year ? `&year=${year}` : ''}${selectedIndoor !== 'ALL' ? `&indoor=${selectedIndoor}` : ''}`;
  const { data, loading, error } = useFetch<LeaderboardResponse>(queryUrl);

  const displayYear = data?.year ?? year ?? new Date().getFullYear();
  const availableYears = data?.availableYears ?? [displayYear];

  // Extract all categories present in data
  const availableCategories = useMemo(() => {
    if (!data?.groups) return [];
    const set = new Set<string>();
    data.groups.forEach((g) => {
      if (g.category) set.add(g.category);
    });
    return Array.from(set).sort((a, b) => getCategoryWeight(a) - getCategoryWeight(b));
  }, [data?.groups]);

  // Client-side filtering
  const filteredGroups = useMemo(() => {
    if (!data?.groups) return [];
    return data.groups.filter((g) => {
      if (selectedCategory !== 'ALL' && g.category !== selectedCategory) return false;
      if (selectedGender !== 'ALL' && g.gender !== selectedGender) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const dMatch = (dName(g.discipline) || '').toLowerCase().includes(q);
        const athleteMatch = g.results.some(
          (r) =>
            fullName(r.athlete).toLowerCase().includes(q) ||
            (r.athlete.club || '').toLowerCase().includes(q) ||
            (r.athlete.school?.name || '').toLowerCase().includes(q),
        );
        if (!dMatch && !athleteMatch) return false;
      }
      return true;
    });
  }, [data?.groups, selectedCategory, selectedGender, search, dName]);

  return (
    <>
      {/* Page Header */}
      <PageHeader
        icon={mode === 'sb' ? '⚡' : '🏆'}
        title={mode === 'sb' ? `${t('results.seasonBest')} ${displayYear}` : t('results.records')}
        subtitle={mode === 'sb' ? t('results.subtitleSb') : t('results.subtitlePb')}
        actions={
          <div className="d-flex align-items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin/import-web"
                className="btn btn-outline-primary btn-sm fw-semibold d-inline-flex align-items-center gap-1 shadow-sm"
              >
                <span>🌐</span>
                <span>{t('admin.importWeb')}</span>
              </Link>
            )}

            {/* Mode Switcher */}
            <ButtonGroup size="sm">
              <Button
                variant={mode === 'sb' ? 'primary' : 'outline-secondary'}
                onClick={() => setMode('sb')}
              >
                {t('results.seasonBest')}
              </Button>
              <Button
                variant={mode === 'pb' ? 'primary' : 'outline-secondary'}
                onClick={() => setMode('pb')}
              >
                {t('results.records')}
              </Button>
            </ButtonGroup>
          </div>
        }
      />

      {/* Filter Toolbar */}
      <Card className="mb-4 shadow-sm border-0 bg-white">
        <Card.Body className="py-2 px-3">
          <Row className="g-2 align-items-center">
            {/* Year Selector (only in Season Best mode) */}
            {mode === 'sb' && (
              <Col xs="auto" className="d-flex align-items-center gap-2">
                <span className="text-muted small fw-semibold">{t('results.year')}</span>
                <Form.Select
                  size="sm"
                  style={{ width: 'auto' }}
                  value={year ?? displayYear}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Form.Select>
              </Col>
            )}

            {/* Outdoor / Indoor Filter */}
            <Col xs="auto">
              <ButtonGroup size="sm">
                <ToggleButton
                  id="results-ind-all"
                  type="radio"
                  variant="outline-secondary"
                  name="results-indoor"
                  value="ALL"
                  checked={selectedIndoor === 'ALL'}
                  onChange={(e) => setSelectedIndoor(e.currentTarget.value as any)}
                >
                  {t('common.all')}
                </ToggleButton>
                <ToggleButton
                  id="results-ind-outdoor"
                  type="radio"
                  variant="outline-success"
                  name="results-indoor"
                  value="outdoor"
                  checked={selectedIndoor === 'outdoor'}
                  onChange={(e) => setSelectedIndoor(e.currentTarget.value as any)}
                >
                  {t('a.outdoor')}
                </ToggleButton>
                <ToggleButton
                  id="results-ind-indoor"
                  type="radio"
                  variant="outline-info"
                  name="results-indoor"
                  value="indoor"
                  checked={selectedIndoor === 'indoor'}
                  onChange={(e) => setSelectedIndoor(e.currentTarget.value as any)}
                >
                  {t('a.indoor')}
                </ToggleButton>
              </ButtonGroup>
            </Col>

            {/* Category Filter */}
            <Col xs="auto">
              <ButtonGroup size="sm">
                <ToggleButton
                  id="results-cat-all"
                  type="radio"
                  variant="outline-secondary"
                  name="results-category"
                  value="ALL"
                  checked={selectedCategory === 'ALL'}
                  onChange={(e) => setSelectedCategory(e.currentTarget.value)}
                >
                  {t('relays.allCategories')}
                </ToggleButton>
                {availableCategories.map((cat) => (
                  <ToggleButton
                    key={cat}
                    id={`results-cat-${cat.toLowerCase()}`}
                    type="radio"
                    variant={getCategoryToggleVariant(cat)}
                    name="results-category"
                    value={cat}
                    checked={selectedCategory === cat}
                    onChange={(e) => setSelectedCategory(e.currentTarget.value)}
                  >
                    {t(`cat.${cat}`) || cat}
                  </ToggleButton>
                ))}
              </ButtonGroup>
            </Col>

            {/* Gender Filter */}
            <Col xs="auto">
              <ButtonGroup size="sm">
                <ToggleButton
                  id="results-gen-all"
                  type="radio"
                  variant="outline-secondary"
                  name="results-gender"
                  value="ALL"
                  checked={selectedGender === 'ALL'}
                  onChange={(e) => setSelectedGender(e.currentTarget.value as any)}
                >
                  {t('relays.allGenders')}
                </ToggleButton>
                <ToggleButton
                  id="results-gen-m"
                  type="radio"
                  variant="outline-primary"
                  name="results-gender"
                  value="M"
                  checked={selectedGender === 'M'}
                  onChange={(e) => setSelectedGender(e.currentTarget.value as any)}
                >
                  {t('f.M')}
                </ToggleButton>
                <ToggleButton
                  id="results-gen-f"
                  type="radio"
                  variant="outline-danger"
                  name="results-gender"
                  value="F"
                  checked={selectedGender === 'F'}
                  onChange={(e) => setSelectedGender(e.currentTarget.value as any)}
                >
                  {t('f.F')}
                </ToggleButton>
              </ButtonGroup>
            </Col>

            {/* Search Input */}
            <Col xs={12} md className="ms-md-auto">
              <Form.Control
                size="sm"
                placeholder={`${t('common.search')} (дисципліна, спортсмен, ДЮСШ)...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Leaderboard Tables */}
      <State loading={loading} error={error} empty={filteredGroups.length === 0}>
        {filteredGroups.map((group) => {
          const cardKey = `${group.discipline._id}__${group.category}__${group.gender}`;
          return (
            <Card key={cardKey} className="mb-4 shadow-sm border-0">
              <Card.Header className="d-flex align-items-center justify-content-between py-2 bg-white border-bottom">
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <span className="fw-bold fs-6">{dName(group.discipline)}</span>
                  <CategoryBadge category={group.category} variant="colored" />
                  <GenderBadge gender={group.gender} pill />
                </div>
                <Badge bg="light" text="dark" className="border">
                  {t('results.top10')}: {group.results.length}
                </Badge>
              </Card.Header>

              <Table responsive hover className="table-fixed m-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th className="col-idx">#</th>
                    <th className="col-athlete">{t('f.athlete')}</th>
                    <th className="col-mark">{t('f.value')}</th>
                    <th className="col-rank">{t('f.rank')}</th>
                    <th className="col-wa">{t('f.waScore')}</th>
                    <th className="col-date">{t('f.date')}</th>
                    <th>{t('f.competition')}</th>
                  </tr>
                </thead>
                <tbody>
                  {group.results.map((r) => {
                    const medal =
                      r.rank === 1 ? '🥇 1' : r.rank === 2 ? '🥈 2' : r.rank === 3 ? '🥉 3' : r.rank;
                    return (
                      <tr key={r.athlete._id}>
                        <td className="fw-bold">{medal}</td>
                        <td>
                          <div>
                            <Link
                              href={`/athletes/${r.athlete._id}`}
                              className="text-decoration-none fw-semibold"
                            >
                              {fullName(r.athlete)}
                            </Link>
                            {(r.athlete.school || r.athlete.club) && (
                              <div className="small text-muted">
                                <SchoolLink
                                  school={r.athlete.school}
                                  club={r.athlete.club}
                                  withIcon={false}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="d-inline-flex align-items-center gap-1">
                            <MarkDisplay
                              value={r.value}
                              type={group.discipline.type}
                              timing={r.timing}
                              status={r.status}
                              wind={r.wind}
                            />
                            {r.indoor && (
                              <Badge bg="info" text="dark" className="fw-normal" title="У приміщенні (Indoor)">
                                i
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td>{r.sportRank ? <Badge bg="primary">{r.sportRank}</Badge> : '–'}</td>
                        <td>
                          {r.waScore !== undefined && r.waScore !== null ? (
                            <Badge bg="info" text="dark">
                              {r.waScore}
                            </Badge>
                          ) : (
                            '–'
                          )}
                        </td>
                        <td className="text-muted small">{formatDate(r.date)}</td>
                        <td>
                          <Link
                            href={`/competitions/${r.competition._id}`}
                            className="text-decoration-none small text-dark"
                          >
                            {r.competition.name}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </Card>
          );
        })}
      </State>
    </>
  );
}
