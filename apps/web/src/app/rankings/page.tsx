'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Container,
  Form,
  Modal,
  Row,
  Table,
  ToggleButton,
} from 'react-bootstrap';
import State from '@/components/State';
import MarkDisplay from '@/components/ui/MarkDisplay';
import SchoolLink from '@/components/ui/SchoolLink';
import ScoringRulesModal from '@/components/rankings/ScoringRulesModal';
import { useFetch } from '@/lib/api';
import { formatDate, fullName } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type {
  RankedAthleteItem,
  RankedSchoolItem,
  RankingsOverview,
} from '@/lib/types';

export default function RankingsPage() {
  const { t } = useI18n();

  const [selectedYear, setSelectedYear] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'athletes' | 'schools'>('athletes');

  // Athlete tab filters
  const [athleteCategory, setAthleteCategory] = useState<'u16' | 'u18' | 'adult'>('u16');
  const [athleteGender, setAthleteGender] = useState<'M' | 'F'>('M');

  // Modals state
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [selectedSchool, setSelectedSchool] = useState<RankedSchoolItem | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<RankedAthleteItem | null>(null);

  const queryPath = selectedYear ? `/rankings?year=${selectedYear}` : '/rankings';
  const { data: rankings, loading, error } = useFetch<RankingsOverview>(queryPath);

  const getRankBadgeVariant = (rank: number) => {
    switch (rank) {
      case 1:
        return 'warning';
      case 2:
        return 'secondary';
      case 3:
        return 'danger';
      default:
        return 'primary';
    }
  };

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'bg-warning text-dark border border-warning-subtle';
    if (rank === 2) return 'bg-secondary text-white';
    if (rank === 3) return 'bg-danger-subtle text-danger border border-danger-subtle';
    return 'bg-light text-dark border';
  };

  const getCurrentAthleteList = (): RankedAthleteItem[] => {
    if (!rankings) return [];
    const key = `${athleteCategory}_${athleteGender.toLowerCase()}` as keyof typeof rankings.categories;
    return rankings.categories[key] || [];
  };

  const currentAthletes = getCurrentAthleteList();
  const currentSchools = rankings?.schools || [];
  const displayYear = rankings?.year || new Date().getFullYear();

  return (
    <Container className="py-4">
      {/* Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <div className="d-flex align-items-center gap-2 flex-wrap mb-1">
            <span style={{ fontSize: '1.8rem' }}>🏆</span>
            <h1 className="h2 mb-0">
              {t('rankings.title')} {displayYear}
            </h1>
            <button
              type="button"
              className="btn btn-sm btn-outline-warning border-0 p-1 ms-1 text-decoration-none"
              style={{ fontSize: '1.25rem', lineHeight: 1 }}
              title="Критерії та правила нарахування очок"
              onClick={() => setShowRulesModal(true)}
            >
              💡
            </button>
          </div>
          <p className="text-muted mb-0">{t('rankings.subtitle')}</p>
        </div>

        {/* Year selector */}
        {rankings?.allYears && rankings.allYears.length > 0 && (
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted small fw-semibold text-nowrap">Рік:</span>
            <Form.Select
              size="sm"
              value={selectedYear || String(displayYear)}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ width: 'auto', minWidth: '120px' }}
            >
              {rankings.allYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr} {yr === new Date().getFullYear() ? '(поточний)' : ''}
                </option>
              ))}
            </Form.Select>
          </div>
        )}
      </div>

      {/* Main Mode Toggle: Athletes vs Schools */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
        <ButtonGroup className="shadow-xs">
          <Button
            variant={activeTab === 'athletes' ? 'primary' : 'outline-primary'}
            onClick={() => setActiveTab('athletes')}
            className="d-flex align-items-center gap-2 px-3 py-2"
          >
            <span>🏃</span>
            <span className="fw-semibold">{t('rankings.athletesTab')}</span>
          </Button>
          <Button
            variant={activeTab === 'schools' ? 'primary' : 'outline-primary'}
            onClick={() => setActiveTab('schools')}
            className="d-flex align-items-center gap-2 px-3 py-2"
          >
            <span>🏫</span>
            <span className="fw-semibold">{t('rankings.schoolsTab')}</span>
          </Button>
        </ButtonGroup>
      </div>

      <State loading={loading} error={error} empty={!rankings}>
        {/* ATHLETES RANKING TAB */}
        {activeTab === 'athletes' && (
          <div>
            {/* Filters bar */}
            <Card className="mb-4 shadow-sm border-0 bg-body-tertiary">
              <Card.Body className="py-2 px-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
                {/* Age category switch */}
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <small className="text-muted fw-semibold">Категорія:</small>
                  <ButtonGroup size="sm">
                    <Button
                      variant={athleteCategory === 'u16' ? 'primary' : 'outline-secondary'}
                      size="sm"
                      onClick={() => setAthleteCategory('u16')}
                    >
                      U16
                    </Button>
                    <Button
                      variant={athleteCategory === 'u18' ? 'primary' : 'outline-secondary'}
                      size="sm"
                      onClick={() => setAthleteCategory('u18')}
                    >
                      U18
                    </Button>
                    <Button
                      variant={athleteCategory === 'adult' ? 'primary' : 'outline-secondary'}
                      size="sm"
                      onClick={() => setAthleteCategory('adult')}
                    >
                      {t('cat.ADULT')}
                    </Button>
                  </ButtonGroup>
                </div>

                {/* Gender switch */}
                <div className="d-flex align-items-center gap-2 flex-wrap">
                  <small className="text-muted fw-semibold">Стать:</small>
                  <ButtonGroup size="sm">
                    <Button
                      variant={athleteGender === 'M' ? 'primary' : 'outline-secondary'}
                      size="sm"
                      onClick={() => setAthleteGender('M')}
                    >
                      {t('f.M')}
                    </Button>
                    <Button
                      variant={athleteGender === 'F' ? 'danger' : 'outline-secondary'}
                      size="sm"
                      onClick={() => setAthleteGender('F')}
                    >
                      {t('f.F')}
                    </Button>
                  </ButtonGroup>
                </div>
              </Card.Body>
            </Card>

            {/* Top 10 Athletes Table */}
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-body-tertiary py-3 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <span className="fs-5">{athleteGender === 'M' ? '🏃‍♂️' : '🏃‍♀️'}</span>
                  <h2 className="h5 mb-0 fw-bold">
                    Топ-10 спортсменів: {athleteCategory.toUpperCase()} ({athleteGender === 'M' ? t('f.M') : t('f.F')})
                  </h2>
                </div>
                <Badge bg="success">
                  {currentAthletes.length} {currentAthletes.length === 1 ? 'спортсмен' : 'спортсменів'}
                </Badge>
              </Card.Header>

              <Card.Body className="p-0">
                {currentAthletes.length === 0 ? (
                  <div className="p-4 text-center text-muted fst-italic">
                    {t('rankings.noAthletes')}
                  </div>
                ) : (
                  <Table responsive hover className="mb-0 align-middle">
                    <thead className="table-light small text-muted">
                      <tr>
                        <th style={{ width: '55px' }} className="text-center">#</th>
                        <th>{t('f.athlete')}</th>
                        <th>{t('rankings.school')}</th>
                        <th className="d-none d-md-table-cell">{t('rankings.scoredStarts')}</th>
                        <th style={{ minWidth: '120px' }} className="text-end pe-3">{t('rankings.totalPoints')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentAthletes.map((item) => (
                        <tr key={item.athlete._id}>
                          <td className="text-center">
                            <span
                              className={`badge rounded-circle p-2 fw-bold ${getRankBadgeClass(item.rank)}`}
                              style={{ width: '32px', height: '32px', lineHeight: '16px' }}
                            >
                              {item.rank}
                            </span>
                          </td>
                          <td>
                            <div>
                              <Link
                                href={`/athletes/${item.athlete._id}`}
                                className="fw-bold text-primary text-decoration-none link-primary"
                              >
                                {fullName(item.athlete)}
                              </Link>
                              <div className="text-muted extra-small" style={{ fontSize: '0.8rem' }}>
                                {item.athlete.birthDate &&
                                  `${new Date(item.athlete.birthDate).getUTCFullYear()} р.н.`}
                              </div>
                            </div>
                          </td>
                          <td>
                            <SchoolLink
                              school={item.athlete.school}
                              club={item.athlete.club}
                              withIcon={false}
                              preferShortName={false}
                              showCity={true}
                              className="fw-semibold text-secondary text-decoration-none"
                            />
                          </td>
                          <td className="d-none d-md-table-cell">
                            <div className="d-flex align-items-center gap-1 flex-wrap">
                              {item.results.map((res, i) => (
                                <Badge
                                  key={i}
                                  bg="light"
                                  className="text-dark border cursor-pointer"
                                  title={`${res.competitionName} • ${res.disciplineName} (${res.place || '-'} місце) = ${res.totalPoints} очок`}
                                  style={{ fontSize: '0.78rem' }}
                                  onClick={() => setSelectedAthlete(item)}
                                >
                                  {res.disciplineName}: <strong>{res.totalPoints}</strong>
                                </Badge>
                              ))}
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 text-muted extra-small ms-1 text-decoration-none"
                                onClick={() => setSelectedAthlete(item)}
                              >
                                деталі ℹ️
                              </Button>
                            </div>
                          </td>
                          <td className="text-end pe-3">
                            <span className="fs-5 fw-bold font-monospace text-primary">
                              {item.totalPoints}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
              <Card.Footer className="bg-body-secondary py-2 px-3 small text-muted">
                ℹ️ До заліку входять до 5 кращих стартів спортсмена за календарний рік (стадіон + манеж) згідно з офіційною шкалою очок.
              </Card.Footer>
            </Card>
          </div>
        )}

        {/* SPORTS SCHOOLS RANKING TAB */}
        {activeTab === 'schools' && (
          <div>
            <Card className="shadow-sm border-0">
              <Card.Header className="bg-body-tertiary py-3 d-flex justify-content-between align-items-center">
                <div className="d-flex align-items-center gap-2">
                  <span className="fs-5">🏫</span>
                  <h2 className="h5 mb-0 fw-bold">Топ-10 спортивних шкіл {displayYear} року</h2>
                </div>
                <Badge bg="success">
                  {currentSchools.length} {currentSchools.length === 1 ? 'школа' : 'шкіл'}
                </Badge>
              </Card.Header>

              <Card.Body className="p-0">
                {currentSchools.length === 0 ? (
                  <div className="p-4 text-center text-muted fst-italic">
                    {t('rankings.noSchools')}
                  </div>
                ) : (
                  <Table responsive hover className="mb-0 align-middle">
                    <thead className="table-light small text-muted">
                      <tr>
                        <th style={{ width: '55px' }} className="text-center">#</th>
                        <th>{t('rankings.school')}</th>
                        <th>{t('rankings.city')}</th>
                        <th className="text-center">{t('rankings.athletesCount')}</th>
                        <th style={{ minWidth: '120px' }} className="text-end">{t('rankings.totalPoints')}</th>
                        <th style={{ width: '130px' }} className="text-center">Склад</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentSchools.map((item) => (
                        <tr key={item.school._id}>
                          <td className="text-center">
                            <span
                              className={`badge rounded-circle p-2 fw-bold ${getRankBadgeClass(item.rank)}`}
                              style={{ width: '32px', height: '32px', lineHeight: '16px' }}
                            >
                              {item.rank}
                            </span>
                          </td>
                          <td>
                            <Link
                              href={`/schools/${item.school._id}`}
                              className="fw-bold fs-6 text-primary text-decoration-none"
                            >
                              {item.school.name}
                            </Link>
                            {item.school.shortName && (
                              <div className="text-muted extra-small">
                                {item.school.shortName}
                              </div>
                            )}
                          </td>
                          <td>
                            <span className="text-secondary">
                              {item.school.city || '–'}
                            </span>
                          </td>
                          <td className="text-center">
                            <Badge bg="secondary" pill className="px-2 py-1">
                              {item.athletesCount} спортсменів
                            </Badge>
                          </td>
                          <td className="text-end">
                            <span className="fs-5 fw-bold font-monospace text-primary">
                              {item.totalPoints}
                            </span>
                          </td>
                          <td className="text-center">
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="py-1 px-2"
                              onClick={() => setSelectedSchool(item)}
                            >
                              👥 Спортсмени
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
              </Card.Body>
              <Card.Footer className="bg-body-secondary py-2 px-3 small text-muted">
                ℹ️ Загальний бал спортивної школи формується як сума рейтингових очок усіх її вихованців за підсумками календарного року.
              </Card.Footer>
            </Card>
          </div>
        )}
      </State>

      {/* MODAL: School athletes breakdown */}
      <Modal
        show={!!selectedSchool}
        onHide={() => setSelectedSchool(null)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="h5 mb-0 d-flex align-items-center gap-2">
            <span>🏫</span>
            <span>{selectedSchool?.school.name}</span>
            {selectedSchool && (
              <Badge bg="primary" className="ms-2">
                #{selectedSchool.rank} • {selectedSchool.totalPoints} очок
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <div className="p-3 bg-light border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
            <span className="text-muted small">
              Місто: <strong>{selectedSchool?.school.city || '–'}</strong> • Вихованців з очками: <strong>{selectedSchool?.athletesCount}</strong>
            </span>
          </div>
          <Table responsive hover size="sm" className="mb-0 align-middle">
            <thead className="table-light small text-muted">
              <tr>
                <th style={{ width: '40px' }} className="text-center">#</th>
                <th>Спортсмен</th>
                <th>Категорія</th>
                <th className="d-none d-sm-table-cell">Старти</th>
                <th className="text-end pe-3">Очки</th>
              </tr>
            </thead>
            <tbody>
              {selectedSchool?.athletes.map((a, idx) => (
                <tr key={a._id}>
                  <td className="text-center small text-muted">{idx + 1}</td>
                  <td>
                    <Link
                      href={`/athletes/${a._id}`}
                      className="fw-semibold text-primary text-decoration-none"
                    >
                      {fullName(a)}
                    </Link>
                  </td>
                  <td>
                    <Badge bg={a.gender === 'M' ? 'primary' : 'danger'} className="me-1">
                      {a.gender}
                    </Badge>
                    <span className="small text-muted">{a.ageCategory}</span>
                  </td>
                  <td className="d-none d-sm-table-cell small text-muted">
                    {a.countedResultsCount} стартів
                  </td>
                  <td className="text-end pe-3 font-monospace fw-bold text-dark">
                    {a.totalPoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between">
          {selectedSchool && (
            <Link
              href={`/schools/${selectedSchool.school._id}`}
              className="btn btn-sm btn-outline-primary"
              onClick={() => setSelectedSchool(null)}
            >
              🏫 {t('school.viewSchool')} →
            </Link>
          )}
          <Button variant="secondary" size="sm" onClick={() => setSelectedSchool(null)}>
            Закрити
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL: Athlete individual scoring details */}
      <Modal
        show={!!selectedAthlete}
        onHide={() => setSelectedAthlete(null)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="h5 mb-0 d-flex align-items-center gap-2">
            <span>🏃</span>
            <span>{selectedAthlete && fullName(selectedAthlete.athlete)}</span>
            {selectedAthlete && (
              <Badge bg="primary" className="ms-2">
                {selectedAthlete.totalPoints} очок (топ-{selectedAthlete.countedResultsCount} стартів)
              </Badge>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          <Table responsive hover size="sm" className="mb-0 align-middle">
            <thead className="table-light small text-muted">
              <tr>
                <th>Змагання</th>
                <th>Вид</th>
                <th>Результат</th>
                <th className="text-center">Місце</th>
                <th className="text-end">Очки за місце</th>
                <th className="text-end">Бонуси</th>
                <th className="text-end pe-3">Разом</th>
              </tr>
            </thead>
            <tbody>
              {selectedAthlete?.results.map((r, i) => (
                <tr key={i}>
                  <td>
                    <div className="small fw-semibold">{r.competitionName}</div>
                    <div className="extra-small text-muted" style={{ fontSize: '0.75rem' }}>
                      {formatDate(r.competitionDate)}
                    </div>
                  </td>
                  <td className="fw-bold">{r.disciplineName}</td>
                  <td>
                    {r.value !== undefined ? (
                      <MarkDisplay
                        value={r.value}
                        type="time"
                        timing={r.timing}
                        rank={r.rank}
                        rankVariant="secondary"
                      />
                    ) : (
                      '–'
                    )}
                  </td>
                  <td className="text-center fw-bold">
                    {r.place ? `${r.place} м.` : '–'}
                  </td>
                  <td className="text-end font-monospace">{r.placePoints}</td>
                  <td className="text-end font-monospace text-success">
                    {r.bonusPoints > 0 ? `+${r.bonusPoints}` : '0'}
                  </td>
                  <td className="text-end pe-3 font-monospace fw-bold text-primary">
                    {r.totalPoints}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setSelectedAthlete(null)}>
            Закрити
          </Button>
        </Modal.Footer>
      </Modal>

      {/* MODAL: Official Rules & Scoring Criteria */}
      <ScoringRulesModal
        show={showRulesModal}
        onHide={() => setShowRulesModal(false)}
      />
    </Container>
  );
}
