'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';

const PLACEHOLDERS = [
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
  placeholder?: string;
  staticText?: string;
  height?: number;
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
      const xMul = el.xMul ?? 1;
      const yMul = el.yMul ?? 1;
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const elementsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (elements.length > 0 && elementsSectionRef.current && typeof elementsSectionRef.current.scrollIntoView === 'function') {
      elementsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [elements.length]);

  const addText = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setElements((prev) => [
      ...prev,
      {
        id: generateId(),
        type: 'text',
        x: 20,
        y: 20 + prev.length * 25,
        font: '2',
        rotation: 0,
        xMul: 1,
        yMul: 1,
        placeholder: '@ItemCode',
      },
    ]);
  }, []);

  const addBarcode = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setElements((prev) => [
      ...prev,
      {
        id: generateId(),
        type: 'barcode',
        x: 20,
        y: 20 + prev.filter((item) => item.type === 'barcode').length * 60,
        height: 50,
      },
    ]);
  }, []);

  const updateElement = useCallback((id: string, updates: Partial<LabelElement>) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
    );
  }, []);

  const removeElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    setEditingId((current) => (current === id ? null : current));
  }, []);

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
      setEditingId(null);
    }
  }, [elements.length]);

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
            <div className="col-auto d-flex align-items-end gap-2">
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={addText}
                onMouseDown={(e) => e.preventDefault()}
              >
                + ADD TEXT
              </button>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={addBarcode}
                onMouseDown={(e) => e.preventDefault()}
              >
                + ADD BARCODE
              </button>
            </div>
          </div>

          <p className="small text-muted mb-2">
            x, y are in printer dots (e.g. 8 dots/mm at 203 DPI). Add elements and set position/font/placeholder below.
          </p>

          <div className="mb-3" ref={elementsSectionRef}>
            <strong className="small">Elements</strong>
            {elements.length === 0 ? (
              <div className="text-muted small py-2">No elements. Click + ADD TEXT or + ADD BARCODE.</div>
            ) : (
              <ul className="list-group list-group-flush mt-1">
                {elements.map((el) => (
                  <li key={el.id} className="list-group-item d-flex flex-wrap align-items-center gap-2 py-2">
                    <span className="badge bg-secondary">{el.type === 'text' ? 'TEXT' : 'BARCODE'}</span>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      style={{ width: 56 }}
                      placeholder="x"
                      value={el.x}
                      onChange={(e) => updateElement(el.id, { x: Number(e.target.value) || 0 })}
                    />
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      style={{ width: 56 }}
                      placeholder="y"
                      value={el.y}
                      onChange={(e) => updateElement(el.id, { y: Number(e.target.value) || 0 })}
                    />
                    {el.type === 'text' && (
                      <>
                        <select
                          className="form-select form-select-sm"
                          style={{ width: 140 }}
                          value={el.placeholder ?? ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            updateElement(el.id, v ? { placeholder: v, staticText: undefined } : { placeholder: undefined });
                          }}
                        >
                          <option value="">— Static text —</option>
                          {PLACEHOLDERS.map((p) => (
                            <option key={p.value} value={p.value}>
                              {p.label}
                            </option>
                          ))}
                        </select>
                        {(!el.placeholder || editingId === el.id) && (
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            style={{ width: 120 }}
                            placeholder="Static text"
                            value={el.staticText ?? ''}
                            onChange={(e) => updateElement(el.id, { staticText: e.target.value })}
                            onFocus={() => setEditingId(el.id)}
                            onBlur={() => setEditingId(null)}
                          />
                        )}
                        <span className="small text-muted">font</span>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          style={{ width: 36 }}
                          value={el.font ?? '2'}
                          onChange={(e) => updateElement(el.id, { font: e.target.value || '2' })}
                        />
                      </>
                    )}
                    {el.type === 'barcode' && (
                      <>
                        <span className="small text-muted">height</span>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          style={{ width: 56 }}
                          value={el.height ?? 50}
                          onChange={(e) => updateElement(el.id, { height: Number(e.target.value) || 50 })}
                        />
                      </>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm ms-auto"
                      onClick={() => removeElement(el.id)}
                      title="Remove"
                    >
                      <i className="bi bi-trash" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <button type="button" className="btn btn-primary" onClick={exportTxt} disabled={elements.length === 0}>
              <i className="bi bi-download me-1" /> Export .txt
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={reset}>
              Reset
            </button>
          </div>
          <p className="form-text small mt-2 mb-0">
            Export saves a TSPL .txt file. Copy it to the Xprinter service template folder (e.g. C:\BileetaBarcode\BarcodeTemplate\Source) and use template ID &quot;1&quot; or &quot;18&quot; for 50×25mm, or &quot;6&quot; for no-expiry template.
          </p>
        </div>
      </div>
    </>
  );
}
