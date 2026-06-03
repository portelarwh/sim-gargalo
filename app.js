const SVG_GEAR = `<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>`;
const SVG_BUFFER = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10l9-5 9 5-9 5-9-5z"></path><path d="M3 10v7l9 5 9-5v-7"></path></svg>`;
const SVG_DONE = `<svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><path d="M20 7l-8.5 8.5L8 12"></path><path d="M4 4h16v16H4z"></path></svg>`;
const SVG_FAIL = `<svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>`;
const SVG_RUNNING = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
const SVG_WAIT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const clamp01 = v => clamp(v, 0, 1);
const safeDiv = (a, b) => b <= 0 ? 0 : a / b;
const EPSILON = 1e-6;

// === Bloco 2: PRNG mulberry32 com seed para reprodutibilidade ===
let _seedState = 0;
let _activeSeed = 0;
function mulberry32(a) {
    return function() {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
let rng = Math.random; // fallback até seedRng ser chamado
function hashSeed(str) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
}
function seedRng(seedRaw) {
    const s = String(seedRaw ?? '').trim();
    if (!s || s === '0') {
        _activeSeed = 0;
        rng = Math.random;
        return;
    }
    const n = /^\d+$/.test(s) ? (parseInt(s, 10) >>> 0) : hashSeed(s);
    _activeSeed = n;
    _seedState = n || 1;
    rng = mulberry32(_seedState);
}

function fmtTime(sec) {
    if (!Number.isFinite(sec)) return "∞";
    if (sec < 0) return "00:00.0";
    let total = Math.round(sec * 10) / 10;
    let h = Math.floor(total / 3600);
    let m = Math.floor((total % 3600) / 60);
    let s = Math.floor(total % 60);
    let dec = Math.floor((total - Math.floor(total)) * 10);
    return h > 0 ? `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${dec}` : `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${dec}`;
}

function fmtMMSSd(sec) {
    if (!Number.isFinite(sec) || sec < 0) return "00:00.0";
    let total = Math.round(sec * 10) / 10;
    return `${String(Math.floor(total/60)).padStart(2,'0')}:${String(Math.floor(total%60)).padStart(2,'0')}.${Math.floor((total - Math.floor(total))*10)}`;
}

function pct(x) { return (clamp01(x) * 100).toFixed(0) + '%'; }

let STATION_COUNT = 3;
let DEFAULT_WIP_MAX = 100;
let TRANSIT_TIME = 0;
let running = false;
let lineStarted = false;
let t = 0;
let finalTime = null;
let isFastForwarding = false;
let makeToGood = false;
let flushLine = false;
let timeScale = 1;

let initialEstimate = 0;
let fixedInitialEstimate = null;

let historyOEE = [];
let historyPPM = [];
// === Bloco 5: Preferências ajustáveis em runtime ===
const PREFS_DEFAULTS = {
    balanceThreshold: 0.5,    // tolerância PPM para considerar linha balanceada
    sparklineHistory: 50,     // pontos guardados em historyOEE/historyPPM
    heatmapMaxSamples: 600,   // limite de transições gravadas por estação
    chartUpdateInterval: 0.5, // segundos entre re-render dos sparklines
    estimateConfidence: false // mostrar P50/P90 quando há MTBF
};
let PREFS = { ...PREFS_DEFAULTS };

let initialWipAtStart = 0;
let targetAtStart = 0;

let buffers = { raw: { count: 0, stock: 100, target: 60, stockInf: false, targetInf: false }, wips: [] };
let stats = { good: 0, scrap: 0, scrapByStation: [] };
const transfers = [];
let S = [];
let bottleneckId = 0;

// === Bloco 1 (Grafo): camada de topologia interna ===
// nodes[]/edges[]/nodeById espelham a cadeia linear atual.
// Nesta fase a engine continua a usar índices; o grafo só reflete o estado.
// Próximos blocos vão consultar o grafo em vez de S[i±1] / buffers.wips[i].
let nodes = [];          // [{ id, type: 'SOURCE'|'STATION'|'BUFFER'|'SINK', x, y, name, ref }]
let edges = [];          // [{ id, from, to, transit }]
let nodeById = new Map();

function rebuildNodeIndex() {
    nodeById.clear();
    for (const n of nodes) nodeById.set(n.id, n);
}
function upstreamOf(nodeId)   { return edges.filter(e => e.to === nodeId); }
function downstreamOf(nodeId) { return edges.filter(e => e.from === nodeId); }

/**
 * Reconstrói nodes[]/edges[] como uma cadeia linear equivalente ao estado
 * (buffers.raw, S[], buffers.wips[]). Idempotente — não modifica os refs;
 * apenas (re)cria o índice de nós/arestas a partir deles.
 *
 * Layout topológico:
 *   SRC ─e0→ STN0 ─e1→ BUF0 ─e2→ STN1 ─e3→ BUF1 ─e4→ ... ─→ STN(n-1) ─→ SINK
 */
function rebuildLinearGraph() {
    nodes = [];
    edges = [];
    const src = { id: 'src', type: 'SOURCE', x: 0, y: 0, name: 'ESTOQUE', ref: buffers.raw };
    nodes.push(src);
    let prevId = 'src';
    for (let i = 0; i < S.length; i++) {
        const stnId = `stn${i}`;
        nodes.push({ id: stnId, type: 'STATION', x: 180 * (i + 1), y: 0, name: S[i].name, ref: S[i] });
        edges.push({ id: `e_${prevId}_${stnId}`, from: prevId, to: stnId, transit: 0 });
        prevId = stnId;
        if (i < S.length - 1) {
            const bufId = `buf${i}`;
            nodes.push({ id: bufId, type: 'BUFFER', x: 180 * (i + 1) + 90, y: 0, name: `ESTEIRA ${i+1}`, ref: buffers.wips[i] });
            edges.push({ id: `e_${stnId}_${bufId}`, from: stnId, to: bufId, transit: TRANSIT_TIME });
            prevId = bufId;
        }
    }
    const sink = { id: 'sink', type: 'SINK', x: 180 * (S.length + 1), y: 0, name: 'FINAL', ref: null };
    nodes.push(sink);
    edges.push({ id: `e_${prevId}_sink`, from: prevId, to: 'sink', transit: 0 });
    rebuildNodeIndex();
}

function openHelp() { document.getElementById('helpModal').style.display = "block"; }
function closeHelp() { document.getElementById('helpModal').style.display = "none"; }
window.onclick = e => {
    if (e.target == document.getElementById('helpModal')) closeHelp();
    if (e.target == document.getElementById('analyticsModal')) closeAnalytics();
    if (e.target == document.getElementById('scenariosModal')) closeScenarios();
    if (e.target == document.getElementById('compareModal')) closeCompare();
    if (e.target == document.getElementById('prefsModal')) closePrefs();
};

// === Bloco 1: Diagnóstico Visual ===
const STATE_COLORS = {
    processing: '#22c55e', setup: '#06b6d4', down: '#ef4444',
    blocked: '#f59e0b', starved: '#eab308', idle: '#94a3b8',
    off: '#475569', finished: '#16a34a'
};
const STATE_LABELS = {
    processing: 'Operando', setup: 'Setup', down: 'Parada',
    blocked: 'Travada', starved: 'Aguardando', idle: 'Ociosa',
    off: 'Desligada', finished: 'Concluída'
};
// HEATMAP_MAX_SAMPLES movido para PREFS.heatmapMaxSamples (Bloco 5)
let stateHistory = []; // [[{t, s}, ...], ...] uma série por estação
let lastSnapshot = -1;
let analyticsOpen = false;
let analyticsTab = 'yamazumi';

function effectiveState(st, i) {
    // Distingue 'idle' de 'starved' para histórico (mesma lógica do stationTick)
    if (st.state === 'idle' && i > 0) {
        const pw = buffers.wips[i-1];
        if (pw && wipTotal(pw) === 0) return 'starved';
    }
    return st.state;
}

function recordStateSnapshot() {
    if (!lineStarted) return;
    if (t - lastSnapshot < PREFS.chartUpdateInterval && lastSnapshot >= 0) return;
    lastSnapshot = t;
    for (let i = 0; i < STATION_COUNT; i++) {
        if (!stateHistory[i]) stateHistory[i] = [];
        const s = effectiveState(S[i], i);
        const series = stateHistory[i];
        const last = series[series.length - 1];
        if (last && last.s === s) continue; // colapsa runs do mesmo estado
        series.push({ t: t, s: s });
        if (series.length > PREFS.heatmapMaxSamples) {
            // amostragem agressiva: descarta metade dos eventos antigos
            const compact = [];
            for (let k = 0; k < series.length; k += 2) compact.push(series[k]);
            stateHistory[i] = compact;
        }
    }
}

function openAnalytics() {
    analyticsOpen = true;
    document.getElementById('analyticsModal').style.display = 'block';
    renderAnalytics();
}
function closeAnalytics() {
    analyticsOpen = false;
    document.getElementById('analyticsModal').style.display = 'none';
}
function switchAnalyticsTab(tab) {
    analyticsTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
    renderAnalytics();
}

function renderAnalytics() {
    if (!analyticsOpen) return;
    renderAnalyticsSummary();
    if (analyticsTab === 'yamazumi') renderYamazumi();
    else if (analyticsTab === 'pareto') renderPareto();
    else if (analyticsTab === 'heatmap') renderHeatmap();
    else if (analyticsTab === 'sankey') renderSankey();
}

function calcTaktTime() {
    // Takt = tempo planeado / demanda (segundos por peça)
    const target = targetAtStart > 0 ? targetAtStart : buffers.raw.target;
    const elapsed = lineStarted ? (finalTime !== null ? finalTime : t) : initialEstimate;
    if (target <= 0 || elapsed <= 0) return 0;
    return elapsed / target;
}

function renderAnalyticsSummary() {
    const el = document.getElementById('analyticsSummary');
    if (!el) return;
    const takt = calcTaktTime();
    const bn = bottleneckId >= 0 && S[bottleneckId] ? S[bottleneckId] : null;
    const bnCT = bn ? 60 / Math.max(0.1, bn.ppmNom * bn.Pset) : 0;
    const oeeBn = bn ? oeeCalcStation(bn).OEE : 0;
    const throughput = t > 0 ? (stats.good / (t / 60)).toFixed(1) : '0';
    el.innerHTML = `
        <div class="a-stat"><div class="a-stat-lbl">Gargalo</div><div class="a-stat-val bn">${bn ? bn.name : '—'}</div></div>
        <div class="a-stat"><div class="a-stat-lbl">Takt Time</div><div class="a-stat-val takt">${takt > 0 ? takt.toFixed(1)+'s' : '—'}</div></div>
        <div class="a-stat"><div class="a-stat-lbl">CT Gargalo</div><div class="a-stat-val">${bn ? bnCT.toFixed(1)+'s' : '—'}</div></div>
        <div class="a-stat"><div class="a-stat-lbl">OEE Gargalo</div><div class="a-stat-val">${pct(oeeBn)}</div></div>
        <div class="a-stat"><div class="a-stat-lbl">Throughput</div><div class="a-stat-val">${throughput} ppm</div></div>
        <div class="a-stat"><div class="a-stat-lbl">Bons / Refugo</div><div class="a-stat-val">${stats.good} / ${stats.scrap}</div></div>
    `;
}

function renderYamazumi() {
    const host = document.getElementById('yamazumiChart');
    if (!host) return;
    if (!lineStarted) { host.innerHTML = `<div class="empty-note">Inicie a simulação para visualizar o Yamazumi.</div>`; return; }

    // Tempo por estado dividido pelo nº de peças processadas → CT médio decomposto
    const cats = [
        { key: 'tRun', color: STATE_COLORS.processing, label: 'Operando' },
        { key: 'tSetup', color: STATE_COLORS.setup, label: 'Setup' },
        { key: 'tDown', color: STATE_COLORS.down, label: 'Parada' },
        { key: 'tBlocked', color: STATE_COLORS.blocked, label: 'Travada' },
        { key: 'tStarved', color: STATE_COLORS.starved, label: 'Aguardando' },
        { key: 'tIdle', color: STATE_COLORS.idle, label: 'Ociosa' },
    ];
    const rows = S.map(st => {
        const n = Math.max(1, st.totalCount);
        const parts = cats.map(c => ({ ...c, v: st[c.key] / n }));
        const total = parts.reduce((a, b) => a + b.v, 0);
        return { name: st.name, parts, total, enabled: st.enabled, id: st.id };
    });
    const maxTotal = Math.max(...rows.map(r => r.total), calcTaktTime() * 1.2, 1);

    const W = 980, padL = 100, padR = 30, padT = 20, padB = 50;
    const barH = 36, gap = 14;
    const H = padT + padB + rows.length * (barH + gap);
    const innerW = W - padL - padR;

    const takt = calcTaktTime();
    const taktX = padL + (takt / maxTotal) * innerW;

    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;

    // Eixo X (segundos)
    const ticks = 5;
    for (let k = 0; k <= ticks; k++) {
        const x = padL + (k / ticks) * innerW;
        const v = (k / ticks) * maxTotal;
        svg += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" stroke="rgba(255,255,255,0.08)" stroke-width="1"/>`;
        svg += `<text x="${x}" y="${H - padB + 14}" fill="#94a3b8" font-size="10" text-anchor="middle">${v.toFixed(1)}s</text>`;
    }

    rows.forEach((r, i) => {
        const y = padT + i * (barH + gap);
        svg += `<text x="${padL - 8}" y="${y + barH/2 + 4}" fill="${r.id === bottleneckId ? '#d946ef' : '#e2e8f0'}" font-size="11" font-weight="700" text-anchor="end">${r.name}${r.id === bottleneckId ? ' ★' : ''}</text>`;
        let cx = padL;
        r.parts.forEach(p => {
            const w = (p.v / maxTotal) * innerW;
            if (w < 0.3) return;
            svg += `<rect x="${cx}" y="${y}" width="${w}" height="${barH}" fill="${p.color}" stroke="rgba(0,0,0,0.2)" stroke-width="0.5">`;
            svg += `<title>${r.name} — ${p.label}: ${p.v.toFixed(2)}s/peça</title></rect>`;
            if (w > 36) svg += `<text x="${cx + w/2}" y="${y + barH/2 + 4}" fill="#0f172a" font-size="10" font-weight="700" text-anchor="middle">${p.v.toFixed(1)}</text>`;
            cx += w;
        });
        svg += `<text x="${cx + 6}" y="${y + barH/2 + 4}" fill="#cbd5e1" font-size="10" font-weight="600">${r.total.toFixed(1)}s</text>`;
    });

    // Linha de Takt
    if (takt > 0 && taktX > padL && taktX < W - padR) {
        svg += `<line x1="${taktX}" y1="${padT - 4}" x2="${taktX}" y2="${H - padB}" stroke="#06b6d4" stroke-width="2" stroke-dasharray="5,3"/>`;
        svg += `<text x="${taktX + 4}" y="${padT + 10}" fill="#06b6d4" font-size="11" font-weight="800">TAKT ${takt.toFixed(1)}s</text>`;
    }

    svg += `</svg>`;
    host.innerHTML = svg;
}

function renderPareto() {
    const host = document.getElementById('paretoChart');
    if (!host) return;
    if (!lineStarted) { host.innerHTML = `<div class="empty-note">Inicie a simulação para visualizar o Pareto de perdas.</div>`; return; }

    // Agrega perdas por categoria, somando todas as estações
    const lossCats = [
        { key: 'tDown', label: 'Parada (Disp.)', color: STATE_COLORS.down },
        { key: 'tSetup', label: 'Setup', color: STATE_COLORS.setup },
        { key: 'tBlocked', label: 'Travada', color: STATE_COLORS.blocked },
        { key: 'tStarved', label: 'Aguardando', color: STATE_COLORS.starved },
        { key: 'tIdle', label: 'Ociosa', color: STATE_COLORS.idle },
    ];
    // Perda de Performance: tempo extra além do ideal durante operação
    const perfLoss = S.reduce((a, s) => a + Math.max(0, s.tRun - s.idealTime), 0);
    // Perda de Qualidade: tempo gasto em peças refugadas (estimado)
    const qualLoss = S.reduce((a, s) => {
        const scrapCount = s.totalCount - s.goodCount;
        return a + scrapCount * idealCT_nom(s);
    }, 0);

    const cats = lossCats.map(c => ({
        label: c.label,
        color: c.color,
        value: S.reduce((a, s) => a + s[c.key], 0),
    }));
    cats.push({ label: 'Performance', color: '#f97316', value: perfLoss });
    cats.push({ label: 'Qualidade', color: '#a855f7', value: qualLoss });

    cats.sort((a, b) => b.value - a.value);
    const total = cats.reduce((a, c) => a + c.value, 0);
    if (total <= EPSILON) { host.innerHTML = `<div class="empty-note">Sem perdas registradas ainda.</div>`; return; }

    const W = 980, padL = 50, padR = 60, padT = 30, padB = 80, H = 380;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const bw = innerW / cats.length * 0.7;
    const gap = innerW / cats.length * 0.3;
    const maxV = Math.max(...cats.map(c => c.value));

    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;

    // Grid horizontal
    for (let k = 0; k <= 5; k++) {
        const y = padT + (k / 5) * innerH;
        const v = maxV * (1 - k/5);
        svg += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="rgba(255,255,255,0.06)"/>`;
        svg += `<text x="${padL - 6}" y="${y + 4}" fill="#94a3b8" font-size="10" text-anchor="end">${fmtMMSSd(v)}</text>`;
    }
    // Eixo cumulativo (direita) 0-100%
    for (let k = 0; k <= 4; k++) {
        const y = padT + (k / 4) * innerH;
        const v = 100 - k * 25;
        svg += `<text x="${W - padR + 6}" y="${y + 4}" fill="#06b6d4" font-size="10">${v}%</text>`;
    }

    // Barras
    let cum = 0;
    const cumPts = [];
    cats.forEach((c, i) => {
        const x = padL + i * (bw + gap) + gap/2;
        const h = (c.value / maxV) * innerH;
        const y = padT + innerH - h;
        svg += `<rect x="${x}" y="${y}" width="${bw}" height="${h}" fill="${c.color}" rx="3">`;
        svg += `<title>${c.label}: ${fmtMMSSd(c.value)} (${(c.value/total*100).toFixed(1)}%)</title></rect>`;
        svg += `<text x="${x + bw/2}" y="${y - 5}" fill="#e2e8f0" font-size="10" font-weight="700" text-anchor="middle">${(c.value/total*100).toFixed(0)}%</text>`;
        // Rótulo eixo X (rodado)
        svg += `<text transform="translate(${x + bw/2},${padT + innerH + 14}) rotate(-25)" fill="#cbd5e1" font-size="10" text-anchor="end">${c.label}</text>`;

        cum += c.value;
        const cumPct = cum / total;
        const px = x + bw/2;
        const py = padT + innerH - cumPct * innerH;
        cumPts.push([px, py]);
    });

    // Linha cumulativa
    const polyPts = cumPts.map(p => `${p[0]},${p[1]}`).join(' ');
    svg += `<polyline points="${polyPts}" fill="none" stroke="#06b6d4" stroke-width="2"/>`;
    cumPts.forEach(p => {
        svg += `<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="#06b6d4" stroke="#0f172a" stroke-width="1.5"/>`;
    });

    // Linha 80%
    const y80 = padT + innerH - 0.8 * innerH;
    svg += `<line x1="${padL}" y1="${y80}" x2="${W - padR}" y2="${y80}" stroke="#ef4444" stroke-width="1" stroke-dasharray="4,3"/>`;
    svg += `<text x="${W - padR}" y="${y80 - 4}" fill="#ef4444" font-size="10" font-weight="700" text-anchor="end">80%</text>`;

    svg += `</svg>`;
    host.innerHTML = svg;
}

function renderHeatmap() {
    const host = document.getElementById('heatmapChart');
    if (!host) return;
    if (!lineStarted || stateHistory.length === 0) {
        host.innerHTML = `<div class="empty-note">Inicie a simulação — a linha do tempo é gravada automaticamente.</div>`;
        return;
    }

    const tMax = finalTime !== null ? finalTime : t;
    if (tMax <= 0) { host.innerHTML = `<div class="empty-note">Aguardando dados...</div>`; return; }

    const W = 980, padL = 100, padR = 30, padT = 20, padB = 40;
    const rowH = 30, gap = 8;
    const H = padT + padB + STATION_COUNT * (rowH + gap);
    const innerW = W - padL - padR;

    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;

    // Eixo X — tempo
    const ticks = 6;
    for (let k = 0; k <= ticks; k++) {
        const x = padL + (k / ticks) * innerW;
        const v = (k / ticks) * tMax;
        svg += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" stroke="rgba(255,255,255,0.06)"/>`;
        svg += `<text x="${x}" y="${H - padB + 14}" fill="#94a3b8" font-size="10" text-anchor="middle">${fmtMMSSd(v)}</text>`;
    }

    for (let i = 0; i < STATION_COUNT; i++) {
        const y = padT + i * (rowH + gap);
        const st = S[i];
        const series = stateHistory[i] || [];
        svg += `<text x="${padL - 8}" y="${y + rowH/2 + 4}" fill="${i === bottleneckId ? '#d946ef' : '#e2e8f0'}" font-size="11" font-weight="700" text-anchor="end">${st.name}${i === bottleneckId ? ' ★' : ''}</text>`;
        // Fundo
        svg += `<rect x="${padL}" y="${y}" width="${innerW}" height="${rowH}" fill="rgba(255,255,255,0.04)" rx="3"/>`;

        // Segmentos
        for (let k = 0; k < series.length; k++) {
            const start = series[k].t;
            const end = k + 1 < series.length ? series[k+1].t : tMax;
            const x1 = padL + (start / tMax) * innerW;
            const x2 = padL + (end / tMax) * innerW;
            const w = Math.max(0.5, x2 - x1);
            const color = STATE_COLORS[series[k].s] || '#475569';
            svg += `<rect x="${x1}" y="${y}" width="${w}" height="${rowH}" fill="${color}">`;
            svg += `<title>${st.name} — ${STATE_LABELS[series[k].s] || series[k].s}: ${fmtMMSSd(start)} → ${fmtMMSSd(end)}</title></rect>`;
        }
    }

    svg += `</svg>`;
    host.innerHTML = svg;
}

// Bloco 6.3: buffer ganha dwell (segundos de quarentena obrigatória) e dwellQueue.
// dwell=0 → comportamento antigo (peça fica disponível imediatamente após o transit).
function makeWip() { return { ready: 0, reserved: 0, max: DEFAULT_WIP_MAX, dwell: 0, dwellQueue: [] }; }

function stationTemplate(i) {
    return {
        id: i, enabled: true, name: `ESTAÇÃO ${i+1}`, ppmNom: 60, Aset: 1, Pset: 1, Qset: 1,
        setupConfig: 0, setupRem: 0, setupDone: false, setupStarted: false,
        state: 'idle', resumeState: 'idle', curIdealCT: 0, curProcTot: 0, remProc: 0, downRem: 0,
        holding: false, holdDestBuf: null, runTime: 0, idealTime: 0, totalCount: 0, goodCount: 0,
        tRun: 0, tDown: 0, tStarved: 0, tBlocked: 0, tIdle: 0, tSetup: 0,
        // Bloco 3: modelação realista
        batchSize: 0,            // peças por lote (0 = sem lotes)
        piecesInBatch: 0,        // contador interno
        batchSetups: 0,          // nº de setups feitos por lote
        mtbfMin: 0,              // minutos médios entre falhas (0 = usa Aset determinístico)
        mttrMin: 5,              // minutos médios de reparo
        nextFailIn: 0,           // segundos até próxima falha (estocástico)
        failuresCount: 0,        // contador de quebras
        learningPieces: 0,       // peças até atingir Pset pleno (0 = sem curva)
        learningStart: 0.6,      // fator inicial (0..1) sobre Pset
        reworkEnabled: false,    // peças refugadas voltam à estação
        reworkQueue: 0,          // contador de peças à espera de rework
        reworkCount: 0           // total de retrabalhos efetuados
    };
}

function idealCT_nom(st) { return 60 / Math.max(0.1, st.ppmNom); }
function ppmReal(st) { return Math.max(0, st.ppmNom * effectivePset(st)); }

// === Bloco 3: helpers de modelação realista ===
function expRand(meanSeconds) {
    // amostragem exponencial com média = meanSeconds, usando rng() seedado
    const u = Math.max(1e-9, rng());
    return -meanSeconds * Math.log(u);
}
function effectivePset(st) {
    // Aplica curva de aprendizagem (Wright-like log) se ativada
    if (!st.learningPieces || st.learningPieces <= 0) return st.Pset;
    const n = st.totalCount;
    const N = st.learningPieces;
    // factor cresce de 0 a 1 (log2(1+n/N), saturado em n=N)
    const factor = Math.min(1, Math.log2(1 + n / N));
    const start = clamp01(st.learningStart || 0.6);
    const eff = st.Pset * (start + (1 - start) * factor);
    return clamp(eff, 0.0001, 1);
}
function scheduleNextFailure(st) {
    if (st.mtbfMin > 0) {
        st.nextFailIn = expRand(st.mtbfMin * 60);
    } else {
        st.nextFailIn = Infinity;
    }
}

function oeeCalcStation(st) {
    const planned = Math.max(0.0001, st.tRun + st.tDown + st.tStarved + st.tBlocked + st.tSetup + st.tIdle);
    const A = clamp01(safeDiv(st.tRun, planned));
    const P = clamp01(safeDiv(st.idealTime, Math.max(0.0001, st.tRun)));
    const Q = clamp01(safeDiv(st.goodCount, Math.max(0.0001, st.totalCount)));
    return st.totalCount === 0 ? { A, P: 1, Q: 1, OEE: A } : { A, P, Q, OEE: A * P * Q };
}

function wipTotal(w) { return w.ready + w.reserved + (w.dwellQueue ? w.dwellQueue.length : 0); }
function wipCanReceive(w) { return wipTotal(w) < w.max; }

// Deposita uma peça num buffer: vai para a fila de cura se dwell>0, senão direto a ready.
function depositToBuffer(buf) {
    if (buf.dwell > EPSILON) buf.dwellQueue.push({ remDwell: buf.dwell });
    else buf.ready++;
}

// Tick por buffer: decrementa dwell de cada peça em cura; ao expirar move para ready.
function bufferTick(buf, dt) {
    if (!buf.dwellQueue || buf.dwellQueue.length === 0) return;
    for (let k = buf.dwellQueue.length - 1; k >= 0; k--) {
        buf.dwellQueue[k].remDwell -= dt;
        if (buf.dwellQueue[k].remDwell <= EPSILON) {
            buf.dwellQueue.splice(k, 1);
            buf.ready++;
        }
    }
}

// === Bloco 6.2: helpers de topologia (engine consulta grafo) ===
function stationNodeId(i) { return `stn${i}`; }
function nodeForStationIdx(i) { return nodeById.get(stationNodeId(i)); }

// Escolhe o melhor destino downstream: maior espaço livre (shortest-queue),
// tie-break determinístico por id ascendente.
function pickDownstream(nodeId) {
    const outs = downstreamOf(nodeId);
    if (outs.length === 0) return null;
    if (outs.length === 1) return nodeById.get(outs[0].to);
    let best = null, bestFree = -Infinity;
    for (const e of outs) {
        const n = nodeById.get(e.to); if (!n) continue;
        const free = (n.type === 'BUFFER') ? (n.ref.max - wipTotal(n.ref)) : Infinity;
        if (free > bestFree || (free === bestFree && best && n.id < best.id)) {
            best = n; bestFree = free;
        }
    }
    return best;
}

function sendToWip(i, dur) {
    const target = pickDownstream(stationNodeId(i));
    if (!target || target.type !== 'BUFFER') return; // SINK é tratado em finishProcessing
    const buf = target.ref;
    if (dur > EPSILON) {
        buf.reserved++;
        transfers.push({ destBuf: buf, rem: dur });
    } else {
        depositToBuffer(buf);
    }
}

function transfersTick(dt) {
    for (let i = transfers.length - 1; i >= 0; i--) {
        transfers[i].rem -= dt;
        if (transfers[i].rem <= EPSILON) {
            const buf = transfers[i].destBuf;
            buf.reserved--;
            depositToBuffer(buf);
            transfers.splice(i, 1);
        }
    }
}

function takeFromInput(i) {
    const ups = upstreamOf(stationNodeId(i));
    for (const e of ups) {
        const src = nodeById.get(e.from);
        if (!src) continue;
        if (src.type === 'SOURCE') {
            // Bloco 7.1: stock ilimitado nunca decrementa
            if (src.ref.stockInf) return true;
            if (src.ref.count > 0) { src.ref.count--; return true; }
        } else if (src.type === 'BUFFER') {
            if (src.ref.ready > 0) { src.ref.ready--; return true; }
        }
    }
    return false;
}

function getInitialWipSum() { 
    let s = 0; 
    for (let i = 0; i < STATION_COUNT - 1; i++) { 
        const el = document.getElementById(`wipInitInput_${i}`); 
        if (el) s += parseInt(el.value) || 0; 
    } 
    return s; 
}

// Função para calcular o saldo atual de WIP (soma de todos os buffers)
function getCurrentWipSum() {
    let s = 0;
    for (let i = 0; i < buffers.wips.length; i++) {
        s += wipTotal(buffers.wips[i]);
    }
    return s;
}

// Função para calcular o total processado na linha (bons + refugos)
function getTotalProcessed() {
    return stats.good + stats.scrap;
}

// BFS reverso pelo grafo: a estação i está "starved" se não há nenhuma peça
// disponível ou em processamento em qualquer nó upstream alcançável.
function isUpstreamDry(i) {
    const startId = i < S.length ? stationNodeId(i) : 'sink';
    const visited = new Set([startId]);
    const queue = [startId];
    while (queue.length) {
        const nodeId = queue.shift();
        for (const e of upstreamOf(nodeId)) {
            const src = nodeById.get(e.from); if (!src) continue;
            if (visited.has(src.id)) continue;
            visited.add(src.id);
            if (src.type === 'SOURCE') {
                if (src.ref.count > 0) return false;
            } else if (src.type === 'BUFFER') {
                if (src.ref.ready > 0 || src.ref.reserved > 0) return false;
            } else if (src.type === 'STATION' && src.ref.enabled) {
                if (src.ref.state === 'processing' || src.ref.state === 'blocked') return false;
                if (src.ref.state === 'down' && src.ref.remProc > EPSILON) return false;
            }
            queue.push(src.id);
        }
    }
    return true;
}

// "Linha vazia" = nenhuma peça em fluxo (estações ativas, buffers, transit, cura).
// NÃO considera o stock raw da SOURCE — esse é tratado pela política em
// checkLineFinished (sistema puxado pela meta vs empurrado pelo estoque).
// Sem isto, configs como "stock=100, meta=60, push" nunca terminavam porque
// o BFS reverso encontrava a SOURCE com 40 peças restantes e bloqueava o fim.
function isLineClear() {
    const visited = new Set(['sink']);
    const queue = ['sink'];
    // Também considera múltiplos SINKs caso existam no futuro
    for (const n of nodes) if (n.type === 'SINK' && !visited.has(n.id)) { visited.add(n.id); queue.push(n.id); }

    // Qualquer peça em transit (entre nós) bloqueia o término
    if (transfers.length > 0) return false;

    while (queue.length) {
        const nodeId = queue.shift();
        for (const e of upstreamOf(nodeId)) {
            const src = nodeById.get(e.from); if (!src) continue;
            if (visited.has(src.id)) continue;
            visited.add(src.id);
            if (src.type === 'SOURCE') continue; // stock NÃO bloqueia término
            if (src.type === 'BUFFER') {
                if (src.ref.ready > 0 || src.ref.reserved > 0) return false;
                if (src.ref.dwellQueue && src.ref.dwellQueue.length > 0) return false;
            } else if (src.type === 'STATION' && src.ref.enabled) {
                if (src.ref.state === 'processing' || src.ref.state === 'blocked') return false;
                if (src.ref.state === 'setup') return false;
                if (src.ref.state === 'down' && src.ref.remProc > EPSILON) return false;
            }
            queue.push(src.id);
        }
    }
    return true;
}

function startNewPiece(i) {
    const st = S[i];
    if (st.Pset <= 0) return false;

    // Bloco 3: consumir do rework queue antes de buscar nova peça
    const isRework = st.reworkEnabled && st.reworkQueue > 0;

    if (i === 0 && !isRework) {
        const target = targetAtStart;
        const targetInf = !Number.isFinite(target);
        const hasStock = !!buffers.raw.stockInf || buffers.raw.count > 0;
        const metReached = !targetInf && stats.good >= target;

        if (flushLine && makeToGood) {
            if (metReached && !hasStock) return false;
            if (!hasStock) return false;
        }
        else if (flushLine && !makeToGood) {
            if (!hasStock) return false;
        }
        else if (!flushLine && makeToGood) {
            if (metReached) return false;
            if (!hasStock) return false;
        }
        else {
            const maxFromStock = targetInf ? Infinity : (target - initialWipAtStart);
            if (st.totalCount >= maxFromStock) return false;
            if (!hasStock) return false;
        }
    }

    if (isRework) {
        st.reworkQueue--;
        st.reworkCount++;
    } else if (!takeFromInput(i)) return false;

    const to = document.getElementById(`stationVisual_${i}`);
    if (isRework) {
        spawnAnimBox(to, to, 'normal', 300); // animação curta de rework
    } else if (i === 0) spawnAnimBox(document.getElementById('stockNode'), to, 'normal', 1000);
    else spawnAnimBox(document.getElementById(`thermoTrack_${i-1}`), to, 'wip_to_station', 600);
    // Bloco 6.4: animação na vista MAPA (paralela à vista linear)
    if (mapOpen && !isRework) {
        const ups = upstreamOf(stationNodeId(i));
        if (ups.length > 0) spawnAnimEdge(ups[0].from, stationNodeId(i), 'normal', i === 0 ? 1000 : 600);
    }

    st.curIdealCT = idealCT_nom(st);
    const P = clamp(effectivePset(st), 0.0001, 1);
    st.curProcTot = st.curIdealCT / P;
    st.remProc = st.curProcTot;

    // Disponibilidade: estocástica se MTBF definido, senão usa o modelo determinístico
    if (st.mtbfMin > 0) {
        st.downRem = 0;
        if (st.nextFailIn === undefined || !Number.isFinite(st.nextFailIn) || st.nextFailIn === 0) {
            scheduleNextFailure(st);
        }
    } else {
        st.downRem = st.Aset <= 0 ? Infinity : st.curProcTot * (1 - clamp(st.Aset, 0.0001, 1)) / clamp(st.Aset, 0.0001, 1);
        st.nextFailIn = Infinity;
    }
    st.state = 'processing';
    return true;
}

function finishProcessing(i) {
    const st = S[i];
    st.totalCount++;
    st.idealTime += st.curIdealCT;
    const isGood = rng() < st.Qset;
    const fromEl = document.getElementById(`stationVisual_${i}`);

    if (!isGood) {
        if (st.reworkEnabled) {
            // Bloco 3: peça volta para retrabalho na mesma estação
            st.reworkQueue++;
            spawnAnimBox(fromEl, fromEl, 'normal', 400);
        } else {
            stats.scrap++;
            stats.scrapByStation[i]++;
            spawnAnimBox(fromEl, null, 'scrap', 600);
        }
    }
    else {
        st.goodCount++;
        // Bloco 3: contador de lote (apenas peças boas avançam o lote)
        if (st.batchSize > 0) st.piecesInBatch++;

        // Bloco 6.2: resolve destino via grafo (não assume última estação por índice)
        const target = pickDownstream(stationNodeId(i));
        if (!target || target.type === 'SINK') {
            stats.good++;
            spawnAnimBox(fromEl, document.getElementById('endNode'), 'finish', 1000);
            if (mapOpen && target) spawnAnimEdge(stationNodeId(i), target.id, 'finish', 1000);
        }
        else {
            const buf = target.ref;
            if (wipCanReceive(buf)) {
                sendToWip(i, TRANSIT_TIME);
                spawnAnimBox(fromEl, document.getElementById(`thermoTrack_${i}`), 'station_to_wip', TRANSIT_TIME * 1000);
                if (mapOpen) spawnAnimEdge(stationNodeId(i), target.id, 'station_to_wip', (TRANSIT_TIME || 0.6) * 1000);
            }
            else {
                st.holding = true; st.holdDestBuf = buf; st.state = 'blocked';
            }
        }
    }

    st.remProc = 0; st.curIdealCT = 0; st.curProcTot = 0;
    if (st.state !== 'blocked') { 
        if (st.downRem > EPSILON && st.enabled) st.state = 'down'; 
        else { st.state = 'idle'; st.downRem = 0; } 
    }
}

function tryReleaseBlocked(i) {
    const st = S[i];
    if (st.state !== 'blocked') return;
    const buf = st.holdDestBuf;
    if (!buf) { st.state = 'idle'; return; }
    if (wipCanReceive(buf)) {
        if (TRANSIT_TIME > EPSILON) { buf.reserved++; transfers.push({ destBuf: buf, rem: TRANSIT_TIME }); }
        else { depositToBuffer(buf); }
        spawnAnimBox(document.getElementById(`stationVisual_${i}`), document.getElementById(`thermoTrack_${i}`), 'station_to_wip', TRANSIT_TIME * 1000);
        st.holding = false; st.holdDestBuf = null;
        if (st.downRem > EPSILON && st.enabled) st.state = 'down';
        else { st.state = 'idle'; st.downRem = 0; }
    }
}

function shouldStartSetup(st, i) {
    if (st.setupConfig <= EPSILON) return false;
    if (st.setupStarted || st.setupDone) return false;
    if (st.totalCount === 0) return false; 
    return isUpstreamDry(i);
}

function checkLineFinished() {
    const target = targetAtStart;
    const stockInf = !!buffers.raw.stockInf;
    const targetInf = !Number.isFinite(target);
    const stockEmpty = !stockInf && buffers.raw.count <= 0;
    const metReached = !targetInf && stats.good >= target;

    if (flushLine && makeToGood) {
        if (metReached) return true;
        if (stockEmpty && isLineClear()) return true;
        return false;
    }

    if (flushLine && !makeToGood) {
        if (!stockEmpty) return false;
        if (isLineClear()) return true;
        return false;
    }

    if (!flushLine && makeToGood) {
        if (metReached) return true;
        if (stockEmpty && isLineClear()) return true;
        return false;
    }

    // !flushLine && !makeToGood
    if (targetInf && stockInf) return false; // nunca termina por si próprio
    const maxFromStock = targetInf ? Infinity : (target - initialWipAtStart);
    const station1Done = (S[0] && S[0].totalCount >= maxFromStock) || stockEmpty;
    if (!station1Done) return false;
    if (isLineClear()) return true;
    return false;
}

function stationTick(i, dt) {
    const st = S[i];
    const isLineDone = finalTime !== null;
    
    if (st.state === 'finished') return;
    
    if (isLineDone && st.state !== 'setup') { 
        if (!st.setupStarted && st.setupConfig > EPSILON && st.totalCount > 0 && !st.setupDone) {
            st.setupStarted = true; st.setupRem = st.setupConfig * 60; st.state = 'setup';
        } else if (st.state !== 'setup') {
            st.state = 'finished'; return;
        }
    }
    
    if (!st.enabled) { 
        if (lineStarted && !isLineDone) st.tDown += dt; 
        if (st.state !== 'off') { st.resumeState = st.state; st.state = 'off'; } 
        return; 
    }
    if (st.state === 'off') st.state = st.resumeState || 'idle';
    
    let rem = dt;
    
    while (rem > EPSILON && st.state !== 'finished') {
        if (st.state === 'setup') {
            const use = Math.min(rem, st.setupRem);
            st.tSetup += use; st.setupRem -= use; rem -= use;
            if (st.setupRem <= EPSILON) {
                st.setupRem = 0;
                if (st.isBatchSetup) {
                    // Setup de troca de lote: volta a operar
                    st.isBatchSetup = false;
                    st.setupStarted = false;
                    st.piecesInBatch = 0;
                    st.batchSetups++;
                    st.state = 'idle';
                } else {
                    st.setupDone = true;
                    st.state = 'finished';
                }
            }
            continue;
        }

        if (st.state === 'blocked') {
            if (lineStarted && !isLineDone) st.tBlocked += rem;
            if (st.downRem > 0) st.downRem -= Math.min(rem, st.downRem);
            rem = 0; tryReleaseBlocked(i); continue;
        }

        if (st.state === 'down') {
            const use = st.downRem < Infinity ? Math.min(rem, st.downRem) : rem;
            if (lineStarted && !isLineDone) st.tDown += use;
            if (st.downRem < Infinity) {
                st.downRem -= use;
                if (st.downRem <= EPSILON) {
                    st.downRem = 0;
                    // Bloco 3: se havia peça em processamento interrompida por falha, retomar
                    if (st.remProc > EPSILON) {
                        st.state = 'processing';
                    } else {
                        st.state = 'idle';
                    }
                    if (st.mtbfMin > 0) scheduleNextFailure(st);
                }
            }
            rem -= use; continue;
        }

        if (st.state === 'processing') {
            // Bloco 3: MTBF estocástico — se chegar a falha antes de terminar a peça
            if (st.mtbfMin > 0 && Number.isFinite(st.nextFailIn) && st.nextFailIn <= rem && st.nextFailIn < st.remProc) {
                const use = st.nextFailIn;
                if (lineStarted && !isLineDone) st.tRun += use;
                st.runTime += use; st.remProc -= use; rem -= use; st.nextFailIn = 0;
                // Inicia parada (peça em processamento fica suspensa em remProc)
                st.downRem = expRand(st.mttrMin * 60);
                st.failuresCount++;
                st.state = 'down';
                continue;
            }
            const use = Math.min(rem, st.remProc);
            if (lineStarted && !isLineDone) st.tRun += use;
            st.runTime += use; st.remProc -= use; rem -= use;
            if (st.mtbfMin > 0 && Number.isFinite(st.nextFailIn)) st.nextFailIn -= use;
            if (st.remProc <= EPSILON) finishProcessing(i);
            continue;
        }

        if (st.state === 'idle') {
            // Bloco 3: setup forçado por mudança de lote
            if (lineStarted && st.batchSize > 0 && st.piecesInBatch >= st.batchSize && st.setupConfig > EPSILON) {
                st.isBatchSetup = true;
                st.setupRem = st.setupConfig * 60;
                st.state = 'setup';
                continue;
            }
            if (lineStarted && shouldStartSetup(st, i)) {
                st.setupStarted = true; st.setupRem = st.setupConfig * 60; st.state = 'setup'; continue;
            }

            if (lineStarted && (st.Aset <= EPSILON || st.Pset <= EPSILON)) {
                if (!isLineDone) st.tDown += rem; rem = 0; continue;
            }

            if (startNewPiece(i)) continue;

            if (lineStarted && !isLineDone) {
                if (i === 0) st.tIdle += rem;
                else {
                    const pw = buffers.wips[i-1];
                    if (wipTotal(pw) === 0) st.tStarved += rem; else st.tIdle += rem;
                }
            }
            rem = 0;
        }
    }
}

function updateBottlenecks() {
    const active = S.filter(s => s.enabled); 
    if (active.length === 0) return;
    const effs = active.map(s => s.ppmNom * s.Aset * s.Pset);
    const minEff = Math.min(...effs);
    const isBalanced = Math.max(...effs) - minEff < PREFS.balanceThreshold;
    let bId = -1;
    
    if (isBalanced) { 
        bId = active[active.length - 1].id; 
        S.forEach(s => document.getElementById(`st${s.id}`)?.classList.remove('is-bottleneck')); 
    }
    else { 
        for (const st of S) { 
            const el = document.getElementById(`st${st.id}`); 
            if (!el) continue; 
            if (!st.enabled) { el.classList.remove('is-bottleneck'); continue; } 
            const eff = st.ppmNom * st.Aset * st.Pset; 
            if (Math.abs(eff - minEff) < 0.001) { 
                el.classList.add('is-bottleneck'); 
                if (bId === -1) bId = st.id; 
            } else el.classList.remove('is-bottleneck'); 
        } 
    }
    if (bId === -1 && active.length > 0) bId = active[0].id; 
    bottleneckId = bId;
}

function drawSparkline(data, color, elId, forceScale = false) {
    const el = document.getElementById(elId); 
    if (!el || data.length < 2) return;
    
    let poly = el.querySelector('polyline');
    if (!poly) {
        poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
        poly.setAttribute("class", "chart-line");
        poly.setAttribute("stroke", color);
        poly.setAttribute("fill", "none");
        poly.setAttribute("stroke-width", "1.5");
        el.appendChild(poly);
    }

    const w = el.parentElement.clientWidth;
    const h = el.parentElement.clientHeight;
    let max = Math.max(...data), min = Math.min(...data);
    if (forceScale) { min = 0; max = 1; } else if (max === min) { max += 10; min = 0; }
    
    const range = (max - min) || 1;
    const pts = data.map((d, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((d - min) / range) * h;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    
    poly.setAttribute("points", pts);
}

function calculateCurrentEstimate() {
    let latency = 0, maxCT = 0, count = 0, totalSetup = 0;
    for (let s of S) {
        if (!s.enabled) continue;
        // Bloco 3: aplicar A efetivo se MTBF estiver definido
        const effA = s.mtbfMin > 0 ? s.mtbfMin / (s.mtbfMin + s.mttrMin) : s.Aset;
        const effPPM = Math.max(0.1, s.ppmNom * effA * s.Pset);
        const ct = 60 / effPPM;
        latency += ct;
        if (ct > maxCT) maxCT = ct;
        totalSetup += s.setupConfig * 60;
        count++;
    }
    if (count > 1) latency += (count - 1) * TRANSIT_TIME;
    if (!Number.isFinite(buffers.raw.target)) return Infinity;
    return latency + Math.max(0, buffers.raw.target - 1) * maxCT + totalSetup;
}

// Bloco 5: estimativa com intervalo de confiança (P50/P90) quando há variabilidade
function calculateEstimateBand() {
    const base = calculateCurrentEstimate();
    const hasStochastic = S.some(s => s.enabled && s.mtbfMin > 0);
    if (!hasStochastic || !PREFS.estimateConfidence) return { p50: base, p90: base, hasBand: false };
    // Aproximação: variância adicional do gargalo proporcional ao número esperado de falhas
    let bn = bottleneckId >= 0 ? S[bottleneckId] : null;
    if (!bn || bn.mtbfMin <= 0) return { p50: base, p90: base, hasBand: false };
    const expectedFailures = base / (bn.mtbfMin * 60);
    // Σ de MTTRs exponenciais: variância = N * MTTR² → desvio = MTTR * sqrt(N)
    const sigma = bn.mttrMin * 60 * Math.sqrt(Math.max(1, expectedFailures));
    return {
        p50: base,
        p90: base + 1.282 * sigma, // z-score 1.282 para P90 numa normal
        hasBand: true
    };
}

function calculateInitialMeta() {
    initialEstimate = calculateCurrentEstimate();
}

function updateCharts() {
    let oee = bottleneckId >= 0 && S[bottleneckId] ? oeeCalcStation(S[bottleneckId]).OEE : 0;
    historyOEE.push(oee); 
    while (historyOEE.length > PREFS.sparklineHistory) historyOEE.shift();
    drawSparkline(historyOEE, '#3b82f6', 'chartOEE', true);
    document.getElementById('val_oee_now').textContent = pct(oee);
    
    let ppm = bottleneckId >= 0 && S[bottleneckId]?.state === 'processing' ? ppmReal(S[bottleneckId]) : 0;
    historyPPM.push(ppm); 
    while (historyPPM.length > PREFS.sparklineHistory) historyPPM.shift();
    drawSparkline(historyPPM, '#22c55e', 'chartPPM', false);
    document.getElementById('val_ppm_now').textContent = Math.round(ppm);
    document.getElementById('val_ppm_avg').textContent = t > 0 ? (stats.good / (t / 60)).toFixed(1) : '0';
}

function buildDOM() {
    const board = document.getElementById('board');
    board.querySelectorAll('.nodeBox, .station, .wipCol').forEach(c => c.remove());
    
    const stock = document.createElement('div'); 
    stock.className = 'nodeBox'; stock.id = 'stockNode';
    stock.innerHTML = `
        <div class="iconArea">${SVG_BUFFER}</div>
        <div class="label">ESTOQUE (MP)</div>
        <div class="lot-input-group">
            <label>DISPONÍVEL</label>
            <div class="inf-wrap">
                <input id="stockInput" type="number" min="1" max="999999" value="${buffers.raw.stock}" onchange="updateStockFromCard(this.value)">
                <button id="stockInfBtn" type="button" class="inf-btn" onclick="toggleStockInf()" title="Estoque ilimitado">∞</button>
            </div>
        </div>
        <div class="stock-available-label" style="margin-top:15px">RESTANTE</div>
        <div id="badgeLot">0</div>
    `;
    board.appendChild(stock);
    
    for (let i = 0; i < STATION_COUNT; i++) {
        const isLast = i === STATION_COUNT - 1, st = S[i];
        const stEl = document.createElement('div'); 
        stEl.className = 'station'; stEl.id = `st${i}`;
        stEl.innerHTML = `<div class="stationHead"><div class="stationTitle"><span class="dot"></span><input class="station-name-input" type="text" value="${st.name}" onchange="S[${i}].name=this.value"></div><div class="bottleneck-badge">GARGALO</div><div class="toggle on" id="toggle_${i}"></div><button class="station-delete" title="Apagar estação" onclick="deleteStationByIdx(${i})">🗑</button></div><div class="visual" id="stationVisual_${i}"><div class="machineIcon" id="icon_${i}">${SVG_GEAR}</div><div class="statusPill gray" id="status_${i}">PRONTA</div></div><div class="kpiRow"><div class="kbox"><div class="klabel">OEE</div><div class="kval" id="oee_${i}">0%</div></div><div class="kbox"><div class="klabel">A%</div><div class="kval small" id="A_${i}">100</div></div><div class="kbox"><div class="klabel">P%</div><div class="kval small" id="P_${i}">100</div></div><div class="kbox"><div class="klabel">Q%</div><div class="kval small" id="Q_${i}">100</div></div></div><div class="info-header"><div>PPM NOM: <b id="ppmNomShow_${i}">${st.ppmNom}</b></div><div>PPM REAL: <b id="ppmRealShow_${i}" class="blue">${Math.round(ppmReal(st))}</b></div></div><div class="info-cards"><div class="card-stat green"><span>BONS</span><b id="good_${i}">0</b></div><div class="card-stat red"><span>REFUGO</span><b id="refugo_${i}">0</b></div></div><div class="sliders"><div class="srow nom"><div class="name">PPM</div><input id="ppmR_${i}" type="range" min="1" max="9999" value="${st.ppmNom}"><input id="ppmN_${i}" type="number" min="1" max="9999" value="${st.ppmNom}"></div><div class="srow a"><div class="name">DISP</div><input id="aR_${i}" type="range" min="0" max="100" value="${st.Aset*100}"><input id="aN_${i}" type="number" min="0" max="100" value="${st.Aset*100}"></div><div class="srow p"><div class="name">PERF</div><input id="pR_${i}" type="range" min="0" max="100" value="${st.Pset*100}"><input id="pN_${i}" type="number" min="0" max="100" value="${st.Pset*100}"></div><div class="srow q"><div class="name">QUAL</div><input id="qR_${i}" type="range" min="0" max="100" value="${st.Qset*100}"><input id="qN_${i}" type="number" min="0" max="100" value="${st.Qset*100}"></div><div class="srow setup-row"><div class="name">SETUP</div><input id="setupInp_${i}" type="number" step="0.1" min="0" value="${st.setupConfig}"><span style="font-size:9px;font-weight:800;color:#64748b;">min</span></div></div><div class="times"><div class="trow"><span class="tname op">OPERANDO</span><span id="tRun_${i}">00:00.0</span></div><div class="trow"><span class="tname setup">SETUP</span><span id="tSetup_${i}">00:00.0</span></div><div class="trow"><span class="tname down">PARADA</span><span id="tDown_${i}">00:00.0</span></div><div class="trow" style="${i===0?'display:none':''}"><span class="tname wait">AGUARDANDO</span><span id="tWait_${i}">00:00.0</span></div><div class="trow" style="${isLast?'display:none':''}"><span class="tname block">TRAVADA</span><span id="tBlock_${i}">00:00.0</span></div><div class="trow"><span class="tname idle">OCIOSIDADE</span><span id="tIdle_${i}">00:00.0</span></div></div><div class="adv-toggle" onclick="document.getElementById('adv_${i}').classList.toggle('open')">⚙ Avançado ▾</div><div class="adv-panel" id="adv_${i}"><div class="adv-row"><span class="nm">Lote</span><input id="batchInp_${i}" type="number" min="0" max="9999" value="${st.batchSize}"><span class="un">pç</span></div><div class="adv-row"><span class="nm">MTBF</span><input id="mtbfInp_${i}" type="number" min="0" max="9999" step="0.5" value="${st.mtbfMin}"><span class="un">min</span></div><div class="adv-row"><span class="nm">MTTR</span><input id="mttrInp_${i}" type="number" min="0" max="9999" step="0.5" value="${st.mttrMin}"><span class="un">min</span></div><div class="adv-row"><span class="nm">Aprendiz.</span><input id="learnInp_${i}" type="number" min="0" max="9999" value="${st.learningPieces}"><span class="un">pç</span></div><div class="adv-row"><span class="nm">P inicial</span><input id="learnStartInp_${i}" type="number" min="0" max="100" step="5" value="${Math.round(st.learningStart*100)}"><span class="un">%</span></div><div class="adv-row chk"><span class="nm">Rework loop</span><input id="reworkChk_${i}" type="checkbox" ${st.reworkEnabled?'checked':''}></div><div class="adv-counters"><span>Falhas: <b id="advFails_${i}">0</b></span><span>Setups: <b id="advSetups_${i}">0</b></span><span>Rework: <b id="advRework_${i}">0</b></span></div></div>`;
        board.appendChild(stEl); setupStationBinds(i);
        document.getElementById(`toggle_${i}`).classList.toggle('on', st.enabled);
        
        if (!isLast) {
            const wipEl = document.createElement('div'); wipEl.className = 'wipCol'; wipEl.id = `wipBox_${i}`;
            wipEl.innerHTML = `<div class="wipCard" id="wipCard_${i}"><div class="wipHead"><span class="wipIcon">${SVG_BUFFER}</span><span class="wipTitle">WIP ${i+1}</span></div><div class="wipMid"><div class="thermoTrack" id="thermoTrack_${i}"><div class="thermoFill" id="wipFill_${i}"></div></div><div class="pctBig" id="wipPct_${i}">0<span>%</span></div><div class="wipBlocked" id="wipBlocked_${i}">TRAVADO</div></div><div class="wipFoot"><div class="wipMini"><span class="lbl">Disp.</span><span class="val" id="wipDisp_${i}">0</span></div><div class="wipMini"><span class="lbl">Trans.</span><span class="val" id="wipTrans_${i}">0</span></div><div class="wipMini" title="Peças em cura (dwell)"><span class="lbl">Cura</span><span class="val" id="wipCuring_${i}">0</span></div><div class="wipMini" title="Tempo de cura obrigatório por peça (s)"><span class="lbl">Dwell</span><div class="wipInputGroup"><input id="wipDwellInput_${i}" type="number" min="0" max="9999" step="1" value="${buffers.wips[i]?.dwell||0}" style="width:38px;"><span class="slash">s</span></div></div><div class="wipMini"><span class="lbl">Início</span><div class="wipInputGroup"><input id="wipInitInput_${i}" type="number" min="0" value="${buffers.wips[i]?.ready||0}"></div></div><div class="wipMini"><span class="lbl">Nível</span><div class="wipInputGroup"><span id="wipCurLabel_${i}">0</span><span class="slash">/</span><input id="wipMaxInput_${i}" type="number" min="1" max="9999" value="${buffers.wips[i]?.max||100}"></div></div></div></div>`;
            board.appendChild(wipEl); setupWipBinds(i);
        }
    }
    
    const end = document.createElement('div'); 
    end.className = 'nodeBox'; end.id = 'endNode'; end.style.border = '2px solid #22c55e';
    end.innerHTML = `
        <div class="iconArea" id="endIconArea" style="background:#ecfdf5;border-color:#22c55e;color:#16a34a">${SVG_DONE}</div>
        <div class="label" id="endLabel" style="color:#15803d">CONCLUÍDO</div>
        <div class="lot-input-group">
            <label style="color:#15803d">META DE PROD.</label>
            <div class="inf-wrap">
                <input id="targetInput" type="number" min="1" max="999999" value="${buffers.raw.target}" onchange="updateTargetFromCard(this.value)" style="border-color:#86efac; color:#14532d">
                <button id="targetInfBtn" type="button" class="inf-btn" onclick="toggleTargetInf()" title="Sem meta — corre indefinidamente">∞</button>
            </div>
        </div>
        <div class="checkbox-group">
            <div class="checkbox-lbl" style="color:#15803d">REPOR PERDAS</div>
            <label class="switch">
                <input type="checkbox" id="checkMakeGood" ${makeToGood?'checked':''}>
                <span class="slider green-mode"></span>
            </label>
            <style>#endNode input:checked + .slider { background-color: #22c55e; }</style>
        </div>
        <div class="final-val" id="finalGoodCount">0</div>
        <div class="extra-stats">
            <div class="extra-stat-item">
                <span class="extra-stat-label">TOTAL PROCESSADO</span>
                <span class="extra-stat-value" id="totalProcessedCount">0</span>
            </div>
            <div class="extra-stat-item">
                <span class="extra-stat-label">SALDO WIP (INI/FIM)</span>
                <span class="extra-stat-value wip-balance" id="wipBalanceDisplay">0 / 0</span>
            </div>
        </div>
    `;
    board.appendChild(end); 
    document.getElementById('checkMakeGood').onchange = e => { makeToGood = e.target.checked; render(); };
    updateBottlenecks();
}

function toggleStockInf() {
    buffers.raw.stockInf = !buffers.raw.stockInf;
    if (buffers.raw.stockInf) { buffers.raw.count = Infinity; }
    else if (!running) { buffers.raw.count = buffers.raw.stock; }
    refreshStockTargetUI();
    calculateInitialMeta(); render();
}
function toggleTargetInf() {
    buffers.raw.targetInf = !buffers.raw.targetInf;
    refreshStockTargetUI();
    calculateInitialMeta(); render();
}
function refreshStockTargetUI() {
    const sInp = document.getElementById('stockInput');
    const tInp = document.getElementById('targetInput');
    const sBtn = document.getElementById('stockInfBtn');
    const tBtn = document.getElementById('targetInfBtn');
    if (sInp) { sInp.disabled = !!buffers.raw.stockInf; sInp.value = buffers.raw.stockInf ? '∞' : buffers.raw.stock; sInp.type = buffers.raw.stockInf ? 'text' : 'number'; }
    if (tInp) { tInp.disabled = !!buffers.raw.targetInf; tInp.value = buffers.raw.targetInf ? '∞' : buffers.raw.target; tInp.type = buffers.raw.targetInf ? 'text' : 'number'; }
    if (sBtn) sBtn.classList.toggle('on', !!buffers.raw.stockInf);
    if (tBtn) tBtn.classList.toggle('on', !!buffers.raw.targetInf);
}
function updateStockFromCard(val) {
    if (buffers.raw.stockInf) return;
    const v = Math.max(1, parseInt(val) || 1); buffers.raw.stock = v;
    if (!running) buffers.raw.count = v; calculateInitialMeta(); render(); 
}

function updateTargetFromCard(val) {
    if (buffers.raw.targetInf) return;
    const v = Math.max(1, parseInt(val) || 1); buffers.raw.target = v; calculateInitialMeta(); render();
}

function bindDual(rId, nId, cb) {
    const r = document.getElementById(rId), n = document.getElementById(nId); if (!r || !n) return;
    const sync = v => { 
        const i = parseInt(rId.split('_')[1]);
        const st = S[i];
        if (st && st.state === 'processing' && st.ppmNom > 0 && rId.startsWith('ppm')) {
             const oldTotal = st.curProcTot;
             cb(Number(v));
             const newIdeal = 60 / Math.max(0.1, st.ppmNom);
             const P = clamp(st.Pset, 0.0001, 1);
             const newTotal = newIdeal / P;
             const ratio = st.remProc / oldTotal;
             st.remProc = newTotal * ratio;
             st.curProcTot = newTotal;
        } else {
             cb(Number(v));
        }
        r.value = v; n.value = v; 
        updateBottlenecks(); calculateInitialMeta(); render(); 
    };
    r.oninput = () => sync(r.value); n.oninput = () => sync(n.value);
}

function setupStationBinds(i) {
    const st = S[i];
    document.getElementById(`toggle_${i}`).onclick = function() { st.enabled = !st.enabled; this.classList.toggle('on', st.enabled); updateBottlenecks(); calculateInitialMeta(); };
    bindDual(`ppmR_${i}`, `ppmN_${i}`, v => st.ppmNom = Math.max(1, v));
    bindDual(`aR_${i}`, `aN_${i}`, v => st.Aset = clamp01(v / 100));
    bindDual(`pR_${i}`, `pN_${i}`, v => st.Pset = clamp01(v / 100));
    bindDual(`qR_${i}`, `qN_${i}`, v => st.Qset = clamp01(v / 100));
    const setupInp = document.getElementById(`setupInp_${i}`);
    if (setupInp) setupInp.oninput = e => { st.setupConfig = Math.max(0, parseFloat(e.target.value) || 0); calculateInitialMeta(); render(); };

    // Bloco 3: bindings dos campos avançados
    const batchInp = document.getElementById(`batchInp_${i}`);
    if (batchInp) batchInp.oninput = e => { st.batchSize = Math.max(0, parseInt(e.target.value) || 0); };
    const mtbfInp = document.getElementById(`mtbfInp_${i}`);
    if (mtbfInp) mtbfInp.oninput = e => {
        st.mtbfMin = Math.max(0, parseFloat(e.target.value) || 0);
        if (st.mtbfMin > 0 && !Number.isFinite(st.nextFailIn)) scheduleNextFailure(st);
    };
    const mttrInp = document.getElementById(`mttrInp_${i}`);
    if (mttrInp) mttrInp.oninput = e => { st.mttrMin = Math.max(0, parseFloat(e.target.value) || 0); };
    const learnInp = document.getElementById(`learnInp_${i}`);
    if (learnInp) learnInp.oninput = e => { st.learningPieces = Math.max(0, parseInt(e.target.value) || 0); };
    const learnStartInp = document.getElementById(`learnStartInp_${i}`);
    if (learnStartInp) learnStartInp.oninput = e => { st.learningStart = clamp01((parseFloat(e.target.value) || 0) / 100); };
    const reworkChk = document.getElementById(`reworkChk_${i}`);
    if (reworkChk) reworkChk.onchange = e => { st.reworkEnabled = !!e.target.checked; };
}

function setupWipBinds(i) {
    const w = buffers.wips[i]; if (!w) return;
    const initInp = document.getElementById(`wipInitInput_${i}`);
    if (initInp) initInp.oninput = e => { let v = Math.max(0, parseInt(e.target.value) || 0); if (v > w.max) { v = w.max; initInp.value = v; } if (!running) { w.ready = v; calculateInitialMeta(); render(); } };
    const maxInp = document.getElementById(`wipMaxInput_${i}`);
    if (maxInp) maxInp.oninput = e => { let v = Math.max(1, parseInt(e.target.value) || 100); w.max = v; if (initInp && parseInt(initInp.value) > w.max) { initInp.value = w.max; if (!running) w.ready = w.max; } render(); };
    // Bloco 6.3: dwell-time do buffer
    const dwellInp = document.getElementById(`wipDwellInput_${i}`);
    if (dwellInp) dwellInp.oninput = e => { w.dwell = Math.max(0, parseFloat(e.target.value) || 0); };
}

function updateStationUI(i) {
    const st = S[i], k = oeeCalcStation(st), icon = document.getElementById(`icon_${i}`), pill = document.getElementById(`status_${i}`);
    let txt = 'PRONTA', cls = 'gray', stateCls = '';
    if (!st.enabled) { txt = 'DESLIGADA'; } else if (st.state === 'finished') { txt = 'FINALIZADO'; cls = 'purple'; stateCls = 'state-finished'; } else if (st.state === 'processing') { txt = 'OPERANDO'; cls = 'green'; stateCls = 'state-run'; } else if (st.state === 'setup') { txt = 'SETUP'; cls = 'cyan'; stateCls = 'state-setup'; } else if (st.state === 'down') { txt = 'PARADA'; cls = 'red'; stateCls = 'state-down'; } else if (st.state === 'blocked') { txt = 'TRAVADA'; cls = 'orange'; } else if (lineStarted && st.tStarved > EPSILON) { txt = 'AGUARDANDO'; cls = 'yellow'; } else if (lineStarted) { txt = 'OCIOSA'; }
    if (pill) { pill.textContent = txt; pill.className = `statusPill ${cls}`; } if (icon) icon.className = `machineIcon ${stateCls}`;
    const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    setEl(`oee_${i}`, pct(k.OEE)); setEl(`A_${i}`, (k.A*100).toFixed(0)); setEl(`P_${i}`, (k.P*100).toFixed(0)); setEl(`Q_${i}`, (k.Q*100).toFixed(0));
    setEl(`ppmNomShow_${i}`, Math.round(st.ppmNom)); setEl(`ppmRealShow_${i}`, Math.round(ppmReal(st)));
    setEl(`good_${i}`, st.goodCount); setEl(`refugo_${i}`, stats.scrapByStation[i]);
    setEl(`tRun_${i}`, fmtMMSSd(st.tRun)); setEl(`tDown_${i}`, fmtMMSSd(st.tDown)); setEl(`tSetup_${i}`, fmtMMSSd(st.tSetup)); setEl(`tWait_${i}`, fmtMMSSd(st.tStarved)); setEl(`tBlock_${i}`, fmtMMSSd(st.tBlocked)); setEl(`tIdle_${i}`, fmtMMSSd(st.tIdle));
    // Bloco 3: contadores do painel avançado
    setEl(`advFails_${i}`, st.failuresCount);
    setEl(`advSetups_${i}`, st.batchSetups);
    setEl(`advRework_${i}`, `${st.reworkCount}${st.reworkQueue > 0 ? ' (+'+st.reworkQueue+')' : ''}`);
}

function updateWipUI(i) {
    const w = buffers.wips[i]; if (!w) return; const total = wipTotal(w), pctVal = w.max > 0 ? total / w.max : 0;
    const fillEl = document.getElementById(`wipFill_${i}`); if (fillEl) fillEl.style.height = (clamp01(pctVal) * 100) + '%';
    const pctEl = document.getElementById(`wipPct_${i}`); if (pctEl) pctEl.innerHTML = (clamp01(pctVal) * 100).toFixed(0) + '<span>%</span>';
    const setEl = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
    setEl(`wipCurLabel_${i}`, total); setEl(`wipDisp_${i}`, w.ready); setEl(`wipTrans_${i}`, w.reserved);
    setEl(`wipCuring_${i}`, w.dwellQueue ? w.dwellQueue.length : 0);
    const blockedEl = document.getElementById(`wipBlocked_${i}`); if (blockedEl) blockedEl.style.display = total >= w.max ? 'block' : 'none';
}

function render() {
    for (let i = 0; i < STATION_COUNT; i++) { updateStationUI(i); if (i < STATION_COUNT - 1) updateWipUI(i); }
    if (bottleneckId >= 0 && bottleneckId < S.length) {
        const stG = S[bottleneckId], stF = S[S.length - 1];
        document.getElementById('g_run').textContent = fmtTime(stG.tRun);
        document.getElementById('g_setup_run').textContent = fmtTime(stF.tSetup);
        document.getElementById('g_down').textContent = fmtTime(stG.tDown);
        document.getElementById('g_idle').textContent = fmtTime(S[0].tIdle);
        document.getElementById('g_block').textContent = fmtTime(stG.tBlocked);
        document.getElementById('g_wait').textContent = fmtTime(stG.tStarved);
        document.getElementById('g_scrap').textContent = stats.scrap;
    }
    const metaInicial = fixedInitialEstimate !== null ? fixedInitialEstimate : initialEstimate;
    document.getElementById('t_init').textContent = fmtTime(metaInicial);
    const previsaoAtual = calculateCurrentEstimate();
    document.getElementById('t_est_curr').textContent = fmtTime(previsaoAtual);
    const band = calculateEstimateBand();
    const p90El = document.getElementById('t_est_p90');
    if (p90El) {
        if (band.hasBand && band.p90 > band.p50) {
            p90El.style.display = 'block';
            p90El.textContent = `P90: ${fmtTime(band.p90)}`;
        } else {
            p90El.style.display = 'none';
        }
    }
    const curTime = t;
    document.getElementById('t_elap').textContent = fmtTime(curTime);
    const restante = Math.max(0, previsaoAtual - curTime);
    document.getElementById('t_rem').textContent = fmtTime(restante);
    document.getElementById('badgeLot').textContent = Number.isFinite(buffers.raw.count) ? buffers.raw.count : '∞';
    const finalGood = stats.good;
    document.getElementById('finalGoodCount').textContent = finalGood;
    
    // Atualiza os novos indicadores
    document.getElementById('totalProcessedCount').textContent = getTotalProcessed();
    const currentWip = getCurrentWipSum();
    document.getElementById('wipBalanceDisplay').textContent = `${initialWipAtStart} / ${currentWip}`;

    const endNode = document.getElementById('endNode');
    const endIcon = document.getElementById('endIconArea');
    const endLabel = document.getElementById('endLabel');
    const target = buffers.raw.target;

    if (!lineStarted) {
        endNode.style.borderColor = '#64748b'; 
        endIcon.innerHTML = SVG_WAIT;
        endIcon.style.backgroundColor = '#f1f5f9';
        endIcon.style.borderColor = '#cbd5e1';
        endIcon.style.color = '#64748b';
        endLabel.textContent = "AGUARDANDO";
        endLabel.style.color = '#475569';
        document.getElementById('finalGoodCount').style.color = '#0f172a';
    } else if (finalTime === null) {
        endNode.style.borderColor = '#3b82f6'; 
        endIcon.innerHTML = SVG_RUNNING;
        endIcon.style.backgroundColor = '#eff6ff';
        endIcon.style.borderColor = '#3b82f6';
        endIcon.style.color = '#3b82f6';
        endLabel.textContent = "EM PRODUÇÃO";
        endLabel.style.color = '#2563eb';
        document.getElementById('finalGoodCount').style.color = '#0f172a';
    } else if (finalGood < target) {
        endNode.style.borderColor = '#ef4444'; 
        endIcon.innerHTML = SVG_FAIL;
        endIcon.style.backgroundColor = '#fef2f2';
        endIcon.style.borderColor = '#ef4444';
        endIcon.style.color = '#dc2626';
        endLabel.textContent = "META NÃO ATINGIDA";
        endLabel.style.color = '#b91c1c';
        document.getElementById('finalGoodCount').style.color = '#dc2626';
    } else {
        endNode.style.borderColor = '#22c55e'; 
        endIcon.innerHTML = SVG_DONE;
        endIcon.style.backgroundColor = '#ecfdf5';
        endIcon.style.borderColor = '#22c55e';
        endIcon.style.color = '#16a34a';
        endLabel.textContent = "CONCLUÍDO";
        endLabel.style.color = '#15803d';
        document.getElementById('finalGoodCount').style.color = '#16a34a';
    }
}

function spawnAnimBox(fromEl, toEl, type, duration) {
    if (isFastForwarding || !fromEl) return;
    const layer = document.getElementById('animLayer'), board = document.getElementById('board'); if (!layer || !board) return;
    const boardRect = board.getBoundingClientRect(), b = document.createElement('div'); b.className = `animBox ${type.includes('scrap') ? 'scrap' : 'normal'}`;
    const startRect = fromEl.getBoundingClientRect(), startX = startRect.left - boardRect.left + startRect.width / 2 - 8;
    b.style.left = `${startX}px`; b.style.top = '0px'; b.style.opacity = 1; layer.appendChild(b);
    const adjDur = (duration || 1000) / timeScale;
    if (type === 'scrap') { b.animate([{ top: '0px', opacity: 1 }, { top: '100px', opacity: 0 }], { duration: adjDur, easing: 'ease-in' }).onfinish = () => b.remove(); return; }
    let targetX = startX; if (toEl) { const endRect = toEl.getBoundingClientRect(); targetX = endRect.left - boardRect.left + endRect.width / 2 - 8; }
    b.animate([{ left: `${startX}px` }, { left: `${targetX}px` }], { duration: adjDur, easing: 'linear', fill: 'forwards' }).onfinish = () => { if (type === 'station_to_wip') b.animate([{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(0.5)', opacity: 0 }], { duration: 200 / timeScale }).onfinish = () => b.remove(); else b.remove(); };
}

function reset() {
    const keep = document.getElementById('chkKeepParams').checked;
    let saved = null;
    if (keep && S.length > 0) { let wI = [], wM = [], wD = []; for (let i = 0; i < STATION_COUNT - 1; i++) { wI.push(parseInt(document.getElementById(`wipInitInput_${i}`)?.value) || 0); wM.push(parseInt(document.getElementById(`wipMaxInput_${i}`)?.value) || 100); wD.push(buffers.wips[i]?.dwell || 0); } saved = { transit: TRANSIT_TIME, stock: buffers.raw.stock, target: buffers.raw.target, makeToGood, timeScale, flushLine, wI, wM, wD, stations: S.map(s => ({ enabled: s.enabled, name: s.name, ppm: s.ppmNom, A: s.Aset, P: s.Pset, Q: s.Qset, setup: s.setupConfig, batchSize: s.batchSize, mtbfMin: s.mtbfMin, mttrMin: s.mttrMin, learningPieces: s.learningPieces, learningStart: s.learningStart, reworkEnabled: s.reworkEnabled })) }; }
    
    running = false; lineStarted = false; t = 0; finalTime = null; isFastForwarding = false; initialWipAtStart = 0; targetAtStart = 0; fixedInitialEstimate = null;
    lastChartUpdate = 0; // CORRIGIDO: Reset do timer do gráfico

    // Zera gráficos e limpa SVG visualmente
    historyOEE = []; historyPPM = [];
    document.getElementById('chartOEE').innerHTML = '';
    document.getElementById('chartPPM').innerHTML = '';

    // Bloco 1: reset histórico de estados
    stateHistory = []; lastSnapshot = -1;
    if (analyticsOpen) renderAnalytics();

    let stockVal = 100, targetVal = 60;
    if (keep && saved) { stockVal = saved.stock; targetVal = saved.target; TRANSIT_TIME = saved.transit; makeToGood = saved.makeToGood; flushLine = saved.flushLine; timeScale = saved.timeScale; }
    else { TRANSIT_TIME = parseInt(document.getElementById('transitTimeInput')?.value) || 0; timeScale = parseInt(document.getElementById('speedSelect')?.value) || 1; makeToGood = false; flushLine = false; }
    
    document.getElementById('transitTimeInput').value = TRANSIT_TIME; document.getElementById('speedSelect').value = timeScale; document.getElementById('chkFlushLine').checked = flushLine;
    buffers.raw.stock = stockVal; buffers.raw.target = buffers.raw.targetInf ? Infinity : targetVal;
    buffers.raw.count = buffers.raw.stockInf ? Infinity : stockVal;
    
    stats = { good: 0, scrap: 0, scrapByStation: Array(STATION_COUNT).fill(0) }; transfers.length = 0;
    S = []; buffers.wips = [];
    
    for (let i = 0; i < STATION_COUNT; i++) {
        let st = stationTemplate(i);
        if (keep && saved?.stations[i]) {
            const sv = saved.stations[i];
            Object.assign(st, {
                enabled: sv.enabled, name: sv.name, ppmNom: sv.ppm,
                Aset: sv.A, Pset: sv.P, Qset: sv.Q, setupConfig: sv.setup || 0,
                batchSize: sv.batchSize || 0,
                mtbfMin: sv.mtbfMin || 0,
                mttrMin: sv.mttrMin || 5,
                learningPieces: sv.learningPieces || 0,
                learningStart: sv.learningStart ?? 0.6,
                reworkEnabled: !!sv.reworkEnabled
            });
        }
        S.push(st);
    }
    for (let i = 0; i < STATION_COUNT - 1; i++) { let w = makeWip(); if (keep && saved) { w.max = saved.wM[i] || 100; w.ready = saved.wI[i] || 0; w.dwell = (saved.wD && saved.wD[i]) || 0; } buffers.wips.push(w); }

    // Bloco 1 (Grafo): sincroniza espelho de topologia com o estado linear
    rebuildLinearGraph();
    if (typeof syncLinearView === 'function') syncLinearView();

    if (typeof unparkStationCard === 'function') unparkStationCard();
    buildDOM();
    refreshStockTargetUI(); // Bloco 7.1: aplica estado ∞ se persistente

    if (keep && saved) { for (let i = 0; i < STATION_COUNT - 1; i++) { const initEl = document.getElementById(`wipInitInput_${i}`), maxEl = document.getElementById(`wipMaxInput_${i}`); if (initEl) initEl.value = saved.wI[i]; if (maxEl) maxEl.value = saved.wM[i]; } }

    document.getElementById('chkFlushLine').onchange = e => { flushLine = e.target.checked; };
    calculateInitialMeta(); render();
    document.getElementById('btnStart').innerHTML = '<span>▶</span> INICIAR';
    document.getElementById('animLayer').innerHTML = '';
}

let lastChartUpdate = 0;
function tick(dt, doRender) {
    if (!lineStarted) { calculateInitialMeta(); if (doRender) render(); } 
    if (!running) return;
    
    // Verifica parada
    if (checkLineFinished() && finalTime === null) { 
        finalTime = t; 
        running = false; 
        document.getElementById('btnStart').innerHTML = '<span>▶</span> INICIAR'; 
        render(); // Força render final para atualizar status visual
    }
    
    t += finalTime !== null ? 0 : dt;
    transfersTick(dt);
    // Bloco 6.3: tick dos nós BUFFER (decrementa dwell de cada peça em cura)
    for (const n of nodes) { if (n.type === 'BUFFER' && n.ref) bufferTick(n.ref, dt); }
    for (let i = 0; i < STATION_COUNT; i++) stationTick(i, dt);

    recordStateSnapshot();
    if (t - lastChartUpdate > PREFS.chartUpdateInterval) {
        updateCharts(); lastChartUpdate = t;
        if (analyticsOpen) renderAnalytics();
        if (mapOpen) renderMap();
    }
    if (doRender) render();
}

// === Bloco 6.4: Vista MAPA (somente leitura) ===
let mapOpen = false;
let mapViewBox = { x: 0, y: 0, w: 1600, h: 800 };
let mapDrag = null; // { startX, startY, vbX, vbY }
const NODE_W = 130, NODE_H = 72;
const NODE_FILL = {
    SOURCE: '#94a3b8',
    STATION: '#3b82f6',
    BUFFER: '#06b6d4',
    SINK: '#22c55e'
};

function openMap() {
    mapOpen = true;
    const v = document.getElementById('mapView');
    v.classList.add('open');
    renderMap();
    autoFitMap();
}
function closeMap() {
    mapOpen = false;
    unparkStationCard();
    selectedNodeId = null;
    document.getElementById('mapView').classList.remove('open');
    document.getElementById('mapAnim').innerHTML = '';
}

function setMapViewBox() {
    const svg = document.getElementById('mapSvg');
    svg.setAttribute('viewBox', `${mapViewBox.x} ${mapViewBox.y} ${mapViewBox.w} ${mapViewBox.h}`);
    renderMinimap();
}

// Bloco 7.4: auto-layout topológico (colunas via BFS, empilhamento vertical em paralelas)
function autoLayoutMap() {
    if (nodes.length === 0) return;
    // 1. Calcula rank topológico de cada nó
    const rank = new Map();
    // Iteração até estabilizar (suporta grafos com múltiplos SOURCEs)
    for (const n of nodes) rank.set(n.id, 0);
    let changed = true, iter = 0;
    while (changed && iter < 200) {
        changed = false; iter++;
        for (const e of edges) {
            const r = (rank.get(e.from) ?? 0) + 1;
            if (r > (rank.get(e.to) ?? 0)) { rank.set(e.to, r); changed = true; }
        }
    }
    // 2. Agrupa nós por rank
    const byRank = new Map();
    for (const n of nodes) {
        const r = rank.get(n.id) ?? 0;
        if (!byRank.has(r)) byRank.set(r, []);
        byRank.get(r).push(n);
    }
    // 3. Distribuição: x = rank * colSpacing, y = espaçado verticalmente; em paralelas, altura proporcional
    const colSpacing = 200;
    const rowSpacing = NODE_H + 30;
    const cy = 250;
    for (const [r, group] of byRank) {
        const n_g = group.length;
        const total = n_g * NODE_H + (n_g - 1) * 30;
        const yStart = cy - total / 2;
        group.sort((a, b) => a.id.localeCompare(b.id));
        for (let k = 0; k < n_g; k++) {
            group[k].x = r * colSpacing;
            group[k].y = yStart + k * rowSpacing;
        }
    }
    autoFitMap();
}

function autoFitMap() {
    if (nodes.length === 0) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + NODE_W);
        maxY = Math.max(maxY, n.y + NODE_H);
    }
    const pad = 80;
    mapViewBox.x = minX - pad;
    mapViewBox.y = minY - pad - 40;
    mapViewBox.w = Math.max(800, maxX - minX + pad * 2);
    mapViewBox.h = Math.max(500, maxY - minY + pad * 2 + 80);
    setMapViewBox();
}

function zoomMap(factor) {
    const cx = mapViewBox.x + mapViewBox.w / 2;
    const cy = mapViewBox.y + mapViewBox.h / 2;
    mapViewBox.w /= factor;
    mapViewBox.h /= factor;
    mapViewBox.x = cx - mapViewBox.w / 2;
    mapViewBox.y = cy - mapViewBox.h / 2;
    setMapViewBox();
}

function svgPointFromEvent(ev) {
    const svg = document.getElementById('mapSvg');
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: ev.clientX, y: ev.clientY };
    const inv = ctm.inverse();
    return pt.matrixTransform(inv);
}

function initMapInteractions() {
    const svg = document.getElementById('mapSvg');
    svg.addEventListener('pointerdown', ev => {
        const nodeG = ev.target.closest('.map-node-g');
        if (nodeG) {
            const id = nodeG.dataset.id;
            // Bloco 7.2: em modos não-idle, dispara handler imediato; em idle inicia drag
            if (editorMode !== 'idle') {
                handleNodeClick(id);
                ev.stopPropagation();
                return;
            }
            const n = nodeById.get(id);
            if (!n) return;
            const p = svgPointFromEvent(ev);
            nodeDrag = { nodeId: id, startX: p.x, startY: p.y, origX: n.x, origY: n.y, moved: false };
            svg.setPointerCapture(ev.pointerId);
            ev.stopPropagation();
            return;
        }
        const edgeHit = ev.target.closest('.map-edge-hit');
        if (edgeHit) {
            handleEdgeClick(edgeHit.dataset.edgeId, ev);
            ev.stopPropagation();
            return;
        }
        const edgeP = ev.target.closest('.map-edge');
        if (edgeP) {
            const m = edgeP.id.match(/^path_(.+)$/);
            if (m) handleEdgeClick(m[1], ev);
            ev.stopPropagation();
            return;
        }
        // fora de nó/edge → pan ou fecha selecção
        if (selectedNodeId) { selectNode(null); }
        mapDrag = { startX: ev.clientX, startY: ev.clientY, vbX: mapViewBox.x, vbY: mapViewBox.y };
        svg.setPointerCapture(ev.pointerId);
    });
    svg.addEventListener('pointermove', ev => {
        if (nodeDrag) {
            const p = svgPointFromEvent(ev);
            const n = nodeById.get(nodeDrag.nodeId); if (!n) return;
            n.x = nodeDrag.origX + (p.x - nodeDrag.startX);
            n.y = nodeDrag.origY + (p.y - nodeDrag.startY);
            if (Math.abs(p.x - nodeDrag.startX) + Math.abs(p.y - nodeDrag.startY) > 3) nodeDrag.moved = true;
            renderMap();
            return;
        }
        if (!mapDrag) return;
        const dx = (ev.clientX - mapDrag.startX) * (mapViewBox.w / svg.clientWidth);
        const dy = (ev.clientY - mapDrag.startY) * (mapViewBox.h / svg.clientHeight);
        mapViewBox.x = mapDrag.vbX - dx;
        mapViewBox.y = mapDrag.vbY - dy;
        setMapViewBox();
    });
    svg.addEventListener('pointerup', ev => {
        if (nodeDrag) {
            if (!nodeDrag.moved) handleNodeClick(nodeDrag.nodeId);
            nodeDrag = null;
            try { svg.releasePointerCapture(ev.pointerId); } catch(e){}
            return;
        }
        mapDrag = null; try { svg.releasePointerCapture(ev.pointerId); } catch(e){}
    });
    svg.addEventListener('wheel', ev => {
        ev.preventDefault();
        const factor = ev.deltaY < 0 ? 1.15 : 0.87;
        const p = svgPointFromEvent(ev);
        const newW = mapViewBox.w / factor, newH = mapViewBox.h / factor;
        mapViewBox.x = p.x - (p.x - mapViewBox.x) * (newW / mapViewBox.w);
        mapViewBox.y = p.y - (p.y - mapViewBox.y) * (newH / mapViewBox.h);
        mapViewBox.w = newW; mapViewBox.h = newH;
        setMapViewBox();
    }, { passive: false });
}

function minimapClick(ev) {
    const mm = document.getElementById('minimap');
    const rect = mm.getBoundingClientRect();
    const fx = (ev.clientX - rect.left) / rect.width;
    const fy = (ev.clientY - rect.top) / rect.height;
    // Calcula bbox dos nós
    const bb = nodesBoundingBox(); if (!bb) return;
    const worldX = bb.x + fx * bb.w;
    const worldY = bb.y + fy * bb.h;
    mapViewBox.x = worldX - mapViewBox.w / 2;
    mapViewBox.y = worldY - mapViewBox.h / 2;
    setMapViewBox();
}

function nodesBoundingBox() {
    if (nodes.length === 0) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + NODE_W);
        maxY = Math.max(maxY, n.y + NODE_H);
    }
    return { x: minX - 40, y: minY - 40, w: (maxX - minX) + 80, h: (maxY - minY) + 80 };
}

function edgePath(srcNode, dstNode, style) {
    // Bloco 7.6: suporte a estilo 'L' (ortogonal) além do Bezier default
    const x1 = srcNode.x + NODE_W;
    const y1 = srcNode.y + NODE_H / 2;
    const x2 = dstNode.x;
    const y2 = dstNode.y + NODE_H / 2;
    if (style === 'L') {
        const midX = (x1 + x2) / 2;
        return `M${x1},${y1} L${midX},${y1} L${midX},${y2} L${x2},${y2}`;
    }
    const dx = Math.max(40, (x2 - x1) * 0.5);
    return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

function nodeLiveLabel(n) {
    if (n.type === 'SOURCE') {
        const cnt = Number.isFinite(n.ref.count) ? n.ref.count : '∞';
        const stk = n.ref.stockInf ? '∞' : n.ref.stock;
        return { line1: cnt, line2: `de ${stk}` };
    }
    if (n.type === 'SINK')   {
        const tgt = Number.isFinite(buffers.raw.target) ? buffers.raw.target : '∞';
        return { line1: stats.good, line2: `meta ${tgt}` };
    }
    if (n.type === 'STATION') {
        const k = oeeCalcStation(n.ref);
        const pph = Math.round(ppmReal(n.ref) * 60);
        return { line1: `OEE ${(k.OEE*100).toFixed(0)}%`, line2: `${pph} pph` };
    }
    if (n.type === 'BUFFER') {
        const t = wipTotal(n.ref);
        const cura = n.ref.dwellQueue ? n.ref.dwellQueue.length : 0;
        const full = t >= n.ref.max;
        return {
            line1: `${t}/${n.ref.max}`,
            line2: cura > 0 ? `cura ${cura} (${n.ref.dwell}s)` : (full ? '⚠ CHEIO' : 'pull')
        };
    }
    return { line1: '', line2: '' };
}

// Bloco 7.5: badge dinâmico do estado de uma estação
function stationBadge(st, isBn) {
    if (!st.enabled) return { text: 'OFF', color: '#475569', w: 32 };
    if (isBn) return { text: 'GARGALO', color: '#d946ef', w: 68, pulse: true };
    if (st.state === 'down') return { text: 'PARADA', color: '#ef4444', w: 56, pulse: true };
    if (st.state === 'blocked') return { text: 'TRAVADA', color: '#f59e0b', w: 60 };
    if (st.state === 'setup') return { text: 'SETUP', color: '#06b6d4', w: 48 };
    if (lineStarted && st.tStarved > EPSILON && st.state === 'idle') {
        // só destaca starving quando já houve algum aguardar significativo (last segment)
        return { text: 'AGUARDANDO', color: '#eab308', w: 78 };
    }
    if (st.state === 'processing') return { text: 'OPERANDO', color: '#22c55e', w: 64 };
    return null;
}

function nodeFill(n) {
    if (n.type === 'STATION') {
        if (!n.ref.enabled) return '#475569';
        const k = oeeCalcStation(n.ref);
        if (k.OEE >= 0.85) return '#16a34a';
        if (k.OEE >= 0.6) return '#3b82f6';
        if (k.OEE >= 0.4) return '#f59e0b';
        return '#ef4444';
    }
    // Bloco 7.7: BUFFER cheio vira laranja-avermelhado
    if (n.type === 'BUFFER' && n.ref && wipTotal(n.ref) >= n.ref.max) return '#f97316';
    return NODE_FILL[n.type] || '#64748b';
}

function renderMap() {
    if (!mapOpen) return;
    const gNodes = document.getElementById('mapNodes');
    const gEdges = document.getElementById('mapEdges');
    const gFloor = document.getElementById('mapFloor');
    if (!gNodes || !gEdges) return;

    // Bloco 7.6: planta baixa como fundo (preenche o viewBox atual)
    if (gFloor) {
        if (floorPlanData) {
            const bb = nodesBoundingBox() || { x: 0, y: 0, w: 1600, h: 800 };
            gFloor.innerHTML = `<image href="${floorPlanData}" x="${bb.x - 200}" y="${bb.y - 200}" width="${bb.w + 400}" height="${bb.h + 400}" opacity="${floorPlanOpacity}" preserveAspectRatio="xMidYMid meet"/>`;
        } else {
            gFloor.innerHTML = '';
        }
    }

    // Edges
    let svgE = '';
    for (const e of edges) {
        const src = nodeById.get(e.from), dst = nodeById.get(e.to);
        if (!src || !dst) continue;
        const d = edgePath(src, dst, e.style || globalEdgeStyle);
        const isActive = src.type === 'STATION' && src.ref.state === 'processing';
        // hitbox transparente largo para facilitar clique
        svgE += `<path class="map-edge-hit" d="${d}" data-edge-id="${e.id}" fill="none" stroke="transparent" stroke-width="14" pointer-events="stroke"/>`;
        svgE += `<path id="path_${e.id}" class="map-edge ${isActive ? 'active' : ''}" d="${d}" marker-end="url(#arrowMap)"/>`;
    }
    gEdges.innerHTML = svgE;

    // Nodes
    let svgN = '';
    for (const n of nodes) {
        const fill = nodeFill(n);
        const lbl = nodeLiveLabel(n);
        const isBn = n.type === 'STATION' && n.ref && S.indexOf(n.ref) === bottleneckId;
        const stateCls = [
            selectedNodeId === n.id ? 'selected' : '',
            connectSrcId === n.id ? 'connect-src' : ''
        ].filter(Boolean).join(' ');
        // Bloco 7.5: badge de estado em cima do nó STATION
        let badgeSvg = '';
        if (n.type === 'STATION') {
            const badge = stationBadge(n.ref, isBn);
            if (badge) {
                badgeSvg = `<g class="state-badge ${badge.pulse ? 'pulse' : ''}">
                    <rect x="${NODE_W/2 - badge.w/2}" y="-16" width="${badge.w}" height="14" rx="3" fill="${badge.color}"/>
                    <text x="${NODE_W/2}" y="-5" text-anchor="middle" font-size="9" font-weight="900" fill="#fff">${badge.text}</text>
                </g>`;
            }
        }
        svgN += `<g class="map-node-g ${stateCls}" data-id="${n.id}" transform="translate(${n.x},${n.y})">
            ${badgeSvg}
            <rect class="map-node-rect ${isBn ? 'bottleneck' : ''}" x="0" y="0" width="${NODE_W}" height="${NODE_H}" rx="8" fill="${fill}" stroke="rgba(255,255,255,0.18)" stroke-width="1.5"/>
            <text class="map-node-label" x="${NODE_W/2}" y="20" text-anchor="middle" font-size="12">${(n.name || '').slice(0, 16)}</text>
            <text class="map-node-sub" x="${NODE_W/2}" y="40" text-anchor="middle" font-size="14" font-weight="700" fill="#fff">${lbl.line1}</text>
            <text class="map-node-sub" x="${NODE_W/2}" y="58" text-anchor="middle" font-size="10" opacity="0.8">${lbl.line2}</text>
            ${n.type === 'STATION' && !n.ref.enabled ? `<text x="${NODE_W/2}" y="${NODE_H/2}" text-anchor="middle" font-size="10" fill="#fca5a5" opacity="0.6">DESLIGADA</text>` : ''}
        </g>`;
    }
    gNodes.innerHTML = svgN;

    // Info bar
    const info = document.getElementById('mapInfo');
    if (info) {
        const bn = bottleneckId >= 0 && S[bottleneckId] ? S[bottleneckId].name : '—';
        info.innerHTML = `Gargalo: <b>${bn}</b> &nbsp;·&nbsp; Bons: <b>${stats.good}</b> &nbsp;·&nbsp; Refugo: <b>${stats.scrap}</b> &nbsp;·&nbsp; t = <b>${fmtMMSSd(t)}</b>`;
    }

    renderMinimap();
}

function renderMinimap() {
    const mm = document.getElementById('minimap');
    if (!mm) return;
    const bb = nodesBoundingBox(); if (!bb) { mm.innerHTML = ''; return; }
    mm.setAttribute('viewBox', `${bb.x} ${bb.y} ${bb.w} ${bb.h}`);
    let s = '';
    // Edges
    for (const e of edges) {
        const src = nodeById.get(e.from), dst = nodeById.get(e.to);
        if (!src || !dst) continue;
        s += `<line x1="${src.x + NODE_W}" y1="${src.y + NODE_H/2}" x2="${dst.x}" y2="${dst.y + NODE_H/2}" stroke="rgba(148,163,184,0.5)" stroke-width="1.5"/>`;
    }
    // Nodes mini
    for (const n of nodes) {
        const fill = nodeFill(n);
        s += `<rect x="${n.x}" y="${n.y}" width="${NODE_W}" height="${NODE_H}" rx="4" fill="${fill}" opacity="0.85"/>`;
    }
    // Frame do viewBox principal
    s += `<rect x="${mapViewBox.x}" y="${mapViewBox.y}" width="${mapViewBox.w}" height="${mapViewBox.h}" fill="none" stroke="#facc15" stroke-width="3" stroke-dasharray="6,4"/>`;
    mm.innerHTML = s;
}

// === Bloco 7.6: estado da planta baixa + estilo global das setas ===
let floorPlanData = null;     // dataURL da imagem (base64)
let floorPlanOpacity = 0.5;
let globalEdgeStyle = 'Bezier'; // 'Bezier' | 'L' (override individual ainda funciona via edge.style)

function loadFloorPlan(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        floorPlanData = e.target.result;
        document.getElementById('floorplanCtrl').style.display = 'flex';
        renderMap();
        showToast('Planta baixa carregada');
    };
    reader.readAsDataURL(file);
    ev.target.value = '';
}
function setFloorPlanOpacity(v) {
    floorPlanOpacity = Math.max(0, Math.min(1, parseInt(v) / 100));
    renderMap();
}
function removeFloorPlan() {
    floorPlanData = null;
    document.getElementById('floorplanCtrl').style.display = 'none';
    renderMap();
}
function toggleAllEdgesStyle() {
    globalEdgeStyle = (globalEdgeStyle === 'Bezier') ? 'L' : 'Bezier';
    for (const e of edges) e.style = globalEdgeStyle;
    const btn = document.getElementById('btnEdgeStyle');
    if (btn) btn.textContent = `⤳ Setas: ${globalEdgeStyle}`;
    renderMap();
}

// === Bloco 6.5: Editor de topologia ===
let editorMode = 'idle';      // 'idle' | 'connecting' | 'deleting'
let selectedNodeId = null;
let connectSrcId = null;
let nodeDrag = null;          // { nodeId, startX, startY, origX, origY }
let nextBufId = 100;          // contadores de id para nós/edges novos
let nextEdgeId = 1000;

function setEditorMode(mode) {
    editorMode = mode;
    if (mode !== 'connecting') connectSrcId = null;
    if (mode !== 'idle') { selectedNodeId = null; updatePropsPanel(); }
    for (const b of ['connect', 'delete']) {
        const el = document.getElementById(`btnMode-${b}`);
        if (el) el.classList.toggle('mode-on', mode === (b === 'connect' ? 'connecting' : 'deleting'));
    }
    renderMap();
}

function selectNode(nodeId) {
    selectedNodeId = nodeId;
    renderMap();
    updatePropsPanel();
}

// Bloco 7.4: painel direito do MAPA = card linear real (movido por DOM)
// quando uma estação é selecionada. Para BUFFER/SOURCE/SINK mostra inputs simples.
let _stationParkedFor = null; // id do nó cujo card linear está atualmente no painel

function parkStationCardInPanel(stationIdx, panel) {
    const stEl = document.getElementById(`st${stationIdx}`);
    if (stEl && stEl.parentElement !== panel) {
        stEl._origParent = stEl.parentElement;
        stEl._origNext = stEl.nextSibling;
        panel.appendChild(stEl);
        stEl.classList.add('station-in-panel');
    }
}
function unparkStationCard() {
    if (!_stationParkedFor) return;
    const idx = parseInt(_stationParkedFor.replace('stn',''), 10);
    const stEl = document.getElementById(`st${idx}`);
    if (stEl && stEl._origParent) {
        stEl.classList.remove('station-in-panel');
        if (stEl._origNext && stEl._origNext.parentElement === stEl._origParent) {
            stEl._origParent.insertBefore(stEl, stEl._origNext);
        } else {
            stEl._origParent.appendChild(stEl);
        }
        stEl._origParent = null; stEl._origNext = null;
    }
    _stationParkedFor = null;
}

function updatePropsPanel() {
    const panel = document.getElementById('mapProps');
    if (!panel) return;
    if (!selectedNodeId) { unparkStationCard(); panel.classList.remove('open'); panel.innerHTML = ''; return; }
    const n = nodeById.get(selectedNodeId);
    if (!n) { unparkStationCard(); panel.classList.remove('open'); panel.innerHTML = ''; return; }

    // Se mudou de seleção, devolve o card anterior
    if (_stationParkedFor && _stationParkedFor !== n.id) unparkStationCard();

    // Cabeçalho + ações comuns
    const actionsHtml = (() => {
        let h = `<div class="row-actions" style="flex-wrap:wrap;">`;
        h += `<button onclick="startConnectFromNode('${n.id}')" title="Cria edge para outro nó">🔗 Conectar a…</button>`;
        if (n.type === 'STATION') h += `<button onclick="splitStation('${n.id}')" title="Cria estação paralela com mesmos parâmetros">🪓 Dividir</button>`;
        const canDelete = (n.type !== 'SOURCE' || nodes.filter(x => x.type === 'SOURCE').length > 1) &&
                          (n.type !== 'SINK'   || nodes.filter(x => x.type === 'SINK').length > 1);
        if (canDelete) h += `<button class="danger" onclick="deleteNode('${n.id}')">🗑 Apagar</button>`;
        h += `<button onclick="selectNode(null)">Fechar</button></div>`;
        return h;
    })();

    if (n.type === 'STATION') {
        // Move o card linear real para dentro do painel — mantém todos os bindings já ligados
        panel.innerHTML = `<h4>ESTAÇÃO — ${n.name}</h4><div id="mapStationSlot"></div>${actionsHtml}`;
        panel.classList.add('open');
        const slot = document.getElementById('mapStationSlot');
        const idx = S.indexOf(n.ref);
        parkStationCardInPanel(idx, slot);
        _stationParkedFor = n.id;
        return;
    }

    // BUFFER/SOURCE/SINK: inputs próprios
    let html = `<h4>${n.type} — ${n.name || n.id}</h4>`;
    html += `<label>Nome <input id="prop_name" type="text" value="${n.name || ''}"></label>`;
    if (n.type === 'BUFFER') {
        html += `<label>Capacidade <input id="prop_max" type="number" min="1" max="9999" value="${n.ref.max}"></label>`;
        html += `<label>Dwell (s) <input id="prop_dwell" type="number" min="0" max="9999" step="1" value="${n.ref.dwell}"></label>`;
        html += `<label>Início (pç) <input id="prop_ready" type="number" min="0" value="${n.ref.ready}"></label>`;
        html += `<small style="opacity:0.7;">Dwell = tempo de cura/quarentena obrigatório antes da peça ficar disponível.</small>`;
    } else if (n.type === 'SOURCE') {
        const stkInf = !!n.ref.stockInf;
        const tgtInf = !!n.ref.targetInf;
        html += `<label>Stock <input id="prop_stock" type="number" min="1" max="999999" value="${n.ref.stock}" ${stkInf?'disabled':''}> <button onclick="toggleStockInf(); updatePropsPanel();" class="inf-btn ${stkInf?'on':''}">∞</button></label>`;
        html += `<label>Meta <input id="prop_target" type="number" min="1" max="999999" value="${n.ref.target}" ${tgtInf?'disabled':''}> <button onclick="toggleTargetInf(); updatePropsPanel();" class="inf-btn ${tgtInf?'on':''}">∞</button></label>`;
    } else if (n.type === 'SINK') {
        html += `<small style="opacity:0.7;">Nó terminal — recolhe peças boas. Bons coletados: <b>${stats.good}</b></small>`;
    }
    html += actionsHtml;
    panel.innerHTML = html;
    panel.classList.add('open');
    const bind = (id, cb) => { const el = document.getElementById(id); if (el) el.oninput = e => { cb(e.target.value); renderMap(); }; };
    bind('prop_name', v => { n.name = v; if (n.ref) n.ref.name = v; render(); });
    if (n.type === 'BUFFER') {
        bind('prop_max', v => { n.ref.max = Math.max(1, parseInt(v) || 1); });
        bind('prop_dwell', v => { n.ref.dwell = Math.max(0, parseFloat(v) || 0); });
        bind('prop_ready', v => { if (!running) n.ref.ready = Math.max(0, parseInt(v) || 0); });
    } else if (n.type === 'SOURCE') {
        bind('prop_stock', v => { if (!buffers.raw.stockInf) { n.ref.stock = Math.max(1, parseInt(v) || 1); if (!running) n.ref.count = n.ref.stock; calculateInitialMeta(); render(); refreshStockTargetUI(); } });
        bind('prop_target', v => { if (!buffers.raw.targetInf) { n.ref.target = Math.max(1, parseInt(v) || 1); calculateInitialMeta(); render(); refreshStockTargetUI(); } });
    }
}

function addBufferNode() {
    const id = `buf_${nextBufId++}`;
    const buf = { ready: 0, reserved: 0, max: 50, dwell: 0, dwellQueue: [] };
    // posiciona no centro do viewBox
    const x = mapViewBox.x + mapViewBox.w / 2 - NODE_W / 2;
    const y = mapViewBox.y + mapViewBox.h / 2 - NODE_H / 2;
    nodes.push({ id, type: 'BUFFER', x, y, name: 'ESTEIRA', ref: buf });
    rebuildNodeIndex();
    selectNode(id);
    syncLinearView();
    showToast('Buffer adicionado — agora conecte-o com [🔗 Conectar]');
}

function addStationNode() {
    if (S.length >= 16) return showToast('Limite atingido (16 estações)', true);
    const idx = S.length;
    const st = stationTemplate(idx);
    S.push(st);
    if (stats.scrapByStation) stats.scrapByStation.push(0);
    STATION_COUNT = S.length;
    const id = `stn${idx}`;
    const x = mapViewBox.x + mapViewBox.w / 2 - NODE_W / 2;
    const y = mapViewBox.y + mapViewBox.h / 2 - NODE_H / 2 + 100;
    nodes.push({ id, type: 'STATION', x, y, name: st.name, ref: st });
    rebuildNodeIndex();
    selectNode(id);
    syncLinearView();
    updateBottlenecks(); calculateInitialMeta();
    showToast('Estação adicionada — conecte-a com [🔗 Conectar]');
}

function deleteNode(nodeId) {
    const n = nodeById.get(nodeId);
    if (!n) return;
    // Validações
    if (n.type === 'SOURCE') {
        const sources = nodes.filter(x => x.type === 'SOURCE');
        if (sources.length <= 1) return showToast('A linha precisa de pelo menos 1 SOURCE.', true);
    }
    if (n.type === 'SINK') {
        const sinks = nodes.filter(x => x.type === 'SINK');
        if (sinks.length <= 1) return showToast('A linha precisa de pelo menos 1 SINK.', true);
    }
    if (n.type === 'STATION') {
        if (running) return showToast('Pause a simulação para apagar uma estação.', true);
        if (!confirm(`Apagar a estação "${n.name}" e todas as suas conexões?`)) return;
        // Remove da lista S[] preservando a ordem
        const idx = S.indexOf(n.ref);
        if (idx >= 0) {
            S.splice(idx, 1);
            STATION_COUNT = S.length;
            if (stats.scrapByStation) stats.scrapByStation.splice(idx, 1);
            // Reindexa IDs dos nós STATION restantes (mantém invariante stn{i} ↔ S[i])
            reindexStationNodes();
        }
    }
    nodes = nodes.filter(x => x.id !== nodeId);
    edges = edges.filter(e => e.from !== nodeId && e.to !== nodeId);
    rebuildNodeIndex();
    if (selectedNodeId === nodeId) { selectedNodeId = null; updatePropsPanel(); }
    syncLinearView();
    updateBottlenecks(); calculateInitialMeta();
    renderMap();
    if (n.type === 'STATION') buildDOM(); // reconstruir cards lineares
    showToast(`${n.type === 'STATION' ? 'Estação' : n.type === 'BUFFER' ? 'Buffer' : n.type} apagado(a)`);
}

// Bloco 7.3: apaga estação a partir do card linear (wrapper de deleteNode)
function deleteStationByIdx(idx) {
    if (idx < 0 || idx >= S.length) return;
    const stnId = `stn${idx}`;
    deleteNode(stnId);
    document.getElementById('stationsSelect').value = S.length;
}

// Bloco 7.2: re-mapeia IDs dos nós STATION para acompanhar nova ordem em S[]
function reindexStationNodes() {
    const idMap = new Map(); // antigoId → novoId
    let counter = 0;
    for (const n of nodes) {
        if (n.type === 'STATION') {
            const newId = `stn${counter++}`;
            if (newId !== n.id) idMap.set(n.id, newId);
            n.id = newId;
        }
    }
    // Atualiza edges
    for (const e of edges) {
        if (idMap.has(e.from)) e.from = idMap.get(e.from);
        if (idMap.has(e.to)) e.to = idMap.get(e.to);
    }
    if (idMap.has(selectedNodeId)) selectedNodeId = idMap.get(selectedNodeId);
    rebuildNodeIndex();
}

// Bloco 7.2: "Dividir" — clona a estação atual numa paralela e re-roteia upstream/downstream
// para que ambas processem em paralelo com shortest-queue.
function splitStation(nodeId) {
    const n = nodeById.get(nodeId);
    if (!n || n.type !== 'STATION') return;
    if (S.length >= 99) return showToast('Limite atingido (99 estações)', true);
    if (running) return showToast('Pause a simulação para dividir uma estação.', true);

    const origIdx = S.indexOf(n.ref);
    const clone = stationTemplate(S.length);
    // copia parâmetros do original
    Object.assign(clone, {
        name: n.ref.name + ' (cópia)',
        ppmNom: n.ref.ppmNom, Aset: n.ref.Aset, Pset: n.ref.Pset, Qset: n.ref.Qset,
        setupConfig: n.ref.setupConfig, batchSize: n.ref.batchSize,
        mtbfMin: n.ref.mtbfMin, mttrMin: n.ref.mttrMin,
        learningPieces: n.ref.learningPieces, learningStart: n.ref.learningStart,
        reworkEnabled: n.ref.reworkEnabled
    });
    S.push(clone);
    if (stats.scrapByStation) stats.scrapByStation.push(0);
    STATION_COUNT = S.length;
    const newId = `stn${S.length - 1}`;
    nodes.push({
        id: newId, type: 'STATION',
        x: n.x, y: n.y + NODE_H + 30, // posiciona logo abaixo
        name: clone.name, ref: clone
    });
    rebuildNodeIndex();
    // Replica edges de entrada/saída do nó original para o clone
    const ups = upstreamOf(nodeId);
    const downs = downstreamOf(nodeId);
    for (const e of ups) {
        edges.push({ id: `e_${nextEdgeId++}`, from: e.from, to: newId, transit: e.transit || 0 });
    }
    for (const e of downs) {
        edges.push({ id: `e_${nextEdgeId++}`, from: newId, to: e.to, transit: e.transit || 0 });
    }
    syncLinearView();
    buildDOM();
    updateBottlenecks(); calculateInitialMeta(); renderMap();
    showToast(`Estação dividida — agora há 2 paralelas (${clone.name})`);
}

function deleteEdge(edgeId) {
    edges = edges.filter(e => e.id !== edgeId);
    syncLinearView();
    renderMap();
}

function startConnectFromNode(nodeId) {
    connectSrcId = nodeId;
    editorMode = 'connecting';
    for (const b of ['connect', 'delete']) {
        const el = document.getElementById(`btnMode-${b}`);
        if (el) el.classList.toggle('mode-on', b === 'connect');
    }
    showToast('Agora clique no nó de destino (ESC cancela)');
    renderMap();
}

function createEdge(fromId, toId) {
    if (fromId === toId) return showToast('Origem e destino iguais', true);
    if (edges.some(e => e.from === fromId && e.to === toId)) return showToast('Edge já existe', true);
    const src = nodeById.get(fromId), dst = nodeById.get(toId);
    if (!src || !dst) return;
    if (src.type === 'SINK') return showToast('SINK não tem saídas', true);
    if (dst.type === 'SOURCE') return showToast('SOURCE não tem entradas', true);
    edges.push({ id: `e_${nextEdgeId++}`, from: fromId, to: toId, transit: TRANSIT_TIME });
    syncLinearView();
    setEditorMode('idle'); // volta a idle após criar
    renderMap();
    showToast(`Conectado: ${src.name} → ${dst.name}`);
}

// Detecta topologia linear (sem bifurcações). Quando não-linear, o board
// horizontal não consegue representar fielmente — mostramos aviso.
function isLinearTopology() {
    for (const n of nodes) {
        if (n.type !== 'SINK' && downstreamOf(n.id).length > 1) return false;
        if (n.type !== 'SOURCE' && upstreamOf(n.id).length > 1) return false;
    }
    return true;
}

// Sincroniza vista linear vs aviso de topologia não-linear
function syncLinearView() {
    const board = document.getElementById('board');
    let warn = document.getElementById('linearWarn');
    if (!warn) {
        warn = document.createElement('div');
        warn.id = 'linearWarn';
        warn.className = 'linear-warn';
        warn.innerHTML = '⚠ <b>Topologia não-linear detectada</b> — a vista lado-a-lado não consegue mostrar bifurcações/junções. Use o <b>🗺 MAPA</b> para visualizar e editar a linha completa.';
        document.querySelector('.main').appendChild(warn);
    }
    if (isLinearTopology()) {
        board.style.display = '';
        warn.classList.remove('show');
    } else {
        board.style.display = 'none';
        warn.classList.add('show');
    }
}

// Aplica uma topologia importada de JSON: substitui nodes/edges atuais,
// preservando refs de STATIONs (via stationIdx) e materializando buffers
// novos (não-cadeia) a partir do snapshot embutido.
function applyTopology(topo) {
    nodes = [];
    edges = [];
    // SOURCE (sempre 1)
    const srcNode = topo.nodes.find(n => n.type === 'SOURCE');
    const sinkNode = topo.nodes.find(n => n.type === 'SINK');
    for (const tn of topo.nodes) {
        let ref = null;
        if (tn.type === 'SOURCE') ref = buffers.raw;
        else if (tn.type === 'SINK') ref = null;
        else if (tn.type === 'STATION') ref = S[tn.stationIdx];
        else if (tn.type === 'BUFFER') {
            ref = makeWip();
            if (tn.buf) {
                ref.max = tn.buf.max || 50;
                ref.ready = tn.buf.ready || 0;
                ref.dwell = tn.buf.dwell || 0;
            }
        }
        if (tn.type === 'STATION' && !ref) continue; // STATION sem ref válida
        nodes.push({ id: tn.id, type: tn.type, x: tn.x || 0, y: tn.y || 0, name: tn.name || tn.id, ref });
    }
    rebuildNodeIndex();
    for (const te of topo.edges) {
        if (!nodeById.has(te.from) || !nodeById.has(te.to)) continue;
        edges.push({ id: te.id, from: te.from, to: te.to, transit: te.transit || 0, style: te.style });
    }
    if (topo.edgeStyle === 'L' || topo.edgeStyle === 'Bezier') {
        globalEdgeStyle = topo.edgeStyle;
        const btn = document.getElementById('btnEdgeStyle');
        if (btn) btn.textContent = `⤳ Setas: ${globalEdgeStyle}`;
    }
    if (topo.floorPlan && topo.floorPlan.data) {
        floorPlanData = topo.floorPlan.data;
        floorPlanOpacity = (typeof topo.floorPlan.opacity === 'number') ? topo.floorPlan.opacity : 0.5;
        const ctrl = document.getElementById('floorplanCtrl'); if (ctrl) ctrl.style.display = 'flex';
        const op = document.getElementById('floorOpacity'); if (op) op.value = Math.round(floorPlanOpacity * 100);
    }
    // Substitui buffers.wips pela ordem topológica de BUFFERs (para vista linear se aplicável)
    buffers.wips = nodes.filter(n => n.type === 'BUFFER').map(n => n.ref);
    // Atualiza próximos IDs auto
    for (const n of nodes) {
        const m = n.id.match(/^buf_(\d+)$/); if (m) nextBufId = Math.max(nextBufId, parseInt(m[1]) + 1);
    }
    for (const e of edges) {
        const m = e.id.match(/^e_(\d+)$/); if (m) nextEdgeId = Math.max(nextEdgeId, parseInt(m[1]) + 1);
    }
}

// Override do click handler em nós (extensão de initMapInteractions)
function handleNodeClick(nodeId) {
    if (editorMode === 'connecting') {
        if (!connectSrcId) { connectSrcId = nodeId; renderMap(); }
        else { createEdge(connectSrcId, nodeId); connectSrcId = null; }
        return;
    }
    if (editorMode === 'deleting') { deleteNode(nodeId); return; }
    selectNode(nodeId);
}

function handleEdgeClick(edgeId, ev) {
    if (editorMode === 'deleting') { deleteEdge(edgeId); return; }
    // Bloco 7.2: em qualquer modo, mostra popover na posição com botão apagar
    showEdgePopover(edgeId, ev);
}

function showEdgePopover(edgeId, ev) {
    const e = edges.find(x => x.id === edgeId); if (!e) return;
    const src = nodeById.get(e.from), dst = nodeById.get(e.to);
    if (!src || !dst) return;
    // Remove popover anterior
    document.querySelectorAll('.edge-popover').forEach(el => el.remove());
    const pop = document.createElement('div');
    pop.className = 'edge-popover';
    const styleNext = (e.style === 'L') ? 'Bezier' : 'L';
    pop.innerHTML = `
        <div class="edge-popover-title">${src.name} → ${dst.name}</div>
        <button onclick="toggleEdgeStyle('${edgeId}')" title="Alterna entre Bezier curvo e L ortogonal">⤳ ${styleNext}</button>
        <button class="danger" onclick="deleteEdge('${edgeId}'); document.querySelectorAll('.edge-popover').forEach(el=>el.remove());">🗑 Apagar</button>
    `;
    const left = ev ? ev.clientX : (window.innerWidth / 2);
    const top = ev ? ev.clientY : (window.innerHeight / 2);
    pop.style.left = `${left}px`;
    pop.style.top = `${top}px`;
    document.body.appendChild(pop);
    // Fecha ao clicar fora
    setTimeout(() => {
        const close = e2 => { if (!e2.target.closest('.edge-popover')) { pop.remove(); document.removeEventListener('pointerdown', close); } };
        document.addEventListener('pointerdown', close);
    }, 50);
}

function toggleEdgeStyle(edgeId) {
    const e = edges.find(x => x.id === edgeId); if (!e) return;
    e.style = (e.style === 'L') ? 'Bezier' : 'L';
    document.querySelectorAll('.edge-popover').forEach(el => el.remove());
    renderMap();
}

// Anima uma peça ao longo do path SVG da edge (Bloco 6.4).
// Chamada como hook adicional ao spawnAnimBox quando o mapa está aberto.
function spawnAnimEdge(fromNodeId, toNodeId, type, duration) {
    if (!mapOpen) return;
    const layer = document.getElementById('mapAnim');
    if (!layer) return;
    // Encontra a aresta exata
    const edge = edges.find(e => e.from === fromNodeId && e.to === toNodeId);
    let pathD;
    if (edge) {
        const path = document.getElementById(`path_${edge.id}`);
        if (path) pathD = path; // usar elemento real para getPointAtLength
    }
    if (!pathD) {
        const src = nodeById.get(fromNodeId), dst = nodeById.get(toNodeId);
        if (!src || !dst) return;
        // path temporário
        const tmp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tmp.setAttribute('d', edgePath(src, dst));
        tmp.style.display = 'none';
        layer.appendChild(tmp);
        pathD = tmp;
    }
    const len = pathD.getTotalLength();
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('class', 'map-anim-piece');
    dot.setAttribute('r', '5');
    dot.setAttribute('fill', type === 'scrap' ? '#ef4444' : '#22c55e');
    dot.setAttribute('stroke', '#fff');
    dot.setAttribute('stroke-width', '1');
    layer.appendChild(dot);
    const dur = Math.max(120, (duration || 800) / timeScale);
    const start = performance.now();
    function step(now) {
        const f = Math.min(1, (now - start) / dur);
        const p = pathD.getPointAtLength(f * len);
        dot.setAttribute('cx', p.x);
        dot.setAttribute('cy', p.y);
        if (f < 1) requestAnimationFrame(step);
        else { dot.remove(); if (pathD.style && pathD.style.display === 'none') pathD.remove(); }
    }
    requestAnimationFrame(step);
}

// === Bloco 5: Preferências ===
function openPrefs() {
    document.getElementById('dataMenu').classList.remove('open');
    document.getElementById('prefBalance').value = PREFS.balanceThreshold;
    document.getElementById('prefHistory').value = PREFS.sparklineHistory;
    document.getElementById('prefHeatmap').value = PREFS.heatmapMaxSamples;
    document.getElementById('prefInterval').value = PREFS.chartUpdateInterval;
    document.getElementById('prefP90').checked = !!PREFS.estimateConfidence;
    document.getElementById('prefsModal').style.display = 'block';
}
function closePrefs() {
    // Aplica
    PREFS.balanceThreshold = Math.max(0, parseFloat(document.getElementById('prefBalance').value) || 0);
    PREFS.sparklineHistory = clamp(parseInt(document.getElementById('prefHistory').value) || 50, 10, 500);
    PREFS.heatmapMaxSamples = clamp(parseInt(document.getElementById('prefHeatmap').value) || 600, 100, 5000);
    PREFS.chartUpdateInterval = clamp(parseFloat(document.getElementById('prefInterval').value) || 0.5, 0.1, 5);
    PREFS.estimateConfidence = !!document.getElementById('prefP90').checked;
    document.getElementById('prefsModal').style.display = 'none';
    updateBottlenecks(); render();
    showToast('Preferências atualizadas');
}
function resetPrefs() {
    PREFS = { ...PREFS_DEFAULTS };
    document.getElementById('prefBalance').value = PREFS.balanceThreshold;
    document.getElementById('prefHistory').value = PREFS.sparklineHistory;
    document.getElementById('prefHeatmap').value = PREFS.heatmapMaxSamples;
    document.getElementById('prefInterval').value = PREFS.chartUpdateInterval;
    document.getElementById('prefP90').checked = PREFS.estimateConfidence;
}

// === Bloco 4: Cenários e Comparador ===
const SCENARIOS = [
    {
        id: 'balanced',
        title: 'Linha Balanceada',
        objective: 'Demonstrar uma linha equilibrada (CT iguais)',
        desc: 'Todas as estações com a mesma capacidade efetiva. Observe que mesmo balanceada, o sistema tem perdas por starving devido às variações estatísticas (sem MTBF aqui, só ruído de qualidade).',
        tags: ['TOC', 'Iniciante'],
        config: {
            stationCount: 3, stock: 200, target: 100, transit: 0, timeScale: 4,
            stations: [
                { ppmNom: 60, Aset: 0.95, Pset: 1, Qset: 0.98, setupConfig: 0 },
                { ppmNom: 60, Aset: 0.95, Pset: 1, Qset: 0.98, setupConfig: 0 },
                { ppmNom: 60, Aset: 0.95, Pset: 1, Qset: 0.98, setupConfig: 0 },
            ],
            wipInit: [10, 10], wipMax: [50, 50]
        }
    },
    {
        id: 'mid-bottleneck',
        title: 'Gargalo no Meio',
        objective: 'Identificar e quantificar o efeito de um gargalo central',
        desc: 'A estação 2 tem metade do PPM. Observe o WIP a acumular antes dela e a estação 3 a sofrer starving. A linha inteira opera ao ritmo do gargalo.',
        tags: ['TOC', 'Gargalo'],
        config: {
            stationCount: 4, stock: 250, target: 80, transit: 0, timeScale: 4,
            stations: [
                { ppmNom: 80, Aset: 0.95, Pset: 1, Qset: 1, setupConfig: 0 },
                { ppmNom: 80, Aset: 0.95, Pset: 1, Qset: 1, setupConfig: 0 },
                { ppmNom: 40, Aset: 0.95, Pset: 1, Qset: 1, setupConfig: 0 },
                { ppmNom: 80, Aset: 0.95, Pset: 1, Qset: 1, setupConfig: 0 },
            ],
            wipInit: [5, 5, 5], wipMax: [40, 40, 40]
        }
    },
    {
        id: 'starve-cascade',
        title: 'Starving em Cascata',
        objective: 'Visualizar como uma estação inicial lenta esgota toda a linha',
        desc: 'A estação 1 é o gargalo e tem baixa disponibilidade (MTBF baixo). As estações seguintes vão alternar entre AGUARDANDO e processamento. Observe o heatmap.',
        tags: ['MTBF', 'Avançado'],
        config: {
            stationCount: 3, stock: 200, target: 100, transit: 0, timeScale: 4,
            stations: [
                { ppmNom: 40, Aset: 1, Pset: 1, Qset: 1, setupConfig: 0, mtbfMin: 3, mttrMin: 1 },
                { ppmNom: 80, Aset: 0.98, Pset: 1, Qset: 1, setupConfig: 0 },
                { ppmNom: 80, Aset: 0.98, Pset: 1, Qset: 1, setupConfig: 0 },
            ],
            wipInit: [0, 0], wipMax: [30, 30]
        }
    },
    {
        id: 'quality-killer',
        title: 'Refugo Concentrado',
        objective: 'Demonstrar impacto da qualidade no throughput',
        desc: 'A estação 2 tem Q=80% (alta taxa de refugo). Note como o gargalo aparente muda quando se considera apenas peças boas. Active o REWORK para ver o impacto no tempo.',
        tags: ['Qualidade', 'Rework'],
        config: {
            stationCount: 3, stock: 300, target: 80, transit: 0, timeScale: 4,
            stations: [
                { ppmNom: 60, Aset: 0.95, Pset: 1, Qset: 1, setupConfig: 0 },
                { ppmNom: 60, Aset: 0.95, Pset: 1, Qset: 0.8, setupConfig: 0 },
                { ppmNom: 60, Aset: 0.95, Pset: 1, Qset: 1, setupConfig: 0 },
            ],
            wipInit: [5, 5], wipMax: [50, 50]
        }
    },
    {
        id: 'setup-trade-off',
        title: 'Lotes vs Setup (SMED)',
        objective: 'Explorar trade-off entre tamanho de lote e tempo de setup',
        desc: 'Cada estação tem setup longo (3 min) acionado a cada 20 peças. Tente reduzir setupConfig para 0.5 min e veja o ganho — é o princípio do SMED (troca rápida).',
        tags: ['Setup', 'SMED', 'Lotes'],
        config: {
            stationCount: 3, stock: 200, target: 60, transit: 0, timeScale: 4,
            stations: [
                { ppmNom: 60, Aset: 0.98, Pset: 1, Qset: 0.99, setupConfig: 3, batchSize: 20 },
                { ppmNom: 60, Aset: 0.98, Pset: 1, Qset: 0.99, setupConfig: 3, batchSize: 20 },
                { ppmNom: 60, Aset: 0.98, Pset: 1, Qset: 0.99, setupConfig: 3, batchSize: 20 },
            ],
            wipInit: [10, 10], wipMax: [60, 60]
        }
    },
    {
        id: 'learning-curve',
        title: 'Curva de Aprendizagem',
        objective: 'Visualizar o efeito de operadores em treino',
        desc: 'Todas as estações começam a 50% do P nominal e melhoram ao longo de 40 peças. Útil para simular ramp-up de turno ou novo produto. O PPM real cresce ao longo do tempo.',
        tags: ['Aprendizagem', 'Lean'],
        config: {
            stationCount: 3, stock: 200, target: 80, transit: 0, timeScale: 4,
            stations: [
                { ppmNom: 60, Aset: 0.97, Pset: 1, Qset: 0.99, setupConfig: 0, learningPieces: 40, learningStart: 0.5 },
                { ppmNom: 60, Aset: 0.97, Pset: 1, Qset: 0.99, setupConfig: 0, learningPieces: 40, learningStart: 0.5 },
                { ppmNom: 60, Aset: 0.97, Pset: 1, Qset: 0.99, setupConfig: 0, learningPieces: 40, learningStart: 0.5 },
            ],
            wipInit: [10, 10], wipMax: [50, 50]
        }
    },
    {
        id: 'parallel-branch',
        title: 'Linha com Paralelo (Bifurcação)',
        objective: 'Demonstrar topologia em grafo: 1 → 2 paralelas → 1',
        desc: 'A estação E1 (60 PPM) alimenta um buffer que distribui para 2 estações paralelas E2/E3 (30 PPM cada) via shortest-queue. As peças convergem num buffer comum antes da saída. Abra o MAPA para visualizar. Desabilite uma das paralelas via toggle da estação para ver o throughput cair.',
        tags: ['Topologia', 'Paralelo', 'Avançado'],
        config: {
            stationCount: 3, stock: 300, target: 120, transit: 0, timeScale: 4,
            stations: [
                { ppmNom: 60, Aset: 0.95, Pset: 1, Qset: 1, setupConfig: 0 },
                { ppmNom: 30, Aset: 0.95, Pset: 1, Qset: 1, setupConfig: 0 },
                { ppmNom: 30, Aset: 0.95, Pset: 1, Qset: 1, setupConfig: 0 },
            ],
            wipInit: [], wipMax: [], wipDwell: [],
            topology: {
                nodes: [
                    { id: 'src',  type: 'SOURCE',  x:   0, y: 250, name: 'ESTOQUE' },
                    { id: 'stn0', type: 'STATION', x: 200, y: 250, name: 'E1', stationIdx: 0 },
                    { id: 'bufA', type: 'BUFFER',  x: 400, y: 250, name: 'WIP A', buf: { ready: 5, max: 50, dwell: 0 } },
                    { id: 'stn1', type: 'STATION', x: 600, y: 130, name: 'E2 ║', stationIdx: 1 },
                    { id: 'stn2', type: 'STATION', x: 600, y: 370, name: 'E3 ║', stationIdx: 2 },
                    { id: 'bufB', type: 'BUFFER',  x: 800, y: 250, name: 'WIP B', buf: { ready: 0, max: 50, dwell: 0 } },
                    { id: 'sink', type: 'SINK',    x: 1000, y: 250, name: 'FINAL' }
                ],
                edges: [
                    { id: 'e_src_stn0',  from: 'src',  to: 'stn0' },
                    { id: 'e_stn0_bufA', from: 'stn0', to: 'bufA' },
                    { id: 'e_bufA_stn1', from: 'bufA', to: 'stn1' },
                    { id: 'e_bufA_stn2', from: 'bufA', to: 'stn2' },
                    { id: 'e_stn1_bufB', from: 'stn1', to: 'bufB' },
                    { id: 'e_stn2_bufB', from: 'stn2', to: 'bufB' },
                    { id: 'e_bufB_sink', from: 'bufB', to: 'sink' }
                ]
            }
        }
    }
];

function openScenarios() {
    const grid = document.getElementById('scenariosGrid');
    grid.innerHTML = SCENARIOS.map(s => `
        <div class="scenario-card" onclick="loadScenario('${s.id}')">
            <div class="scenario-title">${s.title}</div>
            <div class="scenario-objective">🎯 ${s.objective}</div>
            <div class="scenario-desc">${s.desc}</div>
            <div class="scenario-tags">${s.tags.map(t => `<span class="scenario-tag">${t}</span>`).join('')}</div>
        </div>
    `).join('');
    document.getElementById('scenariosModal').style.display = 'block';
}
function closeScenarios() { document.getElementById('scenariosModal').style.display = 'none'; }

function loadScenario(id) {
    const sc = SCENARIOS.find(s => s.id === id);
    if (!sc) return;
    const cfg = JSON.parse(JSON.stringify(sc.config));
    // Normaliza estações com defaults
    cfg.stations = cfg.stations.map((s, idx) => ({
        enabled: true, name: `ESTAÇÃO ${idx+1}`,
        ppmNom: 60, Aset: 1, Pset: 1, Qset: 1, setupConfig: 0,
        batchSize: 0, mtbfMin: 0, mttrMin: 5,
        learningPieces: 0, learningStart: 0.6, reworkEnabled: false,
        ...s
    }));
    cfg.version = cfg.topology ? 2 : 1;
    applyConfig(cfg);
    closeScenarios();
    showToast(`Cenário carregado: ${sc.title}`);
    // Bloco 6.6 / 7.4: se o cenário traz topologia, abre o MAPA e auto-layout
    if (cfg.topology) setTimeout(() => { openMap(); autoLayoutMap(); }, 100);
}

// --- Comparador ---
let _cmpA = null, _cmpB = null;

function openCompare() {
    document.getElementById('compareModal').style.display = 'block';
    renderCompare();
}
function closeCompare() { document.getElementById('compareModal').style.display = 'none'; }

function loadCompareFile(ev, slot) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            if (slot === 'A') _cmpA = { name: file.name, data };
            else _cmpB = { name: file.name, data };
            renderCompare();
            showToast(`Snapshot ${slot} carregado`);
        } catch (err) { showToast('Erro: ' + err.message, true); }
    };
    reader.readAsText(file);
    ev.target.value = '';
}

