import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, Header, Footer, TabStopType, TabStopPosition } from "docx";
import { saveAs } from "file-saver";

const MESES = ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const COLORES = { primario: "F5A623", oscuro: "1C2231", gris: "F2F2F2", texto: "2C2C2C", verde: "27AE60", rojo: "E74C3C", azul: "2980B9" };
const borde = { style: BorderStyle.SINGLE, size: 1, color: "DDDDDD" };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };
const margen = { top: 80, bottom: 80, left: 120, right: 120 };

const txt = (text, opts = {}) => new TextRun({ text: String(text), font: "Arial", size: opts.size || 22, bold: opts.bold || false, color: opts.color || COLORES.texto, ...opts });
const parrafo = (children, align = AlignmentType.LEFT, spacing = {}) => new Paragraph({ alignment: align, spacing: { before: 60, after: 60, ...spacing }, children: Array.isArray(children) ? children : [children] });
const espacio = (n = 1) => Array.from({length: n}, () => new Paragraph({ children: [txt("")] }));
const celda = (contenido, ancho, opts = {}) => new TableCell({ borders: bordes, width: { size: ancho, type: WidthType.DXA }, margins: margen, verticalAlign: VerticalAlign.CENTER, shading: opts.fondo ? { fill: opts.fondo, type: ShadingType.CLEAR } : undefined, children: [new Paragraph({ alignment: opts.align || AlignmentType.LEFT, children: [txt(contenido, { bold: opts.bold, color: opts.color, size: opts.size || 20 })] })] });
const filaTabla = (celdas) => new TableRow({ children: celdas });

const tablaKPI = (kpis) => new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [2340, 2340, 2340, 2340], rows: [filaTabla(kpis.map(k => new TableCell({ borders: bordes, width: { size: 2340, type: WidthType.DXA }, margins: { top: 160, bottom: 160, left: 160, right: 160 }, shading: { fill: COLORES.oscuro, type: ShadingType.CLEAR }, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [txt(k.label, { color: "AAAAAA", size: 16 })] }), new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40 }, children: [txt(k.valor, { color: k.color || COLORES.primario, size: 28, bold: true })] })] })))] });

const tablaFinanciera = (titulo, filas, totales) => { const rows = [filaTabla([celda(titulo, 6240, { bold: true, fondo: COLORES.primario, color: "000000", size: 22 }), celda("Monto (Bs.)", 3120, { bold: true, fondo: COLORES.primario, color: "000000", align: AlignmentType.RIGHT, size: 22 })]), ...filas.map((f, i) => filaTabla([celda(f.concepto, 6240, { fondo: i % 2 === 0 ? "FFFFFF" : COLORES.gris }), celda(`Bs. ${Number(f.monto).toLocaleString()}`, 3120, { align: AlignmentType.RIGHT, fondo: i % 2 === 0 ? "FFFFFF" : COLORES.gris })])), ...totales.map(t => filaTabla([celda(t.label, 6240, { bold: true, fondo: "EEEEEE", size: 22 }), celda(`Bs. ${Number(t.valor).toLocaleString()}`, 3120, { bold: true, align: AlignmentType.RIGHT, fondo: "EEEEEE", color: t.color || COLORES.texto, size: 22 })]))] ; return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [6240, 3120], rows }); };

