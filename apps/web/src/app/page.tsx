'use client';

import Link from 'next/link';
import { Badge, Card, Col, Row, Table } from 'react-bootstrap';
import State from '@/components/State';
import CategoryBadge from '@/components/ui/CategoryBadge';
import MarkDisplay from '@/components/ui/MarkDisplay';
import { useFetch } from '@/lib/api';
import { formatDate, fullName } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { CompetitionOverview, TopResultItem } from '@/lib/types';

function TopResultsTable({
  items,
  gender,
  dName,
  t,
}: {
  items: TopResultItem[];
  gender: 'M' | 'F';
  dName: (d: any) => string;
  t: (k: string) => string;
}) {
  if (!items || items.length === 0) {
    return <div className="text-muted small py-2">{t('common.empty')}</div>;
  }

  const isMen = gender === 'M';

  return (
    <Table responsive size="sm" className="align-middle mb-0">
      <thead>
        <tr className="text-muted small">
          <th style={{ width: '36px' }}>#</th>
          <th>{t('f.fullName')}</th>
          <th>{t('f.discipline')}</th>
          <th>{t('f.value')}</th>
          <th style={{ width: '90px' }}>{t('f.rank')}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((r, idx) => (
          <tr key={r._id}>
            <td className="text-muted fw-bold">{idx + 1}</td>
            <td>
              <Link href={`/athletes/${r.athlete._id}`} className="fw-semibold">
                {fullName(r.athlete)}
              </Link>
            </td>
            <td>{dName(r.discipline)}</td>
            <td>
              <MarkDisplay
                value={r.value}
                type={r.discipline.type}
                timing={r.timing}
              />
            </td>
            <td>
              <div className="d-flex align-items-center gap-1">
                {r.rank ? (
                  <Badge bg={isMen ? 'primary' : 'danger'}>{r.rank}</Badge>
                ) : (
                  <span className="text-muted">–</span>
                )}
                {r.waScore !== undefined && r.waScore !== null && (
                  <small className="text-muted" title="Очки World Athletics">
                    {r.waScore}
                  </small>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default function HomePage() {
  const { t, dName } = useI18n();
  const overview = useFetch<CompetitionOverview[]>('/competitions/latest-overview');

  return (
    <>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
        <div>
          <h1 className="h3 mb-1">🏃 {t('home.title')}</h1>
        </div>
        <Link href="/competitions" className="btn btn-outline-secondary btn-sm">
          Усі змагання →
        </Link>
      </div>

      <State loading={overview.loading} error={overview.error} empty={overview.data?.length === 0}>
        {overview.data?.map((comp) => (
          <Card key={comp._id} className="mb-4 shadow-sm">
            <Card.Header className="bg-light py-3">
              <h2 className="h5 mb-1">
                <Link href={`/competitions/${comp._id}`} className="fw-bold">
                  {comp.name}
                </Link>
              </h2>
              <div className="text-muted small d-flex align-items-center gap-1 flex-wrap">
                <span>📅 {formatDate(comp.date)}</span>
                {comp.endDate && <span>– {formatDate(comp.endDate)}</span>}
                {comp.location && <span>· 📍 {comp.location}</span>}
                {comp.season?.label && <span>· 🏆 {comp.season.label}</span>}
                {comp.ageCategories?.map((x) => (
                  <CategoryBadge key={x} category={x} className="ms-1" />
                ))}
              </div>
            </Card.Header>

            <Card.Body className="p-3">
              <Row className="g-4">
                <Col lg={6}>
                  <div className="p-2 border rounded bg-white h-100">
                    <div className="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom">
                      <span className="fs-5">🏃‍♂️</span>
                      <h3 className="h6 fw-bold text-primary mb-0">{t('home.topMen')}</h3>
                    </div>
                    <TopResultsTable items={comp.topMen} gender="M" dName={dName} t={t} />
                  </div>
                </Col>

                <Col lg={6}>
                  <div className="p-2 border rounded bg-white h-100">
                    <div className="d-flex align-items-center gap-2 mb-2 pb-2 border-bottom">
                      <span className="fs-5">🏃‍♀️</span>
                      <h3 className="h6 fw-bold text-danger mb-0">{t('home.topWomen')}</h3>
                    </div>
                    <TopResultsTable items={comp.topWomen} gender="F" dName={dName} t={t} />
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>
        ))}
      </State>
    </>
  );
}
