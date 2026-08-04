import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  value: string; // yyyy-mm-dd
  onChange: (e: { target: { value: string } }) => void;
  className?: string;
  /** When provided, replaces the wrapper's base classes so the field can match
   *  a sibling input's size (e.g. a time field using the form's inputCls). */
  sizeClassName?: string;
  style?: React.CSSProperties;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  tabIndex?: number;
};

function parse(v: unknown): [string, string, string] {
  const str = typeof v === "string" ? v : "";
  const [y = "", m = "", d = ""] = str.split("-");
  return [y, m, d];
}

/* ─── Inline Calendar Popover ─── */
const MONTH_NAMES_AR = [
  "يناير","فبراير","مارس","أبريل","مايو","يونيو",
  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر",
];
const DAY_NAMES = ["أح","إث","ثل","أر","خم","جم","سب"];

function CalendarPopover({
  value, min, max, onChange, onClose, anchorRect,
}: {
  value: string;
  min?: string;
  max?: string;
  onChange: (v: string) => void;
  onClose: () => void;
  anchorRect: DOMRect | null;
}) {
  const today = new Date();
  const safeVal = typeof value === "string" ? value : "";
  const [pY, pM, pD] = safeVal.split("-");
  const initYear  = safeVal ? (parseInt(pY) || today.getFullYear()) : today.getFullYear();
  const initMonth = safeVal ? (parseInt(pM) - 1 || 0)               : today.getMonth();

  const [viewY, setViewY] = useState(initYear);
  const [viewM, setViewM] = useState(initMonth);

  const selY = safeVal ? (parseInt(pY) || -1) : -1;
  const selM = safeVal ? (parseInt(pM) - 1)   : -1;
  const selD = safeVal ? (parseInt(pD) || -1)  : -1;

  const firstDow   = new Date(viewY, viewM, 1).getDay();
  const daysInMon  = new Date(viewY, viewM + 1, 0).getDate();

  function prevMonth() {
    if (viewM === 0) { setViewM(11); setViewY(y => y - 1); }
    else setViewM(m => m - 1);
  }
  function nextMonth() {
    if (viewM === 11) { setViewM(0); setViewY(y => y + 1); }
    else setViewM(m => m + 1);
  }

  function selectDay(d: number) {
    const mm = String(viewM + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    const picked = `${viewY}-${mm}-${dd}`;
    if (min && picked < min) return;
    if (max && picked > max) return;
    onChange(picked);
    onClose();
  }

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMon; d++) cells.push(d);

  /* calculate fixed position from anchor */
  const calW = 260;
  const calH = 290;
  let calTop = 0;
  let calLeft = 0;
  if (anchorRect) {
    const spaceBelow = window.innerHeight - anchorRect.bottom;
    if (spaceBelow >= calH || spaceBelow >= anchorRect.top) {
      calTop = anchorRect.bottom + 6;
    } else {
      calTop = anchorRect.top - calH - 6;
    }
    // align start edge in RTL — try right-align first then left-align
    calLeft = Math.max(4, Math.min(anchorRect.right - calW, window.innerWidth - calW - 4));
  }

  return typeof document === "undefined" ? null : createPortal(
    <div
      data-cal-portal=""
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: "fixed",
        zIndex: 999999,
        top: calTop,
        left: calLeft,
        width: calW,
        background: "#ffffff",
        border: "1px solid #d1d5db",
        borderRadius: 12,
        padding: 14,
        boxShadow: "0 12px 48px rgba(0,0,0,0.25)",
        userSelect: "none",
        direction: "rtl",
        color: "#111827",
      }}
    >
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
        <button type="button" onClick={nextMonth} style={navBtnLight}>
          <ChevronRight size={16} />
        </button>
        <span style={{ fontWeight:700, fontSize:14, color:"#111827" }}>
          {MONTH_NAMES_AR[viewM]} {viewY}
        </span>
        <button type="button" onClick={prevMonth} style={navBtnLight}>
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2, marginBottom:4 }}>
        {DAY_NAMES.map(n => (
          <div key={n} style={{ textAlign:"center", fontSize:11, color:"#6b7280", padding:"2px 0" }}>{n}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const mm  = String(viewM + 1).padStart(2,"0");
          const dd  = String(d).padStart(2,"0");
          const iso = `${viewY}-${mm}-${dd}`;
          const isSel    = d === selD && viewM === selM && viewY === selY;
          const isToday  = d === today.getDate() && viewM === today.getMonth() && viewY === today.getFullYear();
          const disabled = (min && iso < min) || (max && iso > max);
          return (
            <button
              key={i}
              type="button"
              disabled={!!disabled}
              onClick={() => selectDay(d)}
              style={{
                textAlign: "center",
                fontSize: 13,
                padding: "5px 0",
                borderRadius: 6,
                cursor: disabled ? "not-allowed" : "pointer",
                fontWeight: isSel ? 700 : 400,
                color: disabled
                  ? "#d1d5db"
                  : isSel
                  ? "#ffffff"
                  : isToday
                  ? "#16a34a"
                  : "#111827",
                background: isSel ? "#16a34a" : "transparent",
                border: isToday && !isSel
                  ? "1px solid #16a34a"
                  : "1px solid transparent",
              }}
            >
              {d}
            </button>
          );
        })}
      </div>

      {/* Today button */}
      <button
        type="button"
        onClick={() => {
          const y = today.getFullYear();
          const m = String(today.getMonth()+1).padStart(2,"0");
          const d = String(today.getDate()).padStart(2,"0");
          onChange(`${y}-${m}-${d}`);
          onClose();
        }}
        style={{
          marginTop: 10,
          width: "100%",
          padding: "6px 0",
          borderRadius: 7,
          border: "1px solid #d1d5db",
          background: "#f9fafb",
          color: "#374151",
          cursor: "pointer",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        اليوم
      </button>
    </div>,
    document.body
  );
}

