import { useState, useEffect } from "react";
import { supabase } from "./supabase.js";
import * as XLSX from "xlsx";
import { generarReporte } from "./reporte.js";

// ─────────────────────────────────────────
// TEMA: oscuro + plateado ejecutivo
// ─────────────────────────────────────────
const C = {
  bg:     "#0a0c10",   // fondo principal
  sb:     "#0f1218",   // sidebar
  card:   "#13171f",   // tarjetas
  cb:     "#1c2230",   // bordes
  ac:     "#c0c8d8",   // acento plateado
  ac2:    "#7b90b0",   // plateado secundario
  gr:     "#34c17b",   // verde
  re:     "#e5484d",   // rojo
  am:     "#f59e0b",   // amarillo/alerta
  bl:     "#5b8def",   // azul
  pu:     "#9b7fe8",   // púrpura
  tx:     "#dde2ec",   // texto principal
  mu:     "#5a6478",   // texto muted
  wh:     "#f0f2f7",   // blanco suave
};

const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const YEARS = [2023, 2024, 2025, 2026, 2027];

// ─────────────────────────────────────────
// ESTILOS GLOBALES
// ─────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Inter', sans-serif; background: ${C.bg}; color: ${C.tx}; -webkit-font-smoothing: antialiased; }
input, select, textarea { font-family: 'Inter', sans-serif; }
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: ${C.bg}; }
::-webkit-scrollbar-thumb { background: ${C.cb}; border-radius: 4px; }

/* Layout principal */
.app-shell { display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
.sidebar {
  width: 220px; background: ${C.sb}; border-right: 1px solid ${C.cb};
  display: flex; flex-direction: column; padding: 20px 10px;
  flex-shrink: 0; height: 100vh; overflow-y: auto;
}
.app-body { display: flex; flex: 1; overflow: hidden; }
.main-content { flex: 1; overflow-y: auto; padding: 24px 20px; }

/* Mobile */
.mobile-header { display: none; }
.bottom-nav { display: none; }
@media (max-width: 768px) {
  .app-shell { flex-direction: column; }
  .app-body { flex-direction: column; }
  .mobile-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 12px 16px; background: ${C.sb}; border-bottom: 1px solid ${C.cb};
    flex-shrink: 0;
  }
  .sidebar { display: none !important; }
  .main-content { padding: 14px 12px 90px 12px; height: 100%; }
  .bottom-nav {
    display: flex; position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
    background: ${C.sb}; border-top: 1px solid ${C.cb};
    padding: 8px 0 12px;
  }
  .bottom-nav-item {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: 3px; padding: 4px 2px; cursor: pointer; transition: all 0.15s;
    border: none; background: none;
  }
  .bottom-nav-item .nav-icon { font-size: 22px; line-height: 1; }
  .bottom-nav-item .nav-label { font-size: 10px; font-weight: 500; color: ${C.mu}; }
  .bottom-nav-item.active .nav-label { color: ${C.ac}; }
}

/* Navegación */
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 10px 14px;
  border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500;
  color: ${C.mu}; transition: all 0.15s; margin-bottom: 2px;
}
.nav-item:hover { background: rgba(192,200,216,0.06); color: ${C.tx}; }
.nav-item.active { background: rgba(192,200,216,0.1); color: ${C.ac}; }
.nav-section { font-size: 10px; font-weight: 600; color: ${C.mu}; text-transform: uppercase; letter-spacing: 0.8px; padding: 12px 14px 6px; }

/* Botones */
.btn {
  padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer;
  font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
  transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px;
}
.btn:hover { opacity: 0.85; } .btn:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-sm { padding: 6px 12px; font-size: 12px; }
.btn-primary { background: ${C.ac}; color: ${C.bg}; font-weight: 600; }
.btn-secondary { background: ${C.cb}; color: ${C.tx}; }
.btn-ghost { background: transparent; color: ${C.mu}; border: 1px solid ${C.cb}; }
.btn-ghost:hover { border-color: ${C.ac2}; color: ${C.tx}; }
.btn-success { background: rgba(52,193,123,0.1); color: ${C.gr}; border: 1px solid rgba(52,193,123,0.2); }
.btn-danger { background: rgba(229,72,77,0.08); color: ${C.re}; border: 1px solid rgba(229,72,77,0.15); }

/* Formularios */
.form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
.form-label { font-size: 11px; color: ${C.mu}; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.form-input {
  background: ${C.bg}; border: 1px solid ${C.cb}; border-radius: 8px;
  padding: 9px 12px; color: ${C.tx}; font-size: 14px; outline: none;
  transition: border-color 0.15s; width: 100%;
}
.form-input:focus { border-color: ${C.ac2}; }

/* Tarjetas */
.card { background: ${C.card}; border: 1px solid ${C.cb}; border-radius: 12px; padding: 18px 20px; }
.card-sm { background: ${C.card}; border: 1px solid ${C.cb}; border-radius: 10px; padding: 14px 16px; }

/* Tablas */
.table-wrapper { overflow-x: auto; background: ${C.card}; border-radius: 12px; border: 1px solid ${C.cb}; }
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.7px; color: ${C.mu}; padding: 12px 16px; text-align: left; font-weight: 600; border-bottom: 1px solid ${C.cb}; white-space: nowrap; }
.data-table td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid rgba(28,34,48,0.6); }
.data-table tr:last-child td { border-bottom: none; }
.table-row:hover { background: rgba(192,200,216,0.02); }

/* Badges */
.badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 600; letter-spacing: 0.3px; white-space: nowrap; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.7); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
.modal-box { background: ${C.card}; border: 1px solid ${C.cb}; border-radius: 14px; padding: 26px; width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }

/* Toast */
.toast { position: fixed; top: 20px; right: 20px; background: ${C.card}; border-radius: 10px; padding: 12px 18px; display: flex; align-items: center; gap: 10px; z-index: 2000; box-shadow: 0 4px 24px rgba(0,0,0,0.5); border: 1px solid ${C.cb}; font-size: 13px; max-width: 320px; animation: slideIn 0.25s ease; }
@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

/* Login */
.login-bg { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: ${C.bg}; padding: 20px; }

/* Hamburger */
.hamburger { background: none; border: none; color: ${C.tx}; font-size: 20px; cursor: pointer; padding: 4px; }

