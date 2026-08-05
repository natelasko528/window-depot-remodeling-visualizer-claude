/**
 * Settings — everything about this tablet that is not a customer.
 *
 * The one thing it deliberately cannot do is store an API key. This device
 * spends its day unlocked on other people's kitchen tables; a key held in the
 * browser is readable by anyone who picks it up or opens devtools, and it bills
 * to the account that owns it. Keys live in the deployment's environment
 * variables, and this screen reports whether they work without ever receiving
 * them.
 */

import { useEffect, useState } from 'react';
import { CatalogEditor } from '../components/CatalogEditor';
import { Corners } from '../components/Corners';
import { PAPER, STEEL } from '../data';
import {
  labelForCategory,
  mergePriceBook,
  parsePriceBook,
  seedCatalog,
  useCatalog,
  type Catalog,
} from '../lib/catalog';
import { MAX_REFERENCES } from '../lib/limits';
import {
  DEFAULT_SETTINGS,
  TIMEOUT_BOUNDS,
  fetchServerStatus,
  hydrate,
  testProvider,
  useSettings,
  type ProviderStatus,
  type ServerStatus,
  type Settings as SettingsShape,
} from '../lib/settings';
import type { Actions } from '../store';

const SECTIONS = [
  { id: 'rep', name: 'This rep' },
  { id: 'providers', name: 'Keys & services' },
  { id: 'render', name: 'Rendering' },
  { id: 'catalog', name: 'Product catalogue' },
  { id: 'pricing', name: 'Pricing import' },
  { id: 'data', name: 'Data & reset' },
] as const;

const input: React.CSSProperties = {
  height: 46,
  padding: '0 12px',
  border: '1px solid var(--color-divider)',
  background: '#fff',
  fontFamily: 'var(--font-body)',
  fontSize: 15,
  width: '100%',
  minWidth: 0,
};

function Panel({ id, title, blurb, children }: { id: string; title: string; blurb?: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ scrollMarginTop: 18, border: '1px solid var(--color-divider)', background: 'var(--color-neutral-100)', padding: '20px 22px 22px' }}>
      <h3 style={{ margin: '0 0 2px' }}>{title}</h3>
      {blurb && <p style={{ margin: '0 0 16px', fontSize: 13.5, color: 'var(--color-neutral-700)', maxWidth: '78ch' }}>{blurb}</p>}
      {children}
    </section>
  );
}

function TextField({
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
  hint,
}: {
  name: string;
  value: string;
  onChange: (next: string) => void;
  type?: string;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      <span style={{ display: 'block', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 4 }}>{name}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={input} />
      {hint && <span style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 4 }}>{hint}</span>}
    </label>
  );
}

function ProviderCard({
  title,
  envVar,
  purpose,
  degraded,
  status,
  onTest,
}: {
  title: string;
  envVar: string;
  purpose: string;
  degraded: string;
  status: ProviderStatus | null;
  onTest: () => void;
}) {
  const [testing, setTesting] = useState(false);

  const run = async () => {
    setTesting(true);
    try {
      await onTest();
    } finally {
      setTesting(false);
    }
  };

  const configured = status?.configured ?? false;

  return (
    <div style={{ border: '1px solid var(--color-divider)', background: '#fff', padding: 16, display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: '50%', background: configured ? '#7fae7a' : '#c9a227' }} />
        <h4 style={{ margin: 0 }}>{title}</h4>
        <span style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--color-neutral-600)' }}>
          {status === null
            ? 'Status unavailable'
            : configured
              ? `Key ending ${status.hint} · ${status.model}`
              : 'No key on this deployment'}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-neutral-700)' }}>{purpose}</p>
      {!configured && (
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-neutral-800)' }}>{degraded}</p>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <button onClick={() => void run()} disabled={testing} className="btn btn-secondary" style={{ height: 44, padding: '0 14px', opacity: testing ? .6 : 1 }}>
          {testing ? 'Checking…' : 'Test connection'}
        </button>
        <code style={{ fontSize: 12.5, color: 'var(--color-neutral-700)' }}>{envVar}</code>
      </div>
    </div>
  );
}

