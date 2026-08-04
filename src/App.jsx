import { useState, useEffect, useRef, useCallback } from "react";
import "./app.css";

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const ICONOS_EVENTO = { pago: "💰", gasto: "🧾", contrato: "📋", inquilino: "👤", mantenimiento: "🔧" };

function tiempoRelativo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "hace un momento";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} d`;
}

function useCounter(target, duration = 900) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);
  useEffect(() => {
    const start = performance.now();
    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      setValue(target * ease);
      if (t < 1) raf.current = requestAnimationFrame(animate);
    };
    raf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return value;
}

// ─── CSV Export ──────────────────────────────────────────────────────────────
function exportCSV(data, mes, anio) {
  const mesNombre = MONTHS[mes - 1];
  const rows = [];

  rows.push(["PAGOS"]);
  rows.push(["Inquilino", "Local", "Tipo", "Monto (Bs.)", "Estado", "Fecha", "Documento", "N° Documento"]);
  data.pagosFiltrados.forEach((p) => {
    rows.push([
      p.contratos?.inquilinos?.nombre ?? "",
      p.contratos?.unidades?.codigo ?? "",
      p.tipo ?? "",
      p.monto ?? 0,
      p.estado ?? "",
      p.fecha_pago ?? "",
      p.tipo_documento ?? "",
      p.numero_documento ?? "",
    ]);
  });
  rows.push([]);
  rows.push(["Total cobrado", "", "", data.totalCobrado, "", "", "", ""]);
  rows.push(["Total pendiente", "", "", data.totalPendiente, "", "", "", ""]);
  rows.push([]);

  rows.push(["GASTOS"]);
  rows.push(["Concepto", "Categoria", "Subcategoria", "Proveedor", "Monto (Bs.)", "Fecha", "N° Factura", "Notas"]);
  data.gastos.forEach((g) => {
    rows.push([
      g.concepto ?? "",
      g.categoria ?? "",
      g.subcategoria ?? "",
      g.proveedor ?? "",
      g.monto ?? 0,
      g.fecha ?? "",
      g.numero_factura ?? "",
      g.notas ?? "",
    ]);
  });
  rows.push([]);
  rows.push(["Total gastos", "", "", "", data.totalGastos, "", "", ""]);
  rows.push([]);

  rows.push(["MULTAS"]);
  rows.push(["Fecha", "Monto (Bs.)", "Motivo", "Inquilino / Local", "Estado"]);
  data.multas.forEach((m) => {
    const inquilino = m.contratos?.inquilinos?.nombre ?? "";
    const local = m.contratos?.unidades?.codigo ?? "";
    rows.push([
      m.fecha ?? "",
      m.monto ?? 0,
      m.motivo ?? "",
      [inquilino, local].filter(Boolean).join(" / "),
      m.estado ?? "",
    ]);
  });
  rows.push([]);
  rows.push(["Total multas pendientes", "", "", "", data.totalMultasPendientes]);
  rows.push([]);

  rows.push(["NETO", "", "", "", data.neto, "", "", ""]);

  const csv = rows
    .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LIMAX_${mesNombre}_${anio}.csv`;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Dashboard data fetcher (via Worker, nunca habla directo con Supabase) ───
async function fetchLatest(token) {
  const res = await fetch(`/api/dashboard?t=${encodeURIComponent(token)}&latest=1`);
  if (!res.ok) return null;
  return res.json();
}

