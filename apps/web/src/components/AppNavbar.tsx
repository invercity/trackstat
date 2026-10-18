'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Container, Nav, Navbar, ToggleButton, ToggleButtonGroup } from 'react-bootstrap';
import { useI18n } from '@/lib/i18n';

const tabs = [
  { href: '/competitions', key: 'nav.competitions' },
  { href: '/results', key: 'nav.results' },
  { href: '/athletes', key: 'nav.athletes' },
  { href: '/relays', key: 'nav.relays' },
  { href: '/schools', key: 'nav.schools' },
  { href: '/rankings', key: 'nav.rankings' },
];

export default function AppNavbar() {
  const { t, lang, setLang } = useI18n();
  const path = usePathname();
  return (
    <Navbar bg="dark" data-bs-theme="dark" expand="md">
      <Container>
        <Navbar.Brand as={Link} href="/">
          🏃 TrackStat
        </Navbar.Brand>
        <Navbar.Toggle />
        <Navbar.Collapse>
          <Nav className="me-auto" activeKey={path}>
            {tabs.map((tab) => (
              <Nav.Link
                key={tab.href}
                as={Link}
                href={tab.href}
                active={path.startsWith(tab.href)}
              >
                {t(tab.key)}
              </Nav.Link>
            ))}
          </Nav>
          <Nav className="align-items-md-center gap-2">
            <ToggleButtonGroup type="radio" name="lang" size="sm" value={lang} onChange={setLang}>
              <ToggleButton id="lang-uk" value="uk" variant="outline-light">
                UA
              </ToggleButton>
              <ToggleButton id="lang-en" value="en" variant="outline-light">
                EN
              </ToggleButton>
            </ToggleButtonGroup>
            <Nav.Link
              as={Link}
              href="/admin"
              active={path.startsWith('/admin')}
              title={t('admin.title')}
              aria-label={t('admin.title')}
              className="px-2 text-decoration-none"
            >
              🔑
            </Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