export function Settings({ actions }: { actions: Actions }) {
  const { settings, update, reset } = useSettings();
  const { catalog, commit, reseed } = useCatalog();
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const [priceText, setPriceText] = useState('');
  const [section, setSection] = useState<string>('rep');

  useEffect(() => {
    void fetchServerStatus().then(setStatus);
  }, []);

  // Patches go through as-is: useSettings merges them into the live settings,
  // which is what keeps fast typing from dropping characters.
  const writeRep = (patch: Partial<SettingsShape['rep']>) => void update({ rep: patch });
  const writeRender = (patch: Partial<SettingsShape['render']>) => void update({ render: patch });

  const check = async (provider: 'render' | 'detect') => {
    const result = await testProvider(provider);
    actions.flash(result.message);
    setStatus(await fetchServerStatus());
  };

  const importPrices = () => {
    let rows;
    try {
      rows = parsePriceBook(priceText);
    } catch {
      actions.flash('That did not parse as JSON or CSV. Check the first line.');
      return;
    }
    if (!rows.length) {
      actions.flash('No priceable rows found — each needs a category and a series.');
      return;
    }
    const { catalog: next, added, updated } = mergePriceBook(catalog, rows);
    void commit(next);
    setPriceText('');
    actions.flash(`${added} line${added === 1 ? '' : 's'} added, ${updated} repriced. Colours were left as they were.`);
  };

  const download = (name: string, payload: unknown) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as { settings?: Partial<SettingsShape>; catalog?: Catalog };
      if (parsed.settings) await update(hydrate(parsed.settings));
      if (parsed.catalog?.categories && Object.keys(parsed.catalog.categories).length) {
        await commit(parsed.catalog);
      }
      actions.flash('Configuration restored on this tablet.');
    } catch {
      actions.flash('That file is not a configuration export from this app.');
    }
  };

  const seeded = seedCatalog();
  const categoryCount = Object.keys(catalog.categories).length;
  const colourCount = Object.values(catalog.categories).reduce((n, c) => n + c.colors.length, 0);
  const priced = Object.values(catalog.categories)
    .reduce((n, c) => n + c.lines.filter((l) => typeof l.unitPrice === 'number').length, 0);

  return (
    <section style={{ height: '100%', overflowY: 'auto', padding: '26px 34px 60px' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, marginBottom: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--color-neutral-600)' }}>Settings</div>
            <h2 style={{ margin: '2px 0 0' }}>This tablet</h2>
            <p style={{ color: 'var(--color-neutral-700)', margin: '2px 0 0' }}>
              Saved here as you type, and kept through a refresh or a day with no signal.
            </p>
          </div>
          <button onClick={actions.go('home')} className="btn btn-secondary" style={{ height: 50, padding: '0 18px' }}>Done</button>
        </div>

        <nav style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setSection(s.id)}
              style={{
                height: 44,
                padding: '0 14px',
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 13.5,
                textDecoration: 'none',
                border: `1px solid ${section === s.id ? 'var(--color-accent-900)' : 'var(--color-divider)'}`,
                background: section === s.id ? 'var(--color-accent-900)' : 'transparent',
                color: section === s.id ? PAPER : 'var(--color-text)',
              }}
            >
              {s.name}
            </a>
          ))}
        </nav>

        <div style={{ display: 'grid', gap: 18 }}>
          <Panel
            id="rep"
            title="This rep"
            blurb="Shown in the header and carried onto the PDF the homeowner keeps, so they know who to call."
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              <TextField name="Name" value={settings.rep.name} onChange={(name) => writeRep({ name })} placeholder="Alex Reyes" />
              <TextField name="Market" value={settings.rep.market} onChange={(market) => writeRep({ market })} placeholder="Milwaukee" />
              <TextField name="Rep number" value={settings.rep.repId} onChange={(repId) => writeRep({ repId })} placeholder="214" />
              <TextField name="Phone" type="tel" value={settings.rep.phone} onChange={(phone) => writeRep({ phone })} />
              <TextField name="Email" type="email" value={settings.rep.email} onChange={(email) => writeRep({ email })} />
            </div>
          </Panel>

          <Panel
            id="providers"
            title="Keys & services"
            blurb="API keys are not stored in this browser and cannot be entered here. A key kept on the tablet is readable by anyone holding it, and every charge lands on the account that owns it — so they live in the deployment's environment variables instead. This screen can tell you whether they are present and working."
          >
            <div style={{ display: 'grid', gap: 12 }}>
              <ProviderCard
                title="Rendering — OpenAI"
                envVar="OPENAI_API_KEY"
                purpose="Produces the after image from the photo, the mask and the material references."
                degraded="Without it, everything else still works — photos, areas, selections and the PDF — but no visualization can be generated."
                status={status?.render ?? null}
                onTest={() => check('render')}
              />
              <ProviderCard
                title="Area detection — Anthropic"
                envVar="ANTHROPIC_API_KEY"
                purpose="Reads the photograph and outlines the surfaces worth quoting."
                degraded="Without it, detection is unavailable and areas are drawn by hand on the Areas screen. Nothing else is affected."
                status={status?.detect ?? null}
                onTest={() => check('detect')}
              />
              <div style={{ padding: 14, border: '1px solid var(--color-divider)', fontSize: 13.5, color: 'var(--color-neutral-800)', lineHeight: 1.7 }}>
                To change a key, set it on the deployment (Vercel → Settings → Environment Variables) and
                redeploy. Rotate it there too — a key that has ever been pasted into a chat, an email or a
                screenshot should be replaced rather than reused.
              </div>
            </div>
          </Panel>

          <Panel
            id="render"
            title="Rendering"
            blurb="How much patience the app has, and how much material it sends with each render."
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 4 }}>
                  Give up after
                </span>
                <input
                  type="number"
                  min={TIMEOUT_BOUNDS.min / 1000}
                  max={TIMEOUT_BOUNDS.max / 1000}
                  value={Math.round(settings.render.timeoutMs / 1000)}
                  onChange={(e) => writeRender({ timeoutMs: Number(e.target.value) * 1000 })}
                  style={input}
                />
                <span style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 4 }}>
                  Seconds. The server stops at {Math.round((status?.timeoutMs ?? 180_000) / 1000)}s regardless, so
                  anything longer than that only delays the error.
                </span>
              </label>

              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--color-neutral-600)', marginBottom: 4 }}>
                  Material references per render
                </span>
                <input
                  type="number"
                  min={0}
                  max={MAX_REFERENCES}
                  value={settings.render.maxReferences}
                  onChange={(e) => writeRender({ maxReferences: Number(e.target.value) })}
                  style={input}
                />
                <span style={{ display: 'block', fontSize: 12, color: 'var(--color-neutral-600)', marginTop: 4 }}>
                  Up to {MAX_REFERENCES}. Beyond that the image API refuses the call. Categories past the
                  limit still render — the largest surfaces keep their reference and the rest are described
                  in words.
                </span>
              </label>
            </div>

            <div style={{ marginTop: 14, padding: 14, border: '1px solid var(--color-divider)', background: '#fff', fontSize: 13.5, lineHeight: 1.7 }}>
              <strong>Decided for you.</strong> The output size is matched to each photograph, so the render
              comes back in the same frame as the original and the before/after slider lines up. The models
              ({status?.render.model ?? 'unset'} for rendering, {status?.detect.model ?? 'unset'} for detection)
              are set on the server alongside their keys.
            </div>
          </Panel>

          <Panel
            id="catalog"
            title="Product catalogue"
            blurb={`${categoryCount} categories, ${colourCount} colours, ${priced} priced lines. This is what the Design screen offers, what detection is allowed to find, and what the render is told to apply.`}
          >
            <CatalogEditor catalog={catalog} onCommit={commit} onFlash={actions.flash} />
          </Panel>

          <Panel
            id="pricing"
            title="Pricing import"
            blurb="Paste a price book as CSV or as the JSON the older app exported. Rows are matched on category and series: a line that already exists is repriced, a new one is added, and colours are never touched — a pricing update must not be able to delete a rep's swatches."
          >
            <textarea
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              placeholder={'category,series,style,unit,unitPrice\nwindows,Endure,Double hung,each,742.00\nsiding,ASCEND Composite Cladding,7" clapboard,sq ft,18.40'}
              spellCheck={false}
              style={{ width: '100%', minHeight: 160, padding: 12, border: '1px solid var(--color-divider)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13, background: '#fff', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
              <button onClick={importPrices} disabled={!priceText.trim()} className="btn btn-primary" style={{ height: 48, padding: '0 18px', opacity: priceText.trim() ? 1 : .5 }}>
                Merge into the catalogue
              </button>
              <label className="btn btn-secondary" style={{ height: 48, padding: '0 16px', cursor: 'pointer' }}>
                Choose a file
                <input
                  type="file"
                  accept=".csv,.json,text/csv,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (file) void file.text().then(setPriceText);
                  }}
                  style={{ display: 'none' }}
                />
              </label>
              <span style={{ fontSize: 12.5, color: 'var(--color-neutral-600)' }}>
                Snake-case categories are translated — <code>entry_door</code> becomes “{labelForCategory('entry_door')}”.
              </span>
            </div>
          </Panel>

          <Panel
            id="data"
            title="Data & reset"
            blurb="The settings and the catalogue travel as one file. Uploaded swatch textures stay on the tablet that holds them — they are image blobs, not configuration — so re-upload them after restoring onto a new device."
          >
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                onClick={() => download('window-depot-config.json', { settings, catalog, exportedAt: new Date().toISOString() })}
                className="btn btn-secondary"
                style={{ height: 48, padding: '0 16px' }}
              >
                Export configuration
              </button>
              <label className="btn btn-secondary" style={{ height: 48, padding: '0 16px', cursor: 'pointer' }}>
                Import configuration
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    void importConfig(file);
                  }}
                  style={{ display: 'none' }}
                />
              </label>
              <button
                onClick={() => {
                  void reseed();
                  actions.flash('Catalogue restored to the shipped products.');
                }}
                className="btn btn-ghost"
                style={{ height: 48, padding: '0 16px' }}
              >
                Restore the default catalogue
              </button>
              <button
                onClick={() => {
                  void reset();
                  actions.flash('Settings cleared. The catalogue was left alone.');
                }}
                className="btn btn-ghost"
                style={{ height: 48, padding: '0 16px' }}
              >
                Clear these settings
              </button>
            </div>

            <div className="blueprint" style={{ padding: 16, marginTop: 16 }}>
              <Corners />
              <h4 style={{ margin: '0 0 6px' }}>What is stored where</h4>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5, lineHeight: 1.8, color: 'var(--color-neutral-800)' }}>
                <li>On this tablet — customers, photos, areas, selections, renders, this catalogue and these settings.</li>
                <li>On the server — the provider keys, and nothing else.</li>
                <li>In Supabase, when configured — a synced copy of the project data, queued while offline.</li>
              </ul>
              <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--color-neutral-600)' }}>
                Restoring the defaults would return the catalogue to {Object.keys(seeded.categories).length} categories.
                Settings last saved {settings.updatedAt === DEFAULT_SETTINGS.updatedAt ? 'never' : new Date(settings.updatedAt).toLocaleString()}.
              </p>
            </div>
          </Panel>
        </div>

        <p style={{ marginTop: 20, fontSize: 12.5, color: 'var(--color-neutral-600)', borderTop: `1px solid ${STEEL}`, paddingTop: 12 }}>
          Catalogue last edited {catalog.updatedAt ? new Date(catalog.updatedAt).toLocaleString() : 'never'}.
        </p>
      </div>
    </section>
  );
}
