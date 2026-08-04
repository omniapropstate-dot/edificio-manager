function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function sb(env, path) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`supabase ${path} -> ${res.status}`);
  return res.json();
}

async function resolveEdificio(env, token) {
  const rows = await sb(
    env,
    `edificios?select=id,nombre&dashboard_token=eq.${encodeURIComponent(token)}&limit=1`
  );
  return rows[0] || null;
}

const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
               "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// ─── TIEMPO (Bolivia) ──────────────────────────────────────────────────────
function hoyBolivia() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/La_Paz" });
}

function mesAnioBolivia() {
  const [y, m] = hoyBolivia().split("-");
  return { mes: parseInt(m), anio: parseInt(y) };
}

function rangoDiasMes(mes, anio) {
  const pad = (n) => String(n).padStart(2, "0");
  const ultimoDia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
  return [`${anio}-${pad(mes)}-01`, `${anio}-${pad(mes)}-${pad(ultimoDia)}`];
}

function haceDiasISO(dias) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString();
}

// ─── DEUDA REAL CON ARRASTRE (misma lógica que limax-notificaciones) ────────
// Camina mes a mes desde fecha_inicio del contrato hasta hoy, marcando qué
// meses de alquiler/expensa no tienen un pago "pagado" registrado.
async function calcularDeudaReal(env, eid) {
  const { mes: mesActual, anio: anioActual } = mesAnioBolivia();

  const contratos = await sb(
    env,
    `contratos?select=id,fecha_inicio,monto_alquiler,monto_expensa,unidades(codigo),inquilinos(nombre)&edificio_id=eq.${eid}&estado=eq.activo`
  );
  if (!contratos.length) return [];

  const pagosOk = await sb(
    env,
    `pagos?select=contrato_id,tipo,mes,anio&edificio_id=eq.${eid}&estado=eq.pagado`
  );
  const pagadoSet = new Set(pagosOk.map((p) => `${p.contrato_id}-${p.tipo}-${p.mes}-${p.anio}`));

  const morosos = [];
  for (const c of contratos) {
    const [yInicio, mInicio] = c.fecha_inicio.split("-").map(Number);
    const mesesAlq = [];
    const mesesExp = [];
    let y = yInicio, m = mInicio;
    while (y < anioActual || (y === anioActual && m <= mesActual)) {
      if (Number(c.monto_alquiler) > 0 && !pagadoSet.has(`${c.id}-alquiler-${m}-${y}`)) mesesAlq.push(`${MESES[m]} ${y}`);
      if (Number(c.monto_expensa) > 0 && !pagadoSet.has(`${c.id}-expensa-${m}-${y}`)) mesesExp.push(`${MESES[m]} ${y}`);
      m++; if (m > 12) { m = 1; y++; }
    }
    if (mesesAlq.length || mesesExp.length) {
      morosos.push({
        contrato_id: c.id,
        local: c.unidades?.codigo || "—",
        inquilino: c.inquilinos?.nombre || "—",
        debe_alquiler: mesesAlq.length * Number(c.monto_alquiler),
        debe_expensa: mesesExp.length * Number(c.monto_expensa),
        meses_alquiler: mesesAlq,
        meses_expensa: mesesExp,
      });
    }
  }
  return morosos;
}

async function multasPendientesLista(env, eid) {
  return sb(
    env,
    `multas?select=id,contrato_id,fecha,monto,motivo,contratos(unidades(codigo),inquilinos(nombre))&edificio_id=eq.${eid}&estado=eq.pendiente&order=fecha`
  );
}