function useCurrentAsCompare(slot) {
    const snap = {
        ...collectConfig(),
        runtime: {
            t, finalTime, lineStarted, seed_active: _activeSeed,
            stats: { good: stats.good, scrap: stats.scrap },
            stations: S.map(s => ({
                name: s.name, totalCount: s.totalCount, goodCount: s.goodCount,
                tRun: s.tRun, tSetup: s.tSetup, tDown: s.tDown,
                tBlocked: s.tBlocked, tStarved: s.tStarved, tIdle: s.tIdle,
                idealTime: s.idealTime
            }))
        }
    };
    const wrapped = { name: `Atual (t=${fmtMMSSd(t)})`, data: snap };
    if (slot === 'A') _cmpA = wrapped; else _cmpB = wrapped;
    renderCompare();
    showToast(`Estado atual definido como ${slot}`);
}

function snapshotKPIs(snap) {
    if (!snap || !snap.data) return null;
    const d = snap.data;
    const rt = d.runtime || {};
    const stations = rt.stations || [];
    let totRun = 0, totIdeal = 0, totPlanned = 0, totGood = 0, totTotal = 0;
    stations.forEach(s => {
        const planned = (s.tRun||0) + (s.tDown||0) + (s.tStarved||0) + (s.tBlocked||0) + (s.tSetup||0) + (s.tIdle||0);
        totRun += s.tRun || 0; totIdeal += s.idealTime || 0;
        totPlanned += planned; totGood += s.goodCount || 0; totTotal += s.totalCount || 0;
    });
    const elapsed = rt.t || 0;
    const good = rt.stats?.good || 0;
    const scrap = rt.stats?.scrap || 0;
    return {
        elapsed,
        good, scrap,
        finished: rt.finalTime != null,
        throughput: elapsed > 0 ? (good / (elapsed/60)) : 0,
        stationCount: d.stationCount || stations.length,
        target: d.target || 0,
        seed: rt.seed_active ?? d.seed,
        oeeLine: totPlanned > 0 ? (totRun/totPlanned) * (totRun > 0 ? totIdeal/totRun : 1) * (totTotal > 0 ? totGood/totTotal : 1) : 0,
        stations
    };
}

