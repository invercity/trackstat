'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  Col,
  Form,
  Row,
} from 'react-bootstrap';
import AthletesTable from '@/components/athletes/AthletesTable';
import State from '@/components/State';
import BackButton from '@/components/ui/BackButton';
import PageHeader from '@/components/ui/PageHeader';
import { useFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { Athlete, School } from '@/lib/types';

export default function SchoolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'U16' | 'U18' | 'ADULT'>('ALL');
  const [selectedGender, setSelectedGender] = useState<'ALL' | 'M' | 'F'>('ALL');

  const schoolFetch = useFetch<School>(`/schools/${id}`);
  const athletesFetch = useFetch<Athlete[]>(`/athletes?schoolId=${id}`);

  const school = schoolFetch.data;
  const athletes = athletesFetch.data || [];

  // Filter athletes
  const filteredAthletes = useMemo(() => {
    return athletes.filter((a) => {
      if (selectedGender !== 'ALL' && a.gender !== selectedGender) return false;
      if (selectedCategory !== 'ALL' && a.ageCategory !== selectedCategory) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchName = `${a.lastName} ${a.firstName} ${a.middleName || ''}`.toLowerCase().includes(q);
      const matchCoach = a.coaches?.some((c) => c.toLowerCase().includes(q)) ?? false;
      return matchName || matchCoach;
    });
  }, [athletes, search, selectedCategory, selectedGender]);

  return (
    <>
      <div className="mb-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
        <BackButton href="/schools" label={t('school.backToSchools')} className="mb-0" />
        <div className="d-flex gap-2">
          <Link href="/rankings" className="btn btn-outline-warning btn-sm">
            🏆 {t('nav.rankings')}
          </Link>
          <Link
            href={`/athletes?schoolId=${id}`}
            className="btn btn-outline-primary btn-sm"
          >
            👥 {t('school.openInAthletes')}
          </Link>
        </div>
      </div>

      <State loading={schoolFetch.loading} error={schoolFetch.error}>
        {school && (
          <>
            {/* School Header Card */}
            <Card className="mb-4 shadow-sm border-0 bg-white">
              <Card.Body className="p-4">
                <PageHeader
                  icon="🏫"
                  title={school.name}
                  subtitle={
                    <div>
                      {school.shortName && school.shortName !== school.name && (
                        <div className="text-muted fs-6 mb-1">{school.shortName}</div>
                      )}
                      <div className="text-muted d-flex flex-wrap align-items-center gap-2">
                        {school.city && (
                          <span>
                            📍 <strong>{school.city}</strong>
                          </span>
                        )}
                        {school.region && <span>· {school.region}</span>}
                      </div>
                    </div>
                  }
                  actions={
                    <Badge bg="primary" className="fs-6 px-3 py-2">
                      {athletes.length} {t('school.athletesCount')}
                    </Badge>
                  }
                  className="mb-0"
                />

                {school.notes && (
                  <div className="mt-3 p-3 bg-light rounded text-secondary">
                    {school.notes}
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* School Athletes Section */}
            <Card className="shadow-sm border-0 bg-white mb-4">
              <Card.Header className="bg-transparent py-3 border-bottom d-flex flex-wrap justify-content-between align-items-center gap-2">
                <h5 className="mb-0 fw-bold">
                  👥 {t('school.athletesList')}{' '}
                  <span className="text-muted fs-6 fw-normal">
                    ({filteredAthletes.length} з {athletes.length})
                  </span>
                </h5>
                <Link
                  href={`/athletes?schoolId=${id}`}
                  className="btn btn-sm btn-outline-primary"
                >
                  {t('school.openInAthletes')}
                </Link>
              </Card.Header>

              <Card.Body className="p-3">
                {/* Filters */}
                <Row className="g-2 mb-3 align-items-center">
                  <Col xs={12} md={5}>
                    <Form.Control
                      placeholder={`${t('common.search')} (спортсмен, тренер)...`}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </Col>
                  <Col xs={12} sm={6} md={4}>
                    <ButtonGroup size="sm" className="w-100">
                      <Button
                        variant={selectedCategory === 'ALL' ? 'primary' : 'outline-secondary'}
                        onClick={() => setSelectedCategory('ALL')}
                      >
                        {t('common.all')}
                      </Button>
                      <Button
                        variant={selectedCategory === 'U16' ? 'primary' : 'outline-secondary'}
                        onClick={() => setSelectedCategory('U16')}
                      >
                        U16
                      </Button>
                      <Button
                        variant={selectedCategory === 'U18' ? 'primary' : 'outline-secondary'}
                        onClick={() => setSelectedCategory('U18')}
                      >
                        U18
                      </Button>
                      <Button
                        variant={selectedCategory === 'ADULT' ? 'primary' : 'outline-secondary'}
                        onClick={() => setSelectedCategory('ADULT')}
                      >
                        Дорослі
                      </Button>
                    </ButtonGroup>
                  </Col>
                  <Col xs={12} sm={6} md={3}>
                    <ButtonGroup size="sm" className="w-100">
                      <Button
                        variant={selectedGender === 'ALL' ? 'primary' : 'outline-secondary'}
                        onClick={() => setSelectedGender('ALL')}
                      >
                        {t('common.all')}
                      </Button>
                      <Button
                        variant={selectedGender === 'M' ? 'primary' : 'outline-secondary'}
                        onClick={() => setSelectedGender('M')}
                      >
                        {t('f.M')}
                      </Button>
                      <Button
                        variant={selectedGender === 'F' ? 'primary' : 'outline-secondary'}
                        onClick={() => setSelectedGender('F')}
                      >
                        {t('f.F')}
                      </Button>
                    </ButtonGroup>
                  </Col>
                </Row>

                {/* Athletes Table */}
                <State
                  loading={athletesFetch.loading}
                  error={athletesFetch.error}
                  empty={!athletesFetch.loading && filteredAthletes.length === 0}
                >
                  <AthletesTable
                    items={filteredAthletes}
                    showSchool={false}
                    showGender={true}
                    className="align-middle mb-0"
                  />
                </State>
              </Card.Body>
            </Card>
          </>
        )}
      </State>
    </>
  );
}
