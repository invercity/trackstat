'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Badge, Button, Card, Col, Container, Form, Row } from 'react-bootstrap';
import State from '@/components/State';
import PageHeader from '@/components/ui/PageHeader';
import { useFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import type { School } from '@/lib/types';

export default function SchoolsPage() {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const { data: schools, loading, error } = useFetch<School[]>('/schools');

  // Extract unique cities
  const cities = useMemo(() => {
    if (!schools) return [];
    const set = new Set<string>();
    for (const s of schools) {
      if (s.city && s.city.trim()) {
        set.add(s.city.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [schools]);

  // Filtered schools
  const filteredSchools = useMemo(() => {
    if (!schools) return [];
    return schools.filter((s) => {
      if (selectedCity && s.city !== selectedCity) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchShort = s.shortName?.toLowerCase().includes(q) ?? false;
      const matchCity = s.city?.toLowerCase().includes(q) ?? false;
      return matchName || matchShort || matchCity;
    });
  }, [schools, search, selectedCity]);

  // Total statistics
  const totalAthletes = useMemo(() => {
    if (!schools) return 0;
    return schools.reduce((sum, s) => sum + (s.athleteCount || 0), 0);
  }, [schools]);

  return (
    <>
      <PageHeader
        icon="🏫"
        title={t('school.title')}
        subtitle={t('school.subtitle')}
        actions={
          <Link href="/rankings" className="btn btn-outline-warning btn-sm fw-semibold">
            🏆 {t('nav.rankings')}
          </Link>
        }
      />

      {/* Filter and stats row */}
      <Card className="mb-4 shadow-sm border-0 bg-white">
        <Card.Body className="p-3">
          <Row className="g-3 align-items-center">
            <Col xs={12} md={5}>
              <Form.Control
                placeholder={`${t('common.search')} (назва, місто)...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Form.Select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
              >
                <option value="">{t('common.all')} міста</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col xs={12} sm={6} md={3} className="text-md-end text-muted small">
              <div>
                Всього закладів: <strong>{schools?.length || 0}</strong>
              </div>
              <div>
                Зареєстровано спортсменів: <strong>{totalAthletes}</strong>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <State
        loading={loading}
        error={error}
        empty={!loading && filteredSchools.length === 0}
      >
        <Row className="g-3">
          {filteredSchools.map((s) => (
            <Col key={s._id} xs={12} md={6} lg={4}>
              <Card className="h-100 shadow-sm border hover-shadow transition">
                <Card.Body className="d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <span style={{ fontSize: '1.5rem' }}>🏫</span>
                    <Badge bg={(s.athleteCount || 0) > 0 ? 'primary' : 'secondary'}>
                      {s.athleteCount || 0} {t('school.athletesCount')}
                    </Badge>
                  </div>

                  <h5 className="card-title mb-1">
                    <Link
                      href={`/schools/${s._id}`}
                      className="text-decoration-none text-dark fw-bold stretched-link-title"
                    >
                      {s.name}
                    </Link>
                  </h5>

                  {s.shortName && s.shortName !== s.name && (
                    <div className="text-muted small mb-2">{s.shortName}</div>
                  )}

                  <div className="text-muted small mt-auto pt-2">
                    {s.city && (
                      <span className="me-2">
                        📍 {s.city}
                      </span>
                    )}
                    {s.region && <span>({s.region})</span>}
                  </div>

                  {s.notes && (
                    <div className="small text-secondary mt-1 text-truncate" title={s.notes}>
                      {s.notes}
                    </div>
                  )}

                  <div className="d-flex gap-2 mt-3 pt-2 border-top">
                    <Link
                      href={`/schools/${s._id}`}
                      className="btn btn-sm btn-primary flex-fill"
                    >
                      {t('school.viewSchool')}
                    </Link>
                    <Link
                      href={`/athletes?schoolId=${s._id}`}
                      className="btn btn-sm btn-outline-secondary"
                      title={t('school.viewAthletes')}
                    >
                      👥 {s.athleteCount || 0}
                    </Link>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </State>
    </>
  );
}
