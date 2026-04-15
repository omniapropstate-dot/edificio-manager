import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase.js";
import * as XLSX from "xlsx";
import { generarReporte } from "./reporte.js";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from "recharts";

// ─── TEMA ─────────────────────────────────────────────────────────────
const C = {
  bg:"#080b12", sb:"#0c1018", card:"#111520", cb:"#1a2235", cb2:"#232f45",
  ac:"#e8b84b", ac2:"#c49a35", gr:"#2dd4a0", re:"#f04f5a", am:"#f59e0b",
  bl:"#4f8ef7", pu:"#9b7fe8", tx:"#dde3f0", mu:"#4d5d7a", wh:"#f0f4ff",
};
const MESES = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const MESES_L = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const YEARS = [2021,2022,2023,2024,2025,2026,2027];
const PIE_COLORS = [C.ac,C.bl,C.gr,C.pu,C.re,C.am,"#06b6d4","#ec4899"];

// ─── CSS ──────────────────────────────────────────────────────────────
const css = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'DM Sans',sans-serif;background:${C.bg};color:${C.tx};-webkit-font-smoothing:antialiased}
input,select,textarea{font-family:'DM Sans',sans-serif}
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.cb2};border-radius:4px}
.app-shell{display:flex;flex-direction:column;height:100vh;overflow:hidden}
.sidebar{width:210px;background:${C.sb};border-right:1px solid ${C.cb};display:flex;flex-direction:column;padding:18px 10px;flex-shrink:0;height:100vh;overflow-y:auto}
.app-body{display:flex;flex:1;overflow:hidden}
.main-content{flex:1;overflow-y:auto;padding:22px 20px}
.mobile-header{display:none}.bottom-nav{display:none}
@media(max-width:768px){
  .app-shell{flex-direction:column}.app-body{flex-direction:column}
  .mobile-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:${C.sb};border-bottom:1px solid ${C.cb};flex-shrink:0}
  .sidebar{display:none!important}.main-content{padding:12px 12px 88px 12px;height:100%}
  .bottom-nav{display:flex;position:fixed;bottom:0;left:0;right:0;z-index:200;background:${C.sb};border-top:1px solid ${C.cb};padding:6px 0 10px}
  .bottom-nav-item{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:4px 2px;cursor:pointer;transition:all 0.15s;border:none;background:none}
  .bottom-nav-item .nav-icon{font-size:20px;line-height:1}.bottom-nav-item .nav-label{font-size:10px;font-weight:500;color:${C.mu}}
  .bottom-nav-item.active .nav-label{color:${C.ac}}
  .g2{grid-template-columns:1fr!important}.g3{grid-template-columns:1fr 1fr!important}.g4{grid-template-columns:1fr 1fr!important}
}
.nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;color:${C.mu};transition:all 0.15s;margin-bottom:2px}
.nav-item:hover{background:rgba(232,184,75,0.06);color:${C.tx}}.nav-item.active{background:rgba(232,184,75,0.1);color:${C.ac}}
.btn{padding:8px 16px;border-radius:8px;border:none;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;transition:all 0.15s;display:inline-flex;align-items:center;gap:6px}
.btn:hover{opacity:0.85}.btn:disabled{opacity:0.4;cursor:not-allowed}
.btn-sm{padding:5px 11px;font-size:12px}
.btn-primary{background:${C.ac};color:${C.bg};font-weight:600}.btn-secondary{background:${C.cb};color:${C.tx}}
.btn-ghost{background:transparent;color:${C.mu};border:1px solid ${C.cb}}.btn-ghost:hover{border-color:${C.cb2};color:${C.tx}}
.btn-success{background:rgba(45,212,160,0.1);color:${C.gr};border:1px solid rgba(45,212,160,0.2)}
.btn-danger{background:rgba(240,79,90,0.08);color:${C.re};border:1px solid rgba(240,79,90,0.15)}
.form-group{display:flex;flex-direction:column;gap:5px;margin-bottom:14px}
.form-label{font-size:10px;color:${C.mu};font-weight:600;text-transform:uppercase;letter-spacing:0.6px}
.form-input{background:${C.bg};border:1px solid ${C.cb};border-radius:8px;padding:9px 12px;color:${C.tx};font-size:13px;outline:none;transition:border-color 0.15s;width:100%}
.form-input:focus{border-color:${C.ac2}}
.card{background:${C.card};border:1px solid ${C.cb};border-radius:14px;padding:18px 20px}
.card-sm{background:${C.card};border:1px solid ${C.cb};border-radius:10px;padding:14px 16px}
.table-wrapper{overflow-x:auto;background:${C.card};border-radius:12px;border:1px solid ${C.cb}}
.data-table{width:100%;border-collapse:collapse}
.data-table th{font-size:10px;text-transform:uppercase;letter-spacing:0.7px;color:${C.mu};padding:11px 14px;text-align:left;font-weight:600;border-bottom:1px solid ${C.cb};white-space:nowrap}
.data-table td{padding:11px 14px;font-size:13px;border-bottom:1px solid rgba(26,34,53,0.7)}
.data-table tr:last-child td{border-bottom:none}.table-row:hover{background:rgba(232,184,75,0.02)}
.badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:600;letter-spacing:0.3px;white-space:nowrap}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:20px}
.modal-box{background:${C.card};border:1px solid ${C.cb};border-radius:16px;padding:26px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto}
.toast{position:fixed;top:20px;right:20px;background:${C.card};border-radius:10px;padding:12px 18px;display:flex;align-items:center;gap:10px;z-index:2000;box-shadow:0 4px 24px rgba(0,0,0,0.6);border:1px solid ${C.cb};font-size:13px;max-width:320px;animation:slideIn 0.25s ease}
@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
.login-bg{min-height:100vh;display:flex;align-items:center;justify-content:center;background:${C.bg};padding:20px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.gkpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.section-title{font-family:'Syne',sans-serif;font-size:22px;font-weight:700;color:${C.wh};letter-spacing:-0.3px}
.section-sub{color:${C.mu};font-size:13px;margin-top:3px}
.chart-title{font-size:13px;font-weight:600;color:${C.wh};margin-bottom:4px}
.chart-sub{font-size:11px;color:${C.mu};margin-bottom:16px}
.progress-bar{background:${C.bg};border-radius:4px;height:6px;overflow:hidden}
.progress-fill{height:100%;border-radius:4px;transition:width 0.5s ease}
.heatmap-cell{border-radius:4px;cursor:default;transition:opacity 0.15s}
.heatmap-cell:hover{opacity:0.8}
.local-card{background:${C.card};border:1px solid ${C.cb};border-radius:10px;padding:14px;cursor:pointer;transition:all 0.15s}
.local-card:hover{border-color:${C.cb2};background:rgba(232,184,75,0.02)}
.local-card.pagado{border-left:3px solid ${C.gr}}.local-card.pendiente{border-left:3px solid ${C.re}}.local-card.sin-contrato{border-left:3px solid ${C.mu}}
.tab-bar{display:flex;gap:4px;background:${C.card};border-radius:10px;padding:4px;border:1px solid ${C.cb};margin-bottom:16px}
.tab-btn{flex:1;padding:7px;border-radius:7px;border:none;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.15s}
.insight-box{background:linear-gradient(135deg,rgba(232,184,75,0.06),rgba(79,142,247,0.04));border:1px solid rgba(232,184,75,0.15);border-radius:12px;padding:14px 16px}
`;

// ─── UTILIDADES ────────────────────────────────────────────────────────
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
    onDone(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
  };
  reader.readAsBinaryString(file);
};
const hoy = () => new Date().toISOString().split("T")[0];
const fmt = (n) => Number(n || 0).toLocaleString("es-BO");
const fmtPct = (n) => `${n > 0 ? "+" : ""}${Number(n || 0).toFixed(1)}%`;

// ─── COMPONENTES BASE ──────────────────────────────────────────────────
const BADGE_STYLES = {
  activo:{bg:"rgba(45,212,160,0.12)",c:"#2dd4a0"}, pagado:{bg:"rgba(45,212,160,0.12)",c:"#2dd4a0"},
  resuelto:{bg:"rgba(45,212,160,0.12)",c:"#2dd4a0"}, operativo:{bg:"rgba(45,212,160,0.12)",c:"#2dd4a0"},
  pendiente:{bg:"rgba(245,158,11,0.12)",c:"#f59e0b"}, "en progreso":{bg:"rgba(79,142,247,0.12)",c:"#4f8ef7"},
  "en mantenimiento":{bg:"rgba(79,142,247,0.12)",c:"#4f8ef7"}, vencido:{bg:"rgba(240,79,90,0.12)",c:"#f04f5a"},
  rescindido:{bg:"rgba(240,79,90,0.12)",c:"#f04f5a"}, "fuera de servicio":{bg:"rgba(240,79,90,0.12)",c:"#f04f5a"},
  inactivo:{bg:"rgba(77,93,122,0.15)",c:"#4d5d7a"}, alquiler:{bg:"rgba(155,127,232,0.12)",c:"#9b7fe8"},
  expensa:{bg:"rgba(245,158,11,0.12)",c:"#f59e0b"}, multa:{bg:"rgba(240,79,90,0.12)",c:"#f04f5a"},
  alta:{bg:"rgba(240,79,90,0.12)",c:"#f04f5a"}, media:{bg:"rgba(245,158,11,0.12)",c:"#f59e0b"},
  baja:{bg:"rgba(45,212,160,0.12)",c:"#2dd4a0"},
};
const Badge = ({ type }) => {
  const s = BADGE_STYLES[type] || { bg:"rgba(77,93,122,0.15)", c:"#4d5d7a" };
  return <span className="badge" style={{ background:s.bg, color:s.c }}>{type ? type.charAt(0).toUpperCase()+type.slice(1) : "—"}</span>;
};

const KPI = ({ label, value, color, sub, delta }) => (
  <div className="card-sm">
    <p style={{ fontSize:10, color:C.mu, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6 }}>{label}</p>
    <p style={{ fontSize:21, fontWeight:700, color:color||C.wh, letterSpacing:"-0.5px", fontFamily:"'Syne',sans-serif" }}>{value}</p>
    {delta !== undefined && (
      <p style={{ fontSize:11, color:Number(delta)>=0?C.gr:C.re, marginTop:3 }}>
        {Number(delta)>=0?"↑":"↓"} {Math.abs(delta).toFixed(1)}% vs mes ant.
      </p>
    )}
    {sub && !delta && <p style={{ fontSize:11, color:C.mu, marginTop:3 }}>{sub}</p>}
  </div>
);

const Modal = ({ title, onClose, children, wide }) => (
  <div className="modal-overlay" onClick={e => e.target===e.currentTarget&&onClose()}>
    <div className="modal-box" style={wide?{maxWidth:700}:{}}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <p style={{ fontSize:16, fontWeight:600, color:C.wh, fontFamily:"'Syne',sans-serif" }}>{title}</p>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const ConfirmDialog = ({ message, onConfirm, onCancel }) => (
  <div className="modal-overlay">
    <div className="modal-box" style={{ maxWidth:360 }}>
      <p style={{ fontSize:15, color:C.wh, marginBottom:8, fontWeight:500 }}>¿Confirmar acción?</p>
      <p style={{ fontSize:13, color:C.mu, marginBottom:24 }}>{message}</p>
      <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
        <button className="btn btn-ghost btn-sm" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-danger btn-sm" onClick={onConfirm}>Confirmar</button>
      </div>
    </div>
  </div>
);

const Toast = ({ toast, onClose }) => {
  if(!toast) return null;
  const color = toast.type==="error"?C.re:toast.type==="warn"?C.am:C.gr;
  const icon = toast.type==="error"?"✕":toast.type==="warn"?"⚠":"✓";
  return (
    <div className="toast">
      <span style={{ color, fontWeight:700, fontSize:14 }}>{icon}</span>
      <span style={{ color:C.tx }}>{toast.message}</span>
      <button onClick={onClose} style={{ marginLeft:"auto", background:"none", border:"none", color:C.mu, cursor:"pointer", fontSize:14 }}>✕</button>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label, prefix="Bs. " }) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{ background:C.card, border:`1px solid ${C.cb2}`, borderRadius:10, padding:"10px 14px", fontSize:12 }}>
      <p style={{ color:C.mu, marginBottom:6, fontSize:11 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color, fontWeight:600 }}>{p.name}: {prefix}{fmt(p.value)}</p>
      ))}
    </div>
  );
};

// ─── SELECTOR DE PERÍODO ───────────────────────────────────────────────
function SelectorPeriodo({ meses, setMeses, anioBase, setAnioBase }) {
  const opciones = [
    { label:"3M", v:3 }, { label:"6M", v:6 }, { label:"12M", v:12 }, { label:"24M", v:24 },
  ];
  return (
    <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap" }}>
      {opciones.map(o => (
        <button key={o.v} className={`btn btn-sm ${meses===o.v?"btn-primary":"btn-ghost"}`} onClick={()=>setMeses(o.v)}>{o.label}</button>
      ))}
      <select className="form-input btn-sm" value={anioBase} onChange={e=>setAnioBase(Number(e.target.value))} style={{ width:"auto", padding:"5px 10px" }}>
        {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

// ─── HELPERS DE DATOS ──────────────────────────────────────────────────
function getPeriodos(mesesAtras, anioBase, mesBase) {
  const result = [];
  for(let i=mesesAtras-1; i>=0; i--) {
    let m = mesBase - i;
    let a = anioBase;
    while(m <= 0) { m += 12; a--; }
    while(m > 12) { m -= 12; a++; }
    result.push({ mes:m, anio:a, label:`${MESES[m]} ${a}`, labelCorto:MESES[m] });
  }
  return result;
}

function calcVariacion(actual, anterior) {
  if(!anterior || anterior===0) return null;
  return ((actual - anterior) / anterior) * 100;
}

// ─── LOGIN ─────────────────────────────────────────────────────────────
function Login({ onLogin }) {
  const [f, setF] = useState({ email:"", password:"" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const go = async () => {
    setLoading(true); setErr("");
    const { error } = await supabase.auth.signInWithPassword(f);
    if(error) setErr("Email o contraseña incorrectos"); else onLogin();
    setLoading(false);
  };
  return (
    <div className="login-bg">
      <div style={{ width:"100%", maxWidth:380 }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ width:56, height:56, background:`linear-gradient(135deg,${C.ac},${C.bl})`, borderRadius:16, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:24 }}>🏢</div>
          <p style={{ fontSize:24, fontWeight:700, color:C.wh, fontFamily:"'Syne',sans-serif" }}>Edificio Manager</p>
          <p style={{ fontSize:13, color:C.mu, marginTop:4 }}>Centro Comercial Limax</p>
        </div>
        <div className="card">
          {err && <div style={{ background:"rgba(240,79,90,0.08)", border:"1px solid rgba(240,79,90,0.2)", borderRadius:8, padding:"10px 14px", marginBottom:16 }}><p style={{ color:C.re, fontSize:13 }}>{err}</p></div>}
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&go()} /></div>
          <div className="form-group" style={{ marginBottom:20 }}><label className="form-label">Contraseña</label><input className="form-input" type="password" value={f.password} onChange={e=>setF(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&go()} /></div>
          <button className="btn btn-primary" style={{ width:"100%", justifyContent:"center" }} onClick={go} disabled={loading}>{loading?"Ingresando...":"Ingresar"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── SECCIÓN 1: ANÁLISIS ───────────────────────────────────────────────
function Analisis({ pagos, contratos, expensas, inquilinos, mantenimiento }) {
  const now = new Date();
  const [meses, setMeses] = useState(12);
  const [anioBase, setAnioBase] = useState(now.getFullYear());
  const mesBase = now.getMonth() + 1;

  const periodos = useMemo(() => getPeriodos(meses, anioBase, mesBase), [meses, anioBase, mesBase]);

  // Datos de evolución mensual
  const evolucion = useMemo(() => periodos.map(p => {
    const psMes = pagos.filter(x => Number(x.mes)===p.mes && Number(x.anio)===p.anio);
    const eMes = expensas.filter(x => Number(x.mes)===p.mes && Number(x.anio)===p.anio);
    const cobrado = psMes.filter(x=>x.estado==="pagado").reduce((a,b)=>a+Number(b.monto),0);
    const gastos = eMes.reduce((a,b)=>a+Number(b.monto),0);
    return { ...p, cobrado, gastos, neto: cobrado-gastos };
  }), [periodos, pagos, expensas]);

  // KPIs del período
  const totCobrado = evolucion.reduce((a,b)=>a+b.cobrado,0);
  const totGastos = evolucion.reduce((a,b)=>a+b.gastos,0);
  const totNeto = totCobrado - totGastos;

  // Variación vs período anterior
  const ultimo = evolucion[evolucion.length-1];
  const penultimo = evolucion[evolucion.length-2];
  const deltaCobrado = calcVariacion(ultimo?.cobrado, penultimo?.cobrado);
  const deltaGastos = calcVariacion(ultimo?.gastos, penultimo?.gastos);
  const deltaNeto = calcVariacion(ultimo?.neto, penultimo?.neto);

  // Composición de ingresos por local (último período)
  const ingresosPorLocal = useMemo(() => {
    const totales = {};
    pagos.filter(p => {
      const idx = periodos.findIndex(x=>x.mes===Number(p.mes)&&x.anio===Number(p.anio));
      return idx>=0 && p.estado==="pagado";
    }).forEach(p => {
      const c = contratos.find(x=>x.id===p.contrato_id);
      if(c) totales[c.local] = (totales[c.local]||0) + Number(p.monto);
    });
    return Object.entries(totales)
      .map(([local,total])=>({ name:local, value:total }))
      .sort((a,b)=>b.value-a.value)
      .slice(0,8);
  }, [pagos, contratos, periodos]);

  // Tasa de cobranza por mes
  const cobranza = useMemo(() => evolucion.map(p => {
    const psMes = pagos.filter(x=>Number(x.mes)===p.mes&&Number(x.anio)===p.anio&&x.tipo==="alquiler");
    const pagados = psMes.filter(x=>x.estado==="pagado").length;
    const total = psMes.length;
    const tasa = total>0 ? Math.round((pagados/total)*100) : 0;
    return { ...p, tasa, pagados, total };
  }), [evolucion, pagos]);

  const ocupacion = contratos.length>0 ? Math.round((contratos.filter(c=>c.estado==="activo").length/contratos.length)*100) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, flexWrap:"wrap", gap:12 }}>
        <div>
          <p className="section-title">Análisis Financiero</p>
          <p className="section-sub">Vista estratégica del centro comercial</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <SelectorPeriodo meses={meses} setMeses={setMeses} anioBase={anioBase} setAnioBase={setAnioBase} />
          <button className="btn btn-ghost btn-sm" onClick={() => generarReporte({ mes:mesBase, anio:anioBase, inquilinos, contratos, pagos, expensas, mantenimiento })}>↓ Reporte</button>
        </div>
      </div>

      {/* KPIs principales */}
      <div className="gkpi" style={{ marginBottom:16 }}>
        <KPI label="Total cobrado" value={`Bs. ${fmt(totCobrado)}`} color={C.gr} delta={deltaCobrado} />
        <KPI label="Total gastos" value={`Bs. ${fmt(totGastos)}`} color={C.re} delta={deltaGastos} />
        <KPI label="Resultado neto" value={`Bs. ${fmt(totNeto)}`} color={totNeto>=0?C.gr:C.re} delta={deltaNeto} />
        <KPI label="Ocupación" value={`${ocupacion}%`} color={C.ac} sub={`${contratos.filter(c=>c.estado==="activo").length} locales activos`} />
        <KPI label="Mantenimiento" value={mantenimiento.filter(m=>m.estado==="pendiente").length} color={mantenimiento.filter(m=>m.estado==="pendiente").length>0?C.re:C.gr} sub="pendientes" />
      </div>

      {/* Gráfica principal: Ingresos vs Gastos */}
      <div className="card" style={{ marginBottom:14 }}>
        <p className="chart-title">Ingresos vs Gastos</p>
        <p className="chart-sub">Evolución mensual — {meses} meses</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={evolucion} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.cb} vertical={false} />
            <XAxis dataKey="labelCorto" tick={{ fill:C.mu, fontSize:11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill:C.mu, fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend formatter={v=><span style={{color:C.mu,fontSize:11}}>{v}</span>} />
            <Bar dataKey="cobrado" name="Cobrado" fill={C.gr} radius={[3,3,0,0]} opacity={0.85} />
            <Bar dataKey="gastos" name="Gastos" fill={C.re} radius={[3,3,0,0]} opacity={0.75} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Resultado neto + Tasa cobranza */}
      <div className="g2" style={{ marginBottom:14 }}>
        <div className="card">
          <p className="chart-title">Resultado Neto</p>
          <p className="chart-sub">Ganancia mensual después de gastos</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={evolucion}>
              <defs>
                <linearGradient id="gradNeto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.ac} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={C.ac} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={C.cb} vertical={false} />
              <XAxis dataKey="labelCorto" tick={{ fill:C.mu, fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill:C.mu, fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="neto" name="Neto" stroke={C.ac} fill="url(#gradNeto)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <p className="chart-title">Tasa de Cobranza</p>
          <p className="chart-sub">% de locales que pagaron cada mes</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={cobranza}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.cb} vertical={false} />
              <XAxis dataKey="labelCorto" tick={{ fill:C.mu, fontSize:10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0,100]} tick={{ fill:C.mu, fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`${v}%`} />
              <Tooltip formatter={(v)=>[`${v}%`,"Tasa"]} contentStyle={{ background:C.card, border:`1px solid ${C.cb2}`, borderRadius:10, fontSize:12 }} />
              <Line type="monotone" dataKey="tasa" name="Tasa" stroke={C.bl} strokeWidth={2} dot={{ fill:C.bl, r:3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Composición ingresos + Insights */}
      <div className="g2" style={{ marginBottom:14 }}>
        <div className="card">
          <p className="chart-title">Composición de Ingresos</p>
          <p className="chart-sub">Participación por local en el período</p>
          <div style={{ display:"flex", alignItems:"center", gap:16 }}>
            <ResponsiveContainer width="50%" height={180}>
              <PieChart>
                <Pie data={ingresosPorLocal} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={2}>
                  {ingresosPorLocal.map((_, i) => <Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v)=>[`Bs. ${fmt(v)}`,"Ingreso"]} contentStyle={{ background:C.card, border:`1px solid ${C.cb2}`, borderRadius:10, fontSize:12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex:1 }}>
              {ingresosPorLocal.slice(0,5).map((d,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 0", borderBottom:`1px solid ${C.cb}` }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:PIE_COLORS[i%PIE_COLORS.length] }} />
                    <span style={{ fontSize:12, color:C.tx }}>{d.name}</span>
                  </div>
                  <span style={{ fontSize:12, fontWeight:600, color:C.mu }}>Bs. {fmt(d.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <p className="chart-title">Insights del Período</p>
          <p className="chart-sub" style={{ marginBottom:14 }}>Análisis automático</p>
          {(() => {
            const mejorMes = evolucion.reduce((a,b)=>b.cobrado>a.cobrado?b:a, evolucion[0]);
            const peorMes = evolucion.filter(e=>e.cobrado>0).reduce((a,b)=>b.cobrado<a.cobrado?b:a, evolucion[0]);
            const avgNeto = totNeto / meses;
            const mesesPositivos = evolucion.filter(e=>e.neto>0).length;
            return (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <div className="insight-box">
                  <p style={{ fontSize:11, color:C.ac, fontWeight:600, marginBottom:3 }}>📈 Mejor mes</p>
                  <p style={{ fontSize:13, color:C.tx }}>{mejorMes?.label} — Bs. {fmt(mejorMes?.cobrado)}</p>
                </div>
                <div className="insight-box" style={{ borderColor:"rgba(240,79,90,0.15)", background:"linear-gradient(135deg,rgba(240,79,90,0.04),rgba(240,79,90,0.02))" }}>
                  <p style={{ fontSize:11, color:C.re, fontWeight:600, marginBottom:3 }}>📉 Mes más bajo</p>
                  <p style={{ fontSize:13, color:C.tx }}>{peorMes?.label} — Bs. {fmt(peorMes?.cobrado)}</p>
                </div>
                <div className="insight-box" style={{ borderColor:"rgba(79,142,247,0.15)", background:"linear-gradient(135deg,rgba(79,142,247,0.04),rgba(79,142,247,0.02))" }}>
                  <p style={{ fontSize:11, color:C.bl, fontWeight:600, marginBottom:3 }}>⚡ Promedio neto mensual</p>
                  <p style={{ fontSize:13, color:C.tx }}>Bs. {fmt(avgNeto)} · {mesesPositivos}/{meses} meses positivos</p>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Contratos por vencer */}
      {(() => {
        const vencen = contratos.filter(c => {
          const d = (new Date(c.vencimiento) - new Date()) / 86400000;
          return d > 0 && d < 90;
        });
        if(!vencen.length) return null;
        return (
          <div className="card" style={{ borderLeft:`3px solid ${C.am}` }}>
            <p style={{ fontSize:13, fontWeight:600, color:C.am, marginBottom:12 }}>⚠ Contratos por vencer en 90 días</p>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              {vencen.map(c => {
                const inq = inquilinos.find(i=>i.id===c.inquilino_id);
                const dias = Math.round((new Date(c.vencimiento)-new Date())/86400000);
                return (
                  <div key={c.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${C.cb}` }}>
                    <div><p style={{ fontSize:13, fontWeight:500 }}>{inq?.tienda}</p><p style={{ fontSize:11, color:C.mu }}>{c.local} · vence {c.vencimiento}</p></div>
                    <p style={{ fontSize:12, color:C.re, fontWeight:600 }}>{dias} días</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── SECCIÓN 2: LOCALES ────────────────────────────────────────────────
