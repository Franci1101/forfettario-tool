const $ = (id) => document.getElementById(id);
const PRO_KEY = "forfettario_pro_license";
const SCENARIOS_KEY = "forfettario_scenarios";

function track(eventName, params = {}) {
  try { if (typeof gtag === "function") gtag("event", eventName, params); } catch (_) {}
}

function isPro(){
  const k = localStorage.getItem(PRO_KEY);
  return !!(k && k.trim().length >= 6);
}

function readInputs(){
  return {
    revenue: toNum($("revenue")?.value, true),
    coeff: Number($("coeff")?.value),
    taxRate: Number($("taxRate")?.value),
    inpsRate: toNum($("inpsRate")?.value, true) / 100,
    safety: Number($("safety")?.value)
  };
}

function setError(msg){
  $("error").textContent = msg || "";
}

function render(res){
  $("outImponibile").textContent = eur(res.imponibile);
  $("outInps").textContent = eur(res.inps);
  $("outTax").textContent = eur(res.tax);
  $("outNetYear").textContent = eur(res.netYear);
  $("outNetMonth").textContent = eur(res.netMonth);
  $("outSetAside").textContent = eur(res.setAsideMonth);
}

function reset(){
  $("revenue").value = "";
  $("coeff").value = "0.78";
  $("taxRate").value = "0.15";
  $("inpsRate").value = "26";
  $("safety").value = "0.10";
  render({ imponibile:NaN, inps:NaN, tax:NaN, netYear:NaN, netMonth:NaN, setAsideMonth:NaN });
  setError("");
  $("scenariosBox").textContent = "";
}

function updateProUI(){
  const pro = isPro();
  const badge = $("proBadge");
  badge.textContent = pro ? "PRO" : "FREE";
  badge.classList.toggle("pro", pro);

  $("btnSaveScenario").disabled = !pro;
  $("btnCompare").disabled = !pro;
  $("btnPdf").disabled = !pro;
}

function saveScenario(currentInputs, currentResult){
  const scenarios = JSON.parse(localStorage.getItem(SCENARIOS_KEY) || "[]");
  if (scenarios.length >= 3) scenarios.shift(); // mantieni max 3
  scenarios.push({
    ts: Date.now(),
    inputs: currentInputs,
    result: currentResult
  });
  localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
  renderScenarios();
}