async function fetchDashboardData(token, mes, anio) {
  const res = await fetch(`/api/dashboard?t=${encodeURIComponent(token)}&mes=${mes}&anio=${anio}`);
  if (!res.ok) return null;
  const raw = await res.json();

  const pagos = raw.pagos ?? [];
  const gastos = raw.gastos ?? [];
  const unidades = raw.unidades ?? [];
  const contratos = raw.contratos ?? [];
  const multas = raw.multas ?? [];

  const pagosFiltrados = pagos.filter((p) => p.contratos?.unidades !== undefined);
  const cobrados = pagosFiltrados.filter((p) => p.estado === "pagado");
  const totalCobrado = cobrados.reduce((s, p) => s + (p.monto || 0), 0);

  // Nota: las multas son otro tipo de ingreso, no recurrente como alquiler/expensa.
  // Se muestran aparte y NUNCA se suman a totalCobrado/totalPendiente/neto ni a la barra de cobro.
  const totalMultasPendientes = multas.filter((m) => m.estado === "pendiente").reduce((s, m) => s + (m.monto || 0), 0);

  // Si el mes ya tiene pagos registrados, usar esos como fuente de verdad.
  // Si no hay ningún registro (mes sin datos aún), usar contratos activos como baseline.
  const mesConRegistros = pagos.length > 0;
  let totalPendiente;
  if (mesConRegistros) {
    const pendientesRegs = pagosFiltrados.filter((p) => p.estado === "pendiente" || p.estado === "parcial");
    totalPendiente = pendientesRegs.reduce((s, p) => s + (p.monto || 0), 0);
  } else {
    const totalEsperado = contratos.reduce((s, c) => s + (c.monto_alquiler || 0) + (c.monto_expensa || 0), 0);
    totalPendiente = Math.max(0, totalEsperado - totalCobrado);
  }

  const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0);
  const neto = totalCobrado - totalGastos;

  const unitStatus = {};
  pagosFiltrados.forEach((p) => {
    const cod = p.contratos?.unidades?.codigo;
    if (!cod) return;
    if (p.estado === "pagado") unitStatus[cod] = "pagado";
    else if (p.estado === "parcial" && unitStatus[cod] !== "pagado") unitStatus[cod] = "parcial";
    else if (!unitStatus[cod]) unitStatus[cod] = "moroso";
  });

  const contratosConPago = new Set(pagosFiltrados.map((p) => p.contrato_id));
  const sinPago = contratos.filter((c) => !contratosConPago.has(c.id));

  const pendientesReales = pagosFiltrados.filter((p) => p.estado === "pendiente" || p.estado === "parcial");
  let pendientes;
  if (mesConRegistros) {
    pendientes = pendientesReales;
  } else {
    sinPago.forEach((c) => {
      const cod = c.unidades?.codigo;
      if (cod && !unitStatus[cod]) unitStatus[cod] = "moroso";
    });
    const pendientesVirtuales = sinPago.map((c) => ({
      id: `virt-${c.id}`,
      contrato_id: c.id,
      tipo: "alquiler+expensa",
      monto: (c.monto_alquiler || 0) + (c.monto_expensa || 0),
      estado: "pendiente",
      contratos: { unidades: c.unidades, inquilinos: c.inquilinos, monto_alquiler: c.monto_alquiler, monto_expensa: c.monto_expensa },
    }));
    pendientes = [...pendientesReales, ...pendientesVirtuales];
  }

  const gastosCat = {};
  gastos.forEach((g) => {
    gastosCat[g.categoria] = (gastosCat[g.categoria] || 0) + g.monto;
  });

  // ── Datos en tiempo real que antes solo llegaban por HTML de Telegram ──
  const deudaReal = raw.deudaReal ?? [];
  const totalDeudaReal = deudaReal.reduce((s, r) => s + r.total, 0);
  const documentos = raw.documentos ?? { vencidos: [], futuros: [] };
  const resultados = raw.resultados ?? { ingresos: [], totalIngresos: 0, egresosPorCategoria: [], totalEgresos: 0, resultadoNeto: 0, margen: 0 };
  const actividad = raw.actividad ?? [];
  const mantenimiento = raw.mantenimiento ?? [];
  const gastosFijos = raw.gastosFijos ?? [];

  return {
    totalCobrado, totalPendiente, totalGastos, neto, cobrados, pendientes, gastos, gastosCat,
    unidades, unitStatus, contratos, pagosFiltrados, multas, totalMultasPendientes,
    deudaReal, totalDeudaReal, documentos, resultados, actividad, mantenimiento, gastosFijos,
  };
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({ label, value, accent, index, onClick, sub, fullWidth }) {
  const animated = useCounter(value);
  return (
    <button
      className={`kpi-card${fullWidth ? " kpi-card-wide" : ""}`}
      style={{ "--accent": accent, "--i": index }}
      onClick={onClick}
      disabled={!onClick}
    >
      <span className="kpi-label">{label}</span>
      <span className="kpi-value" style={{ color: accent }}>Bs. {fmt(animated)}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </button>
  );
}