function renderCompare() {
    const cA = document.getElementById('cmpColA');
    const cB = document.getElementById('cmpColB');
    const diff = document.getElementById('cmpDiff');
    const fmtCol = (slot, snap) => {
        if (!snap) return `<div class="empty-note">Carregue um snapshot ${slot}</div>`;
        const k = snapshotKPIs(snap);
        const row = (l, v) => `<div style="display:flex; justify-content:space-between; padding:4px 2px; font-size:11px; border-bottom:1px dotted rgba(255,255,255,0.06);"><span>${l}</span><span style="font-weight:700;">${v}</span></div>`;
        return `
            <div class="compare-head"><span>${slot}: ${snap.name}</span><span style="font-size:10px; color: var(--gray);">seed=${k.seed || '—'}</span></div>
            ${row('Tempo decorrido', fmtMMSSd(k.elapsed))}
            ${row('Bons', k.good)}
            ${row('Refugo', k.scrap)}
            ${row('Throughput', k.throughput.toFixed(1) + ' ppm')}
            ${row('OEE linha (aprox)', (k.oeeLine*100).toFixed(1) + '%')}
            ${row('Estações', k.stationCount)}
            ${row('Meta', k.target)}
            ${row('Concluído', k.finished ? 'Sim' : 'Não')}
        `;
    };
    cA.innerHTML = fmtCol('A', _cmpA);
    cB.innerHTML = fmtCol('B', _cmpB);

    if (_cmpA && _cmpB) {
        const a = snapshotKPIs(_cmpA), b = snapshotKPIs(_cmpB);
        const cmp = (label, va, vb, isPctOrUnit, betterUp) => {
            const delta = vb - va;
            const pct = va !== 0 ? (delta/Math.abs(va))*100 : 0;
            const dir = Math.abs(delta) < 1e-6 ? 'flat' : (delta > 0 ? 'up' : 'down');
            const isGood = (betterUp && delta > 0) || (!betterUp && delta < 0);
            const arrow = dir === 'flat' ? '—' : (isGood ? '✓' : '✗');
            return `<div class="compare-row">
                <span><strong>${label}</strong></span>
                <span>${typeof va === 'number' ? (isPctOrUnit === '%' ? (va*100).toFixed(1)+'%' : va.toFixed(1)+(isPctOrUnit||'')) : va}</span>
                <span>${typeof vb === 'number' ? (isPctOrUnit === '%' ? (vb*100).toFixed(1)+'%' : vb.toFixed(1)+(isPctOrUnit||'')) : vb}</span>
                <span class="delta ${dir}">${arrow} ${delta >= 0 ? '+' : ''}${pct.toFixed(1)}%</span>
            </div>`;
        };
        diff.innerHTML = `
            <h3 style="font-size:14px; color: var(--cyan); margin-bottom:8px;">Δ A → B</h3>
            <div class="compare-row header"><span>Métrica</span><span>A</span><span>B</span><span style="text-align:right;">Δ</span></div>
            ${cmp('Bons', a.good, b.good, '', true)}
            ${cmp('Refugo', a.scrap, b.scrap, '', false)}
            ${cmp('Throughput (ppm)', a.throughput, b.throughput, '', true)}
            ${cmp('OEE linha', a.oeeLine, b.oeeLine, '%', true)}
            ${cmp('Tempo decorrido (s)', a.elapsed, b.elapsed, 's', false)}
        `;
    } else {
        diff.innerHTML = '';
    }
}

