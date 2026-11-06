/**
 * JCコールナビ ─ 要注力案件のポップアップ表示
 * ログイン後の画面で、下の FOCUS_JOBS に載せた案件を「要注力」として目立たせる。
 *  ・求人カード: 先頭に赤の「要注力」帯（時給・入社特典つき）。帯をタップするとポップアップを開く
 *  ・ポップアップ: ログイン直後に1回自動表示（ブラウザを閉じるまで再表示しない）。ESC・背景クリック・×で閉じる
 *  ・右下の「要注力 N件」ボタンから、いつでも開き直せる
 *
 * 読み込み元: index.html のログイン後フック addFocus()
 * 案件の追加・削除・文言の修正は、下の FOCUS_JOBS だけ書き換えればよい。
 * 失敗時は何も表示しない（ナビ本体には影響しない）。
 */
(function () {
  'use strict';
  if (window.__focusPopupLoaded) return;
  window.__focusPopupLoaded = true;

  /* ───────── 要注力案件（ここを編集する） ───────── */
  var FOCUS_JOBS = [
    {
      id: '818284',
      jn: 'a00abk_01a',
      wage: '時給1,750円',
      bonus: '入社特典（3か月間）寮費補助・食事補助'
    },
    {
      id: '818272',
      jn: '[Y]a00avv_01a',
      wage: '時給1,750円',
      bonus: '入社特典（3か月間）寮費補助・食事補助'
    }
  ];

  var SEEN_KEY = 'jcf_seen_v1';

  /* ───────── スタイル ───────── */
  function addStyle() {
    if (document.getElementById('jcf-style')) return;
    var st = document.createElement('style');
    st.id = 'jcf-style';
    st.textContent =
      '.jcf-card{outline:3px solid #e60012!important;outline-offset:-3px;box-shadow:0 0 0 4px rgba(230,0,18,.15),0 6px 18px rgba(230,0,18,.25)!important;position:relative}' +
      '.jcf-bar{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;width:100%;box-sizing:border-box;margin:0;padding:9px 12px;background:linear-gradient(90deg,#e60012,#ff5a00);color:#fff;border:0;border-radius:0;font:inherit;font-weight:800;font-size:15px;text-align:left;cursor:pointer;line-height:1.4;animation:jcf-pulse 1.8s ease-in-out infinite}' +
      '.jcf-bar .jcf-tag{background:#fff;color:#e60012;border-radius:999px;padding:2px 10px;font-size:14px;font-weight:900;letter-spacing:.05em}' +
      '.jcf-bar .jcf-w{font-size:17px}' +
      '.jcf-bar .jcf-b{font-size:13px;font-weight:700;opacity:.97}' +
      '.jcf-bar .jcf-more{margin-left:auto;font-size:12px;font-weight:700;text-decoration:underline}' +
      '@keyframes jcf-pulse{0%,100%{filter:brightness(1)}50%{filter:brightness(1.18)}}' +
      '.jcf-ov{position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}' +
      '.jcf-ov[hidden]{display:none}' +
      '.jcf-pn{position:relative;width:100%;max-width:460px;max-height:90vh;overflow:auto;background:#fff;border-radius:14px;border:4px solid #e60012;box-shadow:0 12px 40px rgba(0,0,0,.4);animation:jcf-pop .22s ease-out}' +
      '@keyframes jcf-pop{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}' +
      '.jcf-hd{background:linear-gradient(90deg,#e60012,#ff5a00);color:#fff;padding:14px 44px 14px 16px;font-size:20px;font-weight:900;letter-spacing:.04em}' +
      '.jcf-hd small{display:block;margin-top:2px;font-size:12px;font-weight:700;opacity:.95}' +
      '.jcf-x{position:absolute;top:8px;right:8px;width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.95);color:#e60012;font-size:22px;font-weight:900;line-height:1;cursor:pointer}' +
      '.jcf-bd{padding:12px;display:flex;flex-direction:column;gap:10px}' +
      '.jcf-it{border:2px solid #ffb3b8;background:#fff7f7;border-radius:10px;padding:12px}' +
      '.jcf-it.cur{border-color:#e60012;background:#fff0f0;box-shadow:0 0 0 3px rgba(230,0,18,.2)}' +
      '.jcf-ids{font-size:12px;color:#555;margin-bottom:4px;word-break:break-all}' +
      '.jcf-co{font-size:14px;font-weight:700;color:#222;margin-bottom:2px}' +
      '.jcf-lc{font-size:12px;color:#444;margin-bottom:6px}' +
      '.jcf-wg{font-size:30px;font-weight:900;color:#e60012;line-height:1.2}' +
      '.jcf-bn{margin-top:6px;display:inline-block;background:#ffe14d;color:#5a3a00;border-radius:6px;padding:5px 9px;font-size:14px;font-weight:800}' +
      '.jcf-go{display:block;width:100%;margin-top:10px;padding:10px;border:0;border-radius:8px;background:#e60012;color:#fff;font:inherit;font-size:14px;font-weight:800;cursor:pointer}' +
      '.jcf-ft{padding:0 12px 14px}' +
      '.jcf-cl{display:block;width:100%;padding:11px;border:2px solid #ccc;border-radius:8px;background:#fff;color:#333;font:inherit;font-size:14px;font-weight:700;cursor:pointer}' +
      '.jcf-fab{position:fixed;right:14px;bottom:14px;z-index:9990;border:0;border-radius:999px;padding:11px 16px;background:linear-gradient(90deg,#e60012,#ff5a00);color:#fff;font:inherit;font-size:14px;font-weight:900;box-shadow:0 4px 14px rgba(230,0,18,.45);cursor:pointer;animation:jcf-pulse 1.8s ease-in-out infinite}' +
      '@media(max-width:480px){.jcf-wg{font-size:26px}.jcf-bar{font-size:14px}}';
    document.head.appendChild(st);
  }

  /* ───────── 補助 ───────── */
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function findJob(id) {
    for (var i = 0; i < FOCUS_JOBS.length; i++) if (FOCUS_JOBS[i].id === id) return FOCUS_JOBS[i];
    return null;
  }
  /* カードから案件IDを読む。アポ報告ボタンの data-id を優先し、無ければ「案件ID ○○」の文字から探す */
  function jobOfCard(card) {
    var b = card.querySelector('[data-id]');
    if (b) { var j = findJob(b.getAttribute('data-id')); if (j) return j; }
    var t = card.textContent || '';
    for (var i = 0; i < FOCUS_JOBS.length; i++) {
      if (t.indexOf('案件ID ' + FOCUS_JOBS[i].id) !== -1 || t.indexOf('案件ID　' + FOCUS_JOBS[i].id) !== -1) return FOCUS_JOBS[i];
    }
    return null;
  }
  function cardById(id) {
    var cards = document.querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) {
      var j = jobOfCard(cards[i]);
      if (j && j.id === id) return cards[i];
    }
    return null;
  }

  /* ───────── ポップアップ ───────── */
  var overlay = null;
  function closePopup() { if (overlay) overlay.hidden = true; }
  function openPopup(curId) {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = el('div', 'jcf-ov');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '要注力案件');
    overlay.addEventListener('click', function (e) { if (e.target === overlay) closePopup(); });

    var pn = el('div', 'jcf-pn');
    var hd = el('div', 'jcf-hd', '🔥 要注力案件');
    hd.appendChild(el('small', null, '優先して案内してください（' + FOCUS_JOBS.length + '件）'));
    var x = el('button', 'jcf-x', '×');
    x.type = 'button';
    x.setAttribute('aria-label', '閉じる');
    x.addEventListener('click', closePopup);
    pn.appendChild(hd);
    pn.appendChild(x);

    var bd = el('div', 'jcf-bd');
    FOCUS_JOBS.forEach(function (j) {
      var it = el('div', 'jcf-it' + (j.id === curId ? ' cur' : ''));
      it.appendChild(el('div', 'jcf-ids', '案件ID ' + j.id + '　/　仕事No. ' + j.jn));
      var card = cardById(j.id);
      if (card) {
        var co = card.querySelector('.c-co'), lc = card.querySelector('.c-loc');
        if (co) {
          var coText = (co.textContent || '').replace(/優先\d+|BL確認必要/g, '').trim();
          if (coText) it.appendChild(el('div', 'jcf-co', coText));
        }
        if (lc) {
          var lcText = '';
          lc.childNodes.forEach(function (n) {
            if (n.nodeType === 1 && n.tagName === 'RUBY') lcText += n.firstChild.textContent;
          });
          if (lcText) it.appendChild(el('div', 'jcf-lc', lcText));
        }
      }
      it.appendChild(el('div', 'jcf-wg', j.wage));
      it.appendChild(el('div', 'jcf-bn', '🎁 ' + j.bonus));
      var go = el('button', 'jcf-go', '一覧のこの案件を見る');
      go.type = 'button';
      go.addEventListener('click', function () {
        closePopup();
        var c = cardById(j.id);
        if (c && c.scrollIntoView) c.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else try { var inp = document.querySelector('input[type=search],input[type=text]'); if (inp) { inp.focus(); } } catch (e) {}
      });
      it.appendChild(go);
      bd.appendChild(it);
    });
    pn.appendChild(bd);

    var ft = el('div', 'jcf-ft');
    var cl = el('button', 'jcf-cl', '閉じる');
    cl.type = 'button';
    cl.addEventListener('click', closePopup);
    ft.appendChild(cl);
    pn.appendChild(ft);

    overlay.appendChild(pn);
    document.body.appendChild(overlay);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay && !overlay.hidden) closePopup();
  });

  /* ───────── カードへの帯 ───────── */
  function decorate() {
    var cards = document.querySelectorAll('.card');
    for (var i = 0; i < cards.length; i++) {
      var card = cards[i];
      var j = jobOfCard(card);
      var bar = card.querySelector(':scope > .jcf-bar');
      if (!j) {
        if (bar) { bar.remove(); card.classList.remove('jcf-card'); }
        continue;
      }
      if (bar && bar.getAttribute('data-id') === j.id) continue;
      if (bar) bar.remove();
      card.classList.add('jcf-card');
      bar = el('button', 'jcf-bar');
      bar.type = 'button';
      bar.setAttribute('data-id', j.id);
      bar.appendChild(el('span', 'jcf-tag', '🔥 要注力'));
      bar.appendChild(el('span', 'jcf-w', j.wage));
      bar.appendChild(el('span', 'jcf-b', j.bonus));
      bar.appendChild(el('span', 'jcf-more', '詳しく見る'));
      (function (id) {
        bar.addEventListener('click', function (ev) { ev.stopPropagation(); openPopup(id); });
      })(j.id);
      card.insertBefore(bar, card.firstChild);
    }
  }

  /* ───────── 右下ボタン ───────── */
  function addFab() {
    if (document.getElementById('jcfFab')) return;
    var f = el('button', 'jcf-fab', '🔥 要注力 ' + FOCUS_JOBS.length + '件');
    f.id = 'jcfFab';
    f.type = 'button';
    f.addEventListener('click', function () { openPopup(''); });
    document.body.appendChild(f);
  }

  /* ───────── 起動 ───────── */
  function start() {
    addStyle();
    addFab();
    decorate();
    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; try { decorate(); addFab(); } catch (e) {} });
    }).observe(document.body, { childList: true, subtree: true });

    var seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch (e) {}
    if (!seen) {
      /* 一覧の描画を少し待ってから、1回だけ自動表示 */
      var tries = 0, tm = setInterval(function () {
        tries++;
        if (document.querySelector('.card') || tries > 40) {
          clearInterval(tm);
          try { sessionStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
          try { decorate(); openPopup(''); } catch (e) {}
        }
      }, 250);
    }
  }

  try {
    if (document.body) start();
    else document.addEventListener('DOMContentLoaded', function () { try { start(); } catch (e) {} });
  } catch (e) {}
})();
