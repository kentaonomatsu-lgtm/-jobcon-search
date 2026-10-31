/**
 * JCコールナビ ─ 予約アポ（後日登録）連携
 * 後日登録ビューア(GAS)の予約アポを取得し、求人カードに「予約アポ」バッジを表示する。
 *  ・ログイン済み: 日付ごとに「求職者(カナ) / 電話番号 / アレグリア担当者 / 登録状況」を表示
 *  ・認証できない場合: 件数のみ
 * 個人情報はログインPASSから作った照合キーが合うときだけ返る。コードや公開データには含まれない。
 *
 * 読み込み元: index.html のログイン後フック addYoyaku()
 * 失敗時は何も表示しない（ナビ本体の動作には影響しない）。
 */
(function () {
  'use strict';
  if (window.__yoyakuLoaded) return;
  window.__yoyakuLoaded = true;

  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbzxIznPtNktwcHEzC8Leq7ophpyV2veI63qFhWNanjnAI7JJ5A9Jg1Fj1qabsCnAeI0fA/exec';
  var REFRESH_MS = 5 * 60 * 1000;   // 5分ごとに再取得
  var MAX_DATES = 3;                // 件数のみ表示のときの日付最大数
  var data = null;                  // {full:boolean, jobs:{id: ...}}

  function css() {
    if (document.getElementById('yk-style')) return;
    var s = document.createElement('style');
    s.id = 'yk-style';
    s.textContent =
      '.yk-badge{margin:6px 10px 0;padding:6px 9px;border-radius:8px;background:#e8f1fb;color:#14518f;' +
      'font-size:12px;line-height:1.5;border:1px solid #b9d3ee}' +
      '.yk-head{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px}' +
      '.yk-badge b{font-weight:700;background:#14518f;color:#fff;border-radius:4px;padding:0 6px}' +
      '.yk-head span{white-space:nowrap}' +
      '.yk-done{color:#1b7a3d;font-weight:600;font-style:normal}' +
      '.yk-day{margin-top:5px;padding-top:4px;border-top:1px dashed #b9d3ee}' +
      '.yk-d{font-weight:700}' +
      '.yk-row{display:flex;flex-wrap:wrap;align-items:baseline;gap:0 10px;padding:1px 0 1px 8px}' +
      '.yk-n{font-weight:600;color:#0d3a68}' +
      '.yk-t a{color:#14518f;text-decoration:none;font-variant-numeric:tabular-nums}' +
      '.yk-o{color:#46617c}' +
      '@media (prefers-color-scheme:dark){.yk-badge{background:#16293d;color:#a9cdf2;border-color:#2c4a69}' +
      '.yk-badge b{background:#4f8fd0;color:#0c1a29}.yk-done{color:#7fd39b}.yk-day{border-top-color:#2c4a69}' +
      '.yk-n{color:#d3e6fa}.yk-t a{color:#a9cdf2}.yk-o{color:#8fb0d1}}';
    document.head.appendChild(s);
  }

  function md(iso) {
    var p = String(iso).split('-');
    return (+p[1]) + '/' + (+p[2]);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* 件数のみ: jobs[id] = {日付:[件数,登録済]} */
  function countsBadge(byDate) {
    var dates = Object.keys(byDate).sort();
    var total = 0, reg = 0;
    dates.forEach(function (d) { total += byDate[d][0]; reg += byDate[d][1]; });
    var box = el('div', 'yk-badge');
    box.title = '予約アポ 計' + total + '件（うち登録済' + reg + '件）';
    var head = el('div', 'yk-head');
    head.appendChild(el('b', '', '予約アポ'));
    dates.slice(0, MAX_DATES).forEach(function (d) {
      var n = byDate[d][0], r = byDate[d][1];
      var s = el('span', '', md(d) + ' ' + n + '件');
      if (r > 0) s.appendChild(el('i', 'yk-done', r >= n ? ' 登録済' : ' (済' + r + ')'));
      head.appendChild(s);
    });
    if (dates.length > MAX_DATES) head.appendChild(el('span', '', 'ほか' + (dates.length - MAX_DATES) + '日'));
    box.appendChild(head);
    return box;
  }

  /* 詳細: jobs[id] = [{d,r,n,t,o}] */
  function detailBadge(rows) {
    var box = el('div', 'yk-badge');
    var reg = rows.filter(function (x) { return x.r; }).length;
    box.title = '予約アポ 計' + rows.length + '件（うち登録済' + reg + '件）';
    var head = el('div', 'yk-head');
    head.appendChild(el('b', '', '予約アポ'));
    head.appendChild(el('span', '', rows.length + '件' + (reg ? '（登録済' + reg + '）' : '')));
    box.appendChild(head);

    var days = {}, order = [];
    rows.forEach(function (x) {
      if (!days[x.d]) { days[x.d] = []; order.push(x.d); }
      days[x.d].push(x);
    });
    order.sort().forEach(function (d) {
      var day = el('div', 'yk-day');
      day.appendChild(el('div', 'yk-d', md(d) + '　' + days[d].length + '件'));
      days[d].forEach(function (x) {
        var row = el('div', 'yk-row');
        row.appendChild(el('span', 'yk-n', x.n || '(氏名なし)'));
        var t = el('span', 'yk-t');
        if (x.t) {
          var a = el('a', '', x.t);
          a.href = 'tel:' + x.t.replace(/[^0-9+]/g, '');
          t.appendChild(a);
        } else {
          t.textContent = '電話番号なし';
        }
        row.appendChild(t);
        row.appendChild(el('span', 'yk-o', '担当：' + (x.o || '未記載')));
        if (x.r) row.appendChild(el('i', 'yk-done', '登録済'));
        day.appendChild(row);
      });
      box.appendChild(day);
    });
    return box;
  }

  function annotate() {
    if (!data || !data.jobs) return;
    var cards = document.querySelectorAll('#cards .card, #results .card');
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var idEl = c.querySelector('[data-id]');
      var id = idEl ? idEl.getAttribute('data-id') : '';
      var old = c.querySelector('.yk-badge');
      var v = id && data.jobs[id];
      if (!v) { if (old) old.remove(); continue; }
      var sig = (data.full ? 'F' : 'C') + JSON.stringify(v);
      if (old && old.getAttribute('data-sig') === sig) continue;
      if (old) old.remove();
      var b = data.full ? detailBadge(v) : countsBadge(v);
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

  /* ログインPASS → 照合キー（SHA-256）。PASS自体は送らない */
  function getPass() {
    try {
      var s = sessionStorage.getItem('jc_pass');
      if (s) return s;
      var r = JSON.parse(localStorage.getItem('jc_pass_v1') || 'null');
      if (r && r.p && (!r.exp || r.exp > Date.now())) return r.p;
    } catch (e) { /* ignore */ }
    return '';
  }

  function sha256hex(str) {
    if (!(window.crypto && crypto.subtle && window.TextEncoder)) return Promise.resolve('');
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(str)).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
    });
  }

  function timed(fn) {
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var to = ctrl ? setTimeout(function () { ctrl.abort(); }, 30000) : null;
    return fn(ctrl ? ctrl.signal : undefined).then(function (r) { if (to) clearTimeout(to); return r; },
      function (e) { if (to) clearTimeout(to); throw e; });
  }

  function loadFull() {
    var pass = getPass();
    if (!pass) return Promise.resolve(null);
    return sha256hex('yk1:' + pass).then(function (k) {
      if (!k) return null;
      return timed(function (signal) {
        return fetch(ENDPOINT, { method: 'POST', body: JSON.stringify({ k: k }), signal: signal, headers: { 'Content-Type': 'text/plain;charset=utf-8' } })
          .then(function (r) { return r.json(); });
      }).then(function (j) { return j && j.ok ? { full: true, jobs: j.jobs } : null; });
    }).catch(function () { return null; });
  }

  function loadCounts() {
    return timed(function (signal) {
      return fetch(ENDPOINT, { signal: signal }).then(function (r) { return r.json(); });
    }).then(function (j) { return j && j.ok ? { full: false, jobs: j.jobs } : null; }).catch(function () { return null; });
  }

  function load() {
    loadFull().then(function (d) { return d || loadCounts(); }).then(function (d) {
      if (d) { data = d; annotate(); }
    });
  }

  css();
  load();
  setInterval(load, REFRESH_MS);
  var root = document.getElementById('results') || document.body;
  new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
})();
