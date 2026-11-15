// Injected by the Salamon Android app before the page's own scripts.
// A WebView has no Notification API, so this provides one backed by real phone notifications.
(function () {
  if (window.__salamonBridge || !window.SalamonNative) return;
  window.__salamonBridge = true;
  var N = window.SalamonNative, waiting = {}, seq = 0, byTag = {};

  function SalamonNotification(title, opts) {
    opts = opts || {};
    this.title = String(title || '');
    this.body = String(opts.body || '');
    this.tag = String(opts.tag || 'salamon');
    this.onclick = null;
    this.onclose = null;
    byTag[this.tag] = this;
    N.notify(this.title, this.body, this.tag);
  }
  SalamonNotification.prototype.close = function () { N.cancel(this.tag); };
  SalamonNotification.prototype.addEventListener = function (type, fn) { if (type === 'click') this.onclick = fn; };
  Object.defineProperty(SalamonNotification, 'permission', { get: function () { return N.permission(); } });
  SalamonNotification.requestPermission = function (cb) {
    return new Promise(function (resolve) {
      var id = ++seq;
      waiting[id] = function (p) { resolve(p); if (typeof cb === 'function') cb(p); };
      N.requestPermission(id);
    });
  };
  window.Notification = SalamonNotification;

  // Called by the app.
  window.__salamonPermission = function (id, p) { var f = waiting[id]; delete waiting[id]; if (f) f(p); };
  window.__salamonNotificationClick = function (tag) {
    var n = byTag[tag];
    if (n && typeof n.onclick === 'function') { try { n.onclick({ target: n }); } catch (e) {} }
  };

  // For the site: lets it know it runs inside the app and get the push token.
  window.SalamonApp = {
    isApp: true,
    version: N.version(),
    pushToken: function () { return N.pushToken(); }
  };
})();