const tablaCobros = (filas) => { const cols = [2800, 1800, 1560, 1560, 1640]; return new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: cols, rows: [filaTabla([celda("Inquilino / Local", cols[0], { bold: true, fondo: COLORES.oscuro, color: "FFFFFF" }), celda("Tipo", cols[1], { bold: true, fondo: COLORES.oscuro, color: "FFFFFF", align: AlignmentType.CENTER }), celda("Monto", cols[2], { bold: true, fondo: COLORES.oscuro, color: "FFFFFF", align: AlignmentType.RIGHT }), celda("Fecha", cols[3], { bold: true, fondo: COLORES.oscuro, color: "FFFFFF", align: AlignmentType.CENTER }), celda("Estado", cols[4], { bold: true, fondo: COLORES.oscuro, color: "FFFFFF", align: AlignmentType.CENTER })]), ...filas.map((f, i) => { const fondo = i % 2 === 0 ? "FFFFFF" : COLORES.gris; const colorEstado = f.estado === "pagado" ? COLORES.verde : COLORES.rojo; return filaTabla([new TableCell({ borders: bordes, width: { size: cols[0], type: WidthType.DXA }, margins: margen, shading: { fill: fondo, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [txt(f.tienda, { bold: true, size: 20 })] }), new Paragraph({ children: [txt(f.local, { color: "888888", size: 18 })] })] }), celda(f.tipo.charAt(0).toUpperCase() + f.tipo.slice(1), cols[1], { fondo, align: AlignmentType.CENTER }), celda(`Bs. ${Number(f.monto).toLocaleString()}`, cols[2], { fondo, align: AlignmentType.RIGHT }), celda(f.fecha || "—", cols[3], { fondo, align: AlignmentType.CENTER }), celda(f.estado.charAt(0).toUpperCase() + f.estado.slice(1), cols[4], { fondo, align: AlignmentType.CENTER, color: colorEstado, bold: true })]); })]}); };

