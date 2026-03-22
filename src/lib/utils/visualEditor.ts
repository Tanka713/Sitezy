export function buildVisualEditorScript(): string {
  return `<script>
(function(){
'use strict';
if(document.documentElement.hasAttribute('data-sz-boot'))return;
document.documentElement.setAttribute('data-sz-boot','1');

var css=document.createElement('style');
css.textContent=
  '[data-sz-sel]{outline:2px solid #4f7eff!important;outline-offset:3px!important;transition:outline-offset .1s ease;}'+
  '[data-sz-sel][data-sz-sec]{outline-color:#2dd4bf!important}'+
  '[data-sz-hov]:not([data-sz-sel]){outline:1.5px dashed rgba(100,120,255,.45)!important;outline-offset:2px!important;transition:outline .08s ease;}'+
  '[contenteditable=true]{outline:2px solid #22d3ee!important;outline-offset:2px!important;caret-color:#22d3ee!important}'+
  '[data-sz-drag]{opacity:1!important;outline:none!important}'+
  'body.sz-dragging [data-sz-hov]{outline:none!important}'+
  'body{user-select:none!important;-webkit-user-select:none!important}'+
  'body.sz-editing [contenteditable=true]{user-select:text!important;-webkit-user-select:text!important}'+
  '.sz-dl{position:fixed;pointer-events:none;z-index:2147483647;height:2px;border-radius:2px;background:#4f7eff;box-shadow:0 0 6px rgba(79,126,255,.5)}'+
  'svg,svg *{pointer-events:none!important}'+
  '[data-sz-sec-hov],[data-sz-sel][data-sz-sec-name]{position:relative!important}'+
  '[data-sz-sec-hov]::before,[data-sz-sel][data-sz-sec-name]::before{content:attr(data-sz-sec-name);position:absolute;top:0;left:0;z-index:9998;pointer-events:none;background:rgba(8,8,14,.85);color:#2dd4bf;font:700 9px/1 system-ui,sans-serif;letter-spacing:.09em;text-transform:uppercase;padding:2px 8px;border-radius:0 0 5px 0}';
document.head.appendChild(css);

var TXT=['h1','h2','h3','h4','h5','h6','p','span','a','li','button','label','strong','em','small','figcaption','blockquote','td','th'];
var MED=['img','video','picture'];
var INP=['input','textarea','select'];
var BLK=['section','div','article','aside','header','footer','main','nav','ul','ol','form'];
var fn=function(el){return TXT.indexOf(el.tagName.toLowerCase())>=0;};
var fm=function(el){return MED.indexOf(el.tagName.toLowerCase())>=0;};
var fi=function(el){return INP.indexOf(el.tagName.toLowerCase())>=0;};
var fb=function(el){return BLK.indexOf(el.tagName.toLowerCase())>=0;};
var fsec=function(el){return !!(el&&el.parentElement===document.body);};

var _id=0;
function eid(el){if(!el||!el.tagName)return null;if(!el.getAttribute('data-sz-id'))el.setAttribute('data-sz-id','n'+(++_id));return el;}
function initIds(){
  document.querySelectorAll('body *').forEach(function(el){if(el.tagName&&el.tagName!=='SCRIPT'&&!el.hasAttribute('data-sz-ui'))eid(el);});
  document.querySelectorAll('body>*').forEach(function(el){
    if(!el.tagName||el.hasAttribute('data-sz-ui')||['SCRIPT','STYLE','NOSCRIPT','LINK','META'].indexOf(el.tagName)>=0)return;
    var nm=el.getAttribute('data-sz-section-name')||el.getAttribute('data-sz-section-type')||el.getAttribute('data-section')||el.tagName.toLowerCase();
    el.setAttribute('data-sz-sec-name',nm);
  });
}

function post(t,p){try{window.parent.postMessage({source:'sitezy-editor',type:t,payload:p||{}}, '*');}catch(e){}}
function pv(v){var m=(v||'').match(/^([\\d.]+)/);return m?parseFloat(m[1]):0;}
function rh(c){
  if(!c||c==='transparent'||c==='rgba(0, 0, 0, 0)')return null;
  var m=c.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);if(!m)return null;
  return '#'+[m[1],m[2],m[3]].map(function(x){return('0'+parseInt(x,10).toString(16)).slice(-2);}).join('');
}
function tr(s,n){s=(s||'').trim().replace(/\\s+/g,' ');return s.length>n?s.slice(0,n-1)+'…':s;}

function gsec(el){var c=el;while(c&&c.parentElement){if(c.parentElement===document.body)return c;c=c.parentElement;}return null;}
function gpar(el){
  var c=el?el.parentElement:null;
  while(c&&c!==document.body){if(pickable(c))return c;c=c.parentElement;}return null;
}
function pickable(el){
  if(!el||!el.tagName||el===document.body||el===document.documentElement)return false;
  if(el.hasAttribute('data-sz-ui'))return false;
  var t=el.tagName.toLowerCase();
  if(INP.indexOf(t)>=0||MED.indexOf(t)>=0||TXT.indexOf(t)>=0)return true;
  if(el.parentElement===document.body)return true;
  if(BLK.indexOf(t)>=0){var s=window.getComputedStyle(el);return s.display.indexOf('flex')>=0||s.display.indexOf('grid')>=0||pv(s.paddingTop)+pv(s.paddingBottom)+pv(s.paddingLeft)+pv(s.paddingRight)>16||el.children.length>1;}
  return false;
}
function resolve(node){
  var cur=node&&node.nodeType===1?node:(node&&node.parentElement);if(!cur)return null;
  var st=cur;
  while(cur&&cur!==document.body){
    if(fn(st)&&fn(cur))return eid(st);
    if(fm(st)&&fm(cur))return eid(st);
    if(fi(st)&&fi(cur))return eid(st);
    if(pickable(cur))return eid(cur);
    cur=cur.parentElement;
  }
  return eid(gsec(st));
}

function describe(el){
  if(!el||!el.tagName)return null;
  eid(el);
  var t=el.tagName.toLowerCase(),c=window.getComputedStyle(el),sec=gsec(el),sc=sec?window.getComputedStyle(sec):null;
  var role=fsec(el)?'section':fn(el)?(t==='a'||t==='button'?'button':'text'):fm(el)?'image':fi(el)?'input':'container';
  return{
    nodeId:el.getAttribute('data-sz-id'),
    parentNodeId:gpar(el)?gpar(el).getAttribute('data-sz-id'):null,
    sectionId:sec?(sec.getAttribute('data-sz-section-id')||null):null,
    sectionName:sec?(sec.getAttribute('data-sz-section-name')||null):null,
    sectionType:sec?(sec.getAttribute('data-sz-section-type')||null):null,
    tag:t,label:t==='img'?(el.getAttribute('alt')||'Image'):t==='video'?'Video':t==='iframe'?'Embed':tr(el.innerText||t,40),
    role,depth:0,text:tr(el.innerText||'',200),
    src:(t==='img'||t==='video'||t==='iframe')?el.getAttribute('src'):null,
    href:el.getAttribute('href')||null,target:el.getAttribute('target')||null,
    isImg:t==='img',isVideo:t==='video',isIframe:t==='iframe',isText:fn(el),isBtn:t==='button'||t==='a',
    isInput:fi(el),
    isContainer:fb(el),isSec:fsec(el),
    videoAutoplay:t==='video'?el.hasAttribute('autoplay'):false,
    videoLoop:t==='video'?el.hasAttribute('loop'):false,
    videoMuted:t==='video'?el.hasAttribute('muted'):false,
    videoControls:t==='video'?el.hasAttribute('controls'):false,
    placeholder:fi(el)?(el.getAttribute('placeholder')||''):null,
    inputType:t==='input'?(el.getAttribute('type')||'text'):null,
    inputName:fi(el)?(el.getAttribute('name')||''):null,
    fontSize:Math.round(parseFloat(c.fontSize)||16),
    fontFamily:c.fontFamily,fontWeight:c.fontWeight,fontStyle:c.fontStyle,
    textAlign:c.textAlign,lineHeight:c.lineHeight,letterSpacing:c.letterSpacing,
    textDecoration:c.textDecoration,textTransform:c.textTransform,color:rh(c.color),
    backgroundColor:rh(c.backgroundColor),backgroundImage:c.backgroundImage,
    paddingTop:pv(c.paddingTop),paddingRight:pv(c.paddingRight),
    paddingBottom:pv(c.paddingBottom),paddingLeft:pv(c.paddingLeft),
    marginTop:pv(c.marginTop),marginRight:pv(c.marginRight),
    marginBottom:pv(c.marginBottom),marginLeft:pv(c.marginLeft),
    width:c.width,height:c.height,minWidth:c.minWidth,maxWidth:c.maxWidth,
    borderRadius:c.borderRadius,border:c.border,
    display:c.display,flexDir:c.flexDirection,flexWrap:c.flexWrap,
    justifyContent:c.justifyContent,alignItems:c.alignItems,
    gap:c.gap,gridCols:c.gridTemplateColumns,
    opacity:c.opacity,boxShadow:c.boxShadow,overflow:c.overflow,
    secBg:sc?(rh(sc.backgroundColor)||null):null,
    secPadding:sc?sc.padding:null,
  };
}

var sel=null,hov=null,editing=false;
var undos=[],redos=[];
var dragEl=null,dragGhost=null,dl=null,dropTarget=null,dropPos=null;
var mdEl=null,mdX=0,mdY=0,dragging=false;

// ── Resize + padding overlay ──────────────────────────────────────────────
var ov=null,rzEl=null,rzMode='',rzSX=0,rzSY=0,rzSW=0,rzSH=0;
var padEl=null,padSide='',padSX=0,padSY=0,padS0=0;

function mkOv(){
  if(ov)return;
  ov=document.createElement('div');ov.id='sz-ov';
  ov.setAttribute('data-sz-ui','1');
  ov.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483646;display:none;overflow:visible;';
  var DIRS=['n','ne','e','se','s','sw','w','nw'];
  var CURSORS={n:'ns-resize',ne:'nesw-resize',e:'ew-resize',se:'nwse-resize',s:'ns-resize',sw:'nesw-resize',w:'ew-resize',nw:'nwse-resize'};
  DIRS.forEach(function(d){
    var h=document.createElement('div');
    h.setAttribute('data-sz-ui','1');
    h.setAttribute('data-rh',d);
    h.style.cssText='position:fixed;width:7px;height:7px;background:#fff;border:2px solid #4f7eff;border-radius:2px;pointer-events:all;z-index:2147483647;transform:translate(-50%,-50%);box-sizing:border-box;display:none;';
    h.style.cursor=CURSORS[d];
    h.addEventListener('mousedown',function(e){startRz(e,d);},true);
    ov.appendChild(h);
  });
  var PSIDES=['pt','pr','pb','pl'];
  PSIDES.forEach(function(p){
    var h=document.createElement('div');
    h.setAttribute('data-sz-ui','1');
    h.setAttribute('data-ph',p);
    h.style.cssText='position:fixed;pointer-events:all;z-index:2147483645;background:rgba(79,126,255,0.12);display:none;';
    h.style.cursor=p==='pt'||p==='pb'?'ns-resize':'ew-resize';
    h.addEventListener('mousedown',function(e){startPad(e,p);},true);
    ov.appendChild(h);
  });
  document.body.appendChild(ov);
}

function posOv(){
  if(!ov||!sel||dragging||editing){if(ov){ov.querySelectorAll('[data-rh],[data-ph]').forEach(function(h){h.style.display='none';});}return;}
  var r=sel.getBoundingClientRect();
  var c=window.getComputedStyle(sel);
  var pt=Math.max(4,pv(c.paddingTop)),pr=Math.max(4,pv(c.paddingRight)),pb=Math.max(4,pv(c.paddingBottom)),pl=Math.max(4,pv(c.paddingLeft));
  var MX=[[r.left+r.width/2,r.top],[r.left+r.width,r.top],[r.left+r.width,r.top+r.height/2],[r.left+r.width,r.top+r.height],[r.left+r.width/2,r.top+r.height],[r.left,r.top+r.height],[r.left,r.top+r.height/2],[r.left,r.top]];
  var hs=ov.querySelectorAll('[data-rh]');
  for(var i=0;i<hs.length;i++){hs[i].style.left=MX[i][0]+'px';hs[i].style.top=MX[i][1]+'px';hs[i].style.display='';}
  var pth=ov.querySelector('[data-ph="pt"]');pth.style.left=r.left+'px';pth.style.top=r.top+'px';pth.style.width=r.width+'px';pth.style.height=pt+'px';pth.style.display='';
  var prh=ov.querySelector('[data-ph="pr"]');prh.style.left=(r.right-pr)+'px';prh.style.top=r.top+'px';prh.style.width=pr+'px';prh.style.height=r.height+'px';prh.style.display='';
  var pbh=ov.querySelector('[data-ph="pb"]');pbh.style.left=r.left+'px';pbh.style.top=(r.bottom-pb)+'px';pbh.style.width=r.width+'px';pbh.style.height=pb+'px';pbh.style.display='';
  var plh=ov.querySelector('[data-ph="pl"]');plh.style.left=r.left+'px';plh.style.top=r.top+'px';plh.style.width=pl+'px';plh.style.height=r.height+'px';plh.style.display='';
}

function startRz(e,mode){
  if(!sel||editing||dragging)return;
  e.stopPropagation();e.preventDefault();
  var c=window.getComputedStyle(sel);
  rzEl=sel;rzMode=mode;rzSX=e.clientX;rzSY=e.clientY;
  rzSW=parseFloat(c.width)||sel.offsetWidth;rzSH=parseFloat(c.height)||sel.offsetHeight;
  pushU();
  document.addEventListener('mousemove',doRz,true);
  document.addEventListener('mouseup',endRz,{once:true,capture:true});
}
function doRz(e){
  if(!rzEl)return;
  var dx=e.clientX-rzSX,dy=e.clientY-rzSY;
  if(rzMode.indexOf('e')>=0||rzMode.indexOf('w')>=0){var nw=rzMode.indexOf('e')>=0?Math.max(20,rzSW+dx):Math.max(20,rzSW-dx);rzEl.style.width=Math.round(nw)+'px';}
  if(rzMode.indexOf('s')>=0||rzMode.indexOf('n')>=0){var nh=rzMode.indexOf('s')>=0?Math.max(10,rzSH+dy):Math.max(10,rzSH-dy);rzEl.style.height=Math.round(nh)+'px';}
  posOv();post('select',describe(rzEl));
}
function endRz(){
  if(!rzEl)return;
  document.removeEventListener('mousemove',doRz,true);
  commit();rzEl=null;rzMode='';
}

function startPad(e,side){
  if(!sel||editing||dragging)return;
  e.stopPropagation();e.preventDefault();
  var c=window.getComputedStyle(sel);
  var vals={pt:pv(c.paddingTop),pr:pv(c.paddingRight),pb:pv(c.paddingBottom),pl:pv(c.paddingLeft)};
  padEl=sel;padSide=side;padSX=e.clientX;padSY=e.clientY;padS0=vals[side];
  pushU();
  document.addEventListener('mousemove',doPad,true);
  document.addEventListener('mouseup',endPad,{once:true,capture:true});
}
function doPad(e){
  if(!padEl)return;
  var delta;
  if(padSide==='pt')delta=padSY-e.clientY;
  else if(padSide==='pb')delta=e.clientY-padSY;
  else if(padSide==='pr')delta=padSX-e.clientX;
  else delta=e.clientX-padSX;
  var nv=Math.max(0,Math.round(padS0+delta));
  var propMap={pt:'paddingTop',pr:'paddingRight',pb:'paddingBottom',pl:'paddingLeft'};
  padEl.style[propMap[padSide]]=nv+'px';
  posOv();post('select',describe(padEl));
}
function endPad(){
  if(!padEl)return;
  document.removeEventListener('mousemove',doPad,true);
  commit();padEl=null;padSide='';
}

function msel(el){if(!el)return;el.setAttribute('data-sz-sel','1');if(fsec(el))el.setAttribute('data-sz-sec','1');else el.removeAttribute('data-sz-sec');}
function usel(el){if(!el)return;el.removeAttribute('data-sz-sel');el.removeAttribute('data-sz-sec');}
function mhov(el){if(!el)return;el.setAttribute('data-sz-hov','1');if(fsec(el))el.setAttribute('data-sz-sec-hov','1');}
function uhov(el){if(!el)return;el.removeAttribute('data-sz-hov');el.removeAttribute('data-sz-sec-hov');}

function cleanSnap(){
  var clone=document.body.cloneNode(true);
  if(!clone||!clone.querySelectorAll)return document.body.innerHTML;
  clone.querySelectorAll('script,style,noscript,link,meta,#sz-ov,[data-sz-ui],.sz-dl,[data-sz-hov],[data-sz-sel],[data-sz-sec],[data-sz-sec-hov],[data-sz-drag],[data-sz-id],[contenteditable],[data-sz-sec-name]').forEach(function(el){
    if(['SCRIPT','STYLE','NOSCRIPT','LINK','META'].indexOf(el.tagName)>=0||el.id==='sz-ov'||el.classList.contains('sz-dl')||el.hasAttribute('data-sz-ui')){
      el.remove();
      return;
    }
    el.removeAttribute('data-sz-hov');
    el.removeAttribute('data-sz-sel');
    el.removeAttribute('data-sz-sec');
    el.removeAttribute('data-sz-sec-hov');
    el.removeAttribute('data-sz-drag');
    el.removeAttribute('data-sz-id');
    el.removeAttribute('contenteditable');
    el.removeAttribute('data-sz-sec-name');
  });
  return clone.innerHTML;
}
function snap(){return cleanSnap();}
function syncStack(){post('stack',{u:undos.length>1,r:redos.length>0});}
function pushU(){
  var h=snap();
  if(!undos.length||undos[undos.length-1]!==h){
    undos.push(h);
    if(undos.length>80)undos.shift();
  }
  redos=[];
  syncStack();
}
function rememberCurrent(){
  var h=snap();
  if(!undos.length||undos[undos.length-1]!==h){
    undos.push(h);
    if(undos.length>80)undos.shift();
  }
  syncStack();
}
function applyS(html){
  document.body.innerHTML=html;
  sel=null;hov=null;editing=false;
  ov=null;mkOv();
  initIds();
  post('html-update',{html:snap()});
  syncStack();
  post('deselect',{});
}
function doUndo(){if(undos.length<=1)return;redos.push(undos.pop());applyS(undos[undos.length-1]);}
function doRedo(){if(!redos.length)return;var h=redos.pop();undos.push(h);applyS(h);}
function commit(){initIds();rememberCurrent();post('html-update',{html:snap()});if(sel&&document.body.contains(sel))post('select',describe(sel));posOv();}

function selEl(el){
  if(!el)return desel();
  if(sel===el&&!editing){return;} // already selected, nothing to do
  usel(sel);uhov(hov);
  // Also clear hover from any element that might have it
  var hovEls=document.querySelectorAll('[data-sz-hov]');
  for(var i=0;i<hovEls.length;i++){hovEls[i].removeAttribute('data-sz-hov');hovEls[i].removeAttribute('data-sz-sec-hov');}
  hov=null;
  sel=el;eid(sel);msel(sel);
  post('select',describe(sel));posOv();
}
function desel(){
  if(editing)exitEdit();
  usel(sel);
  var hovEls=document.querySelectorAll('[data-sz-hov]');
  for(var i=0;i<hovEls.length;i++){hovEls[i].removeAttribute('data-sz-hov');hovEls[i].removeAttribute('data-sz-sec-hov');}
  sel=null;hov=null;
  post('deselect',{});posOv();
}

function enterEdit(){
  if(!sel||editing||!fn(sel))return;
  pushU();editing=true;sel.contentEditable='true';sel.focus();document.body.classList.add('sz-editing');posOv();
  try{var r=document.createRange(),s=window.getSelection();r.selectNodeContents(sel);r.collapse(false);s.removeAllRanges();s.addRange(r);}catch(e){}
  post('editing',describe(sel));
}
function exitEdit(){if(!sel||!editing)return;editing=false;sel.contentEditable='false';document.body.classList.remove('sz-editing');posOv();commit();}

function delEl(){
  if(!sel)return;
  var tgt=sel,nxt=gpar(tgt)||gsec(tgt);
  pushU();desel();
  tgt.style.transition='opacity 120ms';tgt.style.opacity='0';
  setTimeout(function(){tgt.remove();commit();if(nxt&&document.body.contains(nxt))selEl(nxt);},130);
}
function dupEl(){
  if(!sel)return;pushU();
  var cl=sel.cloneNode(true);
  ['data-sz-sel','data-sz-hov','data-sz-id','data-sz-sec'].forEach(function(a){cl.removeAttribute(a);});
  cl.querySelectorAll('[data-sz-id]').forEach(function(c){c.removeAttribute('data-sz-id');});
  sel.parentNode.insertBefore(cl,sel.nextSibling);
  commit();selEl(cl);
}
function moveSec(d){
  if(!sel)return;var s=gsec(sel);if(!s)return;
  var sib=d<0?s.previousElementSibling:s.nextElementSibling;if(!sib)return;
  pushU();if(d<0)s.parentNode.insertBefore(s,sib);else s.parentNode.insertBefore(sib,s);commit();
}
function onHov(node){
  if(dragging||editing)return;
  var nxt=resolve(node);if(nxt===hov)return;
  uhov(hov);hov=nxt;if(hov&&hov!==sel)mhov(hov);
}

function clearDl(){if(dl){dl.remove();dl=null;}dropTarget=null;dropPos=null;}
function showDl(el,pos){
  clearDl();dropTarget=el;dropPos=pos;if(pos==='inside')return;
  var r=el.getBoundingClientRect();dl=document.createElement('div');dl.className='sz-dl';
  dl.setAttribute('data-sz-ui','1');
  dl.style.cssText='left:'+r.left+'px;top:'+(pos==='before'?r.top-1:r.bottom-1)+'px;width:'+r.width+'px';
  document.body.appendChild(dl);
}
function bDrag(n,x,y){if(!n||editing)return;mdEl=n;mdX=x;mdY=y;}
function sDrag(){
  if(!mdEl)return;pushU();dragging=true;dragEl=mdEl;dragEl.setAttribute('data-sz-drag','1');document.body.classList.add('sz-dragging');
  var r=dragEl.getBoundingClientRect();
  dragGhost=document.createElement('div');
  dragGhost.setAttribute('data-sz-ui','1');
  dragGhost.style.cssText='position:fixed;z-index:2147483647;pointer-events:none;border-radius:6px;overflow:hidden;opacity:.75;box-shadow:0 12px 32px rgba(0,0,0,.45);background:#fff;width:'+Math.min(r.width,260)+'px;height:'+Math.min(r.height,110)+'px';
  var inn=document.createElement('div');var sc=Math.min(260/Math.max(r.width,1),110/Math.max(r.height,1),1);
  inn.style.cssText='pointer-events:none;transform:scale('+sc+');transform-origin:top left;width:'+r.width+'px;height:'+r.height+'px;overflow:hidden';
  inn.innerHTML=dragEl.outerHTML;dragGhost.appendChild(inn);document.body.appendChild(dragGhost);
}
function uDrag(e){
  if(!mdEl||editing)return;
  if(!dragging){if(Math.abs(e.clientX-mdX)<5&&Math.abs(e.clientY-mdY)<5)return;sDrag();}
  if(!dragGhost)return;
  dragGhost.style.left=(e.clientX-10)+'px';dragGhost.style.top=(e.clientY-10)+'px';
  dragGhost.style.display='none';var els=document.elementsFromPoint(e.clientX,e.clientY);dragGhost.style.display='';
  for(var i=0;i<els.length;i++){
    var c=resolve(els[i]);if(!c||c===dragEl||dragEl.contains(c))continue;
    var rr=c.getBoundingClientRect();
    if(c.parentElement===document.body){showDl(c,e.clientY<rr.top+rr.height/2?'before':'after');}
    else{var z=rr.height*.25;showDl(c,e.clientY<rr.top+z?'before':e.clientY>rr.bottom-z?'after':'inside');}
    return;
  }clearDl();
}
function eDrag(){
  if(!dragging){mdEl=null;return;}
  if(dragEl)dragEl.removeAttribute('data-sz-drag');
  if(dragGhost){dragGhost.remove();dragGhost=null;}
  document.body.classList.remove('sz-dragging');
  if(dragEl&&dropTarget&&dropTarget!==dragEl){
    if(dropPos==='before')dropTarget.parentNode.insertBefore(dragEl,dropTarget);
    else if(dropPos==='after')dropTarget.parentNode.insertBefore(dragEl,dropTarget.nextSibling);
    else dropTarget.appendChild(dragEl);
    commit();selEl(dragEl);
  }
  clearDl();dragEl=null;dragging=false;mdEl=null;
}

document.addEventListener('mousemove',function(e){if(dragging||mdEl)uDrag(e);},true);
document.addEventListener('mouseover',function(e){if(!dragging&&!mdEl)onHov(e.target);},true);
document.addEventListener('mouseout',function(e){
  if(dragging||editing)return;
  var t=e.target;if(!t||!t.removeAttribute)return;
  if(t===hov){uhov(hov);hov=null;}
},true);
document.addEventListener('mousedown',function(e){if(e.button!==0)return;var t=resolve(e.target);if(!t||t===document.body)return;if(!editing){e.preventDefault();try{window.focus();}catch(ex){}}bDrag(t,e.clientX,e.clientY);},true);
document.addEventListener('mouseup',function(){eDrag();},true);
document.addEventListener('click',function(e){
  if(dragging)return;
  var t=resolve(e.target);
  // Click on empty background → deselect
  if(!t||t===document.body||t===document.documentElement){
    if(editing)exitEdit();
    desel();return;
  }
  // Click inside active edit target → allow text cursor to move naturally
  if(editing&&sel&&sel.contains(t))return;
  e.preventDefault();e.stopPropagation();
  // Exit edit and select the clicked element
  if(editing){exitEdit();selEl(t);return;}
  // Second click on already-selected element: enter edit for text, otherwise keep selection
  if(sel===t){if(fn(t))enterEdit();return;}
  selEl(t);
},true);
document.addEventListener('dblclick',function(e){
  if(dragging)return;var t=resolve(e.target);if(!t||!fn(t))return;
  e.preventDefault();e.stopPropagation();selEl(t);enterEdit();
},true);
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a');if(a&&!editing)e.preventDefault();},true);
document.addEventListener('keydown',function(e){
  var mod=e.metaKey||e.ctrlKey;
  if(mod&&e.key==='z'&&!e.shiftKey){e.preventDefault();doUndo();return;}
  if(mod&&(e.key==='y'||(e.key==='z'&&e.shiftKey))){e.preventDefault();doRedo();return;}
  if(e.key==='Escape'){if(editing)exitEdit();else desel();return;}
  if(!editing&&sel){
    if((e.key==='Delete'||e.key==='Backspace')&&INP.indexOf(sel.tagName.toLowerCase())<0){e.preventDefault();delEl();return;}
    if(e.key==='Enter'&&fn(sel)){e.preventDefault();enterEdit();return;}
    if(mod&&e.key==='d'){e.preventDefault();dupEl();return;}
    if(e.key==='Tab'){e.preventDefault();var p=gpar(sel);if(p)selEl(p);}
  }
},false);
document.addEventListener('selectionchange',function(){if(editing&&sel)post('editing',describe(sel));});

window.addEventListener('message',function(e){
  if(!e.data||e.data.target!=='sitezy-iframe')return;
  var d=e.data;
  if(d.type==='apply-style'){if(!sel)return;pushU();sel.style[d.prop]=d.value??d.val;commit();}
  if(d.type==='apply-attr'){if(!sel)return;pushU();if(d.value===null||d.value===undefined){sel.removeAttribute(d.attr);}else{sel.setAttribute(d.attr,d.value??d.val);}commit();}
  if(d.type==='apply-section-style'){var asec=sel?gsec(sel):null;if(!asec)return;pushU();asec.style[d.prop]=d.value??d.val;commit();}
  if(d.type==='start-edit'){if(sel)enterEdit();}
  if(d.type==='stop-edit'){if(editing)exitEdit();}
  if(d.type==='deselect'){if(editing)exitEdit();desel();}
  if(d.type==='replace-src'){if(!sel||sel.tagName.toLowerCase()!=='img')return;pushU();sel.setAttribute('src',d.url);sel.removeAttribute('srcset');commit();}
  if(d.type==='delete'){delEl();}
  if(d.type==='duplicate'){dupEl();}
  if(d.type==='move-up'){moveSec(-1);}
  if(d.type==='move-down'){moveSec(1);}
  if(d.type==='sec-bg'){var s=sel?gsec(sel):null;if(!s)return;pushU();s.style.backgroundColor=d.color;commit();}
  if(d.type==='sec-pad'){var s2=sel?gsec(sel):null;if(!s2)return;pushU();s2.style.padding=d.top+'px '+d.right+'px '+d.bottom+'px '+d.left+'px';commit();}
  if(d.type==='undo'){doUndo();}
  if(d.type==='redo'){doRedo();}
  if(d.type==='select-parent'){var p=sel?gpar(sel):null;if(p)selEl(p);}
  if(d.type==='focus-section'){
    if(!d.sectionId)return;
    var tgt=document.querySelector('[data-sz-section-id="'+String(d.sectionId).replace(/"/g,'\\\\"')+'"]');
    if(!tgt)return;selEl(tgt);try{tgt.scrollIntoView({behavior:'smooth',block:'center'});}catch(err){}
  }
  if(d.type==='delete-section'){
    if(!d.sectionId)return;
    var ds=document.querySelector('[data-sz-section-id="'+String(d.sectionId).replace(/"/g,'\\\\"')+'"]');
    if(!ds)return;
    pushU();
    if(sel===ds)desel();
    ds.style.transition='opacity 120ms';ds.style.opacity='0';
    setTimeout(function(){ds.remove();commit();},130);
  }
  if(d.type==='insert-top'){
    var _it=document.createElement('div');_it.innerHTML=d.html||'';
    var _ie=_it.firstElementChild;
    if(_ie){pushU();document.body.insertBefore(_ie,document.body.firstElementChild);commit();}
  }
  if(d.type==='insert-bottom'){
    var _ib=document.createElement('div');_ib.innerHTML=d.html||'';
    var _ibe=_ib.firstElementChild;
    if(_ibe){pushU();document.body.appendChild(_ibe);commit();}
  }
  if(d.type==='insert-after-section'){
    var _ia=document.createElement('div');_ia.innerHTML=d.html||'';
    var _iae=_ia.firstElementChild;
    if(_iae){
      pushU();
      var _afEl=d.sectionId?document.querySelector('[data-sz-section-id="'+d.sectionId+'"]'):null;
      if(_afEl){_afEl.parentNode.insertBefore(_iae,_afEl.nextSibling);}
      else{
        var _bkids=Array.from(document.body.children);
        var _bftr=_bkids.find(function(c){return c.tagName==='FOOTER'||c.getAttribute('data-sz-section-type')==='footer';});
        if(_bftr)document.body.insertBefore(_iae,_bftr);else document.body.appendChild(_iae);
      }
      commit();
    }
  }
  if(d.type==='insert-in-section'){
    var _is=document.createElement('div');_is.innerHTML=d.html||'';
    var _ise=_is.firstElementChild;
    if(_ise){
      pushU();
      var _tsec=d.sectionId?document.querySelector('[data-sz-section-id="'+d.sectionId+'"]'):null;
      if(!_tsec){
        var _skids=Array.from(document.body.children).filter(function(c){return ['SCRIPT','STYLE','NOSCRIPT'].indexOf(c.tagName)<0&&c.getAttribute('data-sz-section-type')!=='footer';});
        _tsec=_skids[_skids.length-1]||null;
      }
      if(_tsec){
        var _cont=_tsec.querySelector('div[style*="margin:0 auto"]')||_tsec;
        _cont.appendChild(_ise);
      }
      commit();
    }
  }
});

mkOv();initIds();undos.push(snap());post('ready',{u:false,r:false});
window.addEventListener('scroll',posOv,true);window.addEventListener('resize',posOv);
})();
</scr`+`ipt>`;
}