// === Bloco 2: Export, Import, Save/Load, Sankey ===
function showToast(msg, isError) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.toggle('error', !!isError);
    el.classList.add('show');
    clearTimeout(el._tHide);
    el._tHide = setTimeout(() => el.classList.remove('show'), 2400);
}

function toggleDataMenu(ev) {
    ev.stopPropagation();
    document.getElementById('dataMenu').classList.toggle('open');
}

function collectConfig() {
    const wI = [], wM = [];
    for (let i = 0; i < STATION_COUNT - 1; i++) {
        wI.push(parseInt(document.getElementById(`wipInitInput_${i}`)?.value) || 0);
        wM.push(parseInt(document.getElementById(`wipMaxInput_${i}`)?.value) || 100);
    }
    return {
        version: 1,
        savedAt: new Date().toISOString(),
        stationCount: STATION_COUNT,
        transit: TRANSIT_TIME,
        stock: buffers.raw.stock,
        target: buffers.raw.target,
        stockInf: !!buffers.raw.stockInf,
        targetInf: !!buffers.raw.targetInf,
        timeScale,
        flushLine,
        makeToGood,
        seed: document.getElementById('seedInput')?.value || '0',
        prefs: { ...PREFS },
        wipInit: wI,
        wipMax: wM,
        wipDwell: buffers.wips.map(w => w.dwell || 0),
        // Bloco 6.5: topologia em grafo (apenas se diferir do auto-gerado linear)
        topology: isLinearTopology() ? null : {
            nodes: nodes.map(n => ({
                id: n.id, type: n.type, x: n.x, y: n.y, name: n.name,
                // Para nós BUFFER novos (não-cadeia), guardar refs explícitas
                buf: n.type === 'BUFFER' ? { ready: n.ref.ready, max: n.ref.max, dwell: n.ref.dwell } : undefined,
                stationIdx: n.type === 'STATION' ? S.indexOf(n.ref) : undefined
            })),
            edges: edges.map(e => ({ id: e.id, from: e.from, to: e.to, transit: e.transit || 0, style: e.style })),
            edgeStyle: globalEdgeStyle,
            floorPlan: floorPlanData ? { data: floorPlanData, opacity: floorPlanOpacity } : null
        },
        stations: S.map(s => ({
            enabled: s.enabled, name: s.name, ppmNom: s.ppmNom,
            Aset: s.Aset, Pset: s.Pset, Qset: s.Qset, setupConfig: s.setupConfig,
            batchSize: s.batchSize, mtbfMin: s.mtbfMin, mttrMin: s.mttrMin,
            learningPieces: s.learningPieces, learningStart: s.learningStart,
            reworkEnabled: s.reworkEnabled
        }))
    };
}

