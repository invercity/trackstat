'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Row,
  Table,
} from 'react-bootstrap';
import State from '@/components/State';
import BackButton from '@/components/ui/BackButton';
import { useFetch } from '@/lib/api';
import { formatValue, fullName } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { RelaySquad, RelayStage } from '@/lib/types';

export default function RelayDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const { data: squad, loading, error } = useFetch<RelaySquad>(id ? `/relays/${id}` : null);
  const [mode, setMode] = useState<'standard' | 'smart'>('standard');

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

  const getCategoryBadgeVariant = (cat: string) => {
    switch (cat) {
      case 'U16':
        return 'info';
      case 'U18':
        return 'primary';
      case 'U20':
      case 'U21':
      case 'U23':
        return 'warning';
      case 'ADULT':
        return 'success';
      default:
        return 'secondary';
    }
  };

  return (
    <>
      <BackButton href="/relays" />
      <State loading={loading} error={error} empty={!squad}>
        {squad && (
          <div>
            {/* Header section */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="fs-3">{squad.gender === 'M' ? '🏃‍♂️' : '🏃‍♀️'}</span>
                  <h1 className="h2 mb-0 fw-bold">{squad.title}</h1>
                </div>
                <div className="text-muted">
                  {t('relays.detailsTitle')} • {squad.category === 'ADULT' ? t('cat.ADULT') : squad.category} •{' '}
                  {squad.gender === 'M' ? t('f.M') : t('f.F')}
                </div>
              </div>

              <div className="d-flex align-items-center gap-2">
                <Badge bg={getCategoryBadgeVariant(squad.category)} className="fs-6 px-3 py-2">
                  {squad.category === 'ADULT' ? t('cat.ADULT') : squad.category}
                </Badge>
                <Badge bg={squad.gender === 'M' ? 'primary' : 'danger'} className="fs-6 px-3 py-2">
                  {squad.gender === 'M' ? t('f.M') : t('f.F')}
                </Badge>
              </div>
            </div>

            {/* Mode switcher for Swedish Relay */}
            {(() => {
              const isSmart = squad.relayType === 'swedish' && mode === 'smart' && !!squad.smartSquad;
              const stagesToDisplay = isSmart && squad.smartSquad ? squad.smartSquad.stages : squad.stages;
              const totalTimeToDisplay = isSmart && squad.smartSquad ? squad.smartSquad.totalTimeEstimated : squad.totalTimeEstimated;

              return (
                <>
                  {squad.relayType === 'swedish' && squad.smartSquad && (
                    <Card className="mb-4 border-0 shadow-sm bg-body-tertiary">
                      <Card.Body className="py-2 px-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                        <div className="d-flex align-items-center gap-2">
                          <span className="fw-semibold">Режим визначення розрахунку:</span>
                          <span className="text-muted small">
                            {mode === 'smart'
                              ? '⚡ Smart — перебір комбінацій для найкращого потенційного часу'
                              : 'Звичайний — послідовний відбір за критеріями етапів'}
                          </span>
                        </div>
                        <ButtonGroup size="sm">
                          <Button
                            variant={mode === 'standard' ? 'primary' : 'outline-secondary'}
                            size="sm"
                            className="px-3"
                            onClick={() => setMode('standard')}
                          >
                            {t('relays.modeStandard')}
                          </Button>
                          <Button
                            variant={mode === 'smart' ? 'primary' : 'outline-secondary'}
                            size="sm"
                            className="px-3"
                            title={t('relays.modeSmartTooltip')}
                            onClick={() => setMode('smart')}
                          >
                            {t('relays.modeSmart')}
                          </Button>
                        </ButtonGroup>
                      </Card.Body>
                    </Card>
                  )}

                  {/* Potential Result Banner */}
                  <Alert
                    variant={isSmart ? 'info' : 'primary'}
                    className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2 py-3 px-4 shadow-sm"
                  >
                    <div>
                      <div className={`small text-uppercase fw-semibold ${isSmart ? 'text-info-emphasis' : 'text-primary'}`}>
                        {t('relays.totalEst')}{' '}
                        {isSmart && (
                          <Badge bg="info" className="text-dark ms-1">
                            ⚡ Smart
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted small">
                        {isSmart
                          ? squad.smartSquad?.description || 'Склад для оптимального результату'
                          : squad.relayType === 'swedish'
                          ? 'Розраховано як сума етапів (100м + 200м + 0.75×400м для 300м + 400м)'
                          : 'Розраховано як сума кваліфікаційних результатів 4-х учасників основного складу'}
                      </div>
                    </div>
                    <div>
                      {totalTimeToDisplay !== undefined ? (
                        <span className={`fs-3 fw-bold font-monospace ${isSmart ? 'text-info-emphasis' : 'text-primary'}`}>
                          ⏱ {formatValue(totalTimeToDisplay, 'time')}
                        </span>
                      ) : (
                        <span className="text-muted fs-4">–</span>
                      )}
                    </div>
                  </Alert>

                  {/* Main Squad Section */}
                  <Card className="mb-4 shadow-sm border-0">
                    <Card.Header className="bg-body-tertiary py-3 d-flex justify-content-between align-items-center">
                      <h2 className="h5 mb-0 fw-bold">1. {t('relays.mainSquad')}</h2>
                      <div className="d-flex align-items-center gap-2">
                        {isSmart && <Badge bg="info" className="text-dark">⚡ Smart підбір</Badge>}
                        <Badge bg="success">4 учасники</Badge>
                      </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                      <Table responsive hover className="mb-0 align-middle">
                        <thead className="table-light small text-muted">
                          <tr>
                            <th style={{ width: '55px' }} className="text-center">
                              {t('relays.stage')}
                            </th>
                            <th style={{ width: '90px' }}>{t('relays.distance')}</th>
                            <th>{t('relays.athlete')}</th>
                            <th style={{ minWidth: '150px' }}>{t('relays.mark')}</th>
                            <th>Тактичне призначення на етапі</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stagesToDisplay.map((st: RelayStage) => (
                            <tr key={st.stage}>
                              <td className="text-center">
                                <Badge
                                  pill
                                  bg={getStageBadgeVariant(st.stage)}
                                  className="px-2 py-1 fs-6"
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
                                      className="fw-semibold text-primary fs-6"
                                    >
                                      {fullName(st.athlete)}
                                    </Link>
                                    <div className="text-muted small">
                                      {st.athlete.club || '–'}
                                      {st.athlete.birthDate &&
                                        ` (${new Date(st.athlete.birthDate).getUTCFullYear()} р.н.)`}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-muted fst-italic">{t('common.empty')}</span>
                                )}
                              </td>
                              <td>
                                {st.mark ? (
                                  <div>
                                    <span className="fw-bold fs-6">
                                      {formatValue(st.mark.value, 'time', st.mark.timing)}
                                    </span>{' '}
                                    <small className="text-muted">
                                      {st.mark.timing === 'manual' ? '(руч.)' : '(ел.)'}
                                    </small>
                                    {st.mark.rank && (
                                      <Badge
                                        bg={squad.gender === 'M' ? 'primary' : 'danger'}
                                        className="ms-1"
                                      >
                                        {st.mark.rank}
                                      </Badge>
                                    )}
                                    {st.mark.discipline !== st.distance && (
                                      <div className="text-muted extra-small" style={{ fontSize: '0.75rem' }}>
                                        базова дистанція: {st.mark.discipline}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-muted">–</span>
                                )}
                              </td>
                              <td>
                                <span className="small text-secondary">{st.role}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card.Body>
                  </Card>
                </>
              );
            })()}

            {/* Selection Rules & Criteria Section (Fully Expanded) */}
            <Card className="mb-4 shadow-sm border-0">
              <Card.Header className="bg-body-tertiary py-3">
                <h2 className="h5 mb-0 fw-bold d-flex align-items-center gap-2">
                  <span>💡</span> 2. {t('relays.selectionRules')}
                </h2>
              </Card.Header>
              <Card.Body>
                {squad.relayType === 'swedish' ? (
                  <div>
                    <h6 className="fw-bold text-primary mb-2">
                      Принципи формування шведської естафети (100-200-300-400 м):
                    </h6>
                    <ul className="mb-3 ps-3">
                      <li className="mb-2">
                        <strong>4-й етап (400 м):</strong> відбирається спортсмен з найшвидшим результатом на 400 м серед усіх кандидатів даної вікової категорії (фінішер та лідер команди).
                      </li>
                      <li className="mb-2">
                        <strong>3-й етап (300 м):</strong> відбирається спортсмен з 2-м результатом на 400 м серед тих, хто залишився після призначення 4-го етапу.
                      </li>
                      <li className="mb-2">
                        <strong>2-й етап (200 м):</strong> відбирається спортсмен з найшвидшим результатом на 200 м серед тих, хто залишився після розподілу 4-го та 3-го етапів.
                      </li>
                      <li className="mb-2">
                        <strong>1-й етап (100 м):</strong> відбирається спортсмен з найшвидшим результатом на 100 м серед тих, хто залишився після розподілу всіх попередніх етапів.
                      </li>
                      <li>
                        <strong>Запасні претенденти:</strong> для кожного окремого етапу формується резервний список з до 3-х найшвидших атлетів категорії, що не увійшли до основного складу.
                      </li>
                    </ul>

                    <div className="p-3 bg-info-subtle border rounded text-info-emphasis mt-3">
                      <div className="fw-bold mb-1">⚡ Режим Smart (визначення розрахунку):</div>
                      <p className="mb-0 small">
                        У режимі «Smart» учасники відбираються не за черговістю критеріїв відбору, а за найкращим потенційним часом естафети — тобто повним перебором усіх можливих комбінацій наявних результатів кандидатів. Це дозволяє команді показати абсолютно найшвидший розрахунковий час на фініші, якщо швидший бігун на 400 м принесе більше переваги на 200 м або навпаки.
                      </p>
                    </div>
                  </div>
                ) : squad.relayType === '4x100' ? (
                  <div>
                    <h6 className="fw-bold text-primary mb-2">
                      Принципи формування естафети 4х100 м:
                    </h6>
                    <ul className="mb-3 ps-3">
                      <li className="mb-2">
                        <strong>4-й етап (фінішер):</strong> 1-й за силою спортсмен на 100 м — найшвидший спринтер команди на фінішній прямій.
                      </li>
                      <li className="mb-2">
                        <strong>2-й етап (пряма):</strong> 2-й за силою спортсмен на 100 м — довгий етап по прямій з передачею палички на високій швидкості.
                      </li>
                      <li className="mb-2">
                        <strong>1-й етап (старт):</strong> 3-й за силою спортсмен на 100 м — надійний та стабільний старт з колодок по віражу.
                      </li>
                      <li className="mb-2">
                        <strong>3-й етап (віраж):</strong> 4-й за силою спортсмен на 100 м — технічний біг по віражу з входом у заключну передачу.
                      </li>
                      <li>
                        <strong>Запасні:</strong> 5-й, 6-й та 7-й за силою спортсмени рейтингу на 100 м.
                      </li>
                    </ul>
                  </div>
                ) : (
                  <div>
                    <h6 className="fw-bold text-primary mb-2">
                      Принципи формування естафети 4х400 м:
                    </h6>
                    <ul className="mb-3 ps-3">
                      <li className="mb-2">
                        <strong>4-й етап (фінішер):</strong> 1-й за силою спортсмен на 400 м — лідер, здатний виграти фінішний спурт.
                      </li>
                      <li className="mb-2">
                        <strong>1-й етап (старт):</strong> 2-й за силою спортсмен на 400 м — біг по окремих доріжках зі стартових колодок.
                      </li>
                      <li className="mb-2">
                        <strong>2-й етап (брівка):</strong> 3-й за силою спортсмен на 400 м — перехід на загальну брівку та боротьба за позицію.
                      </li>
                      <li className="mb-2">
                        <strong>3-й етап (утримання):</strong> 4-й за силою спортсмен на 400 м — утримання позиції на передостанньому етапі.
                      </li>
                      <li>
                        <strong>Запасні:</strong> 5-й, 6-й та 7-й за силою спортсмени рейтингу на 400 м.
                      </li>
                    </ul>
                  </div>
                )}
                <div className="small text-muted border-top pt-2 mt-2 fst-italic">
                  * Правило порівняння хронометражу: результати ручного хронометражу при порівнянні з електронним отримують поправку +0.24 секунди.
                </div>
              </Card.Body>
            </Card>

            {/* Potential Reserves & Contenders Section (Fully Expanded, No Dropdowns) */}
            <Card className="mb-4 shadow-sm border-0">
              <Card.Header className="bg-body-tertiary py-3 d-flex justify-content-between align-items-center">
                <h2 className="h5 mb-0 fw-bold d-flex align-items-center gap-2">
                  <span>🔄</span> 3. {t('relays.contendersTitle')}
                </h2>
                <span className="small text-muted">
                  {squad.relayType === 'swedish'
                    ? t('relays.contendersSwedishDesc')
                    : t('relays.contendersOtherDesc')}
                </span>
              </Card.Header>
              <Card.Body>
                {squad.relayType === 'swedish' && squad.stageReserves ? (
                  <Row className="g-4">
                    {squad.stageReserves.map((sr) => (
                      <Col key={sr.stage} xs={12} md={6}>
                        <Card className="h-100 border">
                          <Card.Header className="bg-light py-2 d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center gap-2">
                              <Badge bg={getStageBadgeVariant(sr.stage)} pill className="px-2 py-1">
                                {sr.stage}
                              </Badge>
                              <strong className="text-primary">
                                Етап {sr.stage} ({sr.distance})
                              </strong>
                            </div>
                            <span className="small text-muted">
                              база: {sr.stage === 3 ? '400 м' : sr.distance}
                            </span>
                          </Card.Header>
                          <Card.Body className="p-0">
                            {sr.candidates.length > 0 ? (
                              <Table responsive hover size="sm" className="mb-0 align-middle">
                                <thead className="table-light small text-muted">
                                  <tr>
                                    <th style={{ width: '40px' }}>#</th>
                                    <th>{t('f.fullName')}</th>
                                    <th style={{ width: '130px' }}>{t('f.value')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sr.candidates.map((c, idx) => (
                                    <tr key={c.athlete._id}>
                                      <td className="text-muted fw-bold">#{idx + 1}</td>
                                      <td>
                                        <Link
                                          href={`/athletes/${c.athlete._id}`}
                                          className="fw-semibold text-dark"
                                        >
                                          {fullName(c.athlete)}
                                        </Link>
                                        <div
                                          className="text-muted extra-small"
                                          style={{ fontSize: '0.75rem' }}
                                        >
                                          {c.athlete.club || '–'}
                                          {c.athlete.birthDate &&
                                            ` (${new Date(c.athlete.birthDate).getUTCFullYear()})`}
                                        </div>
                                      </td>
                                      <td>
                                        <span className="fw-bold">
                                          {formatValue(c.mark.value, 'time', c.mark.timing)}
                                        </span>{' '}
                                        <small className="text-muted">
                                          {c.mark.timing === 'manual' ? '(руч.)' : '(ел.)'}
                                        </small>
                                        {c.mark.rank && (
                                          <Badge
                                            bg="secondary"
                                            className="ms-1"
                                            style={{ fontSize: '0.7rem' }}
                                          >
                                            {c.mark.rank}
                                          </Badge>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </Table>
                            ) : (
                              <div className="p-3 text-muted small fst-italic">
                                {t('relays.noReserves')}
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div>
                    {squad.reserves && squad.reserves.length > 0 ? (
                      <Table responsive hover className="mb-0 align-middle">
                        <thead className="table-light small text-muted">
                          <tr>
                            <th style={{ width: '60px' }}>Рейтинг</th>
                            <th>{t('f.fullName')}</th>
                            <th>{t('f.club')}</th>
                            <th style={{ width: '160px' }}>{t('f.value')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {squad.reserves.map((res, idx) => (
                            <tr key={res.athlete._id}>
                              <td>
                                <Badge bg="secondary" pill className="px-2 py-1">
                                  #{idx + 1}
                                </Badge>
                              </td>
                              <td>
                                <Link
                                  href={`/athletes/${res.athlete._id}`}
                                  className="fw-semibold text-dark fs-6"
                                >
                                  {fullName(res.athlete)}
                                </Link>
                                {res.athlete.birthDate && (
                                  <span className="text-muted small ms-2">
                                    ({new Date(res.athlete.birthDate).getUTCFullYear()} р.н.)
                                  </span>
                                )}
                              </td>
                              <td>{res.athlete.club || '–'}</td>
                              <td>
                                <span className="fw-bold fs-6">
                                  {formatValue(res.mark.value, 'time', res.mark.timing)}
                                </span>{' '}
                                <small className="text-muted">
                                  {res.mark.timing === 'manual' ? '(руч.)' : '(ел.)'}
                                </small>
                                {res.mark.rank && (
                                  <Badge bg="secondary" className="ms-1">
                                    {res.mark.rank}
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    ) : (
                      <div className="text-muted fst-italic p-2">{t('relays.noReserves')}</div>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          </div>
        )}
      </State>
    </>
  );
}
