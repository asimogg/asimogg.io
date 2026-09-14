(function(){
  document.querySelectorAll('[data-year]').forEach(function(e){e.textContent=new Date().getFullYear()});
  // version + date from the typed source (Last-Modified header = deploy time)
  fetch('../assets/agent-map/asimo-agent-map.architecture.json',{cache:'no-store'}).then(function(r){
    if(!r.ok) return null;
    var lm=r.headers.get('last-modified');
    return r.json().then(function(j){return {lm:lm,title:(j.meta&&j.meta.title)||''};});
  }).then(function(x){
    if(!x) return;
    var d=x.lm?new Date(x.lm):new Date();
    var t=document.querySelector('[data-map-date]'); if(t){t.dateTime=d.toISOString().slice(0,10);t.textContent=d.toISOString().slice(0,10);}
    var m=/v\d+(?:\.\d+)*/.exec(x.title);
    if(m) document.querySelectorAll('[data-map-version]').forEach(function(e){e.textContent=m[0];});
  }).catch(function(){});

  // change log dialog
  var dlg=document.getElementById('map-log'), open=document.getElementById('map-log-open'), close=document.getElementById('map-log-close');
  var list=document.getElementById('map-log-list'), empty=document.getElementById('map-log-empty'), loaded=false;
  function render(log){
    list.innerHTML='';
    (log.versions||[]).forEach(function(v){
      var li=document.createElement('li');
      var head=document.createElement('div'); head.className='log-head';
      var ver=document.createElement('span'); ver.className='log-ver'; ver.textContent=v.version; head.appendChild(ver);
      var date=document.createElement('time'); date.className='log-date'; date.dateTime=v.date; date.textContent=v.date; head.appendChild(date);
      li.appendChild(head);
      var ul=document.createElement('ul'); ul.className='log-items';
      (v.items||[]).forEach(function(it){var x=document.createElement('li'); x.textContent=it; ul.appendChild(x);});
      li.appendChild(ul); list.appendChild(li);
    });
  }
  function load(){
    if(loaded) return;
    fetch('../assets/agent-map/log.json',{cache:'no-store'}).then(function(r){return r.ok?r.json():null}).then(function(log){
      if(!log){empty.hidden=false;return;}
      loaded=true; render(log);
    }).catch(function(){empty.hidden=false;});
  }
  if(dlg&&open&&typeof dlg.showModal==='function'){
    open.addEventListener('click',function(){load();dlg.showModal();});
    close.addEventListener('click',function(){dlg.close();});
    dlg.addEventListener('click',function(e){var r=dlg.getBoundingClientRect();var inside=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;if(!inside)dlg.close();});
  }
})();
