'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
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
import { api, useFetch } from '@/lib/api';
import PageHeader from '@/components/ui/PageHeader';
import { useI18n } from '@/lib/i18n';
import type {
  Competition,
  ProtocolCommitPayload,
  ProtocolCommitResponse,
  ProtocolPreviewResponse,
} from '@/lib/types';

export default function AdminImportPage() {
  const { t } = useI18n();

  // Load existing competitions in case user wants to attach results to an existing one
  const { data: competitions } = useFetch<Competition[]>('/competitions');

  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [previewData, setPreviewData] = useState<ProtocolPreviewResponse | null>(null);
  const [commitResult, setCommitResult] = useState<ProtocolCommitResponse | null>(null);

  // Competition settings for commit
  const [competitionMode, setCompetitionMode] = useState<'new' | 'existing'>('new');
  const [selectedCompId, setSelectedCompId] = useState<string>('');

  // New competition fields
  const [newCompName, setNewCompName] = useState('');
  const [newCompDate, setNewCompDate] = useState('');
  const [newCompEndDate, setNewCompEndDate] = useState('');
  const [newCompLocation, setNewCompLocation] = useState('м.Чернігів');
  const [newCompLevel, setNewCompLevel] = useState('regional');
  const [newCompYear, setNewCompYear] = useState<number>(2026);

  // Table filters
  const [filterDiscipline, setFilterDiscipline] = useState<string>('ALL');
  const [filterGender, setFilterGender] = useState<string>('ALL');
  const [filterWarningsOnly, setFilterWarningsOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleParse = async () => {
    if (!file) {
      setError('Будь ласка, оберіть файл для завантаження');
      return;
    }

    setParsing(true);
    setError(null);
    setCommitResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api<ProtocolPreviewResponse>('/protocol-import/preview', {
        method: 'POST',
        body: formData,
      });

      setPreviewData(res);

      // Prepopulate new competition fields
      if (res.metadata) {
        setNewCompName(res.metadata.suggestedName || '');
        setNewCompDate(res.metadata.suggestedDate || new Date().toISOString().slice(0, 10));
        setNewCompEndDate(res.metadata.suggestedEndDate || '');
        setNewCompLocation(res.metadata.suggestedLocation || 'м.Чернігів');
        setNewCompLevel(res.metadata.suggestedLevel || 'regional');
        setNewCompYear(res.metadata.suggestedSeasonYear || 2026);
      }
    } catch (err: any) {
      setError(err.message || 'Помилка під час аналізу файлу');
    } finally {
      setParsing(false);
    }
  };

  const handleToggleRow = (id: string) => {
    if (!previewData) return;
    setPreviewData({
      ...previewData,
      items: previewData.items.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (!previewData) return;
    setPreviewData({
      ...previewData,
      items: previewData.items.map((item) => ({ ...item, selected: checked })),
    });
  };

  const filteredItems = useMemo(() => {
    if (!previewData) return [];
    return previewData.items.filter((item) => {
      if (filterDiscipline !== 'ALL' && item.disciplineCanonicalName !== filterDiscipline) {
        return false;
      }
      if (filterGender !== 'ALL' && item.gender !== filterGender) {
        return false;
      }
      if (filterWarningsOnly && item.warnings.length === 0) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.athleteName.toLowerCase().includes(q);
        const matchTeam = item.teamStr?.toLowerCase().includes(q);
        if (!matchName && !matchTeam) return false;
      }
      return true;
    });
  }, [previewData, filterDiscipline, filterGender, filterWarningsOnly, searchQuery]);

  const selectedCount = useMemo(() => {
    if (!previewData) return 0;
    return previewData.items.filter((it) => it.selected !== false).length;
  }, [previewData]);

  const handleCommit = async () => {
    if (!previewData) return;

    if (competitionMode === 'existing' && !selectedCompId) {
      setError('Оберіть змагання зі списку або виберіть створення нового змагання');
      return;
    }
    if (competitionMode === 'new' && !newCompName.trim()) {
      setError('Введіть назву нового змагання');
      return;
    }

    setCommitting(true);
    setError(null);

    try {
      const payload: ProtocolCommitPayload = {
        competitionMode,
        competitionId: competitionMode === 'existing' ? selectedCompId : undefined,
        newCompetition:
          competitionMode === 'new'
            ? {
                name: newCompName.trim(),
                date: newCompDate,
                endDate: newCompEndDate || undefined,
                location: newCompLocation.trim(),
                level: newCompLevel,
                seasonYear: newCompYear,
              }
            : undefined,
        items: previewData.items,
      };

      const res = await api<ProtocolCommitResponse>('/protocol-import/commit', {
        method: 'POST',
        body: payload,
      });

      setCommitResult(res);
      setPreviewData(null);
      setFile(null);
    } catch (err: any) {
      setError(err.message || 'Помилка під час збереження результатів');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <>
      <PageHeader
        icon="📥"
        title={t('import.title')}
        subtitle={t('import.subtitle')}
        actions={
          <Link href="/admin/import-web" className="btn btn-outline-primary btn-sm">
            🌐 {t('admin.importWeb')}
          </Link>
        }
      />

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="shadow-sm">
          <strong>Помилка:</strong> {error}
        </Alert>
      )}

      {/* Success Notification after commit */}
      {commitResult && (
        <Alert variant="success" className="shadow-sm p-4 mb-4">
          <div className="d-flex align-items-start gap-3">
            <span style={{ fontSize: '2rem' }}>🎉</span>
            <div className="flex-grow-1">
              <h4 className="alert-heading fw-bold mb-2">Протокол успішно імпортовано!</h4>
              <p className="mb-2">
                Змагання: <strong>{commitResult.competitionName}</strong>
              </p>
              <ul className="mb-3 small">
                <li>
                  Збережено результатів: <strong>{commitResult.importedResultsCount}</strong>
                </li>
                <li>
                  Створено нових спортсменів: <strong>{commitResult.athletesCreatedCount}</strong>
                </li>
                <li>
                  Зіставлено з існуючими спортсменами: <strong>{commitResult.athletesMatchedCount}</strong>
                </li>
              </ul>
              <div className="d-flex gap-2">
                <Link
                  href={`/competitions/${commitResult.competitionId}`}
                  className="btn btn-success fw-semibold"
                >
                  🏆 Переглянути результати змагання →
                </Link>
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setCommitResult(null);
                    setFile(null);
                  }}
                >
                  Завантажити ще один файл
                </Button>
              </div>
            </div>
          </div>
        </Alert>
      )}

      {/* Step 1: Upload File */}
      {!previewData && !commitResult && (
        <Card className="shadow-sm border-0 mb-4">
          <Card.Body className="p-4">
            <h5 className="card-title fw-bold mb-3">1. Виберіть файл офіційного протоколу</h5>
            <p className="text-muted small mb-3">
              Підтримуються файли <strong>.docx</strong> (Word), <strong>.doc</strong> та{' '}
              <strong>.txt</strong> (текстовий протокол). Система автоматично витягне дисципліни,
              спортсменів, їх розряди, дати народження та результати забігів і фіналів.
            </p>

            <div
              className="border border-2 border-dashed rounded-3 p-4 text-center bg-body-tertiary mb-3"
              style={{ cursor: 'pointer' }}
              onClick={() => document.getElementById('protocol-file-input')?.click()}
            >
              <div style={{ fontSize: '2.5rem' }} className="mb-2">
                📄
              </div>
              <p className="fw-semibold mb-1">
                {file ? file.name : 'Натисніть тут або перетягніть файл протоколу'}
              </p>
              <span className="text-muted small">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Формати: .docx, .doc, .txt'}
              </span>
              <input
                id="protocol-file-input"
                type="file"
                accept=".docx,.doc,.txt"
                className="d-none"
                onChange={handleFileChange}
              />
            </div>

            <div className="d-flex justify-content-end">
              <Button
                variant="primary"
                size="lg"
                disabled={!file || parsing}
                onClick={handleParse}
                className="d-flex align-items-center gap-2 px-4 shadow-sm"
              >
                {parsing ? (
                  <>
                    <Spinner size="sm" animation="border" />
                    <span>Аналіз протоколу…</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>Аналізувати та перевірити протокол</span>
                  </>
                )}
              </Button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Step 2: Preview & Configuration */}
      {previewData && (
        <div className="d-flex flex-column gap-4">
          {/* Quick Metrics Bar */}
          <Row className="g-3">
            <Col sm={6} md={3}>
              <Card className="border-0 shadow-sm bg-white text-center p-3">
                <span className="text-muted small">Усього результатів</span>
                <span className="fs-3 fw-bold text-primary">{previewData.stats.totalRows}</span>
              </Card>
            </Col>
            <Col sm={6} md={3}>
              <Card className="border-0 shadow-sm bg-white text-center p-3">
                <span className="text-muted small">Дисциплін</span>
                <span className="fs-3 fw-bold text-info">{previewData.stats.disciplinesCount}</span>
              </Card>
            </Col>
            <Col sm={6} md={3}>
              <Card className="border-0 shadow-sm bg-white text-center p-3">
                <span className="text-muted small">Нових спортсменів</span>
                <span className="fs-3 fw-bold text-success">{previewData.stats.newAthletesCount}</span>
              </Card>
            </Col>
            <Col sm={6} md={3}>
              <Card className="border-0 shadow-sm bg-white text-center p-3">
                <span className="text-muted small">Попереджень</span>
                <span
                  className={`fs-3 fw-bold ${
                    previewData.stats.warningsCount ? 'text-warning' : 'text-muted'
                  }`}
                >
                  {previewData.stats.warningsCount}
                </span>
              </Card>
            </Col>
          </Row>

          {/* Target Competition Settings */}
          <Card className="border-0 shadow-sm bg-white">
            <Card.Header className="bg-light fw-bold py-3">🎯 Прив’язка до змагання</Card.Header>
            <Card.Body className="p-4">
              <div className="mb-3 d-flex flex-wrap gap-4">
                <Form.Check
                  type="radio"
                  id="mode-new"
                  name="comp-mode"
                  label="Створити нове змагання (з даних протоколу)"
                  checked={competitionMode === 'new'}
                  onChange={() => setCompetitionMode('new')}
                  className="fw-semibold"
                />
                <Form.Check
                  type="radio"
                  id="mode-existing"
                  name="comp-mode"
                  label="Додати результати до вже створеного змагання"
                  checked={competitionMode === 'existing'}
                  onChange={() => setCompetitionMode('existing')}
                  className="fw-semibold"
                />
              </div>

              {competitionMode === 'new' ? (
                <Row className="g-3">
                  <Col md={12}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Назва змагання</Form.Label>
                      <Form.Control
                        value={newCompName}
                        onChange={(e) => setNewCompName(e.target.value)}
                        placeholder="Наприклад: Чемпіонат Чернігівської області..."
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Дата початку</Form.Label>
                      <Form.Control
                        type="date"
                        value={newCompDate}
                        onChange={(e) => {
                          setNewCompDate(e.target.value);
                          if (e.target.value) {
                            setNewCompYear(new Date(e.target.value).getFullYear());
                          }
                        }}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Дата завершення</Form.Label>
                      <Form.Control
                        type="date"
                        value={newCompEndDate}
                        onChange={(e) => setNewCompEndDate(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Місце проведення</Form.Label>
                      <Form.Control
                        value={newCompLocation}
                        onChange={(e) => setNewCompLocation(e.target.value)}
                        placeholder="м.Чернігів"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Рівень змагання</Form.Label>
                      <Form.Select
                        value={newCompLevel}
                        onChange={(e) => setNewCompLevel(e.target.value)}
                      >
                        <option value="city">Міські</option>
                        <option value="regional">Обласні</option>
                        <option value="national">Національні</option>
                        <option value="international">Міжнародні</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              ) : (
                <Row>
                  <Col md={8}>
                    <Form.Group>
                      <Form.Label className="small fw-bold">Оберіть існуюче змагання</Form.Label>
                      <Form.Select
                        value={selectedCompId}
                        onChange={(e) => setSelectedCompId(e.target.value)}
                      >
                        <option value="">— Оберіть змагання —</option>
                        {competitions?.map((c) => (
                          <option key={c._id} value={c._id}>
                            {c.date ? new Date(c.date).toISOString().slice(0, 10) : ''} · {c.name} (
                            {c.location})
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              )}
            </Card.Body>
          </Card>

          {/* Interactive Preview Table */}
          <Card className="border-0 shadow-sm bg-white">
            <Card.Header className="bg-light d-flex flex-wrap justify-content-between align-items-center gap-2 py-3">
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold">Таблиця розпізнаних результатів</span>
                <Badge bg="secondary" pill>
                  {filteredItems.length} з {previewData.items.length}
                </Badge>
              </div>

              {/* Filtering Toolbar */}
              <div className="d-flex flex-wrap gap-2 align-items-center">
                {/* Search */}
                <Form.Control
                  size="sm"
                  style={{ width: '180px' }}
                  placeholder="Пошук атлета/ДЮСШ…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />

                {/* Discipline select */}
                <Form.Select
                  size="sm"
                  style={{ width: '180px' }}
                  value={filterDiscipline}
                  onChange={(e) => setFilterDiscipline(e.target.value)}
                >
                  <option value="ALL">Всі види ({previewData.disciplinesFound.length})</option>
                  {previewData.disciplinesFound.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </Form.Select>

                {/* Gender toggle */}
                <ButtonGroup size="sm">
                  <Button
                    variant={filterGender === 'ALL' ? 'primary' : 'outline-secondary'}
                    onClick={() => setFilterGender('ALL')}
                  >
                    Всі
                  </Button>
                  <Button
                    variant={filterGender === 'M' ? 'primary' : 'outline-secondary'}
                    onClick={() => setFilterGender('M')}
                  >
                    Ч
                  </Button>
                  <Button
                    variant={filterGender === 'F' ? 'primary' : 'outline-secondary'}
                    onClick={() => setFilterGender('F')}
                  >
                    Ж
                  </Button>
                </ButtonGroup>

                {/* Warnings only toggle */}
                {previewData.stats.warningsCount > 0 && (
                  <Button
                    size="sm"
                    variant={filterWarningsOnly ? 'warning' : 'outline-warning'}
                    onClick={() => setFilterWarningsOnly(!filterWarningsOnly)}
                  >
                    ⚠️ Тільки з помилками ({previewData.stats.warningsCount})
                  </Button>
                )}
              </div>
            </Card.Header>

            <Card.Body className="p-0">
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <Table hover responsive bordered className="mb-0 align-middle small">
                  <thead className="table-light sticky-top bg-light" style={{ zIndex: 1 }}>
                    <tr>
                      <th style={{ width: 40 }} className="text-center">
                        <Form.Check
                          type="checkbox"
                          checked={selectedCount === previewData.items.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                          aria-label="Вибрати все"
                        />
                      </th>
                      <th style={{ width: 60 }}>Місце</th>
                      <th>Спортсмен</th>
                      <th style={{ width: 100 }}>ДН</th>
                      <th style={{ width: 70 }}>Кат.</th>
                      <th style={{ width: 50 }}>Стать</th>
                      <th>ДЮСШ / Команда</th>
                      <th>Дисципліна</th>
                      <th style={{ width: 80 }}>Стадія</th>
                      <th>Результат</th>
                      <th style={{ width: 95 }}>Розряд</th>
                      <th>Статус / Попередження</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr
                        key={item.id}
                        className={
                          !item.selected
                            ? 'table-secondary opacity-50'
                            : item.warnings.length
                            ? 'table-warning-subtle'
                            : ''
                        }
                      >
                        <td className="text-center">
                          <Form.Check
                            type="checkbox"
                            checked={item.selected !== false}
                            onChange={() => handleToggleRow(item.id)}
                            aria-label="Вибрати рядок"
                          />
                        </td>
                        <td>{item.place !== undefined ? item.place : '–'}</td>
                        <td>
                          <div className="fw-semibold">{item.athleteName}</div>
                          {item.isRelay ? (
                            <Badge bg="info" className="text-dark" style={{ fontSize: '0.65rem' }}>
                              Естафета ({item.relayMembers?.length} уч.)
                            </Badge>
                          ) : item.athleteMatch.status === 'exact_match' ? (
                            <Badge bg="primary" style={{ fontSize: '0.65rem' }}>
                              ✓ Знайдено в базі
                            </Badge>
                          ) : item.athleteMatch.status === 'fuzzy_match' ? (
                            <Badge bg="info" className="text-dark" style={{ fontSize: '0.65rem' }}>
                              ~ Схожий спортсмен
                            </Badge>
                          ) : (
                            <Badge bg="success" style={{ fontSize: '0.65rem' }}>
                              + Новий атлет
                            </Badge>
                          )}
                        </td>
                        <td>{item.dobStr || '–'}</td>
                        <td>
                          <Badge bg="secondary" style={{ fontSize: '0.7rem' }}>
                            {item.ageCategory}
                          </Badge>
                        </td>
                        <td>{item.gender === 'M' ? 'Ч' : 'Ж'}</td>
                        <td>
                          <div>{item.teamStr || '–'}</div>
                          {item.schoolName && (
                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                              🏫 {item.schoolName}
                            </div>
                          )}
                        </td>
                        <td>
                          <strong>{item.disciplineCanonicalName}</strong>
                        </td>
                        <td>
                          <Badge
                            bg={item.round === 'фінал' ? 'success' : 'secondary'}
                            style={{ fontSize: '0.7rem' }}
                          >
                            {item.round}
                          </Badge>
                        </td>
                        <td>
                          <div className="fw-bold font-monospace">{item.rawMark}</div>
                          {item.timing && (
                            <span className="text-muted" style={{ fontSize: '0.68rem' }}>
                              {item.timing === 'manual' ? 'ручний' : 'електр.'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-1">
                            {item.sportRank ? (
                              <Badge bg="dark">{item.sportRank}</Badge>
                            ) : !item.waScore ? (
                              <span className="text-muted">–</span>
                            ) : null}
                            {item.waScore != null && (
                              <small className="text-muted" title="Очки World Athletics">
                                {item.waScore}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          {item.warnings.length > 0 ? (
                            <div className="text-danger small">
                              {item.warnings.map((w, i) => (
                                <div key={i}>⚠️ {w}</div>
                              ))}
                            </div>
                          ) : (
                            <Badge bg="light" text="success" className="border border-success">
                              OK
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Card.Body>

            <Card.Footer className="bg-light p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="small">
                Обрано результатів для збереження:{' '}
                <strong className="text-primary fs-6">{selectedCount}</strong> з{' '}
                {previewData.items.length}
              </div>

              <div className="d-flex gap-2">
                <Button
                  variant="outline-secondary"
                  disabled={committing}
                  onClick={() => {
                    setPreviewData(null);
                    setFile(null);
                  }}
                >
                  ✕ Скасувати
                </Button>
                <Button
                  variant="success"
                  size="lg"
                  disabled={selectedCount === 0 || committing}
                  onClick={handleCommit}
                  className="px-4 shadow-sm fw-bold d-flex align-items-center gap-2"
                >
                  {committing ? (
                    <>
                      <Spinner size="sm" animation="border" />
                      <span>Збереження у базу даних…</span>
                    </>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Підтвердити та імпортувати ({selectedCount})</span>
                    </>
                  )}
                </Button>
              </div>
            </Card.Footer>
          </Card>
        </div>
      )}
    </>
  );
}