// Combina morosos (alquiler/expensa con arrastre) y multas pendientes en una
// fila por local, con el monto desglosado (alquiler, expensa, multas) y total.
async function calcularDeudaTotal(env, eid) {
  const [morosos, multas] = await Promise.all([
    calcularDeudaReal(env, eid),
    multasPendientesLista(env, eid),
  ]);

  const mapa = new Map();
  for (const m of morosos) {
    mapa.set(m.contrato_id, {
      local: m.local, inquilino: m.inquilino,
      debe_alquiler: m.debe_alquiler, debe_expensa: m.debe_expensa,
      meses_alquiler: m.meses_alquiler, meses_expensa: m.meses_expensa,
      debe_multas: 0, motivos_multa: [],
    });
  }
  for (const mu of multas) {
    if (!mapa.has(mu.contrato_id)) {
      mapa.set(mu.contrato_id, {
        local: mu.contratos?.unidades?.codigo || "—",
        inquilino: mu.contratos?.inquilinos?.nombre || "—",
        debe_alquiler: 0, debe_expensa: 0,
        meses_alquiler: [], meses_expensa: [],
        debe_multas: 0, motivos_multa: [],
      });
    }
    const row = mapa.get(mu.contrato_id);
    row.debe_multas += Number(mu.monto);
    row.motivos_multa.push(mu.motivo);
  }

  return [...mapa.values()]
    .map((r) => ({ ...r, total: r.debe_alquiler + r.debe_expensa + r.debe_multas }))
    .sort((a, b) => b.total - a.total);
}

async function documentosPendientes(env, eid) {
  const { mes: mesActual, anio: anioActual } = mesAnioBolivia();
  const data = await sb(
    env,
    `pagos?select=id,tipo,mes,anio,monto,contratos(unidades(codigo),inquilinos(nombre))&edificio_id=eq.${eid}&estado=eq.pagado&numero_documento=is.null&order=anio,mes`
  );
  const vencidos = [];
  const futuros = [];
  for (const p of data) {
    const esFuturo = p.anio > anioActual || (p.anio === anioActual && p.mes > mesActual);
    (esFuturo ? futuros : vencidos).push(p);
  }
  return { vencidos, futuros };
}

// ─── ESTADO DE RESULTADOS del mes seleccionado (ingresos/egresos con %) ─────
async function estadoResultados(env, eid, mes, anio) {
  const [primerDia, ultimoDia] = rangoDiasMes(mes, anio);
  const [pagos, multas, gastos] = await Promise.all([
    sb(env, `pagos?select=tipo,monto&edificio_id=eq.${eid}&estado=eq.pagado&mes=eq.${mes}&anio=eq.${anio}`),
    sb(env, `multas?select=monto&edificio_id=eq.${eid}&estado=eq.pagada&fecha_pago=gte.${primerDia}&fecha_pago=lte.${ultimoDia}`),
    sb(env, `gastos?select=concepto,categoria,monto&edificio_id=eq.${eid}&mes=eq.${mes}&anio=eq.${anio}`),
  ]);

  const ingAlquiler = pagos.filter((p) => p.tipo === "alquiler").reduce((a, p) => a + Number(p.monto), 0);
  const ingExpensa  = pagos.filter((p) => p.tipo === "expensa").reduce((a, p) => a + Number(p.monto), 0);
  const ingMultas   = multas.reduce((a, m) => a + Number(m.monto), 0);
  const totalIngresos = ingAlquiler + ingExpensa + ingMultas;

  const porCategoria = new Map();
  for (const g of gastos) porCategoria.set(g.categoria, (porCategoria.get(g.categoria) || 0) + Number(g.monto));
  const totalEgresos = gastos.reduce((a, g) => a + Number(g.monto), 0);

  const pct = (n, total) => (total > 0 ? Number((n / total * 100).toFixed(1)) : 0);

  const ingresos = [
    { concepto: "Alquiler", monto: ingAlquiler },
    { concepto: "Expensa", monto: ingExpensa },
    { concepto: "Multas", monto: ingMultas },
  ].filter((i) => i.monto > 0).map((i) => ({ ...i, pct: pct(i.monto, totalIngresos) }));

  const egresosPorCategoria = [...porCategoria.entries()]
    .map(([categoria, monto]) => ({ categoria, monto, pct: pct(monto, totalEgresos) }))
    .sort((a, b) => b.monto - a.monto);

  const resultadoNeto = totalIngresos - totalEgresos;
  const margen = pct(resultadoNeto, totalIngresos);

  return { ingresos, totalIngresos, egresosPorCategoria, totalEgresos, resultadoNeto, margen };
}

