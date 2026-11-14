/**
 * JCコールナビ ─ 実質残枠バッジ（yoyaku.js と同じ作り）
 * 残枠同期GAS（doGet）のJSONを取得し、求人カードに「残枠 n」を表示する。
 * 個人情報なし。失敗時は何も表示しない（ナビ本体に影響しない）。
 * 読み込み: index.html のログイン後フック addYoyaku() の隣で addSlots() から script 読み込み（yoyaku.js?v=5 と同様）
 */
(function () {
  'use strict';
  if (window.__slotsLoaded) return;
  window.__slotsLoaded = true;
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbzxIznPtNktwcHEzC8Leq7ophpyV2veI63qFhWNanjnAI7JJ5A9Jg1Fj1qabsCnAeI0fA/exec?fmt=slots';
  var REFRESH_MS = 60 * 1000;
  var data = null;

  function css() {
    if (document.getElementById('sl-style')) return;
    var s = document.createElement('style'); s.id = 'sl-style';
    s.textContent = '.sl-badge{margin:6px 10px 0;padding:4px 9px;border-radius:8px;font-size:12px;font-weight:700;border:1px solid}' +
      '.sl-ok{background:#fff6e0;color:#8a5a00;border-color:#f0d28a}.sl-zero{background:#fde8e8;color:#a31515;border-color:#f2b3b3}' +
      '@media (prefers-color-scheme:dark){.sl-ok{background:#3a2e10;color:#f2cf80;border-color:#6b5520}.sl-zero{background:#3c1a1a;color:#f2a5a5;border-color:#6b2c2c}}';
    document.head.appendChild(s);
  }
  function annotate() {
    if (!data || !data.jobs) return;
    var cards = document.querySelectorAll('#cards .card, #results .card');
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i], idEl = c.querySelector('[data-id]'), id = idEl ? idEl.getAttribute('data-id') : '';
      var old = c.querySelector('.sl-badge'), v = id && data.jobs[id];
      if (!v) { if (old) old.remove(); continue; }
      var sig = JSON.stringify(v);
      if (old && old.getAttribute('data-sig') === sig) continue;
      if (old) old.remove();
      var zero = v.r <= 0, b = document.createElement('div');
      b.className = 'sl-badge ' + (zero ? 'sl-zero' : 'sl-ok');
      b.textContent = zero ? '残枠0（別の求人で案内）' : '残枠 ' + v.r + (v.u ? '（管理画面' + v.b + '−報告' + v.u + '）' : '');
      if (v.c != null && v.t >= v.c) b.textContent += '／本日上限到達';
      b.setAttribute('data-sig', sig);
      var anchor = c.querySelector('.strip') || c.querySelector('.c-body');
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(b, anchor.nextSibling);
    }
  }
  function load() {
    if (!/^https:/.test(ENDPOINT)) return;
    fetch(ENDPOINT).then(function (r) { return r.json(); }).then(function (j) { if (j && j.ok) { data = j; annotate(); } }).catch(function () {});
  }
  css(); load(); setInterval(load, REFRESH_MS);
  new MutationObserver(function () { setTimeout(annotate, 120); }).observe(document.body, { childList: true, subtree: true });
})();
