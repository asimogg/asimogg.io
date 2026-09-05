(function () {
  "use strict";

  var html = document.documentElement;

  /* ---------- language ---------- */
  function detectLang() {
    try {
      var stored = localStorage.getItem("lang");
      if (stored === "en" || stored === "tr") return stored;
    } catch (e) { /* storage unavailable */ }
    var nav = (navigator.language || "").toLowerCase();
    return nav.indexOf("tr") === 0 ? "tr" : "en";
  }

  function applyLang(lang) {
    html.setAttribute("data-lang", lang);
    html.setAttribute("lang", lang);
    try { localStorage.setItem("lang", lang); } catch (e) { /* ignore */ }

    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.setAttribute("aria-pressed", String(btn.dataset.setLang === lang));
    });

    // placeholders
    document.querySelectorAll("[data-ph-en]").forEach(function (el) {
      el.placeholder = lang === "tr" ? el.dataset.phTr : el.dataset.phEn;
    });

    // select options
    document.querySelectorAll("option[data-en]").forEach(function (opt) {
      opt.textContent = lang === "tr" ? opt.dataset.tr : opt.dataset.en;
    });


    // document title + hidden form field
    document.title =
      lang === "tr"
        ? "Gerçek İş Yapan Yapay Zekâ Otomasyonları"
        : "AI Automations That Do Real Work";
    var langField = document.querySelector('input[name="_language"]');
    if (langField) langField.value = lang;
  }

  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyLang(btn.dataset.setLang);
    });
  });

  applyLang(detectLang());

  // let the load reveal finish, then drop the animation scope so a later
  // language toggle shows content statically instead of replaying it
  setTimeout(function () {
    document.body.classList.remove("entrance");
  }, 2400);

  var CFG = window.ASIMOGG || {};
  function currentLang() { return html.getAttribute("data-lang") === "tr" ? "tr" : "en"; }

  /* ---------- Google Analytics (consent first) ---------- */
  var consentBar = document.getElementById("consent");
  var gaLoaded = false;

  function loadGA() {
    if (gaLoaded || !CFG.gaId) return;
    gaLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", CFG.gaId, { anonymize_ip: true });
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(CFG.gaId);
    document.head.appendChild(s);
  }
  function track(name, params) {
    if (gaLoaded && window.gtag) window.gtag("event", name, params || {});
  }
  if (CFG.gaId && consentBar) {
    var choice = null;
    try { choice = localStorage.getItem("ga-consent"); } catch (e) { /* ignore */ }
    var countdown = null;
    function decide(answer) {
      if (countdown) { clearInterval(countdown); countdown = null; }
      try { localStorage.setItem("ga-consent", answer); } catch (e) { /* ignore */ }
      consentBar.hidden = true;
      if (answer === "yes") loadGA();
    }
    if (choice === "yes") loadGA();
    else if (choice !== "no") {
      // no answer within 10 s counts as consent
      var left = 10;
      var counters = consentBar.querySelectorAll(".consent-count");
      consentBar.hidden = false;
      countdown = setInterval(function () {
        left -= 1;
        counters.forEach(function (c) { c.textContent = String(left); });
        if (left <= 0) decide("yes");
      }, 1000);
    }
    document.getElementById("consent-yes").addEventListener("click", function () { decide("yes"); });
    document.getElementById("consent-no").addEventListener("click", function () { decide("no"); });
  }

  /* ---------- Google Sign-In gate ---------- */
  var gate = document.getElementById("gate-modal");
  var gateBtn = document.getElementById("gate-button");
  var gateStatus = document.getElementById("gate-status");
  var gateContent = null;
  var gsiReady = false;
  var unlocked = {}; // content -> signed url for this session

  try {
    var saved = sessionStorage.getItem("unlocked");
    if (saved) unlocked = JSON.parse(saved) || {};
  } catch (e) { /* ignore */ }

  function rememberUnlock(content, url) {
    unlocked[content] = url;
    try { sessionStorage.setItem("unlocked", JSON.stringify(unlocked)); } catch (e) { /* ignore */ }
  }

  function gateSay(state, text) {
    gateStatus.dataset.state = state;
    gateStatus.textContent = text;
  }

  function requestUnlock(content, credential) {
    var body = new FormData();
    body.append("content", content);
    body.append("_language", currentLang());
    body.append("deck", currentLang());
    if (credential) body.append("credential", credential);
    return fetch("unlock.php", { method: "POST", body: body, headers: { Accept: "application/json" } })
      .then(function (r) { return r.json().then(function (j) { j.status = r.status; return j; }); });
  }

  function deliver(content, url) {
    if (content === "masterclass") {
      track("masterclass_open", { lang: currentLang() });
      window.location.href = url;
    } else {
      track("biboya_play", { lang: currentLang() });
      openVideo(url);
    }
  }

  function loadGsi(cb) {
    if (window.google && window.google.accounts) { cb(); return; }
    var s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = cb;
    s.onerror = function () {
      gateSay("error", currentLang() === "tr"
        ? "Google girişi yüklenemedi. Lütfen tekrar deneyin."
        : "Google sign-in could not load. Please try again.");
    };
    document.head.appendChild(s);
  }

  function onCredential(resp) {
    gateSay("", currentLang() === "tr" ? "Doğrulanıyor…" : "Verifying…");
    requestUnlock(gateContent, resp.credential).then(function (j) {
      if (!j.ok) throw new Error(j.error || "unlock");
      rememberUnlock(gateContent, j.url);
      gate.close();
      deliver(gateContent, j.url);
    }).catch(function () {
      gateSay("error", currentLang() === "tr"
        ? "Giriş doğrulanamadı. Lütfen tekrar deneyin."
        : "Sign-in could not be verified. Please try again.");
    });
  }

  function renderGoogleButton() {
    if (!gsiReady) {
      window.google.accounts.id.initialize({
        client_id: CFG.googleClientId,
        callback: onCredential,
        ux_mode: "popup",
        auto_select: false
      });
      gsiReady = true;
    }
    gateBtn.innerHTML = "";
    window.google.accounts.id.renderButton(gateBtn, {
      theme: "filled_black", size: "large", shape: "pill", text: "continue_with",
      locale: currentLang() === "tr" ? "tr" : "en", width: 280
    });
  }

  function openGate(content) {
    if (unlocked[content]) { deliver(content, unlocked[content]); return; }

    // gate not configured on the server yet: ask for a plain unlock
    if (!CFG.googleClientId) {
      requestUnlock(content).then(function (j) {
        if (j.ok) { rememberUnlock(content, j.url); deliver(content, j.url); }
      });
      return;
    }

    gateContent = content;
    gate.dataset.content = content;
    gateSay("", "");
    gateBtn.textContent = "…";
    gate.showModal();
    loadGsi(renderGoogleButton);
  }

  if (gate && typeof gate.showModal === "function") {
    document.getElementById("masterclass-link").addEventListener("click", function () { openGate("masterclass"); });
    document.getElementById("biboya-link").addEventListener("click", function () { openGate("biboya"); });
    document.getElementById("gate-close").addEventListener("click", function () { gate.close(); });
    gate.addEventListener("click", function (e) {
      var r = gate.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) gate.close();
    });

    // sent back here by deck.php when a link expired: reopen the gate
    var locked = new URLSearchParams(window.location.search).get("locked");
    if (locked === "masterclass" || locked === "biboya") {
      history.replaceState(null, "", window.location.pathname);
      openGate(locked);
    }
  }

  /* ---------- Bi'Boya video popup ---------- */
  var modal = document.getElementById("biboya-modal");
  var video = document.getElementById("biboya-video");
  var closeBtn = document.getElementById("biboya-close");

  function openVideo(url) {
    if (!modal || typeof modal.showModal !== "function") return;
    if (video.getAttribute("src") !== url) {
      video.setAttribute("src", url);
      video.load();
    }
    modal.showModal();
    video.currentTime = 0;
    var p = video.play();
    if (p && p.catch) p.catch(function () { /* autoplay blocked: user presses play */ });
  }
  function closeVideo() {
    video.pause();
    if (modal.open) modal.close();
  }

  if (modal && video && typeof modal.showModal === "function") {
    closeBtn.addEventListener("click", closeVideo);
    // click on the dimmed backdrop (outside the dialog box) closes it
    modal.addEventListener("click", function (e) {
      var r = modal.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) closeVideo();
    });
    modal.addEventListener("close", function () { video.pause(); });
    // no "save video as" menu
    video.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }

  /* ---------- use-case chain: draw in once when scrolled into view ---------- */
  var chain = document.getElementById("chain");
  if (chain) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; })) {
          chain.classList.add("in");
          io.disconnect();
        }
      }, { threshold: 0.25 });
      io.observe(chain);
    } else {
      chain.classList.add("in");
    }
  }

  /* ---------- footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- inquiry form ---------- */
  var form = document.getElementById("inquiry-form");
  if (!form) return;

  var statusEl = form.querySelector(".form-status");
  var submitBtn = form.querySelector(".btn-submit");

  var MESSAGES = {
    en: {
      ok: "Thanks — your inquiry is in. I'll get back to you shortly.",
      invalid: "Please fill in the required fields.",
      error: "Something went wrong sending this. Please try again in a minute.",
      rate: "Too many submissions from this connection — please try again in an hour.",
      unconfigured: "The form isn't connected yet — the Formspree endpoint still needs to be set."
    },
    tr: {
      ok: "Teşekkürler — talebiniz ulaştı. Kısa süre içinde dönüş yapacağım.",
      invalid: "Lütfen zorunlu alanları doldurun.",
      error: "Gönderim sırasında bir sorun oldu. Lütfen bir dakika sonra tekrar deneyin.",
      rate: "Bu bağlantıdan çok fazla gönderim yapıldı — lütfen bir saat sonra tekrar deneyin.",
      unconfigured: "Form henüz bağlı değil — Formspree endpoint'i ayarlanmalı."
    }
  };

  function say(state, key) {
    var lang = html.getAttribute("data-lang") === "tr" ? "tr" : "en";
    statusEl.dataset.state = state;
    statusEl.textContent = MESSAGES[lang][key];
  }

  function clearStatus() {
    delete statusEl.dataset.state;
    statusEl.textContent = "";
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    clearStatus();

    // native validation with our own messaging
    var invalid = false;
    form.querySelectorAll("[required]").forEach(function (field) {
      var bad = !field.checkValidity();
      field.setAttribute("aria-invalid", String(bad));
      if (bad) invalid = true;
    });
    if (invalid) {
      say("error", "invalid");
      var firstBad = form.querySelector('[aria-invalid="true"]');
      if (firstBad) firstBad.focus();
      return;
    }

    submitBtn.dataset.busy = "true";
    submitBtn.disabled = true;

    fetch(form.action, {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" }
    })
      .then(function (res) {
        if (res.ok) {
          form.reset();
          form.querySelectorAll("[aria-invalid]").forEach(function (f) {
            f.removeAttribute("aria-invalid");
          });
          say("ok", "ok");
        } else {
          say("error", res.status === 429 ? "rate" : "error");
        }
      })
      .catch(function () {
        say("error", "error");
      })
      .then(function () {
        delete submitBtn.dataset.busy;
        submitBtn.disabled = false;
      });
  });

  // clear invalid marker as the user types
  form.addEventListener("input", function (event) {
    var t = event.target;
    if (t.hasAttribute("aria-invalid") && t.checkValidity()) {
      t.removeAttribute("aria-invalid");
    }
  });
})();
