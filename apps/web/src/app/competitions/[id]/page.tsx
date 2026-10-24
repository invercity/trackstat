'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Button, ButtonGroup, Card, Table, ToggleButton } from 'react-bootstrap';
import State from '@/components/State';
import BackButton from '@/components/ui/BackButton';
import CategoryBadge from '@/components/ui/CategoryBadge';
import MarkDisplay from '@/components/ui/MarkDisplay';
import PageHeader from '@/components/ui/PageHeader';
import SchoolLink from '@/components/ui/SchoolLink';
import { useFetch } from '@/lib/api';
import { compareResults, formatDate, fullName } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { Competition, Discipline, Result } from '@/lib/types';

const CATEGORY_ORDER: Record<string, number> = {
  U14: 10,
  U16: 20,
  U18: 30,
  U20: 40,
  U21: 45,
  U23: 50,
  ADULT: 60,
  SENIOR: 70,
  MASTERS: 80,
};

const getCategoryWeight = (cat?: string) => {
  if (!cat) return 999;
  return CATEGORY_ORDER[cat.toUpperCase()] ?? 500;
};

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

const formatRound = (round?: string | null) => {
  if (!round) return '';
  const r = round.trim().toLowerCase();
  if (r === 'фінал' || r === 'final') return 'Фінал';
  if (r === 'забіг' || r === 'забіги' || r === 'heat' || r === 'heats') return 'Забіги';
  if (r === 'півфінал' || r === 'semifinal') return 'Півфінал';
  if (r === 'квал.' || r === 'кваліфікація' || r === 'qualification') return 'Кваліфікація';
  return round.charAt(0).toUpperCase() + round.slice(1);
};

const getRoundWeight = (round?: string | null) => {
  if (!round) return 100;
  const r = round.trim().toLowerCase();
  if (r.includes('забіг') || r.includes('heat')) return 10;
  if (r.includes('квал') || r.includes('qual')) return 20;
  if (r.includes('півфінал') || r.includes('1/2') || r.includes('semi')) return 30;
  if (r.includes('фінал') || r.includes('final')) return 40;
  return 50;
};

const getResultGender = (r: Result): 'M' | 'F' | 'OTHER' => {
  if (r.athlete?.gender === 'M' || r.athlete?.gender === 'F') return r.athlete.gender;
  const lower = (r.notes || r.teamName || '').toLowerCase();
  if (lower.includes('жінк') || lower.includes('дівч') || lower.includes('women')) return 'F';
  if (lower.includes('чолов') || lower.includes('юнак') || lower.includes('men')) return 'M';
  return 'OTHER';
};

const rank = (a: Result, b: Result) => {
  if (a.status !== b.status) return a.status === 'OK' ? -1 : 1;
  if (a.place && b.place && a.place !== b.place) return a.place - b.place;
  return compareResults(a, b, a.discipline?.type || 'time');
};

