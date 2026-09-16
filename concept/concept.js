/* Concept Works: the stickman film follows the site language (EN/TR narration); play events go to GA. */
(function () {
  "use strict";
  var html = document.documentElement;
  function lang() { return html.getAttribute("data-lang") === "tr" ? "tr" : "en"; }
  function ga(name, params) {
    if (typeof window.gtag === "function") window.gtag("event", name, params || {});
  }
  var stick = document.getElementById("concept-stickman");
  if (stick) {
    function load(keepTime) {
      var src = stick.getAttribute("data-src-" + lang());
      if (!src || stick.getAttribute("src") === src) return;
      var t = keepTime ? stick.currentTime : 0, playing = keepTime && !stick.paused;
      stick.setAttribute("src", src);
      stick.load();
      if (t > 0) stick.addEventListener("loadedmetadata", function seek() {
        stick.removeEventListener("loadedmetadata", seek);
        stick.currentTime = t;
        if (playing) { var p = stick.play(); if (p && p.catch) p.catch(function () {}); }
      });
    }
    load(false);
    document.addEventListener("langchange", function () { load(true); });
    stick.addEventListener("play", function () { ga("concept_stickman_play", { lang: lang() }); }, { once: true });
  }
  var saphire = document.getElementById("concept-saphire");
  if (saphire) saphire.addEventListener("play", function () { ga("saphire_play", { lang: lang(), page: "concept" }); }, { once: true });
})();
