"use strict";

const number = new Intl.NumberFormat("de-DE");
const dateFormat = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", dateStyle: "short", timeStyle: "medium" });
const ns = "http://www.w3.org/2000/svg";
let currentReport;
let nextRefresh;

function element(tag, text, className) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function svgElement(tag, attributes, text) {
  const node = document.createElementNS(ns, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  if (text !== undefined) node.textContent = text;
  return node;
}

function label(row) {
  return row.label || dateFormat.format(new Date(`${row.date}T12:00:00Z`));
}

function coverage(row) {
  if (row.future) return "Noch nicht begonnen";
  if (row.pageviews === null) return "Keine Daten";
  return row.complete ? "Erfasst" : "Unvollständig";
}

function value(count) {
  return count === null ? "Keine Daten" : number.format(count);
}

function drawChart(target, rows) {
  const width = Math.max(900, rows.length * 7);
  const height = 300;
  const left = 60, right = 15, top = 25, bottom = 55;
  const plotHeight = height - top - bottom;
  const plotWidth = width - left - right;
  const max = Math.ceil(Math.max(1, ...rows.map(row => row.pageviews || 0)) / 4) * 4;
  const svg = svgElement("svg", { viewBox: `0 0 ${width} ${height}`, role: "img", "aria-label": "Absolute serverseitige Seitenaufrufe; Besucher nicht ermittelbar" });
  svg.append(svgElement("title", {}, "Seitenaufrufe: Tages- oder Stundenwerte beim Überfahren; Tabelle darunter"));
  for (let step = 0; step <= 4; step++) {
    const y = top + plotHeight * (1 - step / 4);
    svg.append(svgElement("line", { x1: left, y1: y, x2: width - right, y2: y, class: "grid" }));
    svg.append(svgElement("text", { x: left - 8, y: y + 4, "text-anchor": "end" }, number.format(Math.ceil(max * step / 4))));
  }
  const spacing = plotWidth / rows.length;
  const labelsEvery = Math.ceil(rows.length / 12);
  rows.forEach((row, index) => {
    const x = left + index * spacing;
    const barHeight = (row.pageviews || 0) / max * plotHeight;
    const title = `${label(row)}: ${value(row.pageviews)} Seitenaufrufe; ${value(row.requests)} protokollierte Requests; Besucher: nicht ermittelbar; ${coverage(row)}`;
    const group = svgElement("g", {});
    // Full-height transparent target keeps zero/unknown days inspectable.
    const hit = svgElement("rect", { x, y: top, width: spacing, height: plotHeight, fill: "transparent", tabindex: "0", "aria-label": title });
    hit.append(svgElement("title", {}, title));
    const bar = svgElement("rect", { x: x + spacing * .15, y: top + plotHeight - barHeight, width: spacing * .7, height: barHeight, class: `bar${row.complete ? "" : " partial"}`, "pointer-events": "none" });
    group.append(bar, hit);
    if (row.pageviews === null) {
      group.append(svgElement("text", { x: x + spacing / 2, y: top + plotHeight - 5, "text-anchor": "middle", "pointer-events": "none" }, "×"));
    }
    svg.append(group);
    if (index % labelsEvery === 0) {
      const shortLabel = row.label ? row.label.slice(0, 5) : row.date.slice(5).split("-").reverse().join(".");
      svg.append(svgElement("text", { x: x + spacing / 2, y: height - bottom + 24, "text-anchor": "middle" }, shortLabel));
    }
  });
  target.replaceChildren(svg);
}

function drawTable(target, rows) {
  target.replaceChildren(...rows.map(row => {
    const tr = element("tr");
    for (const text of [label(row), value(row.pageviews), value(row.requests), "Nicht ermittelbar", coverage(row)]) tr.append(element("td", text));
    return tr;
  }));
}

function drawDays() {
  if (!currentReport) return;
  const rows = currentReport.days.slice(-Number(document.getElementById("period").value));
  drawChart(document.getElementById("daily-chart"), rows);
  drawTable(document.getElementById("daily-table"), [...rows].reverse());
}

function showReport(report) {
  currentReport = report;
  document.getElementById("updated").textContent = `Berichtsstand: ${timeFormat.format(new Date(report.generatedAt))} · Europe/Berlin · Aktualisierung alle ${report.refreshSeconds / 60} Minuten`;
  const cards = [];
  for (const [key, name] of [["today", "heute"], ["yesterday", "gestern"], ["dayBeforeYesterday", "vorgestern"], ["last7Days", "letzte 7 Tage"], ["last30Days", "letzte 30 Tage"]]) {
    const metric = report.metrics[key];
    const card = element("div", undefined, "metric");
    card.append(element("p", `Seitenaufrufe ${name}`), element("strong", value(metric.pageviews)), element("small", metric.complete ? "Erfasst" : "Unvollständige Daten"));
    cards.push(card);
  }
  for (const name of ["heute", "gestern", "vorgestern", "letzte 7 Tage", "letzte 30 Tage"]) {
    const card = element("div", undefined, "metric");
    card.append(element("p", `Besucher ${name}`), element("strong", "Nicht ermittelbar"));
    cards.push(card);
  }
  document.getElementById("metrics").replaceChildren(...cards);
  drawDays();
  drawChart(document.getElementById("hours-chart"), report.hours);
  drawTable(document.getElementById("hours-table"), report.hours);
  const legacy = report.days.reduce((total, row) => total + row.legacyPageviews, 0);
  document.getElementById("quality").textContent = `Datenprüfung: ${number.format(report.rejectedLines)} ungültige Logzeilen nicht gezählt. ${number.format(legacy)} übernommene Seitenaufrufe stammen aus der früheren Konfiguration ohne Bot-/Prefetch-Filter. Vor Beginn der dauerhaften Erfassung sind nur noch vorhandene Logs rekonstruierbar.`;
}

async function refresh() {
  clearTimeout(nextRefresh);
  const failure = document.getElementById("failure");
  try {
    const response = await fetch(`stats.json?t=${Date.now()}`, { cache: "no-store", credentials: "omit" });
    if (!response.ok) throw new Error("Report unavailable");
    const report = await response.json();
    if (report.version !== 1 || report.timezone !== "Europe/Berlin") throw new Error("Unknown format");
    showReport(report);
    const age = Date.now() - new Date(report.generatedAt).getTime();
    failure.hidden = age >= 0 && age <= (2 * report.refreshSeconds + 60) * 1000;
    failure.textContent = "Der Berichtsstand ist veraltet. Bitte den Statistik-Job prüfen; die angezeigten Zahlen bleiben auf diesem Stand.";
  } catch {
    failure.hidden = false;
    failure.textContent = "Aktualisierung fehlgeschlagen. Ein bereits angezeigter Bericht bleibt auf seinem bisherigen Stand.";
  }
  nextRefresh = setTimeout(refresh, 60_000);
}

document.getElementById("period").addEventListener("change", drawDays);
document.addEventListener("visibilitychange", () => { if (!document.hidden) refresh(); });
refresh();