function Locales({ inquilinos, contratos, pagos, reload, showToast }) {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth()+1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [detalle, setDetalle] = useState(null);
  const [vista, setVista] = useState("tarjetas");

  // Heatmap: últimos 6 meses × locales activos
  const heatmapMeses = useMemo(() => {
    const result = [];
    for(let i=5; i>=0; i--) {
      let m = (now.getMonth()+1) - i;
      let a = now.getFullYear();
      while(m<=0){m+=12;a--;}
      result.push({mes:m,anio:a,label:MESES[m]});
    }
    return result;
  }, []);

  const activos = contratos.filter(c=>c.estado==="activo");

  const getEstado = (contrato, m, a) => {
    const p = pagos.find(x=>x.contrato_id===contrato.id&&Number(x.mes)===m&&Number(x.anio)===a&&x.tipo==="alquiler");
    return p?.estado==="pagado" ? "pagado" : p ? "pendiente" : "sin-registro";
  };

  const cobradoMes = activos.reduce((acc,c) => {
    const p = pagos.find(x=>x.contrato_id===c.id&&Number(x.mes)===mes&&Number(x.anio)===anio&&x.estado==="pagado");
    return acc + (p?Number(p.monto):0);
  },0);

  const pendienteMes = activos.reduce((acc,c) => {
    const p = pagos.find(x=>x.contrato_id===c.id&&Number(x.mes)===mes&&Number(x.anio)===anio&&x.tipo==="alquiler");
    if(!p||p.estado!=="pagado") return acc + Number(c.monto);
    return acc;
  },0);

  const marcarPagado = async (contrato) => {
    const p = pagos.find(x=>x.contrato_id===contrato.id&&Number(x.mes)===mes&&Number(x.anio)===anio&&x.tipo==="alquiler");
    if(p) await supabase.from("pagos").update({estado:"pagado",fecha:hoy()}).eq("id",p.id);
    else await supabase.from("pagos").insert([{contrato_id:contrato.id,tipo:"alquiler",mes,anio,monto:contrato.monto,estado:"pagado",fecha:hoy()}]);
    reload(); showToast("Marcado como cobrado"); setDetalle(null);
  };

  // Ranking de puntualidad histórica
  const ranking = useMemo(() => activos.map(c => {
    const inq = inquilinos.find(i=>i.id===c.inquilino_id);
    const ps = pagos.filter(p=>p.contrato_id===c.id&&p.tipo==="alquiler");
    const totalMeses = ps.length;
    const pagados = ps.filter(p=>p.estado==="pagado").length;
    const pct = totalMeses>0 ? Math.round((pagados/totalMeses)*100) : 0;
    return { local:c.local, tienda:inq?.tienda||"—", pct, monto:c.monto, totalMeses, pagados };
  }).sort((a,b)=>b.pct-a.pct), [activos, pagos, inquilinos]);

  const heatColor = (estado) => {
    if(estado==="pagado") return C.gr;
    if(estado==="pendiente") return C.re;
    return C.cb2;
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <p className="section-title">Locales</p>
          <p className="section-sub">{activos.length} activos de {contratos.length} totales</p>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
          <select className="form-input btn-sm" value={mes} onChange={e=>setMes(Number(e.target.value))} style={{ width:"auto", padding:"5px 10px" }}>
            {MESES_L.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select className="form-input btn-sm" value={anio} onChange={e=>setAnio(Number(e.target.value))} style={{ width:"auto", padding:"5px 10px" }}>
            {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs rápidos */}
      <div className="g2" style={{ marginBottom:16 }}>
        <div className="card-sm" style={{ borderLeft:`3px solid ${C.gr}` }}>
          <p style={{ fontSize:10, color:C.mu, textTransform:"uppercase", marginBottom:4 }}>Cobrado {MESES_L[mes]}</p>
          <p style={{ fontSize:20, fontWeight:700, color:C.gr, fontFamily:"'Syne',sans-serif" }}>Bs. {fmt(cobradoMes)}</p>
        </div>
        <div className="card-sm" style={{ borderLeft:`3px solid ${C.re}` }}>
          <p style={{ fontSize:10, color:C.mu, textTransform:"uppercase", marginBottom:4 }}>Pendiente {MESES_L[mes]}</p>
          <p style={{ fontSize:20, fontWeight:700, color:C.re, fontFamily:"'Syne',sans-serif" }}>Bs. {fmt(pendienteMes)}</p>
        </div>
      </div>

      {/* Tabs de vista */}
      <div className="tab-bar">
        {[["tarjetas","🏬 Tarjetas"],["heatmap","🔥 Heatmap"],["ranking","🏆 Ranking"]].map(([id,label])=>(
          <button key={id} className="tab-btn" onClick={()=>setVista(id)}
            style={{ background:vista===id?C.cb:"transparent", color:vista===id?C.wh:C.mu }}>{label}
          </button>
        ))}
      </div>

      {/* Vista tarjetas */}
      {vista==="tarjetas" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(145px,1fr))", gap:10 }}>
          {contratos.sort((a,b)=>a.local.localeCompare(b.local,undefined,{numeric:true})).map(c => {
            const inq = inquilinos.find(i=>i.id===c.inquilino_id);
            const estado = c.estado==="activo" ? getEstado(c,mes,anio) : "sin-contrato";
            return (
              <div key={c.id} className={`local-card ${estado==="pagado"?"pagado":estado==="pendiente"?"pendiente":"sin-contrato"}`}
                onClick={()=>setDetalle({contrato:c,inquilino:inq,estado})}>
                <p style={{ fontSize:11, fontWeight:700, color:C.ac, marginBottom:3 }}>{c.local}</p>
                <p style={{ fontSize:12, fontWeight:500, color:C.wh, marginBottom:2 }}>{inq?.tienda||"—"}</p>
                <p style={{ fontSize:11, color:C.mu, marginBottom:8 }}>{inq?.nombre||"Sin inquilino"}</p>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                  <p style={{ fontSize:12, fontWeight:600, color:C.tx }}>Bs. {fmt(c.monto)}</p>
                  <span style={{ fontSize:12, fontWeight:700, color:estado==="pagado"?C.gr:estado==="pendiente"?C.re:C.mu }}>
                    {estado==="pagado"?"✓":estado==="pendiente"?"●":"—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Vista heatmap */}
      {vista==="heatmap" && (
        <div className="card">
          <p className="chart-title">Mapa de Calor de Pagos</p>
          <p className="chart-sub">Verde = pagado · Rojo = pendiente · Gris = sin registro</p>
          <div style={{ overflowX:"auto" }}>
            <table style={{ borderCollapse:"collapse", width:"100%", minWidth:500 }}>
              <thead>
                <tr>
                  <th style={{ fontSize:11, color:C.mu, padding:"6px 10px", textAlign:"left", fontWeight:600 }}>Local</th>
                  {heatmapMeses.map((m,i)=>(
                    <th key={i} style={{ fontSize:11, color:C.mu, padding:"6px 8px", textAlign:"center", fontWeight:600 }}>{m.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activos.sort((a,b)=>a.local.localeCompare(b.local,undefined,{numeric:true})).map(c=>{
                  const inq = inquilinos.find(i=>i.id===c.inquilino_id);
                  return (
                    <tr key={c.id}>
                      <td style={{ fontSize:12, padding:"5px 10px", color:C.tx, whiteSpace:"nowrap" }}>
                        <span style={{ fontWeight:600 }}>{c.local}</span>
                        <span style={{ color:C.mu, marginLeft:6, fontSize:11 }}>{inq?.tienda||""}</span>
                      </td>
                      {heatmapMeses.map((m,i)=>{
                        const estado = getEstado(c,m.mes,m.anio);
                        return (
                          <td key={i} style={{ padding:"5px 8px", textAlign:"center" }}>
                            <div className="heatmap-cell" style={{
                              width:32, height:26, borderRadius:5, margin:"0 auto",
                              background:heatColor(estado), opacity:estado==="sin-registro"?0.3:0.85,
                              display:"flex", alignItems:"center", justifyContent:"center",
                            }} title={`${c.local} ${m.label}: ${estado}`}>
                              <span style={{ fontSize:10, color:"rgba(255,255,255,0.8)", fontWeight:600 }}>
                                {estado==="pagado"?"✓":estado==="pendiente"?"×":""}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vista ranking */}
      {vista==="ranking" && (
        <div className="card">
          <p className="chart-title">Ranking de Puntualidad</p>
          <p className="chart-sub">Basado en historial completo de pagos</p>
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {ranking.map((r,i)=>(
              <div key={r.local} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:`1px solid ${C.cb}` }}>
                <span style={{ fontSize:16, width:28, textAlign:"center" }}>
                  {i===0?"🥇":i===1?"🥈":i===2?"🥉":<span style={{ fontSize:13, color:C.mu, fontWeight:600 }}>#{i+1}</span>}
                </span>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:C.tx }}>{r.local} <span style={{ color:C.mu, fontWeight:400 }}>{r.tienda}</span></p>
                    <p style={{ fontSize:13, fontWeight:700, color:r.pct>=90?C.gr:r.pct>=70?C.am:C.re }}>{r.pct}%</p>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width:`${r.pct}%`, background:r.pct>=90?C.gr:r.pct>=70?C.am:C.re }} />
                  </div>
                  <p style={{ fontSize:11, color:C.mu, marginTop:3 }}>{r.pagados}/{r.totalMeses} meses pagados · Bs. {fmt(r.monto)}/mes</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal detalle local */}
      {detalle && (
        <Modal title={`${detalle.contrato.local} — ${detalle.inquilino?.tienda||"Sin tienda"}`} onClose={()=>setDetalle(null)}>
          <div style={{ marginBottom:16 }}>
            <p style={{ fontSize:13, color:C.mu, marginBottom:4 }}>Inquilino</p>
            <p style={{ fontSize:15, fontWeight:600, color:C.wh }}>{detalle.inquilino?.nombre||"—"}</p>
            <p style={{ fontSize:13, color:C.mu }}>{detalle.inquilino?.email} · {detalle.inquilino?.telefono}</p>
          </div>
          <div className="g2" style={{ marginBottom:16 }}>
            <div><p style={{ fontSize:11, color:C.mu, marginBottom:3 }}>ALQUILER</p><p style={{ fontSize:18, fontWeight:700, color:C.wh }}>Bs. {fmt(detalle.contrato.monto)}</p></div>
            <div><p style={{ fontSize:11, color:C.mu, marginBottom:3 }}>DEPÓSITO</p><p style={{ fontSize:18, fontWeight:700, color:C.mu }}>Bs. {fmt(detalle.contrato.deposito)}</p></div>
          </div>
          <div style={{ marginBottom:16 }}>
            <p style={{ fontSize:11, color:C.mu, marginBottom:3 }}>VIGENCIA</p>
            <p style={{ fontSize:13, color:C.tx }}>{detalle.contrato.inicio} → {detalle.contrato.vencimiento}</p>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <Badge type={detalle.estado==="sin-registro"?"pendiente":detalle.estado} />
            {(detalle.estado==="pendiente"||detalle.estado==="sin-registro") && detalle.contrato.estado==="activo" && (
              <button className="btn btn-success" onClick={()=>marcarPagado(detalle.contrato)}>✓ Marcar como cobrado</button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SECCIÓN 3: FINANZAS ───────────────────────────────────────────────
function Finanzas({ pagos, contratos, inquilinos, expensas, reload, showToast }) {
  const now = new Date();
  const [tab, setTab] = useState("cobros");
  const [mes, setMes] = useState(now.getMonth()+1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [mesesGraf, setMesesGraf] = useState(6);
  const [est, setEst] = useState("todos");
  const [modalPago, setModalPago] = useState(false);
  const [modalGasto, setModalGasto] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fp, setFp] = useState({ contrato_id:"", tipo:"alquiler", mes:now.getMonth()+1, anio:now.getFullYear(), monto:"", fecha:"", estado:"pendiente" });
  const [fg, setFg] = useState({ concepto:"", monto:"", mes:now.getMonth()+1, anio:now.getFullYear(), descripcion:"" });

  const pagosFiltrados = pagos.filter(p=>Number(p.mes)===mes&&Number(p.anio)===anio&&(est==="todos"||p.estado===est));
  const gastosFiltrados = expensas.filter(e=>Number(e.mes)===mes&&Number(e.anio)===anio);

  // Evolución de gastos por concepto (últimos N meses)
  const mesBase = now.getMonth()+1;
  const periodosGraf = useMemo(() => getPeriodos(mesesGraf, now.getFullYear(), mesBase), [mesesGraf]);

  const gastosPorCategoria = useMemo(() => {
    const cats = {};
    expensas.filter(e => periodosGraf.some(p=>p.mes===Number(e.mes)&&p.anio===Number(e.anio)))
      .forEach(e => { cats[e.concepto] = (cats[e.concepto]||0)+Number(e.monto); });
    return Object.entries(cats).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value).slice(0,8);
  }, [expensas, periodosGraf]);

  const evolucionGastos = useMemo(() => periodosGraf.map(p => {
    const eMes = expensas.filter(e=>Number(e.mes)===p.mes&&Number(e.anio)===p.anio);
    return { ...p, total:eMes.reduce((a,b)=>a+Number(b.monto),0) };
  }), [periodosGraf, expensas]);

  const cobradoTotal = pagosFiltrados.filter(p=>p.estado==="pagado").reduce((a,b)=>a+Number(b.monto),0);
  const pendienteTotal = pagosFiltrados.filter(p=>p.estado==="pendiente").reduce((a,b)=>a+Number(b.monto),0);
  const gastosTotal = gastosFiltrados.reduce((a,b)=>a+Number(b.monto),0);

  const savePago = async () => {
    if(!fp.contrato_id||!fp.monto) return showToast("Completá los campos requeridos","error");
    setSaving(true);
    await supabase.from("pagos").insert([{...fp,monto:Number(fp.monto),mes:Number(fp.mes),anio:Number(fp.anio)}]);
    setModalPago(false); reload(); showToast("Pago registrado"); setSaving(false);
  };
  const saveGasto = async () => {
    if(!fg.concepto||!fg.monto) return showToast("Completá concepto y monto","error");
    setSaving(true);
    await supabase.from("expensas").insert([{...fg,monto:Number(fg.monto),mes:Number(fg.mes),anio:Number(fg.anio)}]);
    setModalGasto(false); reload(); showToast("Gasto registrado"); setSaving(false);
  };
  const eliminar = async () => {
    if(deleteType==="pago") await supabase.from("pagos").delete().eq("id",confirmDelete);
    else await supabase.from("expensas").delete().eq("id",confirmDelete);
    setConfirmDelete(null); setDeleteType(null); reload(); showToast("Eliminado");
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div><p className="section-title">Finanzas</p><p className="section-sub">Pagos, gastos y análisis detallado</p></div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
          <select className="form-input btn-sm" value={mes} onChange={e=>setMes(Number(e.target.value))} style={{ width:"auto", padding:"5px 10px" }}>
            {MESES_L.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select className="form-input btn-sm" value={anio} onChange={e=>setAnio(Number(e.target.value))} style={{ width:"auto", padding:"5px 10px" }}>
            {YEARS.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="tab-bar">
        {[["cobros","💰 Cobros"],["gastos","💸 Gastos"],["analisis","📊 Análisis gastos"]].map(([id,label])=>(
          <button key={id} className="tab-btn" onClick={()=>setTab(id)}
            style={{ background:tab===id?C.cb:"transparent", color:tab===id?C.wh:C.mu }}>{label}</button>
        ))}
      </div>

      {tab==="cobros" && (
        <>
          <div className="g2" style={{ marginBottom:14 }}>
            <div className="card-sm" style={{ borderLeft:`3px solid ${C.gr}` }}>
              <p style={{ fontSize:10, color:C.mu, textTransform:"uppercase" }}>Cobrado</p>
              <p style={{ fontSize:20, fontWeight:700, color:C.gr }}>Bs. {fmt(cobradoTotal)}</p>
            </div>
            <div className="card-sm" style={{ borderLeft:`3px solid ${C.am}` }}>
              <p style={{ fontSize:10, color:C.mu, textTransform:"uppercase" }}>Pendiente</p>
              <p style={{ fontSize:20, fontWeight:700, color:C.am }}>Bs. {fmt(pendienteTotal)}</p>
            </div>
          </div>
          <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap", justifyContent:"space-between" }}>
            <div style={{ display:"flex", gap:6 }}>
              {["todos","pagado","pendiente"].map(v=>(
                <button key={v} className={`btn btn-sm ${est===v?"btn-primary":"btn-ghost"}`} onClick={()=>setEst(v)}>
                  {v==="todos"?"Todos":v==="pagado"?"Cobrados":"Pendientes"}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button className="btn btn-ghost btn-sm" onClick={()=>exportExcel(pagosFiltrados.map(p=>{const c=contratos.find(x=>x.id===p.contrato_id);const inq=inquilinos.find(x=>x.id===c?.inquilino_id);return{Inquilino:inq?.nombre,Tienda:inq?.tienda,Local:c?.local,Tipo:p.tipo,Mes:MESES_L[p.mes],Anio:p.anio,Monto:p.monto,Estado:p.estado,Fecha:p.fecha||"—"};}),`pagos_${MESES_L[mes]}_${anio}`,"Pagos")}>↓ Excel</button>
              <button className="btn btn-primary btn-sm" onClick={()=>{setFp({contrato_id:"",tipo:"alquiler",mes,anio,monto:"",fecha:"",estado:"pendiente"});setModalPago(true);}}>+ Pago</button>
            </div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Inquilino</th><th>Tipo</th><th>Monto</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {pagosFiltrados.length===0&&<tr><td colSpan={6} style={{ textAlign:"center", color:C.mu, padding:28 }}>Sin pagos para este período</td></tr>}
                {pagosFiltrados.map(p=>{
                  const c=contratos.find(x=>x.id===p.contrato_id);
                  const inq=inquilinos.find(x=>x.id===c?.inquilino_id);
                  return (
                    <tr key={p.id} className="table-row">
                      <td><p style={{ fontWeight:500 }}>{inq?.tienda||"—"}</p><p style={{ fontSize:11, color:C.mu }}>{c?.local}</p></td>
                      <td><Badge type={p.tipo} /></td>
                      <td style={{ fontWeight:600 }}>Bs. {fmt(p.monto)}</td>
                      <td style={{ color:C.mu, fontSize:12 }}>{p.fecha||"—"}</td>
                      <td><Badge type={p.estado} /></td>
                      <td>
                        <div style={{ display:"flex", gap:4 }}>
                          {p.estado==="pendiente"&&<button className="btn btn-success btn-sm" onClick={async()=>{await supabase.from("pagos").update({estado:"pagado",fecha:hoy()}).eq("id",p.id);reload();showToast("Marcado como cobrado");}}>✓</button>}
                          <button className="btn btn-danger btn-sm" onClick={()=>{setConfirmDelete(p.id);setDeleteType("pago");}}>✕</button>
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

      {tab==="gastos" && (
        <>
          <div className="card-sm" style={{ borderLeft:`3px solid ${C.re}`, marginBottom:14 }}>
            <p style={{ fontSize:10, color:C.mu, textTransform:"uppercase" }}>Total gastos</p>
            <p style={{ fontSize:20, fontWeight:700, color:C.re }}>Bs. {fmt(gastosTotal)}</p>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:6, marginBottom:12 }}>
            <button className="btn btn-ghost btn-sm" onClick={()=>exportExcel(gastosFiltrados.map(e=>({Concepto:e.concepto,Descripcion:e.descripcion,Monto:e.monto,Mes:MESES_L[e.mes],Anio:e.anio})),`gastos_${MESES_L[mes]}_${anio}`,"Gastos")}>↓ Excel</button>
            <button className="btn btn-primary btn-sm" onClick={()=>{setFg({concepto:"",monto:"",mes,anio,descripcion:""});setModalGasto(true);}}>+ Gasto</button>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Concepto</th><th>Descripción</th><th>Monto</th><th></th></tr></thead>
              <tbody>
                {gastosFiltrados.length===0&&<tr><td colSpan={4} style={{ textAlign:"center", color:C.mu, padding:28 }}>Sin gastos para este período</td></tr>}
                {gastosFiltrados.map(e=>(
                  <tr key={e.id} className="table-row">
                    <td style={{ fontWeight:500 }}>{e.concepto}</td>
                    <td style={{ color:C.mu, fontSize:12 }}>{e.descripcion||"—"}</td>
                    <td style={{ fontWeight:600, color:C.re }}>Bs. {fmt(e.monto)}</td>
                    <td><button className="btn btn-danger btn-sm" onClick={()=>{setConfirmDelete(e.id);setDeleteType("gasto");}}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab==="analisis" && (
        <>
          <div style={{ display:"flex", gap:6, marginBottom:16, alignItems:"center" }}>
            <span style={{ fontSize:12, color:C.mu }}>Período:</span>
            {[3,6,12].map(n=>(
              <button key={n} className={`btn btn-sm ${mesesGraf===n?"btn-primary":"btn-ghost"}`} onClick={()=>setMesesGraf(n)}>{n}M</button>
            ))}
          </div>
          <div className="g2" style={{ marginBottom:14 }}>
            <div className="card">
              <p className="chart-title">Evolución de gastos</p>
              <p className="chart-sub">Total mensual de expensas</p>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={evolucionGastos}>
                  <defs>
                    <linearGradient id="gradG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.re} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={C.re} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.cb} vertical={false} />
                  <XAxis dataKey="labelCorto" tick={{ fill:C.mu, fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:C.mu, fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="total" name="Gastos" stroke={C.re} fill="url(#gradG)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <p className="chart-title">Distribución por concepto</p>
              <p className="chart-sub">Top gastos del período</p>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie data={gastosPorCategoria} cx="50%" cy="50%" innerRadius={35} outerRadius={65} dataKey="value" paddingAngle={2}>
                      {gastosPorCategoria.map((_,i)=><Cell key={i} fill={PIE_COLORS[i%PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={v=>[`Bs. ${fmt(v)}`,"Gasto"]} contentStyle={{ background:C.card, border:`1px solid ${C.cb2}`, borderRadius:10, fontSize:12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex:1 }}>
                  {gastosPorCategoria.slice(0,5).map((d,i)=>(
                    <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", borderBottom:`1px solid ${C.cb}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:7, height:7, borderRadius:"50%", background:PIE_COLORS[i%PIE_COLORS.length] }} />
                        <span style={{ fontSize:11, color:C.tx }}>{d.name}</span>
                      </div>
                      <span style={{ fontSize:11, fontWeight:600, color:C.mu }}>Bs. {fmt(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {confirmDelete && <ConfirmDialog message="¿Eliminar este registro?" onConfirm={eliminar} onCancel={()=>{setConfirmDelete(null);setDeleteType(null);}} />}

      {modalPago && (
        <Modal title="Registrar Pago" onClose={()=>setModalPago(false)}>
          <div className="form-group"><label className="form-label">Contrato *</label>
            <select className="form-input" value={fp.contrato_id} onChange={e=>setFp(p=>({...p,contrato_id:e.target.value}))}>
              <option value="">Seleccionar...</option>
              {contratos.map(c=>{const inq=inquilinos.find(i=>i.id===c.inquilino_id);return<option key={c.id} value={c.id}>{inq?.nombre} – {c.local}</option>;})}
            </select>
          </div>
          <div className="g2">
            <div className="form-group"><label className="form-label">Tipo</label><select className="form-input" value={fp.tipo} onChange={e=>setFp(p=>({...p,tipo:e.target.value}))}>{["alquiler","expensa","multa"].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-input" value={fp.estado} onChange={e=>setFp(p=>({...p,estado:e.target.value}))}>{["pendiente","pagado"].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Mes</label><select className="form-input" value={fp.mes} onChange={e=>setFp(p=>({...p,mes:Number(e.target.value)}))}>{MESES_L.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Año</label><select className="form-input" value={fp.anio} onChange={e=>setFp(p=>({...p,anio:Number(e.target.value)}))}>{YEARS.map(y=><option key={y} value={y}>{y}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Monto (Bs.) *</label><input className="form-input" type="number" value={fp.monto} onChange={e=>setFp(p=>({...p,monto:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Fecha</label><input className="form-input" type="date" value={fp.fecha} onChange={e=>setFp(p=>({...p,fecha:e.target.value}))} /></div>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setModalPago(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={savePago} disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
          </div>
        </Modal>
      )}

      {modalGasto && (
        <Modal title="Nuevo Gasto" onClose={()=>setModalGasto(false)}>
          <div className="form-group"><label className="form-label">Concepto *</label><input className="form-input" value={fg.concepto} onChange={e=>setFg(p=>({...p,concepto:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">Descripción</label><input className="form-input" value={fg.descripcion} onChange={e=>setFg(p=>({...p,descripcion:e.target.value}))} /></div>
          <div className="g2">
            <div className="form-group"><label className="form-label">Monto (Bs.) *</label><input className="form-input" type="number" value={fg.monto} onChange={e=>setFg(p=>({...p,monto:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Mes</label><select className="form-input" value={fg.mes} onChange={e=>setFg(p=>({...p,mes:Number(e.target.value)}))}>{MESES_L.slice(1).map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Año</label><select className="form-input" value={fg.anio} onChange={e=>setFg(p=>({...p,anio:Number(e.target.value)}))}>{YEARS.map(y=><option key={y} value={y}>{y}</option>)}</select></div>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setModalGasto(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={saveGasto} disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── SECCIÓN 4: GESTIÓN ────────────────────────────────────────────────
function Gestion({ inquilinos, contratos, pagos, activos, activos_gastos, mantenimiento, reload, showToast }) {
  const [tab, setTab] = useState("mantenimiento");
  const [modal, setModal] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleteType, setDeleteType] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fi, setFi] = useState({ nombre:"", tienda:"", email:"", telefono:"", m2:30 });
  const [fc, setFc] = useState({ inquilino_id:"", local:"", monto:"", inicio:"", vencimiento:"", deposito:"", estado:"activo" });
  const [fa, setFa] = useState({ nombre:"", descripcion:"", categoria:"equipamiento", valor_reposicion:"", fecha_adquisicion:"", estado:"operativo" });
  const [fm, setFm] = useState({ titulo:"", descripcion:"", area:"", prioridad:"media", estado:"pendiente", responsable:"", fecha_reporte:hoy(), fecha_resolucion:"" });
  const [fg_act, setFgAct] = useState({ concepto:"", monto:"", fecha:hoy(), tipo:"mantenimiento" });
  const [activoSel, setActivoSel] = useState(null);
  const [modalGasto, setModalGasto] = useState(false);

  const CATS = ["equipamiento","infraestructura","vehiculo","tecnologia","otro"];
  const TIPOS_GASTO = ["mantenimiento","reparacion","repuesto","inspeccion","otro"];

  const saveInquilino = async () => {
    if(!fi.nombre||!fi.tienda) return showToast("Completá nombre y tienda","error");
    setSaving(true);
    if(modal==="nuevo-inq") await supabase.from("inquilinos").insert([{...fi,m2:Number(fi.m2),activo:true}]);
    else await supabase.from("inquilinos").update({...fi,m2:Number(fi.m2)}).eq("id",fi.id);
    setModal(null); reload(); showToast(modal==="nuevo-inq"?"Inquilino registrado":"Inquilino actualizado"); setSaving(false);
  };
  const saveContrato = async () => {
    if(!fc.inquilino_id||!fc.local||!fc.monto) return showToast("Completá los campos requeridos","error");
    setSaving(true);
    if(modal==="nuevo-con") await supabase.from("contratos").insert([{...fc,monto:Number(fc.monto),deposito:Number(fc.deposito)}]);
    else await supabase.from("contratos").update({...fc,monto:Number(fc.monto),deposito:Number(fc.deposito)}).eq("id",fc.id);
    setModal(null); reload(); showToast(modal==="nuevo-con"?"Contrato registrado":"Contrato actualizado"); setSaving(false);
  };
  const saveActivo = async () => {
    if(!fa.nombre) return showToast("Completá el nombre","error");
    setSaving(true);
    if(modal==="nuevo-act") await supabase.from("activos").insert([{...fa,valor_reposicion:Number(fa.valor_reposicion)||0}]);
    else await supabase.from("activos").update({...fa,valor_reposicion:Number(fa.valor_reposicion)||0}).eq("id",fa.id);
    setModal(null); reload(); showToast("Equipo guardado"); setSaving(false);
  };
  const saveGastoActivo = async () => {
    if(!fg_act.concepto||!fg_act.monto) return showToast("Completá concepto y monto","error");
    await supabase.from("activos_gastos").insert([{...fg_act,activo_id:activoSel.id,monto:Number(fg_act.monto)}]);
    setModalGasto(false); reload(); showToast("Gasto registrado");
  };
  const saveMantenimiento = async () => {
    if(!fm.titulo) return showToast("Completá el título","error");
    setSaving(true);
    if(modal==="nuevo-mant") await supabase.from("mantenimiento").insert([fm]);
    else await supabase.from("mantenimiento").update(fm).eq("id",fm.id);
    setModal(null); reload(); showToast("Pedido guardado"); setSaving(false);
  };
  const eliminar = async () => {
    if(deleteType==="inquilino") await supabase.from("inquilinos").delete().eq("id",confirmDelete);
    else if(deleteType==="contrato") await supabase.from("contratos").delete().eq("id",confirmDelete);
    else if(deleteType==="activo") await supabase.from("activos").delete().eq("id",confirmDelete);
    else if(deleteType==="gasto-act") await supabase.from("activos_gastos").delete().eq("id",confirmDelete);
    else await supabase.from("mantenimiento").delete().eq("id",confirmDelete);
    setConfirmDelete(null); setDeleteType(null); reload(); showToast("Eliminado");
  };

  const importarInquilinos = (e) => {
    importExcel(e.target.files[0], async (rows) => {
      for(const r of rows) await supabase.from("inquilinos").insert([{nombre:r.Nombre,tienda:r.Tienda,email:r.Email||"",telefono:String(r.Telefono||""),m2:Number(r.m2)||0,activo:true}]);
      reload(); showToast(`${rows.length} inquilinos importados`);
    });
  };
  const importarContratos = (e) => {
    importExcel(e.target.files[0], async (rows) => {
      for(const r of rows) {
        const inq = inquilinos.find(i=>i.nombre===r.Inquilino||i.tienda===r.Tienda);
        if(!inq){showToast(`No encontrado: ${r.Inquilino}`,"error");continue;}
        await supabase.from("contratos").insert([{inquilino_id:inq.id,local:r.Local,monto:Number(r.Monto),deposito:Number(r.Deposito||0),inicio:r.Inicio,vencimiento:r.Vencimiento,estado:r.Estado||"activo"}]);
      }
      reload(); showToast("Contratos importados");
    });
  };

  const pend = mantenimiento.filter(m=>m.estado==="pendiente").length;
  const prog = mantenimiento.filter(m=>m.estado==="en progreso").length;
  const res = mantenimiento.filter(m=>m.estado==="resuelto").length;

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div><p className="section-title">Gestión</p><p className="section-sub">Inquilinos, contratos, equipos y mantenimiento</p></div>
        <div style={{ display:"flex", gap:6 }}>
          {tab==="inquilinos"&&<><label className="btn btn-ghost btn-sm" style={{ cursor:"pointer" }}>↑ Importar<input type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={importarInquilinos} /></label><button className="btn btn-primary btn-sm" onClick={()=>{setFi({nombre:"",tienda:"",email:"",telefono:"",m2:30});setModal("nuevo-inq");}}>+ Inquilino</button></>}
          {tab==="contratos"&&<><label className="btn btn-ghost btn-sm" style={{ cursor:"pointer" }}>↑ Importar<input type="file" accept=".xlsx,.xls" style={{ display:"none" }} onChange={importarContratos} /></label><button className="btn btn-primary btn-sm" onClick={()=>{setFc({inquilino_id:"",local:"",monto:"",inicio:"",vencimiento:"",deposito:"",estado:"activo"});setModal("nuevo-con");}}>+ Contrato</button></>}
          {tab==="equipos"&&<button className="btn btn-primary btn-sm" onClick={()=>{setFa({nombre:"",descripcion:"",categoria:"equipamiento",valor_reposicion:"",fecha_adquisicion:"",estado:"operativo"});setModal("nuevo-act");}}>+ Equipo</button>}
          {tab==="mantenimiento"&&<button className="btn btn-primary btn-sm" onClick={()=>{setFm({titulo:"",descripcion:"",area:"",prioridad:"media",estado:"pendiente",responsable:"",fecha_reporte:hoy(),fecha_resolucion:""});setModal("nuevo-mant");}}>+ Pedido</button>}
        </div>
      </div>

      <div className="tab-bar">
        {[["mantenimiento","🔧 Mantenimiento"],["equipos","⚙️ Equipos"],["inquilinos","👤 Inquilinos"],["contratos","📋 Contratos"]].map(([id,label])=>(
          <button key={id} className="tab-btn" onClick={()=>setTab(id)}
            style={{ background:tab===id?C.cb:"transparent", color:tab===id?C.wh:C.mu }}>{label}</button>
        ))}
      </div>

      {tab==="mantenimiento" && (
        <>
          <div className="g3" style={{ marginBottom:14 }}>
            <div className="card-sm" style={{ borderLeft:`3px solid ${C.re}` }}><p style={{ fontSize:10, color:C.mu, textTransform:"uppercase" }}>Pendientes</p><p style={{ fontSize:22, fontWeight:700, color:pend>0?C.re:C.mu }}>{pend}</p></div>
            <div className="card-sm" style={{ borderLeft:`3px solid ${C.bl}` }}><p style={{ fontSize:10, color:C.mu, textTransform:"uppercase" }}>En progreso</p><p style={{ fontSize:22, fontWeight:700, color:prog>0?C.bl:C.mu }}>{prog}</p></div>
            <div className="card-sm" style={{ borderLeft:`3px solid ${C.gr}` }}><p style={{ fontSize:10, color:C.mu, textTransform:"uppercase" }}>Resueltos</p><p style={{ fontSize:22, fontWeight:700, color:C.gr }}>{res}</p></div>
          </div>
          <div className="table-wrapper">
            <table className="data-table">
              <thead><tr><th>Título</th><th>Área</th><th>Prioridad</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {mantenimiento.length===0&&<tr><td colSpan={5} style={{ textAlign:"center", color:C.mu, padding:28 }}>Sin pedidos registrados</td></tr>}
                {mantenimiento.map(m=>(
                  <tr key={m.id} className="table-row">
                    <td><p style={{ fontWeight:500 }}>{m.titulo}</p><p style={{ fontSize:11, color:C.mu }}>{m.descripcion}</p></td>
                    <td style={{ color:C.mu }}>{m.area||"—"}</td>
                    <td><Badge type={m.prioridad} /></td>
                    <td><Badge type={m.estado} /></td>
                    <td>
                      <div style={{ display:"flex", gap:4 }}>
                        {m.estado!=="resuelto"&&<button className="btn btn-success btn-sm" onClick={async()=>{await supabase.from("mantenimiento").update({estado:"resuelto",fecha_resolucion:hoy()}).eq("id",m.id);reload();showToast("Resuelto");}}>✓</button>}
                        <button className="btn btn-ghost btn-sm" onClick={()=>{setFm(m);setModal("editar-mant");}}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>{setConfirmDelete(m.id);setDeleteType("mantenimiento");}}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab==="equipos" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {activos.length===0&&<div className="card" style={{ textAlign:"center", color:C.mu, padding:40 }}><p style={{ fontWeight:600, color:C.wh, marginBottom:6 }}>Sin equipos registrados</p></div>}
          {activos.map(a=>{
            const gs = activos_gastos.filter(g=>g.activo_id===a.id);
            const totalG = gs.reduce((x,g)=>x+Number(g.monto),0);
            const pct = a.valor_reposicion>0 ? Math.round((totalG/Number(a.valor_reposicion))*100) : 0;
            const alerta = pct>=80;
            const barColor = pct>=100?C.re:pct>=80?C.am:C.gr;
            return (
              <div key={a.id} className="card" style={{ borderLeft:`3px solid ${alerta?C.re:C.gr}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12, flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:3 }}>
                      <p style={{ fontWeight:600, fontSize:14, color:C.wh }}>{a.nombre}</p>
                      <Badge type={a.estado} />
                      <span style={{ fontSize:11, color:C.mu, background:C.bg, padding:"2px 7px", borderRadius:5 }}>{a.categoria}</span>
                    </div>
                    {a.descripcion&&<p style={{ fontSize:12, color:C.mu }}>{a.descripcion}</p>}
                  </div>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>{setActivoSel(a);setFgAct({concepto:"",monto:"",fecha:hoy(),tipo:"mantenimiento"});setModalGasto(true);}}>+ Gasto</button>
                    <button className="btn btn-ghost btn-sm" onClick={()=>{setActivoSel(a);setModal("historial-act");}}>Historial</button>
                    <button className="btn btn-ghost btn-sm" onClick={()=>{setFa(a);setModal("editar-act");}}>Editar</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>{setConfirmDelete(a.id);setDeleteType("activo");}}>✕</button>
                  </div>
                </div>
                <div style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                    <span style={{ fontSize:11, color:C.mu }}>Gasto acumulado vs. reposición</span>
                    <span style={{ fontSize:11, fontWeight:600, color:barColor }}>{pct}%</span>
                  </div>
                  <div className="progress-bar"><div className="progress-fill" style={{ width:`${Math.min(pct,100)}%`, background:barColor }} /></div>
                </div>
                <div className="g3">
                  <div><p style={{ fontSize:10, color:C.mu, marginBottom:2 }}>GASTO ACUM.</p><p style={{ fontSize:14, fontWeight:600, color:C.re }}>Bs. {fmt(totalG)}</p></div>
                  <div><p style={{ fontSize:10, color:C.mu, marginBottom:2 }}>REPOSICIÓN</p><p style={{ fontSize:14, fontWeight:600, color:C.wh }}>Bs. {fmt(a.valor_reposicion)}</p></div>
                  <div><p style={{ fontSize:10, color:C.mu, marginBottom:2 }}>DIFERENCIA</p><p style={{ fontSize:14, fontWeight:600, color:Number(a.valor_reposicion)-totalG>0?C.gr:C.re }}>Bs. {fmt(Number(a.valor_reposicion)-totalG)}</p></div>
                </div>
                {alerta&&<div style={{ marginTop:10, padding:"8px 12px", background:"rgba(240,79,90,0.06)", border:"1px solid rgba(240,79,90,0.15)", borderRadius:8 }}><p style={{ fontSize:12, color:C.re }}>⚠ El gasto supera el {pct}% del valor de reposición.</p></div>}
              </div>
            );
          })}
        </div>
      )}

      {tab==="inquilinos" && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Nombre</th><th>Tienda</th><th>Contacto</th><th>m²</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {inquilinos.length===0&&<tr><td colSpan={6} style={{ textAlign:"center", color:C.mu, padding:28 }}>Sin inquilinos</td></tr>}
              {inquilinos.map(i=>(
                <tr key={i.id} className="table-row">
                  <td style={{ fontWeight:500 }}>{i.nombre}</td>
                  <td style={{ color:C.mu }}>{i.tienda}</td>
                  <td style={{ fontSize:12, color:C.mu }}>{i.email}<br />{i.telefono}</td>
                  <td>{i.m2} m²</td>
                  <td><Badge type={i.activo?"activo":"inactivo"} /></td>
                  <td>
                    <div style={{ display:"flex", gap:4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={()=>{const cs=contratos.filter(c=>c.inquilino_id===i.id);const ps=pagos.filter(p=>cs.find(c=>c.id===p.contrato_id));setHistorial({inq:i,contratos:cs,pagos:ps});}}>Historial</button>
                      <button className="btn btn-ghost btn-sm" onClick={()=>{setFi(i);setModal("editar-inq");}}>Editar</button>
                      <button className="btn btn-ghost btn-sm" style={{ color:i.activo?C.re:C.gr }} onClick={async()=>{await supabase.from("inquilinos").update({activo:!i.activo}).eq("id",i.id);reload();showToast(i.activo?"Desactivado":"Activado");}}>{i.activo?"Desactivar":"Activar"}</button>
                      <button className="btn btn-danger btn-sm" onClick={()=>{setConfirmDelete(i.id);setDeleteType("inquilino");}}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab==="contratos" && (
        <div className="table-wrapper">
          <table className="data-table">
            <thead><tr><th>Inquilino</th><th>Local</th><th>Alquiler</th><th>Vigencia</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {contratos.length===0&&<tr><td colSpan={6} style={{ textAlign:"center", color:C.mu, padding:28 }}>Sin contratos</td></tr>}
              {contratos.map(c=>{
                const inq=inquilinos.find(i=>i.id===c.inquilino_id);
                const dias=Math.round((new Date(c.vencimiento)-new Date())/86400000);
                return (
                  <tr key={c.id} className="table-row">
                    <td><p style={{ fontWeight:500 }}>{inq?.nombre||"—"}</p><p style={{ fontSize:11, color:C.mu }}>{inq?.tienda}</p></td>
                    <td>{c.local}</td>
                    <td style={{ fontWeight:600, color:C.gr }}>Bs. {fmt(c.monto)}</td>
                    <td><p style={{ fontSize:12 }}>{c.inicio} → {c.vencimiento}</p>{dias>0&&dias<90&&<p style={{ fontSize:11, color:C.am }}>⚠ {dias} días</p>}{dias<=0&&<p style={{ fontSize:11, color:C.re }}>Vencido</p>}</td>
                    <td><Badge type={c.estado} /></td>
                    <td>
                      <div style={{ display:"flex", gap:4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={()=>{setFc(c);setModal("editar-con");}}>Editar</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>{setConfirmDelete(c.id);setDeleteType("contrato");}}>✕</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete&&<ConfirmDialog message="¿Eliminar este registro permanentemente?" onConfirm={eliminar} onCancel={()=>{setConfirmDelete(null);setDeleteType(null);}} />}

      {/* Historial inquilino */}
      {historial&&(
        <Modal title={`Historial — ${historial.inq.tienda}`} onClose={()=>setHistorial(null)} wide>
          <p style={{ color:C.mu, fontSize:12, marginBottom:14 }}>{historial.inq.nombre} · {historial.inq.email} · {historial.inq.telefono}</p>
          <p style={{ fontSize:13, fontWeight:600, color:C.wh, marginBottom:10 }}>Contratos ({historial.contratos.length})</p>
          {historial.contratos.map(c=>(
            <div key={c.id} style={{ background:C.bg, borderRadius:8, padding:"10px 14px", marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}><p style={{ fontSize:13, fontWeight:500 }}>{c.local}</p><Badge type={c.estado} /></div>
              <p style={{ fontSize:12, color:C.mu, marginTop:3 }}>Bs. {fmt(c.monto)}/mes · {c.inicio} → {c.vencimiento}</p>
            </div>
          ))}
          <p style={{ fontSize:13, fontWeight:600, color:C.wh, margin:"14px 0 10px" }}>Pagos ({historial.pagos.length})</p>
          <div style={{ maxHeight:180, overflowY:"auto" }}>
            {historial.pagos.map(p=>(
              <div key={p.id} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${C.cb}` }}>
                <p style={{ fontSize:12 }}>{MESES_L[p.mes]} {p.anio} · {p.tipo}</p>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <p style={{ fontSize:12, fontWeight:600 }}>Bs. {fmt(p.monto)}</p>
                  <Badge type={p.estado} />
                </div>
              </div>
            ))}
            {historial.pagos.length===0&&<p style={{ color:C.mu, fontSize:12 }}>Sin pagos registrados</p>}
          </div>
        </Modal>
      )}

      {/* Modal historial activo */}
      {modal==="historial-act"&&activoSel&&(
        <Modal title={`Historial — ${activoSel.nombre}`} onClose={()=>setModal(null)} wide>
          <div style={{ maxHeight:320, overflowY:"auto" }}>
            {activos_gastos.filter(g=>g.activo_id===activoSel.id).length===0&&<p style={{ color:C.mu, fontSize:12 }}>Sin gastos registrados.</p>}
            {activos_gastos.filter(g=>g.activo_id===activoSel.id).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).map(g=>(
              <div key={g.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:`1px solid ${C.cb}` }}>
                <div><p style={{ fontSize:13, fontWeight:500 }}>{g.concepto}</p><p style={{ fontSize:11, color:C.mu }}>{g.fecha} · {g.tipo}</p></div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <p style={{ fontSize:13, fontWeight:600, color:C.re }}>Bs. {fmt(g.monto)}</p>
                  <button className="btn btn-danger btn-sm" onClick={()=>{setConfirmDelete(g.id);setDeleteType("gasto-act");setModal(null);}}>✕</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, padding:10, background:C.bg, borderRadius:8, display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:12, color:C.mu }}>Total acumulado</span>
            <span style={{ fontSize:13, fontWeight:600, color:C.re }}>Bs. {fmt(activos_gastos.filter(g=>g.activo_id===activoSel.id).reduce((a,g)=>a+Number(g.monto),0))}</span>
          </div>
        </Modal>
      )}

      {/* Modal gasto activo */}
      {modalGasto&&activoSel&&(
        <Modal title={`Registrar gasto — ${activoSel.nombre}`} onClose={()=>setModalGasto(false)}>
          <div className="form-group"><label className="form-label">Concepto *</label><input className="form-input" placeholder="Ej: Mantenimiento mensual" value={fg_act.concepto} onChange={e=>setFgAct(p=>({...p,concepto:e.target.value}))} /></div>
          <div className="g2">
            <div className="form-group"><label className="form-label">Monto (Bs.) *</label><input className="form-input" type="number" value={fg_act.monto} onChange={e=>setFgAct(p=>({...p,monto:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Fecha</label><input className="form-input" type="date" value={fg_act.fecha} onChange={e=>setFgAct(p=>({...p,fecha:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Tipo</label><select className="form-input" value={fg_act.tipo} onChange={e=>setFgAct(p=>({...p,tipo:e.target.value}))}>{TIPOS_GASTO.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setModalGasto(false)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={saveGastoActivo}>Guardar</button>
          </div>
        </Modal>
      )}

      {/* Modal inquilino */}
      {(modal==="nuevo-inq"||modal==="editar-inq")&&(
        <Modal title={modal==="nuevo-inq"?"Nuevo Inquilino":"Editar Inquilino"} onClose={()=>setModal(null)}>
          {[["nombre","Nombre *"],["tienda","Tienda *"],["email","Email"],["telefono","Teléfono"]].map(([k,l])=>(
            <div className="form-group" key={k}><label className="form-label">{l}</label><input className="form-input" value={fi[k]||""} onChange={e=>setFi(p=>({...p,[k]:e.target.value}))} /></div>
          ))}
          <div className="form-group"><label className="form-label">Superficie (m²)</label><input className="form-input" type="number" value={fi.m2||""} onChange={e=>setFi(p=>({...p,m2:e.target.value}))} /></div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setModal(null)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={saveInquilino} disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
          </div>
        </Modal>
      )}

      {/* Modal contrato */}
      {(modal==="nuevo-con"||modal==="editar-con")&&(
        <Modal title={modal==="nuevo-con"?"Nuevo Contrato":"Editar Contrato"} onClose={()=>setModal(null)}>
          <div className="form-group"><label className="form-label">Inquilino *</label>
            <select className="form-input" value={fc.inquilino_id} onChange={e=>setFc(p=>({...p,inquilino_id:e.target.value}))}>
              <option value="">Seleccionar...</option>
              {inquilinos.map(i=><option key={i.id} value={i.id}>{i.nombre} – {i.tienda}</option>)}
            </select>
          </div>
          <div className="g2">
            <div className="form-group"><label className="form-label">Local *</label><input className="form-input" value={fc.local||""} onChange={e=>setFc(p=>({...p,local:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Alquiler (Bs.) *</label><input className="form-input" type="number" value={fc.monto||""} onChange={e=>setFc(p=>({...p,monto:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Depósito (Bs.)</label><input className="form-input" type="number" value={fc.deposito||""} onChange={e=>setFc(p=>({...p,deposito:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-input" value={fc.estado} onChange={e=>setFc(p=>({...p,estado:e.target.value}))}>{["activo","vencido","rescindido"].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Inicio</label><input className="form-input" type="date" value={fc.inicio||""} onChange={e=>setFc(p=>({...p,inicio:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Vencimiento</label><input className="form-input" type="date" value={fc.vencimiento||""} onChange={e=>setFc(p=>({...p,vencimiento:e.target.value}))} /></div>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setModal(null)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={saveContrato} disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
          </div>
        </Modal>
      )}

      {/* Modal activo */}
      {(modal==="nuevo-act"||modal==="editar-act")&&(
        <Modal title={modal==="nuevo-act"?"Nuevo Equipo":"Editar Equipo"} onClose={()=>setModal(null)}>
          <div className="form-group"><label className="form-label">Nombre *</label><input className="form-input" placeholder="Ej: Escalera eléctrica" value={fa.nombre} onChange={e=>setFa(p=>({...p,nombre:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">Descripción</label><input className="form-input" value={fa.descripcion||""} onChange={e=>setFa(p=>({...p,descripcion:e.target.value}))} /></div>
          <div className="g2">
            <div className="form-group"><label className="form-label">Categoría</label><select className="form-input" value={fa.categoria} onChange={e=>setFa(p=>({...p,categoria:e.target.value}))}>{CATS.map(c=><option key={c} value={c}>{c}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-input" value={fa.estado} onChange={e=>setFa(p=>({...p,estado:e.target.value}))}>{["operativo","en mantenimiento","fuera de servicio","reemplazado"].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Valor reposición (Bs.)</label><input className="form-input" type="number" value={fa.valor_reposicion||""} onChange={e=>setFa(p=>({...p,valor_reposicion:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Fecha adquisición</label><input className="form-input" type="date" value={fa.fecha_adquisicion||""} onChange={e=>setFa(p=>({...p,fecha_adquisicion:e.target.value}))} /></div>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setModal(null)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={saveActivo} disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
          </div>
        </Modal>
      )}

      {/* Modal mantenimiento */}
      {(modal==="nuevo-mant"||modal==="editar-mant")&&(
        <Modal title={modal==="nuevo-mant"?"Nuevo Pedido":"Editar Pedido"} onClose={()=>setModal(null)}>
          <div className="form-group"><label className="form-label">Título *</label><input className="form-input" value={fm.titulo} onChange={e=>setFm(p=>({...p,titulo:e.target.value}))} /></div>
          <div className="form-group"><label className="form-label">Descripción</label><input className="form-input" value={fm.descripcion||""} onChange={e=>setFm(p=>({...p,descripcion:e.target.value}))} /></div>
          <div className="g2">
            <div className="form-group"><label className="form-label">Área</label><input className="form-input" value={fm.area||""} onChange={e=>setFm(p=>({...p,area:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Responsable</label><input className="form-input" value={fm.responsable||""} onChange={e=>setFm(p=>({...p,responsable:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Prioridad</label><select className="form-input" value={fm.prioridad} onChange={e=>setFm(p=>({...p,prioridad:e.target.value}))}>{["alta","media","baja"].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Estado</label><select className="form-input" value={fm.estado} onChange={e=>setFm(p=>({...p,estado:e.target.value}))}>{["pendiente","en progreso","resuelto"].map(v=><option key={v} value={v}>{v}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Fecha reporte</label><input className="form-input" type="date" value={fm.fecha_reporte||""} onChange={e=>setFm(p=>({...p,fecha_reporte:e.target.value}))} /></div>
            <div className="form-group"><label className="form-label">Fecha resolución</label><input className="form-input" type="date" value={fm.fecha_resolucion||""} onChange={e=>setFm(p=>({...p,fecha_resolucion:e.target.value}))} /></div>
          </div>
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end" }}>
            <button className="btn btn-secondary btn-sm" onClick={()=>setModal(null)}>Cancelar</button>
            <button className="btn btn-primary btn-sm" onClick={saveMantenimiento} disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── APP PRINCIPAL ─────────────────────────────────────────────────────
const NAV = [
  { id:"analisis",   label:"Análisis",   icon:"◈" },
  { id:"locales",    label:"Locales",    icon:"🏬" },
  { id:"finanzas",   label:"Finanzas",   icon:"💰" },
  { id:"gestion",    label:"Gestión",    icon:"⚙️" },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("analisis");
  const [toast, setToast] = useState(null);
  const [data, setData] = useState({
    inquilinos:[], contratos:[], pagos:[], expensas:[], mantenimiento:[], activos:[], activos_gastos:[]
  });

  const showToast = (message, type="success") => {
    setToast({ message, type });
    setTimeout(()=>setToast(null), 3000);
  };

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{ setSession(session); setLoading(false); });
    supabase.auth.onAuthStateChange((_,s)=>setSession(s));
  },[]);

  const load = async () => {
    const [i,c,p,e,m,a,ag] = await Promise.all([
      supabase.from("inquilinos").select("*").order("created_at"),
      supabase.from("contratos").select("*").order("created_at"),
      supabase.from("pagos").select("*").order("created_at").limit(10000),
      supabase.from("expensas").select("*").order("created_at").limit(10000),
      supabase.from("mantenimiento").select("*").order("created_at"),
      supabase.from("activos").select("*").order("created_at"),
      supabase.from("activos_gastos").select("*").order("fecha"),
    ]);
    setData({
      inquilinos:i.data||[], contratos:c.data||[], pagos:p.data||[],
      expensas:e.data||[], mantenimiento:m.data||[],
      activos:a.data||[], activos_gastos:ag.data||[]
    });
  };

  useEffect(()=>{ if(session) load(); },[session]);

  const changeTab = (id) => setTab(id);

  if(loading) return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:C.bg, color:C.mu, fontSize:13 }}>
      Cargando...
    </div>
  );

  return (
    <>
      <style>{css}</style>
      <Toast toast={toast} onClose={()=>setToast(null)} />
      {!session ? <Login onLogin={load} /> : (
        <div className="app-shell">
          {/* Header móvil */}
          <div className="mobile-header">
            <span style={{ fontSize:14, fontWeight:700, color:C.wh, fontFamily:"'Syne',sans-serif" }}>🏢 Edificio Manager</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>supabase.auth.signOut()} style={{ fontSize:11, padding:"4px 10px" }}>Salir</button>
          </div>

          <div className="app-body">
            {/* Sidebar desktop */}
            <div className="sidebar">
              <div style={{ padding:"8px 6px 20px", borderBottom:`1px solid ${C.cb}`, marginBottom:12 }}>
                <p style={{ fontSize:15, fontWeight:700, color:C.wh, fontFamily:"'Syne',sans-serif", letterSpacing:"-0.3px" }}>Edificio Manager</p>
                <p style={{ fontSize:11, color:C.mu, marginTop:2 }}>Centro Comercial Limax</p>
              </div>
              {NAV.map(n=>(
                <div key={n.id} className={`nav-item ${tab===n.id?"active":""}`} onClick={()=>changeTab(n.id)}>
                  <span style={{ fontSize:14 }}>{n.icon}</span>
                  <span>{n.label}</span>
                </div>
              ))}
              <div style={{ marginTop:"auto", padding:"12px 6px", borderTop:`1px solid ${C.cb}` }}>
                <button className="btn btn-ghost btn-sm" style={{ width:"100%", justifyContent:"center" }} onClick={()=>supabase.auth.signOut()}>Cerrar sesión</button>
              </div>
            </div>

            {/* Contenido */}
            <div className="main-content">
              {tab==="analisis"  && <Analisis pagos={data.pagos} contratos={data.contratos} expensas={data.expensas} inquilinos={data.inquilinos} mantenimiento={data.mantenimiento} />}
              {tab==="locales"   && <Locales inquilinos={data.inquilinos} contratos={data.contratos} pagos={data.pagos} reload={load} showToast={showToast} />}
              {tab==="finanzas"  && <Finanzas pagos={data.pagos} contratos={data.contratos} inquilinos={data.inquilinos} expensas={data.expensas} reload={load} showToast={showToast} />}
              {tab==="gestion"   && <Gestion inquilinos={data.inquilinos} contratos={data.contratos} pagos={data.pagos} activos={data.activos} activos_gastos={data.activos_gastos} mantenimiento={data.mantenimiento} reload={load} showToast={showToast} />}
            </div>
          </div>

          {/* Bottom nav móvil */}
          <div className="bottom-nav">
            {NAV.map(n=>(
              <button key={n.id} className={`bottom-nav-item ${tab===n.id?"active":""}`} onClick={()=>changeTab(n.id)}>
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
