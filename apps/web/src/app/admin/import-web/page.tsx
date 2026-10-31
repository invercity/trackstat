'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Form,
  Row,
  Spinner,
  Table,
} from 'react-bootstrap';
import { api } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import { formatDate } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type {
  ParsedItemPreview,
  ProtocolCommitPayload,
  ProtocolCommitResponse,
  WebCompetitionItem,
  WebImportPreviewResponse,
  WebIntegrationMeta,
} from '@/lib/types';

export default function WebImportPage() {
  const { t } = useI18n();

  // Integrations state
  const [integrations, setIntegrations] = useState<WebIntegrationMeta[]>([]);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string>('iks');

  // Years & Competitions state
  const [years, setYears] = useState<number[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [competitions, setCompetitions] = useState<WebCompetitionItem[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState<boolean>(false);
  const [compSearch, setCompSearch] = useState<string>('');

  // Selected Competition state
  const [selectedComp, setSelectedComp] = useState<WebCompetitionItem | null>(null);
  const [compName, setCompName] = useState<string>('');
  const [compDate, setCompDate] = useState<string>('');
  const [compEndDate, setCompEndDate] = useState<string>('');
  const [compLocation, setCompLocation] = useState<string>('');
  const [compLevel, setCompLevel] = useState<'city' | 'regional' | 'national' | 'international'>('national');
  const [regionFilter, setRegionFilter] = useState<string>('Чернігівська');

  // Preview & Results state
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<WebImportPreviewResponse | null>(null);
  const [previewItems, setPreviewItems] = useState<ParsedItemPreview[]>([]);
  const [discFilter, setDiscFilter] = useState<string>('ALL');
  const [genderFilter, setGenderFilter] = useState<string>('ALL');
  const [itemSearch, setItemSearch] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Commit state
  const [committing, setCommitting] = useState<boolean>(false);
  const [commitResult, setCommitResult] = useState<ProtocolCommitResponse | null>(null);

  // Section scroll references
  const configSectionRef = useRef<HTMLDivElement>(null);
  const previewSectionRef = useRef<HTMLDivElement>(null);
  const commitResultRef = useRef<HTMLDivElement>(null);

  // 1. Load integrations on mount
  useEffect(() => {
    async function init() {
      try {
        const intList = await api<WebIntegrationMeta[]>('/web-import/integrations');
        setIntegrations(intList);
        if (intList.length > 0) {
          setSelectedIntegrationId(intList[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Не вдалося завантажити налаштування інтеграцій');
      }
    }
    init();
  }, []);

  // 2. Load years when integration changes
  useEffect(() => {
    if (!selectedIntegrationId) return;

    let isMounted = true;
    async function fetchYears() {
      try {
        const yearList = await api<number[]>(`/web-import/${selectedIntegrationId}/years`);
        if (isMounted) {
          setYears(yearList);
          if (yearList.length > 0) {
            setSelectedYear((prev) => (yearList.includes(prev) ? prev : yearList[0]));
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err.message || 'Не вдалося завантажити роки для обраного джерела');
      }
    }

    fetchYears();
    return () => {
      isMounted = false;
    };
  }, [selectedIntegrationId]);

  // Handle changing integration
  const handleSelectIntegration = (intg: WebIntegrationMeta) => {
    if (selectedIntegrationId === intg.id) return;
    setSelectedIntegrationId(intg.id);
    setSelectedComp(null);
    setPreviewData(null);
    setPreviewItems([]);
    setRegionFilter(intg.defaultRegion || 'Чернігівська');
  };

  // 2. Load competitions when year or integration changes
  useEffect(() => {
    if (!selectedIntegrationId || !selectedYear) return;

    let isMounted = true;
    async function fetchComps() {
      setLoadingCompetitions(true);
      setError('');
      try {
        const comps = await api<WebCompetitionItem[]>(
          `/web-import/${selectedIntegrationId}/competitions?year=${selectedYear}`,
        );
        if (isMounted) {
          setCompetitions(comps);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Не вдалося завантажити список змагань');
        }
      } finally {
        if (isMounted) setLoadingCompetitions(false);
      }
    }

    fetchComps();
    return () => {
      isMounted = false;
    };
  }, [selectedIntegrationId, selectedYear]);

  // Handle selecting a competition from list
  const handleSelectCompetition = (comp: WebCompetitionItem) => {
    setSelectedComp(comp);
    setCompName(comp.title);
    setCompDate(comp.startDate);
    setCompEndDate(comp.endDate || comp.startDate);
    setCompLocation(comp.city ? `м.${comp.city}` : 'м.Київ');
    setCompLevel(comp.detectedLevel || 'national');
    setPreviewData(null);
    setPreviewItems([]);
    setCommitResult(null);
    setError('');

    setTimeout(() => {
      configSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  // Handle loading results preview from UAR
  const handleLoadResults = async () => {
    if (!selectedComp) return;

    setLoadingPreview(true);
    setError('');
    setCommitResult(null);
    try {
      const data = await api<WebImportPreviewResponse>(
        `/web-import/${selectedIntegrationId}/competitions/${selectedComp.id}/preview?year=${selectedYear}&region=${encodeURIComponent(regionFilter)}`,
      );
      setPreviewData(data);
      setPreviewItems(data.items.map((it) => ({ ...it, selected: true })));
      if (data.items.length === 0) {
        setError(
          `За фільтром області "${regionFilter || 'всі'}" на цих змаганнях не знайдено результатів. Спробуйте змінити фільтр області або вибрати інше змагання.`,
        );
      } else {
        setTimeout(() => {
          previewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (err: any) {
      setError(err.message || 'Не вдалося завантажити результати змагання');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Filtered competitions list
  const filteredCompetitions = useMemo(() => {
    if (!compSearch.trim()) return competitions;
    const q = compSearch.toLowerCase();
    return competitions.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q) ||
        c.region.toLowerCase().includes(q) ||
        c.startDate.includes(q),
    );
  }, [competitions, compSearch]);

  // Filtered results preview list
  const filteredItems = useMemo(() => {
    return previewItems.filter((it) => {
      if (discFilter !== 'ALL' && it.disciplineCanonicalName !== discFilter) return false;
      if (genderFilter !== 'ALL' && it.gender !== genderFilter) return false;
      if (itemSearch.trim()) {
        const q = itemSearch.toLowerCase();
        const matchName = it.athleteName.toLowerCase().includes(q);
        const matchTeam = (it.teamStr || '').toLowerCase().includes(q);
        const matchSchool = (it.schoolName || '').toLowerCase().includes(q);
        if (!matchName && !matchTeam && !matchSchool) return false;
      }
      return true;
    });
  }, [previewItems, discFilter, genderFilter, itemSearch]);

  const uniqueDisciplines = useMemo(() => {
    const set = new Set<string>();
    previewItems.forEach((it) => set.add(it.disciplineCanonicalName));
    return Array.from(set).sort();
  }, [previewItems]);

  const toggleSelectAll = (select: boolean) => {
    setPreviewItems((prev) => prev.map((it) => ({ ...it, selected: select })));
  };

  const toggleItemSelect = (id: string) => {
    setPreviewItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, selected: !it.selected } : it)),
    );
  };

  const selectedCount = previewItems.filter((it) => it.selected).length;

  // Commit to DB
  const handleCommit = async () => {
    if (selectedCount === 0) {
      setError('Виберіть хоча б один результат для збереження в базу');
      return;
    }

    setCommitting(true);
    setError('');
    try {
      const payload: ProtocolCommitPayload = {
        competitionMode: previewData?.competition.existingCompetitionId ? 'existing' : 'new',
        competitionId: previewData?.competition.existingCompetitionId,
        newCompetition: {
          name: compName,
          date: compDate,
          endDate: compEndDate || undefined,
          location: compLocation,
          level: compLevel,
          seasonYear: previewData?.competition.seasonYear || selectedYear,
        },
        items: previewItems.filter((it) => it.selected),
      };

      const result = await api<ProtocolCommitResponse>('/web-import/commit', {
        method: 'POST',
        body: payload,
      });

      setCommitResult(result);
      setTimeout(() => {
        commitResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Помилка при збереженні в базу даних');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="container-fluid px-0 pb-5">
      {/* Header */}
      <PageHeader
        icon="🌐"
        title={t('importWeb.title')}
        subtitle={t('importWeb.subtitle')}
        actions={
          <>
            <Link href="/admin/import" className="btn btn-outline-secondary btn-sm">
              📥 {t('admin.import')}
            </Link>
            <Link href="/results" className="btn btn-outline-primary btn-sm">
              🏆 {t('results.title')}
            </Link>
          </>
        }
      />

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')} className="mb-4 shadow-sm">
          ⚠️ {error}
        </Alert>
      )}

      {/* Step 1: Select Integration Source */}
      <Card className="mb-4 shadow-sm border-0">
        <Card.Header className="bg-white py-3 border-bottom">
          <h2 className="h6 mb-0 fw-bold">1. Інтеграції та джерела даних</h2>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            {integrations.map((intg) => (
              <Col md={6} lg={4} key={intg.id}>
                <Card
                  className={`h-100 cursor-pointer border ${selectedIntegrationId === intg.id ? 'border-primary shadow-sm bg-primary bg-opacity-10' : 'border-light-subtle'}`}
                  onClick={() => handleSelectIntegration(intg)}
                  style={{ cursor: 'pointer' }}
                >
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h3 className="h6 fw-bold mb-0 text-primary">🇺🇦 {intg.name}</h3>
                      <Badge bg="success">Активна</Badge>
                    </div>
                    <p className="small text-muted mb-2">{intg.description}</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <a
                        href={intg.website}
                        target="_blank"
                        rel="noreferrer"
                        className="small text-decoration-none"
                        onClick={(e) => e.stopPropagation()}
                      >
                        🔗 {intg.website.replace('https://', '')}
                      </a>
                      <span className="small text-muted">
                        Регіон за замовч.: <strong>{intg.defaultRegion}</strong>
                      </span>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}

            <Col md={6} lg={4}>
              <Card className="h-100 border border-dashed border-secondary-subtle bg-light">
                <Card.Body className="d-flex flex-column justify-content-center text-center py-4">
                  <div className="fw-semibold text-muted mb-1">🌍 Інші платформи</div>
                  <div className="small text-muted">
                    World Athletics, European Athletics та інші сервіси в розробці
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Step 2: Year filter & Competition selection */}
      <Card className="mb-4 shadow-sm border-0">
        <Card.Header className="bg-white py-3 border-bottom d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <h2 className="h6 mb-0 fw-bold">
              2. Вибір змагання з {selectedIntegrationId === 'iks' ? 'IKS' : 'UAR'}
            </h2>
            <Badge bg="primary">{filteredCompetitions.length}</Badge>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Year select */}
            <div className="d-flex align-items-center gap-1">
              <span className="small text-muted fw-semibold">Рік:</span>
              <Form.Select
                size="sm"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                style={{ width: '100px' }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </Form.Select>
            </div>

            {/* Search filter */}
            <Form.Control
              size="sm"
              placeholder="Пошук змагання (назва, місто)..."
              value={compSearch}
              onChange={(e) => setCompSearch(e.target.value)}
              style={{ minWidth: '220px' }}
            />
          </div>
        </Card.Header>

        <Card.Body className="p-0">
          {loadingCompetitions ? (
            <div className="text-center py-5 text-muted">
              <Spinner animation="border" size="sm" className="me-2" />
              Завантаження календаря змагань з {selectedIntegrationId === 'iks' ? 'iks.org.ua' : 'uar.com.ua'}...
            </div>
          ) : filteredCompetitions.length === 0 ? (
            <div className="text-center py-5 text-muted">Змагань за вибраними критеріями не знайдено</div>
          ) : (
            <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
              <Table hover responsive className="mb-0 align-middle">
                <thead className="table-light sticky-top">
                  <tr>
                    <th style={{ width: '40px' }}>#</th>
                    <th>Назва змагання</th>
                    <th>Дати</th>
                    <th>Місто / Локація</th>
                    <th>Тип</th>
                    <th>Рівень</th>
                    <th className="text-end" style={{ width: '140px' }}>
                      Дія
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompetitions.map((comp, idx) => {
                    const isSelected = selectedComp?.id === comp.id;
                    return (
                      <tr
                        key={`${comp.id}-${idx}`}
                        className={isSelected ? 'table-primary' : ''}
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleSelectCompetition(comp)}
                      >
                        <td className="text-muted small">{idx + 1}</td>
                        <td className="fw-semibold">
                          <div>{comp.title}</div>
                          <div className="small text-muted font-monospace">{comp.id}</div>
                        </td>
                        <td className="small text-nowrap">
                          {formatDate(comp.startDate)}
                          {comp.endDate && comp.endDate !== comp.startDate && ` — ${formatDate(comp.endDate)}`}
                        </td>
                        <td className="small text-nowrap">
                          {comp.city}
                          {comp.region && comp.region !== comp.city ? `, ${comp.region}` : ''}
                        </td>
                        <td>
                          <Badge bg={comp.indoor ? 'info' : 'secondary'} className="fw-normal">
                            {comp.indoor ? 'Манеж' : 'Стадіон'}
                          </Badge>
                        </td>
                        <td>
                          <Badge
                            bg={
                              comp.detectedLevel === 'national'
                                ? 'primary'
                                : comp.detectedLevel === 'international'
                                  ? 'warning'
                                  : 'success'
                            }
                            className="fw-normal"
                          >
                            {comp.detectedLevel === 'national'
                              ? 'Національні'
                              : comp.detectedLevel === 'international'
                                ? 'Міжнародні'
                                : comp.detectedLevel === 'regional'
                                  ? 'Область'
                                  : 'Міські'}
                          </Badge>
                        </td>
                        <td className="text-end">
                          <Button
                            size="sm"
                            variant={isSelected ? 'primary' : 'outline-primary'}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectCompetition(comp);
                            }}
                          >
                            {isSelected ? '✓ Вибрано' : 'Вибрати'}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Step 3: Selected Competition Details & Filters */}
      {selectedComp && (
        <div ref={configSectionRef} style={{ scrollMarginTop: '24px' }}>
          <Card className="mb-4 shadow-sm border-0 border-top border-primary border-3">
            <Card.Header className="bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0 fw-bold">
                3. Параметри змагання перед завантаженням: <span className="text-primary">{selectedComp.title}</span>
              </h2>
              <Badge bg="info">ID: {selectedComp.id}</Badge>
            </Card.Header>
            <Card.Body>
              <Row className="g-3 mb-3">
                <Col md={6}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted">Назва в нашій базі</Form.Label>
                    <Form.Control
                      size="sm"
                      value={compName}
                      onChange={(e) => setCompName(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted">Дата початку</Form.Label>
                    <Form.Control
                      size="sm"
                      type="date"
                      value={compDate}
                      onChange={(e) => setCompDate(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted">Дата завершення</Form.Label>
                    <Form.Control
                      size="sm"
                      type="date"
                      value={compEndDate}
                      onChange={(e) => setCompEndDate(e.target.value)}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <Form.Label className="small fw-semibold text-muted">Місто / Локація</Form.Label>
                    <Form.Control
                      size="sm"
                      value={compLocation}
                      onChange={(e) => setCompLocation(e.target.value)}
                    />
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <Form.Label className="small fw-semibold text-muted mb-0">Рівень змагань</Form.Label>
                      <span className="badge bg-secondary-subtle text-secondary small">
                        Визначено: {selectedComp.detectedLevel}
                      </span>
                    </div>
                    <Form.Select
                      size="sm"
                      value={compLevel}
                      onChange={(e) => setCompLevel(e.target.value as any)}
                    >
                      <option value="national">Національні (Чемпіонати, Кубки України, ВЗ)</option>
                      <option value="regional">Область (Чемпіонати області)</option>
                      <option value="city">Місто (Міські змагання)</option>
                      <option value="international">Міжнародні</option>
                    </Form.Select>
                  </Form.Group>
                </Col>

                <Col md={4}>
                  <Form.Group>
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <Form.Label className="small fw-semibold text-muted mb-0">Фільтр області</Form.Label>
                      <span className="small text-muted">(за замовчуванням наша)</span>
                    </div>
                    <Form.Control
                      size="sm"
                      placeholder="Напр. Чернігівська (або пусто для всіх)"
                      value={regionFilter}
                      onChange={(e) => setRegionFilter(e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex justify-content-end">
                <Button
                  variant="primary"
                  onClick={handleLoadResults}
                  disabled={loadingPreview}
                  className="d-flex align-items-center gap-2 px-4 shadow-sm"
                >
                  {loadingPreview ? (
                    <>
                      <Spinner animation="border" size="sm" />
                      Завантаження протоколів з {selectedIntegrationId === 'iks' ? 'IKS' : 'UAR'}...
                    </>
                  ) : (
                    <>
                      <span>📥</span>
                      Завантажити результати області з {selectedIntegrationId === 'iks' ? 'IKS' : 'UAR'}
                    </>
                  )}
                </Button>
              </div>
            </Card.Body>
          </Card>
        </div>
      )}

      {/* Step 4: Results Preview & Commit */}
      {previewData && (
        <div ref={previewSectionRef} style={{ scrollMarginTop: '24px' }}>
          <Card className="mb-4 shadow-sm border-0">
            <Card.Header className="bg-white py-3 border-bottom">
              <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                <div>
                  <h2 className="h6 mb-0 fw-bold">4. Попередній перегляд та вибір результатів</h2>
                  <div className="small text-muted">
                    Змагання: <strong>{previewData.competition.name}</strong> ({previewData.competition.location})
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <Button
                    variant="success"
                    disabled={selectedCount === 0 || committing}
                    onClick={handleCommit}
                    className="d-flex align-items-center gap-2 fw-semibold px-4 shadow-sm"
                  >
                    {committing ? (
                      <>
                        <Spinner animation="border" size="sm" />
                        Збереження в базу...
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        Зберегти вибрані в базу ({selectedCount})
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card.Header>

          {/* Stats Bar */}
          <div className="bg-light px-3 py-2 border-bottom">
            <Row className="g-2 text-center small">
              <Col xs={6} md={2}>
                <div className="text-muted">Знайдено</div>
                <div className="fw-bold fs-6">{previewData.stats.totalParticipantsFound}</div>
              </Col>
              <Col xs={6} md={2}>
                <div className="text-muted">Валідних результатів</div>
                <div className="fw-bold fs-6 text-success">{previewData.stats.validResults}</div>
              </Col>
              <Col xs={6} md={2}>
                <div className="text-muted">В базі (співпало)</div>
                <div className="fw-bold fs-6 text-primary">{previewData.stats.matchedAthletesCount}</div>
              </Col>
              <Col xs={6} md={2}>
                <div className="text-muted">Нових спортсменів</div>
                <div className="fw-bold fs-6 text-info">{previewData.stats.newAthletesCount}</div>
              </Col>
              <Col xs={6} md={2}>
                <div className="text-muted">Дисциплін</div>
                <div className="fw-bold fs-6">{previewData.stats.disciplinesCount}</div>
              </Col>
              <Col xs={6} md={2}>
                <div className="text-muted">Вибрано для запису</div>
                <div className="fw-bold fs-6 text-warning">{selectedCount}</div>
              </Col>
            </Row>
          </div>

          {/* Filters Bar */}
          <Card.Body className="py-2 border-bottom bg-white">
            <Row className="g-2 align-items-center">
              <Col xs="auto">
                <ButtonGroup size="sm">
                  <Button variant="outline-secondary" onClick={() => toggleSelectAll(true)}>
                    Вибрати всі
                  </Button>
                  <Button variant="outline-secondary" onClick={() => toggleSelectAll(false)}>
                    Зняти всі
                  </Button>
                </ButtonGroup>
              </Col>

              <Col xs={12} sm="auto">
                <Form.Select
                  size="sm"
                  value={discFilter}
                  onChange={(e) => setDiscFilter(e.target.value)}
                >
                  <option value="ALL">Всі дисципліни ({uniqueDisciplines.length})</option>
                  {uniqueDisciplines.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Form.Select>
              </Col>

              <Col xs={6} sm="auto">
                <Form.Select
                  size="sm"
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                >
                  <option value="ALL">Всі статі</option>
                  <option value="M">Чоловіки / Юнаки</option>
                  <option value="F">Жінки / Дівчата</option>
                </Form.Select>
              </Col>

              <Col>
                <Form.Control
                  size="sm"
                  placeholder="Швидкий пошук за прізвищем спортсмена..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              </Col>
            </Row>
          </Card.Body>

          {/* Results Table */}
          <Table responsive hover className="mb-0 align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: '40px' }}>
                  <Form.Check
                    type="checkbox"
                    checked={selectedCount === previewItems.length && previewItems.length > 0}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </th>
                <th style={{ width: '50px' }}>Місце</th>
                <th>Спортсмен</th>
                <th>Дисципліна & Раунд</th>
                <th>Результат</th>
                <th>Хронометраж</th>
                <th>Розряд / WA</th>
                <th>Школа / Команда</th>
                <th>Статус в базі</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                return (
                  <tr key={item.id} className={item.selected ? '' : 'table-light text-muted'}>
                    <td>
                      <Form.Check
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleItemSelect(item.id)}
                      />
                    </td>
                    <td className="fw-bold">{item.place ?? '—'}</td>
                    <td>
                      <div className="fw-semibold">
                        {item.athleteName}
                        {item.isRelay && (
                          <Badge bg="secondary" className="ms-1 small">
                            Естафета
                          </Badge>
                        )}
                      </div>
                      <div className="small text-muted">
                        {item.dobStr && `Д.Н.: ${item.dobStr}`}
                        {item.ageCategory && ` • ${item.ageCategory}`}
                        {item.gender && ` • ${item.gender === 'M' ? 'Ч' : 'Ж'}`}
                      </div>
                      {item.relayMembers && item.relayMembers.length > 0 && (
                        <div className="small text-muted font-monospace">
                          Склад: {item.relayMembers.join(', ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="fw-semibold">{item.disciplineCanonicalName}</div>
                      <Badge
                        bg={item.round === 'фінал' ? 'success' : 'secondary'}
                        className="fw-normal small"
                      >
                        {item.round}
                      </Badge>
                    </td>
                    <td>
                      <span className="font-monospace fw-bold fs-6">
                        {item.rawMark || item.status}
                      </span>
                    </td>
                    <td>
                      {item.timing ? (
                        <Badge
                          bg={item.timing === 'electronic' ? 'primary' : 'warning'}
                          className="fw-normal"
                        >
                          {item.timing === 'electronic' ? 'авто' : 'ручний'}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      {item.sportRank && (
                        <Badge bg="dark" className="me-1">
                          {item.sportRank}
                        </Badge>
                      )}
                      {item.waScore != null && (
                        <span className="small text-muted">{item.waScore} WA</span>
                      )}
                    </td>
                    <td>
                      <div className="small">{item.schoolName || item.teamStr || '—'}</div>
                    </td>
                    <td>
                      {item.athleteMatch.status === 'exact_match' && (
                        <Badge bg="success">Знайдено в базі</Badge>
                      )}
                      {item.athleteMatch.status === 'fuzzy_match' && (
                        <Badge bg="warning" text="dark">
                          Схоже ім&apos;я
                        </Badge>
                      )}
                      {item.athleteMatch.status === 'new' && (
                        <Badge bg="info">Новий спортсмен</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          {/* Footer with Commit */}
          <Card.Footer className="bg-white py-3 border-top d-flex justify-content-between align-items-center">
            <span className="small text-muted">
              Вибрано результатів: <strong>{selectedCount}</strong> з {previewItems.length}
            </span>
            <Button
              variant="success"
              disabled={selectedCount === 0 || committing}
              onClick={handleCommit}
              className="d-flex align-items-center gap-2 fw-semibold px-4 shadow-sm"
            >
              {committing ? (
                <>
                  <Spinner animation="border" size="sm" />
                  Збереження в базу...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Зберегти вибрані в базу ({selectedCount})
                </>
              )}
            </Button>
          </Card.Footer>
        </Card>
      </div>
      )}

      {/* Commit Result Success Modal / Alert */}
      {commitResult && (
        <div ref={commitResultRef} style={{ scrollMarginTop: '24px' }}>
          <Alert variant="success" className="shadow-sm border-success mt-4">
            <div className="d-flex align-items-start justify-content-between">
              <div>
                <h4 className="alert-heading fw-bold mb-2">🎉 Результати успішно збережено в базу даних!</h4>
                <p className="mb-2">
                  Змагання <strong>{commitResult.competitionName}</strong> успішно додано/оновлено в системі TrackStat.
                </p>
                <ul className="mb-3 small">
                  <li>
                    Імпортовано результатів: <strong>{commitResult.importedResultsCount}</strong>
                  </li>
                  <li>
                    Нових спортсменів додано: <strong>{commitResult.athletesCreatedCount}</strong>
                  </li>
                  <li>
                    Співпало з наявними в базі: <strong>{commitResult.athletesMatchedCount}</strong>
                  </li>
                  <li>
                    🏆 Автоматично оновлено рейтинги спортсменів, особисті рекорди (PB) та кращі результати сезону (SB)!
                  </li>
                </ul>
                <div className="d-flex gap-2">
                  <Link
                    href={`/competitions/${commitResult.competitionId}`}
                    className="btn btn-success btn-sm fw-semibold"
                  >
                    Перейти до змагання
                  </Link>
                  <Button
                    variant="outline-success"
                    size="sm"
                    onClick={() => {
                      setCommitResult(null);
                      setPreviewData(null);
                      setPreviewItems([]);
                    }}
                  >
                    Імпортувати ще одне змагання
                  </Button>
                </div>
              </div>
            </div>
          </Alert>
        </div>
      )}
    </div>
  );
}
