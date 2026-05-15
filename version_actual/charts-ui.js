// ╔══════════════════════════════════════════════════════════════════════╗
// ║  charts-ui.js · Mis Finanzas 2026 — Componentes SVG (pixel-perfect)  ║
// ║  Port 1:1 vanilla del bundle Claude Design (charts.jsx).             ║
// ║  CAPA: presentación pura. Responsabilidad única: render SVG.         ║
// ║  NO importa datos, NO toca negocio/auth. Recibe arrays, devuelve     ║
// ║  strings HTML/SVG listos para innerHTML. Usa tokens CSS (var--).     ║
// ╚══════════════════════════════════════════════════════════════════════╝
(function () {
  'use strict';

  var _id = 0;
  function uid(p) { _id += 1; return (p || 'c') + _id + '-' + Math.random().toString(36).slice(2, 6); }

  // ─── SPARKLINE ─────────────────────────────────────────────────────
  // data:[n], color, h, w, fill(bool), stroke
  function sparkline(data, opts) {
    opts = opts || {};
    if (!data || data.length < 2) return '';
    var color = opts.color || 'var(--amber)';
    var h = opts.h || 28, w = opts.w || 80;
    var fill = !!opts.fill, stroke = opts.stroke || 1.5;
    var min = Math.min.apply(null, data);
    var max = Math.max.apply(null, data);
    var range = (max - min) || 1;
    var step = w / (data.length - 1);
    var pts = data.map(function (v, i) {
      return [i * step, h - ((v - min) / range) * (h - 2) - 1];
    });
    var path = pts.map(function (p, i) {
      return (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1);
    }).join(' ');
    var last = pts[pts.length - 1];
    var gid = uid('sg');
    var defs = '';
    if (fill) {
      var area = path + ' L' + w + ',' + h + ' L0,' + h + ' Z';
      defs = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.25"/>' +
        '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/>' +
        '</linearGradient></defs><path d="' + area + '" fill="url(#' + gid + ')"/>';
    }
    return '<svg width="' + w + '" height="' + h + '" style="display:block;overflow:visible">' +
      defs +
      '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="' + stroke +
      '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<circle cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="' +
      (stroke + 0.5) + '" fill="' + color + '"/></svg>';
  }

  // ─── BAR MINI (ingresos/gastos por día) ────────────────────────────
  // data:[{inc,exp}], h, gap
  function barMini(data, opts) {
    opts = opts || {};
    if (!data || !data.length) return '';
    var h = opts.h || 40, gap = opts.gap != null ? opts.gap : 1;
    var max = Math.max.apply(null, data.map(function (d) { return Math.max(d.inc, d.exp); })) || 1;
    var bw = Math.max(2, 100 / data.length - gap);
    var bars = data.map(function (d, i) {
      var ih = (d.inc / max) * (h / 2 - 1);
      var eh = (d.exp / max) * (h / 2 - 1);
      var x = i * (bw + gap);
      return '<rect x="' + x + '" y="' + (h / 2 - ih) + '" width="' + bw + '" height="' + ih +
        '" fill="var(--pos)" opacity=".75" rx=".5"/>' +
        '<rect x="' + x + '" y="' + (h / 2 + 1) + '" width="' + bw + '" height="' + eh +
        '" fill="var(--neg)" opacity=".65" rx=".5"/>';
    }).join('');
    return '<svg width="100%" height="' + h + '" viewBox="0 0 ' +
      (data.length * (bw + gap)) + ' ' + h + '" preserveAspectRatio="none" style="display:block">' +
      bars + '</svg>';
  }

  // ─── DONUT ─────────────────────────────────────────────────────────
  // segments:[{value,color}], size, thickness, centerHTML
  function donut(segments, opts) {
    opts = opts || {};
    if (!segments || !segments.length) return '';
    var size = opts.size || 140, thickness = opts.thickness || 14;
    var total = segments.reduce(function (s, x) { return s + x.value; }, 0) || 1;
    var r = size / 2 - thickness / 2;
    var c = 2 * Math.PI * r;
    var offset = 0;
    var circles = segments.map(function (s) {
      var len = (s.value / total) * c;
      var el = '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r +
        '" fill="none" stroke="' + s.color + '" stroke-width="' + thickness +
        '" stroke-dasharray="' + len + ' ' + (c - len) + '" stroke-dashoffset="' +
        (-offset) + '" stroke-linecap="butt"/>';
      offset += len;
      return el;
    }).join('');
    var center = opts.centerHTML
      ? '<div style="position:absolute;inset:0;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;text-align:center">' + opts.centerHTML + '</div>'
      : '';
    return '<div style="position:relative;width:' + size + 'px;height:' + size + 'px">' +
      '<svg width="' + size + '" height="' + size + '" style="transform:rotate(-90deg)">' +
      '<circle cx="' + (size / 2) + '" cy="' + (size / 2) + '" r="' + r +
      '" fill="none" stroke="var(--ink-3)" stroke-width="' + thickness + '"/>' +
      circles + '</svg>' + center + '</div>';
  }

  // ─── LINE CHART (hero) ─────────────────────────────────────────────
  // data:[n], h, color, showGrid
  function lineChart(data, opts) {
    opts = opts || {};
    if (!data || data.length < 2) return '';
    var h = opts.h || 180, color = opts.color || 'var(--amber)';
    var showGrid = opts.showGrid !== false;
    var w = 800;
    var min = Math.min.apply(null, data) * 0.95;
    var max = Math.max.apply(null, data) * 1.02;
    var range = (max - min) || 1;
    var step = w / (data.length - 1);
    var pts = data.map(function (v, i) {
      return [i * step, h - ((v - min) / range) * (h - 20) - 10];
    });
    var path = pts.map(function (p, i) {
      return (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ',' + p[1].toFixed(1);
    }).join(' ');
    var area = path + ' L' + w + ',' + h + ' L0,' + h + ' Z';
    var gid = uid('lc');
    var grid = '';
    if (showGrid) {
      [0.25, 0.5, 0.75].forEach(function (p) {
        grid += '<line x1="0" x2="' + w + '" y1="' + (h * p) + '" y2="' + (h * p) +
          '" stroke="var(--line)" stroke-dasharray="2 4"/>';
      });
    }
    var lastPt = pts[pts.length - 1];
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" width="100%" height="' + h +
      '" preserveAspectRatio="none" style="display:block;overflow:visible">' +
      '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.22"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      grid +
      '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
      '<path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="2"/>' +
      '<circle cx="' + lastPt[0].toFixed(1) + '" cy="' + lastPt[1].toFixed(1) +
      '" r="4" fill="' + color + '"/></svg>';
  }

  // ─── PILL (badge estado) ───────────────────────────────────────────
  function pill(content, opts) {
    opts = opts || {};
    var tone = opts.tone || 'neutral', size = opts.size || 'sm';
    var tones = {
      pos: ['var(--pos-d)', 'var(--pos)'],
      neg: ['var(--neg-d)', 'var(--neg)'],
      amber: ['var(--amber-d)', 'var(--amber)'],
      teal: ['var(--teal-d)', 'var(--teal-s)'],
      info: ['rgba(106,148,196,.12)', 'var(--info)'],
      neutral: ['var(--ink-3)', 'var(--fg-dim)']
    };
    var t = tones[tone] || tones.neutral;
    var pad = size === 'xs' ? '2px 6px' : '3px 8px';
    var fs = size === 'xs' ? '10px' : '11px';
    return '<span class="num" style="display:inline-flex;align-items:center;gap:4px;' +
      'background:' + t[0] + ';color:' + t[1] + ';border-radius:999px;font-weight:500;' +
      'letter-spacing:.01em;padding:' + pad + ';font-size:' + fs + '">' + content + '</span>';
  }

  // ─── CATEGORY DOT ──────────────────────────────────────────────────
  function catDot(color, size) {
    size = size || 8;
    return '<span style="display:inline-block;width:' + size + 'px;height:' + size +
      'px;border-radius:50%;background:' + color + ';flex-shrink:0"></span>';
  }

  // API pública
  window.ChartsUI = {
    sparkline: sparkline,
    barMini: barMini,
    donut: donut,
    lineChart: lineChart,
    pill: pill,
    catDot: catDot
  };
})();
