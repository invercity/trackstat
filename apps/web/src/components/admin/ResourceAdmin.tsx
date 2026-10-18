'use client';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Modal, Table } from 'react-bootstrap';
import { api, useFetch } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import State from '@/components/State';
import type { FieldDef, Lookups, ResourceDef } from './resources';

const idOf = (v: any) => (v && typeof v === 'object' ? v._id : v);

const emptyValue = (f: FieldDef) => (f.type === 'multi' ? [] : f.type === 'checkbox' ? false : '');

function toForm(def: ResourceDef, item: any) {
  const base = def.toForm ? def.toForm(item) : item;
  const form: Record<string, any> = {};
  for (const f of def.fields) {
    const v = base[f.name];
    if (v === undefined || v === null) form[f.name] = emptyValue(f);
    else if (f.type === 'date') form[f.name] = String(v).slice(0, 10);
    else if (f.type === 'tags') form[f.name] = (v as string[]).join(', ');
    else if (f.type === 'multi') form[f.name] = (v as any[]).map(idOf);
    else if (f.type === 'select') form[f.name] = idOf(v);
    else form[f.name] = v;
  }
  return form;
}

function toPayload(def: ResourceDef, form: Record<string, any>, lookups: Lookups) {
  const out: Record<string, any> = {};
  for (const f of def.fields) {
    const v = form[f.name];
    if (f.type === 'tags') out[f.name] = String(v).split(',').map((s) => s.trim()).filter(Boolean);
    else if (f.type === 'number') out[f.name] = v === '' ? null : Number(v);
    else if (f.type === 'date' || f.type === 'select') out[f.name] = v === '' ? null : v;
    else out[f.name] = v;
  }
  return def.toPayload ? def.toPayload(out, lookups) : out;
}

export default function ResourceAdmin({ def }: { def: ResourceDef }) {
  const { t } = useI18n();
  const [filterValue, setFilterValue] = useState('');
  const [editing, setEditing] = useState<{ id?: string; form: Record<string, any> } | null>(null);
  const [error, setError] = useState('');
  const [lookups, setLookups] = useState<Lookups>({});

  const path = def.filter && filterValue ? `${def.path}?${def.filter.param}=${filterValue}` : def.path;
  const list = useFetch<any[]>(path);

  const refs = useMemo(
    () => [...new Set([...def.fields.map((f) => f.ref), def.filter?.ref].filter(Boolean) as string[])],
    [def],
  );
  useEffect(() => {
    Promise.all(refs.map((r) => api<any[]>(`/${r}`).then((d) => [r, d] as const))).then((pairs) =>
      setLookups(Object.fromEntries(pairs)),
    );
  }, [refs]);

  const optionsOf = (f: FieldDef) =>
    f.options ?? (f.ref ? (lookups[f.ref] ?? []).map((i) => ({ value: i._id, label: def.refLabel[f.ref!](i) })) : []);

  const openNew = () => {
    setError('');
    const form = Object.fromEntries(def.fields.map((f) => [f.name, emptyValue(f)]));
    if (def.filter && filterValue) form[def.filter.ref.replace(/s$/, '')] = filterValue; // competition за фільтром
    if (def.path === '/results') form.status = 'OK';
    setEditing({ form });
  };
  const openEdit = (item: any) => {
    setError('');
    setEditing({ id: item._id, form: toForm(def, item) });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const body = toPayload(def, editing.form, lookups);
      if (editing.id) await api(`${def.path}/${editing.id}`, { method: 'PUT', body });
      else await api(def.path, { method: 'POST', body });
      setEditing(null);
      list.reload();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const remove = async (item: any) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try {
      await api(`${def.path}/${item._id}`, { method: 'DELETE' });
      list.reload();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const set = (name: string, value: any) => setEditing((s) => s && { ...s, form: { ...s.form, [name]: value } });

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3 gap-3">
        <h1 className="h4 m-0">{def.title}</h1>
        {def.filter && (
          <Form.Select style={{ maxWidth: 360 }} value={filterValue} onChange={(e) => setFilterValue(e.target.value)}>
            <option value="">{def.filter.label}: {t('common.all')}</option>
            {(lookups[def.filter.ref] ?? []).map((i) => (
              <option key={i._id} value={i._id}>{def.refLabel[def.filter!.ref](i)}</option>
            ))}
          </Form.Select>
        )}
        <Button onClick={openNew}>+ {t('common.add')}</Button>
      </div>

      <State loading={list.loading && !list.data} error={list.error} empty={list.data?.length === 0}>
        <Table bordered hover responsive size="sm" className="bg-white align-middle">
          <thead>
            <tr>
              {def.columns.map((c) => <th key={c.label}>{c.label}</th>)}
              <th style={{ width: 96 }} />
            </tr>
          </thead>
          <tbody>
            {list.data?.map((item) => (
              <tr key={item._id}>
                {def.columns.map((c) => <td key={c.label}>{c.render(item)}</td>)}
                <td className="text-end text-nowrap">
                  <Button
                    size="sm"
                    variant="outline-primary"
                    className="me-1 py-1 px-2 lh-1"
                    onClick={() => openEdit(item)}
                    title={t('common.edit')}
                    aria-label={t('common.edit')}
                  >
                    ✏️
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    className="py-1 px-2 lh-1"
                    onClick={() => remove(item)}
                    title={t('common.delete')}
                    aria-label={t('common.delete')}
                  >
                    🗑️
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </State>

      <Modal show={!!editing} onHide={() => setEditing(null)} size="lg">
        <Form onSubmit={save}>
          <Modal.Header closeButton>
            <Modal.Title>{def.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {editing &&
              def.fields.map((f) => (
                <Form.Group className="mb-3" key={f.name}>
                  {f.type !== 'checkbox' && <Form.Label>{f.label}</Form.Label>}
                  {f.type === 'checkbox' && (
                    <Form.Check label={f.label} checked={!!editing.form[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
                  )}
                  {f.type === 'select' && (
                    <Form.Select required={f.required} value={editing.form[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)}>
                      <option value="">—</option>
                      {optionsOf(f).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Form.Select>
                  )}
                  {f.type === 'multi' && (
                    <div className="border rounded p-2" style={{ maxHeight: 200, overflowY: 'auto' }}>
                      {optionsOf(f).map((o) => (
                        <Form.Check
                          key={o.value}
                          id={`${f.name}-${o.value}`}
                          label={o.label}
                          checked={editing.form[f.name].includes(o.value)}
                          onChange={(e) =>
                            set(f.name, e.target.checked ? [...editing.form[f.name], o.value] : editing.form[f.name].filter((x: string) => x !== o.value))
                          }
                        />
                      ))}
                    </div>
                  )}
                  {f.type === 'textarea' && (
                    <Form.Control as="textarea" rows={2} value={editing.form[f.name] ?? ''} onChange={(e) => set(f.name, e.target.value)} />
                  )}
                  {['text', 'number', 'date', 'tags'].includes(f.type) && (
                    <Form.Control
                      required={f.required}
                      type={f.type === 'number' || f.type === 'date' ? f.type : 'text'}
                      step={f.step}
                      value={editing.form[f.name] ?? ''}
                      onChange={(e) => set(f.name, e.target.value)}
                    />
                  )}
                  {f.help && <Form.Text muted>{f.help}</Form.Text>}
                </Form.Group>
              ))}
            {error && <Alert variant="danger" className="mb-0">{error}</Alert>}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
            <Button type="submit">{t('common.save')}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
