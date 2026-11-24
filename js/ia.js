// Conexión con la IA gratuita de Google (Gemini), directamente desde el móvil con tu propia clave.
// La clave se guarda solo en tu móvil.
(function () {
  const URL_API = 'https://generativelanguage.googleapis.com/v1beta/models';
  const MODELOS_RESERVA = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
  const respaldo = new Map();

  class ErrorIA extends Error {}

  async function listarModelos(apiKey) {
    let res;
    try { res = await fetch(`${URL_API}?pageSize=200`, { headers: { 'x-goog-api-key': apiKey } }); }
    catch { throw new ErrorIA('Sin conexión a internet.'); }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw errorDeGoogle(res.status, json.error?.message || `error ${res.status}`, '', json.error);
    return (json.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map((m) => m.name.replace(/^models\//, ''));
  }

  /** El mejor modelo "flash" estable (el de versión más alta). */
  function elegirModelo(nombres, evitar = []) {
    const version = (n) => (n.match(/gemini-(\d+(?:\.\d+)?)/) || [])[1] * 1 || 0;
    const cand = nombres.filter((n) => /^gemini-/.test(n) && !evitar.includes(n) && !/(tts|image|audio|live|embedding|robotics|computer|native)/i.test(n));
    const orden = (l) => l.sort((a, b) => version(b) - version(a) || a.length - b.length);
    const estables = cand.filter((n) => !/(preview|exp|latest)/i.test(n));
    return orden(estables.filter((n) => /-flash$/.test(n)))[0] || orden(estables.filter((n) => /flash/.test(n) && !/lite/.test(n)))[0]
      || orden(estables.filter((n) => /flash/.test(n)))[0] || orden(cand.filter((n) => /flash/.test(n)))[0] || orden(cand)[0] || null;
  }

  function analizarCuota(error = {}) {
    const det = Array.isArray(error.details) ? error.details : [];
    const viol = det.flatMap((d) => (String(d['@type']).includes('QuotaFailure') ? d.violations || [] : []));
    const espera = det.find((d) => String(d['@type']).includes('RetryInfo'))?.retryDelay;
    const texto = `${error.message || ''} ${viol.map((v) => `${v.quotaId || ''} ${v.quotaMetric || ''}`).join(' ')}`;
    return {
      limiteCero: viol.some((v) => String(v.quotaValue) === '0') || /limit:\s*0\b/i.test(texto),
      porDia: /per\s*day|PerDay/i.test(texto),
      porMinuto: /per\s*minute|PerMinute/i.test(texto),
      esperaSeg: espera ? Math.ceil(parseFloat(espera)) : null,
    };
  }

  function errorDeGoogle(status, msg, modelo, error = {}) {
    if (status === 429) {
      const c = analizarCuota(error);
      if (c.limiteCero) return new ErrorIA('🔒 Tu clave no tiene uso gratuito para este modelo. Crea una clave en un PROYECTO NUEVO en aistudio.google.com/apikey.');
      if (c.porDia) return new ErrorIA('📅 Has llegado al límite diario gratuito de la IA. Se reinicia a las 9:00 (hora de España).');
      return new ErrorIA(`⏳ Demasiadas peticiones seguidas. Espera ${c.esperaSeg ? `${c.esperaSeg} segundos` : 'un minuto'} y vuelve a probar.`);
    }
    if ((status === 400 || status === 401 || status === 403) && /api[ _-]?key/i.test(msg)) return new ErrorIA('🔑 La clave de IA no es válida. Cópiala otra vez de aistudio.google.com/apikey y pégala en Más → Ajustes.');
    if (status === 401) return new ErrorIA('🔑 Google no acepta esta clave. Crea una NUEVA en aistudio.google.com/apikey y pégala completa.');
    if (/location is not supported/i.test(msg)) return new ErrorIA('🌍 Google no permite usar su IA gratuita desde tu ubicación actual.');
    if (status === 403) return new ErrorIA(`🔑 Google ha rechazado la clave: ${msg}`);
    if (status === 404) return new ErrorIA(`El modelo "${modelo}" no está disponible. Pulsa "Guardar y probar" en Ajustes.`);
    if (status === 503 || status === 500) return new ErrorIA('🚦 Los servidores de IA de Google están saturados. Vuelve a probar en unos minutos.');
    return new ErrorIA(`La IA ha dado un error (${status}): ${msg}`);
  }
  const modeloNoSirve = (s, msg, err) => s === 404 || (s === 400 && /(not found|not supported|is not available|unsupported model)/i.test(msg)) || (s === 429 && analizarCuota(err).limiteCero);

  /** Llamada a Gemini. Si el modelo no sirve, está saturado o sin cuota, prueba otro. */
  async function llamar({ ajustes, sistema, contents, tools, temperatura = 0.4, json = false }) {
    if (!ajustes.apiKey) throw new ErrorIA('Falta tu clave de IA. Ve a Más → Ajustes y pégala (es gratis).');
    ajustes.modelo ||= MODELOS_RESERVA[0];
    const cuerpo = { contents, generationConfig: { temperature: temperatura } };
    if (json) cuerpo.generationConfig.responseMimeType = 'application/json';
    if (sistema) cuerpo.systemInstruction = { parts: [{ text: sistema }] };
    if (tools) cuerpo.tools = tools;
    const probados = [];
    const reserva = respaldo.get(ajustes.apiKey);
    let modelo = reserva && reserva.hasta > Date.now() ? reserva.modelo : ajustes.modelo;
    for (let intento = 0; intento < 6; intento++) {
      let res;
      try {
        res = await fetch(`${URL_API}/${encodeURIComponent(modelo)}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': ajustes.apiKey }, body: JSON.stringify(cuerpo),
        });
      } catch { throw new ErrorIA('Sin conexión a internet. La IA necesita internet (tu lista y tu despensa sí funcionan sin conexión).'); }
      const r = await res.json().catch(() => ({}));
      if (res.ok) return r;
      const msg = r.error?.message || `error ${res.status}`;
      if (modeloNoSirve(res.status, msg, r.error) && probados.length < 3) {
        probados.push(modelo);
        const otro = elegirModelo((await listarModelos(ajustes.apiKey).catch(() => null)) || MODELOS_RESERVA, probados);
        if (otro) { ajustes.modelo = modelo = otro; guardarAjustesIA(ajustes); continue; }
      }
      if ((res.status === 503 || res.status === 500) && intento === 0) { await new Promise((ok) => setTimeout(ok, 2000)); continue; }
      if ((res.status === 503 || res.status === 500 || res.status === 429) && probados.length < 3) {
        const c = analizarCuota(r.error);
        if (res.status === 429 && c.porMinuto && !c.porDia && (c.esperaSeg ?? 10) <= 20 && intento === 0) { await new Promise((ok) => setTimeout(ok, ((c.esperaSeg ?? 10) + 1) * 1000)); continue; }
        probados.push(modelo);
        const otro = elegirModelo((await listarModelos(ajustes.apiKey).catch(() => null)) || MODELOS_RESERVA, probados);
        if (otro) { respaldo.set(ajustes.apiKey, { modelo: otro, hasta: Date.now() + (c.porDia ? 6 * 3600e3 : 15 * 60e3) }); modelo = otro; continue; }
      }
      throw errorDeGoogle(res.status, msg, modelo, r.error);
    }
    throw new ErrorIA('La IA no responde ahora mismo. Prueba en unos minutos.');
  }

  const textoDe = (resp) => (resp.candidates?.[0]?.content?.parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join('').trim();
  function jsonDe(resp) {
    const t = textoDe(resp);
    try { return JSON.parse(t); } catch {}
    const m = t.match(/[\[{][\s\S]*[\]}]/);
    if (m) { try { return JSON.parse(m[0]); } catch {} }
    throw new ErrorIA('La IA ha respondido algo que no entiendo. Prueba otra vez.');
  }

  /** Conversación con herramientas: la IA pide acciones, la app las hace, y repite hasta responder. */
  async function conversar({ ajustes, sistema, historial, herramientas }) {
    const contents = historial.map((h) => ({ role: h.rol, parts: [{ text: h.texto }] }));
    const decl = herramientas.map((h) => ({ name: h.name, description: h.description, ...(h.parameters ? { parameters: h.parameters } : {}) }));
    for (let paso = 0; paso < 10; paso++) {
      const resp = await llamar({ ajustes, sistema, contents, tools: [{ functionDeclarations: decl }] });
      const contenido = resp.candidates?.[0]?.content;
      const llamadas = (contenido?.parts || []).filter((p) => p.functionCall).map((p) => p.functionCall);
      if (!llamadas.length) return textoDe(resp) || '🤔 No he sabido qué responder. ¿Me lo dices de otra forma?';
      contents.push(contenido);
      const respuestas = [];
      for (const ll of llamadas) {
        const h = herramientas.find((x) => x.name === ll.name);
        let resultado;
        try { resultado = h ? await h.execute(ll.args || {}) : 'Herramienta desconocida'; } catch (e) { resultado = `Error: ${e.message}`; }
        const fr = { name: ll.name, response: { resultado } };
        if (ll.id) fr.id = ll.id;
        respuestas.push({ functionResponse: fr });
      }
      contents.push({ role: 'user', parts: respuestas });
    }
    return '⚠️ Me he liado con tantas operaciones. Revisa tu lista y dime lo que falte.';
  }

  /** Pregunta simple que devuelve JSON (ideas de recetas, leer un ticket…). */
  async function pedirJSON({ ajustes, texto, imagen }) {
    const parts = [];
    if (imagen) parts.push({ inlineData: { mimeType: imagen.mimeType, data: imagen.data } });
    parts.push({ text: texto });
    return jsonDe(await llamar({ ajustes, contents: [{ role: 'user', parts }], json: true, temperatura: 0.3 }));
  }

  async function probarClave(ajustes) {
    if (!ajustes.apiKey) throw new ErrorIA('Pega primero la clave.');
    const disp = await listarModelos(ajustes.apiKey).catch(() => null);
    if (disp?.length && !disp.includes(ajustes.modelo)) ajustes.modelo = elegirModelo(disp) || ajustes.modelo;
    await llamar({ ajustes, contents: [{ role: 'user', parts: [{ text: 'Responde solo: OK' }] }] });
    guardarAjustesIA(ajustes);
    return ajustes.modelo;
  }

  function cargarAjustesIA() { try { return JSON.parse(localStorage.getItem('midespensa.ia') || '{}'); } catch { return {}; } }
  function guardarAjustesIA(a) { try { localStorage.setItem('midespensa.ia', JSON.stringify({ apiKey: a.apiKey || '', modelo: a.modelo || '' })); } catch {} }

  window.IA = { ErrorIA, conversar, pedirJSON, probarClave, cargarAjustesIA, guardarAjustesIA };
})();