function applyConfig(cfg) {
    if (!cfg || typeof cfg !== 'object') throw new Error('Configuração inválida');
    if (cfg.stationCount && cfg.stationCount !== STATION_COUNT) {
        STATION_COUNT = clamp(parseInt(cfg.stationCount) || 3, 1, 99);
        document.getElementById('stationsSelect').value = STATION_COUNT;
    }
    TRANSIT_TIME = Math.max(0, parseInt(cfg.transit) || 0);
    document.getElementById('transitTimeInput').value = TRANSIT_TIME;
    timeScale = parseInt(cfg.timeScale) || 1;
    document.getElementById('speedSelect').value = timeScale;
    flushLine = !!cfg.flushLine;
    document.getElementById('chkFlushLine').checked = flushLine;
    makeToGood = !!cfg.makeToGood;
    if (cfg.seed !== undefined) document.getElementById('seedInput').value = String(cfg.seed);
    if (cfg.prefs && typeof cfg.prefs === 'object') {
        PREFS = { ...PREFS_DEFAULTS, ...cfg.prefs };
    }

    buffers.raw.stock = parseInt(cfg.stock) || 100;
    buffers.raw.target = parseInt(cfg.target) || 60;
    buffers.raw.stockInf = !!cfg.stockInf;
    buffers.raw.targetInf = !!cfg.targetInf;
    buffers.raw.count = buffers.raw.stockInf ? Infinity : buffers.raw.stock;
    if (buffers.raw.targetInf) buffers.raw.target = Infinity;

    S = [];
    for (let i = 0; i < STATION_COUNT; i++) {
        const st = stationTemplate(i);
        const src = cfg.stations && cfg.stations[i];
        if (src) Object.assign(st, {
            enabled: src.enabled !== false,
            name: src.name || st.name,
            ppmNom: parseFloat(src.ppmNom) || 60,
            Aset: clamp01(parseFloat(src.Aset) ?? 1),
            Pset: clamp01(parseFloat(src.Pset) ?? 1),
            Qset: clamp01(parseFloat(src.Qset) ?? 1),
            setupConfig: parseFloat(src.setupConfig) || 0,
            batchSize: Math.max(0, parseInt(src.batchSize) || 0),
            mtbfMin: Math.max(0, parseFloat(src.mtbfMin) || 0),
            mttrMin: Math.max(0, parseFloat(src.mttrMin) || 5),
            learningPieces: Math.max(0, parseInt(src.learningPieces) || 0),
            learningStart: clamp01(parseFloat(src.learningStart) ?? 0.6),
            reworkEnabled: !!src.reworkEnabled,
        });
        S.push(st);
    }
    buffers.wips = [];
    for (let i = 0; i < STATION_COUNT - 1; i++) {
        const w = makeWip();
        w.max = (cfg.wipMax && cfg.wipMax[i]) || 100;
        w.ready = (cfg.wipInit && cfg.wipInit[i]) || 0;
        w.dwell = Math.max(0, parseFloat(cfg.wipDwell && cfg.wipDwell[i]) || 0);
        buffers.wips.push(w);
    }

    running = false; lineStarted = false; t = 0; finalTime = null;
    initialWipAtStart = 0; targetAtStart = 0; fixedInitialEstimate = null;
    historyOEE = []; historyPPM = [];
    stateHistory = []; lastSnapshot = -1;
    stats = { good: 0, scrap: 0, scrapByStation: Array(STATION_COUNT).fill(0) };
    transfers.length = 0;

    document.getElementById('chartOEE').innerHTML = '';
    document.getElementById('chartPPM').innerHTML = '';

    // Bloco 1 (Grafo): sincroniza espelho de topologia
    rebuildLinearGraph();
    // Bloco 6.5: restaura topologia em grafo se o config a tiver
    if (cfg.topology && Array.isArray(cfg.topology.nodes) && Array.isArray(cfg.topology.edges)) {
        applyTopology(cfg.topology);
    }

    if (typeof unparkStationCard === 'function') unparkStationCard();
    buildDOM();
    if (typeof syncLinearView === 'function') syncLinearView();
    refreshStockTargetUI();
    calculateInitialMeta();
    render();
    document.getElementById('btnStart').innerHTML = '<span>▶</span> INICIAR';
    document.getElementById('animLayer').innerHTML = '';
}

