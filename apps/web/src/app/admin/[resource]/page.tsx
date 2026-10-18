'use client';
import { useParams } from 'next/navigation';
import ResourceAdmin from '@/components/admin/ResourceAdmin';
import { buildResources } from '@/components/admin/resources';
import { useI18n } from '@/lib/i18n';

export default function AdminResourcePage() {
  const { resource } = useParams<{ resource: string }>();
  const i18n = useI18n();
  const def = buildResources(i18n)[resource];
  if (!def) return <p>Unknown resource</p>;
  return <ResourceAdmin key={resource} def={def} />;
}
