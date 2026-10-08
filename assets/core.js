
var AS_AT_ISO = '2026-10-07', AS_AT = new Date(AS_AT_ISO);
// Sample outstanding lines. rec = qty received so far (line level, partial supported).
// ch = last chase logged against the line (shared across the site, so two people don't ring the same dealer).
var LINES = [
  {s:'Castle Hill Toyota', site:'Parramatta', part:'Door Skin RH', kind:'OEM', no:'90481', po:'PO-70512', job:'39037', veh:'Toyota Camry', ord:'2026-09-24', req:'2026-10-01', eta:'2026-10-03', q:1, rec:0, ch:{on:'2026-10-05', how:'Phone', by:'Sam'}},
  {s:'Castle Hill Toyota', site:'Parramatta', part:'Boot Lid', kind:'OEM', no:'5211912948', po:'PO-70533', job:'35713', veh:'Mazda CX-5', ord:'2026-09-29', req:'2026-10-06', eta:'2026-10-08', q:1, rec:0},
  {s:'Castle Hill Toyota', site:'Parramatta', part:'Boot Lid Emblem', kind:'OEM', delayed:'2026-10-14', no:'7530112380', po:'PO-70533', job:'35713', veh:'Mazda CX-5', ord:'2026-09-29', req:'2026-10-06', eta:'2026-10-14', q:1, rec:0},
  {s:'SD Parts', site:'Parramatta', part:'Beaver Panel', kind:'Aftermarket', no:'P1', po:'PO-70519', job:'39037', veh:'Toyota Camry', ord:'2026-09-24', req:'2026-10-01', eta:null, q:1, rec:0},
  {s:'West End Parts', site:'Parramatta', part:'ADAS Calibration Bracket', kind:'OEM', delayed:'2026-10-09', no:'2995764', po:'PO-70524', job:'39037', veh:'Toyota Camry', ord:'2026-09-26', req:'2026-10-01', eta:'2026-10-09', q:10, rec:6},
  {s:'West End Parts', site:'Parramatta', part:'Door Badge', kind:'OEM', no:'447', po:'PO-70561', job:'59057', veh:'Ford Ranger', ord:'2026-10-02', req:'2026-10-09', eta:null, q:1, rec:0},
  {s:'Penrith Auto Spares', site:'Penrith', part:'Headlamp LH', kind:'OEM', no:'81150-02A40', po:'PO-70588', job:'41220', veh:'Hyundai i30', ord:'2026-09-18', req:'2026-09-25', eta:'2026-09-30', q:1, rec:0, ch:{on:'2026-10-07', how:'Message', by:'Alex'}},
  {s:'Penrith Auto Spares', site:'Penrith', part:'Front Guard LH', kind:'Aftermarket', no:'FG-4410L', po:'PO-70588', job:'41220', veh:'Hyundai i30', ord:'2026-09-18', req:'2026-09-25', eta:null, q:1, rec:0, ch:{on:'2026-10-07', how:'Message', by:'Alex'}},
  {s:'SD Parts', site:'Penrith', part:'Radiator Support', kind:'Aftermarket', no:'RS-7782', po:'PO-70590', job:'41233', veh:'Kia Cerato', ord:'2026-09-30', req:'2026-10-05', eta:null, q:1, rec:0}
];
var JOBS = {'39037':{rego:'CQR-472',claim:'CLM-108455'},'35713':{rego:'MZC-522',claim:'CLM-518034'},'59057':{rego:'EXR-551',claim:'CLM-331907'},'41220':{rego:'HTC-210',claim:'CLM-440192'},'41233':{rego:'KRC-318',claim:'CLM-290817'}};
var SUP = {
  'Castle Hill Toyota': {ph:'02 5550 0142', em:'parts@castlehilltoyota.example'},
  'SD Parts':           {ph:'02 5550 0177', em:'orders@sdparts.example'},
  'West End Parts':     {ph:'02 5550 0119', em:'sales@westendparts.example'},
  'Penrith Auto Spares':{ph:'02 5550 0163', em:'counter@penrithautospares.example'}
};
var EXCLUDED = [
  {s:'Castle Hill Toyota', part:"Front Bar Emblem 'Toyota'", no:'7530112380', job:'39037', why:'Credited', ord:'2026-09-24'},
  {s:'SD Parts', part:'Bonnet Clip (x2)', no:'9046709172', job:'39037', why:'Cancelled', ord:'2026-09-24'}
];
var NLA = [
  {s:'West End Parts', part:'Rear Spoiler', no:'8821004', job:'59057', veh:'Ford Ranger', ord:'2026-10-02'}
];