function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

function tsForFilename() {
    const d = new Date(), p = n => String(n).padStart(2,'0');
    return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function exportCSV() {
    document.getElementById('dataMenu').classList.remove('open');
    const headers = [
        'estacao','nome','ativa','ppm_nom','A_set','P_set','Q_set','setup_min',
        'tempo_run_s','tempo_setup_s','tempo_down_s','tempo_blocked_s','tempo_starved_s','tempo_idle_s',
        'ideal_time_s','total_pecas','boas','refugo','OEE','A_real','P_real','Q_real'
    ];
    const rows = [headers.join(',')];
    S.forEach((st, i) => {
        const k = oeeCalcStation(st);
        const scrap = st.totalCount - st.goodCount;
        rows.push([
            i+1, `"${(st.name||'').replace(/"/g,'""')}"`, st.enabled ? 1 : 0,
            st.ppmNom, st.Aset.toFixed(4), st.Pset.toFixed(4), st.Qset.toFixed(4), st.setupConfig,
            st.tRun.toFixed(2), st.tSetup.toFixed(2), st.tDown.toFixed(2),
            st.tBlocked.toFixed(2), st.tStarved.toFixed(2), st.tIdle.toFixed(2),
            st.idealTime.toFixed(2), st.totalCount, st.goodCount, scrap,
            k.OEE.toFixed(4), k.A.toFixed(4), k.P.toFixed(4), k.Q.toFixed(4)
        ].join(','));
    });
    // Linha de totais da linha
    rows.push('');
    rows.push('# Resumo da linha');
    rows.push(`tempo_decorrido_s,${t.toFixed(2)}`);
    rows.push(`finalizada,${finalTime !== null ? 1 : 0}`);
    rows.push(`bons_total,${stats.good}`);
    rows.push(`refugo_total,${stats.scrap}`);
    rows.push(`throughput_ppm,${t > 0 ? (stats.good/(t/60)).toFixed(2) : 0}`);
    rows.push(`takt_s,${calcTaktTime().toFixed(2)}`);
    rows.push(`seed,${_activeSeed || 'random'}`);

    downloadFile(`sim-oee-kpis-${tsForFilename()}.csv`, rows.join('\n'), 'text/csv');
    showToast('CSV exportado');
}

function exportSnapshot() {
    document.getElementById('dataMenu').classList.remove('open');
    const snap = {
        ...collectConfig(),
        runtime: {
            t, finalTime, lineStarted, running,
            seed_active: _activeSeed,
            stats: { good: stats.good, scrap: stats.scrap, scrapByStation: stats.scrapByStation },
            stations: S.map(s => ({
                name: s.name, totalCount: s.totalCount, goodCount: s.goodCount,
                tRun: s.tRun, tSetup: s.tSetup, tDown: s.tDown, tBlocked: s.tBlocked,
                tStarved: s.tStarved, tIdle: s.tIdle, idealTime: s.idealTime,
                state: s.state
            })),
            stateHistory
        }
    };
    downloadFile(`sim-oee-snapshot-${tsForFilename()}.json`, JSON.stringify(snap, null, 2), 'application/json');
    showToast('Snapshot exportado');
}

function saveConfig() {
    document.getElementById('dataMenu').classList.remove('open');
    const cfg = collectConfig();
    downloadFile(`sim-oee-config-${tsForFilename()}.json`, JSON.stringify(cfg, null, 2), 'application/json');
    showToast('Configuração guardada');
}

function loadConfigFile(ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const cfg = JSON.parse(e.target.result);
            applyConfig(cfg);
            showToast('Configuração carregada');
        } catch (err) {
            showToast('Erro ao carregar: ' + err.message, true);
        }
    };
    reader.readAsText(file);
    ev.target.value = ''; // permite re-carregar o mesmo ficheiro
}