const navBtnLight: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#374151",
  cursor: "pointer",
  opacity: 0.8,
  display: "flex",
  alignItems: "center",
  padding: 4,
  borderRadius: 6,
};

const navBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--foreground,#fff)",
  cursor: "pointer",
  opacity: 0.7,
  display: "flex",
  alignItems: "center",
  padding: "2px 4px",
  borderRadius: 4,
};

/* ─── Main DateInput ─── */
export function DateInput({ value, onChange, className, sizeClassName, style, disabled, tabIndex, min, max }: Props) {
  const [yr, setYr] = useState(() => parse(value)[0]);
  const [mo, setMo] = useState(() => parse(value)[1]);
  const [dy, setDy] = useState(() => parse(value)[2]);
  const [open, setOpen] = useState(false);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [activeField, setActiveField] = useState<"y"|"m"|"d"|null>(null);

  const yearRef   = useRef<HTMLInputElement>(null);
  const monthRef  = useRef<HTMLInputElement>(null);
  const dayRef    = useRef<HTMLInputElement>(null);
  const wrapRef   = useRef<HTMLDivElement>(null);

  const freshY = useRef(false);
  const freshM = useRef(false);
  const freshD = useRef(false);

  /* sync when parent changes value */
  const prevVal = useRef(value);
  useEffect(() => {
    if (value !== prevVal.current) {
      const [y, m, d] = parse(value);
      setYr(y); setMo(m); setDy(d);
      prevVal.current = value;
    }
  }, [value]);

  /* close popover on outside click/touch — must check portal too */
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent | TouchEvent) {
      const t = (e instanceof TouchEvent ? e.touches[0]?.target : e.target) as Node | null;
      if (!t) return;
      if (wrapRef.current?.contains(t)) return;
      const portal = document.querySelector("[data-cal-portal]");
      if (portal?.contains(t)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler as EventListener, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler as EventListener);
    };
  }, [open]);

  function fire(y: string, m: string, d: string) {
    if (y.length === 4 && m.length >= 1 && d.length >= 1) {
      const formatted = `${y}-${m.padStart(2,"0")}-${d.padStart(2,"0")}`;
      prevVal.current = formatted;
      onChange({ target: { value: formatted } });
    }
  }

  function onPickerChange(v: string) {
    const [y, m, d] = parse(v);
    setYr(y); setMo(m); setDy(d);
    prevVal.current = v;
    onChange({ target: { value: v } });
  }

  /* ── Year keydown (desktop) ── */
  function onYearKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const next = freshY.current ? e.key : (yr + e.key).slice(-4);
      freshY.current = false;
      setYr(next);
      fire(next, mo, dy);
      if (next.length === 4) { freshM.current = true; monthRef.current?.focus(); }
    } else if (e.key === "Backspace") {
      e.preventDefault();
      freshY.current = false;
      setYr(yr.slice(0, -1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      freshM.current = true; monthRef.current?.focus();
    } else if (e.key === "Delete") {
      e.preventDefault();
      setYr(""); freshY.current = false;
    }
  }

  /* ── Month keydown (desktop) ── */
  function onMonthKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const next = freshM.current ? e.key : (mo + e.key).slice(-2);
      freshM.current = false;
      setMo(next);
      fire(yr, next, dy);
      if (next.length === 2) { freshD.current = true; dayRef.current?.focus(); }
    } else if (e.key === "Backspace") {
      e.preventDefault();
      if (mo === "") { freshY.current = false; yearRef.current?.focus(); }
      else { freshM.current = false; setMo(mo.slice(0, -1)); }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      freshY.current = false; yearRef.current?.focus();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      freshD.current = true; dayRef.current?.focus();
    } else if (e.key === "Delete") {
      e.preventDefault();
      setMo(""); freshM.current = false;
    }
  }

  /* ── Day keydown (desktop) ── */
  function onDayKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      const next = freshD.current ? e.key : (dy + e.key).slice(-2);
      freshD.current = false;
      setDy(next);
      fire(yr, mo, next);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      if (dy === "") { freshM.current = false; monthRef.current?.focus(); }
      else { freshD.current = false; setDy(dy.slice(0, -1)); }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      freshM.current = false; monthRef.current?.focus();
    } else if (e.key === "Delete") {
      e.preventDefault();
      setDy(""); freshD.current = false;
    }
  }

  /* ── Mobile onChange handlers ── */
  function onYearChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 4);
    setYr(raw); fire(raw, mo, dy);
    if (raw.length === 4) { freshM.current = true; monthRef.current?.focus(); }
  }
  function onMonthChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMo(raw); fire(yr, raw, dy);
    if (raw.length === 2) { freshD.current = true; dayRef.current?.focus(); }
  }
  function onDayChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 2);
    setDy(raw); fire(yr, mo, raw);
  }

  function onFocusField(freshRef: React.MutableRefObject<boolean>, field: "y"|"m"|"d") {
    freshRef.current = true;
    setActiveField(field);
  }

  function onBlurField() {
    setTimeout(() => {
      const a = document.activeElement;
      if (a !== yearRef.current && a !== monthRef.current && a !== dayRef.current) {
        setActiveField(null);
      }
    }, 80);
  }

  function onClickField(e: React.MouseEvent<HTMLInputElement>, freshRef: React.MutableRefObject<boolean>) {
    e.preventDefault();
    freshRef.current = true;
    (e.target as HTMLInputElement).focus();
  }

  function onContextMenu(e: React.MouseEvent) {
    e.preventDefault();
  }

  /* ── Segment style: highlight when active ── */
  const seg: React.CSSProperties = {
    border: "none",
    outline: "none",
    textAlign: "center",
    fontFamily: "inherit",
    fontSize: "inherit",
    caretColor: "transparent",
    cursor: "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
    borderRadius: "4px",
    transition: "background 0.13s, color 0.13s",
    padding: "1px 2px",
  };

  function segStyle(field: "y"|"m"|"d", w: string): React.CSSProperties {
    const active = activeField === field;
    return {
      ...seg,
      width: w,
      background: active ? "#dc2626" : "transparent",
      color: active ? "#fff" : "inherit",
    };
  }

  return (
    <div
      ref={wrapRef}
      dir="ltr"
      className={sizeClassName ?? "w-full border border-border rounded-lg px-2.5 py-1.5 text-sm font-semibold bg-background outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pl-[20px] pr-[20px]"}
      style={{ display:"flex", alignItems:"center", gap:0, position:"relative", ...style }}
    >
      {/* ── Calendar icon button ── */}
      <button
        type="button"
        tabIndex={-1}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (!open && wrapRef.current) {
            setAnchorRect(wrapRef.current.getBoundingClientRect());
          }
          setOpen(o => !o);
        }}
        style={{
          background: "none",
          border: "none",
          padding: "0 5px 0 0",
          margin: 0,
          cursor: disabled ? "default" : "pointer",
          display: "flex",
          alignItems: "center",
          color: open ? "var(--primary,#16a34a)" : "inherit",
          opacity: disabled ? 0.3 : 0.6,
          flexShrink: 0,
          transition: "opacity 0.15s, color 0.15s",
        }}
      >
        <Calendar size={14} />
      </button>
      {/* ── Year ── */}
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        value={yr}
        placeholder="yyyy"
        maxLength={4}
        disabled={disabled}
        tabIndex={tabIndex}
        style={segStyle("y", "3rem")}
        onFocus={() => onFocusField(freshY, "y")}
        onBlur={onBlurField}
        onClick={e => onClickField(e, freshY)}
        onKeyDown={onYearKey}
        onChange={onYearChange}
        onContextMenu={onContextMenu}
      />
      <span style={{ opacity:0.45, pointerEvents:"none", userSelect:"none" }}>/</span>
      {/* ── Month ── */}
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        value={mo}
        placeholder="mm"
        maxLength={2}
        disabled={disabled}
        style={segStyle("m", "1.6rem")}
        onFocus={() => onFocusField(freshM, "m")}
        onBlur={onBlurField}
        onClick={e => onClickField(e, freshM)}
        onKeyDown={onMonthKey}
        onChange={onMonthChange}
        onContextMenu={onContextMenu}
      />
      <span style={{ opacity:0.45, pointerEvents:"none", userSelect:"none" }}>/</span>
      {/* ── Day ── */}
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        value={dy}
        placeholder="dd"
        maxLength={2}
        disabled={disabled}
        style={segStyle("d", "1.6rem")}
        onFocus={() => onFocusField(freshD, "d")}
        onBlur={onBlurField}
        onClick={e => onClickField(e, freshD)}
        onKeyDown={onDayKey}
        onChange={onDayChange}
        onContextMenu={onContextMenu}
      />
      {/* ── Calendar Popover (portal — fixed position, white bg) ── */}
      {open && (
        <CalendarPopover
          value={value}
          min={min}
          max={max}
          anchorRect={anchorRect}
          onChange={onPickerChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
