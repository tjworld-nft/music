/* 2026-09-27 リニューアル前のページがブラウザに残っていたときの橋渡し。
   新しいページ（#uo-data を持つ）以外で読まれたら、最新のページを読み直す。2026-10-31 以降は削除してよい。 */
(function () {
  if (document.getElementById('uo-data')) return;
  var pre = document.getElementById('preloader');
  if (pre) pre.remove();
  try { if (sessionStorage.getItem('tj-bridge') === '1') return; sessionStorage.setItem('tj-bridge', '1'); } catch (e) { /* ignore */ }
  location.reload();
})();