const LS_KEY = 'sim_oee_config_v1';
function saveConfigLocal() {
    document.getElementById('dataMenu').classList.remove('open');
    try {
        localStorage.setItem(LS_KEY, JSON.stringify(collectConfig()));
        showToast('Guardado no browser');
    } catch (e) { showToast('Falha: ' + e.message, true); }
}
function loadConfigLocal() {
    document.getElementById('dataMenu').classList.remove('open');
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw) { showToast('Nenhuma configuração guardada', true); return; }
        applyConfig(JSON.parse(raw));
        showToast('Configuração restaurada');
    } catch (e) { showToast('Falha: ' + e.message, true); }
}

function renderSankey() {
    const host = document.getElementById('sankeyChart');
    if (!host) return;
    if (!lineStarted) { host.innerHTML = `<div class="empty-note">Inicie a simulação para visualizar o fluxo.</div>`; return; }

    // Modelo simples: cada estação tem entrada (= totalCount) e divide em "passa adiante" e "refugo"
    // Mais o estoque inicial → estação 1
    const W = 980, padL = 80, padR = 120, padT = 30, padB = 30, H = 380;
    const innerW = W - padL - padR;
    const nodeW = 16;
    const cols = STATION_COUNT + 1; // estoque + estações
    const colGap = innerW / (cols - 1);
    const flowMax = Math.max(1, S[0]?.totalCount || 1, buffers.raw.stock);
    const hScale = (H - padT - padB) / flowMax * 0.85;

    let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">`;

    // Calcula posição Y de cada nó (centrado verticalmente, proporcional ao fluxo)
    const nodes = [];
    // Coluna 0: estoque inicial
    nodes.push({ x: padL, label: 'ESTOQUE', flow: S[0]?.totalCount || 0, color: '#94a3b8' });
    for (let i = 0; i < STATION_COUNT; i++) {
        nodes.push({
            x: padL + (i + 1) * colGap,
            label: S[i].name,
            flow: S[i].totalCount,
            color: i === bottleneckId ? '#d946ef' : '#3b82f6'
        });
    }

    // Desenha nós (barras verticais)
    nodes.forEach((n, idx) => {
        const h = Math.max(4, n.flow * hScale);
        const y = (H - h) / 2;
        n.yTop = y; n.yBot = y + h; n.h = h;
        svg += `<rect x="${n.x}" y="${y}" width="${nodeW}" height="${h}" fill="${n.color}" rx="2">`;
        svg += `<title>${n.label}: ${n.flow} peças</title></rect>`;
        svg += `<text x="${n.x + nodeW/2}" y="${y - 6}" fill="#e2e8f0" font-size="10" font-weight="700" text-anchor="middle">${n.label}</text>`;
        svg += `<text x="${n.x + nodeW/2}" y="${n.yBot + 14}" fill="#94a3b8" font-size="10" text-anchor="middle">${n.flow}</text>`;
    });

    // Fluxos entre nós + saída de refugo
    for (let i = 0; i < STATION_COUNT; i++) {
        const src = nodes[i], dst = nodes[i+1];
        const passed = S[i].totalCount; // tudo que entrou na estação
        const good = S[i].goodCount;
        const scrap = passed - good;

        // Fluxo entrada → estação (azul claro)
        const flowH = passed * hScale;
        const y1a = src.yTop, y1b = src.yTop + flowH;
        const y2a = dst.yTop, y2b = dst.yTop + flowH;
        const x1 = src.x + nodeW, x2 = dst.x;
        const cx1 = x1 + (x2 - x1) * 0.5;
        svg += `<path d="M${x1},${y1a} C${cx1},${y1a} ${cx1},${y2a} ${x2},${y2a} L${x2},${y2b} C${cx1},${y2b} ${cx1},${y1b} ${x1},${y1b} Z" fill="rgba(59,130,246,0.35)" stroke="rgba(59,130,246,0.6)" stroke-width="0.5">`;
        svg += `<title>${src.label} → ${dst.label}: ${passed} peças</title></path>`;

        // Fluxo de refugo (vermelho, sai pela base)
        if (scrap > 0) {
            const sh = scrap * hScale;
            const scrapX = dst.x + nodeW;
            const scrapY1 = dst.yBot - sh;
            const scrapY2 = dst.yBot;
            const targetX = scrapX + 50;
            const targetY = H - padB - 10;
            svg += `<path d="M${scrapX},${scrapY1} C${scrapX+30},${scrapY1} ${targetX-20},${targetY-20} ${targetX},${targetY-Math.min(40,sh)} L${targetX},${targetY} C${targetX-20},${targetY} ${scrapX+30},${scrapY2} ${scrapX},${scrapY2} Z" fill="rgba(239,68,68,0.4)" stroke="rgba(239,68,68,0.7)" stroke-width="0.5">`;
            svg += `<title>Refugo em ${dst.label}: ${scrap} peças</title></path>`;
            svg += `<text x="${targetX + 6}" y="${targetY}" fill="#ef4444" font-size="10" font-weight="700">✗ ${scrap}</text>`;
        }
    }

    // Saída final (bons)
    const lastNode = nodes[nodes.length - 1];
    if (stats.good > 0) {
        const finishX = lastNode.x + nodeW + 40;
        const finishY = (H - stats.good * hScale) / 2;
        const finishH = Math.max(4, stats.good * hScale);
        svg += `<rect x="${finishX}" y="${finishY}" width="${nodeW}" height="${finishH}" fill="#22c55e" rx="2">`;
        svg += `<title>BONS: ${stats.good}</title></rect>`;
        svg += `<text x="${finishX + nodeW/2}" y="${finishY - 6}" fill="#22c55e" font-size="10" font-weight="800" text-anchor="middle">BONS</text>`;
        svg += `<text x="${finishX + nodeW/2}" y="${finishY + finishH + 14}" fill="#22c55e" font-size="10" text-anchor="middle">${stats.good}</text>`;
        // Fluxo último nó → finish
        const yA = lastNode.yTop + (lastNode.h - finishH) * 0;
        svg += `<path d="M${lastNode.x + nodeW},${lastNode.yTop} C${lastNode.x + nodeW + 20},${lastNode.yTop} ${finishX - 20},${finishY} ${finishX},${finishY} L${finishX},${finishY + finishH} C${finishX - 20},${finishY + finishH} ${lastNode.x + nodeW + 20},${lastNode.yTop + lastNode.h * (stats.good/(S[S.length-1].totalCount||1))} ${lastNode.x + nodeW},${lastNode.yTop + lastNode.h * (stats.good/(S[S.length-1].totalCount||1))} Z" fill="rgba(34,197,94,0.35)" stroke="rgba(34,197,94,0.6)" stroke-width="0.5"/>`;
    }

    svg += `</svg>`;
    host.innerHTML = svg;
}

