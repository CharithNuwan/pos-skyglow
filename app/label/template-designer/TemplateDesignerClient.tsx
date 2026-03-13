'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Rnd } from 'react-rnd';

const DOTS_PER_MM = 8;
const BARCODE_DISPLAY_WIDTH = 120;
const TEXT_DEFAULT_WIDTH = 80;
const TEXT_DEFAULT_HEIGHT = 20;

const PLACEHOLDERS = [
  { value: '@CompanyName', label: 'Company name' },
  { value: '@ItemCode', label: 'Item code' },
  { value: '@Des1', label: 'Description line 1' },
  { value: '@Des2', label: 'Description line 2' },
  { value: '@Price', label: 'Price' },
  { value: '@Qty', label: 'Quantity' },
  { value: '@Barcode', label: 'Barcode' },
  { value: '@BatchNo', label: 'Batch no' },
  { value: '@Exp', label: 'Expiry' },
  { value: '@Count', label: 'Count' },
  { value: '@Mdf', label: 'Mfg date' },
  { value: '@bt', label: 'Barcode type' },
];

type ElementType = 'text' | 'barcode';

interface LabelElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  font?: string;
  rotation?: number;
  xMul?: number;
  yMul?: number;
  /** Text element size in dots (persists resize). Barcode uses height only. */
  width?: number;
  height?: number;
  placeholder?: string;
  staticText?: string;
}

