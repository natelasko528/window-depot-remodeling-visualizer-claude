/**
 * Homeowner deliverable.
 *
 * Generated entirely client-side so it works at the kitchen table with no
 * signal — the whole point of the appointment. jsPDF draws from the blobs
 * already in IndexedDB rather than fetching anything.
 */

import { jsPDF } from 'jspdf';
import { getBlob } from './db';
import { blobToDataUrl } from './image';
import { selectionsFor } from '../derived';
import { activeSettings } from './settings';
import type { SessionData } from '../session';

const INK = '#1d2d3d';
const MUTED = '#5a6673';
const PAGE = { w: 210, h: 297, margin: 16 };

async function imageFor(path: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  const blob = await getBlob(path);
  if (!blob) return null;
  const dataUrl = await blobToDataUrl(blob);
  const bitmap = await createImageBitmap(blob);
  const dims = { w: bitmap.width, h: bitmap.height };
  bitmap.close();
  return { dataUrl, ...dims };
}

/** Scales an image to fit a box, preserving aspect ratio. */
function fit(w: number, h: number, maxW: number, maxH: number) {
  const scale = Math.min(maxW / w, maxH / h);
  return { w: w * scale, h: h * scale };
}

function heading(doc: jsPDF, text: string, y: number) {
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(text, PAGE.margin, y);
  return y + 7;
}

