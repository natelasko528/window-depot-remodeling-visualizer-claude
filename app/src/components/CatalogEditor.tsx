/**
 * The product catalogue editor.
 *
 * Everything a category is made of is editable here: what it is called, what
 * lines and colours it offers, what those cost, and whether it can be found on
 * a photograph at all. Two of those have consequences beyond this screen —
 * `visualizable` decides what detection is allowed to return, and an uploaded
 * swatch texture becomes the material reference sent to the renderer — so both
 * say so in the interface rather than only in the code.
 */

import { useEffect, useRef, useState } from 'react';
import { PAPER, STEEL, type PanelOption } from '../data';
import {
  storeSwatchImage,
  type Catalog,
  type CatalogCategory,
  type CatalogLine,
  type CatalogSwatch,
} from '../lib/catalog';
import { blobUrl, forgetBlobUrl } from '../lib/db';

const input: React.CSSProperties = {
  height: 42,
  padding: '0 10px',
  border: '1px solid var(--color-divider)',
  background: '#fff',
  fontFamily: 'var(--font-body)',
  fontSize: 14,
  width: '100%',
  minWidth: 0,
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  letterSpacing: '.14em',
  textTransform: 'uppercase',
  color: 'var(--color-neutral-600)',
  marginBottom: 4,
};

function Field({
  name,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  name: string;
  value: string;
  onChange: (next: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label style={{ display: 'block', minWidth: 0 }}>
      <span style={label}>{name}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={input}
      />
    </label>
  );
}

function Row({ children, columns }: { children: React.ReactNode; columns: string }) {
  return <div style={{ display: 'grid', gridTemplateColumns: columns, gap: 8, alignItems: 'end' }}>{children}</div>;
}

function Remove({ onClick, what }: { onClick: () => void; what: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={`Remove ${what}`}
      style={{ height: 42, width: 42, flex: 'none', background: 'none', border: '1px solid var(--color-divider)', cursor: 'pointer', fontSize: 16 }}
    >
      ×
    </button>
  );
}

/** Preview for an uploaded texture, resolved from the blob store. */
function SwatchPreview({ path, hex }: { path?: string; hex: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!path) {
      setUrl(null);
      return;
    }
    void blobUrl(path).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => { cancelled = true; };
  }, [path]);

  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        height: 54,
        border: '1px solid var(--color-neutral-400)',
        background: url ? `center / cover no-repeat url(${url})` : hex,
      }}
    />
  );
}

