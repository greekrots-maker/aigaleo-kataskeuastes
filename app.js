(function(){
'use strict';
var CFG=window.CFG||{}, C=DATA.companies, PLOT=DATA.plot;
// ---------- utils ----------
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function norm(s){return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ς/g,'σ')}
function pad(n){return (n<10?'0':'')+n}
function fdt(ms){if(!ms)return '';var d=new Date(ms);return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+String(d.getFullYear()).slice(2)+' '+pad(d.getHours())+':'+pad(d.getMinutes())}
function ftime(ms){var d=new Date(ms);return pad(d.getHours())+':'+pad(d.getMinutes())}
function localInput(ms){var d=new Date(ms);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+'T'+pad(d.getHours())+':'+pad(d.getMinutes())}
function hav(a,b,c,d){var R=6371,r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,h=Math.sin(x/2)*Math.sin(x/2)+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)*Math.sin(y/2);return 2*R*Math.asin(Math.sqrt(h))}
function km(x){return x<1?Math.round(x*1000)+' μ':(x.toFixed(1).replace('.',','))+' χλμ'}
function emails(s){return (s||'').match(/[\w.+-]+@[\w-]+\.[\w.-]+/g)||[]}
function link(u,l){return u?'<a href="'+esc(u)+'" target="_blank" rel="noopener">'+esc(l||u)+'</a>':esc(l)}
function yn(v){return '<span class="'+(/^Ναι/.test(v)?'yes':'no')+'">'+esc(v)+'</span>'}
function fphone(tel){var d=tel.replace(/\D/g,'');if(d.indexOf('30')===0&&d.length===12)d=d.slice(2);return d.length===10?d.slice(0,3)+' '+d.slice(3,6)+' '+d.slice(6):tel}
function byName(n){for(var i=0;i<C.length;i++)if(C[i].name===n)return C[i]}
function byPrio(p){for(var i=0;i<C.length;i++)if(C[i].prio===p)return C[i]}
var tt;function toast(m){var t=$('toast');t.textContent=m;t.classList.add('show');clearTimeout(tt);tt=setTimeout(function(){t.classList.remove('show')},2600)}
function lsGet(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
var warned=false;function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){if(!warned){warned=true;toast('⚠ Η συσκευή δεν επιτρέπει αποθήκευση (ιδιωτική περιήγηση;)')}return false}}
C.forEach(function(c){var best=null;c.pins.forEach(function(p){if(p.lat==null)return;p.km=hav(PLOT.lat,PLOT.lon,p.lat,p.lon);if(!best||p.km<best.km)best=p});c.offices.forEach(function(o){if(o.lat!=null)o.km=hav(PLOT.lat,PLOT.lon,o.lat,o.lon)});c.near=best});
// ---------- state ----------
var ACC=null, recs={}, dirty={}, team={accounts:{},at:0};
function loadAcct(n){ACC=n;var s=lsGet('kat5_a'+n,{});recs=s.recs||{};dirty=s.dirty||{};team=lsGet('kat5_team',{accounts:{},at:0})}
function persist(){lsSet('kat5_a'+ACC,{recs:recs,dirty:dirty})}
function rec(n){return recs[n]||{}}
function change(n,fn){var r=recs[n]||(recs[n]={});fn(r);r.u=Date.now();dirty[n]=1;persist();Sync.soon();updStats()}
function isBl(n){return !!rec(n).bl}
function blCount(){var k=0;C.forEach(function(c){if(isBl(c.name))k++});return k}
function isFav(n){return !!rec(n).fav&&!rec(n).bl}
function favCount(){var k=0;C.forEach(function(c){if(isFav(c.name))k++});return k}
var OF=[
 {k:'pct',l:'Ποσοστό αντιπαροχής για μένα (%)',t:'num',best:'max',ph:'π.χ. 35'},
 {k:'units',l:'Διαμερίσματα για μένα',t:'text',ph:'π.χ. 2 διαμ. (1ος & 3ος)'},
 {k:'sqm',l:'Τ.μ. για μένα (σύνολο)',t:'num',best:'max',ph:'π.χ. 160'},
 {k:'months',l:'Χρόνος παράδοσης (μήνες)',t:'num',best:'min',ph:'π.χ. 30'},
 {k:'guar',l:'Εγγυητική επιστολή',t:'sel',o:['','ναι','όχι'],best:'yes'},
 {k:'guarAmt',l:'Ποσό εγγυητικής (€)',t:'num',best:'max',ph:'π.χ. 50000'},
 {k:'permits',l:'Ποιος πληρώνει άδειες/μελέτες',t:'sel',o:['','ο κατασκευαστής','εγώ','μοιρασμένα'],best:'builder'},
 {k:'parking',l:'Πάρκινγκ / αποθήκες για μένα',t:'text',ph:'π.χ. 2 θέσεις + 1 αποθήκη'},
 {k:'parkN',l:'Πλήθος θέσεων + αποθηκών',t:'num',best:'max',ph:'π.χ. 3'},
 {k:'rent',l:'Ενοίκιο ενδιάμεσης κατοικίας (€/μήνα)',t:'num',best:'max',ph:'π.χ. 600'},
 {k:'quality',l:'Ποιότητα υλικών (1–5)',t:'sel',o:['','1','2','3','4','5'],best:'max'},
 {k:'qualityTxt',l:'Υλικά – λεπτομέρειες',t:'text',ph:'κουφώματα, αντλία θερμότητας, κλάση…'},
 {k:'notes',l:'Σημειώσεις προσφοράς',t:'area',ph:'όροι, ρήτρες, εντυπώσεις…'}];
var OUT=[['answered','Μιλήσαμε','ok'],['meeting','Κλείσαμε ραντεβού','ok'],['offer','Θα στείλουν προσφορά','ok'],['callback','Να ξανακαλέσω','mid'],['noanswer','Δεν απάντησε','no'],['wrong','Λάθος αριθμός','bad'],['notint','Δεν ενδιαφέρονται','bad'],['email','Στάλθηκε email','mid']];
function outL(k){for(var i=0;i<OUT.length;i++)if(OUT[i][0]===k)return OUT[i];return [k,k,'']}
function hasOffer(r){if(!r||!r.offer)return false;for(var k in r.offer)if(String(r.offer[k]).trim())return true;return false}
function lastCall(r){var c=(r&&r.calls)||[];var m=null;c.forEach(function(x){if(!m||x.at>m.at)m=x});return m}
// team helpers
function allAcc(){var A={};Object.keys(team.accounts||{}).forEach(function(a){A[a]=team.accounts[a]});A[String(ACC)]=recs;return A}
function active(r){return r&&(r.bl||r.called||(r.calls&&r.calls.length)||hasOffer(r)||r.fav||(r.note&&r.note.trim()))}
function othersCalled(n){var out=[];var A=team.accounts||{};Object.keys(A).forEach(function(a){if(a===String(ACC))return;var r=A[a][n];if(r&&(r.called||(r.calls&&r.calls.length)))out.push({a:a,r:r})});return out}
// ---------- filters ----------
var F={trust:{},ant:'',area:'',new:false,todo:false,nobody:false,q:'',only:'',sort:'prio'};
var areas={};C.forEach(function(c){c.areas.forEach(function(a){areas[a]=(areas[a]||0)+1})});
var sel=$('area');
['Αιγάλεω','Χαϊδάρι','Περιστέρι','Πετρούπολη','Ίλιον','Αγ. Ανάργυροι / Καματερό','Νίκαια / Κορυδαλλός','Άλλη Αττική'].forEach(function(a){if(areas[a]){var o=document.createElement('option');o.value=a;o.textContent=a+' ('+areas[a]+')';sel.appendChild(o)}});
var hay={};C.forEach(function(c){hay[c.name]=norm([c.name,c.area,c.address,c.whatdo,c.services,c.gemi,c.summary,c.projects.map(function(p){return p.html.replace(/<[^>]+>/g,'')}).join(' '),c.phones_raw].join(' '))});
function passes(c){
  if(isBl(c.name))return false;
  if(F.only)return c.name===F.only;
  var tf=Object.keys(F.trust).filter(function(k){return F.trust[k]});
  if(tf.length&&tf.indexOf(c.trust)<0)return false;
  if(F.ant==='yes'&&!c.ant)return false;if(F.ant==='no'&&c.ant)return false;
  if(F.area&&c.areas.indexOf(F.area)<0)return false;
  if(F.new&&!c.new)return false;
  if(F.todo){var r=rec(c.name);if(r.called||(r.calls&&r.calls.length))return false}
  if(F.nobody){var A=allAcc();for(var a in A){var x=A[a][c.name];if(x&&(x.called||(x.calls&&x.calls.length)))return false}}
  var q=norm(F.q.trim());if(q&&q.split(/\s+/).some(function(w){return hay[c.name].indexOf(w)<0}))return false;
  return true}