function label(doc: jsPDF, text: string, y: number) {
  doc.setTextColor(MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(text.toUpperCase(), PAGE.margin, y);
  return y + 5;
}

export async function buildProjectPdf(session: SessionData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const contentW = PAGE.w - PAGE.margin * 2;
  const customer = session.customer;

  // ---------------------------------------------------------------- cover
  doc.setFillColor(INK);
  doc.rect(0, 0, PAGE.w, 34, 'F');
  doc.setTextColor('#f2f2f3');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('WINDOW DEPOT', PAGE.margin, 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Project visualization & selections', PAGE.margin, 24);

  let y = 48;
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(customer?.name ?? 'Project summary', PAGE.margin, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(MUTED);
  for (const line of [customer?.address, [customer?.phone, customer?.email].filter(Boolean).join('  ·  ')]) {
    if (!line) continue;
    doc.text(line, PAGE.margin, y);
    y += 6;
  }
  doc.text(`Prepared ${new Date().toLocaleDateString()}`, PAGE.margin, y);
  y += 6;

  // Who to call. Taken from settings so a shared tablet handed to another rep
  // stops putting the previous one's number in front of the homeowner.
  const rep = activeSettings().rep;
  const repLine = [rep.name, rep.phone, rep.email].filter(Boolean).join('  ·  ');
  if (repLine) {
    doc.text(repLine, PAGE.margin, y);
    y += 6;
  }
  y += 6;

  // Cover image: the favourite render if there is one, else the photo.
  const favorite = session.versions.find((v) => v.isFavorite) ?? session.versions[session.versions.length - 1];
  const photo = session.photos.find((p) => p.id === session.activePhotoId) ?? session.photos[0];
  const cover = favorite ? await imageFor(favorite.storagePath) : photo ? await imageFor(photo.storagePath) : null;

  if (cover) {
    const box = fit(cover.w, cover.h, contentW, 120);
    doc.addImage(cover.dataUrl, 'JPEG', PAGE.margin, y, box.w, box.h);
    y += box.h + 6;
    doc.setFontSize(10);
    doc.setTextColor(MUTED);
    doc.text(favorite ? `${favorite.name} — ${favorite.meta}` : 'Today', PAGE.margin, y);
  }

  // ------------------------------------------------------- before / after
  for (const version of session.versions) {
    const after = await imageFor(version.storagePath);
    const beforeImg = photo ? await imageFor(photo.storagePath) : null;
    if (!after) continue;

    doc.addPage();
    let py = 22;
    py = heading(doc, `${version.name} — ${version.meta}`, py);

    const half = (contentW - 6) / 2;
    if (beforeImg) {
      py = label(doc, 'Today', py + 2);
      const b = fit(beforeImg.w, beforeImg.h, half, 90);
      const a = fit(after.w, after.h, half, 90);
      doc.addImage(beforeImg.dataUrl, 'JPEG', PAGE.margin, py, b.w, b.h);
      doc.addImage(after.dataUrl, 'PNG', PAGE.margin + half + 6, py, a.w, a.h);
      doc.setFontSize(9);
      doc.setTextColor(MUTED);
      doc.text('PROPOSED', PAGE.margin + half + 6, py - 2);
      py += Math.max(b.h, a.h) + 10;
    } else {
      const a = fit(after.w, after.h, contentW, 150);
      doc.addImage(after.dataUrl, 'PNG', PAGE.margin, py, a.w, a.h);
      py += a.h + 10;
    }

    doc.setFontSize(9.5);
    doc.setTextColor(MUTED);
    for (const instruction of version.instructions) {
      const lines = doc.splitTextToSize(`• ${instruction}`, contentW);
      if (py > PAGE.h - 30) break;
      doc.text(lines, PAGE.margin, py);
      py += lines.length * 4.6 + 1.5;
    }
  }

  // ----------------------------------------------------------- selections
  const rows = selectionsFor(session);
  if (rows.length) {
    doc.addPage();
    let py = heading(doc, 'Selections', 22);
    py += 2;

    for (const row of rows) {
      if (py > PAGE.h - 34) {
        doc.addPage();
        py = 22;
      }
      doc.setDrawColor('#d8dce0');
      doc.line(PAGE.margin, py, PAGE.w - PAGE.margin, py);
      py += 6;

      doc.setTextColor(INK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text(row.cat, PAGE.margin, py);

      // Colour chip, so the homeowner can match what they saw on screen.
      doc.setFillColor(row.hex);
      doc.rect(PAGE.w - PAGE.margin - 20, py - 4, 5, 5, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(MUTED);
      doc.text(row.color, PAGE.w - PAGE.margin - 13, py);
      py += 5.5;

      doc.setFontSize(10);
      doc.setTextColor(INK);
      doc.text(row.line, PAGE.margin, py);
      py += 5;

      doc.setFontSize(9);
      doc.setTextColor(MUTED);
      for (const text of [row.config, `Where: ${row.where}`, row.price && `Price: ${row.price}`].filter(Boolean) as string[]) {
        const lines = doc.splitTextToSize(text, contentW);
        doc.text(lines, PAGE.margin, py);
        py += lines.length * 4 + 1;
      }
      py += 4;
    }
  }

  // Footer on every page.
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(
      [`Window Depot`, customer?.name, rep.name, `page ${i} of ${pages}`].filter(Boolean).join('  ·  '),
      PAGE.margin,
      PAGE.h - 8,
    );
  }

  return doc.output('blob');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * One-page product sheet a rep can hand over or leave behind. Built from the
 * same catalogue the picker uses, so it can never drift from what was shown
 * on screen.
 */
export function buildBrochurePdf(entry: {
  cat: string;
  brand: string;
  lines: string;
  cached: string;
  swatches: string[];
}): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const contentW = PAGE.w - PAGE.margin * 2;

  doc.setFillColor(INK);
  doc.rect(0, 0, PAGE.w, 30, 'F');
  doc.setTextColor('#f2f2f3');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('WINDOW DEPOT', PAGE.margin, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(entry.cat.toUpperCase(), PAGE.margin, 23);

  let y = 46;
  doc.setTextColor(INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text(entry.brand, PAGE.margin, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(MUTED);
  for (const line of doc.splitTextToSize(entry.lines, contentW)) {
    doc.text(line, PAGE.margin, y);
    y += 6;
  }

  y += 6;
  y = label(doc, 'Representative colours', y);
  const chip = 22;
  entry.swatches.forEach((hex, i) => {
    const x = PAGE.margin + i * (chip + 4);
    doc.setFillColor(hex);
    doc.rect(x, y, chip, chip, 'F');
    doc.setDrawColor('#b9bfc6');
    doc.rect(x, y, chip, chip, 'S');
    doc.setFontSize(7);
    doc.setTextColor(MUTED);
    doc.text(hex.toUpperCase(), x, y + chip + 4);
  });
  y += chip + 14;

  doc.setFontSize(10);
  doc.setTextColor(MUTED);
  doc.text(entry.cached, PAGE.margin, y);
  y += 10;

  const note =
    'Full colour ranges, profiles and warranty documentation are available from your '
    + 'Window Depot representative. Colours shown are reproduced for reference and may '
    + 'differ from the manufactured finish.';
  doc.setFontSize(9);
  doc.text(doc.splitTextToSize(note, contentW), PAGE.margin, y);

  doc.setFontSize(8);
  doc.text(`Window Depot  ·  ${entry.brand}  ·  ${new Date().toLocaleDateString()}`, PAGE.margin, PAGE.h - 8);

  return doc.output('blob');
}

/**
 * Structured hand-off for the quoting team. Deliberately JSON rather than a
 * PDF: it is meant to be read by whatever system prices the job, not by a person.
 */
export function buildQuotePayload(session: SessionData) {
  return {
    exportedAt: new Date().toISOString(),
    rep: activeSettings().rep,
    customer: session.customer && {
      name: session.customer.name,
      address: session.customer.address,
      phone: session.customer.phone,
      email: session.customer.email,
      notes: session.customer.notes,
    },
    project: session.project && { id: session.project.id, name: session.project.name },
    areas: session.detections.filter((d) => d.selected).map((d) => ({
      category: d.category,
      label: d.label,
      approxSqft: d.approxSqft,
      source: d.source,
    })),
    selections: selectionsFor(session).map((s) => ({
      category: s.cat,
      line: s.line,
      color: s.color,
      configuration: s.config,
      where: s.where,
      price: s.price,
    })),
    versions: session.versions.map((v) => ({
      name: v.name,
      meta: v.meta,
      isFavorite: v.isFavorite,
      instructions: v.instructions,
    })),
  };
}
