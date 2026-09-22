// Fikir Kapısı / Idea Gate — game logic. External file because the site CSP forbids inline scripts.
  (function(){
  const L = () => document.documentElement.getAttribute("data-lang")==="tr" ? "tr" : "en";
  const T = (en,tr) => L()==="tr" ? tr : en;
  const GATES = [
    {id:"fikir", dim:"yenilik", title:["1 · Idea","1 · Fikir"], q:["What is the idea? Whose problem does it solve?","Fikrin ne? Kimin hangi problemini çözüyor?"], hint:["2–4 sentences. Product, service or process.","2–4 cümle. Ürün, hizmet veya süreç olabilir."]},
    {id:"teknik", dim:"teknik", title:["2 · Technical","2 · Teknik"], q:["How does it work? What have you tried so far, what did you see?","Nasıl çalışıyor? Şimdiye kadar ne denedin, ne gördün?"], hint:["Mechanism, experiment, prototype; numbers if you have them.","Mekanizma, deney, prototip, sayı varsa sayı."]},
    {id:"musteri", dim:"musteri", title:["3 · Customer","3 · Müşteri"], q:["Who buys this and why? Have you talked to a customer?","Bunu kim, neden alır? Bir müşteriyle konuştun mu?"], hint:["A concrete customer type and evidence.","Somut bir müşteri tipi ve kanıt."]},
    {id:"ekonomi", dim:"ekonomi", title:["4 · Economics","4 · Ekonomi"], q:["What do you know about cost and price? How is the problem solved today, who is the competitor?","Maliyet ve fiyat hakkında ne biliyorsun? Bugün bu problem nasıl çözülüyor, rakip kim?"], hint:["Rough numbers are enough.","Kaba sayılar bile yeter."]},
    {id:"uygulama", dim:"uygulama", title:["5 · Execution","5 · Uygulama"], q:["What happens in the first 90 days, who does it, what is the biggest risk?","İlk 90 günde ne yapılır, kim yapar, en büyük risk ne?"], hint:["Step, owner, timing, risk.","Adım, sorumlu, süre, risk."]},
  ];
  const VARIANTS = {
    musteri_lowtech:["The technical side is not proven yet. Still: have you talked to a customer who lives this problem today? What did they say?","Teknik tarafı henüz kanıtlanmamış görünüyor. Yine de: bu problemi bugün yaşayan bir müşteriyle konuştun mu, ne dedi?"],
    ekonomi_lowcust:["Customer evidence is weak. Think backwards: what does the customer lose without this product, in money?","Müşteri kanıtı zayıf. Ters düşünelim: bu ürün olmasa müşteri ne kaybediyor, bunu para olarak ifade edebilir misin?"],
    uygulama_high:["Strong dossier. Which single experiment or conversation in the first 90 days could kill this idea, and how do you plan it?","Dosya güçlü. İlk 90 günde hangi tek deney veya görüşme bu fikri öldürebilir, onu nasıl planlarsın?"]
  };
  const CLARIFY = {
    fikir:["Be concrete: in which situation, who experiences what, and what does your idea do at that moment?","Biraz daha somut: hangi durumda, kim, ne yaşıyor ve senin fikrin o anda ne yapıyor?"],
    teknik:["Give one example: step by step, what happens in one use, which measurement changes?","Bir örnekle anlat: bir kullanımda adım adım ne oluyor, hangi ölçüm sonucu değişiyor?"],
    musteri:["Think of one real person or company: who, when, why would they want this?","Tek bir gerçek kişi veya firma düşün: kim, ne zaman, neden bunu isterdi?"],
    ekonomi:["Give estimates: unit cost, price, and what the customer pays for this today.","Tahmini rakam ver: birim maliyet kaç, fiyat kaç, bugün müşteri bu iş için ne ödüyor?"],
    uygulama:["Write the first three steps: what, who, how many weeks?","İlk üç adımı yaz: ne, kim, kaç hafta?"]
  };
  const ROADMAP = {
    yenilik:[[["Sharpen the difference","Farkı netleştir"],["Write down 3 existing solutions to the same problem and one sentence on how yours differs from each. If there is no difference, change the idea, not the market.","Aynı problemi çözen 3 mevcut çözümü yaz ve fikrinin her birinden tek cümleyle farkını tanımla. Fark yoksa fikri değiştir, pazarı değil."]],
             [["Make the difference defensible","Farkı savunulabilir yap"],["How long until it is copied? Pick one element protected by patent, know-how or customer relationship and grow it.","Farkın taklit edilme süresi ne? Patent, know-how veya müşteri ilişkisiyle korunan tek bir unsur seç ve onu büyüt."]],
             [["Document the novelty","Yeniliği belgele"],["Run a prior-art search, write the claim down, then decide: provisional patent or publication.","Prior art taraması yap, iddiayı yazılı hale getir. Patent ön başvurusu veya yayın kararı ver."]]],
    teknik:[[["Write the mechanism","Mekanizmayı yaz"],["One page on how it works, with one measurable quantity. Without a mechanism no experiment can be designed.","Nasıl çalıştığını bir sayfada, ölçülebilir bir büyüklükle tanımla. Mekanizma yoksa deney tasarlanamaz."]],
            [["One-variable experiment","Tek değişkenli deney"],["A bench experiment, one variable, three replicates. Goal: not to prove it works, but to see where it breaks.","Tezgah üstünde tek değişkenli, 3 tekrarlı bir deney. Hedef: çalıştığını değil, hangi koşulda bozulduğunu görmek."]],
            [["Repeatability and scale","Tekrarlanabilirlik ve ölçek"],["Have someone else repeat the experiment, then plan a 10× pilot. Report the deviation.","Deneyi başka biri tekrarlasın, sonra 10 kat ölçekte pilot planla. Sapmayı raporla."]]],
    musteri:[[["Five conversations","5 görüşme"],["Five 20-minute talks with people who live the problem. Don't pitch, listen. Keep one quote per talk.","Problemi yaşayan 5 kişiyle 20 dakikalık görüşme. Anlatma, dinle. Her görüşmeden bir alıntı kaydet."]],
             [["Willingness-to-pay test","Ödeme niyeti testi"],["Ask for a pre-order, a pilot contract or a letter of intent. 'Interesting' is not evidence; a signature is.","Ön sipariş, pilot sözleşmesi veya niyet mektubu iste. 'İlginç' kanıt değildir, imza kanıttır."]],
             [["Segment and channel","Segment ve kanal"],["Rank which customer type buys fastest, pick the first channel, postpone the second segment.","Hangi müşteri tipi en hızlı alıyor sırala, ilk kanalı seç, ikinci segmenti ertele."]]],
    ekonomi:[[["Unit economics draft","Birim ekonomisi taslağı"],["Unit cost, target price and today's alternative in one table. Estimates are fine; blanks are not.","Birim maliyet, hedef fiyat ve bugünkü alternatifin fiyatı tek tabloda. Tahmin sorun değil, boşluk sorun."]],
             [["Sensitivity","Duyarlılık"],["Which cost item dominates? If it moves 30 %, does the idea survive? Write the answer.","Maliyeti en çok hangi kalem belirliyor? %30 sapmada fikir yaşıyor mu? Cevabı yaz."]],
             [["Volume and payback","Hacim ve geri dönüş"],["Three-year volume assumption, investment and payback, in the format your innovation board expects.","Üç yıllık hacim varsayımı, yatırım ve geri dönüş süresi, kurul formatında."]]],
    uygulama:[[["First 90 days","İlk 90 gün"],["Three steps, three owners, three dates. At least one step must be a test that can kill the idea.","Üç adım, üç sorumlu, üç tarih. En az biri fikri öldürebilecek bir test olmalı."]],
              [["Decision points","Karar noktaları"],["Put a numeric go/stop criterion at the end of each step.","Her adımın sonuna sayısal 'devam / dur' kriteri koy."]],
              [["Resources and risk register","Kaynak ve risk kaydı"],["Budget, people, equipment; rank the top five risks by likelihood × impact and define a mitigation for the first two.","Bütçe, kişi, ekipman; ilk beş riski olasılık × etki ile sırala, ilk ikisine önlem tanımla."]]]
  };
  const LABEL = {yenilik:["Novelty","Yenilik"],teknik:["Technical maturity","Teknik olgunluk"],musteri:["Customer evidence","Müşteri kanıtı"],ekonomi:["Economics","Ekonomi"],uygulama:["Execution","Uygulanabilirlik"]};
  const DIMS = ["yenilik","teknik","musteri","ekonomi","uygulama"];
  const lab = k => T(LABEL[k][0],LABEL[k][1]);
  let S = {idea:"", answers:[], gate:0, last:null, clarified:false, turns:[], currentQ:""};
  const $ = s => document.querySelector(s);
  function renderGates(){ $("#gates").innerHTML = GATES.map((g,i)=>`<span class="${i<S.gate?'done':i===S.gate?'cur':''}"></span>`).join(""); }
  function questionFor(i){
    const g = GATES[i]; if(!S.last) return T(...g.q);
    const d = S.last.dims;
    if(g.id==="musteri" && d.teknik.score<2) return T(...VARIANTS.musteri_lowtech);
    if(g.id==="ekonomi" && d.musteri.score<2) return T(...VARIANTS.ekonomi_lowcust);
    if(g.id==="uygulama" && DIMS.every(k=>d[k].score>=3)) return T(...VARIANTS.uygulama_high);
    return T(...g.q);
  }
  function ask(question, hint, clar){
    renderGates(); const g = GATES[S.gate];
    $("#stage").innerHTML = `<div class="fk-card ${clar?'clar':''}"><div class="fk-hint">${T(...g.title)}${clar?T(' · clarification',' · netleştirme'):''}</div><p class="fk-q">${question}</p><p class="fk-hint">${hint||''}</p>
      <textarea id="ans" placeholder="${T('Write your answer…','Cevabını yaz…')}"></textarea><br><button type="button" class="btn btn-primary fk-btn" id="go">${T('Pass the gate','Kapıdan geç')}</button><div class="fk-meta" id="meta"></div></div>${S.last?panel():''}`;
    $("#go").onclick = submit; $("#ans").focus(); S.currentQ = question;
  }
  async function submit(){
    const ans = $("#ans").value.trim(); if(ans.length<3) return;
    $("#go").disabled = true; $("#meta").textContent = T("Jev is judging…","Jev puanlıyor…");
    const g = GATES[S.gate]; if(S.gate===0 && !S.idea) S.idea = ans;
    const body = {idea:S.idea, answers:S.answers, gate:g.id, question:S.currentQ, answer:ans};
    let r; try{ r = await (await fetch("api.php",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})).json(); }
    catch(e){ $("#meta").textContent=T("Server error: ","Sunucu hatası: ")+e; $("#go").disabled=false; return; }
    if(!r.ok){ const m={no_key:T("The judge is not configured yet.","Hakem henüz yapılandırılmamış."),rate:T("Too many turns, wait a few minutes.","Çok fazla tur, birkaç dakika bekle."),jev:T("Jev did not answer, try again.","Jev cevap vermedi, tekrar dene.")}; $("#meta").textContent=m[r.error]||("Error: "+r.error); $("#go").disabled=false; return; }
    S.answers.push({gate:g.id, question:S.currentQ, answer:ans}); S.last = r; S.turns.push({gate:g.id, ...r});
    const cur = r.dims[g.dim];
    if(!S.clarified && (r.flags.belirsiz>0.6 || cur.conf<0.45)){
      S.clarified = true;
      const why = r.flags.belirsiz>0.6 ? T(`Jev found the answer vague (${Math.round(r.flags.belirsiz*100)} %)`,`Jev cevabı belirsiz buldu (%${Math.round(r.flags.belirsiz*100)})`) : T(`Jev is unsure at this gate (confidence ${cur.conf})`,`Jev bu kapıda kararsız kaldı (güven ${cur.conf})`);
      ask(T(...CLARIFY[g.id]), why+T(". One more turn.",". Bir tur daha."), true); return;
    }
    S.clarified = false; S.gate++;
    if(S.gate>=GATES.length) return finish();
    ask(questionFor(S.gate), T(...GATES[S.gate].hint));
  }
  const badge=(t,p)=>`<span class="fk-badge ${p>0.5?'on':''}">${t} ${Math.round(p*100)}%</span>`;
  const badges=f=>badge(T("Gave numbers","Sayı verdi"),f.sayi_var)+badge(T("Knows the competitor","Rakibi biliyor"),f.rakip_var)+badge(T("Aware of the risk","Riskin farkında"),f.risk_farkinda);
  function panel(){
    const d=S.last.dims, f=S.last.flags;
    return `<div class="fk-card"><div class="fk-row"><div>${radar(d)}</div><div>
      <div class="fk-kv">${DIMS.map(k=>`<span>${lab(k)}</span><div class="fk-bar"><i style="width:${d[k].score/4*100}%"></i></div><span>${d[k].score.toFixed(1)}</span>`).join("")}</div>
      <div style="margin-top:.6rem">${badges(f)}</div>
      <div class="fk-meta">Jev ${S.last.latency_s}s · ${S.last.usage?S.last.usage.input_tokens+"+"+S.last.usage.output_tokens+" token":""}</div></div></div></div>`;
  }
  function radar(d){
    const n=DIMS.length, cx=150, cy=130, R=88;
    const pt=(i,r)=>{const a=-Math.PI/2+i*2*Math.PI/n; return [cx+r*Math.cos(a), cy+r*Math.sin(a)];};
    let s=`<svg viewBox="0 0 300 270" width="100%" role="img" aria-label="radar">`;
    [1,2,3,4].forEach(l=>{ s+=`<polygon class="grid" points="${DIMS.map((k,i)=>pt(i,R*l/4).join(",")).join(" ")}"/>`; });
    s+=`<polygon class="val" points="${DIMS.map((k,i)=>pt(i,R*d[k].score/4).join(",")).join(" ")}"/>`;
    DIMS.forEach((k,i)=>{const [x,y]=pt(i,R+18); s+=`<text x="${x}" y="${y}" text-anchor="middle">${lab(k)}</text>`;});
    return s+"</svg>";
  }
  function finish(){
    renderGates(); const d=S.last.dims, f=S.last.flags;
    const order = DIMS.slice().sort((a,b)=>d[a].score-d[b].score);
    const lvl = s => s<1.5?0:s<3?1:2;
    const steps = order.slice(0,3).map((k,i)=>{const [t,body]=ROADMAP[k][lvl(d[k].score)]; return `<div class="fk-step"><b>${i+1}. ${lab(k)} (${d[k].score.toFixed(1)}/4): ${T(...t)}</b>${T(...body)}</div>`;}).join("");
    const weakest = order[0]; const gname=(GATES.find(g=>g.dim===weakest)||{}).id; const mine = S.answers.find(a=>a.gate===gname);
    const quote = mine ? `<div class="fk-meta">${T("Your words","Senin sözlerin")}: “${mine.answer.slice(0,160)}${mine.answer.length>160?'…':''}”</div>` : "";
    const avg = DIMS.reduce((s,k)=>s+d[k].score,0)/5;
    const verdict = avg>=3?T("Looks ready for the board","Kurul'a gitmeye hazır görünüyor"):avg>=2?T("Between gate 2 and 3, gather evidence","Kapı 2 ile 3 arasında, kanıt topla"):T("Still an idea, validate the problem first","Henüz fikir aşamasında, önce problemi doğrula");
    const tokens = S.turns.reduce((s,t)=>s+(t.usage?t.usage.input_tokens+t.usage.output_tokens:0),0);
    const lat = S.turns.reduce((s,t)=>s+t.latency_s,0);
    $("#stage").innerHTML = `<div class="fk-card"><p class="fk-q">${T("Your roadmap","Yol haritan")}</p><p class="fk-hint">${verdict} · ${T("average","ortalama")} ${avg.toFixed(1)}/4</p>
      <div class="fk-row"><div>${radar(d)}</div><div>${steps}</div></div>
      <div class="fk-risk"><b>${T("Your riskiest assumption:","En riskli varsayımın:")}</b> ${T(`${lab(weakest)} is the weakest dimension and Jev is ${d[weakest].conf<0.5?'unsure':'clear'} here (confidence ${d[weakest].conf}). Your first step must test this assumption.`,`${lab(weakest)} boyutu en zayıf ve Jev burada ${d[weakest].conf<0.5?'kararsız':'net'} (güven ${d[weakest].conf}). İlk adımın bu varsayımı test etmeli.`)}${quote}</div>
      <div style="margin-top:.6rem">${badges(f)}</div>
      <div class="fk-meta">${S.turns.length} ${T("turns","tur")} · Jev ${lat.toFixed(1)} s · ${tokens} token</div>
      <button type="button" class="btn btn-primary fk-btn" id="again">${T("New idea","Yeni fikir")}</button></div>`;
    $("#again").onclick = () => location.reload();
  }
  document.addEventListener("click", e=>{ if(e.target.closest("[data-set-lang]")) setTimeout(()=>{ if(!S.last && S.gate===0){ ask(T(...GATES[0].q), T(...GATES[0].hint)); } }, 0); });
  ask(T(...GATES[0].q), T(...GATES[0].hint));
  })();