/* Grids responsivos */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.grid-kpi { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
@media (max-width: 480px) {
  .grid-2 { grid-template-columns: 1fr; }
  .grid-3 { grid-template-columns: 1fr 1fr; }
}

/* Barra de progreso */
.progress-bar { background: ${C.bg}; border-radius: 4px; height: 6px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }

/* Sección título */
.section-title { font-size: 20px; font-weight: 700; color: ${C.wh}; letter-spacing: -0.3px; }
.section-sub { color: ${C.mu}; font-size: 13px; margin-top: 3px; }

/* Local card (vista de locales) */
.local-card {
  background: ${C.card}; border: 1px solid ${C.cb}; border-radius: 10px;
  padding: 14px; cursor: pointer; transition: all 0.15s;
}
.local-card:hover { border-color: ${C.ac2}; background: rgba(192,200,216,0.03); }
.local-card.pagado { border-left: 3px solid ${C.gr}; }
.local-card.pendiente { border-left: 3px solid ${C.re}; }
.local-card.sin-contrato { border-left: 3px solid ${C.mu}; }
`;

// ─────────────────────────────────────────
// UTILIDADES
// ─────────────────────────────────────────
const exportExcel = (datos, nombre, hoja) => {
  const ws = XLSX.utils.json_to_sheet(datos);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, hoja);
  XLSX.writeFile(wb, `${nombre}.xlsx`);
};

const importExcel = (file, onDone) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const wb = XLSX.read(e.target.result, { type: "binary" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    onDone(XLSX.utils.sheet_to_json(ws));
  };
  reader.readAsBinaryString(file);
};

const hoy = () => new Date().toISOString().split("T")[0];
const fmt = (n) => Number(n).toLocaleString("es-BO");

// ─────────────────────────────────────────
// COMPONENTES BASE
// ─────────────────────────────────────────

// Badges de estado
const BADGE_STYLES = {
  activo:       { bg: "rgba(52,193,123,0.12)",  c: "#34c17b" },
  pagado:       { bg: "rgba(52,193,123,0.12)",  c: "#34c17b" },
  resuelto:     { bg: "rgba(52,193,123,0.12)",  c: "#34c17b" },
  operativo:    { bg: "rgba(52,193,123,0.12)",  c: "#34c17b" },
  pendiente:    { bg: "rgba(245,158,11,0.12)",  c: "#f59e0b" },
  "en progreso":{ bg: "rgba(91,141,239,0.12)",  c: "#5b8def" },
  "en mantenimiento": { bg: "rgba(91,141,239,0.12)", c: "#5b8def" },
  vencido:      { bg: "rgba(229,72,77,0.12)",   c: "#e5484d" },
  rescindido:   { bg: "rgba(229,72,77,0.12)",   c: "#e5484d" },
  "fuera de servicio": { bg: "rgba(229,72,77,0.12)", c: "#e5484d" },
  inactivo:     { bg: "rgba(90,100,120,0.15)",  c: "#5a6478" },
  reemplazado:  { bg: "rgba(90,100,120,0.15)",  c: "#5a6478" },
  alquiler:     { bg: "rgba(155,127,232,0.12)", c: "#9b7fe8" },
  expensa:      { bg: "rgba(245,158,11,0.12)",  c: "#f59e0b" },
  multa:        { bg: "rgba(229,72,77,0.12)",   c: "#e5484d" },
  alta:         { bg: "rgba(229,72,77,0.12)",   c: "#e5484d" },
  media:        { bg: "rgba(245,158,11,0.12)",  c: "#f59e0b" },
  baja:         { bg: "rgba(52,193,123,0.12)",  c: "#34c17b" },
};

const Badge = ({ type }) => {
  const s = BADGE_STYLES[type] || { bg: "rgba(90,100,120,0.15)", c: "#5a6478" };
  const label = type ? type.charAt(0).toUpperCase() + type.slice(1) : "—";
  return <span className="badge" style={{ background: s.bg, color: s.c }}>{label}</span>;
};

// KPI card
const KPI = ({ label, value, color, sub }) => (
  <div className="card-sm">
    <p style={{ fontSize: 10, color: C.mu, textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>{label}</p>
    <p style={{ fontSize: 22, fontWeight: 700, color: color || C.wh, letterSpacing: "-0.5px" }}>{value}</p>
    {sub && <p style={{ fontSize: 11, color: C.mu, marginTop: 4 }}>{sub}</p>}
  </div>
);

// Modal
const Modal = ({ title, onClose, children, wide }) => (
  <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="modal-box" style={wide ? { maxWidth: 680 } : {}}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: C.wh }}>{title}</p>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

// Confirm dialog
const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="modal-overlay">
    <div className="modal-box" style={{ maxWidth: 360 }}>
      <p style={{ fontSize: 15, color: C.wh, marginBottom: 8, fontWeight: 500 }}>¿Confirmar acción?</p>
      <p style={{ fontSize: 13, color: C.mu, marginBottom: 24 }}>{message}</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-danger btn-sm" onClick={onConfirm}>Confirmar</button>
      </div>
    </div>
  </div>
);

// Toast
const Toast = ({ toast, onClose }) => {
  if (!toast) return null;
  const color = toast.type === "error" ? C.re : toast.type === "warn" ? C.am : C.gr;
  const icon = toast.type === "error" ? "✕" : toast.type === "warn" ? "⚠" : "✓";
  return (
    <div className="toast">
      <span style={{ color, fontWeight: 700, fontSize: 14 }}>{icon}</span>
      <span style={{ color: C.tx }}>{toast.message}</span>
      <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", color: C.mu, cursor: "pointer", fontSize: 14 }}>✕</button>
    </div>
  );
};

// Filtro mes/año
const FiltroFecha = ({ mes, anio, setMes, setAnio }) => (
  <div style={{ display: "flex", gap: 6 }}>
    <select className="form-input btn-sm" value={mes} onChange={e => setMes(Number(e.target.value))} style={{ width: "auto", padding: "6px 10px" }}>
      {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
    </select>
    <select className="form-input btn-sm" value={anio} onChange={e => setAnio(Number(e.target.value))} style={{ width: "auto", padding: "6px 10px" }}>
      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
    </select>
  </div>
);

// ─────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────
function Login({ onLogin }) {
  const [f, setF] = useState({ email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const go = async () => {
    setLoading(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword(f);
    if (error) setErr("Email o contraseña incorrectos");
    else onLogin();
    setLoading(false);
  };

  return (
    <div className="login-bg">
      <div style={{ width: "100%", maxWidth: 380 }}>
        {/* Logo / marca */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 52, height: 52, background: C.card, border: `1px solid ${C.cb}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 22 }}>🏢</div>
          <p style={{ fontSize: 22, fontWeight: 700, color: C.wh, letterSpacing: "-0.5px" }}>Edificio Manager</p>
          <p style={{ fontSize: 13, color: C.mu, marginTop: 4 }}>Centro Comercial Limax</p>
        </div>

        <div className="card">
          {err && (
            <div style={{ background: "rgba(229,72,77,0.08)", border: "1px solid rgba(229,72,77,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
              <p style={{ color: C.re, fontSize: 13 }}>{err}</p>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" type="email" placeholder="admin@edificio.com" value={f.email} onChange={e => setF(p => ({ ...p, email: e.target.value }))} onKeyDown={e => e.key === "Enter" && go()} />
          </div>
          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Contraseña</label>
            <input className="form-input" type="password" value={f.password} onChange={e => setF(p => ({ ...p, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && go()} />
          </div>
          <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={go} disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// DASHBOARD — Panel visual ejecutivo
// ─────────────────────────────────────────
function Dashboard({ inquilinos, contratos, pagos, expensas, mantenimiento }) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());

  const pMes = pagos.filter(p => Number(p.mes) === mes && Number(p.anio) === anio);
  const eMes = expensas.filter(e => Number(e.mes) === mes && Number(e.anio) === anio);
  const cobrado = pMes.filter(p => p.estado === "pagado").reduce((a, b) => a + Number(b.monto), 0);
  const pendiente = pMes.filter(p => p.estado === "pendiente").reduce((a, b) => a + Number(b.monto), 0);
  const gastos = eMes.reduce((a, b) => a + Number(b.monto), 0);
  const neto = cobrado - gastos;
  const activos = contratos.filter(c => c.estado === "activo");
  const ocupacion = contratos.length > 0 ? Math.round((activos.length / contratos.length) * 100) : 0;
  const vencen = contratos.filter(c => { const d = (new Date(c.vencimiento) - now) / 86400000; return d > 0 && d < 90; });
  const mantPend = mantenimiento.filter(m => m.estado === "pendiente").length;

  // Últimos 6 meses para mini gráfica de barras
  const ultimos6 = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const m2 = d.getMonth() + 1; const a2 = d.getFullYear();
    const ing = pagos.filter(p => p.mes === m2 && p.anio === a2 && p.estado === "pagado").reduce((a, b) => a + Number(b.monto), 0);
    const gst = expensas.filter(e => e.mes === m2 && e.anio === a2).reduce((a, b) => a + Number(b.monto), 0);
    return { label: MESES[m2].slice(0, 3), ing, gst };
  });
  const maxVal = Math.max(...ultimos6.map(x => Math.max(x.ing, x.gst)), 1);

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="section-title">Panel Financiero</p>
          <p className="section-sub">Centro Comercial Limax · {MESES[mes]} {anio}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <FiltroFecha mes={mes} anio={anio} setMes={setMes} setAnio={setAnio} />
          <button className="btn btn-ghost btn-sm" onClick={() => generarReporte({ mes, anio, inquilinos, contratos, pagos, expensas, mantenimiento })}>
            ↓ Reporte Word
          </button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="grid-kpi" style={{ marginBottom: 16 }}>
        <KPI label="Cobrado" value={`Bs. ${fmt(cobrado)}`} color={C.gr} sub="ingresos del mes" />
        <KPI label="Por cobrar" value={`Bs. ${fmt(pendiente)}`} color={C.am} sub="pagos pendientes" />
        <KPI label="Gastos" value={`Bs. ${fmt(gastos)}`} color={C.re} sub="expensas del mes" />
        <KPI label="Resultado neto" value={`Bs. ${fmt(neto)}`} color={neto >= 0 ? C.gr : C.re} sub="cobrado − gastos" />
        <KPI label="Ocupación" value={`${ocupacion}%`} color={C.ac} sub={`${activos.length} locales activos`} />
        <KPI label="Mantenimiento" value={mantPend} color={mantPend > 0 ? C.re : C.gr} sub="pedidos pendientes" />
      </div>

      {/* Gráfica de barras — últimos 6 meses */}
      <div className="card" style={{ marginBottom: 16 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: C.wh, marginBottom: 16 }}>Evolución — últimos 6 meses</p>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 100 }}>
          {ultimos6.map((x, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, height: "100%" }}>
              <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", gap: 2 }}>
                <div style={{ flex: 1, height: `${(x.ing / maxVal) * 100}%`, background: C.gr, borderRadius: "3px 3px 0 0", opacity: 0.8, minHeight: x.ing > 0 ? 3 : 0 }} title={`Ingresos: Bs. ${fmt(x.ing)}`} />
                <div style={{ flex: 1, height: `${(x.gst / maxVal) * 100}%`, background: C.re, borderRadius: "3px 3px 0 0", opacity: 0.7, minHeight: x.gst > 0 ? 3 : 0 }} title={`Gastos: Bs. ${fmt(x.gst)}`} />
              </div>
              <p style={{ fontSize: 10, color: C.mu }}>{x.label}</p>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
          <span style={{ fontSize: 11, color: C.mu, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: C.gr, borderRadius: 2, display: "inline-block" }} /> Ingresos</span>
          <span style={{ fontSize: 11, color: C.mu, display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: C.re, borderRadius: 2, display: "inline-block" }} /> Gastos</span>
        </div>
      </div>

      {/* Desglose ingresos + gastos */}
      <div className="grid-2" style={{ marginBottom: 16 }}>
        {/* Ingresos del mes */}
        <div className="card">
          <p style={{ fontSize: 13, fontWeight: 600, color: C.wh, marginBottom: 14 }}>Ingresos del mes</p>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {activos.map(c => {
              const inq = inquilinos.find(i => i.id === c.inquilino_id);
              const p = pMes.find(x => x.contrato_id === c.id && x.tipo === "alquiler");
              return (
                <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.cb}` }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 500, color: C.tx }}>{inq?.tienda || "—"}</p>
                    <p style={{ fontSize: 11, color: C.mu }}>{c.local}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: p?.estado === "pagado" ? C.gr : C.am }}>Bs. {fmt(c.monto)}</p>
                    <Badge type={p?.estado || "pendiente"} />
                  </div>
                </div>
              );
            })}
            {activos.length === 0 && <p style={{ color: C.mu, fontSize: 12 }}>Sin contratos activos</p>}
          </div>
        </div>

        {/* Gastos del mes */}
        <div className="card">
          <p style={{ fontSize: 13, fontWeight: 600, color: C.wh, marginBottom: 14 }}>Gastos del mes</p>
          <div style={{ maxHeight: 220, overflowY: "auto" }}>
            {eMes.map(e => (
              <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.cb}` }}>
                <p style={{ fontSize: 12, color: C.tx }}>{e.concepto}</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.re }}>Bs. {fmt(e.monto)}</p>
              </div>
            ))}
            {eMes.length === 0 && <p style={{ color: C.mu, fontSize: 12 }}>Sin gastos registrados</p>}
            {eMes.length > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.wh }}>Total</p>
                <p style={{ fontSize: 12, fontWeight: 700, color: C.re }}>Bs. {fmt(gastos)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alertas */}
      {vencen.length > 0 && (
        <div className="card" style={{ borderLeft: `3px solid ${C.am}` }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.am, marginBottom: 12 }}>⚠ Contratos por vencer</p>
          {vencen.map(c => {
            const inq = inquilinos.find(i => i.id === c.inquilino_id);
            const dias = Math.round((new Date(c.vencimiento) - now) / 86400000);
            return (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.cb}` }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 500 }}>{inq?.tienda}</p>
                  <p style={{ fontSize: 11, color: C.mu }}>{c.local} · vence {c.vencimiento}</p>
                </div>
                <p style={{ fontSize: 12, color: C.re, fontWeight: 600 }}>{dias} días</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// LOCALES — Vista visual de los 34 locales
// ─────────────────────────────────────────
function Locales({ inquilinos, contratos, pagos, reload, showToast }) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [detalle, setDetalle] = useState(null);

  const getEstadoLocal = (contrato) => {
    if (!contrato) return "sin-contrato";
    const p = pagos.find(x => x.contrato_id === contrato.id && x.mes === mes && x.anio === anio && x.tipo === "alquiler");
    return p?.estado === "pagado" ? "pagado" : "pendiente";
  };

  const cobradoMes = contratos.filter(c => c.estado === "activo").reduce((acc, c) => {
    const p = pagos.find(x => x.contrato_id === c.id && x.mes === mes && x.anio === anio && x.estado === "pagado");
    return acc + (p ? Number(p.monto) : 0);
  }, 0);

  const pendienteMes = contratos.filter(c => c.estado === "activo").reduce((acc, c) => {
    const p = pagos.find(x => x.contrato_id === c.id && x.mes === mes && x.anio === anio && x.tipo === "alquiler");
    if (!p || p.estado !== "pagado") return acc + Number(c.monto);
    return acc;
  }, 0);

  const marcarPagado = async (contrato) => {
    const p = pagos.find(x => x.contrato_id === contrato.id && x.mes === mes && x.anio === anio && x.tipo === "alquiler");
    if (p) {
      await supabase.from("pagos").update({ estado: "pagado", fecha: hoy() }).eq("id", p.id);
    } else {
      await supabase.from("pagos").insert([{ contrato_id: contrato.id, tipo: "alquiler", mes, anio, monto: contrato.monto, estado: "pagado", fecha: hoy() }]);
    }
    reload(); showToast("Marcado como cobrado"); setDetalle(null);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="section-title">Locales</p>
          <p className="section-sub">{contratos.filter(c => c.estado === "activo").length} activos de {contratos.length} totales</p>
        </div>
        <FiltroFecha mes={mes} anio={anio} setMes={setMes} setAnio={setAnio} />
      </div>

      {/* Resumen rápido */}
      <div className="grid-2" style={{ marginBottom: 16 }}>
        <div className="card-sm" style={{ borderLeft: `3px solid ${C.gr}` }}>
          <p style={{ fontSize: 10, color: C.mu, textTransform: "uppercase", marginBottom: 4 }}>Cobrado</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: C.gr }}>Bs. {fmt(cobradoMes)}</p>
        </div>
        <div className="card-sm" style={{ borderLeft: `3px solid ${C.re}` }}>
          <p style={{ fontSize: 10, color: C.mu, textTransform: "uppercase", marginBottom: 4 }}>Pendiente</p>
          <p style={{ fontSize: 20, fontWeight: 700, color: C.re }}>Bs. {fmt(pendienteMes)}</p>
        </div>
      </div>

      {/* Grid de locales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {contratos.sort((a, b) => a.local.localeCompare(b.local, undefined, { numeric: true })).map(c => {
          const inq = inquilinos.find(i => i.id === c.inquilino_id);
          const estado = getEstadoLocal(c.estado === "activo" ? c : null);
          return (
            <div key={c.id} className={`local-card ${estado}`} onClick={() => setDetalle({ contrato: c, inquilino: inq, estado })}>
              <p style={{ fontSize: 11, fontWeight: 700, color: C.ac, marginBottom: 3 }}>{c.local}</p>
              <p style={{ fontSize: 12, fontWeight: 500, color: C.wh, marginBottom: 2 }}>{inq?.tienda || "—"}</p>
              <p style={{ fontSize: 11, color: C.mu, marginBottom: 8 }}>{inq?.nombre || "Sin inquilino"}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: C.tx }}>Bs. {fmt(c.monto)}</p>
                <span style={{ fontSize: 10, fontWeight: 600, color: estado === "pagado" ? C.gr : estado === "pendiente" ? C.re : C.mu }}>
                  {estado === "pagado" ? "✓" : estado === "pendiente" ? "●" : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detalle de local */}
      {detalle && (
        <Modal title={`${detalle.contrato.local} — ${detalle.inquilino?.tienda || "Sin tienda"}`} onClose={() => setDetalle(null)}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: C.mu, marginBottom: 4 }}>Inquilino</p>
            <p style={{ fontSize: 15, fontWeight: 600, color: C.wh }}>{detalle.inquilino?.nombre || "—"}</p>
            <p style={{ fontSize: 13, color: C.mu }}>{detalle.inquilino?.email} · {detalle.inquilino?.telefono}</p>
          </div>
          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div><p style={{ fontSize: 11, color: C.mu, marginBottom: 3 }}>ALQUILER</p><p style={{ fontSize: 18, fontWeight: 700, color: C.wh }}>Bs. {fmt(detalle.contrato.monto)}</p></div>
            <div><p style={{ fontSize: 11, color: C.mu, marginBottom: 3 }}>DEPÓSITO</p><p style={{ fontSize: 18, fontWeight: 700, color: C.mu }}>Bs. {fmt(detalle.contrato.deposito)}</p></div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: 11, color: C.mu, marginBottom: 3 }}>VIGENCIA</p>
            <p style={{ fontSize: 13, color: C.tx }}>{detalle.contrato.inicio} → {detalle.contrato.vencimiento}</p>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Badge type={detalle.estado} />
            {detalle.estado === "pendiente" && detalle.contrato.estado === "activo" && (
              <button className="btn btn-success" onClick={() => marcarPagado(detalle.contrato)}>✓ Marcar como cobrado</button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// FINANZAS — Pagos y gastos
// ─────────────────────────────────────────
function Finanzas({ pagos, contratos, inquilinos, expensas, reload, showToast }) {
  const now = new Date();
  const [tab, setTab] = useState("pagos");
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [est, setEst] = useState("todos");
  const [modalPago, setModalPago] = useState(false);
  const [modalGasto, setModalGasto] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fp, setFp] = useState({ contrato_id: "", tipo: "alquiler", mes: now.getMonth() + 1, anio: now.getFullYear(), monto: "", fecha: "", estado: "pendiente" });
  const [fg, setFg] = useState({ concepto: "", monto: "", mes: now.getMonth() + 1, anio: now.getFullYear(), descripcion: "" });

  const pagosFiltrados = pagos.filter(p => p.mes === mes && p.anio === anio && (est === "todos" || p.estado === est));
  const gastosFiltrados = expensas.filter(e => e.mes === mes && e.anio === anio);

  const savePago = async () => {
    if (!fp.contrato_id || !fp.monto) return showToast("Completá los campos requeridos", "error");
    setSaving(true);
    await supabase.from("pagos").insert([{ ...fp, monto: Number(fp.monto), mes: Number(fp.mes), anio: Number(fp.anio) }]);
    setModalPago(false); reload(); showToast("Pago registrado"); setSaving(false);
  };

  const saveGasto = async () => {
    if (!fg.concepto || !fg.monto) return showToast("Completá concepto y monto", "error");
    setSaving(true);
    await supabase.from("expensas").insert([{ ...fg, monto: Number(fg.monto), mes: Number(fg.mes), anio: Number(fg.anio) }]);
    setModalGasto(false); reload(); showToast("Gasto registrado"); setSaving(false);
  };

  const eliminar = async () => {
    if (deleteType === "pago") await supabase.from("pagos").delete().eq("id", confirmDelete);
    else await supabase.from("expensas").delete().eq("id", confirmDelete);
    setConfirmDelete(null); setDeleteType(null); reload(); showToast("Eliminado");
  };

  const cobradoTotal = pagosFiltrados.filter(p => p.estado === "pagado").reduce((a, b) => a + Number(b.monto), 0);
  const pendienteTotal = pagosFiltrados.filter(p => p.estado === "pendiente").reduce((a, b) => a + Number(b.monto), 0);
  const gastosTotal = gastosFiltrados.reduce((a, b) => a + Number(b.monto), 0);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="section-title">Finanzas</p>
          <p className="section-sub">Pagos y gastos del edificio</p>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <FiltroFecha mes={mes} anio={anio} setMes={setMes} setAnio={setAnio} />
          {tab === "pagos" && <button className="btn btn-primary btn-sm" onClick={() => { setFp({ contrato_id: "", tipo: "alquiler", mes, anio, monto: "", fecha: "", estado: "pendiente" }); setModalPago(true); }}>+ Pago</button>}
          {tab === "gastos" && <button className="btn btn-primary btn-sm" onClick={() => { setFg({ concepto: "", monto: "", mes, anio, descripcion: "" }); setModalGasto(true); }}>+ Gasto</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.card, borderRadius: 10, padding: 4, border: `1px solid ${C.cb}` }}>
        {[["pagos", "Cobros"], ["gastos", "Gastos"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "8px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: tab === id ? C.cb : "transparent", color: tab === id ? C.wh : C.mu, transition: "all 0.15s" }}>{label}</button>
        ))}
      </div>

      {tab === "pagos" && (
        <>
          <div className="grid-2" style={{ marginBottom: 14 }}>
            <div className="card-sm" style={{ borderLeft: `3px solid ${C.gr}` }}><p style={{ fontSize: 10, color: C.mu, textTransform: "uppercase" }}>Cobrado</p><p style={{ fontSize: 20, fontWeight: 700, color: C.gr }}>Bs. {fmt(cobradoTotal)}</p></div>
            <div className="card-sm" style={{ borderLeft: `3px solid ${C.am}` }}><p style={{ fontSize: 10, color: C.mu, textTransform: "uppercase" }}>Pendiente</p><p style={{ fontSize: 20, fontWeight: 700, color: C.am }}>Bs. {fmt(pendienteTotal)}</p></div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
            {["todos", "pagado", "pendiente"].map(v => (
              <button key={v} className={`btn btn-sm ${est === v ? "btn-primary" : "btn-ghost"}`} onClick={() => setEst(v)}>
                {v === "todos" ? "Todos" : v === "pagado" ? "Cobrados" : "Pendientes"}
              </button>
            ))}
            <button className="btn btn-ghost btn-sm" onClick={() => exportExcel(pagosFiltrados.map(p => { const c = contratos.find(x => x.id === p.contrato_id); const inq = inquilinos.find(x => x.id === c?.inquilino_id); return { Inquilino: inq?.nombre, Tienda: inq?.tienda, Local: c?.local, Tipo: p.tipo, Mes: MESES[p.mes], Anio: p.anio, Monto: p.monto, Estado: p.estado, Fecha: p.fecha || "—" }; }), `pagos_${MESES[mes]}_${anio}`, "Pagos")}>↓ Excel</button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Inquilino</th><th>Tipo</th><th>Monto</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {pagosFiltrados.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: C.mu, padding: 28 }}>Sin pagos para este período</td></tr>}
                {pagosFiltrados.map(p => {
                  const c = contratos.find(x => x.id === p.contrato_id);
                  const inq = inquilinos.find(x => x.id === c?.inquilino_id);
                  return (
                    <tr key={p.id} className="table-row">
                      <td><p style={{ fontWeight: 500 }}>{inq?.tienda || "—"}</p><p style={{ fontSize: 11, color: C.mu }}>{c?.local}</p></td>
                      <td><Badge type={p.tipo} /></td>
                      <td style={{ fontWeight: 600 }}>Bs. {fmt(p.monto)}</td>
                      <td style={{ color: C.mu, fontSize: 12 }}>{p.fecha || "—"}</td>
                      <td><Badge type={p.estado} /></td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          {p.estado === "pendiente" && <button className="btn btn-success btn-sm" onClick={async () => { await supabase.from("pagos").update({ estado: "pagado", fecha: hoy() }).eq("id", p.id); reload(); showToast("Marcado como cobrado"); }}>✓</button>}
                          <button className="btn btn-danger btn-sm" onClick={() => { setConfirmDelete(p.id); setDeleteType("pago"); }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "gastos" && (
        <>
          <div className="card-sm" style={{ borderLeft: `3px solid ${C.re}`, marginBottom: 14 }}>
            <p style={{ fontSize: 10, color: C.mu, textTransform: "uppercase" }}>Total gastos</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: C.re }}>Bs. {fmt(gastosTotal)}</p>
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => exportExcel(gastosFiltrados.map(e => ({ Concepto: e.concepto, Descripcion: e.descripcion, Monto: e.monto, Mes: MESES[e.mes], Anio: e.anio })), `gastos_${MESES[mes]}_${anio}`, "Gastos")}>↓ Excel</button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Concepto</th><th>Descripción</th><th>Monto</th><th></th></tr></thead>
              <tbody>
                {gastosFiltrados.length === 0 && <tr><td colSpan={4} style={{ textAlign: "center", color: C.mu, padding: 28 }}>Sin gastos para este período</td></tr>}
                {gastosFiltrados.map(e => (
                  <tr key={e.id} className="table-row">
                    <td style={{ fontWeight: 500 }}>{e.concepto}</td>
                    <td style={{ color: C.mu, fontSize: 12 }}>{e.descripcion || "—"}</td>
                    <td style={{ fontWeight: 600, color: C.re }}>Bs. {fmt(e.monto)}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={() => { setConfirmDelete(e.id); setDeleteType("gasto"); }}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {confirmDelete && <ConfirmDialog message="¿Eliminar este registro?" onConfirm={eliminar} onCancel={() => { setConfirmDelete(null); setDeleteType(null); }} />}

      {modalPago && (
        <Modal title="Registrar Pago" onClose={() => setModalPago(false)}>
          <div className="form-group">
            <label className="form-label">Contrato *</label>
            <select className="form-input" value={fp.contrato_id} onChange={e => setFp(p => ({ ...p, contrato_id: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {contratos.map(c => { const inq = inquilinos.find(i => i.id === c.inquilino_id); return <option key={c.id} value={c.id}>{inq?.nombre} – {c.local}</option>; })}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Tipo</label><select className="form-input" value={fp.tipo} onChange={e => setFp(p => ({ ...p, tipo: e.target.value }))}>{["alquiler", "expensa", "multa"].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-input" value={fp.estado} onChange={e => setFp(p => ({ ...p, estado: e.target.value }))}>{["pendiente", "pagado"].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Mes</label><select className="form-input" value={fp.mes} onChange={e => setFp(p => ({ ...p, mes: Number(e.target.value) }))}>{MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Año</label><select className="form-input" value={fp.anio} onChange={e => setFp(p => ({ ...p, anio: Number(e.target.value) }))}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Monto (Bs.) *</label><input className="form-input" type="number" value={fp.monto} onChange={e => setFp(p => ({ ...p, monto: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Fecha</label><input className="form-input" type="date" value={fp.fecha} onChange={e => setFp(p => ({ ...p, fecha: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setModalPago(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={savePago} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}

      {modalGasto && (
        <Modal title="Nuevo Gasto" onClose={() => setModalGasto(false)}>
          <div className="form-group"><label className="form-label">Concepto *</label><input className="form-input" value={fg.concepto} onChange={e => setFg(p => ({ ...p, concepto: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Descripción</label><input className="form-input" value={fg.descripcion} onChange={e => setFg(p => ({ ...p, descripcion: e.target.value }))} /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Monto (Bs.) *</label><input className="form-input" type="number" value={fg.monto} onChange={e => setFg(p => ({ ...p, monto: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Mes</label><select className="form-input" value={fg.mes} onChange={e => setFg(p => ({ ...p, mes: Number(e.target.value) }))}>{MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Año</label><select className="form-input" value={fg.anio} onChange={e => setFg(p => ({ ...p, anio: Number(e.target.value) }))}>{YEARS.map(y => <option key={y} value={y}>{y}</option>)}</select></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setModalGasto(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={saveGasto} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// OPERACIONES — Equipos + Reparaciones
// ─────────────────────────────────────────
function Operaciones({ activos, activos_gastos, mantenimiento, reload, showToast }) {
  const [tab, setTab] = useState("reparaciones");
  const [modal, setModal] = useState(null);
  const [modalGasto, setModalGasto] = useState(null);
  const [activoSel, setActivoSel] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fa, setFa] = useState({ nombre: "", descripcion: "", categoria: "equipamiento", valor_reposicion: "", fecha_adquisicion: "", estado: "operativo" });
  const [fg, setFg] = useState({ concepto: "", monto: "", fecha: hoy(), tipo: "mantenimiento" });
  const [fm, setFm] = useState({ titulo: "", descripcion: "", area: "", prioridad: "media", estado: "pendiente", responsable: "", fecha_reporte: hoy(), fecha_resolucion: "" });

  const CATS = ["equipamiento", "infraestructura", "vehiculo", "tecnologia", "otro"];
  const TIPOS_GASTO = ["mantenimiento", "reparacion", "repuesto", "inspeccion", "otro"];

  const saveActivo = async () => {
    if (!fa.nombre) return showToast("Completá el nombre", "error");
    setSaving(true);
    if (modal === "nuevo-activo") await supabase.from("activos").insert([{ ...fa, valor_reposicion: Number(fa.valor_reposicion) || 0 }]);
    else await supabase.from("activos").update({ ...fa, valor_reposicion: Number(fa.valor_reposicion) || 0 }).eq("id", fa.id);
    setModal(null); reload(); showToast(modal === "nuevo-activo" ? "Equipo registrado" : "Equipo actualizado"); setSaving(false);
  };

  const saveGasto = async () => {
    if (!fg.concepto || !fg.monto) return showToast("Completá concepto y monto", "error");
    setSaving(true);
    await supabase.from("activos_gastos").insert([{ ...fg, activo_id: activoSel.id, monto: Number(fg.monto) }]);
    setModalGasto(null); reload(); showToast("Gasto registrado"); setSaving(false);
  };

  const saveReparacion = async () => {
    if (!fm.titulo) return showToast("Completá el título", "error");
    setSaving(true);
    if (modal === "nuevo-rep") await supabase.from("mantenimiento").insert([fm]);
    else await supabase.from("mantenimiento").update(fm).eq("id", fm.id);
    setModal(null); reload(); showToast(modal === "nuevo-rep" ? "Pedido creado" : "Pedido actualizado"); setSaving(false);
  };

  const eliminar = async () => {
    if (deleteType === "activo") await supabase.from("activos").delete().eq("id", confirmDelete);
    else if (deleteType === "gasto") await supabase.from("activos_gastos").delete().eq("id", confirmDelete);
    else await supabase.from("mantenimiento").delete().eq("id", confirmDelete);
    setConfirmDelete(null); setDeleteType(null); reload(); showToast("Eliminado");
  };

  const pend = mantenimiento.filter(m => m.estado === "pendiente").length;
  const prog = mantenimiento.filter(m => m.estado === "en progreso").length;
  const res = mantenimiento.filter(m => m.estado === "resuelto").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="section-title">Operaciones</p>
          <p className="section-sub">Equipos del edificio y pedidos de reparación</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {tab === "equipos" && <button className="btn btn-primary btn-sm" onClick={() => { setFa({ nombre: "", descripcion: "", categoria: "equipamiento", valor_reposicion: "", fecha_adquisicion: "", estado: "operativo" }); setModal("nuevo-activo"); }}>+ Equipo</button>}
          {tab === "reparaciones" && <button className="btn btn-primary btn-sm" onClick={() => { setFm({ titulo: "", descripcion: "", area: "", prioridad: "media", estado: "pendiente", responsable: "", fecha_reporte: hoy(), fecha_resolucion: "" }); setModal("nuevo-rep"); }}>+ Pedido</button>}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.card, borderRadius: 10, padding: 4, border: `1px solid ${C.cb}` }}>
        {[["reparaciones", "Reparaciones"], ["equipos", "Equipos"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "8px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: tab === id ? C.cb : "transparent", color: tab === id ? C.wh : C.mu, transition: "all 0.15s" }}>{label}</button>
        ))}
      </div>

      {tab === "reparaciones" && (
        <>
          <div className="grid-3" style={{ marginBottom: 14 }}>
            <KPI label="Pendientes" value={pend} color={pend > 0 ? C.re : C.mu} />
            <KPI label="En progreso" value={prog} color={prog > 0 ? C.bl : C.mu} />
            <KPI label="Resueltos" value={res} color={C.gr} />
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Título</th><th>Área</th><th>Prioridad</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {mantenimiento.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", color: C.mu, padding: 28 }}>Sin pedidos registrados</td></tr>}
                {mantenimiento.map(m => (
                  <tr key={m.id} className="table-row">
                    <td><p style={{ fontWeight: 500 }}>{m.titulo}</p><p style={{ fontSize: 11, color: C.mu }}>{m.descripcion}</p></td>
                    <td style={{ color: C.mu }}>{m.area || "—"}</td>
                    <td><Badge type={m.prioridad} /></td>
                    <td><Badge type={m.estado} /></td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        {m.estado !== "resuelto" && <button className="btn btn-success btn-sm" onClick={async () => { await supabase.from("mantenimiento").update({ estado: "resuelto", fecha_resolucion: hoy() }).eq("id", m.id); reload(); showToast("Marcado como resuelto"); }}>✓</button>}
                        <button className="btn btn-ghost btn-sm" onClick={() => { setFm(m); setModal("editar-rep"); }}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setConfirmDelete(m.id); setDeleteType("rep"); }}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "equipos" && (
        <>
          <div className="grid-kpi" style={{ marginBottom: 14 }}>
            <KPI label="Total equipos" value={activos.length} />
            <KPI label="Gasto acumulado" value={`Bs. ${fmt(activos_gastos.reduce((a, g) => a + Number(g.monto), 0))}`} color={C.re} />
            <KPI label="Operativos" value={activos.filter(a => a.estado === "operativo").length} color={C.gr} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activos.length === 0 && <div className="card" style={{ textAlign: "center", color: C.mu, padding: 40 }}><p style={{ fontWeight: 600, color: C.wh, marginBottom: 6 }}>Sin equipos registrados</p><p style={{ fontSize: 12 }}>Agregá la escalera eléctrica, bomba de agua, etc.</p></div>}
            {activos.map(a => {
              const gs = activos_gastos.filter(g => g.activo_id === a.id);
              const totalG = gs.reduce((x, g) => x + Number(g.monto), 0);
              const pct = a.valor_reposicion > 0 ? Math.round((totalG / Number(a.valor_reposicion)) * 100) : 0;
              const alerta = pct >= 80;
              const barColor = pct >= 100 ? C.re : pct >= 80 ? C.am : C.gr;
              return (
                <div key={a.id} className="card" style={{ borderLeft: `3px solid ${alerta ? C.re : C.gr}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: C.wh }}>{a.nombre}</p>
                        <Badge type={a.estado} />
                        <span style={{ fontSize: 11, color: C.mu, background: C.bg, padding: "2px 7px", borderRadius: 5 }}>{a.categoria}</span>
                      </div>
                      {a.descripcion && <p style={{ fontSize: 12, color: C.mu }}>{a.descripcion}</p>}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setActivoSel(a); setFg({ concepto: "", monto: "", fecha: hoy(), tipo: "mantenimiento" }); setModalGasto(true); }}>+ Gasto</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setActivoSel(a); setModal("historial"); }}>Historial</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setFa(a); setModal("editar-activo"); }}>Editar</button>
                      <button className="btn btn-danger btn-sm" onClick={() => { setConfirmDelete(a.id); setDeleteType("activo"); }}>✕</button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: C.mu }}>Gasto acumulado vs. reposición</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: barColor }}>{pct}%</span>
                    </div>
                    <div className="progress-bar"><div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: barColor }} /></div>
                  </div>
                  <div className="grid-3">
                    <div><p style={{ fontSize: 10, color: C.mu, marginBottom: 2 }}>GASTO ACUM.</p><p style={{ fontSize: 14, fontWeight: 600, color: C.re }}>Bs. {fmt(totalG)}</p></div>
                    <div><p style={{ fontSize: 10, color: C.mu, marginBottom: 2 }}>REPOSICIÓN</p><p style={{ fontSize: 14, fontWeight: 600, color: C.wh }}>Bs. {fmt(a.valor_reposicion)}</p></div>
                    <div><p style={{ fontSize: 10, color: C.mu, marginBottom: 2 }}>DIFERENCIA</p><p style={{ fontSize: 14, fontWeight: 600, color: Number(a.valor_reposicion) - totalG > 0 ? C.gr : C.re }}>Bs. {fmt(Number(a.valor_reposicion) - totalG)}</p></div>
                  </div>
                  {alerta && <div style={{ marginTop: 10, padding: "8px 12px", background: "rgba(229,72,77,0.06)", border: "1px solid rgba(229,72,77,0.15)", borderRadius: 8 }}><p style={{ fontSize: 12, color: C.re }}>⚠ El gasto supera el {pct}% del valor de reposición.</p></div>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {confirmDelete && <ConfirmDialog message="¿Eliminar este registro permanentemente?" onConfirm={eliminar} onCancel={() => { setConfirmDelete(null); setDeleteType(null); }} />}

      {/* Modal equipo */}
      {(modal === "nuevo-activo" || modal === "editar-activo") && (
        <Modal title={modal === "nuevo-activo" ? "Nuevo Equipo" : "Editar Equipo"} onClose={() => setModal(null)}>
          <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" placeholder="Ej: Escalera eléctrica" value={fa.nombre} onChange={e => setFa(p => ({ ...p, nombre: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Descripción</label><input className="form-input" value={fa.descripcion || ""} onChange={e => setFa(p => ({ ...p, descripcion: e.target.value }))} /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Categoría</label><select className="form-input" value={fa.categoria} onChange={e => setFa(p => ({ ...p, categoria: e.target.value }))}>{CATS.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-input" value={fa.estado} onChange={e => setFa(p => ({ ...p, estado: e.target.value }))}>{["operativo", "en mantenimiento", "fuera de servicio", "reemplazado"].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Valor reposición (Bs.)</label><input className="form-input" type="number" value={fa.valor_reposicion || ""} onChange={e => setFa(p => ({ ...p, valor_reposicion: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Fecha adquisición</label><input className="form-input" type="date" value={fa.fecha_adquisicion || ""} onChange={e => setFa(p => ({ ...p, fecha_adquisicion: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={saveActivo} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}

      {/* Modal historial gastos */}
      {modal === "historial" && activoSel && (
        <Modal title={`Historial — ${activoSel.nombre}`} onClose={() => setModal(null)} wide>
          <div style={{ maxHeight: 320, overflowY: "auto" }}>
            {activos_gastos.filter(g => g.activo_id === activoSel.id).length === 0 && <p style={{ color: C.mu, fontSize: 12 }}>Sin gastos registrados.</p>}
            {activos_gastos.filter(g => g.activo_id === activoSel.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map(g => (
              <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.cb}` }}>
                <div><p style={{ fontSize: 13, fontWeight: 500 }}>{g.concepto}</p><p style={{ fontSize: 11, color: C.mu }}>{g.fecha} · {g.tipo}</p></div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: C.re }}>Bs. {fmt(g.monto)}</p>
                  <button className="btn btn-danger btn-sm" onClick={() => { setConfirmDelete(g.id); setDeleteType("gasto"); setModal(null); }}>✕</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 10, background: C.bg, borderRadius: 8, display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: 12, color: C.mu }}>Total acumulado</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.re }}>Bs. {fmt(activos_gastos.filter(g => g.activo_id === activoSel.id).reduce((a, g) => a + Number(g.monto), 0))}</span>
          </div>
        </Modal>
      )}

      {/* Modal gasto equipo */}
      {modalGasto && activoSel && (
        <Modal title={`Registrar gasto — ${activoSel.nombre}`} onClose={() => setModalGasto(null)}>
          <div className="form-group"><label className="form-label">Concepto *</label><input className="form-input" placeholder="Ej: Mantenimiento mensual" value={fg.concepto} onChange={e => setFg(p => ({ ...p, concepto: e.target.value }))} /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Monto (Bs.) *</label><input className="form-input" type="number" value={fg.monto} onChange={e => setFg(p => ({ ...p, monto: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Fecha</label><input className="form-input" type="date" value={fg.fecha} onChange={e => setFg(p => ({ ...p, fecha: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Tipo</label><select className="form-input" value={fg.tipo} onChange={e => setFg(p => ({ ...p, tipo: e.target.value }))}>{TIPOS_GASTO.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setModalGasto(null)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={saveGasto} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}

      {/* Modal reparación */}
      {(modal === "nuevo-rep" || modal === "editar-rep") && (
        <Modal title={modal === "nuevo-rep" ? "Nuevo Pedido" : "Editar Pedido"} onClose={() => setModal(null)}>
          <div className="form-group"><label className="form-label">Título *</label><input className="form-input" value={fm.titulo} onChange={e => setFm(p => ({ ...p, titulo: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Descripción</label><input className="form-input" value={fm.descripcion || ""} onChange={e => setFm(p => ({ ...p, descripcion: e.target.value }))} /></div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Área</label><input className="form-input" placeholder="Ej: Baños, Ascensor..." value={fm.area || ""} onChange={e => setFm(p => ({ ...p, area: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Responsable</label><input className="form-input" value={fm.responsable || ""} onChange={e => setFm(p => ({ ...p, responsable: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Prioridad</label><select className="form-input" value={fm.prioridad} onChange={e => setFm(p => ({ ...p, prioridad: e.target.value }))}>{["alta", "media", "baja"].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-input" value={fm.estado} onChange={e => setFm(p => ({ ...p, estado: e.target.value }))}>{["pendiente", "en progreso", "resuelto"].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Fecha reporte</label><input className="form-input" type="date" value={fm.fecha_reporte || ""} onChange={e => setFm(p => ({ ...p, fecha_reporte: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Fecha resolución</label><input className="form-input" type="date" value={fm.fecha_resolucion || ""} onChange={e => setFm(p => ({ ...p, fecha_resolucion: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={saveReparacion} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// CONFIGURACIÓN — CRUD de inquilinos y contratos
// ─────────────────────────────────────────
function Configuracion({ inquilinos, contratos, pagos, reload, showToast }) {
  const [tab, setTab] = useState("inquilinos");
  const [modal, setModal] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fi, setFi] = useState({ nombre: "", tienda: "", email: "", telefono: "", m2: 30 });
  const [fc, setFc] = useState({ inquilino_id: "", local: "", monto: "", inicio: "", vencimiento: "", deposito: "", estado: "activo" });

  const saveInquilino = async () => {
    if (!fi.nombre || !fi.tienda) return showToast("Completá nombre y tienda", "error");
    setSaving(true);
    if (modal === "nuevo-inq") await supabase.from("inquilinos").insert([{ ...fi, m2: Number(fi.m2), activo: true }]);
    else await supabase.from("inquilinos").update({ ...fi, m2: Number(fi.m2) }).eq("id", fi.id);
    setModal(null); reload(); showToast(modal === "nuevo-inq" ? "Inquilino registrado" : "Inquilino actualizado"); setSaving(false);
  };

  const saveContrato = async () => {
    if (!fc.inquilino_id || !fc.local || !fc.monto) return showToast("Completá los campos requeridos", "error");
    setSaving(true);
    if (modal === "nuevo-con") await supabase.from("contratos").insert([{ ...fc, monto: Number(fc.monto), deposito: Number(fc.deposito) }]);
    else await supabase.from("contratos").update({ ...fc, monto: Number(fc.monto), deposito: Number(fc.deposito) }).eq("id", fc.id);
    setModal(null); reload(); showToast(modal === "nuevo-con" ? "Contrato registrado" : "Contrato actualizado"); setSaving(false);
  };

  const eliminar = async () => {
    if (deleteType === "inquilino") await supabase.from("inquilinos").delete().eq("id", confirmDelete);
    else await supabase.from("contratos").delete().eq("id", confirmDelete);
    setConfirmDelete(null); setDeleteType(null); reload(); showToast("Eliminado");
  };

  const importarInquilinos = (e) => {
    importExcel(e.target.files[0], async (rows) => {
      for (const r of rows) await supabase.from("inquilinos").insert([{ nombre: r.Nombre, tienda: r.Tienda, email: r.Email || "", telefono: String(r.Telefono || ""), m2: Number(r.m2) || 0, activo: true }]);
      reload(); showToast(`${rows.length} inquilinos importados`);
    });
  };

  const importarContratos = (e) => {
    importExcel(e.target.files[0], async (rows) => {
      for (const r of rows) {
        const inq = inquilinos.find(i => i.nombre === r.Inquilino || i.tienda === r.Tienda);
        if (!inq) { showToast(`No encontrado: ${r.Inquilino}`, "error"); continue; }
        await supabase.from("contratos").insert([{ inquilino_id: inq.id, local: r.Local, monto: Number(r.Monto), deposito: Number(r.Deposito || 0), inicio: r.Inicio, vencimiento: r.Vencimiento, estado: r.Estado || "activo" }]);
      }
      reload(); showToast("Contratos importados");
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p className="section-title">Configuración</p>
          <p className="section-sub">Gestión de inquilinos y contratos</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {tab === "inquilinos" && (
            <>
              <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>↑ Importar<input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={importarInquilinos} /></label>
              <button className="btn btn-ghost btn-sm" onClick={() => exportExcel(inquilinos.map(i => ({ Nombre: i.nombre, Tienda: i.tienda, Email: i.email, Telefono: i.telefono, m2: i.m2 })), "inquilinos", "Inquilinos")}>↓ Excel</button>
              <button className="btn btn-primary btn-sm" onClick={() => { setFi({ nombre: "", tienda: "", email: "", telefono: "", m2: 30 }); setModal("nuevo-inq"); }}>+ Inquilino</button>
            </>
          )}
          {tab === "contratos" && (
            <>
              <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>↑ Importar<input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={importarContratos} /></label>
              <button className="btn btn-ghost btn-sm" onClick={() => exportExcel(contratos.map(c => { const inq = inquilinos.find(i => i.id === c.inquilino_id); return { Inquilino: inq?.nombre, Tienda: inq?.tienda, Local: c.local, Monto: c.monto, Deposito: c.deposito, Inicio: c.inicio, Vencimiento: c.vencimiento, Estado: c.estado }; }), "contratos", "Contratos")}>↓ Excel</button>
              <button className="btn btn-primary btn-sm" onClick={() => { setFc({ inquilino_id: "", local: "", monto: "", inicio: "", vencimiento: "", deposito: "", estado: "activo" }); setModal("nuevo-con"); }}>+ Contrato</button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: C.card, borderRadius: 10, padding: 4, border: `1px solid ${C.cb}` }}>
        {[["inquilinos", `Inquilinos (${inquilinos.length})`], ["contratos", `Contratos (${contratos.length})`]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ flex: 1, padding: "8px", borderRadius: 7, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 500, background: tab === id ? C.cb : "transparent", color: tab === id ? C.wh : C.mu, transition: "all 0.15s" }}>{label}</button>
        ))}
      </div>

      {tab === "inquilinos" && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>Tienda</th><th>Contacto</th><th>m²</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {inquilinos.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: C.mu, padding: 28 }}>Sin inquilinos registrados</td></tr>}
              {inquilinos.map(i => (
                <tr key={i.id} className="table-row">
                  <td style={{ fontWeight: 500 }}>{i.nombre}</td>
                  <td style={{ color: C.mu }}>{i.tienda}</td>
                  <td style={{ fontSize: 12, color: C.mu }}>{i.email}<br />{i.telefono}</td>
                  <td>{i.m2} m²</td>
                  <td><Badge type={i.activo ? "activo" : "inactivo"} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => { const cs = contratos.filter(c => c.inquilino_id === i.id); const ps = pagos.filter(p => cs.find(c => c.id === p.contrato_id)); setHistorial({ inq: i, contratos: cs, pagos: ps }); }}>Historial</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => { setFi(i); setModal("editar-inq"); }}>Editar</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: i.activo ? C.re : C.gr }} onClick={async () => { await supabase.from("inquilinos").update({ activo: !i.activo }).eq("id", i.id); reload(); showToast(i.activo ? "Desactivado" : "Activado"); }}>{i.activo ? "Desactivar" : "Activar"}</button>
                      <button className="btn btn-danger btn-sm" onClick={() => { setConfirmDelete(i.id); setDeleteType("inquilino"); }}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "contratos" && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Inquilino</th><th>Local</th><th>Alquiler</th><th>Vigencia</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {contratos.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", color: C.mu, padding: 28 }}>Sin contratos registrados</td></tr>}
              {contratos.map(c => {
                const inq = inquilinos.find(i => i.id === c.inquilino_id);
                const dias = Math.round((new Date(c.vencimiento) - new Date()) / 86400000);
                return (
                  <tr key={c.id} className="table-row">
                    <td><p style={{ fontWeight: 500 }}>{inq?.nombre || "—"}</p><p style={{ fontSize: 11, color: C.mu }}>{inq?.tienda}</p></td>
                    <td>{c.local}</td>
                    <td style={{ fontWeight: 600, color: C.gr }}>Bs. {fmt(c.monto)}</td>
                    <td><p style={{ fontSize: 12 }}>{c.inicio} → {c.vencimiento}</p>{dias > 0 && dias < 90 && <p style={{ fontSize: 11, color: C.am }}>⚠ {dias} días</p>}{dias <= 0 && <p style={{ fontSize: 11, color: C.re }}>Vencido</p>}</td>
                    <td><Badge type={c.estado} /></td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setFc(c); setModal("editar-con"); }}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={() => { setConfirmDelete(c.id); setDeleteType("contrato"); }}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && <ConfirmDialog message="¿Eliminar este registro permanentemente?" onConfirm={eliminar} onCancel={() => { setConfirmDelete(null); setDeleteType(null); }} />}

      {/* Historial inquilino */}
      {historial && (
        <Modal title={`Historial — ${historial.inq.tienda}`} onClose={() => setHistorial(null)} wide>
          <p style={{ color: C.mu, fontSize: 12, marginBottom: 14 }}>{historial.inq.nombre} · {historial.inq.email} · {historial.inq.telefono}</p>
          <p style={{ fontSize: 13, fontWeight: 600, color: C.wh, marginBottom: 10 }}>Contratos ({historial.contratos.length})</p>
          {historial.contratos.map(c => (
            <div key={c.id} style={{ background: C.bg, borderRadius: 8, padding: "10px 14px", marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><p style={{ fontSize: 13, fontWeight: 500 }}>{c.local}</p><Badge type={c.estado} /></div>
              <p style={{ fontSize: 12, color: C.mu, marginTop: 3 }}>Bs. {fmt(c.monto)}/mes · {c.inicio} → {c.vencimiento}</p>
            </div>
          ))}
          <p style={{ fontSize: 13, fontWeight: 600, color: C.wh, margin: "14px 0 10px" }}>Pagos ({historial.pagos.length})</p>
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {historial.pagos.map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: `1px solid ${C.cb}` }}>
                <p style={{ fontSize: 12 }}>{MESES[p.mes]} {p.anio} · {p.tipo}</p>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <p style={{ fontSize: 12, fontWeight: 600 }}>Bs. {fmt(p.monto)}</p>
                  <Badge type={p.estado} />
                </div>
              </div>
            ))}
            {historial.pagos.length === 0 && <p style={{ color: C.mu, fontSize: 12 }}>Sin pagos registrados</p>}
          </div>
        </Modal>
      )}

      {/* Modal inquilino */}
      {(modal === "nuevo-inq" || modal === "editar-inq") && (
        <Modal title={modal === "nuevo-inq" ? "Nuevo Inquilino" : "Editar Inquilino"} onClose={() => setModal(null)}>
          {[["nombre", "Nombre *"], ["tienda", "Tienda *"], ["email", "Email"], ["telefono", "Teléfono"]].map(([k, l]) => (
            <div className="form-group" key={k}><label className="form-label">{l}</label><input className="form-input" value={fi[k] || ""} onChange={e => setFi(p => ({ ...p, [k]: e.target.value }))} /></div>
          ))}
          <div className="form-group"><label className="form-label">Superficie (m²)</label><input className="form-input" type="number" value={fi.m2 || ""} onChange={e => setFi(p => ({ ...p, m2: e.target.value }))} /></div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={saveInquilino} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}

      {/* Modal contrato */}
      {(modal === "nuevo-con" || modal === "editar-con") && (
        <Modal title={modal === "nuevo-con" ? "Nuevo Contrato" : "Editar Contrato"} onClose={() => setModal(null)}>
          <div className="form-group"><label className="form-label">Inquilino *</label>
            <select className="form-input" value={fc.inquilino_id} onChange={e => setFc(p => ({ ...p, inquilino_id: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {inquilinos.map(i => <option key={i.id} value={i.id}>{i.nombre} – {i.tienda}</option>)}
            </select>
          </div>
          <div className="grid-2">
            <div className="form-group"><label className="form-label">Local *</label><input className="form-input" value={fc.local || ""} onChange={e => setFc(p => ({ ...p, local: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Alquiler (Bs.) *</label><input className="form-input" type="number" value={fc.monto || ""} onChange={e => setFc(p => ({ ...p, monto: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Depósito (Bs.)</label><input className="form-input" type="number" value={fc.deposito || ""} onChange={e => setFc(p => ({ ...p, deposito: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-input" value={fc.estado} onChange={e => setFc(p => ({ ...p, estado: e.target.value }))}>{["activo", "vencido", "rescindido"].map(v => <option key={v} value={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Inicio</label><input className="form-input" type="date" value={fc.inicio || ""} onChange={e => setFc(p => ({ ...p, inicio: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Vencimiento</label><input className="form-input" type="date" value={fc.vencimiento || ""} onChange={e => setFc(p => ({ ...p, vencimiento: e.target.value }))} /></div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={saveContrato} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// APP PRINCIPAL
// ─────────────────────────────────────────
const NAV = [
  { id: "dashboard",      label: "Panel",        icon: "◈" },
  { id: "locales",        label: "Locales",       icon: "🏬" },
  { id: "finanzas",       label: "Finanzas",      icon: "💰" },
  { id: "operaciones",    label: "Operaciones",   icon: "⚙️" },
  { id: "configuracion",  label: "Configuración", icon: "⚙" },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [data, setData] = useState({
    inquilinos: [], contratos: [], pagos: [],
    expensas: [], mantenimiento: [], activos: [], activos_gastos: []
  });

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    supabase.auth.onAuthStateChange((_, s) => setSession(s));
  }, []);

  const load = async () => {
    const [i, c, p, e, m, a, ag] = await Promise.all([
      supabase.from("inquilinos").select("*").order("created_at"),
      supabase.from("contratos").select("*").order("created_at"),
      supabase.from("pagos").select("*").order("created_at").limit(10000),
      supabase.from("expensas").select("*").order("created_at").limit(10000),
      supabase.from("mantenimiento").select("*").order("created_at"),
      supabase.from("activos").select("*").order("created_at"),
      supabase.from("activos_gastos").select("*").order("fecha"),
    ]);
    setData({
      inquilinos: i.data || [], contratos: c.data || [], pagos: p.data || [],
      expensas: e.data || [], mantenimiento: m.data || [],
      activos: a.data || [], activos_gastos: ag.data || []
    });
  };

  useEffect(() => { if (session) load(); }, [session]);

  const changeTab = (id) => { setTab(id); setSidebarOpen(false); };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.bg, color: C.mu, fontSize: 13 }}>
      Cargando...
    </div>
  );

  return (
    <>
      <style>{css}</style>
      <Toast toast={toast} onClose={() => setToast(null)} />
      {!session ? <Login onLogin={load} /> : (
        <div className="app-shell">

          {/* Header — solo móvil */}
          <div className="mobile-header">
            <span style={{ fontSize: 14, fontWeight: 700, color: C.wh }}>🏢 Edificio Manager</span>
            <button className="btn btn-ghost btn-sm" onClick={() => supabase.auth.signOut()} style={{ fontSize: 11, padding: "4px 10px" }}>Salir</button>
          </div>

          {/* Cuerpo: sidebar + contenido */}
          <div className="app-body">

            {/* Sidebar — solo desktop */}
            <div className="sidebar">
              <div style={{ padding: "8px 6px 20px", borderBottom: `1px solid ${C.cb}`, marginBottom: 12 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: C.wh, letterSpacing: "-0.3px" }}>Edificio Manager</p>
                <p style={{ fontSize: 11, color: C.mu, marginTop: 2 }}>Centro Comercial Limax</p>
              </div>
              {NAV.map(n => (
                <div key={n.id} className={`nav-item ${tab === n.id ? "active" : ""}`} onClick={() => changeTab(n.id)}>
                  <span style={{ fontSize: 14 }}>{n.icon}</span>
                  <span>{n.label}</span>
                </div>
              ))}
              <div style={{ marginTop: "auto", padding: "12px 6px", borderTop: `1px solid ${C.cb}` }}>
                <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={() => supabase.auth.signOut()}>
                  Cerrar sesión
                </button>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="main-content">
              {tab === "dashboard"     && <Dashboard {...data} />}
              {tab === "locales"       && <Locales inquilinos={data.inquilinos} contratos={data.contratos} pagos={data.pagos} reload={load} showToast={showToast} />}
              {tab === "finanzas"      && <Finanzas pagos={data.pagos} contratos={data.contratos} inquilinos={data.inquilinos} expensas={data.expensas} reload={load} showToast={showToast} />}
              {tab === "operaciones"   && <Operaciones activos={data.activos} activos_gastos={data.activos_gastos} mantenimiento={data.mantenimiento} reload={load} showToast={showToast} />}
              {tab === "configuracion" && <Configuracion inquilinos={data.inquilinos} contratos={data.contratos} pagos={data.pagos} reload={load} showToast={showToast} />}
            </div>
          </div>

          {/* Bottom nav — solo móvil */}
          <div className="bottom-nav">
            {NAV.map(n => (
              <button key={n.id} className={`bottom-nav-item ${tab === n.id ? "active" : ""}`} onClick={() => changeTab(n.id)}>
                <span className="nav-icon">{n.icon}</span>
                <span className="nav-label">{n.label}</span>
              </button>
            ))}
          </div>

        </div>
      )}
    </>
  );
}
