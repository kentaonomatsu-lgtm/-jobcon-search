/**
 * JCコールナビ ─ 予約アポ（後日登録）連携
 * 後日登録ビューア(GAS)が出す「案件ID × 日付の件数」を取得し、求人カードに「予約アポ」バッジを表示する。
 * 個人情報（名前・連絡先）は一切取得しない。件数のみ。
 *
 * 読み込み元: index.html のログイン後フック addYoyaku()（ブース割当ボタンと同じ仕組み）
 * 失敗時は何も表示しない（ナビ本体の動作には影響しない）。
 */
(function () {
  'use strict';
  if (window.__yoyakuLoaded) return;
  window.__yoyakuLoaded = true;

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbzxIznPtNktwcHEzC8Leq7ophpyV2veI63qFhWNanjnAI7JJ5A9Jg1Fj1qabsCnAeI0fA/exec';
  var REFRESH_MS = 5 * 60 * 1000;   // 5分ごとに再取得
  var MAX_DATES = 3;                // バッジに出す日付の最大数
  var data = null;

  function css() {
    if (document.getElementById('yk-style')) return;
    var s = document.createElement('style');
    s.id = 'yk-style';
    s.textContent =
      '.yk-badge{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin:6px 10px 0;padding:5px 9px;' +
      'border-radius:8px;background:#e8f1fb;color:#14518f;font-size:12px;line-height:1.5;border:1px solid #b9d3ee}' +
      '.yk-badge b{font-weight:700;background:#14518f;color:#fff;border-radius:4px;padding:0 6px}' +
      '.yk-badge span{white-space:nowrap}' +
      '.yk-badge .yk-done{color:#1b7a3d;font-weight:600}' +
      '@media (prefers-color-scheme:dark){.yk-badge{background:#16293d;color:#a9cdf2;border-color:#2c4a69}' +
      '.yk-badge b{background:#4f8fd0;color:#0c1a29}.yk-badge .yk-done{color:#7fd39b}}';
    document.head.appendChild(s);
  }

  function md(iso) {
    var p = String(iso).split('-');
    return (+p[1]) + '/' + (+p[2]);
  }

  function badgeHtml(byDate) {
    var dates = Object.keys(byDate).sort();
    var total = 0, reg = 0;
    dates.forEach(function (d) { total += byDate[d][0]; reg += byDate[d][1]; });
    var parts = dates.slice(0, MAX_DATES).map(function (d) {
      var n = byDate[d][0], r = byDate[d][1];
      var mark = r >= n ? ' <i class="yk-done">登録済</i>' : (r > 0 ? ' <i class="yk-done">(済' + r + ')</i>' : '');
      return '<span>' + md(d) + ' ' + n + '件' + mark + '</span>';
    });
    if (dates.length > MAX_DATES) parts.push('<span>ほか' + (dates.length - MAX_DATES) + '日</span>');
    var el = document.createElement('div');
    el.className = 'yk-badge';
    el.title = '予約アポ 計' + total + '件（うち登録済' + reg + '件）';
    el.innerHTML = '<b>予約アポ</b>' + parts.join('');
    return el;
  }

  function annotate() {
    if (!data || !data.jobs) return;
    var cards = document.querySelectorAll('#cards .card, #results .card');
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var idEl = c.querySelector('[data-id]');
      var id = idEl ? idEl.getAttribute('data-id') : '';
      var old = c.querySelector('.yk-badge');
      var byDate = id && data.jobs[id];
      if (!byDate) { if (old) old.remove(); continue; }
      var sig = JSON.stringify(byDate);
      if (old && old.getAttribute('data-sig') === sig) continue;
      if (old) old.remove();
      var b = badgeHtml(byDate);
      b.setAttribute('data-sig', sig);
      var anchor = c.querySelector('.strip') || c.querySelector('.c-body');
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(b, anchor.nextSibling);
    }
  }

  var timer = null;
  function schedule() {
    if (timer) return;
    timer = setTimeout(function () { timer = null; try { annotate(); } catch (e) { /* ignore */ } }, 120);
  }

  function load() {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var to = ctrl ? setTimeout(function () { ctrl.abort(); }, 30000) : null;
    fetch(ENDPOINT, ctrl ? { signal: ctrl.signal } : undefined)
      .then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.ok) { data = j; annotate(); } })
      .catch(function () { /* 失敗時は何も表示しない */ })
      .then(function () { if (to) clearTimeout(to); });
  }

  css();
  load();
  setInterval(load, REFRESH_MS);
  var root = document.getElementById('results') || document.body;
  new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
})();