var mode = 'none', chip = 'all', sortK = 'status', sortDir = -1;
function $(id){return document.getElementById(id);}
function d(iso){return new Date(iso+'T00:00:00');}
function fmt(iso){return d(iso).toLocaleDateString('en-AU',{day:'numeric',month:'short'});}
function fmtL(iso){return d(iso).toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'});}
function days(iso){return Math.round((AS_AT - d(iso))/86400000);}
function out(l){return l.q - l.rec;}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function plural(n,w){return n+' '+w+(n===1?'':'s');}
function uniq(a){return a.filter(function(x,i){return a.indexOf(x)===i;});}

// Days past the date the supplier promised (their ETA), or the requested delivery date if there is no ETA yet. Negative = not due yet.
function late(l){return days(l.eta||l.req);}
function status(l){
  var n = late(l);
  if(n>0) return {t:plural(n,'day')+' overdue', c:n>=7?'bad':'warn'};
  if(n===0) return {t:'Due today', c:'warn'};
  return {t:'Due in '+plural(-n,'day'), c:'info'};
}
function pill(l){var s=status(l);return '<span class="lgc-status '+s.c+'">'+s.t+'</span>';}
function etaText(l){
  var h = l.delayed ? '<span class="pcx-eta-d">Delayed to '+fmt(l.delayed)+'</span>' : (l.eta ? fmt(l.eta) : '<span class="lgc-status warn">No ETA</span>');
  var n=latestNote(l), i=LINES.indexOf(l);
  return h + (n ? '<div class="pcx-sm pcx-nt"><a href="#" data-note="'+i+'" title="'+esc(n.text)+'">&ldquo;'+esc(n.text)+'&rdquo;</a></div>'
                : '<div class="pcx-sm"><a href="#" data-note="'+i+'" class="pcx-notelnk">Add note</a></div>');
}
function etaPlain(l){return l.delayed?('Delayed to '+fmt(l.delayed)):(l.eta?fmt(l.eta):'No ETA');}
function chasedText(l){
  if(!l.ch) return '<span class="pcx-ch-n">Never</span>';
  var n = days(l.ch.on), when = n===0?'<span class="pcx-ch-t">Today</span>':(n===1?'Yesterday':n+' days ago');
  return when+' &middot; '+esc(l.ch.how)+'<div class="pcx-sm">by '+esc(l.ch.by)+'</div>';
}
function chasedPlain(l){
  if(!l.ch) return 'Never';
  var n = days(l.ch.on);
  return (n===0?'Today':(n===1?'Yesterday':n+' days ago'))+' ('+l.ch.how+', '+l.ch.by+')';
}

function sortVal(l,k){
  if(k==='part') return l.part.toLowerCase();
  if(k==='sup') return l.s.toLowerCase();
  if(k==='eta') return l.eta||'9999-99-99';
  if(k==='ch') return l.ch?l.ch.on:'0000-00-00';
  return late(l);
}
function sorted(ls){
  return ls.slice().sort(function(a,b){
    var x=sortVal(a,sortK), y=sortVal(b,sortK), c=(x<y?-1:(x>y?1:0))*sortDir;
    if(c) return c;
    return (late(b)-late(a)) || a.s.localeCompare(b.s) || a.part.localeCompare(b.part);
  });
}

// ---- chase action -----------------------------------------------------
// One supplier at a time. Lists that supplier's lines under the current filters; the line you clicked is
// included along with the rest, so a dealer gets one message about everything late, not three.
function openChase(sup, clicked){
  var set=sorted(window.pcxSet(sup));
  var info=SUP[sup], root=$('modalRoot');
  function me(l){return l.po+' · '+l.part+' ('+l.no+') · Job '+l.job+' '+l.veh;}
  function picked(){return set.filter(function(l,i){var c=root.querySelector('[data-pick="'+i+'"]');return c&&c.checked;});}
  function msg(){
    var ps=picked();
    return 'Hi '+sup+' team,\n\nCould you please confirm ETA on the outstanding parts below?\n\n'+
      ps.map(function(l){return '- '+l.part+' ('+l.no+'), Job '+l.job+' '+l.veh+', '+l.po+', '+out(l)+' outstanding, '+status(l).t.toLowerCase();}).join('\n')+
      '\n\nThanks,\nUnited Hail Repairs';
  }
  var recent=set.filter(function(l){return l.ch && days(l.ch.on)<=1;})[0];
  root.innerHTML='<div class="modal-backdrop pcx-modal" id="mb"><div class="modal" role="dialog" aria-modal="true" aria-label="Chase '+esc(sup)+'">'+
    '<div class="modal-h"><h3>Chase '+esc(sup)+'</h3><button class="modal-x" aria-label="Close" id="mx">&#10005;</button></div>'+
    '<div class="modal-b">'+
      (recent?'<div class="alert">Already chased '+(days(recent.ch.on)===0?'today':'yesterday')+' by '+esc(recent.ch.by)+' ('+esc(recent.ch.how.toLowerCase())+'). Check with them before ringing again.</div>':'')+
      '<div class="contact"><b>Ph <a href="tel:'+info.ph.replace(/ /g,'')+'">'+info.ph+'</a></b> &middot; '+esc(info.em)+'</div>'+
      set.map(function(l,i){return '<label class="ln checkbox"><input type="checkbox" data-pick="'+i+'" checked><span class="tx"><b>'+esc(l.part)+'</b> <span class="pcx-sm" style="display:inline;">'+esc(l.po)+' &middot; Job '+l.job+' '+esc(l.veh)+'</span></span>'+pill(l)+'</label>';}).join('')+
      '<div style="margin-top:12px;font-weight:700;">Message</div><textarea class="textarea" id="chMsg"></textarea>'+
      '<div style="margin-top:12px;font-weight:700;">Note on the ETA <span class="pcx-note">(optional, saved against these parts)</span></div><input class="input" id="chNote" style="width:100%;box-sizing:border-box;margin-top:6px;" placeholder="e.g. Dave says truck is Thursday, will confirm">'+
    '</div>'+
    '<div class="modal-f"><button class="btn" id="mPhone">Log phone call</button><button class="btn" id="mEmail">Email</button><button class="btn btn-primary" id="mMsg">Send via PartsCheck</button></div>'+
  '</div></div>';
  var ta=$('chMsg'); ta.value=msg();
  function close(){root.innerHTML='';document.removeEventListener('keydown',esc_);}
  function esc_(e){if(e.key==='Escape')close();}
  document.addEventListener('keydown',esc_);
  $('mx').onclick=close;
  $('mb').onclick=function(e){if(e.target===$('mb'))close();};
  root.querySelectorAll('[data-pick]').forEach(function(c){c.onchange=function(){ta.value=msg();};});
  function log(how,verb){
    var ps=picked(); if(!ps.length){toast('Nothing selected','Tick at least one part to chase.');return false;}
    var nt=($('chNote')||{}).value||''; ps.forEach(function(l){logEntry(l,how,nt.trim());});
    close(); window.pcxRender();
    toast('Chase logged','You '+verb+' '+sup+' about '+plural(ps.length,'part')+'. Shows under Last chased so nobody rings them twice.');
    return ps;
  }
  $('mPhone').onclick=function(){log('Phone','rang');};
  $('mMsg').onclick=function(){log('Message','messaged');};
  $('mEmail').onclick=function(){
    var body=ta.value, ps=log('Email','emailed'); if(!ps) return;
    window.location.href='mailto:'+info.em+'?subject='+encodeURIComponent('Outstanding parts, ETA please')+'&body='+encodeURIComponent(body);
  };
}

function printHTML(ls){
  var byJob = mode==='job', stamp=AS_AT.toLocaleDateString('en-AU',{day:'numeric',month:'numeric',year:'numeric'})+' 9:30 am';
  var cols = [['Part',byJob?24:26],[byJob?'Supplier':'Job',byJob?18:18],['PO',11],['Out.',6],['Status',15],['Supplier ETA',12],['Last chased',14]];
  var tot=cols.reduce(function(a,c){return a+c[1];},0);
  var cg='<colgroup>'+cols.map(function(c){return '<col style="width:'+(c[1]/tot*100).toFixed(1)+'%">';}).join('')+'</colgroup>';
  var h='<div class="rh">PartsCheck Pty Ltd</div><div class="rt">Chase List Report</div><div class="rm"><span>'+stamp+'</span><span>1 - 1</span></div>';
  var rows=sorted(ls), key=byJob?'job':'s';
  uniq(rows.map(function(l){return l[key];})).forEach(function(g){
    var gl=rows.filter(function(l){return l[key]===g;});
    h+='<div class="pgh"><span style="font-size:14px;font-weight:700;">'+(byJob?'Job '+esc(g)+' <span style="font-weight:400;">'+esc(gl[0].veh)+'</span>':esc(g))+'</span><span>'+(byJob?'':'Ph '+SUP[g].ph)+'</span></div>';
    h+='<table>'+cg+'<thead class="ch"><tr>'+cols.map(function(c,i){return '<th'+(i===3?' class="n"':'')+'>'+c[0]+'</th>';}).join('')+'</tr></thead><tbody>';
    gl.forEach(function(l,i){
      h+='<tr'+(i%2?' class="z"':'')+'><td>'+esc(l.part)+'<small>'+esc(l.no)+' &middot; '+esc(l.kind)+'</small></td>'+
        '<td>'+(byJob?esc(l.s)+'<small>Ph '+SUP[l.s].ph+'</small>':'Job '+l.job+'<small>'+esc(l.veh)+'</small>')+'</td>'+
        '<td>'+esc(l.po)+'</td><td class="n">'+out(l)+'</td><td>'+status(l).t+'</td><td>'+etaPlain(l)+'</td><td>'+(l.ch?chasedPlain(l).replace(/ \(.*/,'')+'<small>'+esc(l.ch.how)+', '+esc(l.ch.by)+'</small>':'&nbsp;')+'</td></tr>';
    });
    h+='</tbody></table>';
  });
  h+='<div class="pft"><span>Outstanding as at '+fmt(AS_AT_ISO)+'</span><span>Outstanding lines only; credited, cancelled and NLA lines excluded</span></div>';
  return h;
}

function exportCsv(ls){
  if(!ls.length){toast('Nothing to export','Nothing matches the current filters.');return;}
  var rows=[['Supplier','Supplier Phone','Site','Part','Part Nr','Type','Job','Vehicle','PO','Qty Outstanding','Order Date','Requested Delivery','Status','Supplier ETA','Last Chased','Latest Note']];
  sorted(ls).forEach(function(l){rows.push([l.s,SUP[l.s].ph,l.site,l.part,l.no,l.kind,l.job,l.veh,l.po,out(l),l.ord,l.req,status(l).t,etaPlain(l),chasedPlain(l),(latestNote(l)||{text:''}).text]);});
  var csv=rows.map(function(r){return r.map(function(c){return '"'+String(c).replace(/"/g,'""')+'"';}).join(',');}).join('\n');
  var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='parts-chase-list.csv';a.click();
}
function openPrint(ls){
  if(!ls.length){toast('Nothing to print','Nothing matches the current filters.');return;}
  $('sheet').innerHTML=printHTML(ls);$('app').hidden=true;$('printSection').hidden=false;
}
$('closePrint').onclick=function(){$('printSection').hidden=true;$('app').hidden=false;};

function jobLink(l){return '<a class="pcx-link" href="#job-'+l.job+'" title="Open job '+l.job+'" onclick="return jobOpen(\''+l.job+'\');">Job '+l.job+'</a>';}
function jobOpen(j){toast('Job '+j,'Prototype: opens the job in the quoting package.');return false;}
function poOpen(po){toast('Order '+po,'Prototype: opens the order page (parts, receive, credit, ETA).');return false;}
function toast(t,m){var e=document.createElement('div');e.className='toast ok';e.innerHTML='<div><div class="tt">'+esc(t)+'</div><div class="tm">'+esc(m)+'</div></div><button class="toast-x" aria-label="Dismiss">&#10005;</button>';e.querySelector('.toast-x').onclick=function(){e.remove();};$('toasts').appendChild(e);setTimeout(function(){e.remove();},4500);}

// ---- notes + comms log -------------------------------------------------
function logEntry(l,how,text){
  l.log=l.log||[]; l.log.unshift({on:AS_AT_ISO,how:how,by:'You',text:text||''});
  if(how!=='Note') l.ch={on:AS_AT_ISO,how:how,by:'You'};
}
function latestNote(l){return (l.log||[]).filter(function(x){return x.text;})[0]||null;}
// seed a little history for the sample data
(function(){
  LINES.forEach(function(l){ if(l.ch) l.log=[{on:l.ch.on,how:l.ch.how,by:l.ch.by,text:''}]; });
  LINES[0].log[0].text='Spoke to Dave, truck due Friday. Will confirm Thursday arvo.';
  LINES[5].log=[{on:'2026-10-03',how:'Note',by:'Sam',text:'Dealer says part is on back order, no date yet.'}];
})();
function openNote(i){
  var l=LINES[i], root=$('modalRoot');
  function row(e){
    var what=e.text||(e.how==='Phone'?'Phone call logged':(e.how==='Note'?'':'Message sent'));
    return '<div class="ln"><span class="tx"><b>'+fmt(e.on)+' &middot; '+esc(e.how)+'</b> <span class="pcx-sm" style="display:inline;">by '+esc(e.by)+'</span>'+(what?'<div>'+esc(what)+'</div>':'')+'</span></div>';
  }
  root.innerHTML='<div class="modal-backdrop pcx-modal" id="mb"><div class="modal" role="dialog" aria-modal="true" aria-label="Notes">'+
    '<div class="modal-h"><h3>Notes &middot; '+esc(l.part)+'</h3><button class="modal-x" aria-label="Close" id="mx">&#10005;</button></div>'+
    '<div class="modal-b"><div class="contact"><b>'+esc(l.s)+'</b> &middot; '+esc(l.po)+' &middot; Supplier ETA: <b>'+etaPlain(l)+'</b></div>'+
    ((l.log&&l.log.length)?l.log.map(row).join(''):'<div class="pcx-note" style="padding:6px 0;">Nothing logged yet.</div>')+
    '<div style="margin-top:12px;font-weight:700;">Add a note</div><textarea class="textarea" id="ntTxt" style="min-height:70px;" placeholder="e.g. Dave says truck is Thursday, will confirm"></textarea></div>'+
    '<div class="modal-f"><button class="btn" id="ntClose">Close</button><button class="btn btn-primary" id="ntSave">Save note</button></div></div></div>';
  function close(){root.innerHTML='';document.removeEventListener('keydown',k);}
  function k(e){if(e.key==='Escape')close();}
  document.addEventListener('keydown',k);
  $('mx').onclick=close; $('ntClose').onclick=close;
  $('mb').onclick=function(e){if(e.target===$('mb'))close();};
  $('ntSave').onclick=function(){
    var t=$('ntTxt').value.trim(); if(!t){toast('Nothing to save','Type a note first.');return;}
    logEntry(l,'Note',t); close(); window.pcxRender(); toast('Note saved','Shows under the ETA for everyone at your site.');
  };
  $('ntTxt').focus();
}
document.addEventListener('click',function(e){var a=e.target.closest('[data-note]'); if(a){e.preventDefault(); openNote(+a.dataset.note);}});
