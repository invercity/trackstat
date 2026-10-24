'use client';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Alert, Button, Card, Form, Nav } from 'react-bootstrap';
import { api, auth } from '@/lib/api';
import { useI18n } from '@/lib/i18n';

const resources = ['athletes', 'competitions', 'results', 'schools', 'disciplines', 'seasons'];

function Login({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const [username, setU] = useState('');
  const [password, setP] = useState('');
  const [error, setError] = useState('');
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { token } = await api<{ token: string }>('/auth/login', { method: 'POST', body: { username, password } });
      auth.set(token);
      onDone();
    } catch (err: any) {
      setError(err.message);
    }
  };
  return (
    <Card className="mx-auto" style={{ maxWidth: 360 }}>
      <Card.Body>
        <h1 className="h4 mb-3">{t('admin.title')}</h1>
        <Form onSubmit={submit}>
          <Form.Group className="mb-2">
            <Form.Label>{t('admin.username')}</Form.Label>
            <Form.Control value={username} onChange={(e) => setU(e.target.value)} autoFocus />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Label>{t('admin.password')}</Form.Label>
            <Form.Control type="password" value={password} onChange={(e) => setP(e.target.value)} />
          </Form.Group>
          {error && <Alert variant="danger">{error}</Alert>}
          <Button type="submit" className="w-100">{t('common.login')}</Button>
        </Form>
      </Card.Body>
    </Card>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const params = useParams<{ resource?: string }>();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [logged, setLogged] = useState(false);

  useEffect(() => {
    setLogged(!!auth.get());
    setReady(true);
    const off = () => setLogged(false);
    window.addEventListener('trackstat-logout', off);
    return () => window.removeEventListener('trackstat-logout', off);
  }, []);

  if (!ready) return null;
  if (!logged) return <Login onDone={() => setLogged(true)} />;

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Nav variant="pills" className="flex-wrap gap-1">
          {resources.map((r) => (
            <Nav.Item key={r}>
              <Nav.Link as={Link} href={`/admin/${r}`} active={params?.resource === r}>
                {t(`admin.${r}`)}
              </Nav.Link>
            </Nav.Item>
          ))}
          <Nav.Item>
            <Nav.Link
              as={Link}
              href="/admin/import"
              active={pathname === '/admin/import'}
              className="fw-bold text-success border border-success"
            >
              📥 {t('admin.import')}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              as={Link}
              href="/admin/import-web"
              active={pathname === '/admin/import-web'}
              className="fw-bold text-primary border border-primary"
            >
              🌐 {t('admin.importWeb')}
            </Nav.Link>
          </Nav.Item>
        </Nav>
        <Button variant="outline-secondary" size="sm" onClick={() => { auth.clear(); setLogged(false); }}>
          {t('common.logout')}
        </Button>
      </div>
      {children}
    </>
  );
}
