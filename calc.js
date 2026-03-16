function toNum(v, nullable=false){
  if (v == null) return nullable ? null : 0;
  const t = String(v).trim().replace(",", ".");
  if (!t) return nullable ? null : 0;
  const n = Number(t);
  if (!Number.isFinite(n)) return nullable ? null : 0;
  return n;
}

function eur(n){
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("it-IT", { style:"currency", currency:"EUR" });
}

/**
 * MVP: stima semplificata
 * imponibile = revenue * coeff
 * inps = imponibile * inpsRate
 * tax = (imponibile - inps) * taxRate   (assunzione semplificata per MVP)
 * net = revenue - inps - tax
 * setAside = (inps + tax) * (1 + safety) / 12
 */
function computeForfettario({ revenue, coeff, inpsRate, taxRate, safety }) {
  if (!Number.isFinite(revenue) || revenue <= 0) throw new Error("Inserisci un fatturato valido.");
  if (!Number.isFinite(coeff) || coeff <= 0 || coeff > 1) throw new Error("Coeff. non valido.");
  if (!Number.isFinite(inpsRate) || inpsRate < 0 || inpsRate > 1) throw new Error("INPS non valida.");
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) throw new Error("Aliquota non valida.");
  if (!Number.isFinite(safety) || safety < 0 || safety > 0.5) throw new Error("Modalità prudente non valida.");

  const imponibile = revenue * coeff;
  const inps = imponibile * inpsRate;
  const baseTax = Math.max(0, imponibile - inps);
  const tax = baseTax * taxRate;

  const netYear = revenue - inps - tax;
  const netMonth = netYear / 12;

  const setAsideMonth = ((inps + tax) * (1 + safety)) / 12;

  return { imponibile, inps, tax, netYear, netMonth, setAsideMonth };
}
