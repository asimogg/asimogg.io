/* "Yön" — reflex line. Arrows appear at random; press the direction. Rules unlock one by one:
   orange frame = opposite direction; hollow arrow = press nothing; same direction twice = press nothing.
   Timing adapts to the player. Jev (TypeSafe System One) answers the same stimulus as text in
   a measured ~745 ms; that is the line to beat. Standalone draft: progress lives in localStorage. */
(function () {
  "use strict";
  var html = document.documentElement;
  var modal = document.getElementById("yon-modal");
  var canvas = document.getElementById("yon-canvas");
  if (!modal || !canvas || typeof modal.showModal !== "function") return;
  var ctx = canvas.getContext("2d");
  var link = document.getElementById("yon-link"), closeBtn = document.getElementById("yon-close");
  var intro = document.getElementById("yon-intro"), endWrap = document.getElementById("yon-end"), endBody = document.getElementById("yon-end-body");
  var startBtn = document.getElementById("yon-start");
  var W = 1000, H = 620, ROUND_MS = 45000, JEV_MS = 745, JEV_ACC = 1.0;
  var COL = { ink: "#EFE9D5", muted: "#8f8a7a", line: "#3a372f", accent: "#FF6A00", red: "#D84A3A" };
  var LANE_L = 170, LANE_R = W - 170, CX = W / 2, CY = 300;
  var DIRS = ["up", "down", "left", "right"], OPP = { up: "down", down: "up", left: "right", right: "left" };
  var T = {
    en: { you: "You", jev: "Jev", median: "median", acc: "accuracy", beat: "faster than Jev", rule1: "Press the arrow's direction", rule2: "New rule: orange frame → opposite direction", rule3: "New rule: hollow arrow or a repeat → press nothing", go: "Go!", none: "no press", miss: "missed", wrong: "wrong", best: "personal best", todayFaster: "You got {x} ms faster than last round.", todaySlower: "{x} ms slower than last round — tired hands? Try once more.", first: "First round recorded. Play again to see your curve.", crossed: "You are under Jev's line: your reflex beats a model that reads the same stimulus as text.", notYet: "Jev's line is {x} ms away. Two or three rounds usually close that gap.", closing: ["Reflex is yours. Reading twelve e-mails at once is Jev's. That split is the whole idea.", "Practice moved this number; nothing else did.", "Fast hands, steady rules. Keep both."], replay: "Play again", home: "Back to home", history: "Last rounds (reflex score, lower is better)", jevLine: "Jev · 745 ms", trials: "trials", score: "reflex score", scoreHint: "median reaction time per correct answer" },
    tr: { you: "Sen", jev: "Jev", median: "medyan", acc: "doğruluk", beat: "Jev'den hızlı", rule1: "Okun yönüne bas", rule2: "Yeni kural: turuncu çerçeve → ters yön", rule3: "Yeni kural: içi boş ok ya da tekrar → basma", go: "Başla!", none: "basma", miss: "kaçtı", wrong: "yanlış", best: "kişisel rekor", todayFaster: "Önceki tura göre {x} ms hızlandın.", todaySlower: "Önceki tura göre {x} ms yavaşladın; bir tur daha dene.", first: "İlk tur kaydedildi. Eğrini görmek için tekrar oyna.", crossed: "Jev çizgisinin altındasın: refleksin, aynı uyaranı metin olarak okuyan bir modeli geçiyor.", notYet: "Jev çizgisine {x} ms kaldı. İki üç tur genelde bu açığı kapatır.", closing: ["Refleks senin. On iki e-postayı bir anda okumak Jev'in. Bütün fikir bu iş bölümü.", "Bu sayıyı antrenman değiştirdi, başka hiçbir şey değil.", "Hızlı el, sağlam kural. İkisini de koru."], replay: "Tekrar oyna", home: "Ana sayfaya dön", history: "Son turlar (refleks puanı, düşük iyi)", jevLine: "Jev · 745 ms", trials: "deneme", score: "refleks puanı", scoreHint: "doğru cevap başına medyan tepki süresi" }
  };
  function lang() { return html.getAttribute("data-lang") === "tr" ? "tr" : "en"; }
  function t(k) { return T[lang()][k]; }
  function both(en, tr) { return '<span class="en">' + en + '</span><span class="tr">' + tr + '</span>'; }
  var IMG = {}; ["stand", "laugh", "overwhelmed"].forEach(function (k) { var im = new Image(); im.src = "assets/sel/stickman-" + k + ".png"; IMG[k] = im; });

  var G = null, raf = 0;
  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function newGame() {
    return { t0: performance.now(), phase: "gap", until: 0, stim: null, prev: null, trials: [], win: 1400, streak: 0,
      pose: "stand", poseUntil: 0, rulesOn: 1, banner: null, bannerUntil: 0, lastFeedback: null, done: false };
  }
  function elapsed() { return performance.now() - G.t0; }
  function truth(s) { if (s.hollow || s.repeat) return "none"; return s.frame ? OPP[s.arrow] : s.arrow; }
  function makeStim() {
    var s = { arrow: pick(DIRS), frame: false, hollow: false, repeat: false };
    if (G.rulesOn >= 2 && Math.random() < 0.4) s.frame = true;
    if (G.rulesOn >= 3) {
      if (Math.random() < 0.15) s.hollow = true;
      else if (G.prev && Math.random() < 0.3) { s.arrow = G.prev.arrow; s.repeat = true; }
    }
    if (!s.repeat && G.prev && s.arrow === G.prev.arrow && G.rulesOn >= 3) s.repeat = true; // a natural repeat counts as one
    return s;
  }
  function scheduleGap() { G.phase = "gap"; G.until = performance.now() + rnd(450, 950); G.stim = null; }
  function showStim() { G.stim = makeStim(); G.stim.at = performance.now(); G.phase = "stim"; G.until = G.stim.at + G.win; }
  function record(ans) {
    var s = G.stim, rt = Math.round(performance.now() - s.at), want = truth(s), ok = ans === want;
    G.trials.push({ rt: rt, ok: ok, want: want, ans: ans, go: want !== "none" });
    if (ok) { G.streak += 1; G.win = Math.max(450, G.win * 0.93); } else { G.streak = 0; G.win = Math.min(1600, G.win * 1.12); }
    G.pose = ok ? (G.streak >= 3 ? "laugh" : "stand") : "overwhelmed"; G.poseUntil = performance.now() + 700;
    G.lastFeedback = { ok: ok, ans: ans, want: want, rt: rt, at: performance.now(), beat: ok && want !== "none" && rt < JEV_MS };
    G.prev = s; scheduleGap();
  }
  function input(dir) {
    if (!G || G.done) return;
    if (G.phase === "stim") record(dir);
    else if (G.phase === "gap" && G.prev) { /* early press: counts as wrong on the coming trial */ G.streak = 0; G.pose = "overwhelmed"; G.poseUntil = performance.now() + 500; G.lastFeedback = { ok: false, ans: dir, want: "-", rt: 0, at: performance.now(), early: true }; }
  }

  function tick() {
    if (!G || G.done) return;
    var now = performance.now(), e = elapsed();
    if (e >= ROUND_MS) { finish(); return; }
    var want = e < 15000 ? 1 : (e < 30000 ? 2 : 3);
    if (want > G.rulesOn) { G.rulesOn = want; G.banner = want === 2 ? "rule2" : "rule3"; G.bannerUntil = now + 1800; G.phase = "banner"; G.until = G.bannerUntil; G.stim = null; }
    if (G.phase === "banner" && now >= G.until) scheduleGap();
    else if (G.phase === "gap" && now >= G.until) showStim();
    else if (G.phase === "stim" && now >= G.until) record("none");
  }

  /* ---------- drawing ---------- */
  function fit() { var dpr = Math.min(2, window.devicePixelRatio || 1), r = canvas.getBoundingClientRect(); if (!r.width) return; canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr); ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0); }
  function font(px, w) { return (w || 500) + " " + px + "px Archivo, 'Helvetica Neue', Arial, sans-serif"; }
  function drop(x, y, r, glow) { if (glow) { ctx.shadowColor = COL.accent; ctx.shadowBlur = glow; } ctx.fillStyle = COL.accent; ctx.beginPath(); ctx.moveTo(x, y - r * 1.5); ctx.bezierCurveTo(x + r * 1.1, y - r * 0.2, x + r, y + r * 0.9, x, y + r); ctx.bezierCurveTo(x - r, y + r * 0.9, x - r * 1.1, y - r * 0.2, x, y - r * 1.5); ctx.fill(); ctx.shadowBlur = 0; }
  function arrow(x, y, dir, size, hollow, color) {
    var a = { up: -Math.PI / 2, down: Math.PI / 2, left: Math.PI, right: 0 }[dir];
    ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.lineWidth = 10; ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.beginPath(); ctx.moveTo(-size, 0); ctx.lineTo(size * 0.35, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(size * 0.1, -size * 0.6); ctx.lineTo(size, 0); ctx.lineTo(size * 0.1, size * 0.6); ctx.closePath();
    if (hollow) ctx.stroke(); else ctx.fill();
    ctx.restore();
  }
  function stats() {
    var go = G.trials.filter(function (x) { return x.go && x.ok; }).map(function (x) { return x.rt; }).sort(function (a, b) { return a - b; });
    var med = go.length ? go[Math.floor(go.length / 2)] : 0;
    var ok = G.trials.filter(function (x) { return x.ok; }).length, n = G.trials.length;
    var beat = G.trials.filter(function (x) { return x.go && x.ok && x.rt < JEV_MS; }).length;
    return { med: med, ok: ok, n: n, acc: n ? ok / n : 0, beat: beat, score: med && n ? Math.round(med / (ok / n)) : 0 };
  }
  function draw() {
    tick();
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
    if (!G) return;
    var now = performance.now(), L = lang(), S = stats(), e = elapsed();
    ctx.strokeStyle = COL.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(LANE_L, 30); ctx.lineTo(LANE_L, H - 30); ctx.moveTo(LANE_R, 30); ctx.lineTo(LANE_R, H - 30); ctx.stroke();
    // round timer bar
    ctx.fillStyle = COL.line; ctx.fillRect(LANE_L + 20, 24, LANE_R - LANE_L - 40, 3); ctx.fillStyle = COL.accent; ctx.fillRect(LANE_L + 20, 24, (LANE_R - LANE_L - 40) * (1 - e / ROUND_MS), 3);
    // left: player
    var pose = G.poseUntil > now ? G.pose : "stand", im = IMG[pose];
    if (im && im.complete && im.naturalWidth) { var ih = 300, iw = ih * im.naturalWidth / im.naturalHeight; ctx.drawImage(im, LANE_L / 2 - iw / 2, 290, iw, ih); }
    ctx.textAlign = "center"; ctx.fillStyle = COL.ink; ctx.font = font(22, 640); ctx.fillText(t("you"), LANE_L / 2, 70);
    ctx.font = font(40, 640); ctx.fillText(S.med ? S.med + " ms" : "–", LANE_L / 2, 125);
    ctx.font = font(15, 500); ctx.fillStyle = COL.muted; ctx.fillText(t("median") + " · " + Math.round(S.acc * 100) + " % " + t("acc"), LANE_L / 2, 156);
    ctx.fillStyle = COL.accent; ctx.font = font(15, 600); ctx.fillText(S.beat + " × " + t("beat"), LANE_L / 2, 186);
    // right: Jev
    ctx.fillStyle = COL.accent; ctx.font = font(22, 640); ctx.fillText(t("jev"), (LANE_R + W) / 2, 70);
    ctx.fillStyle = COL.ink; ctx.font = font(40, 640); ctx.fillText(JEV_MS + " ms", (LANE_R + W) / 2, 125);
    ctx.font = font(15, 500); ctx.fillStyle = COL.muted; ctx.fillText(t("median") + " · 100 % " + t("acc"), (LANE_R + W) / 2, 156);
    var jevGlow = G.stim && now - G.stim.at > JEV_MS && now - G.stim.at < JEV_MS + 250;
    drop((LANE_R + W) / 2, 420, 42, jevGlow ? 45 : 12);
    // centre
    if (G.phase === "banner") { ctx.fillStyle = COL.accent; ctx.font = font(30, 640); ctx.fillText(t(G.banner), CX, CY); }
    if (G.phase === "stim") {
      var s = G.stim;
      if (s.frame) { ctx.strokeStyle = COL.accent; ctx.lineWidth = 8; ctx.strokeRect(CX - 130, CY - 130, 260, 260); }
      arrow(CX, CY, s.arrow, 90, s.hollow, COL.ink);
      var left = 1 - (now - s.at) / G.win; ctx.fillStyle = COL.line; ctx.fillRect(CX - 130, CY + 160, 260, 4); ctx.fillStyle = COL.accent; ctx.fillRect(CX - 130, CY + 160, 260 * Math.max(0, left), 4);
    }
    // last feedback
    if (G.lastFeedback && now - G.lastFeedback.at < 650) {
      var f = G.lastFeedback; ctx.font = font(24, 640); ctx.fillStyle = f.ok ? COL.accent : COL.red;
      var txt = f.early ? "!" : (f.ok ? (f.want === "none" ? "✓ " + t("none") : "✓ " + f.rt + " ms" + (f.beat ? "  ▲" : "")) : (f.ans === "none" ? "✗ " + t("miss") : "✗ " + t("wrong")));
      ctx.fillText(txt, CX, CY - 175);
    }
    // rules legend
    ctx.textAlign = "center"; ctx.fillStyle = COL.muted; ctx.font = font(13, 500);
    var legend = [t("rule1")]; if (G.rulesOn >= 2) legend.push(t("rule2").replace(/^[^:]+: /, "")); if (G.rulesOn >= 3) legend.push(t("rule3").replace(/^[^:]+: /, ""));
    ctx.fillText(legend.join("   ·   "), CX, H - 48);
    ctx.fillText(S.n + " " + t("trials"), CX, H - 24);
  }
  function loop() { draw(); raf = requestAnimationFrame(loop); }

  /* ---------- history / end ---------- */
  function hist() { try { return JSON.parse(localStorage.getItem("yon-history") || "[]"); } catch (e) { return []; } }
  function finish() {
    G.done = true; G.phase = "done"; G.stim = null; G.lastFeedback = null; var S = stats(); var h = hist(); ga("yon_finish", { lang: lang(), score: S.score, acc: Math.round(S.acc * 100) });
    var prev = h.length ? h[h.length - 1] : null;
    var rec = { d: Date.now(), med: S.med, acc: Math.round(S.acc * 100), score: S.score, beat: S.beat, n: S.n };
    h.push(rec); h = h.slice(-10); try { localStorage.setItem("yon-history", JSON.stringify(h)); } catch (e) {}
    var best = h.reduce(function (m, x) { return x.score && (!m || x.score < m) ? x.score : m; }, 0);
    renderEnd(S, h, prev, best);
  }
  function chart(h) {
    var w = 560, hh = 170, pad = 36, max = Math.max(JEV_MS + 100, Math.max.apply(null, h.map(function (x) { return x.score || 0; })) + 60), min = 200;
    var y = function (v) { return pad + (hh - pad * 1.6) * (1 - (v - min) / (max - min)); }, x = function (i) { return pad + (w - pad * 2) * (h.length > 1 ? i / (h.length - 1) : 0.5); };
    var s = '<svg viewBox="0 0 ' + w + ' ' + hh + '" width="100%" role="img">';
    s += '<line x1="' + pad + '" y1="' + y(JEV_MS) + '" x2="' + (w - pad) + '" y2="' + y(JEV_MS) + '" stroke="#FF6A00" stroke-dasharray="6 6" stroke-width="1.5"/><text x="' + (w - pad) + '" y="' + (y(JEV_MS) - 6) + '" fill="#FF6A00" font-size="12" text-anchor="end">' + t("jevLine") + '</text>';
    var pts = h.map(function (r, i) { return x(i) + "," + y(Math.min(max, r.score || max)); });
    if (h.length > 1) s += '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#EFE9D5" stroke-width="2"/>';
    h.forEach(function (r, i) { s += '<circle cx="' + x(i) + '" cy="' + y(Math.min(max, r.score || max)) + '" r="5" fill="' + (r.score && r.score < JEV_MS && r.acc >= 80 ? "#FF6A00" : "#EFE9D5") + '"/><text x="' + x(i) + '" y="' + (hh - 8) + '" fill="#8f8a7a" font-size="12" text-anchor="middle">' + (r.score || "–") + '</text>'; });
    return s + '</svg>';
  }
  function renderEnd(S, h, prev, best) {
    var L = lang(), diff = prev && prev.med && S.med ? prev.med - S.med : null;
    var line1 = function (l) { return !prev ? T[l].first : (diff >= 0 ? T[l].todayFaster.replace("{x}", diff) : T[l].todaySlower.replace("{x}", -diff)); };
    var line2 = function (l) { return S.score && S.score < JEV_MS && S.acc >= 0.8 ? T[l].crossed : T[l].notYet.replace("{x}", S.score ? Math.max(0, S.score - JEV_MS) : "–"); };
    var closing = Math.floor(Math.random() * 3);
    endBody.innerHTML =
      '<p class="sel-eyebrow">' + both("Round result", "Tur sonucu") + '</p><h2 class="sel-title">' + both("Direction", "Yön") + '</h2>' +
      '<div class="sel-result"><div class="who">' + both("You", "Sen") + '</div><div></div><div class="who who-jev">Jev</div>' +
      '<div class="big">' + (S.med || "–") + ' ms</div><div class="lbl">' + both("median reaction", "medyan tepki") + '</div><div class="big">' + JEV_MS + ' ms</div>' +
      '<div class="big">' + Math.round(S.acc * 100) + ' %</div><div class="lbl">' + both("accuracy", "doğruluk") + '</div><div class="big">100 %</div>' +
      '<div class="big">' + (S.score || "–") + '</div><div class="lbl">' + both("reflex score<br><small>median ÷ accuracy</small>", "refleks puanı<br><small>medyan ÷ doğruluk</small>") + '</div><div class="big">' + JEV_MS + '</div>' +
      '<div class="lbl">' + both(S.n + " trials · " + S.beat + " faster than Jev" + (best && S.score === best ? " · personal best" : ""), S.n + " deneme · " + S.beat + " kez Jev'den hızlı" + (best && S.score === best ? " · kişisel rekor" : "")) + '</div><div></div><div class="lbl">' + both("reads the stimulus as text", "uyaranı metin olarak okur") + '</div></div>' +
      '<p class="sel-verdict">' + both(line1("en"), line1("tr")) + ' ' + both(line2("en"), line2("tr")) + '</p>' +
      '<p class="sel-agg"><b>' + both(T.en.history, T.tr.history) + '</b></p>' + chart(h) +
      '<p class="sel-hint">' + both(T.en.closing[closing], T.tr.closing[closing]) + '</p>' +
      '<div class="sel-actions"><button type="button" class="btn btn-primary" id="yon-replay">' + both(T.en.replay, T.tr.replay) + '</button><button type="button" class="btn-ghost" id="yon-home">' + both(T.en.home, T.tr.home) + '</button></div>';
    endWrap.hidden = false;
    document.getElementById("yon-replay").addEventListener("click", start);
    document.getElementById("yon-home").addEventListener("click", close);
  }
  function start() { intro.hidden = true; endWrap.hidden = true; G = newGame(); G.banner = "rule1"; G.phase = "banner"; G.until = performance.now() + 1500; fit(); if (!raf) loop(); ga("yon_start", { lang: lang() }); }
  function ga(name, params) { if (typeof window.gtag === "function") window.gtag("event", name, params || {}); }
  function open() { intro.hidden = false; endWrap.hidden = true; G = null; modal.showModal(); fit(); if (!raf) loop(); ga("yon_open", { lang: lang() }); }
  function close() { if (raf) { cancelAnimationFrame(raf); raf = 0; } G = null; if (modal.open) modal.close(); }
  if (link) link.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  modal.addEventListener("close", function () { if (raf) { cancelAnimationFrame(raf); raf = 0; } G = null; });
  modal.addEventListener("click", function (e) { var r = modal.getBoundingClientRect(); var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; if (!inside) close(); });

  startBtn.addEventListener("click", start);
  window.addEventListener("resize", function () { if (modal.open) fit(); });
  var KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right", W: "up", S: "down", A: "left", D: "right" };
  document.addEventListener("keydown", function (e) { if (!modal.open) return; var d = KEYS[e.key]; if (d && G && !G.done) { e.preventDefault(); input(d); } });
  canvas.addEventListener("pointerdown", function (e) {
    if (!G || G.done) return;
    var r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width - CX, y = (e.clientY - r.top) * H / r.height - CY;
    if (Math.abs(x) < 40 && Math.abs(y) < 40) return;
    input(Math.abs(x) > Math.abs(y) ? (x > 0 ? "right" : "left") : (y > 0 ? "down" : "up"));
  });
})();

