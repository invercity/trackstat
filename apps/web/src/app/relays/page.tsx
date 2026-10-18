'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Modal,
  Row,
  Table,
  ToggleButton,
} from 'react-bootstrap';
import State from '@/components/State';
import CategoryBadge from '@/components/ui/CategoryBadge';
import GenderBadge from '@/components/ui/GenderBadge';
import { useFetch } from '@/lib/api';
import { formatValue, fullName } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { RelaySquad, RelayStage } from '@/lib/types';

export default function RelaysPage() {
  const { t } = useI18n();
  const { data: squads, loading, error } = useFetch<RelaySquad[]>('/relays');

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedGender, setSelectedGender] = useState<string>('ALL');
  const [showRulesModal, setShowRulesModal] = useState<boolean>(false);
  const [swedishModes, setSwedishModes] = useState<Record<string, 'standard' | 'smart'>>({});

  const filteredSquads = (squads || []).filter((s) => {
    if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false;
    if (selectedGender !== 'ALL' && s.gender !== selectedGender) return false;
    return true;
  });

  const getStageBadgeVariant = (stage: number) => {
    switch (stage) {
      case 1:
        return 'primary';
      case 2:
        return 'info';
      case 3:
        return 'warning';
      case 4:
        return 'success';
      default:
        return 'secondary';
    }
  };


  return (
    <>
      {/* Page Header */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h2 mb-1 d-flex align-items-center gap-2">
            <span>🏃‍♂️</span>
            <span>{t('relays.title')}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-warning border-0 p-1 ms-1 text-decoration-none"
              style={{ fontSize: '1.25rem', lineHeight: 1 }}
              title="Принципи формування складу"
              onClick={() => setShowRulesModal(true)}
            >
              💡
            </button>
          </h1>
          <p className="text-muted mb-0">{t('relays.subtitle')}</p>
        </div>

        {/* Filter controls */}
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <ButtonGroup size="sm">
            <ToggleButton
              id="cat-all"
              type="radio"
              variant="outline-secondary"
              name="category"
              value="ALL"
              checked={selectedCategory === 'ALL'}
              onChange={(e) => setSelectedCategory(e.currentTarget.value)}
            >
              {t('relays.allCategories')}
            </ToggleButton>
            <ToggleButton
              id="cat-u16"
              type="radio"
              variant="outline-info"
              name="category"
              value="U16"
              checked={selectedCategory === 'U16'}
              onChange={(e) => setSelectedCategory(e.currentTarget.value)}
            >
              U16
            </ToggleButton>
            <ToggleButton
              id="cat-u18"
              type="radio"
              variant="outline-primary"
              name="category"
              value="U18"
              checked={selectedCategory === 'U18'}
              onChange={(e) => setSelectedCategory(e.currentTarget.value)}
            >
              U18
            </ToggleButton>
            <ToggleButton
              id="cat-u21"
              type="radio"
              variant="outline-warning"
              name="category"
              value="U21"
              checked={selectedCategory === 'U21'}
              onChange={(e) => setSelectedCategory(e.currentTarget.value)}
            >
              U21
            </ToggleButton>
            <ToggleButton
              id="cat-u23"
              type="radio"
              variant="outline-warning"
              name="category"
              value="U23"
              checked={selectedCategory === 'U23'}
              onChange={(e) => setSelectedCategory(e.currentTarget.value)}
            >
              U23
            </ToggleButton>
            <ToggleButton
              id="cat-adult"
              type="radio"
              variant="outline-success"
              name="category"
              value="ADULT"
              checked={selectedCategory === 'ADULT'}
              onChange={(e) => setSelectedCategory(e.currentTarget.value)}
            >
              {t('cat.ADULT')}
            </ToggleButton>
          </ButtonGroup>

          <ButtonGroup size="sm">
            <ToggleButton
              id="gen-all"
              type="radio"
              variant="outline-secondary"
              name="gender"
              value="ALL"
              checked={selectedGender === 'ALL'}
              onChange={(e) => setSelectedGender(e.currentTarget.value)}
            >
              {t('relays.allGenders')}
            </ToggleButton>
            <ToggleButton
              id="gen-m"
              type="radio"
              variant="outline-primary"
              name="gender"
              value="M"
              checked={selectedGender === 'M'}
              onChange={(e) => setSelectedGender(e.currentTarget.value)}
            >
              {t('f.M')}
            </ToggleButton>
            <ToggleButton
              id="gen-f"
              type="radio"
              variant="outline-danger"
              name="gender"
              value="F"
              checked={selectedGender === 'F'}
              onChange={(e) => setSelectedGender(e.currentTarget.value)}
            >
              {t('f.F')}
            </ToggleButton>
          </ButtonGroup>
        </div>
      </div>

      {/* Main Content State */}
      <State loading={loading} error={error} empty={filteredSquads.length === 0}>
        <Row className="g-4">
          {filteredSquads.map((squad) => {
            const isMen = squad.gender === 'M';
            const currentMode = swedishModes[squad.id] || 'standard';
            const isSmart = squad.relayType === 'swedish' && currentMode === 'smart' && !!squad.smartSquad;
            const stagesToDisplay = isSmart && squad.smartSquad ? squad.smartSquad.stages : squad.stages;
            const totalTimeToDisplay = isSmart && squad.smartSquad ? squad.smartSquad.totalTimeEstimated : squad.totalTimeEstimated;

            return (
              <Col key={squad.id} xs={12} lg={6}>
                <Card className="h-100 shadow-sm border-0">
                  <Card.Header className="d-flex justify-content-between align-items-center bg-body-tertiary py-3">
                    <div className="d-flex align-items-center gap-2">
                      <span className="fs-5">{isMen ? '🏃‍♂️' : '🏃‍♀️'}</span>
                      <h2 className="h5 mb-0 fw-bold">
                        <Link
                          href={`/relays/${squad.id}`}
                          className="text-primary text-decoration-none d-inline-flex align-items-center gap-1 link-primary"
                          title="Переглянути детальну інформацію про естафету"
                        >
                          <span>{squad.title}</span>
                          <span className="small text-primary opacity-75">↗</span>
                        </Link>
                      </h2>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <CategoryBadge category={squad.category} variant="colored" />
                      <GenderBadge gender={squad.gender} variant="primary" />
                    </div>
                  </Card.Header>

                  {/* Mode switcher for Swedish Relay */}
                  {squad.relayType === 'swedish' && squad.smartSquad && (
                    <div className="bg-light-subtle px-3 py-2 border-bottom d-flex justify-content-between align-items-center flex-wrap gap-2">
                      <div className="d-flex align-items-center gap-1 small text-muted">
                        <span>Режим:</span>
                        <span className="fw-semibold text-dark">
                          {currentMode === 'smart' ? '⚡ Smart (найкращий час)' : 'Звичайний (за критеріями)'}
                        </span>
                      </div>
                      <ButtonGroup size="sm">
                        <Button
                          variant={currentMode === 'standard' ? 'primary' : 'outline-secondary'}
                          size="sm"
                          className="py-0 px-2"
                          style={{ fontSize: '0.8rem' }}
                          onClick={() => setSwedishModes((prev) => ({ ...prev, [squad.id]: 'standard' }))}
                        >
                          {t('relays.modeStandard')}
                        </Button>
                        <Button
                          variant={currentMode === 'smart' ? 'primary' : 'outline-secondary'}
                          size="sm"
                          className="py-0 px-2"
                          style={{ fontSize: '0.8rem' }}
                          title={t('relays.modeSmartTooltip')}
                          onClick={() => setSwedishModes((prev) => ({ ...prev, [squad.id]: 'smart' }))}
                        >
                          {t('relays.modeSmart')}
                        </Button>
                      </ButtonGroup>
                    </div>
                  )}

                  <Card.Body className="p-0">
                    <Table responsive hover size="sm" className="mb-0 align-middle">
                      <thead className="table-light small text-muted">
                        <tr>
                          <th style={{ width: '45px' }} className="text-center">
                            {t('relays.stage')}
                          </th>
                          <th style={{ width: '75px' }}>{t('relays.distance')}</th>
                          <th>{t('relays.athlete')}</th>
                          <th style={{ minWidth: '130px' }}>{t('relays.mark')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stagesToDisplay.map((st: RelayStage) => (
                          <tr key={st.stage}>
                            <td className="text-center">
                              <Badge
                                pill
                                bg={getStageBadgeVariant(st.stage)}
                                className="px-2 py-1"
                              >
                                {st.stage}
                              </Badge>
                            </td>
                            <td className="fw-bold">{st.distance}</td>
                            <td>
                              {st.athlete ? (
                                <div>
                                  <Link
                                    href={`/athletes/${st.athlete._id}`}
                                    className="fw-semibold text-primary"
                                    title={st.role}
                                  >
                                    {fullName(st.athlete)}
                                  </Link>
                                  <div className="text-muted extra-small" style={{ fontSize: '0.8rem' }}>
                                    {st.athlete.club || '–'}
                                    {st.athlete.birthDate &&
                                      ` (${new Date(st.athlete.birthDate).getUTCFullYear()} р.н.)`}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted fst-italic">
                                  {t('common.empty')}
                                </span>
                              )}
                            </td>
                            <td>
                              {st.mark ? (
                                <div>
                                  <span className="fw-bold text-dark">
                                    {formatValue(st.mark.value, 'time', st.mark.timing)}
                                    {st.mark.discipline !== st.distance && (
                                      <span
                                        className="text-danger fw-bold ms-1"
                                        title={t('relays.asteriskNote')}
                                      >
                                        *
                                      </span>
                                    )}
                                  </span>{' '}
                                  <small className="text-muted">
                                    {st.mark.timing === 'manual' ? '(руч.)' : '(ел.)'}
                                  </small>
                                  {st.mark.rank && (
                                    <Badge
                                      bg={isMen ? 'primary' : 'danger'}
                                      className="ms-1"
                                      style={{ fontSize: '0.7rem' }}
                                    >
                                      {st.mark.rank}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted">–</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>

                    {/* Asterisk Footnote if any stage has different base distance */}
                    {stagesToDisplay.some(
                      (st) => st.mark && st.mark.discipline !== st.distance,
                    ) && (
                      <div className="px-3 py-2 bg-light-subtle border-top text-muted small fst-italic">
                        {t('relays.asteriskNote')}
                      </div>
                    )}

                    {/* Smart Mode Indicator Note */}
                    {isSmart && (
                      <div className="px-3 py-1.5 bg-info-subtle border-top text-info-emphasis small">
                        ⚡ Склад для оптимального результату
                      </div>
                    )}
                  </Card.Body>

                  {/* Card Footer with Potential Result */}
                  <Card.Footer className="bg-body-secondary py-2 px-3 small d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted">{t('relays.totalEst')}:</span>
                      {isSmart && (
                        <Badge bg="info" className="text-dark" style={{ fontSize: '0.7rem' }}>
                          ⚡ Smart
                        </Badge>
                      )}
                    </div>
                    {totalTimeToDisplay !== undefined ? (
                      <strong className="text-dark fs-6 font-monospace">
                        ⏱ {formatValue(totalTimeToDisplay, 'time')}
                      </strong>
                    ) : (
                      <span className="text-muted">–</span>
                    )}
                  </Card.Footer>
                </Card>
              </Col>
            );
          })}
        </Row>
      </State>

      {/* Rules Modal triggered by lightbulb 💡 */}
      <Modal show={showRulesModal} onHide={() => setShowRulesModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="h5 mb-0 d-flex align-items-center gap-2">
            <span>💡</span>
            <span>{t('relays.rulesTitle')}</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="small">
          <div className="mb-3">
            <div className="fw-bold text-primary mb-1">Шведська естафета (100-200-300-400 м):</div>
            <p className="mb-1 text-muted">{t('relays.rulesSwedish')}</p>
            <div className="text-info mt-1">
              ⚡ <strong>Режим Smart:</strong> відбір 4-х спортсменів за математично найменшим потенційним часом естафети (перебір усіх можливих комбінацій результатів).
            </div>
          </div>
          <div className="mb-3">
            <div className="fw-bold text-primary mb-1">Естафета 4х100 м:</div>
            <p className="mb-0 text-muted">{t('relays.rules4x100')}</p>
          </div>
          <div className="mb-3">
            <div className="fw-bold text-primary mb-1">Естафета 4х400 м:</div>
            <p className="mb-0 text-muted">{t('relays.rules4x400')}</p>
          </div>
          <div className="mb-3">
            <div className="fw-bold text-primary mb-1">Естафета 4х800 м:</div>
            <p className="mb-0 text-muted">{t('relays.rules4x800')}</p>
          </div>
          <div className="border-top pt-2 text-muted fst-italic">
            {t('relays.rulesTiming')}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" size="sm" onClick={() => setShowRulesModal(false)}>
            Зрозуміло
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
