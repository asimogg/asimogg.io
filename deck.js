const S=[...document.querySelectorAll('.slide')];
let i=0;
document.getElementById('tot').textContent=S.length;

function go(n){
  i=Math.max(0,Math.min(S.length-1,n));
  S.forEach((s,k)=>s.classList.toggle('active',k===i));
  document.getElementById('bar').style.width=((i+1)/S.length*100)+'%';
  document.getElementById('cur').textContent=i+1;
  document.getElementById('sect').textContent=S[i].dataset.sect||'';
  document.getElementById('ntxt').innerHTML=S[i].dataset.note||'<p class="dim">—</p>';
  location.hash=i+1;
}
function nT(){document.getElementById('notes').classList.toggle('on')}
function ovT(){document.getElementById('ov').classList.toggle('on')}

/* timer */
let t=0,iv=null;
function fmt(x){return String(Math.floor(x/60)).padStart(2,'0')+':'+String(x%60).padStart(2,'0')}
function tog(){
  const el=document.getElementById('timer');
  if(iv){clearInterval(iv);iv=null;el.classList.remove('run')}
  else{iv=setInterval(()=>{t++;el.textContent='⏱ '+fmt(t)},1000);el.classList.add('run')}
}

document.addEventListener('keydown',e=>{
  if(e.key==='ArrowRight'||e.key==='PageDown'||e.key===' '){e.preventDefault();go(i+1)}
  if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();go(i-1)}
  if(e.key==='Home')go(0);
  if(e.key==='End')go(S.length-1);
  if(e.key==='n'||e.key==='N')nT();
  if(e.key==='o'||e.key==='O')ovT();
  if(e.key==='t'||e.key==='T')tog();
  if(e.key==='Escape')document.getElementById('ov').classList.remove('on');
});
document.addEventListener('click',e=>{
  const act=e.target.closest('[data-act]');
  if(act){
    const a=act.dataset.act;
    if(a==='prev')go(i-1);else if(a==='next')go(i+1);
    else if(a==='timer')tog();else if(a==='overview')ovT();else if(a==='notes')nT();
    return;
  }
  if(e.target.closest('#hud')||e.target.closest('#ov')||e.target.closest('#notes')||e.target.closest('#home'))return;
  if(e.clientX>window.innerWidth*.55)go(i+1);else go(i-1);
});

/* overview build */
const g=document.getElementById('ovg');
S.forEach((s,k)=>{
  const d=document.createElement('div');d.className='t';
  const ttl=s.querySelector('h1,h2');
  const n=document.createElement('span');n.textContent=String(k+1);
  d.appendChild(n);d.appendChild(document.createTextNode(ttl?ttl.textContent.slice(0,58):'—'));
  d.addEventListener('click',()=>{go(k);ovT()});g.appendChild(d);
});

window.addEventListener('hashchange',()=>{
  const n=parseInt(location.hash.slice(1))-1;
  if(!isNaN(n)&&n!==i)go(n);
});
go(location.hash?parseInt(location.hash.slice(1))-1||0:0);