function nFilters(){var n=Object.keys(F.trust).filter(function(k){return F.trust[k]}).length;if(F.ant)n++;if(F.area)n++;if(F.new)n++;if(F.todo)n++;if(F.nobody)n++;if(F.sort!=='prio')n++;return n}
function ordered(){var a=C.slice();if(F.sort==='dist')a.sort(function(x,y){return (x.near?x.near.km:1e9)-(y.near?y.near.km:1e9)||x.prio-y.prio});return a}
// ---------- cards ----------
var UI={offer:{},more:{},log:{},bl:{}};
function star(n,cls){var f=isFav(n);return '<button type="button" class="favbtn'+(f?' on':'')+(cls?' '+cls:'')+'" data-n="'+esc(n)+'" aria-pressed="'+f+'" aria-label="'+(f?'Αφαίρεση από τα αγαπημένα':'Προσθήκη στα αγαπημένα')+'">'+(f?'★':'☆')+'</button>'}
function trustB(c){return '<span class="tb t-'+c.trust+'">'+c.trust+'</span>'}
function photos(c){if(!c.photos||!c.photos.length)return '';
 return '<div class="photos">'+c.photos.map(function(p){return '<a class="ph" href="'+esc(p.page)+'" target="_blank" rel="noopener"><img loading="lazy" decoding="async" referrerpolicy="no-referrer" src="'+esc(p.img)+'" alt="'+esc(p.label)+'" width="124" height="110"><div>'+esc(p.label)+'</div><div class="cr">πηγή: '+esc(p.credit)+(p.render?' <span class="rd">απεικόνιση</span>':'')+'</div></a>'}).join('')+'</div>'}
function phoneBtns(c,all){var h='';c.phones.forEach(function(p,i){if(!all&&i>1)return;h+='<a class="btn call" data-n="'+esc(c.name)+'" href="tel:'+esc(p.tel)+'">📞 '+esc(fphone(p.tel))+(p.note?' <small>('+esc(p.note)+')</small>':'')+'</a>'});return h}
function teamLine(c){var o=othersCalled(c.name);if(!o.length)return '';
 return '<div class="teamline">⚠ Ήδη σε επαφή: '+o.map(function(x){var lc=lastCall(x.r);return 'Λογ. '+esc(x.a)+' ('+(lc?esc(outL(lc.outcome)[1])+' · '+fdt(lc.at):'κάλεσε '+fdt(x.r.calledAt))+')'}).join(', ')+'</div>'}
function offerForm(c,r){var o=(r&&r.offer)||{},h='<div class="of">';
 OF.forEach(function(f){var v=o[f.k]==null?'':o[f.k],w=(f.t==='area'||f.t==='text')?' class="w"':'';
  h+='<label'+w+'>'+esc(f.l);
  if(f.t==='sel')h+='<select data-of="'+f.k+'">'+f.o.map(function(x){return '<option value="'+esc(x)+'"'+(String(v)===x?' selected':'')+'>'+(x?esc(x):'—')+'</option>'}).join('')+'</select>';
  else if(f.t==='area')h+='<textarea data-of="'+f.k+'" placeholder="'+esc(f.ph||'')+'">'+esc(v)+'</textarea>';
  else h+='<input data-of="'+f.k+'" '+(f.t==='num'?'type="number" inputmode="decimal" step="any"':'type="text"')+' value="'+esc(v)+'" placeholder="'+esc(f.ph||'')+'">';
  h+='</label>'});
 return h+'</div>'}
function offerSum(r){return '💼 Προσφορά'+(hasOffer(r)?' ✓ καταχωρισμένη':' – καταχώριση')}
function logForm(c){return '<div class="logf" data-logf="1"><label>Ημ/νία & ώρα<input type="datetime-local" class="l-at" value="'+localInput(Date.now())+'"></label><label>Αποτέλεσμα<select class="l-out">'+OUT.map(function(o){return '<option value="'+o[0]+'">'+esc(o[1])+'</option>'}).join('')+'</select></label><label class="w">Σημειώσεις κλήσης<textarea class="l-notes" rows="2" placeholder="τι ειπώθηκε, επόμενο βήμα…"></textarea></label><div class="btns"><button type="button" class="minibtn l-cancel">Άκυρο</button><button type="button" class="minibtn pri l-save">Αποθήκευση</button></div></div>'}
function callList(r){var cs=((r&&r.calls)||[]).slice().sort(function(a,b){return b.at-a.at});if(!cs.length)return '';
 return '<ul class="calllog">'+cs.map(function(x){var o=outL(x.outcome);return '<li><span class="oc oc-'+o[2]+'">'+esc(o[1])+'</span><div class="cl-t"><time>'+fdt(x.at)+'</time>'+(x.notes?esc(x.notes):'')+'</div><button type="button" class="xbtn l-del" data-id="'+esc(x.id)+'" aria-label="Διαγραφή καταγραφής">×</button></li>'}).join('')+'</ul>'}
function card(c){
 var r=rec(c.name),n=c.name,h='<article class="card tr-'+c.trust+'" id="c'+c.prio+'" data-p="'+c.prio+'">';
 h+='<div class="ch"><div class="row1"><div class="prio">'+c.prio+'</div><div class="hn"><h2>'+esc(n)+'</h2><div class="tags">'+trustB(c)+(c.new?'<span class="tag new">ΝΕΑ</span>':'')+(c.ant?'<span class="tag ant">Αντιπαροχή</span>':'')+(c.aig?'<span class="tag aig">Έργο στο Αιγάλεω</span>':'')+(c.red.length?'<span class="tag flag">⚠ '+c.red.length+'</span>':'')+(r.called?'<span class="tag done">✓ Κάλεσα</span>':'')+'</div></div>'+star(n)+'</div>';
 h+='<div class="sum"><b>Περίληψη:</b> '+esc(c.summary||'')+'</div>';
 h+='<div class="dist">'+(c.near?'📏 Πλησιέστερο έργο: <b>'+(c.near.lvl==='exact'?'':'≈ ')+km(c.near.km)+'</b> από το οικόπεδο ('+esc(c.near.label)+(c.near.lvl==='exact'?'':', θέση κατά προσέγγιση')+')':'📏 Κανένα έργο με γνωστή θέση')+'</div>';
 h+=teamLine(c);
 h+=photos(c);
 h+='<div class="actions">'+phoneBtns(c,true);
 emails(c.email).slice(0,1).forEach(function(e){h+='<a class="btn sec" href="mailto:'+esc(e)+'">✉️ Email</a>'});
 if(c.web)h+='<a class="btn sec" href="'+esc(c.web)+'" target="_blank" rel="noopener">🌐 Site</a>';
 if(c.pins.some(function(p){return p.lat!=null})||c.offices.some(function(o){return o.lat!=null}))h+='<button class="btn sec tomap" type="button">🗺 Χάρτης</button>';
 h+='</div>';
 h+='<div class="mine"><h3>Η δουλειά μου · Λογαριασμός '+esc(ACC)+'</h3><div class="mrow"><button type="button" class="called'+(r.called?' on':'')+'" aria-pressed="'+(!!r.called)+'"><span class="box">'+(r.called?'✓':'')+'</span>Κάλεσα'+(r.called&&r.calledAt?' <small>'+fdt(r.calledAt)+'</small>':'')+'</button><button type="button" class="minibtn l-open">＋ Καταγραφή κλήσης</button></div>';
 if(UI.log[n])h+=logForm(c);
 h+=callList(r);
 h+=(UI.bl&&UI.bl[n])?'<div class="blform"><input class="blr" type="text" maxlength="140" placeholder="Λόγος (προαιρετικό), π.χ. ζήτησε πολλά" aria-label="Λόγος για τη μαύρη λίστα"><div class="row"><button type="button" class="minibtn danger bl-ok">⛔ Προσθήκη στη μαύρη λίστα</button><button type="button" class="minibtn bl-x">Άκυρο</button></div></div>':'<div class="row"><button type="button" class="minibtn blbtn">⛔ Μαύρη λίστα</button></div>';
 h+='<textarea class="note" placeholder="Σημειώσεις (ραντεβού, εντυπώσεις…)" rows="2">'+esc(r.note||'')+'</textarea>';
 h+='<details class="offer"'+(UI.offer[n]?' open':'')+'><summary>'+offerSum(r)+'</summary>'+(UI.offer[n]?offerForm(c,r):'')+'</details></div>';
 h+='</div><details class="more"'+(UI.more[n]?' open':'')+'><summary>Πλήρης κάρτα: ΓΕΜΗ, έργα, πηγές</summary><div class="body">'+(UI.more[n]?fullBody(c):'')+'</div></details></article>';
 return h}