export default function CompetitionPage() {
  const { id } = useParams<{ id: string }>();
  const { t, dName } = useI18n();
  const comp = useFetch<Competition>(`/competitions/${id}`);
  const results = useFetch<Result[]>(`/results?competitionId=${id}`);
  const c = comp.data;

  const [viewMode, setViewMode] = useState<'categories' | 'absolute'>('categories');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedGender, setSelectedGender] = useState<'ALL' | 'M' | 'F'>('ALL');

  // Available categories in results
  const availableCategories = useMemo(() => {
    if (!results.data) return [];
    const set = new Set<string>();
    results.data.forEach((r) => {
      if (r.ageCategory) set.add(r.ageCategory);
    });
    return Array.from(set).sort((a, b) => getCategoryWeight(a) - getCategoryWeight(b));
  }, [results.data]);

  // Grouped by discipline, gender AND round (Absolute view)
  const byDiscipline = useMemo(() => {
    if (!results.data) return [];
    const map = new Map<string, { key: string; d: Discipline; gender: 'M' | 'F' | 'OTHER'; round?: string | null; list: Result[] }>();
    results.data.forEach((r) => {
      const gender = getResultGender(r);
      const roundKey = r.round?.trim().toLowerCase() || '';
      const key = `${r.discipline._id}__${gender}__${roundKey}`;
      const g = map.get(key) ?? { key, d: r.discipline, gender, round: r.round, list: [] };
      g.list.push(r);
      map.set(key, g);
    });
    const groups = Array.from(map.values());
    groups.sort((a, b) => {
      const nameComp = (dName(a.d) || '').localeCompare(dName(b.d) || '');
      if (nameComp !== 0) return nameComp;
      const gWeight = (g: string) => (g === 'M' ? 1 : g === 'F' ? 2 : 3);
      const genComp = gWeight(a.gender) - gWeight(b.gender);
      if (genComp !== 0) return genComp;
      return getRoundWeight(a.round) - getRoundWeight(b.round);
    });
    return groups;
  }, [results.data, dName]);

  // Grouped by discipline, gender, category AND round (Category view)
  const byDisciplineAndCategory = useMemo(() => {
    if (!results.data) return [];
    const map = new Map<string, { key: string; d: Discipline; gender: 'M' | 'F' | 'OTHER'; category: string; round?: string | null; list: Result[] }>();

    results.data.forEach((r) => {
      const gender = getResultGender(r);
      const cat = r.ageCategory || 'OTHER';
      const roundKey = r.round?.trim().toLowerCase() || '';
      const key = `${r.discipline._id}__${gender}__${cat}__${roundKey}`;
      const g = map.get(key) ?? { key, d: r.discipline, gender, category: cat, round: r.round, list: [] };
      g.list.push(r);
      map.set(key, g);
    });

    const groups = Array.from(map.values());

    // Sort by discipline name, then by gender (M then F), then by category order, then by round (heats first, finals second)
    groups.sort((a, b) => {
      const nameComp = (dName(a.d) || '').localeCompare(dName(b.d) || '');
      if (nameComp !== 0) return nameComp;
      const gWeight = (g: string) => (g === 'M' ? 1 : g === 'F' ? 2 : 3);
      const genComp = gWeight(a.gender) - gWeight(b.gender);
      if (genComp !== 0) return genComp;
      const catComp = getCategoryWeight(a.category) - getCategoryWeight(b.category);
      if (catComp !== 0) return catComp;
      return getRoundWeight(a.round) - getRoundWeight(b.round);
    });

    return groups;
  }, [results.data, dName]);

  const displayedCategoryGroups = useMemo(() => {
    return byDisciplineAndCategory.filter((g) => {
      if (selectedGender !== 'ALL' && g.gender !== selectedGender) return false;
      if (selectedCategory !== 'ALL' && g.category !== selectedCategory) return false;
      return true;
    });
  }, [byDisciplineAndCategory, selectedGender, selectedCategory]);

  const displayedAbsoluteGroups = useMemo(() => {
    return byDiscipline.filter((g) => {
      if (selectedGender !== 'ALL' && g.gender !== selectedGender) return false;
      return true;
    });
  }, [byDiscipline, selectedGender]);

  return (
    <>
      <BackButton href="/competitions" />
      <State loading={comp.loading} error={comp.error}>
        {c && (
          <>
            <PageHeader
              icon="📅"
              title={c.name}
              subtitle={
                <div className="d-flex align-items-center gap-1 flex-wrap">
                  <span>{formatDate(c.date)}</span>
                  {c.endDate && <span>– {formatDate(c.endDate)}</span>}
                  {c.location && <span>· {c.location}</span>}
                  {c.season?.label && <span>· {c.season.label}</span>}
                  {c.ageCategories.map((x) => (
                    <CategoryBadge key={x} category={x} className="ms-1" />
                  ))}
                </div>
              }
            />

            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mt-4 mb-3 border-bottom pb-2">
              <h2 className="h5 mb-0">{t('c.results')}</h2>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <ButtonGroup size="sm">
                  <ToggleButton
                    id="comp-gen-all"
                    type="radio"
                    variant="outline-secondary"
                    name="comp-gender"
                    value="ALL"
                    checked={selectedGender === 'ALL'}
                    onChange={(e) => setSelectedGender(e.currentTarget.value as 'ALL' | 'M' | 'F')}
                  >
                    Всі статі
                  </ToggleButton>
                  <ToggleButton
                    id="comp-gen-m"
                    type="radio"
                    variant="outline-primary"
                    name="comp-gender"
                    value="M"
                    checked={selectedGender === 'M'}
                    onChange={(e) => setSelectedGender(e.currentTarget.value as 'ALL' | 'M' | 'F')}
                  >
                    Чоловіки
                  </ToggleButton>
                  <ToggleButton
                    id="comp-gen-f"
                    type="radio"
                    variant="outline-danger"
                    name="comp-gender"
                    value="F"
                    checked={selectedGender === 'F'}
                    onChange={(e) => setSelectedGender(e.currentTarget.value as 'ALL' | 'M' | 'F')}
                  >
                    Жінки
                  </ToggleButton>
                </ButtonGroup>
                <ButtonGroup size="sm">
                  <Button
                    variant={viewMode === 'categories' ? 'primary' : 'outline-secondary'}
                    onClick={() => setViewMode('categories')}
                  >
                    🏷️ {t('c.viewCategories')}
                  </Button>
                  <Button
                    variant={viewMode === 'absolute' ? 'primary' : 'outline-secondary'}
                    onClick={() => setViewMode('absolute')}
                  >
                    ⚡ {t('c.viewAbsolute')}
                  </Button>
                </ButtonGroup>
              </div>
            </div>

            {viewMode === 'categories' && availableCategories.length > 1 && (
              <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
                <ButtonGroup size="sm">
                  <ToggleButton
                    id="comp-cat-all"
                    type="radio"
                    variant="outline-secondary"
                    name="comp-category"
                    value="ALL"
                    checked={selectedCategory === 'ALL'}
                    onChange={(e) => setSelectedCategory(e.currentTarget.value)}
                  >
                    {t('relays.allCategories')}
                  </ToggleButton>
                  {availableCategories.map((cat) => (
                    <ToggleButton
                      key={cat}
                      id={`comp-cat-${cat.toLowerCase()}`}
                      type="radio"
                      variant={getCategoryToggleVariant(cat)}
                      name="comp-category"
                      value={cat}
                      checked={selectedCategory === cat}
                      onChange={(e) => setSelectedCategory(e.currentTarget.value)}
                    >
                      {t(`cat.${cat}`) || cat}
                    </ToggleButton>
                  ))}
                </ButtonGroup>
              </div>
            )}

            <State
              loading={results.loading}
              error={results.error}
              empty={viewMode === 'categories' ? displayedCategoryGroups.length === 0 : displayedAbsoluteGroups.length === 0}
            >
              {viewMode === 'categories' ? (
                displayedCategoryGroups.map(({ key, d, gender, category, round, list }) => (
                  <Card key={key} className="mb-3">
                    <Card.Header className="d-flex align-items-center justify-content-between py-2">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="fw-bold">{dName(d)}</span>
                        {gender === 'M' && <Badge bg="primary">Чоловіки</Badge>}
                        {gender === 'F' && <Badge bg="danger">Жінки</Badge>}
                        {category !== 'OTHER' && (
                          <CategoryBadge category={category} variant="colored" />
                        )}
                        {round && (
                          <Badge bg={round.toLowerCase().includes('фінал') && !round.toLowerCase().includes('1/2') ? 'danger' : 'info'}>
                            {formatRound(round)}
                          </Badge>
                        )}
                      </div>
                      <Badge bg="light" text="dark" className="border">
                        {list.length} {t('school.athletesCount')}
                      </Badge>
                    </Card.Header>
                    <Table responsive className="m-0 align-middle">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{t('f.athlete')}</th>
                          <th>{t('f.value')}</th>
                          <th>{t('f.rank')}</th>
                          <th>{t('f.waScore')}</th>
                          <th>{t('f.teamPoints')}</th>
                          <th>{t('f.round')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...list].sort(rank).map((r, i) => (
                          <tr key={r._id}>
                            <td>{r.place ?? i + 1}</td>
                            <td>
                              {r.athlete ? (
                                <div>
                                  <Link href={`/athletes/${r.athlete._id}`} className="text-decoration-none fw-semibold">
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
                              ) : (
                                <div>
                                  <span className="fw-semibold text-primary">{r.teamName || 'Команда'}</span>
                                  {r.relayMembers && r.relayMembers.length > 0 && (
                                    <div className="small text-muted">{r.relayMembers.join(', ')}</div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td>
                              <MarkDisplay
                                value={r.value}
                                type={d.type}
                                timing={r.timing}
                                status={r.status}
                                wind={r.wind}
                              />
                            </td>
                            <td>{r.rank ? <Badge bg="primary">{r.rank}</Badge> : '–'}</td>
                            <td>{r.waScore !== undefined && r.waScore !== null ? <Badge bg="info" text="dark">{r.waScore}</Badge> : '–'}</td>
                            <td>{r.teamPoints !== undefined && r.teamPoints !== null ? r.teamPoints : (r.notes?.includes('Ос.') ? 'Ос.' : '–')}</td>
                            <td>{r.round ?? (r.notes ?? '')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card>
                ))
              ) : (
                displayedAbsoluteGroups.map(({ key, d, gender, round, list }) => (
                  <Card key={key} className="mb-3">
                    <Card.Header className="d-flex align-items-center justify-content-between py-2">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="fw-bold">{dName(d)}</span>
                        {gender === 'M' && <Badge bg="primary">Чоловіки</Badge>}
                        {gender === 'F' && <Badge bg="danger">Жінки</Badge>}
                        <Badge bg="secondary">{t('c.viewAbsolute')}</Badge>
                        {round && (
                          <Badge bg={round.toLowerCase().includes('фінал') && !round.toLowerCase().includes('1/2') ? 'danger' : 'info'}>
                            {formatRound(round)}
                          </Badge>
                        )}
                      </div>
                      <Badge bg="light" text="dark" className="border">
                        {list.length} {t('school.athletesCount')}
                      </Badge>
                    </Card.Header>
                    <Table responsive className="m-0 align-middle">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>{t('f.athlete')}</th>
                          <th>{t('f.category')}</th>
                          <th>{t('f.value')}</th>
                          <th>{t('f.rank')}</th>
                          <th>{t('f.waScore')}</th>
                          <th>{t('f.teamPoints')}</th>
                          <th>{t('f.round')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...list].sort(rank).map((r, i) => (
                          <tr key={r._id}>
                            <td>{r.place ?? i + 1}</td>
                            <td>
                              {r.athlete ? (
                                <div>
                                  <Link href={`/athletes/${r.athlete._id}`} className="text-decoration-none fw-semibold">
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
                              ) : (
                                <div>
                                  <span className="fw-semibold text-primary">{r.teamName || 'Команда'}</span>
                                  {r.relayMembers && r.relayMembers.length > 0 && (
                                    <div className="small text-muted">{r.relayMembers.join(', ')}</div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td>
                              <CategoryBadge category={r.ageCategory} />
                            </td>
                            <td>
                              <MarkDisplay
                                value={r.value}
                                type={d.type}
                                timing={r.timing}
                                status={r.status}
                                wind={r.wind}
                              />
                            </td>
                            <td>{r.rank ? <Badge bg="primary">{r.rank}</Badge> : '–'}</td>
                            <td>{r.waScore !== undefined && r.waScore !== null ? <Badge bg="info" text="dark">{r.waScore}</Badge> : '–'}</td>
                            <td>{r.teamPoints !== undefined && r.teamPoints !== null ? r.teamPoints : (r.notes?.includes('Ос.') ? 'Ос.' : '–')}</td>
                            <td>{r.round ?? (r.notes ?? '')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </Card>
                ))
              )}
            </State>
          </>
        )}
      </State>
    </>
  );
}
