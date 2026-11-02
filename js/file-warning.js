// Browsers refuse to run the site's module scripts when a page is opened straight from disk
// (file://), which leaves a blank page. This plain script still runs there, so it explains
// how to start the local server instead.
(function () {
  if (location.protocol !== 'file:') return;
  var page = /organize\.html$/i.test(location.pathname) ? 'organize.html' : '';
  var url = 'http://localhost:5199/' + page;
  var app = document.getElementById('app');
  app.innerHTML =
    '<section class="card">' +
      '<div class="big-icon" aria-hidden="true">🛑</div>' +
      '<h2 class="center">Security needs a server</h2>' +
      '<p>Browsers won’t run this site when it’s opened straight from a folder on your computer. KRAMPUS.exe finds this hilarious.</p>' +
      '<ol class="steps">' +
        '<li>Open a terminal in the <code>SecretSanta</code> folder.</li>' +
        '<li>Run <code>npm start</code>.</li>' +
        '<li>Go to <a href="' + url + '">' + url + '</a>.</li>' +
      '</ol>' +
      '<p class="hint">Once it’s on GitHub Pages, use the hosted address instead. See README.md.</p>' +
    '</section>';
})();