export const generarReporte = async ({ mes, anio, inquilinos, contratos, pagos, expensas, mantenimiento }) => {
  const nombreMes = MESES[mes];
  const pMes = pagos.filter(p => p.mes === mes && p.anio === anio);
  const eMes = expensas.filter(e => e.mes === mes && e.anio === anio);
  const totalCobrado = pMes.filter(p => p.estado === "pagado").reduce((a, b) => a + Number(b.monto), 0);
  const totalPendiente = pMes.filter(p => p.estado === "pendiente").reduce((a, b) => a + Number(b.monto), 0);
  const totalGastos = eMes.reduce((a, b) => a + Number(b.monto), 0);
  const resultadoNeto = totalCobrado - totalGastos;
  const contratosActivos = contratos.filter(c => c.estado === "activo").length;
  const ocupacion = contratos.length > 0 ? Math.round((contratosActivos / contratos.length) * 100) : 0;
  const mantPend = mantenimiento.filter(m => m.estado === "pendiente").length;
  const filasCobros = pMes.map(p => { const c = contratos.find(x => x.id === p.contrato_id); const inq = inquilinos.find(x => x.id === c?.inquilino_id); return { tienda: inq?.tienda || "—", local: c?.local || "—", tipo: p.tipo, monto: p.monto, fecha: p.fecha || "—", estado: p.estado }; }).sort((a, b) => a.tienda.localeCompare(b.tienda));
  const ingresosDetalle = contratos.filter(c => c.estado === "activo").map(c => { const inq = inquilinos.find(i => i.id === c.inquilino_id); return { concepto: `${inq?.tienda || "—"} — ${c.local}`, monto: c.monto }; });

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } }, paragraphStyles: [{ id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, font: "Arial", color: COLORES.texto }, paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } }, { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, font: "Arial", color: COLORES.texto }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } }] },
    sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, headers: { default: new Header({ children: [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: COLORES.primario } }, spacing: { after: 120 }, children: [txt("EDIFICIO MANAGER", { bold: true, size: 20, color: COLORES.primario }), txt("   ·   Informe Ejecutivo Mensual", { size: 20, color: "888888" })] })] }) }, footers: { default: new Footer({ children: [new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 6, color: COLORES.primario } }, tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }], spacing: { before: 120 }, children: [txt(`${nombreMes} ${anio} — Confidencial`, { size: 18, color: "888888" }), new TextRun({ text: "\tPágina ", font: "Arial", size: 18, color: "888888" }), new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: "888888" })] })] }) },
    children: [
      ...espacio(2),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 80 }, children: [txt("INFORME EJECUTIVO MENSUAL", { bold: true, size: 52, color: COLORES.primario })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 0, after: 40 }, children: [txt(`${nombreMes.toUpperCase()} ${anio}`, { bold: true, size: 36, color: COLORES.texto })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: COLORES.primario } }, spacing: { before: 0, after: 240 }, children: [txt("Gestión de Edificio Comercial", { size: 24, color: "888888" })] }),
      ...espacio(1),
      tablaKPI([{ label: "COBRADO", valor: `Bs. ${totalCobrado.toLocaleString()}`, color: COLORES.verde }, { label: "PENDIENTE", valor: `Bs. ${totalPendiente.toLocaleString()}`, color: COLORES.primario }, { label: "GASTOS", valor: `Bs. ${totalGastos.toLocaleString()}`, color: COLORES.rojo }, { label: "RESULTADO NETO", valor: `Bs. ${resultadoNeto.toLocaleString()}`, color: resultadoNeto >= 0 ? COLORES.verde : COLORES.rojo }]),
      ...espacio(1),
      tablaKPI([{ label: "LOCALES ACTIVOS", valor: `${contratosActivos}`, color: COLORES.azul }, { label: "OCUPACIÓN", valor: `${ocupacion}%`, color: COLORES.azul }, { label: "TOTAL INQUILINOS", valor: `${inquilinos.filter(i => i.activo).length}`, color: COLORES.azul }, { label: "MANT. PENDIENTES", valor: `${mantPend}`, color: mantPend > 0 ? COLORES.rojo : COLORES.verde }]),
      ...espacio(2),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [txt("1. Estado de Resultados", { bold: true, size: 36 })] }),
      tablaFinanciera("INGRESOS", ingresosDetalle, [{ label: "TOTAL INGRESOS ESPERADOS", valor: ingresosDetalle.reduce((a, b) => a + Number(b.monto), 0), color: COLORES.verde }]),
      ...espacio(1),
      tablaFinanciera("GASTOS COMUNES (EXPENSAS)", eMes.map(e => ({ concepto: e.concepto, monto: e.monto })), [{ label: "TOTAL GASTOS", valor: totalGastos, color: COLORES.rojo }]),
      ...espacio(1),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [6240, 3120], rows: [filaTabla([celda("RESULTADO NETO DEL MES", 6240, { bold: true, fondo: resultadoNeto >= 0 ? "E8F8EF" : "FDE8E8", size: 24 }), celda(`Bs. ${resultadoNeto.toLocaleString()}`, 3120, { bold: true, align: AlignmentType.RIGHT, fondo: resultadoNeto >= 0 ? "E8F8EF" : "FDE8E8", color: resultadoNeto >= 0 ? COLORES.verde : COLORES.rojo, size: 24 })])] }),
      ...espacio(2),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [txt("2. Flujo de Caja", { bold: true, size: 36 })] }),
      tablaFinanciera("ENTRADAS DE EFECTIVO", [{ concepto: "Alquileres cobrados", monto: pMes.filter(p => p.estado === "pagado" && p.tipo === "alquiler").reduce((a, b) => a + Number(b.monto), 0) }, { concepto: "Expensas cobradas", monto: pMes.filter(p => p.estado === "pagado" && p.tipo === "expensa").reduce((a, b) => a + Number(b.monto), 0) }, { concepto: "Otros cobros", monto: pMes.filter(p => p.estado === "pagado" && p.tipo === "multa").reduce((a, b) => a + Number(b.monto), 0) }], [{ label: "TOTAL ENTRADAS", valor: totalCobrado, color: COLORES.verde }]),
      ...espacio(1),
      tablaFinanciera("SALIDAS DE EFECTIVO", eMes.map(e => ({ concepto: e.concepto, monto: e.monto })), [{ label: "TOTAL SALIDAS", valor: totalGastos, color: COLORES.rojo }]),
      ...espacio(1),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [6240, 3120], rows: [filaTabla([celda("Saldo pendiente de cobro", 6240, { fondo: "FFF8EC" }), celda(`Bs. ${totalPendiente.toLocaleString()}`, 3120, { align: AlignmentType.RIGHT, fondo: "FFF8EC", color: COLORES.primario })]), filaTabla([celda("FLUJO NETO DE CAJA", 6240, { bold: true, fondo: "E8F8EF", size: 24 }), celda(`Bs. ${resultadoNeto.toLocaleString()}`, 3120, { bold: true, align: AlignmentType.RIGHT, fondo: "E8F8EF", color: resultadoNeto >= 0 ? COLORES.verde : COLORES.rojo, size: 24 })])] }),
      ...espacio(2),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [txt("3. Detalle de Cobros", { bold: true, size: 36 })] }),
      parrafo([txt(`Registro completo de pagos para ${nombreMes} ${anio}`, { color: "888888", size: 20 })]),
      ...espacio(1),
      ...(filasCobros.length > 0 ? [tablaCobros(filasCobros)] : [parrafo([txt("Sin cobros registrados para este período.", { color: "888888" })])]),
      ...espacio(2),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [txt("4. Estado de Contratos", { bold: true, size: 36 })] }),
      new Table({ width: { size: 9360, type: WidthType.DXA }, columnWidths: [2600, 1800, 1600, 1560, 1800], rows: [filaTabla([celda("Inquilino", 2600, { bold: true, fondo: COLORES.oscuro, color: "FFFFFF" }), celda("Local", 1800, { bold: true, fondo: COLORES.oscuro, color: "FFFFFF" }), celda("Alquiler", 1600, { bold: true, fondo: COLORES.oscuro, color: "FFFFFF", align: AlignmentType.RIGHT }), celda("Vencimiento", 1560, { bold: true, fondo: COLORES.oscuro, color: "FFFFFF", align: AlignmentType.CENTER }), celda("Estado", 1800, { bold: true, fondo: COLORES.oscuro, color: "FFFFFF", align: AlignmentType.CENTER })]), ...contratos.map((c, i) => { const inq = inquilinos.find(x => x.id === c.inquilino_id); const dias = Math.round((new Date(c.vencimiento) - new Date()) / (1000 * 60 * 60 * 24)); const fondo = i % 2 === 0 ? "FFFFFF" : COLORES.gris; const colorEstado = c.estado === "activo" ? COLORES.verde : COLORES.rojo; return filaTabla([new TableCell({ borders: bordes, width: { size: 2600, type: WidthType.DXA }, margins: margen, shading: { fill: fondo, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [txt(inq?.nombre || "—", { bold: true, size: 20 })] }), new Paragraph({ children: [txt(inq?.tienda || "—", { color: "888888", size: 18 })] })] }), celda(c.local, 1800, { fondo }), celda(`Bs. ${Number(c.monto).toLocaleString()}`, 1600, { fondo, align: AlignmentType.RIGHT }), celda(c.vencimiento || "—", 1560, { fondo, align: AlignmentType.CENTER, color: dias > 0 && dias < 90 ? COLORES.rojo : COLORES.texto }), celda(c.estado.charAt(0).toUpperCase() + c.estado.slice(1), 1800, { fondo, align: AlignmentType.CENTER, color: colorEstado, bold: true })]); })] }),
      ...espacio(2),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [txt("5. Mantenimiento", { bold: true, size: 36 })] }),
      ...espacio(1),
      tablaKPI([{ label: "PENDIENTES", valor: `${mantenimiento.filter(m => m.estado === "pendiente").length}`, color: COLORES.rojo }, { label: "EN PROGRESO", valor: `${mantenimiento.filter(m => m.estado === "en progreso").length}`, color: COLORES.azul }, { label: "RESUELTOS", valor: `${mantenimiento.filter(m => m.estado === "resuelto").length}`, color: COLORES.verde }, { label: "TOTAL", valor: `${mantenimiento.length}`, color: COLORES.primario }]),
      ...espacio(2),
      new Paragraph({ border: { top: { style: BorderStyle.SINGLE, size: 6, color: COLORES.primario } }, spacing: { before: 240 }, alignment: AlignmentType.CENTER, children: [txt(`Informe generado el ${new Date().toLocaleDateString("es-BO", { year:"numeric", month:"long", day:"numeric" })} — Sistema Edificio Manager`, { color: "AAAAAA", size: 18 })] }),
    ]}]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Informe_Ejecutivo_${nombreMes}_${anio}.docx`);
};