// ─── ACTIVIDAD RECIENTE (últimos 7 días, feed unificado) ────────────────────
async function actividadReciente(env, eid) {
  const desde = haceDiasISO(7);
  const [pagos, gastos, contratos, inquilinos, mant] = await Promise.all([
    sb(env, `pagos?select=id,tipo,monto,created_at,contratos(unidades(codigo),inquilinos(nombre))&edificio_id=eq.${eid}&created_at=gte.${desde}&order=created_at.desc`),
    sb(env, `gastos?select=id,concepto,categoria,monto,created_at&edificio_id=eq.${eid}&created_at=gte.${desde}&order=created_at.desc`),
    sb(env, `contratos?select=id,created_at,unidades(codigo),inquilinos(nombre)&edificio_id=eq.${eid}&created_at=gte.${desde}&order=created_at.desc`),
    sb(env, `inquilinos?select=id,nombre,empresa,created_at&edificio_id=eq.${eid}&created_at=gte.${desde}&order=created_at.desc`),
    sb(env, `mantenimiento?select=id,titulo,prioridad,estado,created_at&edificio_id=eq.${eid}&created_at=gte.${desde}&order=created_at.desc`),
  ]);

  const eventos = [
    ...pagos.map((p) => ({
      tipo: "pago", created_at: p.created_at,
      local: p.contratos?.unidades?.codigo, inquilino: p.contratos?.inquilinos?.nombre,
      detalle: p.tipo, monto: Number(p.monto),
    })),
    ...gastos.map((g) => ({
      tipo: "gasto", created_at: g.created_at,
      detalle: `${g.concepto} (${g.categoria})`, monto: Number(g.monto),
    })),
    ...contratos.map((c) => ({
      tipo: "contrato", created_at: c.created_at,
      local: c.unidades?.codigo, inquilino: c.inquilinos?.nombre,
    })),
    ...inquilinos.map((i) => ({
      tipo: "inquilino", created_at: i.created_at,
      inquilino: i.nombre, detalle: i.empresa,
    })),
    ...mant.map((m) => ({
      tipo: "mantenimiento", created_at: m.created_at,
      detalle: m.titulo, prioridad: m.prioridad, estado: m.estado,
    })),
  ];

  eventos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return eventos.slice(0, 40);
}

async function mantenimientoPendiente(env, eid) {
  return sb(
    env,
    `mantenimiento?select=id,titulo,area,prioridad,estado,created_at&edificio_id=eq.${eid}&estado=in.(pendiente,en_progreso)&order=prioridad,created_at.desc`
  );
}

// ─── GASTOS FIJOS PENDIENTES (misma lógica que limax-notificaciones) ────────
// Por estado, no por fecha: ¿qué conceptos marcados recordatorio_semanal=true
// todavía no tienen un gasto registrado (vía referencia_id) en el período actual?
async function gastosFijosPendientes(env, eid) {
  const { mes, anio } = mesAnioBolivia();
  const refs = await sb(
    env,
    `gastos_referencia?select=id,concepto,frecuencia&edificio_id=eq.${eid}&activo=eq.true&recordatorio_semanal=eq.true&order=concepto`
  );
  if (!refs.length) return [];

  const checks = await Promise.all(refs.map(async (r) => {
    let mesesAChequear;
    if (r.frecuencia === "trimestral") {
      const inicioTrim = Math.floor((mes - 1) / 3) * 3 + 1;
      mesesAChequear = [inicioTrim, inicioTrim + 1, inicioTrim + 2];
    } else {
      mesesAChequear = [mes];
    }
    const data = await sb(
      env,
      `gastos?select=id&edificio_id=eq.${eid}&referencia_id=eq.${r.id}&anio=eq.${anio}&mes=in.(${mesesAChequear.join(",")})&limit=1`
    );
    return data.length ? null : { concepto: r.concepto, frecuencia: r.frecuencia };
  }));

  return checks.filter(Boolean);
}