function projLine(p){return '<li>'+p.html+' '+(p.src?'<a class="src" href="'+esc(p.src)+'" target="_blank" rel="noopener">πηγή ↗</a>'+(p.warn?' <span class="warn">('+esc(p.warn)+')</span>':''):'<span class="nosrc">χωρίς πηγή</span>')+'</li>'}
function fullBody(c){var h='';
 if(c.red.length)h+='<div class="sec"><h3>⚠ Κόκκινες σημαίες / προσοχή</h3><div class="redbox"><ul style="margin:0;padding-left:18px">'+c.red.map(function(x){return '<li>'+esc(x)+'</li>'}).join('')+'</ul></div></div>';
 h+='<div class="sec"><h3>Στοιχεία</h3><dl class="kv"><dt>Τι κάνουν</dt><dd>'+esc(c.whatdo)+'</dd><dt>Περιοχή</dt><dd>'+esc(c.area)+'</dd>';
 h+='<dt>Γραφείο</dt><dd>'+(c.office.length?c.office.map(function(o){return '<a class="map" href="'+esc(o.url)+'" target="_blank" rel="noopener">'+esc(o.label)+'</a>'}).join('<br>'):esc(c.address))+'</dd>';
 h+='<dt>Τηλέφωνα</dt><dd>'+c.phones.map(function(p){return '<a href="tel:'+esc(p.tel)+'">'+esc(fphone(p.tel))+'</a>'}).join(', ')+(c.phones_raw.indexOf('(')>=0?' <span class="small">'+esc(c.phones_raw.replace(/^[^(]*/,''))+'</span>':'')+'</dd>';
 h+='<dt>Email</dt><dd>'+(emails(c.email).length?emails(c.email).map(function(e){return '<a href="mailto:'+esc(e)+'">'+esc(e)+'</a>'}).join(', '):esc(c.email||'δεν βρέθηκε'))+'</dd>';
 h+='<dt>Ιστοσελίδα</dt><dd>'+(c.web?link(c.web,c.website)+(c.webWarn?' <span class="warn">('+esc(c.webWarn)+')</span>':''):esc(c.website))+'</dd>';
 h+='<dt>Αντιπαροχή</dt><dd>'+yn(c.antiparochi)+'</dd><dt>Εργολαβία</dt><dd>'+yn(c.ergolavia)+'</dd><dt>Έτη</dt><dd>'+esc(c.years)+'</dd><dt>Υπηρεσίες</dt><dd>'+esc(c.services)+'</dd></dl></div>';
 h+='<div class="sec"><h3>ΓΕΜΗ / ΑΦΜ</h3><div style="font-size:13.5px">'+esc(c.gemi)+(c.gemi_src?' · '+link(c.gemi_src,'πηγή'):'')+'</div></div>';
 h+='<div class="sec"><h3>Ολοκληρωμένα έργα <span style="text-transform:none;font-weight:400">(📍 = Google Maps)</span></h3><ul class="proj">'+c.projects.map(projLine).join('')+'</ul></div>';
 h+='<div class="sec"><h3>Κριτικές & αρνητικές αναφορές</h3><div style="font-size:13.5px"><b>Κριτικές:</b> '+esc(c.reviews)+'<br><b>Αρνητικά:</b> '+esc(c.neg)+'</div></div>';
 h+='<div class="sec"><h3>Αξιολόγηση</h3><div class="assess"><p><b>Δυνατά σημεία:</b> '+esc(c.strengths)+'</p><p><b>Αδυναμίες / κίνδυνοι:</b> '+esc(c.weak)+'</p><p><b>Όγκος τεκμηρίωσης:</b> '+esc(c.evidence)+'</p><p><b>Εμπιστοσύνη:</b> '+trustB(c)+' '+esc(c.reason)+'</p></div></div>';
 h+='<div class="sec"><h3>Πηγές</h3><div class="srcs">'+c.sources.map(function(s){return s.url?'<a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.label)+'</a>'+(s.extra?' <span>'+esc(s.extra)+'</span>':'')+(s.warn?' <span class="warn">('+esc(s.warn)+')</span>':''):'<div>'+esc(s.label)+'</div>'}).join('')+'</div></div>';
 return h}
function updCard(n){var c=byName(n);if(!c)return;var el=$('c'+c.prio);if(el){var t=document.createElement('div');t.innerHTML=card(c);el.replaceWith(t.firstChild)}}
function updStats(){var mine=0,offers=0;C.forEach(function(c){var r=rec(c.name);if(r.called||(r.calls&&r.calls.length))mine++;if(hasOffer(r))offers++});
 var A=allAcc(),tc={};Object.keys(A).forEach(function(a){Object.keys(A[a]).forEach(function(n){var x=A[a][n];if(x&&(x.called||(x.calls&&x.calls.length)))tc[n]=1})});
 var ms=$('mystats');if(ms)ms.textContent='Εσύ (Λογ. '+ACC+'): '+pl(mine,'κλήση','κλήσεις')+' · '+pl(offers,'προσφορά','προσφορές')+' · Ομάδα: '+Object.keys(tc).length+'/'+C.length+' εταιρείες σε επαφή';
 var fb=$('favn'),fc=favCount();fb.textContent=fc;fb.hidden=!fc;
 var cb=$('calln');if(cb){var cn=calledList().length;cb.textContent=cn;cb.hidden=!cn}
 var bn=blCount();['bln','blnt'].forEach(function(id){var bb=$(id);if(bb){bb.textContent=bn;bb.hidden=!bn}})
 var tn=0;C.forEach(function(c){if(othersCalled(c.name).length)tn++});var tb=$('teamn');tb.textContent=tn;tb.hidden=!tn}
function render(){
 var out=[];ordered().forEach(function(c){if(passes(c))out.push(card(c))});
 var called=C.filter(function(c){var r=rec(c.name);return r.called||(r.calls&&r.calls.length)}).length;
 var nb=blCount();$('count').textContent='Εμφανίζονται '+out.length+' από '+(C.length-nb)+(nb?' (+'+nb+' στη μαύρη λίστα)':'')+' · Κάλεσες '+called+'/'+C.length+(F.sort==='dist'?' · σειρά: πιο κοντά στο οικόπεδο':'');
 $('cards').innerHTML=out.join('')||'<div class="empty"><span class="ei">🔎</span><b>Καμία εταιρεία</b>Δεν βρέθηκε αποτέλεσμα με αυτά τα φίλτρα.<div class="row" style="justify-content:center"><button class="minibtn" type="button" data-reset="1">Καθαρισμός φίλτρων</button></div></div>';
 var ob=$('onlybar');if(F.only){ob.hidden=false;ob.innerHTML='<span>Μόνο: <b>'+esc(F.only)+'</b></span><button type="button" id="onlyx">✕ Όλες</button>'}else{ob.hidden=true;ob.innerHTML=''}
 var fc=nFilters(),fe=$('fcount');fe.textContent=fc;fe.hidden=!fc;
 updStats();if(mapReady)drawMarkers()}
// ---------- list events ----------
$('tiplist').innerHTML=DATA.tips.map(function(t){return '<li>'+t+'</li>'}).join('');
var tq;$('q').addEventListener('input',function(e){clearTimeout(tq);tq=setTimeout(function(){F.q=e.target.value;F.only='';render()},150)});
var ft=$('ftoggle'),fl=$('filters');
ft.addEventListener('click',function(){var o=fl.classList.toggle('open');ft.setAttribute('aria-expanded',o)});
sel.addEventListener('change',function(){F.area=sel.value;F.only='';render()});
$('sort').addEventListener('change',function(e){F.sort=e.target.value;render()});
function resetF(){F={trust:{},ant:'',area:'',new:false,todo:false,nobody:false,q:'',only:'',sort:'prio'};sel.value='';$('sort').value='prio';$('q').value='';fl.querySelectorAll('.chip').forEach(function(x){x.classList.toggle('on',x.dataset.f==='ant'&&x.dataset.v==='')});render()}
fl.addEventListener('click',function(e){var b=e.target.closest('.chip');if(!b)return;var f=b.dataset.f,v=b.dataset.v;F.only='';
 if(f==='trust'){F.trust[v]=!F.trust[v];b.classList.toggle('on',F.trust[v])}
 else if(f==='ant'){F.ant=v;fl.querySelectorAll('[data-f=ant]').forEach(function(x){x.classList.toggle('on',x===b)})}
 else if(f==='new'||f==='todo'||f==='nobody'){F[f]=!F[f];b.classList.toggle('on',F[f])}
 else if(f==='reset'){resetF();return}
 render()});
function cardOf(el){var a=el.closest('.card');if(!a)return null;var c=byPrio(+a.dataset.p);return c?{a:a,c:c,n:c.name}:null}
var cards=$('cards');
cards.addEventListener('click',function(e){var x=cardOf(e.target);if(!x)return;var n=x.n,t;
 if(e.target.closest('.blbtn')){UI.bl[n]=true;updCard(n);var bi=document.querySelector('#c'+x.c.prio+' .blr');if(bi)bi.focus();return}
 if(e.target.closest('.bl-x')){UI.bl[n]=false;updCard(n);return}
 if(e.target.closest('.bl-ok')){var inp=x.a.querySelector('.blr'),why=inp?inp.value.trim():'';UI.bl[n]=false;change(n,function(r){r.bl=Date.now();r.blr=why});refresh();toast('⛔ Μπήκε στη μαύρη λίστα: '+n);return}
 if((t=e.target.closest('.called'))){var on=!rec(n).called;change(n,function(r){r.called=on;r.calledAt=on?Date.now():null});updCard(n);toast(on?'✓ Σημειώθηκε κλήση':'Αφαιρέθηκε το «Κάλεσα»');return}
 if(e.target.closest('.l-open')){UI.log[n]=!UI.log[n];updCard(n);if(UI.log[n]){var s=$('c'+x.c.prio).querySelector('.l-out');if(s)s.focus()}return}
 if(e.target.closest('.l-cancel')){UI.log[n]=false;updCard(n);return}
 if(e.target.closest('.l-save')){var f=x.a.querySelector('.logf');var at=new Date(f.querySelector('.l-at').value).getTime()||Date.now();var oc=f.querySelector('.l-out').value,no=f.querySelector('.l-notes').value.trim();
   change(n,function(r){r.calls=(r.calls||[]).concat([{id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),at:at,outcome:oc,notes:no}]);r.called=true;if(!r.calledAt)r.calledAt=at});UI.log[n]=false;updCard(n);toast('✓ Καταγράφηκε η κλήση');return}
 if((t=e.target.closest('.l-del'))){if(!confirm('Διαγραφή αυτής της καταγραφής;'))return;var id=t.dataset.id;change(n,function(r){r.calls=(r.calls||[]).filter(function(z){return z.id!==id})});updCard(n);return}
 if(e.target.closest('.tomap')){show('map');focusCompany(x.c);return}
 if(e.target.closest('.btn.call')){UI.log[n]=true;setTimeout(function(){updCard(n)},400)}});
cards.addEventListener('input',function(e){var x=cardOf(e.target);if(!x)return;var n=x.n,t=e.target;
 if(t.classList.contains('note')){change(n,function(r){r.note=t.value})}
 else if(t.dataset.of){change(n,function(r){r.offer=r.offer||{};r.offer[t.dataset.of]=t.value});var sm=x.a.querySelector('details.offer>summary');if(sm)sm.textContent=offerSum(rec(n))}});
cards.addEventListener('change',function(e){var x=cardOf(e.target);if(!x)return;var t=e.target;if(t.dataset.of&&t.tagName==='SELECT'){var n=x.n;change(n,function(r){r.offer=r.offer||{};r.offer[t.dataset.of]=t.value});var sm=x.a.querySelector('details.offer>summary');if(sm)sm.textContent=offerSum(rec(n))}});
cards.addEventListener('toggle',function(e){var d=e.target;if(!d.tagName||d.tagName!=='DETAILS')return;var x=cardOf(d);if(!x)return;
 if(d.classList.contains('offer')){UI.offer[x.n]=d.open;if(d.open&&!d.querySelector('.of'))d.insertAdjacentHTML('beforeend',offerForm(x.c,rec(x.n)))}
 else if(d.classList.contains('more')){UI.more[x.n]=d.open;var b=d.querySelector('.body');if(d.open&&!b.innerHTML)b.innerHTML=fullBody(x.c)}},true);
// global clicks
document.addEventListener('click',function(e){var b=e.target.closest('.favbtn');if(b){e.preventDefault();e.stopPropagation();toggleFav(b.dataset.n);return}
 if(e.target.closest('#onlyx')){F.only='';render();return}
 if(e.target.closest('[data-reset]')){resetF();return}
 var o=e.target.closest('.open[data-n],.fopen');if(o){openCompany(o.dataset.n);return}
 var m=e.target.closest('.fmap');if(m){show('map');focusCompany(byName(m.dataset.n));return}
 var br=e.target.closest('.blrest');if(br){var bn=br.dataset.n;change(bn,function(r){r.bl=0;r.blr=''});refresh();if(cur==='black')renderBlack();toast('↩ Επανήλθε: '+bn);return}
 var g=e.target.closest('[data-go]');if(g){e.preventDefault();show(g.dataset.go)}},true);
function toggleFav(n){var f=!isFav(n);change(n,function(r){r.fav=f});
 document.querySelectorAll('.favbtn').forEach(function(b){if(b.dataset.n===n){b.classList.toggle('on',f);b.textContent=f?'★':'☆';b.setAttribute('aria-pressed',f);b.setAttribute('aria-label',f?'Αφαίρεση από τα αγαπημένα':'Προσθήκη στα αγαπημένα')}});
 toast(f?'★ Προστέθηκε στα αγαπημένα':'Αφαιρέθηκε από τα αγαπημένα');
 if(cur==='fav')renderFav();if(cur==='called')renderCalled();if(mapReady&&$('m-fav').checked)drawMarkers()}
function openCompany(n){var c=byName(n);if(!c)return;F.only=n;show('list');render();var el=$('c'+c.prio);if(el)el.scrollIntoView({block:'start'})}
// ---------- favourites view ----------
function renderFav(){var fs=C.filter(function(c){return isFav(c.name)});
 if(!fs.length){$('favlist').innerHTML='<div class="empty"><span class="ei">☆</span><b>Δεν έχεις αγαπημένα ακόμη</b>Πάτα το ☆ σε μια εταιρεία (στη λίστα ή στον χάρτη) για να τη βρίσκεις γρήγορα εδώ.<div class="row" style="justify-content:center"><button class="minibtn pri" type="button" data-go="list">Στη λίστα</button></div></div>';return}
 var h='<div class="panel"><h2>★ Αγαπημένα <span class="small">('+fs.length+')</span></h2><p class="small">Του Λογαριασμού '+esc(ACC)+'. Αποθηκεύονται στη συσκευή και συγχρονίζονται.</p></div>';
 fs.forEach(function(c){var r=rec(c.name),lc=lastCall(r);
  h+='<article class="fcard"><div class="row1"><div class="prio">'+c.prio+'</div><div class="hn"><h2>'+esc(c.name)+'</h2><div class="tags">'+trustB(c)+(r.called?'<span class="tag done">✓ Κάλεσα'+(r.calledAt?' '+fdt(r.calledAt):'')+'</span>':'')+(hasOffer(r)?'<span class="tag aig">💼 Προσφορά</span>':'')+'</div></div>'+star(c.name)+'</div>';
  h+='<div class="sum">'+esc(c.summary||'')+'</div>';
  if(c.near)h+='<div class="dist">📏 '+(c.near.lvl==='exact'?'':'≈ ')+km(c.near.km)+' από το οικόπεδο</div>';
  h+=teamLine(c);
  if(lc)h+='<div class="fnote">📞 '+esc(outL(lc.outcome)[1])+' · '+fdt(lc.at)+(lc.notes?'\n'+esc(lc.notes):'')+'</div>';
  if(r.note)h+='<div class="fnote">📝 '+esc(r.note)+'</div>';
  h+='<div class="actions">'+phoneBtns(c,false);
  emails(c.email).slice(0,1).forEach(function(e){h+='<a class="btn sec" href="mailto:'+esc(e)+'">✉️</a>'});
  if(c.web)h+='<a class="btn sec" href="'+esc(c.web)+'" target="_blank" rel="noopener">🌐</a>';
  h+='</div><div class="row"><button type="button" class="minibtn fopen" data-n="'+esc(c.name)+'">Άνοιγμα κάρτας</button>'+((c.pins.some(function(p){return p.lat!=null})||c.offices.some(function(o){return o.lat!=null}))?'<button type="button" class="minibtn fmap" data-n="'+esc(c.name)+'">🗺 Χάρτης</button>':'')+'</div></article>'});
 $('favlist').innerHTML=h}
// ---------- called view ----------
function callTime(r){var lc=lastCall(r);return Math.max(lc?lc.at:0,r.calledAt||0)}
function calledList(){return C.filter(function(c){var r=rec(c.name);return r&&!r.bl&&(r.called||(r.calls&&r.calls.length))}).sort(function(a,b){return callTime(rec(b.name))-callTime(rec(a.name))})}
function renderCalled(){var ls=calledList();
 if(!ls.length){$('calledlist').innerHTML='<div class="empty"><span class="ei">📞</span><b>Δεν έχεις καλέσει καμία εταιρεία ακόμη</b>Όταν πατήσεις «Κάλεσα» ή «＋ Καταγραφή κλήσης» σε μια κάρτα, η εταιρεία θα εμφανιστεί εδώ, με την πιο πρόσφατη κλήση πρώτη.<div class="row" style="justify-content:center"><button class="minibtn pri" type="button" data-go="list">Στη λίστα</button></div></div>';return}
 var h='<div class="panel"><h2>📞 Κάλεσα <span class="small">('+ls.length+')</span></h2><p class="small">Του Λογαριασμού '+esc(ACC)+', πιο πρόσφατη κλήση πρώτη. Συγχρονίζονται με την ομάδα.</p></div>';
 ls.forEach(function(c){var r=rec(c.name),lc=lastCall(r),n=(r.calls||[]).length,t=callTime(r);
  h+='<article class="fcard"><div class="row1"><div class="prio">'+c.prio+'</div><div class="hn"><h2>'+esc(c.name)+'</h2><div class="tags">'+trustB(c)+'<span class="tag done">✓ '+(t?fdt(t):'Κάλεσα')+'</span>'+(hasOffer(r)?'<span class="tag aig">💼 Προσφορά</span>':'')+'</div></div>'+star(c.name)+'</div>';
  h+='<div class="fnote">'+(lc?'📞 <span class="oc oc-'+outL(lc.outcome)[2]+'">'+esc(outL(lc.outcome)[1])+'</span> · '+fdt(lc.at)+(lc.notes?'\n'+esc(lc.notes):''):'📞 Σημειώθηκε «Κάλεσα»'+(r.calledAt?' · '+fdt(r.calledAt):'')+' – χωρίς καταγραφή αποτελέσματος')+'</div>';
  h+='<div class="small" style="margin:6px 0">Κλήσεις: <span class="ccount">'+n+'</span>'+(hasOffer(r)?' · 💼 υπάρχει προσφορά':' · χωρίς προσφορά')+'</div>';
  if(r.note)h+='<div class="fnote">📝 '+esc(r.note)+'</div>';
  h+='<div class="actions">'+phoneBtns(c,false)+'</div><div class="row"><button type="button" class="minibtn fopen" data-n="'+esc(c.name)+'">Άνοιγμα κάρτας</button></div></article>'});
 $('calledlist').innerHTML=h}
// ---------- blacklist view ----------
function renderBlack(){var ls=C.filter(function(c){return isBl(c.name)}).sort(function(a,b){return rec(b.name).bl-rec(a.name).bl});
 if(!ls.length){$('blacklist').innerHTML='<div class="empty"><span class="ei">⛔</span><b>Η μαύρη λίστα είναι άδεια</b>Πάτα «⛔ Μαύρη λίστα» σε μια κάρτα για να την κρύψεις από τη Λίστα, τον Χάρτη, τα Αγαπημένα και τα «Κάλεσα». Μπορείς να την επαναφέρεις από εδώ.</div>';return}
 var h='<div class="panel"><h2>⛔ Μαύρη λίστα <span class="small">('+ls.length+')</span></h2><p class="small">Του Λογαριασμού '+esc(ACC)+'. Αυτές οι εταιρείες δεν εμφανίζονται στη Λίστα, στον Χάρτη, στα Αγαπημένα και στα «Κάλεσα». Συγχρονίζονται με την ομάδα.</p></div>';
 ls.forEach(function(c){var r=rec(c.name);
  h+='<article class="fcard blk"><div class="row1"><div class="prio">'+c.prio+'</div><div class="hn"><h2>'+esc(c.name)+'</h2><div class="tags">'+trustB(c)+'<span class="tag flag">⛔ '+fdt(r.bl)+'</span></div></div></div>';
  h+='<div class="fnote">'+(r.blr?'Λόγος: '+esc(r.blr):'Χωρίς λόγο')+'</div>';
  h+='<div class="row"><button type="button" class="minibtn pri blrest" data-n="'+esc(c.name)+'">↩ Επαναφορά</button></div></article>'});
 $('blacklist').innerHTML=h}
// ---------- team view ----------
function pl(n,a,b){return n+' '+(n===1?a:b)}
function renderTeam(){var A=allAcc(),accs=Object.keys(A).filter(function(a){return a===String(ACC)||Object.keys(A[a]).some(function(n){return active(A[a][n])})}).sort(function(a,b){return a-b});
 var h='<div class="panel"><h2>👥 Ομάδα</h2>';
 if(!Sync.url())h+='<p class="small">⚠ Ο κοινός συγχρονισμός δεν έχει ενεργοποιηθεί ακόμη: βλέπεις μόνο τα δικά σου (Λογ. '+esc(ACC)+'). Μόλις ενεργοποιηθεί, εδώ θα φαίνονται οι κλήσεις και οι προσφορές όλων.</p>';
 else h+='<p class="small">Τελευταία ενημέρωση: '+(team.at?fdt(team.at):'—')+'. Ανανεώνεται αυτόματα κάθε λεπτό.</p>';
 h+='<div class="tsum">';accs.forEach(function(a){var calls=0,offers=0,cos=0,favs=0,clc=0,bls=0;Object.keys(A[a]).forEach(function(n){var r=A[a][n];if(!r||!active(r))return;if(r.bl){bls++;return}cos++;if(r.fav)favs++;if(r.called||(r.calls&&r.calls.length))clc++;calls+=(r.calls||[]).length;if(hasOffer(r))offers++});
  h+='<div class="'+(a===String(ACC)?'me':'')+'"><b>Λογαριασμός '+esc(a)+'</b>'+pl(cos,'εταιρεία','εταιρείες')+' · '+favs+' ★ · '+pl(clc,'κλήθηκε','κλήθηκαν')+' · '+pl(calls,'κλήση','κλήσεις')+' · '+pl(offers,'προσφορά','προσφορές')+(bls?' · ⛔ '+bls:'')+'</div>'});
 h+='</div></div>';
 var rows=[];C.forEach(function(c){var acts=[],last=0;accs.forEach(function(a){var r=A[a][c.name];if(!active(r))return;if(!(r.called||(r.calls&&r.calls.length)||hasOffer(r)))return;acts.push({a:a,r:r});last=Math.max(last,r.u||0)});if(acts.length)rows.push({c:c,acts:acts,last:last})});
 rows.sort(function(x,y){return y.last-x.last});
 if(!rows.length)h+='<div class="empty"><span class="ei">👥</span><b>Καμία δραστηριότητα ακόμη</b>Όταν κάποιος σημειώσει «Κάλεσα», καταγράψει κλήση ή προσφορά, θα εμφανιστεί εδώ.</div>';
 rows.forEach(function(x){var c=x.c;h+='<div class="tcomp"><div class="row1"><div class="hn"><h3>'+c.prio+'. '+esc(c.name)+'</h3><div class="tags">'+trustB(c)+'</div></div><button class="minibtn fopen" type="button" data-n="'+esc(c.name)+'">Κάρτα</button></div>';
  x.acts.forEach(function(t){var r=t.r,lc=lastCall(r),o=r.offer||{};
   h+='<div class="tact'+(t.a===String(ACC)?' me':'')+'"><span class="who">Λογαριασμός '+esc(t.a)+'</span>';
   if(r.called)h+=' · κάλεσε'+(r.calledAt?' '+fdt(r.calledAt):'');
   if(r.calls&&r.calls.length)h+=' · '+r.calls.length+' καταγραφ'+(r.calls.length===1?'ή':'ές');
   if(lc)h+='<br><span class="oc oc-'+outL(lc.outcome)[2]+'">'+esc(outL(lc.outcome)[1])+'</span> '+fdt(lc.at)+(lc.notes?' – '+esc(lc.notes):'');
   if(hasOffer(r))h+='<br>💼 '+[o.pct?o.pct+'%':'',o.sqm?o.sqm+' τ.μ.':'',o.units||'',o.months?o.months+' μήνες':'',o.guar?'εγγυητική: '+o.guar:''].filter(Boolean).map(esc).join(' · ');
   h+='</div>'});
  h+='</div>'});
 var bh='';accs.forEach(function(a){var L=Object.keys(A[a]).filter(function(n){var r=A[a][n];return r&&r.bl&&byName(n)});if(L.length)bh+='<div class="tact'+(a===String(ACC)?' me':'')+'"><span class="who">Λογαριασμός '+esc(a)+'</span><br>'+L.map(function(n){var r=A[a][n];return '⛔ '+esc(n)+(r.blr?' – '+esc(r.blr):'')}).join('<br>')+'</div>'});
 if(bh)h+='<div class="tcomp"><h3>⛔ Μαύρες λίστες</h3>'+bh+'</div>';
 $('teamview').innerHTML=h}
// ---------- views ----------
var cur='list',VIEWS=['list','fav','called','team','map','compare','black','menu'];
function show(v){if(VIEWS.indexOf(v)<0)v='list';cur=v;VIEWS.forEach(function(x){$('v-'+x).hidden=(x!==v)});document.body.setAttribute('data-view',v);
 document.querySelectorAll('#tabs a').forEach(function(a){var on=a.dataset.v===v||(v==='compare'&&a.dataset.v==='menu');a.classList.toggle('on',on);if(on)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
 if(v==='list'&&listStale){listStale=false;render()}if(v==='map')initMap();if(v==='compare')renderCompare();if(v==='fav')renderFav();if(v==='called')renderCalled();if(v==='black')renderBlack();if(v==='team')renderTeam();if(v==='menu')renderMenu();
 if(location.hash!=='#'+v)history.replaceState(null,'','#'+v);window.scrollTo(0,0)}
$('tabs').addEventListener('click',function(e){var a=e.target.closest('a');if(!a)return;e.preventDefault();if(a.dataset.v===cur&&cur==='list'){window.scrollTo({top:0,behavior:'smooth'});return}show(a.dataset.v)});
window.addEventListener('hashchange',function(){var v=location.hash.slice(1);if(v&&v!==cur)show(v)});
// ---------- map ----------
var map=null,mapReady=false,layer=null,offLayer=null,ringLayer=null,leafletLoading=false;
var TC={'Υψηλή':'#1E8E3E','Μέτρια':'#B86E00','Άγνωστη':'#5F6B7A','Χαμηλή':'#D93025'};
function loadLeaflet(cb){if(window.L)return cb();if(leafletLoading)return;leafletLoading=true;$('mapstat').textContent='Φόρτωση χάρτη…';
 var l=document.createElement('link');l.rel='stylesheet';l.href='vendor/leaflet/leaflet.css?v=1.9.4';document.head.appendChild(l);
 var s=document.createElement('script');s.src='vendor/leaflet/leaflet.js?v=1.9.4';s.onload=function(){leafletLoading=false;cb()};s.onerror=function(){leafletLoading=false;$('mapstat').textContent='Ο χάρτης δεν φόρτωσε (χρειάζεται σύνδεση).'};document.head.appendChild(s)}
function popup(c,p,isOff){var ph=c.phones[0];
 return '<div class="pop"><b>'+esc(c.name)+'</b> '+trustB(c)+'<br>'+(isOff?'🏢 Γραφείο: ':'📍 ')+esc(p.label)+(isOff?'':'<br>Έτος: '+esc(p.year||'έτος: άγνωστο'))+'<br><span class="small">'+(p.lvl==='exact'?'Θέση: ακριβής διεύθυνση':'≈ Θέση κατά προσέγγιση (επίπεδο οδού)')+(p.km!=null?' · '+km(p.km)+' από το οικόπεδο':'')+'</span>'+
  '<div class="pb">'+star(c.name,'pf')+(ph?'<a class="call" href="tel:'+esc(ph.tel)+'">📞 Κλήση</a>':'')+'<button class="open" type="button" data-n="'+esc(c.name)+'">Άνοιγμα κάρτας</button></div></div>'}
function initMap(){if(map){setTimeout(function(){map.invalidateSize()},60);return}
 loadLeaflet(function(){if(map)return;
  map=L.map('map',{tap:true}).setView([PLOT.lat,PLOT.lon],13);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  var pi=L.divIcon({className:'plotm',html:'🏠',iconSize:[30,30],iconAnchor:[15,26]});
  L.marker([PLOT.lat,PLOT.lon],{icon:pi,zIndexOffset:1000,title:'Το οικόπεδό μου'}).addTo(map).bindPopup('<div class="pop"><b>Το οικόπεδό μου – Μαγνησίας 49</b><br>Αιγάλεω'+(PLOT.lvl==='exact'?'':'<br><span class="small">≈ θέση κατά προσέγγιση (επίπεδο οδού)</span>')+'</div>');
  ringLayer=L.layerGroup([L.circle([PLOT.lat,PLOT.lon],{radius:1000,color:'#D93025',weight:1,dashArray:'4 4',fill:false,interactive:false}),L.circle([PLOT.lat,PLOT.lon],{radius:3000,color:'#D93025',weight:1,dashArray:'4 4',fill:false,interactive:false})]).addTo(map);
  layer=L.layerGroup().addTo(map);offLayer=L.layerGroup();
  ['m-off','m-ap','m-ring','m-fav'].forEach(function(id){$(id).addEventListener('change',drawMarkers)});
  mapReady=true;drawMarkers();if(pendingFocus){var f=pendingFocus;pendingFocus=null;focusCompany(f)}setTimeout(function(){map.invalidateSize()},80)})}
function drawMarkers(){if(!map)return;layer.clearLayers();offLayer.clearLayers();var n=0,na=0;
 var showAp=$('m-ap').checked,onlyFav=$('m-fav').checked;
 C.forEach(function(c){if(!passes(c))return;if(onlyFav&&!isFav(c.name))return;var col=TC[c.trust];
  c.pins.forEach(function(p){if(p.lat==null)return;var ap=p.lvl!=='exact';if(ap&&!showAp)return;
   L.circleMarker([p.lat,p.lon],{radius:ap?7:8,color:col,weight:2,dashArray:ap?'3 3':null,fillColor:col,fillOpacity:ap?0.18:0.85}).bindPopup(popup(c,p,false)).addTo(layer);n++;if(ap)na++});
  c.offices.forEach(function(o){if(o.lat==null)return;L.marker([o.lat,o.lon],{icon:L.divIcon({className:'offm',html:'<span style="color:'+col+'">■</span>',iconSize:[14,14]})}).bindPopup(popup(c,o,true)).addTo(offLayer)})});
 if($('m-off').checked)offLayer.addTo(map);else map.removeLayer(offLayer);
 if($('m-ring').checked)ringLayer.addTo(map);else map.removeLayer(ringLayer);
 $('mapstat').textContent=n+' σημεία έργων'+(na?' ('+na+' κατά προσέγγιση)':'')+(F.only?' · μόνο '+F.only:'')+(onlyFav?' · μόνο αγαπημένα ('+favCount()+')':'')+' · '+DATA.geo.excluded+' τοποθεσίες δεν μπήκαν (πολύ γενικές ή αβέβαιες).'}
var pendingFocus=null;
function focusCompany(c){if(!c)return;F.only=c.name;render();if(!map){pendingFocus=c;return}var pts=[];c.pins.forEach(function(p){if(p.lat!=null)pts.push([p.lat,p.lon])});c.offices.forEach(function(o){if(o.lat!=null)pts.push([o.lat,o.lon])});pts.push([PLOT.lat,PLOT.lon]);map.fitBounds(pts,{padding:[30,30],maxZoom:15})}
// ---------- compare ----------
function num(v){var x=parseFloat(String(v).replace(',','.'));return isNaN(x)?null:x}
function renderCompare(){var A=allAcc(),cols=[];
 C.forEach(function(c){Object.keys(A).sort(function(a,b){return a-b}).forEach(function(a){var r=A[a][c.name];if(hasOffer(r))cols.push({c:c,a:a,o:r.offer})})});
 if(!cols.length){$('cmp').innerHTML='<div class="empty" style="box-shadow:none"><span class="ei">💼</span><b>Καμία προσφορά ακόμη</b>Άνοιξε «💼 Προσφορά» σε μια κάρτα και συμπλήρωσε τα πεδία.</div>';return}
 var h='<div class="cmpwrap"><table class="cmp"><thead><tr><th>Πεδίο</th>'+cols.map(function(x){return '<th>'+star(x.c.name,'sm')+' '+x.c.prio+'. '+esc(x.c.name)+'<br><span style="font-weight:400;opacity:.8">Λογαριασμός '+esc(x.a)+'</span></th>'}).join('')+'</tr></thead><tbody>';
 OF.forEach(function(f){var vals=cols.map(function(x){var v=x.o[f.k];return v==null?'':String(v)});var best=null;
  if(f.best==='max'||f.best==='min'){var ns=vals.map(num).filter(function(x){return x!=null});if(ns.length>=2)best=f.best==='max'?Math.max.apply(null,ns):Math.min.apply(null,ns)}
  var filled=vals.filter(function(x){return x}).length;
  var isBest=function(v){if(best!=null)return num(v)===best;if(f.best==='yes')return v==='ναι'&&filled>=2&&vals.some(function(x){return x&&x!=='ναι'});if(f.best==='builder')return v==='ο κατασκευαστής'&&filled>=2&&vals.some(function(x){return x&&x!=='ο κατασκευαστής'});return false};
  h+='<tr><td>'+esc(f.l)+'</td>'+vals.map(function(v){return '<td'+(v&&isBest(v)?' class="best"':'')+'>'+(v?esc(v)+(f.k==='pct'?'%':''):'<span class="small">—</span>')+'</td>'}).join('')+'</tr>'});
 h+='<tr><td>Εμπιστοσύνη</td>'+cols.map(function(x){return '<td>'+trustB(x.c)+'</td>'}).join('')+'</tr>';
 h+='<tr><td>Πλησιέστερο έργο</td>'+cols.map(function(x){return '<td>'+(x.c.near?(x.c.near.lvl==='exact'?'':'≈ ')+km(x.c.near.km):'—')+'</td>'}).join('')+'</tr></tbody></table></div><p class="small">Υψηλότερο = καλύτερο, εκτός από τον χρόνο παράδοσης.</p>';
 $('cmp').innerHTML=h}
// ---------- sync ----------
var Sync=(function(){
 var busy=false,again=false,t=null,state='local',last=0,err='';
 function url(){return (lsGet('kat5_url','')||CFG.SYNC_URL||'').trim()}
 function pending(){return Object.keys(dirty).length}
 function chip(){var el=$('syncchip');if(!el)return;var p=pending(),cls,txt;
  if(!url()){cls='local';txt='τοπική αποθήκευση'}
  else if(state==='busy'){cls='busy';txt='συγχρονισμός…'}
  else if(state==='off'){cls='off';txt='εκτός σύνδεσης'+(p?' · '+p+' σε αναμονή':'')}
  else if(state==='err'){cls='err';txt='σφάλμα'+(p?' · '+p+' σε αναμονή':'')}
  else if(state==='ok'){cls=p?'busy':'ok';txt=p?p+' σε αναμονή':'✓ συγχρονισμένο '+ftime(last)}
  else{cls='busy';txt=p?p+' σε αναμονή':'σύνδεση…'}
  el.className='sc sc-'+cls;el.textContent=txt;var st=$('syncstat');if(st)st.textContent=txt+(err&&state==='err'?' ('+err+')':'')}
 function req(u,opt){var ac=window.AbortController?new AbortController():null;var to=setTimeout(function(){if(ac)ac.abort()},20000);if(ac)opt.signal=ac.signal;
  return fetch(u,opt).then(function(r){clearTimeout(to);if(!r.ok)throw new Error('HTTP '+r.status);return r.json()},function(e){clearTimeout(to);throw e})}
 async function run(){var u=url();if(!u){state='local';chip();return false}
  if(busy){again=true;return}busy=true;state='busy';chip();
  try{var names=Object.keys(dirty),j;
   if(names.length){var send={};names.forEach(function(n){if(recs[n])send[n]=recs[n]});
    j=await req(u,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({k:CFG.KEY,a:ACC,recs:send}),redirect:'follow'})}
   else j=await req(u+(u.indexOf('?')<0?'?':'&')+'k='+encodeURIComponent(CFG.KEY)+'&_='+Date.now(),{method:'GET',cache:'no-store',redirect:'follow'});
   if(!j||!j.ok)throw new Error((j&&j.err)||'απάντηση');
   team={accounts:j.accounts||{},at:Date.now()};lsSet('kat5_team',team);
   var mine=(j.accounts||{})[String(ACC)]||{},changed=false;
   Object.keys(mine).forEach(function(n){var s=mine[n],l=recs[n];if(!l||(s.u||0)>(l.u||0)){recs[n]=s;delete dirty[n];changed=true}});
   names.forEach(function(n){var s=mine[n];if(s&&recs[n]&&(s.u||0)>=(recs[n].u||0))delete dirty[n]});
   persist();state='ok';last=Date.now();err='';
   if(!editing())refresh();else updStats();
   return true}
  catch(e){state=navigator.onLine===false?'off':'err';err=e&&e.message||'';return false}
  finally{busy=false;chip();if(again){again=false;soon()}}}
 function soon(){chip();if(!url())return;clearTimeout(t);t=setTimeout(run,1200)}
 return {run:run,soon:soon,url:url,chip:chip,pending:pending,setUrl:function(v){lsSet('kat5_url',v||'');chip()}}})();
function editing(){var a=document.activeElement;return a&&a.closest&&a.closest('#cards')&&/INPUT|TEXTAREA|SELECT/.test(a.tagName)}
function refresh(){if(cur==='list')render();else{updStats();if(cur==='fav')renderFav();if(cur==='called')renderCalled();if(cur==='black')renderBlack();if(cur==='team')renderTeam();if(cur==='compare')renderCompare();if(cur==='map'&&mapReady)drawMarkers();listStale=true}}
var listStale=false;
window.addEventListener('online',function(){Sync.soon()});window.addEventListener('offline',function(){Sync.chip()});
document.addEventListener('visibilitychange',function(){if(!document.hidden&&ACC)Sync.soon()});
setInterval(function(){if(!document.hidden&&ACC&&Sync.url())Sync.run()},60000);
// ---------- menu ----------
function download(name,text){var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1500)}
function renderMenu(){var u=Sync.url(),h='<h2>Συγχρονισμός & δεδομένα</h2>';
 h+='<p class="small">Λογαριασμός <b>'+esc(ACC)+'</b> σε αυτή τη συσκευή. Όλα αποθηκεύονται αμέσως στη συσκευή'+(u?' και συγχρονίζονται με το κοινό Google Sheet της ομάδας.':'. <b>Ο κοινός συγχρονισμός δεν έχει ενεργοποιηθεί</b> – δες τις οδηγίες παρακάτω.')+'</p>';
 h+='<div class="row"><button class="minibtn pri" id="snow" type="button">⟳ Συγχρονισμός τώρα</button><button class="minibtn" id="sswitch" type="button">Αλλαγή λογαριασμού</button></div><div id="syncstat" class="small"></div>';
 h+='<h2 style="margin-top:16px">Αντίγραφο ασφαλείας (JSON)</h2><div class="row"><button class="minibtn" id="sexp" type="button">⬇︎ Εξαγωγή</button><label class="minibtn" style="display:inline-flex;align-items:center">⬆︎ Εισαγωγή<input type="file" id="simp" accept="application/json,.json" hidden></label></div><p class="small">Η εισαγωγή συγχωνεύει στον τρέχοντα λογαριασμό (κρατά την πιο πρόσφατη αλλαγή ανά εταιρεία).</p>';
 h+='<details class="offer"><summary>'+(u?'Ρυθμίσεις συγχρονισμού (για διαχειριστή)':'Ρύθμιση κοινού συγχρονισμού (μία φορά)')+'</summary><div style="padding:0 12px 12px"><ol class="small" style="padding-left:18px"><li>Άνοιξε το Google Sheet «'+esc(DATA.sheetName)+'» (<a href="'+esc(DATA.sheetUrl)+'" target="_blank" rel="noopener">άνοιγμα</a>) → Επεκτάσεις → Apps Script.</li><li>Σβήσε ό,τι υπάρχει, επικόλλησε τον κώδικα (κουμπί «Αντιγραφή κώδικα») και πάτα Αποθήκευση.</li><li>Ανάπτυξη → Νέα ανάπτυξη → Εφαρμογή ιστού · Εκτέλεση ως: Εγώ · Πρόσβαση: Οποιοσδήποτε → Ανάπτυξη → έγκριση.</li><li>Στείλε τη διεύθυνση /exec για να ενσωματωθεί στη σελίδα (ή επικόλλησέ την εδώ σε κάθε συσκευή).</li></ol>';
 h+='<label class="small" for="surl">Διεύθυνση /exec (προαιρετικό σε αυτή τη συσκευή)</label><input type="url" id="surl" placeholder="https://script.google.com/macros/s/…/exec" value="'+esc(lsGet('kat5_url',''))+'"><div class="row"><button class="minibtn" id="ssave" type="button">Αποθήκευση</button><button class="minibtn" id="scopy" type="button">Αντιγραφή κώδικα</button></div><pre class="code">'+esc(DATA.gas)+'</pre></div></details>';
 $('syncbox').innerHTML=h;Sync.chip();
 $('snow').onclick=function(){if(!Sync.url()){toast('Ο κοινός συγχρονισμός δεν έχει ενεργοποιηθεί');return}Sync.run()};
 $('sswitch').onclick=function(){askAcct(true)};
 $('ssave').onclick=function(){Sync.setUrl($('surl').value.trim());Sync.run();toast('Αποθηκεύτηκε')};
 $('scopy').onclick=function(){if(navigator.clipboard)navigator.clipboard.writeText(DATA.gas).then(function(){toast('✓ Ο κώδικας αντιγράφηκε')})};
 $('sexp').onclick=function(){download('kataskeuastes-logariasmos-'+ACC+'-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify({v:5,account:ACC,exported:new Date().toISOString(),recs:recs},null,1))};
 $('simp').onchange=function(e){var f=e.target.files[0];if(!f)return;f.text().then(function(t){var j=JSON.parse(t),src=j.recs||j.store||{},k=0;Object.keys(src).forEach(function(n){var s=src[n];if(!byName(n)||!s)return;var l=recs[n];if(!l||(s.u||0)>(l.u||0)){recs[n]=s;dirty[n]=1;k++}});persist();refresh();Sync.soon();toast(k?'✓ Εισήχθησαν '+k+' εταιρείες':'Δεν υπήρχαν νεότερα στοιχεία')}).catch(function(){toast('Μη έγκυρο αρχείο')})};
 $('checks').innerHTML='<h2>Έλεγχος εγκυρότητας</h2>'+DATA.checks}
// ---------- accounts ----------
function askAcct(sw){var L=$('login');L.hidden=false;$('lerr').textContent='';$('lcancel').hidden=!sw||!ACC;var i=$('lnum');i.value=sw?'':(ACC||'');setTimeout(function(){i.focus()},50)}
$('lcancel').onclick=function(){$('login').hidden=true};
$('acctbtn').onclick=function(){askAcct(true)};
$('loginf').addEventListener('submit',async function(e){e.preventDefault();var v=$('lnum').value.trim();var n=parseInt(v,10);
 if(!/^\d{1,3}$/.test(v)||!(n>=1&&n<=999)){$('lerr').textContent='Γράψε έναν αριθμό από 1 έως 999.';return}
 if(ACC&&n!==ACC&&Sync.pending()&&Sync.url()){await Sync.run()}
 login(n)});
function login(n){lsSet('kat5_acct',n);loadAcct(n);migrateV4();$('acctn').textContent=n;$('login').hidden=true;UI={offer:{},more:{},log:{},bl:{}};F.only='';render();show(cur);Sync.chip();if(Sync.url())Sync.run();toast('Λογαριασμός '+n)}
function migrateV4(){if(localStorage.getItem('kat5_migrated'))return;var old=lsGet('kat_aigaleo_v1',null);if(!old||!Object.keys(old).length){try{localStorage.setItem('kat5_migrated','none')}catch(e){}return}
 var k=0;Object.keys(old).forEach(function(n){var o=old[n];if(!byName(n)||!o)return;var r=recs[n]||(recs[n]={});
  if(o.called){r.called=true;r.calledAt=r.calledAt||o.u||Date.now()}if(o.note)r.note=o.note;if(o.offer&&hasOffer(o))r.offer=o.offer;if(o.fav)r.fav=true;r.u=Date.now();dirty[n]=1;k++});
 persist();try{localStorage.setItem('kat5_migrated',String(ACC))}catch(e){}if(k)setTimeout(function(){toast('Μεταφέρθηκαν '+k+' εταιρείες από την προηγούμενη έκδοση')},2800)}
// ---------- start ----------
var saved=parseInt(lsGet('kat5_acct',0),10);
var h0=location.hash.slice(1);cur=VIEWS.indexOf(h0)>=0?h0:'list';
if(saved>=1){loadAcct(saved);migrateV4();$('acctn').textContent=saved;render();show(cur);if(Sync.url())Sync.run();else Sync.chip()}
else{document.body.setAttribute('data-view',cur);askAcct(false)}
var bt=$('boot');bt.classList.add('gone');setTimeout(function(){bt.remove()},300);
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js?v=10').catch(function(){});
window.__app={recs:function(){return recs},dirty:function(){return dirty},team:function(){return team},acc:function(){return ACC},sync:Sync,show:show,F:F,render:render,login:login};
})();
