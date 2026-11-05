(async function () {
  'use strict';
  var DATA = 'https://kentaonomatsu-lgtm.github.io/-jobcon-search/data.json';
  var ONE_MONTH = /^(ut|トリプルエース|ワールドインテック|日本ケイテム)/;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  function nf(s) { return String(s == null ? '' : s).normalize('NFKC').trim(); }
  function coKey(s) { return nf(s).replace(/株式会社|\(株\)|㈱|有限会社/g, '').replace(/\s+/g, '').replace(/[0-9]+$/, '').toLowerCase(); }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function md(d) { return (d.getMonth() + 1) + '/' + d.getDate(); }
  function day0(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  function addDays(d, n) { var x = day0(d); x.setDate(x.getDate() + n); return x; }
  function addMonths(d, n) { var x = day0(d); x.setMonth(x.getMonth() + n); return x; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var old = document.getElementById('jc-hantei'); if (old) old.remove();
  var box = document.createElement('div'); box.id = 'jc-hantei';
  box.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.5);font:14px/1.5 sans-serif;color:#222;overflow:auto';
  box.innerHTML = '<div style="background:#fff;max-width:760px;margin:20px auto;padding:16px;border-radius:8px">' +
    '<div style="display:flex;gap:8px;align-items:center"><b style="font-size:16px">送客可否判定</b>' +
    '<input id="jch-tel" placeholder="電話番号" inputmode="numeric" style="flex:1;min-width:0;font-size:16px;padding:6px;border:1px solid #888;border-radius:4px"><input id="jch-jn" placeholder="お仕事No" style="flex:1;min-width:0;font-size:16px;padding:6px;border:1px solid #888;border-radius:4px">' +
    '<button id="jch-go" style="font-size:15px;padding:6px 14px">判定</button><button id="jch-x" style="font-size:15px;padding:6px 10px">×</button></div>' +
    '<div id="jch-out" style="margin-top:12px;color:#666">電話番号とお仕事Noを入れて判定を押してください</div></div>';
  document.body.appendChild(box);
  $('#jch-x').onclick = function () { box.remove(); };

  var jobs = null;
  async function loadJobs() {
    if (jobs) return jobs;
    var r = await fetch(DATA, { cache: 'no-cache' }); var j = await r.json(); jobs = j.jobs || []; return jobs;
  }
  async function history(tel) {
    var r = await fetch('/admnt/applicant?tel=' + encodeURIComponent(tel), { credentials: 'same-origin' });
    if (r.status !== 200 || /login/.test(r.url)) throw new Error('管理画面にログインしてから実行してください');
    var d = new DOMParser().parseFromString(await r.text(), 'text/html');
    var rows = [];
    d.querySelectorAll('table tbody tr').forEach(function (tr) {
      var c = [].map.call(tr.children, function (td) { return td.textContent.replace(/\s+/g, ' ').trim(); });
      if (c.length < 12 || !/^\d{4}-\d\d-\d\d/.test(c[11])) return;
      rows.push({ jno: c[1], name: c[2], co: c[6], title: c[7], st: c[8], dev: c[9], memo: c[10], at: new Date(c[11].replace(' ', 'T')) });
    });
    return rows;
  }

  async function run() {
    var out = $('#jch-out'), tel = nf($('#jch-tel').value).replace(/[^0-9]/g, '');
    if (tel.length < 10) { out.textContent = '電話番号は10〜11桁で入力してください'; return; }
    out.textContent = '確認中…';
    try {
      var res = await Promise.all([history(tel), loadJobs()]);
      var hist = res[0], J = res[1], today = day0(new Date());
            var last = hist.reduce(function (m, h) { return !m || h.at > m ? h.at : m; }, null);
      var gapDate = last ? addDays(last, 3) : null;
      var byCo = {}; hist.forEach(function (h) { var k = coKey(h.co); if (!byCo[k] || h.at > byCo[k].at) byCo[k] = h; });
      var cos = {}; J.forEach(function (j) { var k = coKey(j.co); (cos[k] = cos[k] || { name: j.co, n: 0 }).n++; });
      var list = Object.keys(cos).map(function (k) {
        var h = byCo[k], one = ONE_MONTH.test(k), mDate = h ? (one ? addMonths(h.at, 1) : addMonths(h.at, 3)) : null;
        var gOK = !gapDate || today >= gapDate, mOK = !mDate || today >= mDate;
        var mark, until = null;
        if (mOK && gOK) mark = '○';
        else if (mOK) { mark = '△'; until = gapDate; }
        else { mark = '✕'; until = (gapDate && gapDate > mDate) ? gapDate : mDate; }
        return { name: cos[k].name, n: cos[k].n, mark: mark, until: until, why: h ? (md(h.at) + '応募' + (one ? '(1か月)' : '(3か月)')) : '' };
      });
      var rank = { '○': 0, '△': 1, '✕': 2 };
      list.sort(function (a, b) { return rank[a.mark] - rank[b.mark] || (a.until || 0) - (b.until || 0) || b.n - a.n; });
      var cnt = { '○': 0, '△': 0, '✕': 0 }; list.forEach(function (x) { cnt[x.mark]++; });
      hist.sort(function (x, y) { return y.at - x.at; });
      var name = hist.length ? hist[0].name : '';
      var ago = last ? Math.round((today - day0(last)) / 86400000) : 0;
      var gOKnow = !gapDate || today >= gapDate;
      var head = '<div style="border:2px solid ' + (gOKnow ? '#0a7' : '#c80') + ';border-radius:8px;padding:10px;margin:8px 0">' +
        '<div style="font-size:20px;font-weight:bold">' + esc(name || '（履歴なし）') + '</div>' +
        '<div style="font-size:15px;margin-top:4px">最終応募日: <b>' + (last ? ymd(last) + ' ' + String(last.getHours()).padStart(2, '0') + ':' + String(last.getMinutes()).padStart(2, '0') + '（' + (ago === 0 ? '今日' : ago + '日前') + '）' : 'なし') + '</b></div>' +
        '<div style="font-size:15px">3日ルール: <b style="color:' + (gOKnow ? '#0a7' : '#c33') + '">' + (gOKnow ? '明け済み（全社OK）' : md(gapDate) + 'まで全社不可') + '</b></div>' +
        '<div style="font-size:15px">○ ' + cnt['○'] + '社 / △ ' + cnt['△'] + '社（3日待ち） / ✕ ' + cnt['✕'] + '社（月ルール）</div></div>';
      var hh = '<div style="font-weight:bold;margin:10px 0 4px">直近の応募履歴（新しい順 ' + hist.length + '件）</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px">' + hist.slice(0, 15).map(function (h) {
          var dd = Math.round((today - day0(h.at)) / 86400000);
          return '<tr style="border-top:1px solid #ddd"><td style="white-space:nowrap">' + md(h.at) + ' ' + String(h.at.getHours()).padStart(2, '0') + ':' + String(h.at.getMinutes()).padStart(2, '0') + '</td><td style="color:#888;white-space:nowrap">' + (dd === 0 ? '今日' : dd + '日前') + '</td><td>' + esc(h.co) + '</td><td style="color:#888;white-space:nowrap">' + esc(h.st) + ' ' + (h.dev === 'mobile' || h.dev === 'pc' ? 'WEB' : '') + '</td></tr>';
        }).join('') + '</table>' + (hist.length > 15 ? '<div style="font-size:12px;color:#888">ほか' + (hist.length - 15) + '件</div>' : '');
      var tb = '<div style="font-weight:bold;margin:14px 0 4px">送客可否（求人のある会社）</div><table style="width:100%;border-collapse:collapse;font-size:13px">' + list.map(function (x) {
        var col = x.mark === '○' ? '#0a7' : x.mark === '△' ? '#c80' : '#c33';
        return '<tr style="border-top:1px solid #ddd"><td style="width:28px;font-weight:bold;font-size:16px;color:' + col + '">' + x.mark + '</td><td>' + esc(x.name) + '</td><td style="text-align:right;white-space:nowrap">' +
          (x.until ? '<b>' + md(x.until) + '〜</b> ' : '') + '<span style="color:#888">' + esc(x.why) + ' / 求人' + x.n + '</span></td></tr>';
      }).join('') + '</table><div style="font-size:12px;color:#888;margin:6px 0">起点は管理画面の応募日時。△=3日明けから登録可、✕=月ルール明けから</div>';
      var jq = nf($('#jch-jn').value).toUpperCase().replace(/\s+/g, ''), jobCard = '';
      if (jq) {
        var jm = J.filter(function (j) { return nf(j.jn).toUpperCase() === jq || String(j.id) === jq; });
        if (!jm.length) {
          jobCard = '<div style="border:2px solid #c33;border-radius:8px;padding:10px;margin:8px 0"><b style="color:#c33">お仕事No「' + esc(jq) + '」が求人サーチに見つかりません</b><br>募集終了か入力違いの可能性があります。番号を確認してください。</div>';
        } else {
          var jb = jm[0], jk = coKey(jb.co), jx = list.filter(function (x) { return coKey(x.name) === jk; })[0];
          var big = jx.mark === '○' ? '送客OK' : jx.mark === '△' ? '送客OK 後日登録' + md(jx.until) : '送客NG ' + md(jx.until) + '以降';
          var colr = jx.mark === '○' ? '#0a7' : jx.mark === '△' ? '#c80' : '#c33';
          var reason = jx.mark === '○' ? '制限なし' : jx.mark === '△' ? '直近応募から3日あけるルール（' + md(gapDate) + '〜）' : (jx.why ? jx.why + 'のため' : '') + '（' + md(jx.until) + '〜）';
          jobCard = '<div style="border:3px solid ' + colr + ';border-radius:8px;padding:12px;margin:8px 0"><div style="font-size:26px;font-weight:bold;color:' + colr + '">' + jx.mark + ' ' + big + '</div>' +
            '<div style="font-size:14px;margin-top:4px">' + esc(reason) + '</div>' +
            '<div style="font-size:13px;color:#555;margin-top:6px">' + esc(jb.jn) + ' / ' + esc(jb.co) + '<br>' + esc(String(jb.ti || '').split('\n')[0]).slice(0, 70) + '<br>' + esc((jb.pf || '') + (jb.ct || '')) + (jb.emp ? ' / ' + esc(jb.emp) : '') + '</div></div>';
        }
      }
      out.innerHTML = jobCard + head + hh + tb;
    } catch (e) { out.innerHTML = '<span style="color:#c33">' + esc(e.message || e) + '</span>'; }
  }
  $('#jch-go').onclick = run;
  $('#jch-tel').addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
  $('#jch-jn').addEventListener('keydown', function (e) { if (e.key === 'Enter') run(); });
  $('#jch-tel').focus();
})();
