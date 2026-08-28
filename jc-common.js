/**
 * ジョブコンプラス 共通パーツ  v1
 * ------------------------------------------------------------
 * 架電スクリプトHTMLの </body> の直前に、次の1行を入れるだけで動きます。
 *
 *   <script src="./jc-common.js"></script>
 *
 * このファイルがやること：
 *   1. ヘッダー右上に「求人サーチ」へのリンクを自動で追加
 *   2. スクリプトの更新を定期的に確認し、見つかったら画面下に案内を出す
 *      （※勝手にリロードはしません。オペレーターがタップした時だけ切り替わります）
 * ------------------------------------------------------------
 */
(function () {
  "use strict";

  var SEARCH_URL = "./index.html";   // 求人サーチのURL
  var CHECK_INTERVAL_MS = 3 * 60 * 1000;  // 更新確認の間隔（3分）
  var currentTag = null;
  var notified = false;

  /* ========== 1. スタイル ========== */
  function injectStyle() {
    var css =
      '.jc-link{flex-shrink:0;display:inline-flex;align-items:center;gap:4px;' +
      'padding:6px 13px;border-radius:30px;background:rgba(255,255,255,.14);' +
      'border:1.5px solid rgba(255,255,255,.35);color:#fff;font-size:12px;' +
      'font-weight:700;text-decoration:none;white-space:nowrap;}' +
      '.jc-link:hover{background:rgba(255,255,255,.26);}' +

      '.jc-bar{position:fixed;left:0;right:0;bottom:0;z-index:9999;' +
      'background:#0b5e3c;color:#fff;padding:12px 16px;' +
      'padding-bottom:calc(12px + env(safe-area-inset-bottom,0px));' +
      'display:flex;align-items:center;justify-content:center;gap:14px;' +
      'font-size:13px;font-weight:700;box-shadow:0 -3px 14px rgba(0,0,0,.28);' +
      'transform:translateY(110%);transition:transform .35s ease;}' +
      '.jc-bar.on{transform:translateY(0);}' +
      '.jc-bar-btn{background:#fff;color:#0b5e3c;border:none;border-radius:30px;' +
      'padding:8px 18px;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap;}' +
      '.jc-bar-x{background:none;border:none;color:rgba(255,255,255,.7);' +
      'font-size:18px;cursor:pointer;padding:0 4px;line-height:1;}';

    var el = document.createElement("style");
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ========== 2. 求人サーチへのリンクを追加 ========== */
  function injectNavLink() {
    var inner = document.querySelector(".hd-inner");
    if (!inner) return;
    // すでにリンクがある場合は二重に付けない
    if (inner.querySelector(".jc-link") || inner.querySelector(".hd-link")) return;

    var a = document.createElement("a");
    a.className = "jc-link";
    a.href = SEARCH_URL;
    a.textContent = "🔍 求人サーチ";
    inner.appendChild(a);
  }

  /* ========== 3. 更新のお知らせバー ========== */
  function buildBar() {
    var bar = document.createElement("div");
    bar.className = "jc-bar";
    bar.id = "jcBar";

    var msg = document.createElement("span");
    msg.textContent = "スクリプトが更新されました";

    var btn = document.createElement("button");
    btn.className = "jc-bar-btn";
    btn.textContent = "最新を表示";
    btn.onclick = function () {
      location.reload();
    };

    var close = document.createElement("button");
    close.className = "jc-bar-x";
    close.setAttribute("aria-label", "閉じる");
    close.textContent = "\u2715";
    close.onclick = function () {
      bar.classList.remove("on");
    };

    bar.appendChild(msg);
    bar.appendChild(btn);
    bar.appendChild(close);
    document.body.appendChild(bar);
    return bar;
  }

  function showBar() {
    if (notified) return;
    notified = true;
    var bar = document.getElementById("jcBar") || buildBar();
    // 描画を挟んでからアニメーションさせる
    requestAnimationFrame(function () {
      bar.classList.add("on");
    });
  }

  /* ========== 4. 更新チェック本体 ========== */
  // サーバー上のファイルが差し替わると ETag / Last-Modified が変わる。
  // それを見張るだけなので、中身のダウンロードは発生しない（HEADリクエスト）。
  function checkUpdate() {
    if (notified) return;
    var url = location.pathname + "?jc=" + Date.now();

    fetch(url, { method: "HEAD", cache: "no-store" })
      .then(function (res) {
        if (!res.ok) return;
        var tag = res.headers.get("etag") || res.headers.get("last-modified");
        if (!tag) return;

        if (currentTag === null) {
          currentTag = tag;      // 初回：今の状態を覚えるだけ
          return;
        }
        if (tag !== currentTag) {
          showBar();
        }
      })
      .catch(function () {
        /* 通信エラーは黙って無視（圏外など） */
      });
  }

  /* ========== 5. 起動 ========== */
  function start() {
    injectStyle();
    injectNavLink();

    checkUpdate();
    setInterval(checkUpdate, CHECK_INTERVAL_MS);

    // タブに戻ってきた時にも確認する
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) checkUpdate();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