function generateId() {
  return 'el-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

function buildTspl(widthMm: number, heightMm: number, gapMm: number, elements: LabelElement[]): string {
  const lines: string[] = [];
  lines.push(`SIZE ${widthMm} mm, ${heightMm} mm`);
  lines.push(`GAP ${gapMm} mm, 0 mm`);
  lines.push('DIRECTION 1');
  lines.push('CLS');
  for (const el of elements) {
    if (el.type === 'text') {
      const content = el.placeholder || (el.staticText ?? '').replace(/"/g, '""');
      const font = el.font ?? '2';
      const rot = el.rotation ?? 0;
      const wDots = el.width ?? (el.xMul ?? 1) * TEXT_DEFAULT_WIDTH;
      const hDots = el.height ?? (el.yMul ?? 1) * TEXT_DEFAULT_HEIGHT;
      const xMul = wDots / TEXT_DEFAULT_WIDTH;
      const yMul = hDots / TEXT_DEFAULT_HEIGHT;
      lines.push(`TEXT ${el.x},${el.y},"${font}",${rot},${xMul},${yMul},"${content}"`);
    } else if (el.type === 'barcode') {
      const h = el.height ?? 50;
      lines.push(`BARCODE ${el.x},${el.y},"128",${h},1,0,2,2,"@Barcode"`);
    }
  }
  lines.push('PRINT 1,1');
  return lines.join('\r\n');
}

export default function TemplateDesignerClient() {
  const [widthMm, setWidthMm] = useState(50);
  const [heightMm, setHeightMm] = useState(25);
  const [gapMm, setGapMm] = useState(2);
  const [elements, setElements] = useState<LabelElement[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(2);

  const canvasW = widthMm * DOTS_PER_MM;
  const canvasH = heightMm * DOTS_PER_MM;

  // Template ID and file name for current dimensions (so user knows what to use in Xprinter folder)
  const is30x20 = widthMm === 30 && heightMm === 20;
  const templateId = is30x20 ? '20' : '1';
  const templateFileName = is30x20 ? '30mm20mm.txt' : '50mm25mm.txt';

  const addText = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setElements((prev) => [
      ...prev,
      {
        id: generateId(),
        type: 'text',
        x: 20,
        y: Math.min(20 + prev.length * 25, canvasH - TEXT_DEFAULT_HEIGHT - 5),
        font: '2',
        rotation: 0,
        width: TEXT_DEFAULT_WIDTH,
        height: TEXT_DEFAULT_HEIGHT,
        placeholder: '@ItemCode',
      },
    ]);
  }, [canvasH]);

  const addBarcode = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setElements((prev) => [
      ...prev,
      {
        id: generateId(),
        type: 'barcode',
        x: 20,
        y: Math.min(20 + prev.filter((item) => item.type === 'barcode').length * 60, canvasH - 60),
        height: 50,
      },
    ]);
  }, [canvasH]);

  const updateElement = useCallback((id: string, updates: Partial<LabelElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
    );
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const handleDragStop = useCallback((id: string, _e: unknown, d: { x: number; y: number }) => {
    const x = Math.max(0, Math.round(d.x / zoom));
    const y = Math.max(0, Math.round(d.y / zoom));
    updateElement(id, { x, y });
  }, [updateElement, zoom]);

  const syncBarcodeHeight = useCallback((id: string, ref: HTMLElement) => {
    const height = Math.max(20, Math.min(canvasH - 5, Math.round((ref as HTMLDivElement).offsetHeight / zoom)));
    updateElement(id, { height });
  }, [updateElement, canvasH, zoom]);

  const handleResizeBarcode = useCallback(
    (id: string, _e: MouseEvent | TouchEvent, _dir: unknown, _ref: HTMLElement, delta: { width: number; height: number }) => {
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== id || el.type !== 'barcode') return el;
          const ch = el.height ?? 50;
          const newH = Math.max(20, Math.min(canvasH - 5, Math.round(ch + delta.height / zoom)));
          return { ...el, height: newH };
        })
      );
    },
    [canvasH, zoom]
  );

  const syncTextSize = useCallback((id: string, ref: HTMLElement) => {
    const el = ref as HTMLDivElement;
    const width = Math.max(20, Math.round(el.offsetWidth / zoom));
    const height = Math.max(12, Math.round(el.offsetHeight / zoom));
    updateElement(id, { width, height });
  }, [updateElement, zoom]);

  const handleResizeText = useCallback(
    (id: string, _e: MouseEvent | TouchEvent, _dir: unknown, _ref: HTMLElement, delta: { width: number; height: number }) => {
      setElements((prev) =>
        prev.map((el) => {
          if (el.id !== id || el.type !== 'text') return el;
          const cw = el.width ?? (el.xMul ?? 1) * TEXT_DEFAULT_WIDTH;
          const ch = el.height ?? (el.yMul ?? 1) * TEXT_DEFAULT_HEIGHT;
          const newW = Math.max(20, Math.round(cw + delta.width / zoom));
          const newH = Math.max(12, Math.round(ch + delta.height / zoom));
          return { ...el, width: newW, height: newH };
        })
      );
    },
    [zoom]
  );

  const exportTxt = useCallback(() => {
    const tspl = buildTspl(widthMm, heightMm, gapMm, elements);
    const blob = new Blob([tspl], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${widthMm}mm${heightMm}mm.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [widthMm, heightMm, gapMm, elements]);

  const reset = useCallback(() => {
    if (elements.length === 0 || confirm('Clear all elements?')) {
      setElements([]);
      setSelectedId(null);
    }
  }, [elements.length]);

  const loadDefaultBarcodePrice = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const cw = widthMm * DOTS_PER_MM;
    const ch = heightMm * DOTS_PER_MM;
    setElements([
      {
        id: generateId(),
        type: 'barcode',
        x: 20,
        y: Math.min(20, ch - 55),
        height: 50,
      },
      {
        id: generateId(),
        type: 'text',
        x: 20,
        y: Math.min(75, ch - TEXT_DEFAULT_HEIGHT - 5),
        font: '2',
        rotation: 0,
        width: TEXT_DEFAULT_WIDTH,
        height: TEXT_DEFAULT_HEIGHT,
        staticText: 'Rs @Price',
      },
    ]);
  }, [widthMm, heightMm]);

  const selectedEl = selectedId ? elements.find((e) => e.id === selectedId) : null;

  return (
    <>
      <div className="mb-3">
        <Link href="/label" className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-arrow-left me-1" /> Back to Print Labels
        </Link>
      </div>
      <div className="card">
        <div className="card-header fw-bold">Print template designer</div>
        <div className="card-body">
          <div className="row g-3 mb-3">
            <div className="col-auto">
              <label className="form-label small fw-bold">Width (mm)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                style={{ width: 70 }}
                min={20}
                max={100}
                value={widthMm}
                onChange={(e) => setWidthMm(Number(e.target.value) || 50)}
              />
            </div>
            <div className="col-auto">
              <label className="form-label small fw-bold">Height (mm)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                style={{ width: 70 }}
                min={10}
                max={80}
                value={heightMm}
                onChange={(e) => setHeightMm(Number(e.target.value) || 25)}
              />
            </div>
            <div className="col-auto">
              <label className="form-label small fw-bold">Gap (mm)</label>
              <input
                type="number"
                className="form-control form-control-sm"
                style={{ width: 70 }}
                min={0}
                max={20}
                value={gapMm}
                onChange={(e) => setGapMm(Number(e.target.value) || 2)}
              />
            </div>
            <div className="col-auto">
              <label className="form-label small fw-bold">Zoom</label>
              <select
                className="form-select form-select-sm"
                style={{ width: 70 }}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              >
                <option value={1}>1x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2x</option>
                <option value={3}>3x</option>
              </select>
            </div>
            <div className="col-auto d-flex align-items-end gap-2">
              <button
                type="button"
                className="btn btn-outline-success btn-sm"
                onClick={loadDefaultBarcodePrice}
                onMouseDown={(e) => e.preventDefault()}
              >
                Load default (barcode + price)
              </button>
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={addText} onMouseDown={(e) => e.preventDefault()}>
                + ADD TEXT
              </button>
              <button type="button" className="btn btn-outline-primary btn-sm" onClick={addBarcode} onMouseDown={(e) => e.preventDefault()}>
                + ADD BARCODE
              </button>
            </div>
          </div>

          <p className="small text-muted mb-2">
            Drag elements to move; drag handles to resize. Canvas uses 1 px = 1 printer dot (8 dots/mm). Select an element to edit placeholder/font/height below.
          </p>

          <div className="alert alert-info py-2 px-3 mb-3 small">
            <strong>Template ID for this design:</strong> Use <strong>{templateId}</strong> — save the exported file as <strong>{templateFileName}</strong> in the Xprinter template folder (e.g. C:\BileetaBarcode\BarcodeTemplate\Source). On Print Labels, the template ID is sent automatically: choose label size <strong>30×20</strong> to use ID 20, or <strong>50×25 / other</strong> to use ID 1.
          </div>

          <div className="mb-3">
            <strong className="small">Canvas</strong>
            <div
              className="border bg-white overflow-hidden mt-1"
              style={{
                width: canvasW * zoom,
                height: canvasH * zoom,
                maxWidth: '100%',
                position: 'relative' as const,
              }}
              onClick={() => setSelectedId(null)}
              role="presentation"
            >
              <div
                style={{
                  width: canvasW * zoom,
                  height: canvasH * zoom,
                  position: 'relative' as const,
                }}
              >
                {elements.map((el) => {
                  if (el.type === 'barcode') {
                    const h = el.height ?? 50;
                    return (
                      <Rnd
                        key={el.id}
                        position={{ x: el.x * zoom, y: el.y * zoom }}
                        size={{ width: BARCODE_DISPLAY_WIDTH * zoom, height: h * zoom }}
                        minHeight={20 * zoom}
                        maxHeight={(canvasH - el.y) * zoom}
                        enableResize={{ top: false, right: false, bottom: true, left: false, topRight: false, bottomRight: false, bottomLeft: false, topLeft: false }}
                        disableDragging={false}
                        bounds="parent"
                        onDragStop={(_e, d) => handleDragStop(el.id, _e, d)}
                        onResize={(_e, _dir, _ref, delta) => handleResizeBarcode(el.id, _e, _dir, _ref, delta)}
                        onResizeStop={(_e, _dir, ref) => syncBarcodeHeight(el.id, ref)}
                        onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
                        style={{
                          border: selectedId === el.id ? '2px solid #0d6efd' : '1px dashed #999',
                          boxSizing: 'border-box',
                          background: '#f8f9fa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: Math.max(10, 10 * zoom),
                          color: '#666',
                        }}
                      >
                        BARCODE
                      </Rnd>
                    );
                  }
                  const tw = el.width ?? (el.xMul ?? 1) * TEXT_DEFAULT_WIDTH;
                  const th = el.height ?? (el.yMul ?? 1) * TEXT_DEFAULT_HEIGHT;
                  const label = el.placeholder || el.staticText || 'TEXT';
                  return (
                    <Rnd
                      key={el.id}
                      position={{ x: el.x * zoom, y: el.y * zoom }}
                      size={{ width: tw * zoom, height: th * zoom }}
                      minWidth={20 * zoom}
                      minHeight={12 * zoom}
                      enableResize={true}
                      disableDragging={false}
                      bounds="parent"
                      onDragStop={(_e, d) => handleDragStop(el.id, _e, d)}
                      onResize={(_e, _dir, _ref, delta) => handleResizeText(el.id, _e, _dir, _ref, delta)}
                      onResizeStop={(_e, _dir, ref) => syncTextSize(el.id, ref)}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); }}
                      style={{
                        border: selectedId === el.id ? '2px solid #0d6efd' : '1px dashed #999',
                        boxSizing: 'border-box',
                        background: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 2,
                        fontSize: Math.max(10, 10 * zoom),
                        overflow: 'hidden',
                      }}
                    >
                      {label.length > 12 ? label.slice(0, 11) + '…' : label}
                    </Rnd>
                  );
                })}
              </div>
            </div>
            {elements.length === 0 && (
              <div className="text-muted small py-2">No elements. Click Load default (barcode + price) or + ADD TEXT / + ADD BARCODE.</div>
            )}
          </div>

          {selectedEl && (
            <div className="mb-3 p-2 border rounded bg-light">
              <strong className="small">Properties — {selectedEl.type === 'text' ? 'TEXT' : 'BARCODE'}</strong>
              <div className="d-flex flex-wrap align-items-center gap-2 mt-2">
                {selectedEl.type === 'text' && (
                  <>
                    <select
                      className="form-select form-select-sm"
                      style={{ width: 140 }}
                      value={selectedEl.placeholder ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        updateElement(selectedEl.id, v ? { placeholder: v, staticText: undefined } : { placeholder: undefined });
                      }}
                    >
                      <option value="">— Static text —</option>
                      {PLACEHOLDERS.map((p) => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      style={{ width: 120 }}
                      placeholder="Static text (e.g. Rs @Price)"
                      value={selectedEl.staticText ?? ''}
                      onChange={(e) => updateElement(selectedEl.id, { staticText: e.target.value })}
                    />
                    <span className="small text-muted">font</span>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      style={{ width: 36 }}
                      value={selectedEl.font ?? '2'}
                      onChange={(e) => updateElement(selectedEl.id, { font: e.target.value || '2' })}
                    />
                  </>
                )}
                {selectedEl.type === 'barcode' && (
                  <>
                    <span className="small text-muted">height (dots)</span>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      style={{ width: 56 }}
                      min={20}
                      value={selectedEl.height ?? 50}
                      onChange={(e) => updateElement(selectedEl.id, { height: Number(e.target.value) || 50 })}
                    />
                  </>
                )}
                <button type="button" className="btn btn-outline-danger btn-sm ms-auto" onClick={() => removeElement(selectedEl.id)} title="Remove">
                  <i className="bi bi-trash" />
                </button>
              </div>
            </div>
          )}

          <div className="d-flex gap-2 flex-wrap">
            <button type="button" className="btn btn-primary" onClick={exportTxt} disabled={elements.length === 0}>
              <i className="bi bi-download me-1" /> Export .txt
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={reset}>
              Reset
            </button>
          </div>
          <p className="form-text small mt-2 mb-0">
            Export saves a TSPL .txt file. Copy it to the Xprinter template folder as <strong>{templateFileName}</strong>. Print Labels sends template ID <strong>{templateId}</strong> when you use label size {is30x20 ? '30×20' : '50×25 or other'}.
          </p>
        </div>
      </div>
    </>
  );
}
