// Sitelock gate. Loaded synchronously from index.html. Depends on lock-policy.js
// having been loaded first (it sets window.__rg_policy). Overrides the inline
// __rikeGate placeholder declared in index.html with the real implementation.
//
// Source-of-truth for hosts/referrers: Tools/Sitelock/policy.json
//   (regen via: python3 Tools/Sitelock/generate.py)
(function () {
  if (!window.__rg_policy) {
    // Policy file failed to load — treat as fail-closed. Inline placeholder will render block page.
    return;
  }
  var P = window.__rg_policy;

  function normalizeHost(h) {
    if (!h) return "";
    h = String(h).toLowerCase();
    // Strip IPv6 brackets: [::1] -> ::1
    if (h.length > 1 && h.charAt(0) === "[" && h.charAt(h.length - 1) === "]") {
      h = h.substring(1, h.length - 1);
    }
    // Strip trailing dot
    if (h.length > 0 && h.charAt(h.length - 1) === ".") {
      h = h.substring(0, h.length - 1);
    }
    return h;
  }

  function hostAllowed(host) {
    if (!host) return false;
    if (P.EXACT_HOSTS.indexOf(host) !== -1) return true;
    for (var i = 0; i < P.SUFFIX_HOSTS.length; i++) {
      var suf = P.SUFFIX_HOSTS[i];
      if (host.length >= suf.length && host.lastIndexOf(suf) === host.length - suf.length) return true;
    }
    return false;
  }

  function findReferrerRule(host) {
    for (var i = 0; i < P.REFERRER_RULES.length; i++) {
      var r = P.REFERRER_RULES[i];
      var suf = r.matchHostSuffix;
      if (host.length >= suf.length && host.lastIndexOf(suf) === host.length - suf.length) return r;
    }
    return null;
  }

  function requireTopFrame(host) {
    return P.REQUIRE_TOP_FRAME.indexOf(host) !== -1;
  }

  function parseReferrerHost() {
    var raw = document.referrer;
    if (!raw) return "";
    try {
      return normalizeHost(new URL(raw).hostname);
    } catch (_e) {
      return "";
    }
  }

  window.__rikeGate = function (onPass, onFail) {
    var host = normalizeHost(location.hostname);

    if (!hostAllowed(host)) { onFail("host_not_allowed"); return; }

    if (requireTopFrame(host)) {
      // Belt-and-braces alongside server-side CSP frame-ancestors 'self'.
      // Intentionally does NOT use location.ancestorOrigins (not portable).
      try {
        if (window.top !== window.self) { onFail("iframed_top_required"); return; }
      } catch (_e) {
        // Cross-origin top access threw — that itself means we are iframed.
        onFail("iframed_top_required"); return;
      }
    }

    var rule = findReferrerRule(host);
    if (rule) {
      var refHost = parseReferrerHost();
      if (!refHost) {
        if (!rule.emptyReferrerAllowed) { onFail("empty_referrer"); return; }
      } else if (rule.allowedReferrerExact.indexOf(refHost) === -1) {
        onFail("referrer_not_allowed"); return;
      }
    }

    onPass({ host: location.hostname, ref: document.referrer || "" });
  };
})();
