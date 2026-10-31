'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Badge, Card, Tab, Table, Tabs } from 'react-bootstrap';
import State from '@/components/State';
import BackButton from '@/components/ui/BackButton';
import CategoryBadge from '@/components/ui/CategoryBadge';
import MarkDisplay from '@/components/ui/MarkDisplay';
import PageHeader from '@/components/ui/PageHeader';
import SchoolLink from '@/components/ui/SchoolLink';
import { useFetch } from '@/lib/api';
import { formatDate, fullName } from '@/lib/format';
import { useI18n } from '@/lib/i18n';
import type { Athlete, Mark, Result, Stats } from '@/lib/types';

function MarkCell({ m, type }: { m: Mark | null; type: any }) {
  if (!m) return <span className="text-muted">–</span>;
  return (
    <div>
      <MarkDisplay
        value={m.value}
        type={type}
        timing={m.timing}
        wind={m.wind}
        rank={m.rank}
        waScore={m.waScore}
        showWaTag={true}
      />
      <div className="small text-muted">
        <Link href={`/competitions/${m.competition._id}`}>{m.competition.name}</Link>, {formatDate(m.date)}
      </div>
    </div>
  );
}

function age(birth: string) {
  const b = new Date(birth);
  const n = new Date();
  let a = n.getFullYear() - b.getUTCFullYear();
  if (n < new Date(n.getFullYear(), b.getUTCMonth(), b.getUTCDate())) a--;
  return a;
}

export default function AthletePage() {
  const { id } = useParams<{ id: string }>();
  const { t, dName } = useI18n();
  const athlete = useFetch<Athlete>(`/athletes/${id}`);
  const stats = useFetch<Stats>(`/athletes/${id}/stats`);
  const results = useFetch<Result[]>(`/results?athleteId=${id}`);
  const a = athlete.data;

  return (
    <>
      <BackButton href="/athletes" />
      <State loading={athlete.loading} error={athlete.error}>
        {a && (
          <>
            <Card className="mb-4">
              <Card.Body>
                <PageHeader
                  icon="👤"
                  title={fullName(a)}
                  badge={<CategoryBadge category={a.ageCategory} />}
                  subtitle={
                    <div>
                      {formatDate(a.birthDate)} · {t('a.age')}: {age(a.birthDate)} · {t(`f.${a.gender}`)}
                      {a.region && ` · ${a.region}`}
                    </div>
                  }
                  className="mb-2"
                />
                {a.school ? (
                  <div className="mt-1">
                    <span className="text-muted">{t('f.school')}: </span>
                    <SchoolLink
                      school={a.school}
                      preferShortName={false}
                      className="fw-semibold text-primary text-decoration-none"
                    />
                  </div>
                ) : a.club ? (
                  <div className="text-muted small mt-1">
                    {t('f.club')}: {a.club}
                  </div>
                ) : null}
                {a.coaches.length > 0 && (
                  <div>
                    {t('f.coach')}: {a.coaches.join(', ')}
                  </div>
                )}
                {a.notes && <div className="mt-2">{a.notes}</div>}
              </Card.Body>
            </Card>

            <Tabs defaultActiveKey="pb" className="mb-3">
              <Tab eventKey="pb" title={t('a.pb')}>
                <State loading={stats.loading} error={stats.error} empty={stats.data?.personalBests.length === 0}>
                  <Table bordered responsive className="bg-white align-middle">
                    <thead>
                      <tr>
                        <th>{t('f.discipline')}</th>
                        <th>{t('a.outdoor')}</th>
                        <th>{t('a.indoor')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.data?.personalBests.map((pb) => (
                        <tr key={pb.discipline._id}>
                          <td>{dName(pb.discipline)}</td>
                          <td><MarkCell m={pb.outdoor} type={pb.discipline.type} /></td>
                          <td><MarkCell m={pb.indoor} type={pb.discipline.type} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </State>
              </Tab>

              <Tab eventKey="sb" title={t('a.sb')}>
                <State loading={stats.loading} error={stats.error} empty={stats.data?.seasonBests.length === 0}>
                  {stats.data?.seasonBests.map((sb) => (
                    <Card key={sb.season._id} className="mb-3">
                      <Card.Header className="fw-bold">{sb.season.label}</Card.Header>
                      <Table responsive className="m-0 align-middle">
                        <tbody>
                          {sb.results.map((r) => (
                            <tr key={r.discipline._id}>
                              <td style={{ width: '30%' }}>{dName(r.discipline)}</td>
                              <td><MarkCell m={r} type={r.discipline.type} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </Card>
                  ))}
                </State>
              </Tab>

              <Tab eventKey="all" title={t('a.results')}>
                <State loading={results.loading} error={results.error} empty={results.data?.length === 0}>
                  <Table bordered responsive className="bg-white align-middle">
                    <thead>
                      <tr>
                        <th>{t('f.date')}</th>
                        <th>{t('f.competition')}</th>
                        <th>{t('f.season')}</th>
                        <th>{t('f.discipline')}</th>
                        <th>{t('f.value')}</th>
                        <th>{t('f.rank')}</th>
                        <th>{t('f.waScore')}</th>
                        <th>{t('f.place')}</th>
                        <th>{t('f.category')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.data?.map((r) => (
                        <tr key={r._id}>
                          <td>{formatDate(r.date)}</td>
                          <td><Link href={`/competitions/${r.competition._id}`}>{r.competition.name}</Link></td>
                          <td>{r.season.label}</td>
                          <td>{dName(r.discipline)}{r.round && ` (${r.round})`}</td>
                          <td>
                            <MarkDisplay
                              value={r.value}
                              type={r.discipline.type}
                              timing={r.timing}
                              status={r.status}
                              wind={r.wind}
                            />
                          </td>
                          <td>{r.rank ? <Badge bg="primary">{r.rank}</Badge> : '–'}</td>
                          <td>{r.waScore !== undefined && r.waScore !== null ? <Badge bg="info" text="dark">{r.waScore}</Badge> : '–'}</td>
                          <td>{r.place ?? '–'}</td>
                          <td><CategoryBadge category={r.ageCategory} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </State>
              </Tab>
            </Tabs>
          </>
        )}
      </State>
    </>
  );
}