window.onload = function() {
    document.getElementById('stationsSelect').onchange = e => { STATION_COUNT = Math.max(1, Math.min(99, parseInt(e.target.value) || 3)); e.target.value = STATION_COUNT; reset(); };
    document.getElementById('transitTimeInput').oninput = e => { TRANSIT_TIME = Math.max(0, parseInt(e.target.value) || 0); calculateInitialMeta(); render(); };
    document.getElementById('speedSelect').onchange = e => { timeScale = parseInt(e.target.value) || 1; };
    const zSlider = document.getElementById('zoomSlider'), zInput = document.getElementById('zoomInput'), board = document.getElementById('board');
    zSlider.oninput = e => { zInput.value = e.target.value; board.style.transform = `scale(${e.target.value / 100})`; };
    zInput.onchange = e => { let v = clamp(parseInt(e.target.value) || 100, 30, 150); zInput.value = v; zSlider.value = v; board.style.transform = `scale(${v / 100})`; };
    document.getElementById('btnReset').onclick = reset;
    document.getElementById('btnStart').onclick = () => {
        running = !running;
        if (running && !lineStarted) {
            seedRng(document.getElementById('seedInput').value);
            lineStarted = true; initialWipAtStart = getInitialWipSum(); targetAtStart = buffers.raw.target; fixedInitialEstimate = initialEstimate;
        }
        document.getElementById('btnStart').innerHTML = running ? '<span>⏸</span> PAUSAR' : '<span>▶</span> INICIAR';
    };
    document.getElementById('seedInput').addEventListener('input', e => { if (!lineStarted) seedRng(e.target.value); });
    // Fecha menu de dados ao clicar fora
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('dataMenu');
        if (menu && menu.classList.contains('open') && !e.target.closest('.data-menu-wrap')) menu.classList.remove('open');
    });
    document.getElementById('chkTheme').onchange = e => { document.body.classList.toggle('light-mode', e.target.checked); };
    initMapInteractions(); // Bloco 6.4: pan/zoom do MAPA
    // Bloco 7.2: ESC sai de modos do MAPA
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && mapOpen && editorMode !== 'idle') {
            setEditorMode('idle'); showToast('Modo cancelado');
        }
    });
    reset();
    let last = performance.now();
    function loop(now) { 
        let delta = Math.min((now - last) / 1000, 3600); last = now; isFastForwarding = delta > 0.5; delta *= timeScale; const step = 0.02; 
        while (delta > 0) { let dt = Math.min(delta, step); tick(dt, isFastForwarding ? delta <= step : true); delta -= dt; } 
        requestAnimationFrame(loop); 
    }
    requestAnimationFrame(loop);
};
