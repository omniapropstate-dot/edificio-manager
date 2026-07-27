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

  const [pagos, gastos, unidades, contratos, multas] = await Promise.all([
    sb(env, `pagos?select=${encodeURIComponent(selPagos)}&edificio_id=eq.${edificio.id}&mes=eq.${mes}&anio=eq.${anio}`),
    sb(env, `gastos?select=${encodeURIComponent(selGastos)}&edificio_id=eq.${edificio.id}&mes=eq.${mes}&anio=eq.${anio}`),
    sb(env, `unidades?select=${encodeURIComponent(selUnidades)}&edificio_id=eq.${edificio.id}&estado=neq.inactivo`),
    sb(env, `contratos?select=${encodeURIComponent(selContratos)}&edificio_id=eq.${edificio.id}&estado=eq.activo`),
    sb(env, `multas?select=${encodeURIComponent(selMultas)}&edificio_id=eq.${edificio.id}&fecha=gte.${desdeFecha}&fecha=lt.${hastaFecha}`),
  ]);

  return json({ edificio, pagos, gastos, unidades, contratos, multas });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/dashboard") {
      try {
        return await handleDashboard(request, env);
      } catch (err) {
        return json({ error: "internal", marker: "MARCA-UNICA-TEST-9981" }, 500);
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
