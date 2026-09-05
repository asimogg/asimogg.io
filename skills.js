// Skill popup: every [data-skill] chip opens one shared card with a short
// excerpt of the real SKILL.md; clicking the card sends the visitor to the form.
(function () {
  "use strict";

  var SKILLS = {
    "asimo-rd": {
      file: "skills/asimo-rd/SKILL.md",
      en: "R&D agent — the scientific backbone: literature, patents, formulation, EU project deliverables.",
      tr: "Ar-Ge ajanı — bilimsel omurga: literatür, patent, formülasyon, AB projesi çıktıları.",
      excerpt: [
        "name: asimo-rd",
        "description: Asimo's R&D Agent — scientific",
        "  intelligence layer. Activate for chemistry,",
        "  formulation, literature review, patent analysis,",
        "  experimental design, EU project deliverables",
        "  (M-ERA.NET, Eureka), feasibility of new materials."
      ]
    },
    "newton": {
      file: "skills/newton/SKILL.md",
      en: "Physics referee — tests a materials idea with equations, ranks candidate materials, then drafts the DOE.",
      tr: "Fizik hakemi — bir malzeme fikrini denklemlerle sınar, aday malzemeleri sıralar, sonra DOE'yi hazırlar.",
      excerpt: [
        "name: newton",
        "description: Tests a materials/coating/adhesive",
        "  idea with PHYSICS and MATH — picks the governing",
        "  properties, solves the equations (JKR, Kendall,",
        "  Dahlquist, Fick, WLF…), returns PROVEN / PARTIAL /",
        "  REFUTED, ranks candidate materials, drafts the DOE."
      ]
    },
    "lens-research": {
      file: "skills/lens-research/SKILL.md",
      en: "Scholarly + patent search with fit scoring — OpenAlex, Google Patents, Espacenet.",
      tr: "Uyum puanlı makale + patent taraması — OpenAlex, Google Patents, Espacenet.",
      excerpt: [
        "name: lens-research",
        "description: Lens.org-style scholarly literature",
        "  + patent research. Rates every result with",
        "  separate asimo-fit scores for papers and patents.",
        "Always run scholarly and patent searches",
        "  for a topic in parallel."
      ]
    },
    "academic": {
      file: "skills/academic-shield/SKILL.md",
      en: "Academic writing integrity — originality scoring and human-quality rewrites for proposals and papers.",
      tr: "Akademik yazım bütünlüğü — proje dosyaları ve makaleler için özgünlük puanı ve insansı yeniden yazım.",
      excerpt: [
        "name: academic-shield",
        "description: Academic writing integrity analyzer —",
        "  AI detection, similarity/plagiarism risk scoring,",
        "  and concrete rewrite suggestions for theses,",
        "  journal papers, and technical reports."
      ]
    },
    "asimo-marketing": {
      file: "skills/asimo-marketing/SKILL.md",
      en: "Marketing agent — positioning, messaging, go-to-market; owns every video and site copy.",
      tr: "Pazarlama ajanı — konumlandırma, mesaj, pazara giriş; tüm video ve site metinlerinin sahibi.",
      excerpt: [
        "name: asimo-marketing",
        "description: Asimo's Marketing Agent — market",
        "  intelligence and commercial positioning layer.",
        "  Translates technical capability into market",
        "  opportunity. Does NOT invent demand — identifies",
        "  where real demand exists."
      ]
    },
    "asimo-software": {
      file: "skills/asimo-software/SKILL.md",
      en: "Software bridge — decides what is worth building, then routes build and ship to the gstack factory.",
      tr: "Yazılım köprüsü — neyin inşa edilmeye değer olduğuna karar verir, yapım ve yayını gstack fabrikasına yönlendirir.",
      excerpt: [
        "name: asimo-software",
        "description: The seam between the Asimo decision",
        "  ecosystem and the gstack engineering factory.",
        "  Decides WHETHER the software is worth building",
        "  and WHY, then routes the HOW and SHIP to",
        "  gstack (autoplan, design-html, review, qa, ship)."
      ]
    },
    "security-review": {
      file: "skills/security-review",
      en: "Mandatory security pass before anything ships — headers, injection, secrets, data exposure.",
      tr: "Yayın öncesi zorunlu güvenlik geçişi — başlıklar, enjeksiyon, sırlar, veri sızıntısı.",
      excerpt: [
        "name: security-review",
        "description: Review the current changes for",
        "  security issues before they ship: auth and",
        "  origin checks, injection, exposed secrets,",
        "  headers (CSP, HSTS), rate limits, data exposure."
      ]
    },
    "impeccable": {
      file: "impeccable/SKILL.md",
      url: "https://github.com/pbakaus/impeccable",
      en: "Design skill — frontend craft with a point of view; reviews, finishes and documents every surface.",
      tr: "Tasarım skill'i — bakış açısı olan arayüz işçiliği; her yüzeyi inceler, bitirir, belgeler.",
      excerpt: [
        "name: impeccable",
        "description: Use when the user wants to design,",
        "  redesign, critique, audit, polish, animate…",
        "  a frontend interface.",
        "Core principles: Go all out. Dream big and bold.",
        "  Verify in bounded passes, not a loop."
      ]
    },
    "higgsfield": {
      file: "Higgsfield MCP",
      url: "https://higgsfield.ai/",
      en: "Generative visuals through MCP — images, video, thumbnails produced inside the same workflow.",
      tr: "MCP üzerinden üretken görseller — görsel, video ve thumbnail'ler aynı iş akışının içinde üretilir.",
      excerpt: [
        "server: higgsfield (MCP)",
        "tools: generate_image, generate_video,",
        "  upscale_image, remove_background, reframe,",
        "  generate_audio, workflows (explainer, ad, UGC)",
        "used for: site thumbnails, the Bi'Boya film"
      ]
    }
  };

  var chips = document.querySelectorAll("[data-skill]");
  if (!chips.length) return;

  var html = document.documentElement;
  function lang() { return html.getAttribute("data-lang") === "tr" ? "tr" : "en"; }
  var formHref = document.getElementById("inquiry") ? "#inquiry" : "../#inquiry";

  var pop = document.createElement("div");
  pop.className = "skill-pop";
  pop.hidden = true;
  pop.setAttribute("role", "dialog");
  document.body.appendChild(pop);

  var current = null;
  var hideTimer = null;
  function touchDevice() { return window.matchMedia("(hover: none)").matches; }

  function build(key) {
    var s = SKILLS[key];
    if (!s) return false;
    var L = lang();
    pop.innerHTML = "";

    var head = document.createElement("div");
    head.className = "skill-pop-head";
    var name = document.createElement("b");
    name.textContent = key === "higgsfield" ? "Higgsfield MCP" : key;
    var file = document.createElement("span");
    file.textContent = s.file;
    head.appendChild(name);
    head.appendChild(file);
    pop.appendChild(head);

    var desc = document.createElement("p");
    desc.className = "skill-pop-desc";
    desc.textContent = s[L];
    pop.appendChild(desc);

    var pre = document.createElement("pre");
    pre.className = "skill-pop-code";
    pre.textContent = s.excerpt.join("\n");
    pop.appendChild(pre);

    if (s.url) {
      var src = document.createElement("a");
      src.className = "skill-pop-src";
      src.href = s.url;
      src.target = "_blank";
      src.rel = "noopener";
      src.textContent = (L === "tr" ? "Kaynak: " : "Source: ") + s.url.replace(/^https?:\/\//, "").replace(/\/$/, "") + " ↗";
      src.addEventListener("click", function (e) { e.stopPropagation(); });
      pop.appendChild(src);
    }

    var cta = document.createElement("a");
    cta.className = "skill-pop-cta";
    cta.href = formHref + (formHref.indexOf("#") === 0 ? "" : "") ;
    cta.textContent = L === "tr" ? "Bu skill'i işinize uyarlayalım → Proje başlat" : "Adapt this skill to your business → Start a project";
    pop.appendChild(cta);

    pop.dataset.skill = key;
    return true;
  }

  function place(chip) {
    var r = chip.getBoundingClientRect();
    var w = Math.min(window.innerWidth * 0.92, 360);
    var left = Math.min(Math.max(12, r.left), window.innerWidth - w - 12);
    pop.style.width = w + "px";
    pop.style.left = left + "px";
    pop.hidden = false;
    var h = pop.offsetHeight;
    var below = r.bottom + 10;
    if (below + h > window.innerHeight - 12 && r.top - h - 10 > 12) {
      pop.style.top = (r.top - h - 10) + "px";
      pop.classList.add("above");
    } else {
      pop.style.top = below + "px";
      pop.classList.remove("above");
    }
  }

  function show(chip) {
    clearTimeout(hideTimer);
    var key = chip.getAttribute("data-skill");
    if (current !== chip || pop.hidden) {
      if (!build(key)) return;
      current = chip;
    }
    place(chip);
    chip.setAttribute("aria-expanded", "true");
  }

  function hide() {
    pop.hidden = true;
    if (current) current.setAttribute("aria-expanded", "false");
    current = null;
  }

  function scheduleHide() {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 180);
  }

  function goToForm(key) {
    var s = SKILLS[key];
    var msg = document.getElementById("f-message");
    var line = "Skill: " + (key === "higgsfield" ? "Higgsfield MCP" : key) + (s ? " — " + s[lang()] : "");
    if (msg) {
      if (msg.value.indexOf(line) === -1) msg.value = (msg.value ? msg.value + "\n" : "") + line;
      hide();
      document.getElementById("inquiry").scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(function () { msg.focus(); }, 500);
    } else {
      window.location.href = "../?skill=" + encodeURIComponent(key) + "#inquiry";
    }
  }

  chips.forEach(function (chip) {
    chip.setAttribute("tabindex", "0");
    chip.setAttribute("role", "button");
    chip.setAttribute("aria-haspopup", "dialog");
    chip.setAttribute("aria-expanded", "false");
    // hover only on pointer devices: touch browsers synthesize mouse events on tap
    chip.addEventListener("mouseenter", function () { if (!touchDevice()) show(chip); });
    chip.addEventListener("mouseleave", function () { if (!touchDevice()) scheduleHide(); });
    // a tap fires focus + click in a row: remember what was open before the tap started
    var wasOpen = false, pointerDown = false;
    chip.addEventListener("pointerdown", function () { wasOpen = current === chip && !pop.hidden; pointerDown = true; });
    chip.addEventListener("focus", function () { if (!pointerDown && !touchDevice()) show(chip); });
    chip.addEventListener("blur", function () { if (!touchDevice()) scheduleHide(); });
    chip.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      // touch: tap toggles; pointer: hover already opened it, a click keeps it open
      if (touchDevice() && wasOpen) hide(); else show(chip);
      pointerDown = false;
    });
    chip.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToForm(chip.getAttribute("data-skill")); }
      if (e.key === "Escape") hide();
    });
  });

  pop.addEventListener("mouseenter", function () { clearTimeout(hideTimer); });
  pop.addEventListener("mouseleave", scheduleHide);
  pop.addEventListener("click", function (e) {
    e.preventDefault();
    goToForm(pop.dataset.skill);
  });
  document.addEventListener("click", function (e) {
    if (!pop.hidden && !pop.contains(e.target) && !e.target.closest("[data-skill]")) hide();
  });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") hide(); });
  window.addEventListener("scroll", function () { if (!pop.hidden && current) place(current); }, { passive: true });
  window.addEventListener("resize", hide);

  // arrived from another page with ?skill=…: prefill the form
  var wanted = new URLSearchParams(window.location.search).get("skill");
  if (wanted && SKILLS[wanted] && document.getElementById("f-message")) {
    history.replaceState(null, "", window.location.pathname + "#inquiry");
    goToForm(wanted);
  }
})();