// ─── Comp bar ────────────────────────────────────────────────────────────────
function CompBar({ cobrado, pendiente }) {
  const total = cobrado + pendiente;
  const pct = total > 0 ? (cobrado / total) * 100 : 0;
  return (
    <div className="comp-bar-wrap">
      <div className="comp-bar-labels">
        <span style={{ color: "var(--green)" }}>Cobrado {pct.toFixed(0)}%</span>
        <span style={{ color: "var(--red)" }}>Pendiente {(100 - pct).toFixed(0)}%</span>
      </div>
      <div className="comp-bar">
        <div className="comp-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Unit Grid ───────────────────────────────────────────────────────────────
function OcupacionGrid({ unidades, unitStatus, onUnitClick }) {
  const ocupadas = unidades.filter((u) => u.estado === "ocupado").length;
  const total = unidades.length;
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Ocupación</h2>
        <span className="section-badge">{ocupadas}/{total} ocupados</span>
      </div>
      <div className="unit-grid">
        {unidades.map((u) => {
          const st = u.estado === "libre" ? "libre" : (unitStatus[u.codigo] || (u.estado === "ocupado" ? "moroso" : "libre"));
          return (
            <button key={u.id} className={`unit-cell unit-${st}`} onClick={() => onUnitClick(u)} title={u.codigo}>
              {u.codigo}
            </button>
          );
        })}
      </div>
      <div className="unit-legend">
        <span className="legend-item"><span className="dot dot-pagado" />Pagado</span>
        <span className="legend-item"><span className="dot dot-parcial" />Parcial</span>
        <span className="legend-item"><span className="dot dot-moroso" />Moroso</span>
        <span className="legend-item"><span className="dot dot-libre" />Libre</span>
      </div>
    </section>
  );
}

// ─── Morosos List (mes seleccionado) ─────────────────────────────────────────
function MorososList({ pendientes, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  const items = expanded ? pendientes : pendientes.slice(0, 4);
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Morosos del mes</h2>
        <span className="section-badge badge-red">{pendientes.length}</span>
      </div>
      <ul className="moroso-list">
        {items.map((p) => {
          const nombre = p.contratos?.inquilinos?.nombre ?? "—";
          const codigo = p.contratos?.unidades?.codigo ?? "—";
          const monto = p.monto > 0 ? p.monto : (p.contratos?.monto_alquiler || 0) + (p.contratos?.monto_expensa || 0);
          return (
            <li key={p.id} className="moroso-item" onClick={() => onOpen("pendiente", p)}>
              <div className="moroso-info">
                <span className="moroso-nombre">{nombre}</span>
                <span className="moroso-codigo">{codigo}</span>
              </div>
              <div className="moroso-right">
                <span className="moroso-monto">Bs. {fmt(monto)}</span>
                <span className={`moroso-estado estado-${p.estado}`}>{p.estado}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {pendientes.length > 4 && (
        <button className="ver-mas" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Ver menos" : `Ver ${pendientes.length - 4} más`}
        </button>
      )}
    </section>
  );
}

// ─── Deuda real con arrastre (siempre al día, no depende del mes elegido) ────
function DeudaRealSection({ deudaReal, totalDeudaReal, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  const items = expanded ? deudaReal : deudaReal.slice(0, 6);
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Deuda real por local</h2>
        <span className={`section-badge ${deudaReal.length ? "badge-red" : ""}`}>Bs. {fmt(totalDeudaReal)}</span>
      </div>
      {deudaReal.length === 0 ? (
        <p className="empty-msg">Todos los locales están al día. 🎉</p>
      ) : (
        <>
          <ul className="moroso-list">
            {items.map((r) => {
              const periodos = r.meses_alquiler.length + r.meses_expensa.length;
              return (
                <li key={r.contrato_id} className="moroso-item" onClick={() => onOpen("deuda-local", r)}>
                  <div className="moroso-info">
                    <span className="moroso-nombre">{r.local}</span>
                    <span className="moroso-codigo">{r.inquilino}</span>
                  </div>
                  <div className="moroso-right">
                    <span className="moroso-monto">Bs. {fmt(r.total)}</span>
                    <span className="moroso-codigo">{periodos} período{periodos !== 1 ? "s" : ""}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          {deudaReal.length > 6 && (
            <button className="ver-mas" onClick={() => setExpanded(!expanded)}>
              {expanded ? "Ver menos" : `Ver ${deudaReal.length - 6} más`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

// ─── Documentos pendientes de entregar ───────────────────────────────────────
function DocumentosSection({ documentos }) {
  const { vencidos, futuros } = documentos;
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Documentos pendientes</h2>
        <span className={`section-badge ${vencidos.length ? "badge-red" : ""}`}>{vencidos.length}</span>
      </div>
      {vencidos.length === 0 ? (
        <p className="empty-msg">Sin documentos atrasados.</p>
      ) : (
        <ul className="drawer-list">
          {vencidos.map((p) => (
            <li key={p.id} className="drawer-item">
              <div>
                <span className="di-nombre">{p.contratos?.inquilinos?.nombre ?? "—"}</span>
                <span className="di-sub">{p.contratos?.unidades?.codigo ?? "—"} · {p.tipo === "alquiler" ? "Factura" : "Recibo"} · {MONTHS[p.mes - 1]} {p.anio}</span>
              </div>
              <span className="di-monto amber">Bs. {fmt(p.monto)}</span>
            </li>
          ))}
        </ul>
      )}
      {futuros.length > 0 && (
        <p className="section-note">+ {futuros.length} por dar en su mes (pagos adelantados, todavía no corresponde)</p>
      )}
    </section>
  );
}

// ─── Multas Section ──────────────────────────────────────────────────────────
function MultasSection({ multas, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  const items = expanded ? multas : multas.slice(0, 4);
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Multas del mes</h2>
        <span className="section-badge">{multas.length}</span>
      </div>
      <ul className="moroso-list">
        {items.map((m) => {
          const nombre = m.contratos?.inquilinos?.nombre ?? "—";
          const codigo = m.contratos?.unidades?.codigo ?? "—";
          return (
            <li key={m.id} className="moroso-item" onClick={() => onOpen("multa", m)}>
              <div className="moroso-info">
                <span className="moroso-nombre">{nombre}</span>
                <span className="moroso-codigo">{codigo} · {m.motivo}</span>
              </div>
              <div className="moroso-right">
                <span className="moroso-monto">Bs. {fmt(m.monto)}</span>
                <span className={`moroso-estado estado-${m.estado}`}>{m.estado}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {multas.length > 4 && (
        <button className="ver-mas" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Ver menos" : `Ver ${multas.length - 4} más`}
        </button>
      )}
      {multas.length === 0 && <p className="empty-msg">Sin multas este mes</p>}
    </section>
  );
}

// ─── Estado de Resultados (mes seleccionado, con % y margen) ────────────────
function ResultadosSection({ resultados }) {
  const { ingresos, totalIngresos, egresosPorCategoria, totalEgresos, resultadoNeto, margen } = resultados;
  const maxIng = Math.max(...ingresos.map((i) => i.monto), 1);
  const maxEg = Math.max(...egresosPorCategoria.map((e) => e.monto), 1);
  return (
    <>
      <div className="kpi-grid">
        <KPICard label="Ingresos" value={totalIngresos} accent="var(--green)" index={0} sub={`${ingresos.length} conceptos`} />
        <KPICard label="Egresos" value={totalEgresos} accent="var(--red)" index={1} sub={`${egresosPorCategoria.length} categorías`} />
        <KPICard
          label="Resultado neto"
          value={resultadoNeto}
          accent={resultadoNeto >= 0 ? "var(--gold)" : "var(--red)"}
          index={2}
          sub={`Margen ${margen}%`}
          fullWidth
        />
      </div>

      <section className="section">
        <div className="section-header"><h2 className="section-title">Ingresos por concepto</h2></div>
        <div className="cat-bars">
          {ingresos.map((i) => (
            <div key={i.concepto} className="cat-row">
              <span className="cat-label">{i.concepto}</span>
              <div className="cat-bar-bg"><div className="cat-bar-fill cat-bar-green" style={{ width: `${(i.monto / maxIng) * 100}%` }} /></div>
              <span className="cat-amount">Bs. {fmt(i.monto)} <em>{i.pct}%</em></span>
            </div>
          ))}
          {ingresos.length === 0 && <p className="empty-msg">Sin ingresos este mes</p>}
        </div>
      </section>

      <section className="section">
        <div className="section-header"><h2 className="section-title">Egresos por categoría</h2></div>
        <div className="cat-bars">
          {egresosPorCategoria.map((e) => (
            <div key={e.categoria} className="cat-row">
              <span className="cat-label">{e.categoria}</span>
              <div className="cat-bar-bg"><div className="cat-bar-fill" style={{ width: `${(e.monto / maxEg) * 100}%` }} /></div>
              <span className="cat-amount">Bs. {fmt(e.monto)} <em>{e.pct}%</em></span>
            </div>
          ))}
          {egresosPorCategoria.length === 0 && <p className="empty-msg">Sin egresos este mes</p>}
        </div>
      </section>
    </>
  );
}

// ─── Detalle itemizado de gastos (complementa las barras de arriba) ─────────
function GastosDetalleSection({ gastos }) {
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Detalle de gastos</h2>
        <span className="section-badge">{gastos.length}</span>
      </div>
      <ul className="gasto-list">
        {gastos.map((g) => (
          <li key={g.id} className="gasto-item">
            <div>
              <span className="gasto-concepto">{g.concepto}</span>
              <span className="gasto-cat">{g.categoria}</span>
            </div>
            <span className="gasto-monto">Bs. {fmt(g.monto)}</span>
          </li>
        ))}
        {gastos.length === 0 && <p className="empty-msg">Sin gastos este mes</p>}
      </ul>
    </section>
  );
}

// ─── Gastos fijos pendientes (recordatorio semanal, siempre período actual) ─
function GastosFijosSection({ gastosFijos }) {
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Gastos fijos pendientes</h2>
        <span className={`section-badge ${gastosFijos.length ? "badge-red" : ""}`}>{gastosFijos.length}</span>
      </div>
      {gastosFijos.length === 0 ? (
        <p className="empty-msg">Todos los gastos fijos de este período están registrados. 🎉</p>
      ) : (
        <ul className="pill-list">
          {gastosFijos.map((g) => (
            <li key={g.concepto} className="pill-item">
              {g.concepto}{g.frecuencia === "trimestral" ? " · trimestral" : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Mantenimiento pendiente ─────────────────────────────────────────────────
function MantenimientoSection({ mantenimiento }) {
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Mantenimiento pendiente</h2>
        <span className="section-badge">{mantenimiento.length}</span>
      </div>
      {mantenimiento.length === 0 ? (
        <p className="empty-msg">Sin pedidos pendientes.</p>
      ) : (
        <ul className="drawer-list">
          {mantenimiento.map((m) => (
            <li key={m.id} className="drawer-item">
              <div>
                <span className="di-nombre">{m.titulo}</span>
                <span className="di-sub">{m.area || "—"} · {m.estado}</span>
              </div>
              <span className={`prioridad-pill prioridad-${m.prioridad}`}>{m.prioridad}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Feed de actividad reciente (últimos 7 días) ─────────────────────────────
function ActividadFeed({ actividad }) {
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Actividad reciente</h2>
        <span className="section-badge">{actividad.length}</span>
      </div>
      {actividad.length === 0 ? (
        <p className="empty-msg">Sin movimientos en los últimos 7 días.</p>
      ) : (
        <ul className="feed-list">
          {actividad.map((e, i) => (
            <li key={i} className="feed-item">
              <span className="feed-icon">{ICONOS_EVENTO[e.tipo]}</span>
              <div className="feed-body">
                <span className="feed-title">
                  {e.tipo === "pago" && `${e.local ?? "—"} · ${e.inquilino ?? "—"} — ${e.detalle}`}
                  {e.tipo === "gasto" && e.detalle}
                  {e.tipo === "contrato" && `Contrato nuevo: ${e.local ?? "—"} · ${e.inquilino ?? "—"}`}
                  {e.tipo === "inquilino" && `Inquilino nuevo: ${e.inquilino}${e.detalle ? ` (${e.detalle})` : ""}`}
                  {e.tipo === "mantenimiento" && `Mantenimiento: ${e.detalle}`}
                </span>
                <span className="feed-time">{tiempoRelativo(e.created_at)}</span>
              </div>
              {e.monto != null && <span className="feed-monto">Bs. {fmt(e.monto)}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ─── Drawer ──────────────────────────────────────────────────────────────────
function Drawer({ open, onClose, type, payload }) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  let title = "";
  let content = null;

  if (type === "cobrado" && payload) {
    title = "Pagos cobrados";
    content = (
      <ul className="drawer-list">
        {payload.map((p) => (
          <li key={p.id} className="drawer-item">
            <div>
              <span className="di-nombre">{p.contratos?.inquilinos?.nombre ?? "—"}</span>
              <span className="di-sub">{p.contratos?.unidades?.codigo} · {p.tipo} · {p.metodo_pago}</span>
            </div>
            <span className="di-monto green">Bs. {fmt(p.monto)}</span>
          </li>
        ))}
      </ul>
    );
  } else if (type === "pendiente" && payload) {
    if (Array.isArray(payload)) {
      title = "Pagos pendientes";
      content = (
        <ul className="drawer-list">
          {payload.map((p) => {
            const m = p.monto > 0 ? p.monto : (p.contratos?.monto_alquiler || 0) + (p.contratos?.monto_expensa || 0);
            return (
              <li key={p.id} className="drawer-item">
                <div>
                  <span className="di-nombre">{p.contratos?.inquilinos?.nombre ?? "—"}</span>
                  <span className="di-sub">{p.contratos?.unidades?.codigo} · {p.tipo}</span>
                </div>
                <span className="di-monto red">Bs. {fmt(m)}</span>
              </li>
            );
          })}
        </ul>
      );
    } else {
      const p = payload;
      const m = p.monto > 0 ? p.monto : (p.contratos?.monto_alquiler || 0) + (p.contratos?.monto_expensa || 0);
      title = p.contratos?.inquilinos?.nombre ?? "Pago pendiente";
      content = (
        <div className="drawer-detail">
          <div className="detail-row"><span>Local</span><span>{p.contratos?.unidades?.codigo}</span></div>
          <div className="detail-row"><span>Tipo</span><span>{p.tipo}</span></div>
          <div className="detail-row"><span>Estado</span><span className={`estado-${p.estado}`}>{p.estado}</span></div>
          <div className="detail-row"><span>Monto</span><span className="red">Bs. {fmt(m)}</span></div>
          <div className="detail-row"><span>Alquiler</span><span>Bs. {fmt(p.contratos?.monto_alquiler)}</span></div>
          <div className="detail-row"><span>Expensa</span><span>Bs. {fmt(p.contratos?.monto_expensa)}</span></div>
        </div>
      );
    }
  } else if (type === "deuda-local" && payload) {
    const r = payload;
    title = `${r.local} — ${r.inquilino}`;
    content = (
      <div className="drawer-detail">
        {r.debe_alquiler > 0 && <div className="detail-row"><span>Alquiler</span><span className="red">Bs. {fmt(r.debe_alquiler)}</span></div>}
        {r.meses_alquiler.length > 0 && <div className="detail-row small"><span>Meses</span><span>{r.meses_alquiler.join(", ")}</span></div>}
        {r.debe_expensa > 0 && <div className="detail-row"><span>Expensa</span><span className="red">Bs. {fmt(r.debe_expensa)}</span></div>}
        {r.meses_expensa.length > 0 && <div className="detail-row small"><span>Meses</span><span>{r.meses_expensa.join(", ")}</span></div>}
        {r.debe_multas > 0 && <div className="detail-row"><span>Multas</span><span className="red">Bs. {fmt(r.debe_multas)}</span></div>}
        {r.motivos_multa.length > 0 && <div className="detail-row small"><span>Motivos</span><span>{r.motivos_multa.join(", ")}</span></div>}
        <div className="detail-row big border-top"><span>Total</span><span className="red">Bs. {fmt(r.total)}</span></div>
      </div>
    );
  } else if (type === "gastos" && payload) {
    title = "Gastos del mes";
    content = (
      <ul className="drawer-list">
        {payload.map((g) => (
          <li key={g.id} className="drawer-item">
            <div>
              <span className="di-nombre">{g.concepto}</span>
              <span className="di-sub">{g.categoria}</span>
            </div>
            <span className="di-monto" style={{ color: "var(--amber)" }}>Bs. {fmt(g.monto)}</span>
          </li>
        ))}
        {payload.length === 0 && <p className="empty-msg">Sin gastos este mes</p>}
      </ul>
    );
  } else if (type === "multa" && payload) {
    const m = payload;
    title = m.contratos?.inquilinos?.nombre ?? "Multa";
    content = (
      <div className="drawer-detail">
        <div className="detail-row"><span>Local</span><span>{m.contratos?.unidades?.codigo}</span></div>
        <div className="detail-row"><span>Motivo</span><span>{m.motivo}</span></div>
        <div className="detail-row"><span>Fecha</span><span>{m.fecha}</span></div>
        <div className="detail-row"><span>Estado</span><span className={`estado-${m.estado}`}>{m.estado}</span></div>
        <div className="detail-row"><span>Monto</span><span className="red">Bs. {fmt(m.monto)}</span></div>
      </div>
    );
  } else if (type === "unit" && payload) {
    const u = payload;
    const contrato = u.contratos?.find((c) => c.estado === "activo");
    title = `Local ${u.codigo}`;
    content = (
      <div className="drawer-detail">
        <div className="detail-row"><span>Tipo</span><span>{u.tipo}</span></div>
        <div className="detail-row"><span>Estado</span><span>{u.estado}</span></div>
        {contrato && (
          <>
            <div className="detail-row"><span>Inquilino</span><span>{contrato.inquilinos?.nombre}</span></div>
            <div className="detail-row"><span>Alquiler</span><span>Bs. {fmt(contrato.monto_alquiler)}</span></div>
            <div className="detail-row"><span>Expensa</span><span>Bs. {fmt(contrato.monto_expensa)}</span></div>
          </>
        )}
      </div>
    );
  } else if (type === "neto") {
    title = "Neto del mes";
    content = (
      <div className="drawer-detail">
        <div className="detail-row big"><span>Cobrado</span><span className="green">Bs. {fmt(payload?.cobrado)}</span></div>
        <div className="detail-row big"><span>Gastos</span><span className="red">Bs. {fmt(payload?.gastos)}</span></div>
        <div className="detail-row big border-top"><span>Neto</span><span className={payload?.neto >= 0 ? "green" : "red"}>Bs. {fmt(payload?.neto)}</span></div>
      </div>
    );
  }

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <div className="drawer-handle" />
        <div className="drawer-header">
          <h3 className="drawer-title">{title}</h3>
          <button className="drawer-close" onClick={onClose}>✕</button>
        </div>
        <div className="drawer-content">{content}</div>
      </div>
    </>
  );
}

// ─── Month Navigator ─────────────────────────────────────────────────────────
function MonthNav({ mes, anio, onChange }) {
  const prev = () => {
    if (mes === 1) onChange(12, anio - 1);
    else onChange(mes - 1, anio);
  };
  const next = () => {
    if (mes === 12) onChange(1, anio + 1);
    else onChange(mes + 1, anio);
  };
  return (
    <div className="month-nav">
      <button className="nav-arrow" onClick={prev}>‹</button>
      <span className="nav-label">{MONTHS[mes - 1]} {anio}</span>
      <button className="nav-arrow" onClick={next}>›</button>
    </div>
  );
}

// ─── Tab Bar ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: "resumen", label: "Resumen", icon: "◎" },
  { id: "cobros", label: "Cobros", icon: "◆" },
  { id: "resultados", label: "Resultados", icon: "▤" },
  { id: "actividad", label: "Actividad", icon: "◷" },
];

function TabBar({ active, onChange, badges }) {
  return (
    <nav className="tab-bar">
      {TABS.map((t) => (
        <button key={t.id} className={`tab-btn ${active === t.id ? "active" : ""}`} onClick={() => onChange(t.id)}>
          <span className="tab-icon">{t.icon}</span>
          <span className="tab-label">{t.label}</span>
          {badges?.[t.id] > 0 && <span className="tab-badge">{badges[t.id]}</span>}
        </button>
      ))}
    </nav>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [edificio, setEdificio] = useState(null);
  const [token, setToken] = useState(null);
  const [authState, setAuthState] = useState("loading");
  const [mes, setMes] = useState(null);
  const [anio, setAnio] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("resumen");
  const [drawer, setDrawer] = useState({ open: false, type: null, payload: null });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t");
    if (!t) { setAuthState("denied"); return; }
    fetchLatest(t).then((result) => {
      if (result?.edificio) {
        setToken(t);
        setEdificio(result.edificio);
        setMes(result.latest.mes);
        setAnio(result.latest.anio);
        setAuthState("ok");
      } else {
        setAuthState("denied");
      }
    });
  }, []);

  useEffect(() => {
    if (authState !== "ok" || !token || !mes || !anio) return;
    setLoading(true);
    fetchDashboardData(token, mes, anio).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [authState, token, mes, anio]);

  const openDrawer = useCallback((type, payload) => setDrawer({ open: true, type, payload }), []);
  const closeDrawer = useCallback(() => setDrawer({ open: false, type: null, payload: null }), []);

  if (authState === "loading") return <div className="splash"><div className="spinner" /></div>;
  if (authState === "denied") return <div className="splash"><p className="denied-msg">Acceso no autorizado</p></div>;

  const badges = data ? {
    cobros: data.deudaReal.length,
    actividad: data.gastosFijos.length,
  } : {};

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div>
            <p className="header-eyebrow">Panel BI</p>
            <h1 className="header-title">{edificio.nombre}</h1>
          </div>
          <div className="header-right">
            {(tab === "resumen" || tab === "resultados") && (
              <MonthNav mes={mes} anio={anio} onChange={(m, a) => { setMes(m); setAnio(a); }} />
            )}
            <button
              className="export-btn"
              onClick={() => data && exportCSV(data, mes, anio)}
              disabled={!data}
            >
              ↓ CSV
            </button>
          </div>
        </div>
        <TabBar active={tab} onChange={setTab} badges={badges} />
      </header>

      {loading && <div className="loading-bar" />}

      <main className="app-main">
        {data && (
          <>
            {tab === "resumen" && (
              <>
                <div className="kpi-grid">
                  <KPICard label="Cobrado" value={data.totalCobrado} accent="var(--green)" index={0} onClick={() => openDrawer("cobrado", data.cobrados)} sub={`${data.cobrados.length} pagos`} />
                  <KPICard label="Pendiente" value={data.totalPendiente} accent="var(--red)" index={1} onClick={() => openDrawer("pendiente", data.pendientes)} sub={`${data.pendientes.length} deudores`} />
                  <KPICard label="Gastos" value={data.totalGastos} accent="var(--amber)" index={2} onClick={() => openDrawer("gastos", data.gastos)} sub={`${data.gastos.length} registros`} />
                  <KPICard label="Neto" value={data.neto} accent={data.neto >= 0 ? "var(--green)" : "var(--red)"} index={3} onClick={() => openDrawer("neto", { cobrado: data.totalCobrado, gastos: data.totalGastos, neto: data.neto })} />
                </div>

                <CompBar cobrado={data.totalCobrado} pendiente={data.totalPendiente} />

                <OcupacionGrid unidades={data.unidades} unitStatus={data.unitStatus} onUnitClick={(u) => openDrawer("unit", u)} />

                {data.pendientes.length > 0 && (
                  <MorososList pendientes={data.pendientes} onOpen={openDrawer} />
                )}
              </>
            )}

            {tab === "cobros" && (
              <>
                <DeudaRealSection deudaReal={data.deudaReal} totalDeudaReal={data.totalDeudaReal} onOpen={openDrawer} />
                <DocumentosSection documentos={data.documentos} />
                <MultasSection multas={data.multas} onOpen={openDrawer} />
              </>
            )}

            {tab === "resultados" && (
              <>
                <ResultadosSection resultados={data.resultados} />
                <GastosDetalleSection gastos={data.gastos} />
              </>
            )}

            {tab === "actividad" && (
              <>
                <GastosFijosSection gastosFijos={data.gastosFijos} />
                <MantenimientoSection mantenimiento={data.mantenimiento} />
                <ActividadFeed actividad={data.actividad} />
              </>
            )}
          </>
        )}
      </main>

      <Drawer open={drawer.open} onClose={closeDrawer} type={drawer.type} payload={drawer.payload} />
    </div>
  );
}
