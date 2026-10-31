/**
 * 送客チェッカー（ナビ・GAS共通。外部通信なし）
 *   JCCheck.parse(text)            → 【応募フォーマット】を項目に分解
 *   JCCheck.check(f, ctx)          → {ng:[{c,m}], warn:[{c,m}]}
 *     ctx = { jobs:{案件ID:job}, history:[{phone,id,date,by}], now:Date }
 *   JCCheck.ngText(f, res, opt)    → Chatwork投稿文（NGのときだけ使う）
 */
(function (root) {
  'use strict';

  var DUP_DAYS = 7;
  var MONTHLY = /^(ut|ワールド)/;   // 応募期間を1か月あける会社（社内運用）
  function addMonth(d) { var x = new Date(d); x.setMonth(x.getMonth() + 1); return x; }   // 同一求職者の再送客を重複とみなす日数

  function nf(s) { return String(s == null ? '' : s).normalize('NFKC').trim(); }
  function digits(s) { return nf(s).replace(/[^0-9]/g, ''); }
  function coKey(s) {
    return nf(s).replace(/株式会社|\(株\)|㈱|有限会社/g, '').replace(/\s+/g, '').replace(/[0-9]+$/, '').toLowerCase();
  }
  function jnKey(s) { return nf(s).replace(/\s+/g, '').replace(/^(\[[^\]]*\]|【[^】]*】)+/, '').toLowerCase(); }

  /* ---------- 解析 ---------- */
  function parse(raw) {
    var t = String(raw || '').replace(/\[qt\][\s\S]*?\[\/qt\]/g, '').replace(/\[\/?[a-z]+[^\]]*\]/gi, '');
    if (t.indexOf('応募フォーマット') < 0) return null;
    var lines = t.split(/\r?\n/);
    var f = { ids: [], raw: t, checks: [] };
    var inChk = false;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i];
      var m = /^\s*[■◆・]\s*([^：:]+?)\s*[：:]\s*(.*)$/.exec(L);
      if (/チェック項目/.test(L)) { inChk = true; continue; }
      if (!m) {
        /* 「■メールアドレス」だけで値が次行にあるケース */
        var m2 = /^\s*■\s*([^：:\s]+)\s*$/.exec(L);
        if (m2 && i + 1 < lines.length && !/^\s*[■◆・]/.test(lines[i + 1]) && lines[i + 1].trim()) {
          f[m2[1]] = lines[i + 1].trim(); i++;
        }
        continue;
      }
      var k = m[1].trim(), v = m[2].trim();
      if (k.charAt(0) === '◆' || /^(雇用形態|月収例|勤務地|業務内容|求人会社名|求人の魅力|求人概要5項目|仕事内容詳細|5分以上通話|1か月以内の就業可否)/.test(k) && /[〇○◯×✕xX]/.test(v) && inChk) {
        f.checks.push({ k: k, v: nf(v) });
        continue;
      }
      if (/^案件ID/.test(k)) { f.ids.push(nf(v)); continue; }
      if (/^寮からの通勤|^寮/.test(k)) { f['寮'] = v; continue; }
      if (/^グループ/.test(k)) { f['区分'] = v; continue; }
      if (/^(何回目|何件目)/.test(k)) { f['回目'] = v; continue; }
      f[k] = v;
    }
    /* 「■寮からの通勤可能か⚪︎」（コロン無し）などの救済 */
    var dm = /■寮からの通勤[^\n：:]*?([〇○◯×✕])/.exec(t);
    if (dm && !f['寮']) f['寮'] = dm[1];
    f.name = f['名前'] || ''; f.kana = f['フリガナ'] || ''; f.birth = f['生年月日'] || '';
    f.sex = f['性別'] || ''; f.phone = digits(f['電話番号']); f.mail = f['メールアドレス'] || '';
    f.addr = f['住所'] || ''; f.co = f['企業名'] || ''; f.jn = f['仕事No'] || f['仕事№'] || '';
    f.by = f['担当者名'] || ''; f.prio = f['優先順位'] || '';
    return f;
  }

  function age(birth, now) {
    var m = /(\d{4})\D+(\d{1,2})\D+(\d{1,2})/.exec(nf(birth));
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var n = now || new Date();
    var a = n.getFullYear() - y;
    if ((n.getMonth() + 1) < mo || ((n.getMonth() + 1) === mo && n.getDate() < d)) a--;
    return (a >= 15 && a <= 90) ? a : null;
  }

  /* ---------- チェック ---------- */
  function check(f, ctx) {
    ctx = ctx || {};
    var ng = [], warn = [];
    function N(c, m) { ng.push({ c: c, m: m }); }
    function W(c, m) { warn.push({ c: c, m: m }); }
    var now = ctx.now || new Date();

    /* 必須項目 */
    [['名前', f.name], ['フリガナ', f.kana], ['生年月日', f.birth], ['性別', f.sex], ['電話番号', f.phone],
     ['住所', f.addr], ['企業名', f.co], ['仕事No', f.jn], ['担当者名', f.by]].forEach(function (p) {
      if (!nf(p[1])) N('empty', p[0] + 'が未記入です');
    });
    if (!f.mail || !/@/.test(f.mail)) W('mail', 'メールアドレスが未記入です（必要なら記入）');
    if (f.phone && !/^0\d{9,10}$/.test(f.phone)) N('phone', '電話番号の桁数が正しくありません（' + f.phone + '）');
    if (f.kana && !/^[゠-ヿ\s　ー]+$/.test(nf(f.kana).replace(/\s/g, ' '))) W('kana', 'フリガナがカタカナではありません');
    if (!f.prio) W('prio', '優先順位が未記入です');
    if (/^[12]$/.test(nf(f.prio)) && !/同職種の有無[：:]\s*\S/.test(f.raw)) W('same', '優先' + nf(f.prio) + 'は「同職種の有無」の記載が必要です');
    if (ctx.poster && f.by && nf(ctx.poster).replace(/\s/g, '').indexOf(nf(f.by).replace(/\s/g, '')) < 0) W('by', '担当者名「' + nf(f.by) + '」が投稿者と違います');

    /* チェック項目 ×  */
    f.checks.forEach(function (c) { if (/[×✕]/.test(c.v)) N('chk', 'チェック項目「' + c.k + '」が×です'); else if (/△/.test(c.v)) W('chk2', 'チェック項目「' + c.k + '」が△です'); });

    /* 案件ID */
    var ids = f.ids.filter(function (x) { return x; });
    var real = ids.filter(function (x) { return /^\d{5,7}$/.test(digits(x)) && /^\d+$/.test(x); });
    if (!ids.length) N('id', '案件IDの記載がありません');
    else if (ids.length > 1) N('id2', '案件IDが' + ids.length + '行あります（' + ids.join(' / ') + '）。1つに整理してください');
    else if (!real.length) N('id', '案件IDが「' + ids[0] + '」です。求人サーチから正しい案件IDを記載してください');

    var id = real.length ? digits(real[real.length - 1]) : '';
    var job = id && ctx.jobs ? ctx.jobs[id] : null;
    var info = [];
    if (id && ctx.jobs && !job) {
      var inMaster = ctx.cos && ctx.cos[coKey(f.co)];
      if (inMaster) W('nojob', '案件ID ' + id + ' が求人マスタにありません（' + nf(f.co) + 'の案件です）。IDを確認してください');
      else info.push('マスタ外の会社のため、年齢・性別・企業名・仕事Noは照合していません');
    }

    if (job) {
      if (coKey(f.co) && coKey(job.co || job.maker) !== coKey(f.co) && coKey(job.maker || '') !== coKey(f.co))
        N('co', '企業名が案件IDと一致しません（記載：' + nf(f.co) + '／マスタ：' + (job.co || job.maker) + '）');
      if (f.jn && job.jn && jnKey(job.jn) !== jnKey(f.jn))
        N('jn', '仕事Noが案件IDと一致しません（記載：' + nf(f.jn) + '／マスタ：' + job.jn + '）');
      var a = age(f.birth, now);
      if (a == null && nf(f.birth)) W('birth', '生年月日を読み取れません（' + nf(f.birth) + '）');
      if (a != null && job.ag && +job.ag > 0 && a > +job.ag) N('age', '年齢超過です（' + a + '歳／上限' + job.ag + '歳）。求人（案件ID）に間違いがないか確認してください');
      var sx = /^[男]/.test(nf(f.sex)) ? '男' : (/^[女]/.test(nf(f.sex)) ? '女' : '');
      var jg = nf(job.gn);
      if (sx && jg && /^男/.test(jg) && !/女/.test(jg) && sx === '女') N('sex', '性別条件に合いません（求人：男性のみ）');
      if (sx && jg && /^女/.test(jg) && !/男/.test(jg) && sx === '男') N('sex', '性別条件に合いません（求人：女性のみ）');
      if (job.remain != null && job.remain !== '' && +job.remain <= 0 && job.budget) W('remain', '残枠が0の表示です。送客可否を確認してください');
    }

    /* 重複・二重送客 */
    var hist = ctx.history || [];
    if (f.phone) {
      hist.forEach(function (h) {
        if (!h || h.phone !== f.phone) return;
        var days = h.date ? Math.abs((now - new Date(h.date)) / 86400000) : 0;
        if (id && h.id === id && days <= DUP_DAYS)
          N('dup', '同じ求職者が同じ案件へ' + md(h.date) + 'に送客済みです' + (h.by ? '（' + h.by + '）' : ''));
        else if (MONTHLY.test(coKey(f.co)) && h.co && MONTHLY.test(h.co) && days <= 31)
          W('dup1m', '同じ求職者が' + md(h.date) + 'に' + nf(f.co) + '系へ送客済みです。応募期間を1か月あけるため、最短' + md(addMonth(h.date)) + '以降の登録です');
        else if (h.id && id && h.id !== id && days < 3)
          W('dup2', '同じ求職者が' + md(h.date) + 'に別案件へ送客済みです。3日以上あけるため、最短' + md(new Date(new Date(h.date).getTime() + 3 * 86400000)) + '以降の登録です');
      });
    }
    return { ng: ng, warn: warn, info: info, id: id, age: age(f.birth, now) };
  }

  function md(d) { var x = new Date(d); return isNaN(x) ? '' : (x.getMonth() + 1) + '/' + (x.getDate()); }

  function ngText(f, res, opt) {
    opt = opt || {};
    var L = [];
    if (opt.to) L.push('[To:' + opt.to + ']' + (opt.toName ? opt.toName + 'さん' : ''));
    L.push('【送客NG】' + (f.name || '不明') + '（' + (res.id || (f.ids.join('・') || '不明')) + '）');
    res.ng.forEach(function (x) { L.push('・' + x.m); });
    L.push('→ 修正して再投稿をお願いします');
    return L.join('\n');
  }

  var api = { _ck: coKey, parse: parse, check: check, ngText: ngText, age: age, DUP_DAYS: DUP_DAYS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.JCCheck = api;
})(typeof window !== 'undefined' ? window : this);