function renderScenarios(){
  const box = $("scenariosBox");
  const scenarios = JSON.parse(localStorage.getItem(SCENARIOS_KEY) || "[]");
  if (!scenarios.length) {
    box.innerHTML = `<p class="muted">Nessuno scenario salvato.</p>`;
    return;
  }
  box.innerHTML = `
    <div class="card" style="padding:12px; margin-top:10px">
      <b>Scenari salvati</b>
      <ul class="list">
        ${scenarios.map((s,i) => {
          const r = s.result;
          return `<li>#${i+1} — Netto mese: <b>${eur(r.netMonth)}</b>, Accantona: <b>${eur(r.setAsideMonth)}</b></li>`;
        }).join("")}
      </ul>
    </div>
  `;
}

function compareScenarios(){
  const scenarios = JSON.parse(localStorage.getItem(SCENARIOS_KEY) || "[]");
  if (scenarios.length < 2) { setError("Salva almeno 2 scenari per confrontarli."); return; }

  // semplice: apri una finestra con tabella confronto + stampa
  const rows = scenarios.map((s,i) => {
    const inp = s.inputs;
    const r = s.result;
    return `
      <tr>
        <td>${i+1}</td>
        <td>${eur(inp.revenue)}</td>
        <td>${Math.round(inp.coeff*100)}%</td>
        <td>${Math.round(inp.inpsRate*100)}%</td>
        <td>${Math.round(inp.taxRate*100)}%</td>
        <td>${eur(r.netMonth)}</td>
        <td>${eur(r.setAsideMonth)}</td>
      </tr>
    `;
  }).join("");

  const w = window.open("", "_blank");
  w.document.write(`
    <html><head><meta charset="utf-8"><title>Confronto scenari</title>
    <style>
      body{font-family:system-ui; padding:20px}
      table{border-collapse:collapse; width:100%}
      th,td{border:1px solid #ddd; padding:8px; text-align:left}
      th{background:#f6f6f6}
      .muted{color:#666}
    </style></head><body>
      <h1>Confronto scenari (stima)</h1>
      <p class="muted">Valori indicativi. Non consulenza fiscale.</p>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Fatturato</th><th>Coeff</th><th>INPS</th><th>Aliquota</th>
            <th>Netto/mese</th><th>Accantona/mese</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="muted">Suggerimento: salva/ stampa in PDF.</p>
      <script>window.print();</script>
    </body></html>
  `);
  w.document.close();

  track("pro_compare_scenarios", { event_category: "engagement" });
}

function requirePro(actionName = "questa funzione") {
  if (isPro()) return true;

  const box = $("scenariosBox");
  if (box) {
    box.innerHTML = `
      <div class="card" style="padding:12px; margin-top:10px; border:1px solid rgba(59,130,246,.35)">
        <b>Funzione PRO</b>
        <p class="muted" style="margin:6px 0 10px 0">
          Per usare <b>${actionName}</b> devi sbloccare PRO.
        </p>
        <a class="btn primary" href="pro.html" id="ctaGoPro">Vai alla PRO</a>
        <a class="btn" href="unlock.html" style="margin-left:8px">Ho già la chiave</a>
      </div>
    `;
    box.querySelector("#ctaGoPro")?.addEventListener("click", () => {
      track("click_go_pro_from_gate", { event_category: "engagement", action: actionName });
    });
  }

  setError(""); // niente errore rosso
  track("pro_gate_shown", { event_category: "engagement", action: actionName });
  return false;
}

function exportPdf(currentInputs, currentResult){
  const inp = currentInputs;
  const r = currentResult;

  const w = window.open("", "_blank");
  w.document.write(`
    <html><head><meta charset="utf-8"><title>Report Forfettario</title>
    <style>
      body{font-family:system-ui; padding:20px}
      .box{border:1px solid #ddd; border-radius:10px; padding:14px; margin:12px 0}
      .row{display:flex; justify-content:space-between; gap:12px; padding:6px 0}
      .muted{color:#666}
      h1{margin:0 0 6px 0}
    </style></head><body>
      <h1>Report stima Forfettario</h1>
      <p class="muted">Stima indicativa. Non consulenza fiscale.</p>

      <div class="box">
        <h3>Input</h3>
        <div class="row"><span>Fatturato annuo</span><b>${eur(inp.revenue)}</b></div>
        <div class="row"><span>Coeff redditività</span><b>${Math.round(inp.coeff*100)}%</b></div>
        <div class="row"><span>Aliquota</span><b>${Math.round(inp.taxRate*100)}%</b></div>
        <div class="row"><span>INPS</span><b>${Math.round(inp.inpsRate*100)}%</b></div>
        <div class="row"><span>Prudenza</span><b>+${Math.round(inp.safety*100)}%</b></div>
      </div>

      <div class="box">
        <h3>Output</h3>
        <div class="row"><span>Imponibile (stima)</span><b>${eur(r.imponibile)}</b></div>
        <div class="row"><span>INPS (stima)</span><b>${eur(r.inps)}</b></div>
        <div class="row"><span>Imposta (stima)</span><b>${eur(r.tax)}</b></div>
        <div class="row"><span>Netto annuo</span><b>${eur(r.netYear)}</b></div>
        <div class="row"><span>Netto mensile</span><b>${eur(r.netMonth)}</b></div>
        <div class="row"><span>Accantonamento mensile</span><b>${eur(r.setAsideMonth)}</b></div>
      </div>

      <p class="muted">Generato il: ${new Date().toLocaleString("it-IT")}</p>
      <script>window.print();</script>
    </body></html>
  `);
  w.document.close();

  track("pro_export_pdf", { event_category: "engagement" });
}

let lastInputs = null;
let lastResult = null;

document.addEventListener("DOMContentLoaded", () => {
  $("year").textContent = new Date().getFullYear();
  updateProUI();
  renderScenarios();
  reset();

  // toast semplice dopo sblocco
  const p = new URLSearchParams(window.location.search);
  if (p.get("unlocked") === "1") {
    setError("PRO attivata ✅ Ora puoi usare PDF e scenari.");
    // pulisci url
    history.replaceState({}, "", window.location.pathname);
  }

  $("btnCalc").addEventListener("click", () => {
    track("click_calcola", { event_category:"engagement", event_label:"Calcolo forfettario" });

    try {
      setError("");
      const inputs = readInputs();
      const res = computeForfettario({
        revenue: inputs.revenue,
        coeff: inputs.coeff,
        inpsRate: inputs.inpsRate,
        taxRate: inputs.taxRate,
        safety: inputs.safety
      });
      lastInputs = inputs;
      lastResult = res;
      render(res);

      track("calcolo_ok", { event_category:"engagement" });
    } catch (e) {
      setError(e.message || "Errore di calcolo.");
    }
  });

  $("btnReset").addEventListener("click", () => {
    track("click_reset", { event_category:"engagement" });
    reset();
  });

  $("btnSaveScenario").addEventListener("click", () => {
    if (!requirePro("Salva scenario")) return;
    if (!lastInputs || !lastResult) return setError("Prima fai un calcolo.");
    saveScenario(lastInputs, lastResult);
    track("pro_save_scenario", { event_category:"engagement" });
  });

  $("btnCompare").addEventListener("click", () => {
    if (!requirePro("Confronto scenari")) return;
    compareScenarios();
  });

  $("btnPdf").addEventListener("click", () => {
    if (!requirePro("Esporta PDF")) return;
    if (!lastInputs || !lastResult) return setError("Prima fai un calcolo.");
    exportPdf(lastInputs, lastResult);
  });

  $("btnGoPro")?.addEventListener("click", () => {
    track("click_vai_pro", {
        event_category: "engagement",
        event_label: "Vai alla PRO"
    });
  });

  // aggiorna badge pro se l’utente sblocca in un altro tab e torna qui
  window.addEventListener("focus", updateProUI);
});
