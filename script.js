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

    // masterclass deck link follows the language
    var mc = document.getElementById("masterclass-link");
    if (mc) mc.href = lang === "tr" ? "masterclass-tr.html?v=6" : "masterclass.html?v=6";

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
