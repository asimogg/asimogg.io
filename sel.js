/* "The Flood" — the decision duel. Twelve inbox cards fall; the player sorts each
   into Now / Later / Delegate / Delete before it lands. Jev (TypeSafe System One)
   sorts the same twelve in one server-timed request; its picks stay hidden until
   the player has answered each card. Plain 2D canvas, no libraries. */
(function () {
  "use strict";
  var html = document.documentElement;
  var modal = document.getElementById("sel-modal");
  var canvas = document.getElementById("sel-canvas");
  if (!modal || !canvas || typeof modal.showModal !== "function") return;

  var link = document.getElementById("sel-link");
  var closeBtn = document.getElementById("sel-close");
  var intro = document.getElementById("sel-intro");
  var startBtn = document.getElementById("sel-start");
  var status = document.getElementById("sel-status");
  var endWrap = document.getElementById("sel-end");
  var endBody = document.getElementById("sel-end-body");
  var ctx = canvas.getContext("2d");

  var W = 1000, H = 620, CARDS = 12;
  var COL = { bg: "#000000", ink: "#EFE9D5", muted: "#8f8a7a", line: "#3a372f", accent: "#FF6A00", red: "#D84A3A" };
  var BINS = ["now", "later", "delegate", "delete"];
  var BIN_W = 140, BIN_GAP = 14, BIN_Y = 470, BIN_H = 86, BIN_X0 = (W - (4 * BIN_W + 3 * BIN_GAP)) / 2;
  var CARD_W = 470, CARD_H = 84, CARD_X = (W - CARD_W) / 2, FALL_Y0 = 40, FALL_Y1 = BIN_Y - CARD_H - 8;
  var LANE_L = 170, LANE_R = W - 170;

  var T = {
    en: { you: "You", jev: "Jev", card: "card", avg: "avg", miss: "missed", jevBatch: "12 decisions in one request", loading: "Dealing the cards and asking Jev…", offline: "Jev is offline right now — you play solo.", error: "Could not start the round. Try again in a moment.", replay: "Play again", close: "Back to home", correct: "correct", faster: "faster", perCard: "per card", games: "games so far", everyone: "Everyone who played", verdictWin: "You beat Jev on accuracy; {speed}.", verdictTie: "Same accuracy; {speed}.", verdictLose: "Jev was more accurate; {speed}.", speedFast: "it decided about {x}× faster", speedEven: "you were about as fast", speedYou: "you were faster", verdictSolo: "Jev was offline this round, so there is no duel to score.", fair: "Jev's time is one server-timed request for all twelve cards, network included. Your time is measured from a card appearing to your key press. Both are scored against the same fixed key.", n: "n" },
    tr: { you: "Sen", jev: "Jev", card: "kart", avg: "ort.", miss: "kaçtı", jevBatch: "12 karar tek istekte", loading: "Kartlar dağıtılıyor, Jev'e soruluyor…", offline: "Jev şu an çevrimdışı; tek başına oynuyorsun.", error: "Tur başlatılamadı. Biraz sonra tekrar dene.", replay: "Tekrar oyna", close: "Ana sayfaya dön", correct: "doğru", faster: "daha hızlı", perCard: "kart başına", games: "oyun oynandı", everyone: "Bugüne kadar herkes", verdictWin: "Doğrulukta Jev'i geçtin; {speed}.", verdictTie: "Doğruluk eşit; {speed}.", verdictLose: "Jev daha doğruydu; {speed}.", speedFast: "o yaklaşık {x}× daha hızlı karar verdi", speedEven: "hızınız başa baştı", speedYou: "sen daha hızlıydın", verdictSolo: "Jev bu turda çevrimdışıydı, düello puanlanmadı.", fair: "Jev'in süresi on iki kart için tek bir isteğin sunucuda ölçülen süresi, ağ dahil. Senin süren kartın belirmesinden tuşa basmana kadar. İkisi de aynı sabit anahtara göre puanlanır.", n: "n" }
  };
  function lang() { return html.getAttribute("data-lang") === "tr" ? "tr" : "en"; }
  function t(k) { return T[lang()][k]; }
  function ga(name, params) { if (typeof window.gtag === "function") window.gtag("event", name, params || {}); }
  function fmtSec(ms) { return (ms / 1000).toFixed(lang() === "tr" ? 1 : 1).replace(".", lang() === "tr" ? "," : ".") + (lang() === "tr" ? " sn" : " s"); }

  var IMG = {};
  ["stand", "laugh", "overwhelmed"].forEach(function (k) { var im = new Image(); im.src = "assets/sel/stickman-" + k + ".png"; IMG[k] = im; });

  /* ---------- state ---------- */
  var G = null;      // current game
  var raf = 0;
  function newGame(data) {
    return {
      bins: data.bins, cards: data.cards, jev: data.jev, stats: data.stats,
      i: -1, phase: "idle", spawn: 0, fallMs: 0,
      human: [], jevOk: 0, pose: "stand", poseUntil: 0,
      resolve: null, done: false
    };
  }
  function fallTime(i) { return 6000 - i * (2600 / (CARDS - 1)); }

  function nextCard() {
    G.i += 1;
    if (G.i >= CARDS) { finish(); return; }
    G.phase = "fall";
    G.spawn = performance.now();
    G.fallMs = fallTime(G.i);
    G.resolve = null;
  }

  function answer(bin) {
    if (!G || G.phase !== "fall") return;
    var now = performance.now();
    var card = G.cards[G.i];
    var ms = bin ? Math.round(now - G.spawn) : null;
    var ok = bin === card.label;
    var jp = G.jev ? G.jev.picks[card.id] : null;
    var jok = jp ? jp.choice === card.label : null;
    if (jok) G.jevOk += 1;
    G.human.push({ id: card.id, bin: bin, ms: ms, ok: ok, jev: jp ? jp.choice : null, jevOk: jok });
    G.phase = "resolve";
    G.resolve = { at: now, bin: bin, ok: ok, jev: jp ? jp.choice : null, jevOk: jok, y: bin ? cardY() : FALL_Y1 };
    G.pose = ok ? "laugh" : "overwhelmed"; G.poseUntil = now + 1000;
    setTimeout(nextCard, 1000);
  }
  function cardY() { var p = Math.min(1, (performance.now() - G.spawn) / G.fallMs); return FALL_Y0 + (FALL_Y1 - FALL_Y0) * (p * p * 0.35 + p * 0.65); }

  /* ---------- drawing ---------- */
  function fit() {
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var r = canvas.getBoundingClientRect();
    if (!r.width) return;
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
    ctx.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
  }
  function font(px, weight) { return (weight || 500) + " " + px + "px Archivo, 'Helvetica Neue', Arial, sans-serif"; }
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function wrap(text, maxW, px) {
    ctx.font = font(px, 500);
    var words = text.split(" "), lines = [], cur = "";
    words.forEach(function (w) { var tst = cur ? cur + " " + w : w; if (ctx.measureText(tst).width > maxW && cur) { lines.push(cur); cur = w; } else cur = tst; });
    if (cur) lines.push(cur);
    return lines;
  }
  function drop(x, y, r, glow) {
    if (glow) { ctx.shadowColor = COL.accent; ctx.shadowBlur = glow; }
    ctx.fillStyle = COL.accent;
    ctx.beginPath(); ctx.moveTo(x, y - r * 1.5); ctx.bezierCurveTo(x + r * 1.1, y - r * 0.2, x + r, y + r * 0.9, x, y + r); ctx.bezierCurveTo(x - r, y + r * 0.9, x - r * 1.1, y - r * 0.2, x, y - r * 1.5); ctx.fill();
    ctx.shadowBlur = 0;
  }
  function mark(x, y, ok) {
    ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.strokeStyle = ok ? COL.accent : COL.red; ctx.beginPath();
    if (ok) { ctx.moveTo(x - 9, y); ctx.lineTo(x - 2, y + 7); ctx.lineTo(x + 10, y - 8); } else { ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y + 8); ctx.moveTo(x + 8, y - 8); ctx.lineTo(x - 8, y + 8); }
    ctx.stroke();
  }
  function binRect(k) { return { x: BIN_X0 + k * (BIN_W + BIN_GAP), y: BIN_Y, w: BIN_W, h: BIN_H }; }

  function draw() {
    var now = performance.now();
    ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
    if (!G) return;
    var L = lang();
    var answered = G.human.filter(function (h) { return h.ms !== null; });
    var hOk = G.human.filter(function (h) { return h.ok; }).length;
    var hAvg = answered.length ? answered.reduce(function (s, h) { return s + h.ms; }, 0) / answered.length : 0;

    // lanes
    ctx.strokeStyle = COL.line; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(LANE_L, 30); ctx.lineTo(LANE_L, H - 30); ctx.moveTo(LANE_R, 30); ctx.lineTo(LANE_R, H - 30); ctx.stroke();

    // left: the player
    var pose = (G.poseUntil > now) ? G.pose : "stand";
    var im = IMG[pose]; if (im && im.complete && im.naturalWidth) { var ih = 300, iw = ih * im.naturalWidth / im.naturalHeight; ctx.drawImage(im, LANE_L / 2 - iw / 2, 290, iw, ih); }
    ctx.textAlign = "center"; ctx.fillStyle = COL.ink; ctx.font = font(22, 640); ctx.fillText(t("you"), LANE_L / 2, 70);
    ctx.font = font(40, 640); ctx.fillText(hOk + "/" + CARDS, LANE_L / 2, 125);
    ctx.font = font(16, 500); ctx.fillStyle = COL.muted; ctx.fillText(t("avg") + " " + (answered.length ? fmtSec(hAvg) : "–"), LANE_L / 2, 156);
    if (G.phase === "fall") { ctx.fillStyle = COL.accent; ctx.font = font(30, 640); ctx.fillText(fmtSec(now - G.spawn), LANE_L / 2, 230); }

    // right: Jev
    ctx.fillStyle = COL.accent; ctx.font = font(22, 640); ctx.fillText(t("jev"), (LANE_R + W) / 2, 70);
    ctx.fillStyle = COL.ink; ctx.font = font(40, 640); ctx.fillText((G.jev ? G.jevOk : "–") + "/" + CARDS, (LANE_R + W) / 2, 125);
    ctx.font = font(16, 500); ctx.fillStyle = COL.muted; ctx.fillText(G.jev ? fmtSec(G.jev.ms) : t("offline").split(" ")[0], (LANE_R + W) / 2, 156);
    if (G.jev) { ctx.font = font(13, 500); ctx.fillText(t("jevBatch"), (LANE_R + W) / 2, 178); }
    drop((LANE_R + W) / 2, 420, 42, G.phase === "resolve" ? 40 : 14);

    // bins
    BINS.forEach(function (b, k) {
      var r = binRect(k), hi = G.resolve && G.resolve.bin === b, jv = G.resolve && G.resolve.jev === b;
      ctx.lineWidth = hi ? 3 : 1.5; ctx.strokeStyle = hi ? (G.resolve.ok ? COL.accent : COL.red) : COL.line; ctx.fillStyle = "#0a0a09";
      rrect(r.x, r.y, r.w, r.h, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = COL.ink; ctx.font = font(20, 620); ctx.textAlign = "center"; ctx.fillText(G.bins[b][L], r.x + r.w / 2, r.y + 40);
      ctx.fillStyle = COL.muted; ctx.font = font(13, 500); ctx.fillText(String(k + 1), r.x + r.w / 2, r.y + 68);
      if (jv) { drop(r.x + r.w - 18, r.y - 22, 9, 12); mark(r.x + r.w - 18, r.y - 46, G.resolve.jevOk); }
      if (hi) mark(r.x + 18, r.y - 22, G.resolve.ok);
    });

    // progress dots
    for (var d = 0; d < CARDS; d++) { ctx.beginPath(); ctx.arc(W / 2 - (CARDS - 1) * 9 + d * 18, H - 28, 4, 0, Math.PI * 2); ctx.fillStyle = d < G.i ? (G.human[d] && G.human[d].ok ? COL.accent : COL.red) : (d === G.i ? COL.ink : COL.line); ctx.fill(); }

    // the card
    if (G.phase === "fall" || G.phase === "resolve") {
      var card = G.cards[G.i], y, alpha = 1;
      if (G.phase === "fall") {
        y = cardY();
        if (now - G.spawn >= G.fallMs) { answer(null); return; }
      } else {
        var p = Math.min(1, (now - G.resolve.at) / 220);
        if (G.resolve.bin) { var br = binRect(BINS.indexOf(G.resolve.bin)); y = G.resolve.y + (br.y - CARD_H - 14 - G.resolve.y) * p; alpha = 1 - p; }
        else { y = FALL_Y1; alpha = 1 - p; }
        if (alpha <= 0.02) alpha = 0;
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "#0a0a09"; ctx.strokeStyle = COL.ink; ctx.lineWidth = 2; rrect(CARD_X, y, CARD_W, CARD_H, 10); ctx.fill(); ctx.stroke();
      var lines = wrap(card.text, CARD_W - 40, 19); ctx.fillStyle = COL.ink; ctx.font = font(19, 500); ctx.textAlign = "left";
      lines.slice(0, 3).forEach(function (ln, k) { ctx.fillText(ln, CARD_X + 20, y + 32 + k * 24); });
      ctx.globalAlpha = 1;
      // remaining-time bar under the card
      if (G.phase === "fall") { var left = 1 - (now - G.spawn) / G.fallMs; ctx.fillStyle = COL.line; ctx.fillRect(CARD_X, y + CARD_H + 6, CARD_W, 3); ctx.fillStyle = COL.accent; ctx.fillRect(CARD_X, y + CARD_H + 6, CARD_W * left, 3); }
      ctx.textAlign = "center"; ctx.fillStyle = COL.muted; ctx.font = font(13, 500); ctx.fillText(t("card") + " " + (G.i + 1) + "/" + CARDS, W / 2, 22);
    }
  }
  function loop() { draw(); raf = requestAnimationFrame(loop); }

  /* ---------- rounds ---------- */
  function say(state, key) { status.dataset.state = state; status.textContent = key ? t(key) : ""; }
  function start() {
    startBtn.disabled = true; say("", "loading");
    fetch("sel.php?op=start&lang=" + lang(), { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d || !d.ok) throw new Error("start");
      G = newGame(d);
      intro.hidden = true; endWrap.hidden = true; say("", null);
      if (!G.jev) say("error", "offline");
      ga("sel_start", { lang: lang(), jev: !!G.jev });
      fit(); if (!raf) loop();
      setTimeout(nextCard, 400);
    }).catch(function () { say("error", "error"); }).then(function () { startBtn.disabled = false; });
  }

  function finish() {
    G.phase = "done"; G.done = true;
    var answered = G.human.filter(function (h) { return h.ms !== null; });
    var hOk = G.human.filter(function (h) { return h.ok; }).length;
    var hAvg = answered.length ? Math.round(answered.reduce(function (s, h) { return s + h.ms; }, 0) / answered.length) : 0;
    var payload = { cards: CARDS, human_correct: hOk, human_ms: hAvg * answered.length, human_n: answered.length };
    if (G.jev) { payload.jev_correct = G.jevOk; payload.jev_ms = G.jev.ms; }
    ga("sel_finish", { lang: lang(), human_correct: hOk, jev_correct: G.jev ? G.jevOk : -1 });
    fetch("sel.php?op=result", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json(); }).then(function (d) { if (d && d.ok) G.stats = d.stats; }).catch(function () {})
      .then(function () { renderEnd(hOk, hAvg, answered.length); });
  }

  function both(en, tr) { return '<span class="en">' + en + '</span><span class="tr">' + tr + '</span>'; }
  function renderEnd(hOk, hAvg, n) {
    var jev = G.jev, L = lang(), s = G.stats;
    var ratio = jev && hAvg ? hAvg / jev.ms : 0;
    var vk = !jev ? "verdictSolo" : (hOk > G.jevOk ? "verdictWin" : (hOk === G.jevOk ? "verdictTie" : "verdictLose"));
    var sk = ratio >= 1.5 ? "speedFast" : (ratio >= 0.8 ? "speedEven" : "speedYou");
    var verdict = function (l) { return T[l][vk].replace("{speed}", T[l][sk].replace("{x}", String(Math.round(ratio)))); };
    var row = function (lbl, a, b) { return '<div class="lbl">' + lbl + '</div><div></div><div class="lbl">' + lbl + '</div>'; };
    var pct = function (v) { return v === null || v === undefined ? "–" : Math.round(v * 100) + " %"; };
    var secs = function (ms, l) { return ms === null || ms === undefined ? "–" : (ms / 1000).toFixed(1).replace(".", l === "tr" ? "," : ".") + (l === "tr" ? " sn" : " s"); };
    var agg = function (l) {
      if (!s || !s.games) return "";
      return T[l].everyone + " (" + s.games + " " + T[l].games + "): " + T[l].you.toLowerCase() + " " + pct(s.human.acc) + " · " + secs(s.human.ms, l) + " " + T[l].perCard + " — Jev " + pct(s.jev.acc) + " · " + secs(s.jev.ms, l);
    };
    endBody.innerHTML =
      '<p class="sel-eyebrow">' + both("Result", "Sonuç") + '</p>' +
      '<h2 class="sel-title">' + both("The Flood", "Sel") + '</h2>' +
      '<div class="sel-result">' +
        '<div class="who">' + both("You", "Sen") + '</div><div></div><div class="who who-jev">Jev</div>' +
        '<div class="big">' + hOk + "/" + CARDS + '</div><div class="lbl">' + both("correct", "doğru") + '</div><div class="big">' + (jev ? G.jevOk + "/" + CARDS : "–") + '</div>' +
        '<div class="big">' + both(secs(hAvg, "en"), secs(hAvg, "tr")) + '</div><div class="lbl">' + both("per card", "kart başına") + '</div><div class="big">' + (jev ? both(secs(jev.ms, "en"), secs(jev.ms, "tr")) : "–") + '</div>' +
        '<div class="lbl">' + both(n + " answered, " + (CARDS - n) + " missed", n + " cevap, " + (CARDS - n) + " kaçtı") + '</div><div></div><div class="lbl">' + (jev ? both("12 decisions, one request", "12 karar, tek istek") : both("offline", "çevrimdışı")) + '</div>' +
      '</div>' +
      '<p class="sel-verdict">' + both(verdict("en"), verdict("tr")) + '</p>' +
      '<p class="sel-agg">' + both(agg("en"), agg("tr")) + '</p>' +
      '<p class="sel-hint">' + both(T.en.fair, T.tr.fair) + '</p>' +
      '<div class="sel-actions"><button type="button" class="btn btn-primary" id="sel-replay">' + both(T.en.replay, T.tr.replay) + '</button><button type="button" class="btn-ghost" id="sel-end-close">' + both(T.en.close, T.tr.close) + '</button></div>';
    endWrap.hidden = false;
    document.getElementById("sel-replay").addEventListener("click", function () { endWrap.hidden = true; start(); });
    document.getElementById("sel-end-close").addEventListener("click", close);
  }

  /* ---------- open / close / input ---------- */
  function open() {
    intro.hidden = false; endWrap.hidden = true; say("", null); G = null;
    modal.showModal(); fit(); if (!raf) loop();
    ga("sel_open", { lang: lang() });
  }
  function close() {
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    G = null;
    if (modal.open) modal.close();
  }
  if (link) link.addEventListener("click", open);
  closeBtn.addEventListener("click", close);
  startBtn.addEventListener("click", start);
  modal.addEventListener("close", function () { if (raf) { cancelAnimationFrame(raf); raf = 0; } G = null; });
  modal.addEventListener("click", function (e) {
    var r = modal.getBoundingClientRect();
    var inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if (!inside) close();
  });
  window.addEventListener("resize", function () { if (modal.open) fit(); });
  document.addEventListener("keydown", function (e) {
    if (!modal.open || !G || G.phase !== "fall") return;
    var k = parseInt(e.key, 10);
    if (k >= 1 && k <= 4) { e.preventDefault(); answer(BINS[k - 1]); }
  });
  function pointerBin(e) {
    var r = canvas.getBoundingClientRect(), x = (e.clientX - r.left) * W / r.width, y = (e.clientY - r.top) * H / r.height;
    for (var k = 0; k < 4; k++) { var b = binRect(k); if (x >= b.x && x <= b.x + b.w && y >= b.y - 30 && y <= b.y + b.h + 20) return BINS[k]; }
    return null;
  }
  canvas.addEventListener("pointerdown", function (e) { var b = pointerBin(e); if (b) { e.preventDefault(); answer(b); } });
})();
