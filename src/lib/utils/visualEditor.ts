export function buildVisualEditorScript(): string {
  return `<script>
(function(){
'use strict';
var STYLE_ID='sz-editor-style';
var styleText=
  '[data-sz-sel]{outline:1.5px solid rgba(96,130,255,.82)!important;outline-offset:2px!important}'+
  '[data-sz-sel][data-sz-sec]{outline-color:rgba(84,213,200,.9)!important}'+
  '[contenteditable=true]{outline:2px solid #22d3ee!important;outline-offset:2px!important;caret-color:#22d3ee!important}'+
  '[data-sz-drag]{opacity:1!important;outline:none!important}'+
  'body{user-select:none!important;-webkit-user-select:none!important}'+
  'body.sz-editing [contenteditable=true]{user-select:text!important;-webkit-user-select:text!important}'+
  '.sz-dl{position:fixed;pointer-events:none;z-index:2147483647;height:2px;border-radius:2px;background:#4f7eff;box-shadow:0 0 6px rgba(79,126,255,.5)}'+
  'svg *{pointer-events:none!important}'+
  'iframe:not([data-sz-ui]),video:not([data-sz-ui]){pointer-events:none!important}'+
  '[data-sz-hover-fx="lift"][data-sz-hover-preview="1"],[data-sz-hover-fx="lift"]:hover{transform:var(--sz-hover-base-transform,translateZ(0px)) translateY(-6px)!important;box-shadow:var(--sz-hover-base-shadow,none),0 18px 36px rgba(0,0,0,.14)!important}'+
  '[data-sz-hover-fx="grow"][data-sz-hover-preview="1"],[data-sz-hover-fx="grow"]:hover{transform:var(--sz-hover-base-transform,translateZ(0px)) scale(1.03)!important}'+
  '[data-sz-hover-fx="tilt"][data-sz-hover-preview="1"],[data-sz-hover-fx="tilt"]:hover{transform:var(--sz-hover-base-transform,translateZ(0px)) rotate(-1.5deg) translateY(-3px)!important}'+
  '[data-sz-hover-fx="glow"][data-sz-hover-preview="1"],[data-sz-hover-fx="glow"]:hover{box-shadow:var(--sz-hover-base-shadow,none),0 0 0 1px rgba(124,58,237,.16),0 0 26px rgba(124,58,237,.28)!important}'+
  '[data-sz-hover-fx="soften"][data-sz-hover-preview="1"],[data-sz-hover-fx="soften"]:hover{filter:brightness(1.03) saturate(1.05)!important}';
var css=document.getElementById(STYLE_ID);
if(!css){
  css=document.createElement('style');
  css.id=STYLE_ID;
  document.head.appendChild(css);
}
css.textContent=styleText;

if(document.documentElement.hasAttribute('data-sz-boot'))return;
document.documentElement.setAttribute('data-sz-boot','1');

var TXT=['h1','h2','h3','h4','h5','h6','p','span','a','li','button','label','strong','em','small','figcaption','blockquote','td','th'];
var MED=['img','video','picture','iframe'];
var INP=['input','textarea','select'];
var BLK=['section','div','article','aside','header','footer','main','nav','ul','ol','form'];
var fn=function(el){return TXT.indexOf(el.tagName.toLowerCase())>=0;};
var fm=function(el){return MED.indexOf(el.tagName.toLowerCase())>=0;};
var fi=function(el){return INP.indexOf(el.tagName.toLowerCase())>=0;};
var fb=function(el){return BLK.indexOf(el.tagName.toLowerCase())>=0;};
var fsec=function(el){return !!(el&&el.parentElement===document.body);};

var _id=0;
function eid(el){if(!el||!el.tagName)return null;if(!el.getAttribute('data-sz-id'))el.setAttribute('data-sz-id','n'+(++_id));return el;}
function ekey(el){
  if(!el||!el.tagName)return null;
  if(!el.getAttribute('data-sz-key'))el.setAttribute('data-sz-key','k'+Date.now().toString(36)+Math.random().toString(36).slice(2,8)+(++_id));
  return el;
}
var viewportMode='desktop';
function responsiveAttrName(mode){
  if(mode==='tablet')return 'data-sz-rwd-tablet';
  if(mode==='mobile')return 'data-sz-rwd-mobile';
  return null;
}
function decodeResponsiveMap(value){
  if(!value)return {};
  try{
    var parsed=JSON.parse(decodeURIComponent(value));
    return parsed&&typeof parsed==='object'?parsed:{};
  }catch(e){
    return {};
  }
}
function encodeResponsiveMap(map){
  var out={};
  Object.keys(map||{}).forEach(function(key){
    var value=map[key];
    if(value!==null&&value!==undefined&&value!=='')out[key]=String(value);
  });
  return encodeURIComponent(JSON.stringify(out));
}
function hasResponsiveOverride(el,mode){
  if(!el)return false;
  var attr=responsiveAttrName(mode);
  if(!attr)return false;
  return Object.keys(decodeResponsiveMap(el.getAttribute(attr))).length>0;
}
function clearResponsiveOverride(el,mode){
  if(!el)return;
  var attr=responsiveAttrName(mode);
  if(!attr)return;
  el.removeAttribute(attr);
}
function refreshResponsive(){
  try{
    if(window.__sitezyResponsive&&typeof window.__sitezyResponsive.refresh==='function'){
      window.__sitezyResponsive.refresh();
    }
  }catch(e){}
}
function writeStyleValue(el,prop,value){
  if(!el||!prop)return;
  var responsiveAttr=responsiveAttrName(viewportMode);
  if(!responsiveAttr){
    el.style[prop]=value===null||value===undefined?'':String(value);
    return;
  }
  ekey(el);
  var map=decodeResponsiveMap(el.getAttribute(responsiveAttr));
  if(value===null||value===undefined||value==='')delete map[prop];
  else map[prop]=String(value);
  if(Object.keys(map).length)el.setAttribute(responsiveAttr,encodeResponsiveMap(map));
  else el.removeAttribute(responsiveAttr);
  refreshResponsive();
}
function baseDisplay(el){
  if(!el||!el.tagName)return 'block';
  var stored=el.getAttribute('data-sz-display-base');
  if(stored&&stored!=='none')return stored;
  var inline=el.style&&el.style.display?String(el.style.display).trim():'';
  if(inline&&inline!=='none'){
    el.setAttribute('data-sz-display-base',inline);
    return inline;
  }
  var computed=window.getComputedStyle(el).display;
  if(computed&&computed!=='none'){
    el.setAttribute('data-sz-display-base',computed);
    return computed;
  }
  var tag=el.tagName.toLowerCase();
  var fallbackMap={a:'inline',span:'inline',strong:'inline',em:'inline',small:'inline',label:'inline-block',img:'block',button:'inline-flex',input:'inline-block',textarea:'inline-block',select:'inline-block',svg:'inline-block'};
  var fallback=fallbackMap[tag]||'block';
  el.setAttribute('data-sz-display-base',fallback);
  return fallback;
}
function setResponsivePropForMode(el,mode,prop,value){
  var attr=responsiveAttrName(mode);
  if(!attr||!el||!prop)return;
  ekey(el);
  var map=decodeResponsiveMap(el.getAttribute(attr));
  if(value===null||value===undefined||value==='')delete map[prop];
  else map[prop]=String(value);
  if(Object.keys(map).length)el.setAttribute(attr,encodeResponsiveMap(map));
  else el.removeAttribute(attr);
}
function setVisibilityForMode(el,mode,visible){
  if(!el)return;
  var displayValue=baseDisplay(el);
  if(mode==='desktop'){
    el.style.display=visible?displayValue:'none';
    return;
  }
  setResponsivePropForMode(el,mode,'display',visible?displayValue:'none');
}
function setExclusiveVisibility(el,mode){
  if(!el)return;
  var target=mode==='tablet'||mode==='mobile'||mode==='desktop'?mode:'desktop';
  var displayValue=baseDisplay(el);
  el.style.display=target==='desktop'?displayValue:'none';
  setResponsivePropForMode(el,'tablet',target==='tablet'?displayValue:'none');
  setResponsivePropForMode(el,'mobile',target==='mobile'?displayValue:'none');
}
function responsivePropsForMode(targets,mode){
  var attr=responsiveAttrName(mode);
  if(!attr)return [];
  var out=[];
  uniqueEls(targets).forEach(function(target){
    Object.keys(decodeResponsiveMap(target.getAttribute(attr))).forEach(function(prop){
      if(out.indexOf(prop)<0)out.push(prop);
    });
  });
  return out;
}
function uniqueEls(list){
  var out=[];
  list.forEach(function(el){
    if(el&&out.indexOf(el)<0)out.push(el);
  });
  return out;
}
function initIds(){
  document.querySelectorAll('[data-sz-hover-lock],[data-sz-hover-preview]').forEach(function(el){
    el.removeAttribute('data-sz-hover-lock');
    el.removeAttribute('data-sz-hover-preview');
  });
  // Wrap any bare text nodes at the body level so they can be selected and deleted
  Array.from(document.body.childNodes).forEach(function(n){
    if(n.nodeType===3&&n.nodeValue&&n.nodeValue.trim()){
      var sp=document.createElement('span');sp.setAttribute('data-sz-orphan','1');sp.textContent=n.nodeValue;n.parentNode.replaceChild(sp,n);
    }
  });
  document.querySelectorAll('body *').forEach(function(el){if(el.tagName&&el.tagName!=='SCRIPT'&&!el.hasAttribute('data-sz-ui')){eid(el);ekey(el);}});
  document.querySelectorAll('body>*').forEach(function(el){
    if(!el.tagName||el.hasAttribute('data-sz-ui')||['SCRIPT','STYLE','NOSCRIPT','LINK','META'].indexOf(el.tagName)>=0)return;
    var nm=el.getAttribute('data-sz-section-name')||el.getAttribute('data-sz-section-type')||el.getAttribute('data-section')||el.tagName.toLowerCase();
    el.setAttribute('data-sz-sec-name',nm);
  });
  refreshResponsive();
}

function post(t,p){try{window.parent.postMessage({source:'sitezy-editor',type:t,payload:p||{}}, '*');}catch(e){}}
function pv(v){var m=(v||'').match(/^([\\d.]+)/);return m?parseFloat(m[1]):0;}
function rh(c){
  if(!c||c==='transparent'||c==='rgba(0, 0, 0, 0)')return null;
  var m=c.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);if(!m)return null;
  return '#'+[m[1],m[2],m[3]].map(function(x){return('0'+parseInt(x,10).toString(16)).slice(-2);}).join('');
}
function hasMotionTime(v){
  if(!v)return false;
  return String(v).split(',').some(function(part){
    var s=String(part).trim();
    if(!s)return false;
    if(s.slice(-2)==='ms')return Math.abs(parseFloat(s))>0;
    if(s.slice(-1)==='s')return Math.abs(parseFloat(s))>0;
    return Math.abs(parseFloat(s))>0;
  });
}
function hasMeaningfulTransition(c){
  if(!c||!hasMotionTime(c.transitionDuration))return false;
  var props=String(c.transitionProperty||'').split(',');
  return props.some(function(part){
    var p=String(part).trim().toLowerCase();
    return p==='all'||p==='transform'||p==='box-shadow'||p==='filter'||p==='opacity';
  });
}
function hasHoverMarkers(el){
  if(!el||!el.getAttribute)return false;
  var cls=String(el.getAttribute('class')||'');
  return cls.indexOf('hover:')>=0||
    cls.indexOf('group-hover:')>=0||
    !!el.getAttribute('onmouseenter')||
    !!el.getAttribute('onmouseover')||
    !!el.getAttribute('onmouseleave');
}
function classMotionHint(el){
  if(!el||!el.getAttribute)return false;
  var cls=String(el.getAttribute('class')||'');
  return /\banimate-[^\s]+\b/.test(cls) ||
    /\bmotion-safe:animate-[^\s]+\b/.test(cls) ||
    /\bmotion-reduce:animate-[^\s]+\b/.test(cls);
}
function classHoverHint(el){
  if(!el||!el.getAttribute)return false;
  var cls=String(el.getAttribute('class')||'');
  return cls.indexOf('hover:')>=0 ||
    cls.indexOf('group-hover:')>=0 ||
    /\btransition(?:-[^\s]+)?\b/.test(cls) ||
    /\bduration-\d+\b/.test(cls);
}
function presetAnim(el){
  if(!el||!el.getAttribute)return '';
  var v=String(el.getAttribute('data-sz-anim-in')||'').trim();
  return v&&v!=='none'?v:'';
}
function presetHover(el){
  if(!el||!el.getAttribute)return '';
  var v=String(el.getAttribute('data-sz-hover-fx')||'').trim();
  return v&&v!=='none'?v:'';
}
function primaryAnimName(c){
  if(!c)return '';
  var parts=String(c.animationName||'').split(',');
  for(var i=0;i<parts.length;i++){
    var name=String(parts[i]).trim();
    if(name&&name!=='none')return name;
  }
  return '';
}
function hasCustomEntranceCss(el,c){
  var name=primaryAnimName(c);
  return !presetAnim(el)&&(
    (!!name&&name.indexOf('sitezy-')!==0&&hasMotionTime(c.animationDuration)) ||
    classMotionHint(el) ||
    !!(el.getAttribute&&el.getAttribute('style')&&String(el.getAttribute('style')).match(/animation\s*:/i))
  );
}
function hasCustomHoverCss(el,c){
  return !presetHover(el)&&(
    ((hasHoverMarkers(el)||classHoverHint(el))&&hasMeaningfulTransition(c)) ||
    classHoverHint(el) ||
    !!(el.getAttribute&&el.getAttribute('style')&&String(el.getAttribute('style')).match(/transition\s*:/i))
  );
}
function animationSignalScore(el,preferred){
  if(!el||!el.tagName)return -1;
  var c=window.getComputedStyle(el);
  var cls=String(el.getAttribute('class')||'');
  var score=0;
  if(el===preferred)score+=4;
  if(presetAnim(el))score+=12;
  if(presetHover(el))score+=12;
  if(hasCustomEntranceCss(el,c))score+=8;
  if(hasCustomHoverCss(el,c))score+=6;
  if(/\banimate-[^\s]+/.test(cls))score+=4;
  if(cls.indexOf('hover:')>=0||cls.indexOf('group-hover:')>=0)score+=3;
  return score;
}
function animationTarget(el,dataEl,act){
  var seen=[];
  function add(n){if(n&&n.tagName&&seen.indexOf(n)<0)seen.push(n);}
  add(el);add(act);add(dataEl);
  if(el&&el.querySelectorAll){
    Array.from(el.querySelectorAll('*')).slice(0,40).forEach(function(child){
      if(
        presetAnim(child)||
        presetHover(child)||
        classMotionHint(child)||
        classHoverHint(child)||
        (child.getAttribute&&String(child.getAttribute('style')||'').match(/animation\s*:|transition\s*:/i))
      ){
        add(child);
      }
      var nested=mediaChild(child);
      if(nested)add(nested);
    });
  }
  var best=el,bestScore=animationSignalScore(el,el);
  seen.forEach(function(candidate){
    var score=animationSignalScore(candidate,el);
    if(score>bestScore){best=candidate;bestScore=score;}
  });
  return best||el;
}
function tr(s,n){s=(s||'').trim().replace(/\\s+/g,' ');return s.length>n?s.slice(0,n-1)+'…':s;}
function roleFor(el,dataEl){
  var t=(dataEl&&dataEl.tagName?dataEl.tagName:el.tagName).toLowerCase();
  if(fsec(el))return 'section';
  if(fn(el))return (t==='a'||t==='button')?'button':'text';
  if(t==='img'||t==='picture')return 'image';
  if(t==='video'||t==='iframe')return 'media';
  if(fi(el))return 'input';
  if(t==='svg')return 'icon';
  return 'container';
}
function titleFor(el,dataEl){
  var t=(dataEl&&dataEl.tagName?dataEl.tagName:el.tagName).toLowerCase();
  if(t==='img')return dataEl.getAttribute('alt')||'Image';
  if(t==='video')return 'Video';
  if(t==='iframe')return 'Embed';
  if(t==='svg')return 'Icon';
  return tr((dataEl.innerText||el.innerText||t),36)||t;
}
function sectionLabelFor(el){
  var sec=gsec(el);
  return sec?(sec.getAttribute('data-sz-section-name')||sec.getAttribute('data-sz-section-type')||null):null;
}
function chromeInfo(el){
  if(!el||!el.tagName)return {role:'element',title:'Element',meta:''};
  var dataEl=mediaChild(el)||el;
  var role=roleFor(el,dataEl);
  var title=titleFor(el,dataEl);
  var secName=sectionLabelFor(el);
  var metaParts=[el.tagName.toLowerCase()];
  if(secName&&!fsec(el))metaParts.push(secName);
  return {role:role,title:title,meta:metaParts.join(' · ')};
}
function mediaChild(el){
  if(!el||!el.tagName)return null;
  var t=el.tagName.toLowerCase();
  if(['img','video','iframe'].indexOf(t)>=0)return el;
  if(!el.querySelectorAll)return null;
  var media=el.querySelectorAll('img,video,iframe');
  if(media.length!==1)return null;
  if(el.querySelector('form,button,input,textarea,select,details,summary,blockquote'))return null;
  if(el.tagName.toLowerCase()!=='figure'&&el.querySelector('h1,h2,h3,h4,h5,h6,p,a,li,span'))return null;
  return media[0];
}
function decorativeMediaWrap(el){
  if(!el||!el.tagName||!el.querySelectorAll)return null;
  if(el.hasAttribute('data-sz-ui'))return null;
  var media=el.querySelectorAll('img,video,iframe');
  if(media.length!==1)return null;
  if(el.querySelector('h1,h2,h3,h4,h5,h6,p,a,button,input,textarea,select,form,ul,ol,nav'))return null;
  return media[0];
}
function secVisScore(sec,media){
  if(!sec||!media||!sec.getBoundingClientRect||!media.getBoundingClientRect)return 0;
  var sr=sec.getBoundingClientRect(),mr=media.getBoundingClientRect();
  var ix=Math.max(0,Math.min(sr.right,mr.right)-Math.max(sr.left,mr.left));
  var iy=Math.max(0,Math.min(sr.bottom,mr.bottom)-Math.max(sr.top,mr.top));
  var cover=(ix*iy)/Math.max(1,sr.width*sr.height);
  var ms=window.getComputedStyle(media),ps=media.parentElement?window.getComputedStyle(media.parentElement):null;
  var score=cover;
  if(ms.position==='absolute'||ms.position==='fixed'||(ps&&(ps.position==='absolute'||ps.position==='fixed')))score+=0.4;
  if((ms.objectFit||'').indexOf('cover')>=0)score+=0.15;
  if(media.parentElement===sec)score+=0.1;
  return score;
}
function secVisual(sec){
  if(!sec||!sec.children)return null;
  var cands=[];
  Array.from(sec.children).forEach(function(child){
    if(!child||!child.tagName||child.hasAttribute('data-sz-ui'))return;
    var t=child.tagName.toLowerCase();
    if(t==='img'||t==='video'||t==='iframe'){cands.push(child);return;}
    var nested=decorativeMediaWrap(child);
    if(nested)cands.push(nested);
  });
  if(!cands.length&&sec.querySelectorAll){
    var all=sec.querySelectorAll('img,video,iframe');
    if(all.length===1)cands=[all[0]];
  }
  var best=null,bestScore=0;
  cands.forEach(function(media){
    var score=secVisScore(sec,media);
    if(score>bestScore){bestScore=score;best=media;}
  });
  return bestScore>=0.75?best:null;
}

function gsec(el){var c=el;while(c&&c.parentElement){if(c.parentElement===document.body)return c;c=c.parentElement;}return null;}
function gpar(el){
  var c=el?el.parentElement:null;
  while(c&&c!==document.body){if(pickable(c))return c;c=c.parentElement;}return null;
}
function gact(el){
  var c=el;
  while(c&&c!==document.body){
    if(!c.tagName){c=c.parentElement;continue;}
    var t=c.tagName.toLowerCase();
    if(t==='a'||t==='button')return c;
    c=c.parentElement;
  }
  return null;
}
// ── Icon helpers ──────────────────────────────────────────────────────────────
// Returns the icon wrapper span (<span data-sz-icon="true">) for a given SVG, or null.
function iconWrap(svgEl){
  if(!svgEl||!svgEl.tagName||svgEl.tagName.toLowerCase()!=='svg')return null;
  var p=svgEl.parentElement;
  if(p&&p.getAttribute('data-sz-icon')==='true')return p;
  return null;
}
// Returns the <a> ancestor of an icon wrapper, or null.
function iconAnchor(svgEl){
  var w=iconWrap(svgEl);if(!w)return null;
  var gp=w.parentElement;
  return (gp&&gp.tagName&&gp.tagName.toLowerCase()==='a')?gp:null;
}
// Returns the icon wrapper by its data-sz-id, falling back to sel's parent if needed.
function iconWrapById(nodeId){
  if(nodeId){
    var found=document.querySelector('[data-sz-id="'+String(nodeId)+'"]')||null;
    if(found){
      if(found.getAttribute&&found.getAttribute('data-sz-icon')==='true')return found;
      if(found.tagName&&found.tagName.toLowerCase()==='svg')return iconWrap(found)||null;
      var nested=iconHit(found);
      if(nested)return nested;
    }
  }
  if(sel){
    var liveSvg=iconSvg(sel)||((sel.tagName&&sel.tagName.toLowerCase()==='svg')?sel:null);
    if(liveSvg)return iconWrap(liveSvg);
  }
  return null;
}
function iconHit(el){
  if(!el||!el.tagName)return null;
  if(el.getAttribute&&el.getAttribute('data-sz-icon')==='true')return el;
  return el.closest?el.closest('[data-sz-icon="true"]'):null;
}
function iconSvg(el){
  var w=iconHit(el);
  if(!w)return null;
  if(w.tagName&&w.tagName.toLowerCase()==='svg')return w;
  return w.querySelector?w.querySelector('svg'):null;
}
function iconUnit(el){
  var svg=iconSvg(el)||((el&&el.tagName&&el.tagName.toLowerCase()==='svg')?el:null);
  if(!svg)return null;
  var a=iconAnchor(svg);
  if(a)return a;
  var w=iconWrap(svg);
  return w||svg;
}
function reselectTarget(el){
  if(!el||!el.tagName)return el;
  var svg=iconSvg(el);
  return svg||el;
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
function pointMedia(x,y){
  if(typeof x!=='number'||typeof y!=='number'||!document.elementsFromPoint)return null;
  var els=document.elementsFromPoint(x,y);
  for(var i=0;i<els.length;i++){
    var el=els[i];
    if(!el||!el.tagName||el===document.body||el===document.documentElement||el.hasAttribute('data-sz-ui'))continue;
    var t=el.tagName.toLowerCase();
    if(t==='img'||t==='video'||t==='iframe')return el;
    if(fn(el)||fi(el)||t==='a'||t==='button')return null;
  }
  return null;
}
function resolve(node,x,y){
  var cur=node&&node.nodeType===1?node:(node&&node.parentElement);if(!cur)return null;
  // Ignore clicks on editor UI overlays (resize/padding handles, drop indicators, etc.)
  if(cur.closest&&cur.closest('[data-sz-ui]'))return null;
  var _iconHit=iconHit(cur);
  if(_iconHit){
    var _iconSvg=iconSvg(_iconHit);
    if(_iconSvg)return eid(_iconSvg);
    return eid(_iconHit);
  }
  var st=cur;
  var act=gact(st);
  if(act)return eid(act);
  var pm=pointMedia(x,y);
  if(pm&&!fm(st)&&!fn(st)&&!fi(st))return eid(pm);
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
  var dataEl=mediaChild(el)||el;
  eid(dataEl);
  var act=gact(el);
  var animEl=animationTarget(el,dataEl,act)||el;
  eid(animEl);
  ekey(el);ekey(dataEl);ekey(animEl);if(act)ekey(act);
  var p=el.parentElement,pc=p?window.getComputedStyle(p):null;
  var t=dataEl.tagName.toLowerCase(),c=window.getComputedStyle(el),dataStyle=dataEl!==el?window.getComputedStyle(dataEl):c,animStyle=animEl!==el?window.getComputedStyle(animEl):c,sec=gsec(el),sc=sec?window.getComputedStyle(sec):null;
  var linkEl=act&&act.tagName&&act.tagName.toLowerCase()==='a'?act:null;
  var buttonEl=act&&act.tagName&&act.tagName.toLowerCase()==='button'?act:null;
  var secBackdrop=sec?secVisual(sec):null;
  if(secBackdrop)eid(secBackdrop);
  var secBackdropTag=secBackdrop&&secBackdrop.tagName?secBackdrop.tagName.toLowerCase():null;
  var _computedAnimIn=hasCustomEntranceCss(animEl,animStyle)?'custom':'none';
  var _computedHover=hasCustomHoverCss(animEl,animStyle)?'custom':'none';
  var responsiveTargets=uniqueEls([el,dataEl,animEl,act]);
  var hasTabletResponsive=responsiveTargets.some(function(node){return hasResponsiveOverride(node,'tablet');});
  var hasMobileResponsive=responsiveTargets.some(function(node){return hasResponsiveOverride(node,'mobile');});
  var hasCurrentResponsive=viewportMode==='tablet'?hasTabletResponsive:viewportMode==='mobile'?hasMobileResponsive:false;
  var responsiveCurrentProps=viewportMode==='desktop'?[]:responsivePropsForMode(responsiveTargets,viewportMode);
  var role=fsec(el)?'section':fn(dataEl)?(t==='a'||t==='button'?'button':'text'):(t==='img'||t==='picture')?'image':(t==='video'||t==='iframe')?'media':fi(dataEl)?'input':'container';
  var _bgRaw=c.backgroundImage;var _bgUrl=null;if(_bgRaw&&_bgRaw!=='none'&&_bgRaw.indexOf('url(')>=0){var _bm=_bgRaw.match(/url\(['"]?([^'")\s]+)['"]?\)/);if(_bm)_bgUrl=_bm[1];}
  // Also extract background image from the PARENT SECTION (so child elements can show/edit it)
  var _secBgRaw=sc?sc.backgroundImage:null;var _secBgUrl=null;
  if(_secBgRaw&&_secBgRaw!=='none'&&_secBgRaw.indexOf('url(')>=0){var _sbm=_secBgRaw.match(/url\(['"]?([^'")\s]+)['"]?\)/);if(_sbm)_secBgUrl=_sbm[1];}
  return{
    nodeId:el.getAttribute('data-sz-id'),
    animationTargetNodeId:(animEl.getAttribute('data-sz-id')||null),
    mediaTargetNodeId:dataEl!==el?(dataEl.getAttribute('data-sz-id')||null):null,
    parentNodeId:gpar(el)?gpar(el).getAttribute('data-sz-id'):null,
    sectionId:sec?(sec.getAttribute('data-sz-section-id')||null):null,
    sectionName:sec?(sec.getAttribute('data-sz-section-name')||null):null,
    sectionType:sec?(sec.getAttribute('data-sz-section-type')||null):null,
    tag:t,label:t==='img'?(dataEl.getAttribute('alt')||'Image'):t==='video'?'Video':t==='iframe'?'Embed':t==='svg'?'Icon':tr(dataEl.innerText||t,40),
    role,depth:0,text:tr(el.innerText||'',200),
    src:(t==='img'||t==='video'||t==='iframe')?dataEl.getAttribute('src'):null,
    altText:t==='img'?(dataEl.getAttribute('alt')||''):null,
    href:(linkEl?linkEl.getAttribute('href'):el.getAttribute('href'))||null,target:(linkEl?linkEl.getAttribute('target'):el.getAttribute('target'))||null,
    isImg:t==='img',isVideo:t==='video',isIframe:t==='iframe',isText:fn(el),isBtn:!!buttonEl||!!linkEl,
    isInput:fi(el),isSvg:el.tagName.toLowerCase()==='svg',
    svgInner:el.tagName.toLowerCase()==='svg'?el.innerHTML:null,
    svgStroke:el.tagName.toLowerCase()==='svg'?(el.getAttribute('stroke')||el.style.stroke||'currentColor'):null,
    svgFill:el.tagName.toLowerCase()==='svg'?(el.getAttribute('fill')||el.style.fill||'none'):null,
    svgStrokeWidth:el.tagName.toLowerCase()==='svg'?(el.getAttribute('stroke-width')||'2'):null,
    svgViewBox:el.tagName.toLowerCase()==='svg'?(el.getAttribute('viewBox')||'0 0 24 24'):null,
    isIconEl:!!iconWrap(el),
    iconWrapperNodeId:(function(){var w=iconWrap(el);return w?(w.getAttribute('data-sz-id')||null):null;}()),
    iconSize:(function(){var w=iconWrap(el);if(!w)return 32;return Math.round(parseFloat(window.getComputedStyle(w).width)||32);}()),
    iconIsBtn:!!iconAnchor(el),
    iconBtnHref:(function(){var a=iconAnchor(el);return a?(a.getAttribute('href')||'#'):null;}()),
    iconBtnTarget:(function(){var a=iconAnchor(el);return a?(a.getAttribute('target')||'_self'):null;}()),
    iconBtnNodeId:(function(){var a=iconAnchor(el);return a?(a.getAttribute('data-sz-id')||null):null;}()),
    isContainer:fb(el),isSec:fsec(el),
    videoAutoplay:t==='video'?dataEl.hasAttribute('autoplay'):false,
    videoLoop:t==='video'?dataEl.hasAttribute('loop'):false,
    videoMuted:t==='video'?dataEl.hasAttribute('muted'):false,
    videoControls:t==='video'?dataEl.hasAttribute('controls'):false,
    embedAllow:t==='iframe'?(dataEl.getAttribute('allow')||''):null,
    embedAllowFullscreen:t==='iframe'?dataEl.hasAttribute('allowfullscreen'):false,
    placeholder:fi(el)?(el.getAttribute('placeholder')||''):null,
    inputType:t==='input'?(el.getAttribute('type')||'text'):null,
    inputName:fi(el)?(el.getAttribute('name')||''):null,
    fontSize:Math.round(parseFloat(c.fontSize)||16),
    fontFamily:c.fontFamily,fontWeight:c.fontWeight,fontStyle:c.fontStyle,
    textAlign:c.textAlign,lineHeight:c.lineHeight,letterSpacing:c.letterSpacing,
    textDecoration:c.textDecoration,textTransform:c.textTransform,color:rh(c.color),
    backgroundColor:rh(c.backgroundColor),backgroundImage:c.backgroundImage,
    hasBgImage:!!_bgUrl,bgImageSrc:_bgUrl,backgroundPosition:c.backgroundPosition,backgroundSize:c.backgroundSize,
    backgroundRepeat:c.backgroundRepeat,backgroundAttachment:c.backgroundAttachment,backgroundBlendMode:c.backgroundBlendMode,
    paddingTop:pv(c.paddingTop),paddingRight:pv(c.paddingRight),
    paddingBottom:pv(c.paddingBottom),paddingLeft:pv(c.paddingLeft),
    marginTop:pv(c.marginTop),marginRight:pv(c.marginRight),
    marginBottom:pv(c.marginBottom),marginLeft:pv(c.marginLeft),
    width:c.width,height:c.height,minWidth:c.minWidth,maxWidth:c.maxWidth,
    objectFit:(t==='img'||t==='video')?(dataStyle.objectFit||'fill'):'fill',
    objectPosition:(t==='img'||t==='video')?(dataStyle.objectPosition||'50% 50%'):'50% 50%',
    borderRadius:c.borderRadius,border:c.border,borderWidth:c.borderWidth,borderStyle:c.borderStyle,borderColor:rh(c.borderColor)||c.borderColor||null,
    position:c.position,zIndex:c.zIndex,top:c.top,right:c.right,bottom:c.bottom,left:c.left,
    display:c.display,parentDisplay:pc?pc.display:null,flexDir:c.flexDirection,flexWrap:c.flexWrap,
    flexGrow:c.flexGrow,flexShrink:c.flexShrink,flexBasis:c.flexBasis,alignSelf:c.alignSelf,alignContent:c.alignContent,
    justifyContent:c.justifyContent,alignItems:c.alignItems,justifyItems:c.justifyItems,
    gap:c.gap,gridCols:c.gridTemplateColumns,gridRows:c.gridTemplateRows,gridAutoFlow:c.gridAutoFlow,rowGap:c.rowGap,columnGap:c.columnGap,gridColumn:c.gridColumn,gridRow:c.gridRow,
    opacity:c.opacity,boxShadow:c.boxShadow,filter:c.filter,backdropFilter:c.backdropFilter||c.webkitBackdropFilter||'none',mixBlendMode:c.mixBlendMode,overflow:c.overflow,
    responsiveMode:viewportMode,
    responsiveHasTabletOverrides:hasTabletResponsive,
    responsiveHasMobileOverrides:hasMobileResponsive,
    responsiveHasCurrentOverrides:hasCurrentResponsive,
    responsiveCurrentProps:responsiveCurrentProps,
    animationIn:animEl.getAttribute('data-sz-anim-in')||_computedAnimIn,
    animationHover:animEl.getAttribute('data-sz-hover-fx')||_computedHover,
    hasCustomEntranceAnimation:_computedAnimIn==='custom',
    hasCustomHoverAnimation:_computedHover==='custom',
    animationDuration:animEl.style.getPropertyValue('--sz-anim-duration')||(animStyle.animationDuration&&animStyle.animationDuration!=='0s'?animStyle.animationDuration:(animStyle.transitionDuration||'600ms')),
    animationDelay:animEl.style.getPropertyValue('--sz-anim-delay')||(animStyle.animationDelay&&animStyle.animationDelay!=='0s'?animStyle.animationDelay:(animStyle.transitionDelay||'0ms')),
    animationEase:animEl.style.getPropertyValue('--sz-anim-ease')||(animStyle.animationTimingFunction&&animStyle.animationTimingFunction!=='ease'?animStyle.animationTimingFunction:(animStyle.transitionTimingFunction||'cubic-bezier(0.22,1,0.36,1)')),
    secBg:sc?(rh(sc.backgroundColor)||null):null,
    secPadding:sc?sc.padding:null,
    secHasBgImage:!!_secBgUrl,secBgImageSrc:_secBgUrl,
    secBgPosition:sc?sc.backgroundPosition:'center',secBgSize:sc?sc.backgroundSize:'cover',
    sectionVisualNodeId:(!_secBgUrl&&secBackdrop)?(secBackdrop.getAttribute('data-sz-id')||null):null,
    sectionVisualSrc:(!_secBgUrl&&secBackdrop&&['img','video','iframe'].indexOf(secBackdropTag)>=0)?(secBackdrop.getAttribute('src')||null):null,
    sectionVisualKind:(!_secBgUrl&&secBackdropTag==='img')?'image':(!_secBgUrl&&secBackdropTag==='video')?'video':(!_secBgUrl&&secBackdropTag==='iframe')?'embed':null,
  };
}

var sel=null,hov=null,editing=false;
var undos=[],redos=[];
var styleBatch=null,styleBatchTimer=null;
var dragEl=null,dragGhost=null,dl=null,dropTarget=null,dropPos=null;
var mdEl=null,mdX=0,mdY=0,dragging=false;

// ── Resize + padding overlay ──────────────────────────────────────────────
var ov=null,rzEl=null,rzMode='',rzSX=0,rzSY=0,rzSW=0,rzSH=0;
var padEl=null,padSide='',padSX=0,padSY=0,padS0=0;
var chrome=null,chromeRole=null,chromeTitle=null,chromeMeta=null,chromeParentBtn=null,chromeEditBtn=null,chromeDupBtn=null,chromeDeleteBtn=null,hoverBadge=null,hoverRoleEl=null,hoverTitleEl=null;

function mkOv(){
  if(ov)return;
  ov=document.createElement('div');ov.id='sz-ov';
  ov.setAttribute('data-sz-ui','1');
  ov.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483646;display:none;overflow:visible;';
  document.body.appendChild(ov);
}

function posOv(){
  return;
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
  if(rzMode.indexOf('e')>=0||rzMode.indexOf('w')>=0){var nw=rzMode.indexOf('e')>=0?Math.max(20,rzSW+dx):Math.max(20,rzSW-dx);writeStyleValue(rzEl,'width',Math.round(nw)+'px');}
  if(rzMode.indexOf('s')>=0||rzMode.indexOf('n')>=0){var nh=rzMode.indexOf('s')>=0?Math.max(10,rzSH+dy):Math.max(10,rzSH-dy);writeStyleValue(rzEl,'height',Math.round(nh)+'px');}
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
  writeStyleValue(padEl,propMap[padSide],nv+'px');
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
function commitLive(){
  initIds();
  post('html-update',{html:snap()});
  if(sel&&document.body.contains(sel))post('select',describe(sel));
  posOv();
}
function flushStyleBatch(){
  if(styleBatchTimer){clearTimeout(styleBatchTimer);styleBatchTimer=null;}
  if(!styleBatch)return;
  rememberCurrent();
  styleBatch=null;
}
function touchStyleBatch(){
  if(styleBatchTimer)clearTimeout(styleBatchTimer);
  styleBatchTimer=setTimeout(flushStyleBatch,240);
}
function applyS(html){
  flushStyleBatch();
  document.body.innerHTML=html;
  sel=null;hov=null;editing=false;
  ov=null;mkOv();
  initIds();
  post('html-update',{html:snap()});
  syncStack();
  post('deselect',{});
}
function doUndo(){flushStyleBatch();if(undos.length<=1)return;redos.push(undos.pop());applyS(undos[undos.length-1]);}
function doRedo(){flushStyleBatch();if(!redos.length)return;var h=redos.pop();undos.push(h);applyS(h);}
function commit(){initIds();rememberCurrent();post('html-update',{html:snap()});if(sel&&document.body.contains(sel))post('select',describe(sel));posOv();}

function selEl(el){
  if(!el)return desel();
  if(sel===el&&!editing){return;} // already selected, nothing to do
  usel(sel);uhov(hov);
  // Also clear hover from any element that might have it
  var hovEls=document.querySelectorAll('[data-sz-hov]');
  for(var i=0;i<hovEls.length;i++){hovEls[i].removeAttribute('data-sz-hov');hovEls[i].removeAttribute('data-sz-sec-hov');}
  hov=null;
  post('hover-out',{});
  sel=el;eid(sel);msel(sel);
  post('select',describe(sel));posOv();
}
function desel(){
  if(editing)exitEdit();
  usel(sel);
  var hovEls=document.querySelectorAll('[data-sz-hov]');
  for(var i=0;i<hovEls.length;i++){hovEls[i].removeAttribute('data-sz-hov');hovEls[i].removeAttribute('data-sz-sec-hov');}
  sel=null;hov=null;
  post('hover-out',{});
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
  var tgt=iconUnit(sel)||sel,nxt=gpar(tgt)||gsec(tgt);
  pushU();desel();
  tgt.style.transition='opacity 120ms';tgt.style.opacity='0';
  setTimeout(function(){tgt.remove();commit();if(nxt&&document.body.contains(nxt))selEl(nxt);},130);
}
function dupEl(){
  if(!sel)return;pushU();
  var src=iconUnit(sel)||sel;
  var cl=src.cloneNode(true);
  ['data-sz-sel','data-sz-hov','data-sz-id','data-sz-sec','data-sz-key'].forEach(function(a){cl.removeAttribute(a);});
  cl.querySelectorAll('[data-sz-id],[data-sz-key]').forEach(function(c){c.removeAttribute('data-sz-id');c.removeAttribute('data-sz-key');});
  src.parentNode.insertBefore(cl,src.nextSibling);
  commit();selEl(reselectTarget(cl));
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
  if(hov&&hov!==sel){post('hover',describe(hov));}
  else{post('hover-out',{});}
}

function clearDl(){if(dl){dl.remove();dl=null;}dropTarget=null;dropPos=null;}
function showDl(el,pos){
  clearDl();dropTarget=el;dropPos=pos;if(pos==='inside')return;
  var r=el.getBoundingClientRect();dl=document.createElement('div');dl.className='sz-dl';
  dl.setAttribute('data-sz-ui','1');
  dl.style.cssText='left:'+r.left+'px;top:'+(pos==='before'?r.top-1:r.bottom-1)+'px;width:'+r.width+'px';
  document.body.appendChild(dl);
}
function bDrag(n,x,y){if(!n||editing)return;mdEl=iconUnit(n)||n;mdX=x;mdY=y;}
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
    var c=resolve(els[i]);
    c=iconUnit(c)||c;
    if(!c||c===dragEl||dragEl.contains(c))continue;
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
    commit();selEl(reselectTarget(dragEl));
  }
  clearDl();dragEl=null;dragging=false;mdEl=null;
}

function qsec(id){
  return id?document.querySelector('[data-sz-section-id="'+String(id).replace(/"/g,'\\\\"')+'"]'):null;
}
function lastContentSection(){
  var kids=Array.from(document.body.children).filter(function(c){return ['SCRIPT','STYLE','NOSCRIPT'].indexOf(c.tagName)<0&&c.getAttribute('data-sz-section-type')!=='footer';});
  return kids[kids.length-1]||null;
}
function contentContainer(sec){
  return sec?(sec.querySelector('div[style*="margin:0 auto"]')||sec):null;
}
function nearestForm(el){
  if(!el)return null;
  return el.tagName.toLowerCase()==='form'?el:(el.closest&&el.closest('form'));
}
function hasNestedForm(el){
  return !!(el&&el.querySelector&&el.querySelector('form'));
}
function isFormFieldNode(el){
  if(!el||!el.tagName)return false;
  var t=el.tagName.toLowerCase();
  return fi(el)||t==='label'||t==='fieldset'||t==='option';
}
function isBlockInsertNode(el){
  if(!el||!el.tagName)return false;
  var t=el.tagName.toLowerCase();
  if(['div','section','article','aside','nav','header','footer','figure','form','hr','blockquote'].indexOf(t)>=0)return true;
  return !!(el.querySelector&&el.querySelector('form,video,iframe,img,figure,blockquote,hr'));
}
function isInlineRef(el){
  if(!el||!el.tagName)return false;
  var t=el.tagName.toLowerCase();
  return fn(el)||fm(el)||fi(el)||['svg','hr','figure','blockquote','details'].indexOf(t)>=0;
}
function blockAnchor(el){
  if(!el||!el.closest)return el;
  return el.closest('p,h1,h2,h3,h4,h5,h6,blockquote,li,label,a,button,figcaption,td,th,summary')||el;
}
function fieldAnchor(el,form){
  if(!el||!form)return null;
  var wrap=el.closest&&el.closest('label,fieldset,[data-sz-field],div,p,li');
  return wrap&&form.contains(wrap)&&wrap!==form?wrap:el;
}
function placeInForm(form,node,ref){
  if(!form||!node)return;
  if((node.tagName&&node.tagName.toLowerCase()==='form')||hasNestedForm(node)){
    form.parentNode.insertBefore(node,form.nextSibling);
    return;
  }
  if(!isFormFieldNode(node)&&!hasNestedForm(node)){
    form.parentNode.insertBefore(node,form.nextSibling);
    return;
  }
  var submit=form.querySelector('button[type="submit"],input[type="submit"]');
  var anchor=fieldAnchor(ref,form);
  if(anchor&&anchor!==form&&anchor.parentNode){
    if(submit&&anchor===submit)form.insertBefore(node,submit);
    else anchor.parentNode.insertBefore(node,anchor.nextSibling);
    return;
  }
  if(submit)form.insertBefore(node,submit);
  else form.appendChild(node);
}
function insertSmart(node,placement,sectionId,nodeId){
  var ref=nodeId?document.querySelector('[data-sz-id="'+String(nodeId).replace(/"/g,'\\\\"')+'"]'):sel;
  if(!ref&&sel&&document.body.contains(sel))ref=sel;
  if(node&&node.getAttribute&&node.getAttribute('data-sz-icon')==='true'){
    var iconRef=iconUnit(ref)||ref;
    var iconForm=nearestForm(iconRef);
    if(iconForm){
      var formAnchor=(gact(iconRef)&&iconForm.contains(gact(iconRef)))?gact(iconRef):fieldAnchor(iconRef,iconForm);
      if(formAnchor&&formAnchor!==iconForm&&formAnchor.parentNode){
        formAnchor.parentNode.insertBefore(node,formAnchor.nextSibling);
        return node;
      }
      var submitEl=iconForm.querySelector('button[type="submit"],input[type="submit"]');
      if(submitEl)iconForm.insertBefore(node,submitEl);
      else iconForm.appendChild(node);
      return node;
    }
    var iconAct=gact(iconRef);
    if(iconAct&&iconAct.parentNode){
      iconAct.parentNode.insertBefore(node,iconAct.nextSibling);
      return node;
    }
    if(iconRef&&isInlineRef(iconRef)&&iconRef.parentNode&&iconRef.parentElement!==document.body){
      var safeAnchor=blockAnchor(iconRef);
      if(safeAnchor&&safeAnchor.parentNode&&safeAnchor.parentElement!==document.body){
        safeAnchor.parentNode.insertBefore(node,safeAnchor.nextSibling);
        return node;
      }
      iconRef.parentNode.insertBefore(node,iconRef.nextSibling);
      return node;
    }
    if(iconRef&&!fn(iconRef)&&!fm(iconRef)&&!fi(iconRef)&&!fsec(iconRef)){
      iconRef.appendChild(node);
      return node;
    }
    var iconSec=(iconRef&&gsec(iconRef))||qsec(sectionId)||lastContentSection();
    var iconCont=contentContainer(iconSec);
    if(iconCont)iconCont.appendChild(node); else document.body.appendChild(node);
    return node;
  }

  if(placement==='top'){
    document.body.insertBefore(node,document.body.firstElementChild);
    return node;
  }
  if(placement==='bottom'){
    document.body.appendChild(node);
    return node;
  }
  if(placement==='section'){
    var targetSec=(ref&&gsec(ref))||qsec(sectionId);
    if(targetSec&&targetSec.parentNode===document.body){
      targetSec.parentNode.insertBefore(node,targetSec.nextSibling);
      return node;
    }
    var footer=Array.from(document.body.children).find(function(c){return c.tagName==='FOOTER'||c.getAttribute('data-sz-section-type')==='footer';});
    if(footer)document.body.insertBefore(node,footer); else document.body.appendChild(node);
    return node;
  }

  var form=nearestForm(ref);
  if(form){
    placeInForm(form,node,ref);
    return node;
  }
  if(ref&&isInlineRef(ref)&&ref.parentNode&&ref.parentElement!==document.body){
    if(isBlockInsertNode(node)){
      var anchor=blockAnchor(ref);
      if(anchor&&anchor.parentNode&&anchor.parentElement!==document.body){
        anchor.parentNode.insertBefore(node,anchor.nextSibling);
        return node;
      }
    }
    ref.parentNode.insertBefore(node,ref.nextSibling);
    return node;
  }
  if(ref&&!fn(ref)&&!fm(ref)&&!fi(ref)&&!fsec(ref)){
    ref.appendChild(node);
    return node;
  }
  var sec=(ref&&gsec(ref))||qsec(sectionId)||lastContentSection();
  var cont=contentContainer(sec);
  if(cont)cont.appendChild(node); else document.body.appendChild(node);
  return node;
}

function qid(id){
  return id?document.querySelector('[data-sz-id="'+String(id).replace(/"/g,'\\\\"')+'"]'):null;
}
function animNameForPreset(name){
  var map={
    'fade-up':'sitezy-fade-up',
    'fade-down':'sitezy-fade-down',
    'fade-left':'sitezy-fade-left',
    'fade-right':'sitezy-fade-right',
    'zoom-in':'sitezy-zoom-in',
    'zoom-out':'sitezy-zoom-out'
  };
  return map[name]||'';
}
function shouldForceInlineBlock(el){
  if(!el||!el.tagName)return false;
  var tag=el.tagName.toLowerCase();
  if(['span','a','strong','em','small','label','b','i'].indexOf(tag)<0)return false;
  var display=window.getComputedStyle(el).display;
  return display==='inline';
}
function attrTarget(base,attr,nodeId){
  var explicit=qid(nodeId);
  if(explicit)return explicit;
  if(!base)return null;
  var act=gact(base);
  if((attr==='href'||attr==='target')&&act&&act.tagName&&act.tagName.toLowerCase()==='a'){
    return act;
  }
  if(['src','poster','alt','allow','allowfullscreen','autoplay','loop','muted','controls'].indexOf(attr)>=0){
    return mediaChild(base)||base;
  }
  return base;
}
function styleTarget(base,nodeId){
  var explicit=qid(nodeId);
  if(explicit)return explicit;
  return base;
}

document.addEventListener('mousemove',function(e){if(dragging||mdEl)uDrag(e);},true);
document.addEventListener('mouseover',function(e){
  if(dragging||mdEl)return;
  var nxt=resolve(e.target,e.clientX,e.clientY);if(nxt===hov)return;
  uhov(hov);hov=nxt;if(hov&&hov!==sel)mhov(hov);
  if(hov&&hov!==sel){post('hover',describe(hov));}
  else{post('hover-out',{});}
  posOv();
},true);
document.addEventListener('mouseout',function(e){
  if(dragging||editing)return;
  var t=e.target;if(!t||!t.removeAttribute)return;
  if(t===hov){uhov(hov);hov=null;post('hover-out',{});posOv();}
},true);
document.addEventListener('mousedown',function(e){if(e.button!==0)return;var t=resolve(e.target,e.clientX,e.clientY);if(!t||t===document.body)return;if(!editing){e.preventDefault();try{window.focus();}catch(ex){}}bDrag(t,e.clientX,e.clientY);},true);
document.addEventListener('mouseup',function(){eDrag();},true);
document.addEventListener('click',function(e){
  if(dragging)return;
  var t=resolve(e.target,e.clientX,e.clientY);
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
  if(dragging)return;
  var t=resolve(e.target,e.clientX,e.clientY);
  if(!t)return;
  // Double-click text → enter text editing mode
  if(fn(t)){e.preventDefault();e.stopPropagation();selEl(t);enterEdit();return;}
  // Double-click internal page link (nav, buttons, etc.) → navigate to that page
  var aEl=t.tagName&&t.tagName.toLowerCase()==='a'?t:(t.closest&&t.closest('a'));
  if(aEl){
    var dh=aEl.getAttribute('href')||'';
    if(dh&&!dh.startsWith('http')&&!dh.startsWith('//')&&!dh.startsWith('#')&&!dh.startsWith('mailto:')&&!dh.startsWith('tel:')){
      e.preventDefault();e.stopPropagation();
      try{window.parent.postMessage({source:'sitezy-editor',type:'navigate-page',payload:{href:dh}},'*');}catch(ex){}
      return;
    }
  }
},true);
document.addEventListener('click',function(e){
  var a=e.target.closest&&e.target.closest('a');
  if(!a)return;
  var href=a.getAttribute('href')||'';
  if(href.charAt(0)==='#'){
    var id=href.slice(1);
    if(id){
      var tgt=document.getElementById(id)||document.querySelector('[data-sz-section-id="'+id+'"]');
      if(tgt){e.preventDefault();e.stopPropagation();tgt.scrollIntoView({behavior:'smooth',block:'start'});return;}
      // No scroll target — treat hash as page slug
      e.preventDefault();
      try{window.parent.postMessage({source:'sitezy-editor',type:'navigate-page',payload:{href:'/'+id}},'*');}catch(ex){}
      return;
    }
    e.preventDefault();return;
  }
  if(!editing)e.preventDefault();
},true);
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
  // E key — toggle visual edit mode (tells parent to turn it off/on)
  if((e.key==='e'||e.key==='E')&&!mod&&!editing){
    e.preventDefault();
    post('toggle-edit-mode',{});
    return;
  }
  // I key — trigger Live Intelligence deep analysis for selected/hovered section
  if((e.key==='i'||e.key==='I')&&!mod&&!editing){
    e.preventDefault();
    var _liSrc=sel||hov||null;
    var _liSec=_liSrc?gsec(_liSrc):null;
    if(!_liSec&&document.body.children.length){
      // fall back to first visible section
      _liSec=Array.from(document.body.children).find(function(c){return ['SCRIPT','STYLE','NOSCRIPT'].indexOf(c.tagName)<0;})||null;
    }
    if(!_liSec)return;
    post('analyze-section',{
      sectionId:_liSec.getAttribute('data-sz-section-id')||null,
      sectionName:_liSec.getAttribute('data-sz-section-name')||null,
      sectionType:_liSec.getAttribute('data-sz-section-type')||null,
      sectionHtml:_liSec.outerHTML.slice(0,5000),
      nodeId:_liSrc?_liSrc.getAttribute('data-sz-id'):null,
      nodeTag:_liSrc?_liSrc.tagName.toLowerCase():null,
    });
    return;
  }
},false);
document.addEventListener('selectionchange',function(){if(editing&&sel)post('editing',describe(sel));});

window.addEventListener('message',function(e){
  if(!e.data||e.data.target!=='sitezy-iframe')return;
  var d=e.data;
  if(d.type==='apply-style'){
    if(!sel)return;
    var styleTgt=styleTarget(sel,d.nodeId);
    if(!styleTgt)return;
    if(d.batch){
      if(!styleBatch){styleBatch={type:'style',prop:d.prop};redos=[];}
      writeStyleValue(styleTgt,d.prop,d.value??d.val);
      commitLive();
      touchStyleBatch();
      return;
    }
    flushStyleBatch();
    pushU();writeStyleValue(styleTgt,d.prop,d.value??d.val);commit();
  }
  if(d.type==='apply-attr'){
    // If an explicit nodeId is given, resolve it directly — don't require sel to be set
    var _explicitTgt=d.nodeId?qid(d.nodeId):null;
    if(!sel&&!_explicitTgt)return;
    var tgt=attrTarget(_explicitTgt||sel,d.attr,d.nodeId);
    if(!tgt)return;
    // Keep sel in sync if it differs from the resolved target
    if(_explicitTgt&&sel!==_explicitTgt){sel=_explicitTgt;}
    pushU();
    var attrVal=d.value??d.val;
    // Setting href on a non-anchor → replace element with <a> so navigation works
    // Only convert when there's an actual non-empty href value
    if(d.attr==='href' && tgt.tagName.toLowerCase()!=='a' && attrVal!==null && attrVal!==undefined && attrVal!==''){
      var an=document.createElement('a');
      an.innerHTML=tgt.innerHTML;
      an.className=tgt.className;
      if(tgt.style.cssText)an.style.cssText=tgt.style.cssText;
      Array.from(tgt.attributes).forEach(function(at){if(at.name!=='type')an.setAttribute(at.name,at.value);});
      an.setAttribute('href',attrVal);
      tgt.parentNode.replaceChild(an,tgt);
      if(sel===tgt)sel=an;
      tgt=an;
    } else if(d.value===null||d.value===undefined){
      tgt.removeAttribute(d.attr);
    } else {
      tgt.setAttribute(d.attr,d.value??d.val);
    }
    if(tgt.tagName&&tgt.tagName.toLowerCase()==='video'&&(d.attr==='src'||d.attr==='poster')){
      try{tgt.load();}catch(err){}
    }
    commit();
  }
  if(d.type==='replace-svg'){if(!sel||sel.tagName.toLowerCase()!=='svg')return;pushU();sel.innerHTML=d.inner;if(d.stroke&&d.stroke!=='currentColor')sel.setAttribute('stroke',d.stroke);if(d.strokeWidth)sel.setAttribute('stroke-width',d.strokeWidth);commit();}
  if(d.type==='apply-icon-size'){
    var _iw=iconWrapById(d.wrapperNodeId);
    if(!_iw||!_iw.style)return;
    if(d.batch){if(!styleBatch){styleBatch={type:'style',prop:'width'};redos=[];}
      _iw.style.width=d.size+'px';_iw.style.height=d.size+'px';commitLive();touchStyleBatch();return;}
    pushU();_iw.style.width=d.size+'px';_iw.style.height=d.size+'px';commit();
  }
  if(d.type==='wrap-icon-btn'){
    var _iwb=iconWrapById(d.wrapperNodeId);
    if(!_iwb||!_iwb.parentNode)return;
    if(_iwb.parentElement&&_iwb.parentElement.tagName&&_iwb.parentElement.tagName.toLowerCase()==='a'){
      pushU();
      _iwb.parentElement.setAttribute('href',d.href||'#');
      if(d.target&&d.target!=='_self')_iwb.parentElement.setAttribute('target',d.target);
      else _iwb.parentElement.removeAttribute('target');
      commit();var _sve=_iwb.querySelector('svg');if(_sve)selEl(_sve);
      return;
    }
    pushU();
    var _ab=document.createElement('a');
    _ab.setAttribute('href',d.href||'#');
    _ab.style.cssText='display:inline-flex;align-items:center;justify-content:center;cursor:pointer;text-decoration:none;';
    if(d.target&&d.target!=='_self')_ab.setAttribute('target',d.target);
    var _par=_iwb.parentNode;_par.insertBefore(_ab,_iwb);_ab.appendChild(_iwb);
    eid(_ab);commit();var _svw=_iwb.querySelector('svg');if(_svw)selEl(_svw);
  }
  if(d.type==='unwrap-icon-btn'){
    var _iwu=iconWrapById(d.wrapperNodeId);
    if(!_iwu)return;
    var _au=_iwu.parentElement;
    if(!_au||!_au.tagName||_au.tagName.toLowerCase()!=='a')return;
    pushU();_au.parentNode.insertBefore(_iwu,_au);_au.remove();commit();var _svu=_iwu.querySelector('svg');if(_svu)selEl(_svu);
  }
  if(d.type==='apply-section-style'){
    var asec=sel?gsec(sel):null;
    if(!asec)return;
    if(d.batch){
      if(!styleBatch){styleBatch={type:'section-style',prop:d.prop};redos=[];}
      writeStyleValue(asec,d.prop,d.value??d.val);
      commitLive();
      touchStyleBatch();
      return;
    }
    flushStyleBatch();
    pushU();writeStyleValue(asec,d.prop,d.value??d.val);commit();
  }
  if(d.type==='apply-animation'){
    var animTgt=styleTarget(sel,d.nodeId);
    if(!animTgt)return;
    pushU();
    var hasEntrance=Object.prototype.hasOwnProperty.call(d,'entrance');
    var hasHover=Object.prototype.hasOwnProperty.call(d,'hover');
    var hasDuration=Object.prototype.hasOwnProperty.call(d,'duration');
    var hasDelay=Object.prototype.hasOwnProperty.call(d,'delay');
    var hasEase=Object.prototype.hasOwnProperty.call(d,'ease');
    if(shouldForceInlineBlock(animTgt))animTgt.style.display='inline-block';
    if(hasEntrance&&(!d.entrance||d.entrance==='none')){
      animTgt.removeAttribute('data-sz-anim-in');
      animTgt.style.animation='none';
      animTgt.style.removeProperty('animation-name');
      animTgt.style.removeProperty('animation-duration');
      animTgt.style.removeProperty('animation-delay');
      animTgt.style.removeProperty('animation-timing-function');
      animTgt.style.removeProperty('animation-fill-mode');
      animTgt.style.removeProperty('will-change');
    }else if(hasEntrance){
      animTgt.style.animation='none';
      void animTgt.offsetWidth;
      animTgt.style.removeProperty('animation');
      animTgt.setAttribute('data-sz-anim-in',String(d.entrance));
      var animName=animNameForPreset(String(d.entrance));
      if(animName)animTgt.style.setProperty('animation-name',animName);
      else animTgt.style.removeProperty('animation-name');
      animTgt.style.setProperty('animation-duration',String(d.duration||'600ms'));
      animTgt.style.setProperty('animation-delay',String(d.delay||'0ms'));
      animTgt.style.setProperty('animation-timing-function',String(d.ease||'cubic-bezier(0.22,1,0.36,1)'));
      animTgt.style.setProperty('animation-fill-mode','both');
      animTgt.style.setProperty('will-change','transform, opacity');
    }
    if(hasHover&&(!d.hover||d.hover==='none')){
      animTgt.removeAttribute('data-sz-hover-fx');
      animTgt.removeAttribute('data-sz-hover-preview');
      if(animTgt.__szHoverPreviewTimer){clearTimeout(animTgt.__szHoverPreviewTimer);animTgt.__szHoverPreviewTimer=null;}
      animTgt.style.transition='none';
      animTgt.style.removeProperty('transition-property');
      animTgt.style.removeProperty('transition-duration');
      animTgt.style.removeProperty('transition-delay');
      animTgt.style.removeProperty('transition-timing-function');
      animTgt.style.removeProperty('--sz-hover-base-transform');
      animTgt.style.removeProperty('--sz-hover-base-shadow');
    }else if(hasHover){
      animTgt.style.removeProperty('transition');
      animTgt.setAttribute('data-sz-hover-fx',String(d.hover));
      var animCs=window.getComputedStyle(animTgt);
      var animBaseTransform=animCs.transform&&animCs.transform!=='none'?animCs.transform:'translateZ(0px)';
      var animBaseShadow=animCs.boxShadow&&animCs.boxShadow!=='none'?animCs.boxShadow:'none';
      animTgt.style.setProperty('--sz-hover-base-transform',animBaseTransform);
      animTgt.style.setProperty('--sz-hover-base-shadow',animBaseShadow);
      animTgt.style.setProperty('transition-property','transform, box-shadow, filter, opacity');
      animTgt.style.setProperty('transition-duration',String(d.duration||'280ms'));
      animTgt.style.setProperty('transition-delay',String(d.delay||'0ms'));
      animTgt.style.setProperty('transition-timing-function',String(d.ease||'cubic-bezier(0.22,1,0.36,1)'));
      animTgt.style.setProperty('will-change','transform, box-shadow, filter, opacity');
      animTgt.setAttribute('data-sz-hover-preview','1');
      if(animTgt.__szHoverPreviewTimer)clearTimeout(animTgt.__szHoverPreviewTimer);
      animTgt.__szHoverPreviewTimer=setTimeout(function(){
        animTgt.removeAttribute('data-sz-hover-preview');
        animTgt.__szHoverPreviewTimer=null;
      },1400);
    }
    if(hasDuration){
      if(d.duration)animTgt.style.setProperty('--sz-anim-duration',String(d.duration));
      else animTgt.style.removeProperty('--sz-anim-duration');
      if(animTgt.getAttribute('data-sz-anim-in'))animTgt.style.setProperty('animation-duration',String(d.duration||'600ms'));
      if(animTgt.getAttribute('data-sz-hover-fx'))animTgt.style.setProperty('transition-duration',String(d.duration||'280ms'));
    }
    if(hasDelay){
      if(d.delay)animTgt.style.setProperty('--sz-anim-delay',String(d.delay));
      else animTgt.style.removeProperty('--sz-anim-delay');
      if(animTgt.getAttribute('data-sz-anim-in'))animTgt.style.setProperty('animation-delay',String(d.delay||'0ms'));
      if(animTgt.getAttribute('data-sz-hover-fx'))animTgt.style.setProperty('transition-delay',String(d.delay||'0ms'));
    }
    if(hasEase){
      if(d.ease)animTgt.style.setProperty('--sz-anim-ease',String(d.ease));
      else animTgt.style.removeProperty('--sz-anim-ease');
      if(animTgt.getAttribute('data-sz-anim-in'))animTgt.style.setProperty('animation-timing-function',String(d.ease||'cubic-bezier(0.22,1,0.36,1)'));
      if(animTgt.getAttribute('data-sz-hover-fx'))animTgt.style.setProperty('transition-timing-function',String(d.ease||'cubic-bezier(0.22,1,0.36,1)'));
    }
    commit();
  }
  if(d.type==='start-edit'){if(sel)enterEdit();}
  if(d.type==='stop-edit'){if(editing)exitEdit();}
  if(d.type==='deselect'){if(editing)exitEdit();desel();}
  if(d.type==='replace-src'){if(!sel||sel.tagName.toLowerCase()!=='img')return;pushU();sel.setAttribute('src',d.url);sel.removeAttribute('srcset');commit();}
  if(d.type==='delete'){delEl();}
  if(d.type==='duplicate'){dupEl();}
  if(d.type==='move-up'){moveSec(-1);}
  if(d.type==='move-down'){moveSec(1);}
  if(d.type==='sec-bg'){var s=sel?gsec(sel):null;if(!s)return;pushU();s.style.backgroundColor=d.color;commit();}
  if(d.type==='sec-pad'){var s2=sel?gsec(sel):null;if(!s2)return;pushU();writeStyleValue(s2,'padding',d.top+'px '+d.right+'px '+d.bottom+'px '+d.left+'px');commit();}
  if(d.type==='set-viewport-mode'){
    viewportMode=d.device==='tablet'||d.device==='mobile'?d.device:'desktop';
    refreshResponsive();
    setTimeout(function(){if(sel&&document.body.contains(sel)){post('select',describe(sel));posOv();}},16);
  }
  if(d.type==='clear-responsive-overrides'){
    if(viewportMode==='desktop')return;
    var ids=Array.isArray(d.nodeIds)?d.nodeIds:[];
    var targets=ids.map(function(id){return qid(id);}).filter(Boolean);
    if(!targets.length&&sel)targets=[sel];
    targets=uniqueEls(targets);
    if(!targets.length)return;
    pushU();
    targets.forEach(function(target){clearResponsiveOverride(target,viewportMode);});
    refreshResponsive();
    commit();
  }
  if(d.type==='clear-responsive-property'){
    if(viewportMode==='desktop')return;
    var propIds=Array.isArray(d.nodeIds)?d.nodeIds:[];
    var propTargets=propIds.map(function(id){return qid(id);}).filter(Boolean);
    if(!propTargets.length&&sel)propTargets=[sel];
    propTargets=uniqueEls(propTargets);
    var props=Array.isArray(d.props)?d.props.filter(Boolean):[];
    if(!propTargets.length||!props.length)return;
    pushU();
    propTargets.forEach(function(target){
      var attr=responsiveAttrName(viewportMode);
      if(!attr)return;
      var map=decodeResponsiveMap(target.getAttribute(attr));
      props.forEach(function(prop){delete map[prop];});
      if(Object.keys(map).length)target.setAttribute(attr,encodeResponsiveMap(map));
      else target.removeAttribute(attr);
    });
    refreshResponsive();
    commit();
  }
  if(d.type==='set-visibility-current'){
    var currentIds=Array.isArray(d.nodeIds)?d.nodeIds:[];
    var currentTargets=currentIds.map(function(id){return qid(id);}).filter(Boolean);
    if(!currentTargets.length&&sel)currentTargets=[sel];
    currentTargets=uniqueEls(currentTargets);
    if(!currentTargets.length)return;
    pushU();
    currentTargets.forEach(function(target){setVisibilityForMode(target,viewportMode,!!d.visible);});
    refreshResponsive();
    commit();
  }
  if(d.type==='set-visibility-exclusive'){
    var onlyIds=Array.isArray(d.nodeIds)?d.nodeIds:[];
    var onlyTargets=onlyIds.map(function(id){return qid(id);}).filter(Boolean);
    if(!onlyTargets.length&&sel)onlyTargets=[sel];
    onlyTargets=uniqueEls(onlyTargets);
    if(!onlyTargets.length)return;
    pushU();
    onlyTargets.forEach(function(target){setExclusiveVisibility(target,d.device);});
    refreshResponsive();
    commit();
  }
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
    if(_ie){pushU();document.body.insertBefore(_ie,document.body.firstElementChild);commit();selEl(_ie);}
  }
  if(d.type==='insert-bottom'){
    var _ib=document.createElement('div');_ib.innerHTML=d.html||'';
    var _ibe=_ib.firstElementChild;
    if(_ibe){pushU();document.body.appendChild(_ibe);commit();selEl(_ibe);}
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
      commit();selEl(_iae);
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
      commit();selEl(_ise);
    }
  }
  if(d.type==='insert-smart'){
    var _sm=document.createElement('div');_sm.innerHTML=d.html||'';
    var _sme=_sm.firstElementChild;
    if(_sme){
      pushU();
      insertSmart(_sme,d.placement||'inline',d.sectionId||null,d.nodeId||null);
      commit();
      // For icon spans, select the SVG inside so the icon panel opens immediately
      var _selTarget=(_sme.tagName&&_sme.tagName.toLowerCase()==='span'&&_sme.getAttribute('data-sz-icon')==='true')?(_sme.querySelector('svg')||_sme):_sme;
      selEl(_selTarget);
    }
  }
  // trigger-analysis: parent asks iframe to send back the selected/active section HTML
  if(d.type==='trigger-analysis'){
    var _taSrc=sel||hov||null;
    var _taSec=_taSrc?gsec(_taSrc):null;
    if(!_taSec&&document.body.children.length){
      _taSec=Array.from(document.body.children).find(function(c){return ['SCRIPT','STYLE','NOSCRIPT'].indexOf(c.tagName)<0;})||null;
    }
    if(!_taSec)return;
    post('analyze-section',{
      sectionId:_taSec.getAttribute('data-sz-section-id')||null,
      sectionName:_taSec.getAttribute('data-sz-section-name')||null,
      sectionType:_taSec.getAttribute('data-sz-section-type')||null,
      sectionHtml:_taSec.outerHTML.slice(0,5000),
      nodeId:_taSrc?_taSrc.getAttribute('data-sz-id'):null,
      nodeTag:_taSrc?_taSrc.tagName.toLowerCase():null,
    });
  }
});

mkOv();initIds();undos.push(snap());post('ready',{u:false,r:false});
window.addEventListener('scroll',posOv,true);window.addEventListener('resize',posOv);
})();
</scr`+`ipt>`;
}
