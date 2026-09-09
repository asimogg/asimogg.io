(function(){
      document.querySelectorAll('[data-year]').forEach(function(e){e.textContent=new Date().getFullYear()});
      fetch('../assets/agent-map/asimo-agent-map.architecture.json',{cache:'no-store'}).then(function(r){return r.ok?r.headers.get('last-modified'):null}).then(function(lm){
        var t=document.querySelector('[data-map-date]'); if(!t) return;
        var d=lm?new Date(lm):new Date(); t.dateTime=d.toISOString().slice(0,10); t.textContent=d.toISOString().slice(0,10);
      }).catch(function(){});
    })();
