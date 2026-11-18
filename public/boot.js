/* global Promise */
/*
 * 起動の復旧（LLM-PBI-0012・LLM-GUI-0003 §6。テンプレート §5.9）。
 * アプリ本体より先に読む普通のスクリプト（モジュールでない）。本体が読めない・古いブラウザでも動くよう ES5 で書く。
 * 8 秒たってもアプリが最初の画面を出したと知らせなければ（window.__lastLineMiniBooted）、復旧の画面を出す。
 * 復旧の画面はアプリの CSS が読めていない前提で、見た目をインラインの style で決める。
 * 「キャッシュを消して再読み込み」は、自分のチャンネルの SW の登録とキャッシュだけを消す。localStorage（ランキング）は消さない。
 * チャンネルの値（app-id・範囲）は index.html の script の data 属性で受け取る。
 */
(function () {
  'use strict';
  var script = document.currentScript;
  var appId = (script && script.getAttribute('data-app-id')) || '';
  var scope = (script && script.getAttribute('data-scope')) || '/';
  var BOOT_TIMEOUT_MS = 8000;
  var booted = false;

  /** 自分のチャンネルのキャッシュか。Workbox の名前は「<app-id>-precache-…」「<app-id>-runtime-…」。
   * 本番の app-id はプレビューの app-id の頭と同じなので、続きの名前まで見る（本番がプレビューのキャッシュを消さない） */
  function isOwnCache(name) {
    var head = appId + '-';
    if (!appId || name.indexOf(head) !== 0) return false;
    var rest = name.slice(head.length);
    return rest.indexOf('precache') === 0 || rest.indexOf('runtime') === 0;
  }

  function clearOwn() {
    var scopeUrl = new URL(scope, location.href).href;
    var jobs = [];
    if (window.caches) {
      jobs.push(
        caches.keys().then(function (names) {
          return Promise.all(
            names.filter(isOwnCache).map(function (n) {
              return caches.delete(n);
            })
          );
        })
      );
    }
    if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
      jobs.push(
        navigator.serviceWorker.getRegistrations().then(function (regs) {
          return Promise.all(
            regs
              .filter(function (r) {
                return r.scope === scopeUrl;
              })
              .map(function (r) {
                return r.unregister();
              })
          );
        })
      );
    }
    return Promise.all(jobs);
  }

  function button(id, label, onClick) {
    var b = document.createElement('button');
    b.id = id;
    b.type = 'button';
    b.textContent = label;
    b.setAttribute(
      'style',
      'display:block;width:260px;min-height:48px;margin:0 auto 16px;padding:8px;' +
        'border:2px solid #6cff8a;border-radius:0;background:#05070f;color:#6cff8a;' +
        'font:bold 16px sans-serif;cursor:pointer;-webkit-appearance:none;appearance:none;'
    );
    b.addEventListener('click', onClick);
    return b;
  }

  function text(tag, content, style) {
    var el = document.createElement(tag);
    el.textContent = content;
    el.setAttribute('style', style);
    return el;
  }

  function showRecovery() {
    if (booted || document.getElementById('boot-recovery')) return;
    var box = document.createElement('div');
    box.id = 'boot-recovery';
    box.setAttribute('role', 'alert');
    box.setAttribute(
      'style',
      'position:fixed;left:0;top:0;right:0;bottom:0;z-index:2147483647;overflow:auto;' +
        'background:#000000;color:#e0e0e0;font-family:sans-serif;text-align:center;' +
        'padding:64px 16px 16px;box-sizing:border-box;'
    );
    box.appendChild(text('p', '起動できませんでした', 'margin:0 0 24px;font-size:20px;font-weight:bold;'));
    box.appendChild(text('p', '通信の状態を確かめて、', 'margin:0;font-size:16px;'));
    box.appendChild(text('p', '読み込み直してください。', 'margin:0 0 32px;font-size:16px;'));
    box.appendChild(
      button('boot-reload', '再読み込み', function () {
        location.reload();
      })
    );
    box.appendChild(
      button('boot-clear', 'キャッシュを消して再読み込み', function () {
        clearOwn().then(
          function () {
            location.reload();
          },
          function () {
            location.reload();
          }
        );
      })
    );
    box.appendChild(text('p', 'ランキングは消えません。', 'margin:0;font-size:14px;color:#aaaaaa;'));
    document.body.appendChild(box);
    document.body.setAttribute('data-boot', 'recovery');
  }

  var timer = setTimeout(showRecovery, BOOT_TIMEOUT_MS);

  /** アプリが最初の画面を出したら呼ぶ（src/main.ts） */
  window.__lastLineMiniBooted = function () {
    booted = true;
    clearTimeout(timer);
    document.body.setAttribute('data-boot', 'ok');
  };
})();