// ─── HANDLER ─────────────────────────────────────────────────────────────
async function handleDashboard(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t");
  if (!token) return json({ error: "unauthorized" }, 401);

  let edificio;
  try {
    edificio = await resolveEdificio(env, token);
  } catch {
    return json({ error: "unauthorized" }, 401);
  }
  if (!edificio) return json({ error: "unauthorized" }, 401);

  if (url.searchParams.get("latest") === "1") {
    const rows = await sb(
      env,
      `pagos?select=mes,anio&edificio_id=eq.${edificio.id}&order=anio.desc,mes.desc&limit=1`
    );
    const now = new Date();
    const latest = rows[0] || { mes: now.getMonth() + 1, anio: now.getFullYear() };
    return json({ edificio, latest });
  }

  const mes = Number(url.searchParams.get("mes"));
  const anio = Number(url.searchParams.get("anio"));
  if (!mes || !anio) return json({ error: "mes y anio requeridos" }, 400);

  const mesStr = String(mes).padStart(2, "0");
  const desdeFecha = `${anio}-${mesStr}-01`;
  const anioSig = mes === 12 ? anio + 1 : anio;
  const mesSig = mes === 12 ? 1 : mes + 1;
  const hastaFecha = `${anioSig}-${String(mesSig).padStart(2, "0")}-01`;

  const selPagos =
    "id,tipo,monto,estado,fecha_pago,metodo_pago,numero_documento,tipo_documento,contrato_id,contratos(monto_alquiler,monto_expensa,estado,unidades(codigo),inquilinos(nombre))";
  const selGastos = "id,concepto,categoria,subcategoria,monto,mes,anio,fecha,proveedor,numero_factura,notas";
  const selUnidades = "id,codigo,tipo,estado,contratos(id,estado,monto_alquiler,monto_expensa,inquilinos(nombre))";
  const selContratos = "id,estado,monto_alquiler,monto_expensa,unidades(codigo),inquilinos(nombre)";
  const selMultas = "id,fecha,monto,motivo,estado,contrato_id,contratos(unidades(codigo),inquilinos(nombre))";

  const [
    pagos, gastos, unidades, contratos, multas,
    deudaReal, documentos, resultados, actividad, mantenimiento, gastosFijos,
  ] = await Promise.all([
    sb(env, `pagos?select=${encodeURIComponent(selPagos)}&edificio_id=eq.${edificio.id}&mes=eq.${mes}&anio=eq.${anio}`),
    sb(env, `gastos?select=${encodeURIComponent(selGastos)}&edificio_id=eq.${edificio.id}&mes=eq.${mes}&anio=eq.${anio}`),
    sb(env, `unidades?select=${encodeURIComponent(selUnidades)}&edificio_id=eq.${edificio.id}&estado=neq.inactivo`),
    sb(env, `contratos?select=${encodeURIComponent(selContratos)}&edificio_id=eq.${edificio.id}&estado=eq.activo`),
    sb(env, `multas?select=${encodeURIComponent(selMultas)}&edificio_id=eq.${edificio.id}&fecha=gte.${desdeFecha}&fecha=lt.${hastaFecha}`),
    calcularDeudaTotal(env, edificio.id),
    documentosPendientes(env, edificio.id),
    estadoResultados(env, edificio.id, mes, anio),
    actividadReciente(env, edificio.id),
    mantenimientoPendiente(env, edificio.id),
    gastosFijosPendientes(env, edificio.id),
  ]);

  return json({
    edificio, pagos, gastos, unidades, contratos, multas,
    deudaReal, documentos, resultados, actividad, mantenimiento, gastosFijos,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/dashboard") {
      try {
        return await handleDashboard(request, env);
      } catch (err) {
        return json({ error: "internal" }, 500);
      }
    }

    try {
      const resp = await env.ASSETS.fetch(request);
      if (resp.status === 404) {
        const indexReq = new Request(new URL("/index.html", request.url).href, request);
        return env.ASSETS.fetch(indexReq);
      }
      return resp;
    } catch {
      const indexReq = new Request(new URL("/index.html", request.url).href, request);
      return env.ASSETS.fetch(indexReq);
    }
  },
};