export function CatalogEditor({
  catalog,
  onCommit,
  onFlash,
}: {
  catalog: Catalog;
  onCommit: (next: Catalog) => void | Promise<unknown>;
  onFlash: (message: string) => void;
}) {
  const names = Object.keys(catalog.categories);
  const [selected, setSelected] = useState(names[0] ?? '');
  const [newName, setNewName] = useState('');
  const upload = useRef<HTMLInputElement>(null);
  const uploadTarget = useRef<number>(0);

  const name = catalog.categories[selected] ? selected : names[0] ?? '';
  const category = catalog.categories[name];

  const write = (patch: Partial<CatalogCategory>) => {
    if (!category) return;
    void onCommit({
      ...catalog,
      categories: { ...catalog.categories, [name]: { ...category, ...patch } },
    });
  };

  const writeLines = (lines: CatalogLine[]) => write({ lines });
  const writeColors = (colors: CatalogSwatch[]) => write({ colors });
  const writeOptions = (options: PanelOption[]) => write({ options });

  const addCategory = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (catalog.categories[trimmed]) {
      onFlash(`${trimmed} is already in the catalogue.`);
      return;
    }
    void onCommit({
      ...catalog,
      categories: {
        ...catalog.categories,
        [trimmed]: {
          title: trimmed,
          brand: '',
          lines: [{ name: 'Standard', note: '', tier: 'Good' }],
          line: 'Standard',
          colors: [{ name: 'White', hex: '#f4f2ee' }],
          color: 'White',
          optionLabel: 'Options',
          options: [],
          visualizable: true,
        },
      },
    });
    setSelected(trimmed);
    setNewName('');
    onFlash(`${trimmed} added. Detection will offer it on the next photo.`);
  };

  const removeCategory = () => {
    if (!category) return;
    const categories = { ...catalog.categories };
    delete categories[name];
    void onCommit({ ...catalog, categories });
    setSelected(Object.keys(categories)[0] ?? '');
    onFlash(`${name} removed from the catalogue.`);
  };

  const pickTexture = (index: number) => {
    uploadTarget.current = index;
    upload.current?.click();
  };

  const onTextureChosen = async (file: File | undefined) => {
    if (!file || !category) return;
    const index = uploadTarget.current;
    const swatch = category.colors[index];
    if (!swatch) return;
    try {
      if (swatch.imagePath) forgetBlobUrl(swatch.imagePath);
      const path = await storeSwatchImage(name, swatch.name, file);
      writeColors(category.colors.map((c, i) => (i === index ? { ...c, imagePath: path } : c)));
      onFlash(`Texture saved for ${swatch.name}. It will be sent with the next render.`);
    } catch (err) {
      onFlash(err instanceof Error ? err.message : 'That texture could not be saved.');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '232px minmax(0, 1fr)', gap: 20, alignItems: 'start' }}>
      <input
        ref={upload}
        type="file"
        accept="image/*"
        onChange={(e) => {
          void onTextureChosen(e.target.files?.[0]);
          e.target.value = '';
        }}
        style={{ display: 'none' }}
      />

      <nav style={{ display: 'grid', gap: 6 }}>
        {names.map((c) => (
          <button
            key={c}
            onClick={() => setSelected(c)}
            aria-current={c === name}
            style={{
              textAlign: 'left',
              padding: '11px 12px',
              minHeight: 46,
              cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              background: c === name ? 'var(--color-accent-900)' : 'transparent',
              color: c === name ? PAPER : 'var(--color-text)',
              border: `1px solid ${c === name ? 'var(--color-accent-900)' : 'var(--color-divider)'}`,
            }}
          >
            {c}
            <span style={{ display: 'block', fontSize: 11, opacity: .6 }}>
              {catalog.categories[c].visualizable ? 'On the photo' : 'Quote only'}
            </span>
          </button>
        ))}

        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input
            value={newName}
            placeholder="New category"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
            style={{ ...input, height: 44 }}
          />
          <button onClick={addCategory} className="btn btn-secondary" style={{ height: 44, padding: '0 12px' }}>Add</button>
        </div>
      </nav>

      {category ? (
        <div style={{ display: 'grid', gap: 22, minWidth: 0 }}>
          <div style={{ display: 'grid', gap: 10 }}>
            <Row columns="1fr 1fr">
              <Field name="Panel heading" value={category.title} onChange={(title) => write({ title })} />
              <Field name="Brand" value={category.brand} onChange={(brand) => write({ brand })} placeholder="CertainTeed" />
            </Row>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', border: '1px solid var(--color-divider)', background: '#fff' }}>
              <input
                type="checkbox"
                checked={category.visualizable}
                onChange={(e) => write({ visualizable: e.target.checked })}
                style={{ width: 20, height: 20, marginTop: 2, flex: 'none' }}
              />
              <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                Can be found on a photo of the house.
                <span style={{ display: 'block', color: 'var(--color-neutral-600)', fontSize: 12.5 }}>
                  Off for interior work — it stays in the quote, but detection will not look for it and
                  it cannot be drawn as an area.
                </span>
              </span>
            </label>
          </div>

          <section>
            <h4 style={{ margin: '0 0 8px' }}>Product lines</h4>
            <div style={{ display: 'grid', gap: 8 }}>
              {category.lines.map((line, i) => (
                <Row key={i} columns="1.2fr 1.6fr .7fr .6fr .7fr 42px">
                  <Field name="Line" value={line.name} onChange={(v) => writeLines(category.lines.map((l, j) => (j === i ? { ...l, name: v } : l)))} />
                  <Field name="Note" value={line.note} onChange={(v) => writeLines(category.lines.map((l, j) => (j === i ? { ...l, note: v } : l)))} />
                  <Field name="Tier" value={line.tier} onChange={(v) => writeLines(category.lines.map((l, j) => (j === i ? { ...l, tier: v } : l)))} />
                  <Field name="Unit" value={line.unit ?? ''} placeholder="sq ft" onChange={(v) => writeLines(category.lines.map((l, j) => (j === i ? { ...l, unit: v || undefined } : l)))} />
                  <Field
                    name="Price"
                    type="number"
                    value={line.unitPrice === undefined ? '' : String(line.unitPrice)}
                    onChange={(v) => writeLines(category.lines.map((l, j) => (j === i ? { ...l, unitPrice: v === '' ? undefined : Number(v) } : l)))}
                  />
                  <Remove
                    what={line.name}
                    onClick={() => {
                      if (category.lines.length === 1) {
                        onFlash('A category needs at least one product line.');
                        return;
                      }
                      const lines = category.lines.filter((_, j) => j !== i);
                      write({ lines, line: category.line === line.name ? lines[0].name : category.line });
                    }}
                  />
                </Row>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 10 }}>
              <button
                onClick={() => writeLines([...category.lines, { name: `Line ${category.lines.length + 1}`, note: '', tier: '' }])}
                className="btn btn-ghost"
                style={{ height: 44, padding: '0 14px' }}
              >
                Add a line
              </button>
              <label style={{ minWidth: 220 }}>
                <span style={label}>Selected by default</span>
                <select value={category.line} onChange={(e) => write({ line: e.target.value })} style={input}>
                  {category.lines.map((l) => <option key={l.name} value={l.name}>{l.name}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section>
            <h4 style={{ margin: '0 0 4px' }}>Colours and finishes</h4>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--color-neutral-700)' }}>
              A texture image is sent to the renderer as the material reference — that is what makes a
              wood laminate come back as wood rather than as a flat brown. Upload a clean crop of the
              finish, not a marketing photo: anything with a border, a caption or a watermark can end
              up painted onto the house.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 12 }}>
              {category.colors.map((swatch, i) => (
                <div key={i} style={{ border: '1px solid var(--color-divider)', padding: 10, display: 'grid', gap: 8, background: '#fff' }}>
                  <SwatchPreview path={swatch.imagePath} hex={swatch.hex} />
                  <Field name="Name" value={swatch.name} onChange={(v) => writeColors(category.colors.map((c, j) => (j === i ? { ...c, name: v } : c)))} />
                  <Row columns="1fr 64px">
                    <Field name="Hex" value={swatch.hex} onChange={(v) => writeColors(category.colors.map((c, j) => (j === i ? { ...c, hex: v } : c)))} />
                    <input
                      type="color"
                      aria-label={`${swatch.name} colour`}
                      value={/^#[0-9a-f]{6}$/i.test(swatch.hex) ? swatch.hex : '#ffffff'}
                      onChange={(e) => writeColors(category.colors.map((c, j) => (j === i ? { ...c, hex: e.target.value } : c)))}
                      style={{ ...input, padding: 2 }}
                    />
                  </Row>
                  <Field
                    name="Texture in words"
                    value={swatch.texture ?? ''}
                    placeholder="Cedar grain, matte"
                    onChange={(v) => writeColors(category.colors.map((c, j) => (j === i ? { ...c, texture: v || undefined } : c)))}
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => pickTexture(i)} className="btn btn-ghost" style={{ height: 42, padding: '0 12px', flex: 1, justifyContent: 'center' }}>
                      {swatch.imagePath ? 'Replace texture' : 'Upload texture'}
                    </button>
                    {swatch.imagePath && (
                      <button
                        onClick={() => {
                          forgetBlobUrl(swatch.imagePath!);
                          writeColors(category.colors.map((c, j) => (j === i ? { ...c, imagePath: undefined } : c)));
                        }}
                        className="btn btn-ghost"
                        style={{ height: 42, padding: '0 12px' }}
                      >
                        Clear
                      </button>
                    )}
                    <Remove
                      what={swatch.name}
                      onClick={() => {
                        if (category.colors.length === 1) {
                          onFlash('A category needs at least one colour.');
                          return;
                        }
                        const colors = category.colors.filter((_, j) => j !== i);
                        write({ colors, color: category.color === swatch.name ? colors[0].name : category.color });
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginTop: 10 }}>
              <button
                onClick={() => writeColors([...category.colors, { name: `Colour ${category.colors.length + 1}`, hex: '#cccccc' }])}
                className="btn btn-ghost"
                style={{ height: 44, padding: '0 14px' }}
              >
                Add a colour
              </button>
              <label style={{ minWidth: 220 }}>
                <span style={label}>Selected by default</span>
                <select value={category.color} onChange={(e) => write({ color: e.target.value })} style={input}>
                  {category.colors.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section>
            <h4 style={{ margin: '0 0 4px' }}>Configuration shown to the homeowner</h4>
            <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--color-neutral-700)' }}>
              These go into the render instruction and onto the selections sheet, so they should read
              the way you would say them out loud.
            </p>
            <Field name="Section heading" value={category.optionLabel} onChange={(optionLabel) => write({ optionLabel })} />
            <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
              {category.options.map((option, i) => (
                <Row key={i} columns="1fr 1.4fr 42px">
                  <Field name="Label" value={option.label} onChange={(v) => writeOptions(category.options.map((o, j) => (j === i ? { ...o, label: v } : o)))} />
                  <Field name="Value" value={option.value} onChange={(v) => writeOptions(category.options.map((o, j) => (j === i ? { ...o, value: v } : o)))} />
                  <Remove what={option.label} onClick={() => writeOptions(category.options.filter((_, j) => j !== i))} />
                </Row>
              ))}
            </div>
            <button
              onClick={() => writeOptions([...category.options, { label: '', value: '' }])}
              className="btn btn-ghost"
              style={{ height: 44, padding: '0 14px', marginTop: 10 }}
            >
              Add a detail
            </button>
          </section>

          <div style={{ borderTop: `1px solid ${STEEL}`, paddingTop: 14 }}>
            <button onClick={removeCategory} className="btn btn-ghost" style={{ height: 46, padding: '0 16px' }}>
              Remove {name} from the catalogue
            </button>
            <p style={{ fontSize: 12.5, color: 'var(--color-neutral-600)', margin: '6px 0 0' }}>
              Existing projects keep the choices already saved against them; the category simply stops
              being offered.
            </p>
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--color-neutral-700)' }}>
          The catalogue is empty. Add a category, or restore the defaults from the Data section below.
        </p>
      )}
    </div>
  );
}
