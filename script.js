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


    // document title (pages can carry their own via data-title-en/tr on <html>) + hidden form field
    var ownTitle = lang === "tr" ? html.getAttribute("data-title-tr") : html.getAttribute("data-title-en");
    document.title = ownTitle ||
      (lang === "tr"
        ? "Gerçek İş Yapan Yapay Zekâ Otomasyonları"
        : "AI Automations That Do Real Work");
    var langField = document.querySelector('input[name="_language"]');
    if (langField) langField.value = lang;
  }

  document.querySelectorAll(".lang-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyLang(btn.dataset.setLang);
      document.dispatchEvent(new Event("langchange"));
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
  function gaEvent(name, params) {
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

  /* ---------- Magic-link gate (Masterclass, Saphire film) ---------- */
  var gate = document.getElementById("gate-modal");
  var gateForm = document.getElementById("gate-form");
  var gateStatus = document.getElementById("gate-status");
  var gateSubmit = gateForm ? gateForm.querySelector(".btn-submit") : null;
  var gateContent = null;
  var landing = null; // runs once the video popup below is wired up
  var unlocked = {}; // content -> session url for this browser session

  try {
    var saved = sessionStorage.getItem("unlocked");
    if (saved) unlocked = JSON.parse(saved) || {};
  } catch (e) { /* ignore */ }

  function rememberUnlock(content, url) {
    unlocked[content] = url;
    try { sessionStorage.setItem("unlocked", JSON.stringify(unlocked)); } catch (e) { /* ignore */ }
  }
  function forgetUnlock(content) {
    delete unlocked[content];
    try { sessionStorage.setItem("unlocked", JSON.stringify(unlocked)); } catch (e) { /* ignore */ }
  }

  var GATE_MSG = {
    en: {
      sent: "Done — the link is in your inbox. It is valid for {m} minutes; check spam if it doesn't show up.",
      invalid: "Please enter your name, a valid e-mail and tick the consent box.",
      rate: "Too many links requested — please try again in an hour.",
      error: "The link could not be sent. Please try again in a minute.",
      expired: "That link has expired. Enter your e-mail and I'll send a fresh one."
    },
    tr: {
      sent: "Tamam — bağlantı e-postana gönderildi. {m} dakika geçerli; gelmezse spam klasörüne bak.",
      invalid: "Lütfen adını, geçerli bir e-posta adresini yaz ve rıza kutusunu işaretle.",
      rate: "Çok fazla bağlantı istendi — lütfen bir saat sonra tekrar dene.",
      error: "Bağlantı gönderilemedi. Lütfen bir dakika sonra tekrar dene.",
      expired: "Bu bağlantının süresi dolmuş. E-postanı yaz, yenisini göndereyim."
    }
  };

  function gateSay(state, key, minutes) {
    gateStatus.dataset.state = state;
    gateStatus.textContent = key ? GATE_MSG[currentLang()][key].replace("{m}", String(minutes || 30)) : "";
  }

  function requestUnlock(content, fields) {
    var body = new FormData();
    body.append("content", content);
    body.append("_language", currentLang());
    if (fields) fields.forEach(function (f) { body.append(f[0], f[1]); });
    return fetch("unlock.php", { method: "POST", body: body, headers: { Accept: "application/json" } })
      .then(function (r) { return r.json().then(function (j) { j.status = r.status; return j; }); });
  }

  function deliver(content, url) {
    gaEvent("masterclass_open", { lang: currentLang() });
    window.location.href = url;
  }

  function openGate(content, note) {
    if (unlocked[content]) { deliver(content, unlocked[content]); return; }

    // gate switched off on the server: ask for a plain session link
    if (CFG.gate === "off") {
      requestUnlock(content).then(function (j) {
        if (j.ok) { rememberUnlock(content, sessionUrl(content, j.url)); deliver(content, unlocked[content]); }
      });
      return;
    }

    gateContent = content;
    gate.dataset.content = content;
    gateForm.reset();
    gateForm.querySelectorAll("[aria-invalid]").forEach(function (f) { f.removeAttribute("aria-invalid"); });
    gateSay(note ? "error" : "", note || null);
    gate.showModal();
    var first = gateForm.querySelector("input[name=name]");
    if (first) setTimeout(function () { first.focus(); }, 50);
  }

  function sessionUrl(content, url) { return url; }

  if (gate && gateForm && typeof gate.showModal === "function") {
    document.getElementById("masterclass-link").addEventListener("click", function () { openGate("masterclass"); });
    document.getElementById("gate-close").addEventListener("click", function () { gate.close(); });
    gate.addEventListener("click", function (e) {
      var r = gate.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) gate.close();
    });

    gateForm.addEventListener("submit", function (event) {
      event.preventDefault();
      gateSay("", null);
      var invalid = false;
      gateForm.querySelectorAll("[required]").forEach(function (field) {
        var bad = !field.checkValidity();
        field.setAttribute("aria-invalid", String(bad));
        if (bad) invalid = true;
      });
      if (invalid) { gateSay("error", "invalid"); return; }

      gateSubmit.dataset.busy = "true";
      gateSubmit.disabled = true;
      var fields = [
        ["name", gateForm.elements.name.value],
        ["email", gateForm.elements.email.value],
        ["consent", gateForm.elements.consent.checked ? "yes" : ""],
        ["_gotcha", gateForm.elements._gotcha.value]
      ];
      requestUnlock(gateContent, fields).then(function (j) {
        if (!j.ok) throw j;
        gaEvent("gate_link_sent", { content: gateContent, lang: currentLang() });
        gateSay("ok", "sent", j.minutes);
      }).catch(function (j) {
        gateSay("error", j && j.status === 429 ? "rate" : (j && j.error === "validation" ? "invalid" : "error"));
      }).then(function () {
        delete gateSubmit.dataset.busy;
        gateSubmit.disabled = false;
      });
    });

    landing = function () {
      var params = new URLSearchParams(window.location.search);
      // sent back by deck.php / open.php when a link or session expired:
      // forget the cached session first, otherwise openGate would reuse it and loop
      var locked = params.get("locked");
      if (locked === "masterclass" || locked === "expired") {
        history.replaceState(null, "", window.location.pathname);
        forgetUnlock("masterclass");
        openGate("masterclass", "expired");
      }
    };
  }

  /* ---------- before/after comparison sliders ---------- */
  document.querySelectorAll("[data-cmp]").forEach(function (cmp) {
    var range = cmp.querySelector(".cmp-range");
    if (!range) return;
    function set() { cmp.style.setProperty("--pos", range.value + "%"); }
    range.addEventListener("input", set);
    set();
  });

  /* ---------- Concept Works: two films, each in its own popup player ---------- */
  function popupPlayer(modalId, videoId, closeId) {
    var modal = document.getElementById(modalId);
    var video = document.getElementById(videoId);
    var closeBtn = document.getElementById(closeId);
    if (!modal || !video || typeof modal.showModal !== "function") return null;
    function close() { video.pause(); if (modal.open) modal.close(); }
    closeBtn.addEventListener("click", close);
    // click on the dimmed backdrop (outside the dialog box) closes it
    modal.addEventListener("click", function (e) {
      var r = modal.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) close();
    });
    modal.addEventListener("close", function () { video.pause(); });
    video.addEventListener("contextmenu", function (e) { e.preventDefault(); }); // no "save video as"
    return {
      modal: modal, video: video,
      open: function (url, keepTime) {
        var t = keepTime ? video.currentTime : 0, playing = keepTime ? !video.paused : true;
        if (video.getAttribute("src") !== url) {
          video.setAttribute("src", url);
          video.load();
          if (t > 0) video.addEventListener("loadedmetadata", function seek() { video.removeEventListener("loadedmetadata", seek); video.currentTime = t; }, { once: true });
        }
        if (!modal.open) modal.showModal();
        if (!keepTime) video.currentTime = 0;
        if (playing) { var p = video.play(); if (p && p.catch) p.catch(function () { /* autoplay blocked: user presses play */ }); }
      }
    };
  }
  // Saphire: streamed by media.php, open to everyone
  var saphire = popupPlayer("saphire-modal", "saphire-video", "saphire-close");
  var saphireLink = document.getElementById("saphire-link");
  if (saphire && saphireLink) {
    saphireLink.addEventListener("click", function () {
      gaEvent("saphire_play", { lang: currentLang() });
      saphire.open("media.php");
    });
  }
  // Distilled, not diluted: the wide cut with the narration of the current language
  var distilled = popupPlayer("distilled-modal", "distilled-video", "distilled-close");
  var distilledLink = document.getElementById("distilled-link");
  if (distilled && distilledLink) {
    function distilledSrc() { return distilled.video.getAttribute("data-src-" + currentLang()); }
    distilledLink.addEventListener("click", function () {
      gaEvent("distilled_play", { lang: currentLang() });
      distilled.open(distilledSrc());
    });
    document.addEventListener("langchange", function () { if (distilled.modal.open) distilled.open(distilledSrc(), true); });
  }

  /* ---------- use-case chains: each draws in once when scrolled into view ----------
     Safari does not reliably fire IntersectionObserver for targets inside a
     scroll-snap track, so we observe the wrapper outside the track and keep a
     geometry fallback that runs on scroll/resize and once after load. */
  var chains = document.querySelectorAll(".chain");
  if (chains.length) {
    function reveal(chain) { chain.classList.add("in"); }
    function wrapperOf(chain) { return chain.closest(".hero-chain") || chain.closest(".usecase") || chain; }
    function inView(el) {
      var r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < window.innerHeight * 0.85;
    }
    function checkAll() {
      chains.forEach(function (c) { if (!c.classList.contains("in") && inView(wrapperOf(c))) reveal(c); });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) {
            chains.forEach(function (c) { if (wrapperOf(c) === e.target) reveal(c); });
          }
        });
      }, { threshold: 0.1 });
      chains.forEach(function (c) { io.observe(wrapperOf(c)); });
    }
    window.addEventListener("scroll", checkAll, { passive: true });
    window.addEventListener("resize", checkAll);
    window.addEventListener("load", checkAll);
    setTimeout(checkAll, 300);
    setTimeout(checkAll, 1500);
  }

  /* ---------- use-case carousel ---------- */
  var track = document.getElementById("chain-track");
  if (track) {
    var slides = track.querySelectorAll(".chain-slide");
    var carousel = document.getElementById("chain-carousel");
    var countCur = carousel.querySelector(".chain-count b");
    var countAll = carousel.querySelector(".chain-count span");
    var arrows = carousel.querySelectorAll(".chain-arrow");
    countAll.textContent = String(slides.length);
    carousel.classList.toggle("single", slides.length < 2);

    function index() { return Math.round(track.scrollLeft / track.clientWidth); }
    function update() {
      var i = index();
      countCur.textContent = String(i + 1);
      arrows[0].disabled = i === 0;
      arrows[1].disabled = i >= slides.length - 1;
    }
    arrows.forEach(function (btn) {
      btn.addEventListener("click", function () {
        carousel.classList.add("used"); // the hint arrow has done its job
        var next = Math.max(0, Math.min(slides.length - 1, index() + Number(btn.dataset.dir)));
        track.scrollTo({ left: next * track.clientWidth, behavior: "smooth" });
      });
    });
    track.addEventListener("scroll", function () { window.requestAnimationFrame(update); }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  /* ---------- footer year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  // deep links (?play=, ?locked=) need the popup above, so they run last
  if (landing) landing();

  /* ---------- hero film: language-matched narration, sound toggle, timed captions ---------- */
  var stick = document.getElementById("stickman");
  if (stick) {
    var soundBtn = document.getElementById("stickman-sound");
    var capEl = document.getElementById("stickman-cap");
    var CAPS = {
      en: [[12, 19, "Distilled information"], [42, 49, "AI \u2194 real business"], [52, 59, "Allowed, not everything"]],
      tr: [[12, 19, "Dam\u0131t\u0131lm\u0131\u015f bilgi"], [42, 49, "Yapay zek\u00e2 \u2194 ger\u00e7ek i\u015f"], [52, 59, "\u0130zinli olan, her \u015fey de\u011fil"]]
    };
    function stickSrc() { return stick.getAttribute("data-src-" + currentLang()); }
    function loadStick(keepTime) {
      var want = stickSrc();
      if (stick.getAttribute("src") === want) return;
      var t = keepTime ? stick.currentTime : 0;
      var wasPaused = stick.paused;
      stick.setAttribute("src", want);
      stick.load();
      // the seek only sticks once the new file's metadata is in
      stick.addEventListener("loadedmetadata", function once() {
        stick.removeEventListener("loadedmetadata", once);
        if (t > 0) stick.currentTime = t;
        if (!wasPaused) { var p = stick.play(); if (p && p.catch) p.catch(function () { /* user presses play */ }); }
      });
    }
    loadStick(false);
    document.addEventListener("langchange", function () { loadStick(true); });
    if (soundBtn) {
      soundBtn.addEventListener("click", function () {
        var on = stick.muted;
        stick.muted = !on;
        soundBtn.setAttribute("aria-pressed", on ? "true" : "false");
        if (on) { stick.currentTime = 0; var p = stick.play(); if (p && p.catch) p.catch(function () { /* ignore */ }); gaEvent("stickman_sound_on", { lang: currentLang() }); }
      });
    }
    // player bar: play/pause, seek, time
    var playBtn = document.getElementById("stickman-play");
    var seek = document.getElementById("stickman-seek");
    var timeEl = document.getElementById("stickman-time");
    function fmt(sec) { sec = Math.max(0, Math.floor(sec || 0)); return Math.floor(sec / 60) + ":" + ("0" + (sec % 60)).slice(-2); }
    function syncPlay() { if (playBtn) { playBtn.setAttribute("aria-pressed", stick.paused ? "false" : "true"); playBtn.setAttribute("aria-label", stick.paused ? "Play" : "Pause"); } }
    if (playBtn) {
      playBtn.addEventListener("click", function () {
        if (stick.paused) { var p = stick.play(); if (p && p.catch) p.catch(function () { /* ignore */ }); } else stick.pause();
      });
      stick.addEventListener("play", syncPlay);
      stick.addEventListener("pause", syncPlay);
      syncPlay();
    }
    // enlarge: the same film plays in a popup in front of the page, with sound
    var fullBtn = document.getElementById("stickman-full");
    var bigModal = document.getElementById("stickman-modal");
    var big = document.getElementById("stickman-big");
    var capBig = document.getElementById("stickman-cap-big");
    function captionFor(t) {
      var list = CAPS[currentLang()];
      for (var i = 0; i < list.length; i++) if (t >= list[i][0] && t < list[i][1]) return list[i][2];
      return "";
    }
    if (fullBtn && bigModal && big && typeof bigModal.showModal === "function") {
      function loadBig(t) {
        var want = stickSrc();
        if (big.getAttribute("src") !== want) { big.setAttribute("src", want); big.load(); }
        big.addEventListener("loadedmetadata", function once() {
          big.removeEventListener("loadedmetadata", once);
          big.currentTime = t;
          var p = big.play(); if (p && p.catch) p.catch(function () { /* user presses play */ });
        });
        if (big.readyState >= 1 && big.getAttribute("src") === want) { big.currentTime = t; var p2 = big.play(); if (p2 && p2.catch) p2.catch(function () { /* ignore */ }); }
      }
      function closeBig() {
        if (!bigModal.open) return;
        big.pause();
        stick.currentTime = big.currentTime;
        bigModal.close();
        var p = stick.play(); if (p && p.catch) p.catch(function () { /* ignore */ });
      }
      fullBtn.addEventListener("click", function () {
        stick.pause();
        big.muted = false;
        bigModal.showModal();
        loadBig(stick.currentTime);
        gaEvent("stickman_enlarge", { lang: currentLang() });
      });
      document.getElementById("stickman-modal-close").addEventListener("click", closeBig);
      bigModal.addEventListener("cancel", function (e) { e.preventDefault(); closeBig(); });
      bigModal.addEventListener("click", function (e) {
        var r = bigModal.getBoundingClientRect();
        var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        if (!inside) closeBig();
      });
      big.addEventListener("timeupdate", function () {
        if (!capBig) return;
        var text = captionFor(big.currentTime);
        if (text !== capBig.textContent) capBig.textContent = text;
        capBig.classList.toggle("on", text !== "");
      });
      document.addEventListener("langchange", function () { if (bigModal.open) loadBig(big.currentTime); });
    }
    var seeking = false;
    if (seek) {
      seek.addEventListener("input", function () { seeking = true; if (stick.duration) stick.currentTime = (Number(seek.value) / 1000) * stick.duration; });
      seek.addEventListener("change", function () { seeking = false; });
    }
    stick.addEventListener("timeupdate", function () {
      if (seek && !seeking && stick.duration) seek.value = String(Math.round((stick.currentTime / stick.duration) * 1000));
      if (timeEl) timeEl.textContent = fmt(stick.currentTime) + " / " + fmt(stick.duration || 60);
    });
    if (capEl) {
      stick.addEventListener("timeupdate", function () {
        var t = stick.currentTime, list = CAPS[currentLang()], text = "";
        for (var i = 0; i < list.length; i++) if (t >= list[i][0] && t < list[i][1]) text = list[i][2];
        if (text !== capEl.textContent) capEl.textContent = text;
        capEl.classList.toggle("on", text !== "");
      });
    }
  }

  /* ---------- inquiry form (lives in a dialog, opened by "Start a project") ---------- */
  var form = document.getElementById("inquiry-form");
  var inquiryModal = document.getElementById("inquiry-modal");
  function openInquiry() {
    if (!inquiryModal || typeof inquiryModal.showModal !== "function") { window.location.hash = "inquiry"; return; }
    if (!inquiryModal.open) inquiryModal.showModal();
    var first = document.getElementById("f-name");
    if (first && !document.getElementById("f-message").value) setTimeout(function () { first.focus(); }, 60);
    gaEvent("inquiry_open", { lang: currentLang() });
  }
  window.openInquiry = openInquiry;
  if (inquiryModal) {
    document.querySelectorAll('#open-inquiry, a[href="#inquiry"]').forEach(function (el) {
      el.addEventListener("click", function (e) { e.preventDefault(); openInquiry(); });
    });
    var inqClose = document.getElementById("inquiry-close");
    if (inqClose) inqClose.addEventListener("click", function () { inquiryModal.close(); });
    inquiryModal.addEventListener("click", function (e) {
      var r = inquiryModal.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!inside) inquiryModal.close();
    });
    if (window.location.hash === "#inquiry") { history.replaceState(null, "", window.location.pathname); openInquiry(); }
  }
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

/* Nav groups (Concept Works, GitHub): hover/focus opens the submenu on pointer
   devices; on touch screens the first tap opens it, a tap elsewhere closes it.
   A button-headed group (Concept Works) toggles on every tap or click. */
(function () {
  var groups = document.querySelectorAll(".nav-group");
  if (!groups.length) return;
  var noHover = window.matchMedia("(hover: none)");
  function setOpen(group, link, open) {
    group.classList.toggle("is-open", open);
    link.setAttribute("aria-expanded", String(open));
  }
  groups.forEach(function (group) {
    var link = group.querySelector(":scope > .nav-link");
    var isButton = link.tagName === "BUTTON";
    link.addEventListener("click", function (event) {
      if (isButton) { setOpen(group, link, !group.classList.contains("is-open")); return; }
      if (!noHover.matches) return;
      if (!group.classList.contains("is-open")) { event.preventDefault(); setOpen(group, link, true); }
    });
    group.addEventListener("click", function (event) {
      // choosing a film closes the menu
      if (event.target.closest(".nav-sub-item")) setOpen(group, link, false);
    });
  });
  document.addEventListener("click", function (event) {
    groups.forEach(function (group) {
      if (!group.contains(event.target)) setOpen(group, group.querySelector(":scope > .nav-link"), false);
    });
  });
})();
