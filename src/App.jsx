import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabase.js";
import "./app.css";

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n ?? 0);

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

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

// ─── Token validation ────────────────────────────────────────────────────────
async function validateToken(token) {
  const { data, error } = await supabase
    .from("edificios")
    .select("id, nombre")
    .eq("dashboard_token", token)
    .single();
  if (error || !data) return null;
  return data;
}

// ─── Find last month with data ───────────────────────────────────────────────
async function getLatestDataMonth() {
  const { data } = await supabase
    .from("pagos")
    .select("mes, anio")
    .order("anio", { ascending: false })
    .order("mes", { ascending: false })
    .limit(1)
    .single();
  if (data) return { mes: data.mes, anio: data.anio };
  const now = new Date();
  return { mes: now.getMonth() + 1, anio: now.getFullYear() };
}

// ─── Data fetcher ────────────────────────────────────────────────────────────
async function fetchDashboardData(edificioId, mes, anio) {
  const [pagosRes, gastosRes, unidadesRes, contratosRes] = await Promise.all([
    supabase
      .from("pagos")
      .select("id, tipo, monto, estado, fecha_pago, metodo_pago, numero_documento, tipo_documento, contrato_id, contratos(monto_alquiler, monto_expensa, estado, unidades(codigo), inquilinos(nombre))")
      .eq("mes", mes)
      .eq("anio", anio),
    supabase
      .from("gastos")
      .select("id, concepto, categoria, subcategoria, monto, mes, anio, fecha, proveedor, numero_factura, notas")
      .eq("edificio_id", edificioId)
      .eq("mes", mes)
      .eq("anio", anio),
    supabase
      .from("unidades")
      .select("id, codigo, tipo, estado, contratos(id, estado, monto_alquiler, monto_expensa, inquilinos(nombre))")
      .eq("edificio_id", edificioId)
      .neq("estado", "inactivo"),
    supabase
      .from("contratos")
      .select("id, estado, monto_alquiler, monto_expensa, unidades(codigo), inquilinos(nombre)")
      .eq("edificio_id", edificioId)
      .eq("estado", "activo"),
  ]);

  const pagos = pagosRes.data ?? [];
  const gastos = gastosRes.data ?? [];
  const unidades = unidadesRes.data ?? [];
  const contratos = contratosRes.data ?? [];

  const pagosFiltrados = pagos.filter((p) => p.contratos?.unidades !== undefined);
  const cobrados = pagosFiltrados.filter((p) => p.estado === "pagado");
  const totalCobrado = cobrados.reduce((s, p) => s + (p.monto || 0), 0);

  // Si el mes ya tiene pagos registrados, usar esos como fuente de verdad.
  // Si no hay ningún registro (mes sin datos aún), usar contratos activos como baseline.
  const mesConRegistros = pagos.length > 0;
  let totalPendiente;
  if (mesConRegistros) {
    // Mes histórico: pendiente = suma de pagos en estado pendiente/parcial
    const pendientesRegs = pagosFiltrados.filter((p) => p.estado === "pendiente" || p.estado === "parcial");
    totalPendiente = pendientesRegs.reduce((s, p) => s + (p.monto || 0), 0);
  } else {
    // Mes sin registros: pendiente = todo lo esperado según contratos
    const totalEsperado = contratos.reduce((s, c) => s + (c.monto_alquiler || 0) + (c.monto_expensa || 0), 0);
    totalPendiente = Math.max(0, totalEsperado - totalCobrado);
  }

  const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0);
  const neto = totalCobrado - totalGastos;

  // unitStatus desde pagos registrados
  const unitStatus = {};
  pagosFiltrados.forEach((p) => {
    const cod = p.contratos?.unidades?.codigo;
    if (!cod) return;
    if (p.estado === "pagado") unitStatus[cod] = "pagado";
    else if (p.estado === "parcial" && unitStatus[cod] !== "pagado") unitStatus[cod] = "parcial";
    else if (!unitStatus[cod]) unitStatus[cod] = "moroso";
  });

  // Contratos sin ningún pago registrado este mes
  const contratosConPago = new Set(pagosFiltrados.map((p) => p.contrato_id));
  const sinPago = contratos.filter((c) => !contratosConPago.has(c.id));

  // Lista de pendientes y morosos en el grid
  const pendientesReales = pagosFiltrados.filter((p) => p.estado === "pendiente" || p.estado === "parcial");
  let pendientes;
  if (mesConRegistros) {
    // Mes con registros: solo los que tienen estado pendiente/parcial en DB
    pendientes = pendientesReales;
  } else {
    // Mes sin registros: todos los contratos activos son potencialmente morosos
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

  return { totalCobrado, totalPendiente, totalGastos, neto, cobrados, pendientes, gastos, gastosCat, unidades, unitStatus, contratos, pagosFiltrados };
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({ label, value, accent, index, onClick, sub }) {
  const animated = useCounter(value);
  return (
    <button className="kpi-card" style={{ "--accent": accent, "--i": index }} onClick={onClick}>
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

// ─── Morosos List ────────────────────────────────────────────────────────────
function MorososList({ pendientes, onOpen }) {
  const [expanded, setExpanded] = useState(false);
  const items = expanded ? pendientes : pendientes.slice(0, 4);
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Morosos</h2>
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

// ─── Gastos Section ──────────────────────────────────────────────────────────
function GastosSection({ gastos, gastosCat, onOpen }) {
  const [view, setView] = useState("chart");
  const maxCat = Math.max(...Object.values(gastosCat), 1);
  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Gastos</h2>
        <div className="toggle-group">
          <button className={`toggle-btn ${view === "chart" ? "active" : ""}`} onClick={() => setView("chart")}>Gráfico</button>
          <button className={`toggle-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>Lista</button>
        </div>
      </div>
      {view === "chart" ? (
        <div className="cat-bars">
          {Object.entries(gastosCat).map(([cat, val]) => (
            <div key={cat} className="cat-row">
              <span className="cat-label">{cat}</span>
              <div className="cat-bar-bg">
                <div className="cat-bar-fill" style={{ width: `${(val / maxCat) * 100}%` }} />
              </div>
              <span className="cat-amount">Bs. {fmt(val)}</span>
            </div>
          ))}
          {Object.keys(gastosCat).length === 0 && <p className="empty-msg">Sin gastos este mes</p>}
        </div>
      ) : (
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
    const now = new Date();
    if (anio > now.getFullYear() || (anio === now.getFullYear() && mes >= now.getMonth() + 1)) return;
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

// ─── App ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [edificio, setEdificio] = useState(null);
  const [authState, setAuthState] = useState("loading");
  const [mes, setMes] = useState(null);
  const [anio, setAnio] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drawer, setDrawer] = useState({ open: false, type: null, payload: null });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("t");
    if (!token) { setAuthState("denied"); return; }
    Promise.all([validateToken(token), getLatestDataMonth()]).then(([ed, latest]) => {
      if (ed) {
        setEdificio(ed);
        setMes(latest.mes);
        setAnio(latest.anio);
        setAuthState("ok");
      } else {
        setAuthState("denied");
      }
    });
  }, []);

  useEffect(() => {
    if (authState !== "ok" || !edificio || !mes || !anio) return;
    setLoading(true);
    fetchDashboardData(edificio.id, mes, anio).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [authState, edificio, mes, anio]);

  const openDrawer = useCallback((type, payload) => setDrawer({ open: true, type, payload }), []);
  const closeDrawer = useCallback(() => setDrawer({ open: false, type: null, payload: null }), []);

  if (authState === "loading") return <div className="splash"><div className="spinner" /></div>;
  if (authState === "denied") return <div className="splash"><p className="denied-msg">Acceso no autorizado</p></div>;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div>
            <p className="header-eyebrow">Panel BI</p>
            <h1 className="header-title">{edificio.nombre}</h1>
          </div>
          <div className="header-right">
            <MonthNav mes={mes} anio={anio} onChange={(m, a) => { setMes(m); setAnio(a); }} />
            <button
              className="export-btn"
              onClick={() => data && exportCSV(data, mes, anio)}
              disabled={!data}
            >
              ↓ CSV
            </button>
          </div>
        </div>
      </header>

      {loading && <div className="loading-bar" />}

      <main className="app-main">
        {data && (
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

            <GastosSection gastos={data.gastos} gastosCat={data.gastosCat} onOpen={openDrawer} />
          </>
        )}
      </main>

      <Drawer open={drawer.open} onClose={closeDrawer} type={drawer.type} payload={drawer.payload} />
    </div>
  );
}
