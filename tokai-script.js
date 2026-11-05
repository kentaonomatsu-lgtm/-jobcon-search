/**
 * JCコールナビ ─ スタッフ東海 トークスクリプト
 * ログイン後の画面に「スタッフ東海トークスクリプト」ボタンを追加し、押すとスクリプトを表示する。
 *  ・場所: 左サイドバー「ツール」欄（スクリプトの上）／ヘッダー右上（あふりがなの左）
 *  ・表示: 画面中央のパネル。ESC・背景クリック・×で閉じる。「読み上げ文をコピー」あり
 *
 * 読み込み元: index.html のログイン後フック addTokai()
 * 文言の修正は、下の SCRIPT_DATA だけ書き換えればよい。失敗時は何も表示しない（ナビ本体には影響しない）。
 * 【　】の部分は黄色でハイライトされる。
 */
(function () {
  'use strict';
  if (window.__tokaiScriptLoaded) return;
  window.__tokaiScriptLoaded = true;

  /* ───────── スクリプト本文（ここを編集する） ───────── */
  var SCRIPT_DATA = {
    title: 'スタッフ東海 トークスクリプト',
    intro: 'こちらお仕事に関わる大切な点を確認させてください。',
    steps: [
      { n: '①', text: '喫煙のご習慣はありますか。（※この案件は全面禁煙です）' },
      { n: '②', text: '身長・体重を教えてください。（BMI条件の確認のため）' },
      { n: '③', text: '腰痛・アトピー・アレルギーなど、持病や既往歴はありますか。' },
      { n: '④', text: '「トヨタ期間工の案件になりますので、過去の就業歴によっては入社できない場合があることをご認識ください。」' },
      {
        n: '⑤',
        text: 'ご希望の条件で、譲れないものはありますか。',
        sub: [
          '月収例は【31.6万円】です。',
          '賞与は6か月目に【99万円】、12か月目に【48.8万円】です。',
          '年収例は【560万円】です。'
        ],
        note: '※上記以外の金額・補助は、原稿にないためお約束できません。'
      },
      { n: '⑥', text: '「選考状況によっては4週間ほどお時間をいただく場合がございますが、問題ございませんか？」' }
    ],
    closing: 'ここまでの内容で、選考に進んでよろしいでしょうか。',
    results: [
      { cls: 'ok', label: '「はい」が出たら', action: '登録する' },
      {
        cls: 'ng',
        label: '曖昧（「うーん」「検討します」）なら',
        action: '登録せず、「ご検討のうえ、ご連絡ください」で終話'
      }
    ]
  };

  var OPEN = false;
  var lastFocus = null;

  function css() {
    if (document.getElementById('tk-style')) return;
    var s = document.createElement('style');
    s.id = 'tk-style';
    s.textContent =
      /* ボタン（サイドバー／ヘッダー） */
      '#tokaiBtn,#tokaiHdBtn{cursor:pointer;font-weight:800;line-height:1.25}' +
      '#tokaiBtn{display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:1px;' +
      'text-align:left;height:auto;min-height:44px;padding:7px 12px;color:#fff;' +
      'background:linear-gradient(135deg,rgba(22,163,74,.55),rgba(22,163,74,.30));' +
      'border:1px solid rgba(74,222,128,.7);border-radius:10px}' +
      '#tokaiBtn:hover{background:linear-gradient(135deg,rgba(22,163,74,.75),rgba(22,163,74,.45))}' +
      '#tokaiBtn .tk-s{font-size:11px;font-weight:700;opacity:.9}' +
      '#tokaiHdBtn{display:inline-flex;align-items:center;gap:6px;color:#fff;background:#16a34a;' +
      'border:1.25px solid #15803d;box-shadow:0 1px 4px rgba(22,163,74,.35);white-space:nowrap}' +
      '#tokaiHdBtn:hover{background:#15803d}' +
      '@media (max-width:1100px){#tokaiHdBtn .tk-s{display:none}}' +
      /* パネル */
      '.tk-back{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.58);display:flex;' +
      'align-items:center;justify-content:center;padding:12px}' +
      '.tk-panel{width:100%;max-width:780px;max-height:94vh;display:flex;flex-direction:column;background:#fff;' +
      'color:#0f172a;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.35);' +
      'font-family:"Hiragino Sans","Yu Gothic UI","Noto Sans JP",sans-serif}' +
      '.tk-head{display:flex;align-items:center;gap:10px;padding:14px 16px;background:#101a33;color:#fff}' +
      '.tk-head h2{margin:0;font-size:18px;font-weight:900;flex:1}' +
      '.tk-head h2 small{display:inline-block;margin-left:8px;font-size:12px;font-weight:700;color:#86efac}' +
      '.tk-copy,.tk-x{border:0;cursor:pointer;font:inherit;font-weight:800}' +
      '.tk-copy{padding:8px 14px;border-radius:999px;background:#16a34a;color:#fff;font-size:14px}' +
      '.tk-copy:hover{background:#15803d}' +
      '.tk-x{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,.14);color:#fff;font-size:22px;line-height:1}' +
      '.tk-x:hover{background:rgba(255,255,255,.28)}' +
      '.tk-body{padding:18px 18px 22px;overflow:auto;font-size:18px;line-height:1.85;-webkit-overflow-scrolling:touch}' +
      '.tk-intro{margin:0 0 14px;padding:10px 14px;border-radius:10px;background:#eef2ff;color:#1e1b4b;font-weight:800}' +
      '.tk-step{display:flex;gap:12px;margin:0 0 12px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}' +
      '.tk-no{flex:none;width:34px;height:34px;border-radius:50%;background:#16a34a;color:#fff;font-weight:900;' +
      'display:flex;align-items:center;justify-content:center;font-size:17px;margin-top:2px}' +
      '.tk-main{flex:1;min-width:0;font-weight:700}' +
      '.tk-sub{margin:8px 0 0;padding:8px 12px;border-left:4px solid #f59e0b;background:#fffbeb;border-radius:0 8px 8px 0;font-weight:700}' +
      '.tk-sub div{margin:1px 0}' +
      '.tk-note{margin-top:8px;font-size:15px;font-weight:700;color:#b91c1c}' +
      '.tk-ph{background:#ffe9a8;border-radius:4px;padding:0 3px;font-weight:900}' +
      '.tk-close{margin:16px 0 12px;padding:12px 14px;border-radius:12px;background:#101a33;color:#fff;font-weight:900}' +
      '.tk-res{display:flex;gap:10px;align-items:flex-start;margin:0 0 8px;padding:10px 14px;border-radius:12px;font-weight:800}' +
      '.tk-res.ok{background:#dcfce7;border:1.5px solid #16a34a;color:#14532d}' +
      '.tk-res.ng{background:#fef3c7;border:1.5px solid #d97706;color:#78350f}' +
      '.tk-res i{flex:none;font-style:normal;font-weight:900;margin-top:1px}' +
      '.tk-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:100000;background:#0f172a;' +
      'color:#fff;padding:10px 18px;border-radius:999px;font-size:14px;font-weight:800}' +
      '@media (max-width:600px){.tk-body{font-size:17px;padding:14px 12px 18px}.tk-head h2{font-size:16px}' +
      '.tk-head h2 small{display:none}.tk-step{padding:10px}.tk-no{width:30px;height:30px;font-size:15px}}';
    document.head.appendChild(s);
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  /* 【　】を黄色でハイライトしながら、テキストを追加する */
  function rich(parent, text) {
    String(text).split(/(【[^】]*】)/).forEach(function (part) {
      if (!part) return;
      if (/^【[^】]*】$/.test(part)) parent.appendChild(el('span', 'tk-ph', part));
      else parent.appendChild(document.createTextNode(part));
    });
    return parent;
  }

  /* コピー用: 読み上げる文だけをテキストにする（判定の案内は含めない） */
  function plainText() {
    var d = SCRIPT_DATA, out = [d.intro];
    d.steps.forEach(function (s) {
      out.push(s.n + s.text);
      (s.sub || []).forEach(function (t) { out.push(t); });
      if (s.note) out.push(s.note);
    });
    out.push(d.closing);
    return out.join('\n');
  }

  function toast(msg) {
    var t = el('div', 'tk-toast', msg);
    document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 1600);
  }

  function copyText() {
    var txt = plainText();
    function fallback() {
      try {
        var ta = document.createElement('textarea');
        ta.value = txt;
        ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        toast(ok ? 'コピーしました' : 'コピーできませんでした');
      } catch (e) { toast('コピーできませんでした'); }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(function () { toast('コピーしました'); }, fallback);
    } else fallback();
  }

  function onKey(e) {
    if (e.key === 'Escape') closePanel();
  }

  function closePanel() {
    var b = document.getElementById('tk-back');
    if (b && b.parentNode) b.parentNode.removeChild(b);
    document.removeEventListener('keydown', onKey, true);
    document.documentElement.style.overflow = '';
    OPEN = false;
    try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) {}
  }

  function openPanel() {
    if (OPEN) return;
    try {
      css();
      var d = SCRIPT_DATA;
      lastFocus = document.activeElement;

      var back = el('div', 'tk-back');
      back.id = 'tk-back';
      back.addEventListener('mousedown', function (e) { if (e.target === back) closePanel(); });

      var panel = el('div', 'tk-panel');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', d.title);

      var head = el('div', 'tk-head');
      var h = el('h2', null, d.title);
      h.appendChild(el('small', null, '登録前の確認'));
      var cp = el('button', 'tk-copy', '読み上げ文をコピー');
      cp.type = 'button';
      cp.addEventListener('click', copyText);
      var x = el('button', 'tk-x', '×');
      x.type = 'button';
      x.setAttribute('aria-label', '閉じる');
      x.addEventListener('click', closePanel);
      head.appendChild(h); head.appendChild(cp); head.appendChild(x);

      var body = el('div', 'tk-body');
      body.appendChild(rich(el('p', 'tk-intro'), d.intro));

      d.steps.forEach(function (s) {
        var row = el('div', 'tk-step');
        row.appendChild(el('div', 'tk-no', s.n));
        var main = el('div', 'tk-main');
        main.appendChild(rich(el('div'), s.text));
        if (s.sub && s.sub.length) {
          var sub = el('div', 'tk-sub');
          s.sub.forEach(function (t) { sub.appendChild(rich(el('div'), t)); });
          main.appendChild(sub);
        }
        if (s.note) main.appendChild(el('div', 'tk-note', s.note));
        row.appendChild(main);
        body.appendChild(row);
      });

      body.appendChild(rich(el('div', 'tk-close'), d.closing));
      d.results.forEach(function (r) {
        var row = el('div', 'tk-res ' + r.cls);
        row.appendChild(el('i', null, r.cls === 'ok' ? '○' : '△'));
        row.appendChild(el('span', null, r.label + ' → ' + r.action));
        body.appendChild(row);
      });

      panel.appendChild(head); panel.appendChild(body);
      back.appendChild(panel);
      document.body.appendChild(back);
      document.documentElement.style.overflow = 'hidden';
      document.addEventListener('keydown', onKey, true);
      OPEN = true;
      x.focus();
    } catch (e) { OPEN = false; }
  }

  /* ───────── ボタンの追加 ───────── */
  function makeLabel(btn) {
    btn.appendChild(el('span', 'tk-l', '📋 スタッフ東海'));
    btn.appendChild(el('span', 'tk-s', 'トークスクリプト'));
  }

  function addSideBtn(nav) {
    if (document.getElementById('tokaiBtn')) return true;
    var b = el('button', 'hd-btn bl');
    b.id = 'tokaiBtn';
    b.type = 'button';
    b.title = 'スタッフ東海の登録前確認トーク（トヨタ期間工）を開く';
    b.setAttribute('aria-label', 'スタッフ東海トークスクリプト');
    makeLabel(b);
    b.addEventListener('click', openPanel);
    /* 「スクリプト」リンクの直前。無ければ「ツール」欄の末尾付近、最後は nav の末尾 */
    var anchor = nav.querySelector('a[href="./script.html"]') || document.getElementById('apOpenBtn');
    if (anchor && anchor.parentNode === nav) {
      if (anchor.tagName === 'A') nav.insertBefore(b, anchor);
      else nav.insertBefore(b, anchor.nextSibling);
    } else nav.appendChild(b);
    return true;
  }

  function addHeaderBtn(hd) {
    if (document.getElementById('tokaiHdBtn')) return true;
    var b = el('button', 'hd-btn');
    b.id = 'tokaiHdBtn';
    b.type = 'button';
    b.title = 'スタッフ東海トークスクリプトを開く';
    b.setAttribute('aria-label', 'スタッフ東海トークスクリプト');
    b.appendChild(el('span', 'tk-l', '📋 スタッフ東海'));
    b.appendChild(el('span', 'tk-s', 'トークスクリプト'));
    b.addEventListener('click', openPanel);
    var ruby = document.getElementById('rubyBtn');
    if (ruby && ruby.parentNode === hd) hd.insertBefore(b, ruby);
    else hd.appendChild(b);
    return true;
  }

  function init() {
    css();
    var n = 0, tm = setInterval(function () {
      try {
        var nav = document.getElementById('sidenav');
        var hd = document.querySelector('header');
        if (nav && hd) {
          addSideBtn(nav);
          addHeaderBtn(hd);
          clearInterval(tm);
        } else if (++n > 150) clearInterval(tm);
      } catch (e) { clearInterval(tm); }
    }, 100);
  }

  /* 動作確認・他スクリプトからの呼び出し用 */
  window.openTokaiScript = openPanel;
  init();
})();
