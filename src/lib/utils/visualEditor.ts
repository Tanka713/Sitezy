export function buildVisualEditorScript(): string {
  return `<script>
(function(){
'use strict';
if(document.documentElement.hasAttribute('data-sz-boot'))return;
document.documentElement.setAttribute('data-sz-boot','1');

var css=document.createElement('style');
css.textContent=
  '[data-sz-sel]{outline:2px solid #4f7eff!important;outline-offset:3px!important;box-shadow:0 0 0 6px rgba(79,126,255,.15)!important;transition:outline-offset .1s ease,box-shadow .1s ease;}'+
  '[data-sz-sel][data-sz-sec]{outline-color:#2dd4bf!important;box-shadow:0 0 0 6px rgba(45,212,191,.14)!important}'+
  '[data-sz-hov]:not([data-sz-sel]){outline:1.5px dashed rgba(100,120,255,.58)!important;outline-offset:3px!important;box-shadow:0 0 0 4px rgba(100,120,255,.08)!important;transition:outline .08s ease,box-shadow .08s ease;}'+
  '[contenteditable=true]{outline:2px solid #22d3ee!important;outline-offset:2px!important;caret-color:#22d3ee!important}'+
  '[data-sz-drag]{opacity:1!important;outline:none!important}'+
  'body.sz-dragging [data-sz-hov]{outline:none!important}'+
  'body{user-select:none!important;-webkit-user-select:none!important}'+
  'body.sz-editing [contenteditable=true]{user-select:text!important;-webkit-user-select:text!important}'+
  '.sz-dl{position:fixed;pointer-events:none;z-index:2147483647;height:2px;border-radius:2px;background:#4f7eff;box-shadow:0 0 6px rgba(79,126,255,.5)}'+
  'svg *{pointer-events:none!important}'+
  'iframe:not([data-sz-ui]),video:not([data-sz-ui]){pointer-events:none!important}'+
  '[data-sz-hover-lock="1"]{animation:none!important}'+
  '[data-sz-hover-lock="1"] *{animation:none!important;transition:none!important;transform:none!important;box-shadow:none!important;filter:none!important}'+
  '[data-sz-motion-lock="1"] *{animation:none!important;transition:none!important}'+
  '[data-sz-logo-track="1"],[class^="mq-"] .track,[class*=" mq-"] .track{display:flex!important;align-items:center!important;gap:18px!important;width:max-content!important;animation:sitezy-logo-marquee 22s linear infinite!important}'+
  '[data-sz-logo-track="1"] > *,[class^="mq-"] .track > *,[class*=" mq-"] .track > *{flex:0 0 auto!important}'+
  '[data-sz-hover-fx="lift"][data-sz-hover-preview="1"],[data-sz-hover-fx="lift"]:hover{transform:var(--sz-hover-base-transform,translateZ(0px)) translateY(-6px)!important;box-shadow:var(--sz-hover-base-shadow,none),0 18px 36px rgba(0,0,0,.14)!important}'+
  '[data-sz-hover-fx="grow"][data-sz-hover-preview="1"],[data-sz-hover-fx="grow"]:hover{transform:var(--sz-hover-base-transform,translateZ(0px)) scale(1.03)!important}'+
  '[data-sz-hover-fx="tilt"][data-sz-hover-preview="1"],[data-sz-hover-fx="tilt"]:hover{transform:var(--sz-hover-base-transform,translateZ(0px)) rotate(-1.5deg) translateY(-3px)!important}'+
  '[data-sz-hover-fx="glow"][data-sz-hover-preview="1"],[data-sz-hover-fx="glow"]:hover{box-shadow:var(--sz-hover-base-shadow,none),0 0 0 1px rgba(124,58,237,.16),0 0 26px rgba(124,58,237,.28)!important}'+
  '[data-sz-hover-fx="soften"][data-sz-hover-preview="1"],[data-sz-hover-fx="soften"]:hover{filter:brightness(1.03) saturate(1.05)!important}'+
  '@keyframes sitezy-logo-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}';
document.head.appendChild(css);

var TXT=['h1','h2','h3','h4','h5','h6','p','span','a','li','button','label','strong','em','small','figcaption','blockquote','td','th','summary','legend','caption','dt','dd'];
var MED=['img','video','picture','iframe'];
var INP=['input','textarea','select','option'];
var BLK=['section','div','article','aside','header','footer','main','nav','ul','ol','form','figure','details','dialog','table','thead','tbody','tfoot','tr'];
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
function ra(c){
  if(!c||c==='transparent'||c==='rgba(0, 0, 0, 0)')return 0;
  var rgba=c.match(/rgba\\((\\d+),\\s*(\\d+),\\s*(\\d+),\\s*([\\d.]+)\\)/i);
  if(rgba){
    var parsed=parseFloat(rgba[4]);
    return isNaN(parsed)?1:Math.max(0,Math.min(1,parsed));
  }
  return 1;
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
function animationTarget(el,dataEl,act,mode){
  if(mode==='hover'){
    if(act&&act.tagName){
      var at=act.tagName.toLowerCase();
      if(at==='a'||at==='button')return act;
    }
    if(el&&pickable(el)&&!fn(el)&&!fm(el)&&!fi(el))return el;
    if(dataEl&&dataEl!==el&&pickable(el)&&!fn(dataEl))return el;
  }
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
function textChild(el,act){
  if(!el||!el.tagName)return null;
  var t=el.tagName.toLowerCase();
  if(fn(el)||fi(el))return el;
  if(!el.querySelectorAll)return null;
  var candidates=Array.from(el.querySelectorAll('h1,h2,h3,h4,h5,h6,p,blockquote,figcaption,li,span,label,small,strong,em,summary,td,th,legend,caption,dt,dd,a,button,div'));
  for(var i=0;i<candidates.length&&i<40;i++){
    var candidate=candidates[i];
    if(!candidate||!candidate.tagName||candidate.hasAttribute('data-sz-ui'))continue;
    if(candidate.querySelector&&candidate.querySelector('img,video,iframe,input,textarea,select,form'))continue;
    if(!String(candidate.innerText||'').trim())continue;
    if(candidate.children&&candidate.children.length>0){
      var childTags=Array.from(candidate.children).map(function(child){return child.tagName?child.tagName.toLowerCase():'';});
      if(childTags.some(function(tag){return ['section','article','aside','header','footer','main','nav','ul','ol','form','figure','details','dialog','table','thead','tbody','tfoot','tr','h1','h2','h3','h4','h5','h6','p','blockquote','figcaption','li'].indexOf(tag)>=0;}))continue;
    }
    return candidate;
  }
  if(String(el.innerText||'').trim()&&(!el.children||el.children.length<=1)&&!el.querySelector('img,video,iframe,input,textarea,select,form,ul,ol,nav,section,article,aside')){
    return el;
  }
  if((t==='a'||t==='button')&&String(el.innerText||'').trim())return el;
  if(act&&act.tagName){
    var at=act.tagName.toLowerCase();
    if((at==='a'||at==='button')&&String(act.innerText||'').trim())return act;
  }
  return null;
}
function decorativeTextValue(text){
  var value=String(text||'').trim();
  if(!value)return false;
  var compact=value.replace(/\s+/g,'');
  if(!compact)return false;
  if(!/[A-Za-z0-9]/.test(compact)&&compact.length<=8)return true;
  var decorative='★☆✦✧•◦▪▫■□◆◇◎◉○●◌⬤⬥⚡🔥💡🚀📍🎯✨⭐🌟❖❋❂❈❉❊✳✴✶✹✺✸✚➜➤➔→←↑↓';
  return Array.from(compact).every(function(ch){
    var cp=ch&&ch.codePointAt?ch.codePointAt(0):0;
    return decorative.indexOf(ch)>=0 || cp>0x1f000;
  });
}
function replaceTextWithIcon(iconNode,nodeId){
  var target=(nodeId?qid(nodeId):null)||textChild(sel,gact(sel))||sel;
  if(!target||!target.tagName)return null;
  var textTgt=textChild(target,gact(target))||target;
  if(!textTgt||!textTgt.tagName)return null;
  var tag=textTgt.tagName.toLowerCase();
  var textValue=String(textTgt.innerText||'').trim();
  if(!decorativeTextValue(textValue))return null;
  fitIconToText(iconNode,textTgt);
  if(tag==='input'||tag==='textarea'||tag==='select')return null;
  var directText=Array.from(textTgt.childNodes).find(function(node){
    return node&&node.nodeType===3&&String(node.nodeValue||'').trim();
  });
  if(directText&&directText.parentNode){
    directText.parentNode.insertBefore(iconNode,directText);
    directText.parentNode.removeChild(directText);
    return iconNode;
  }
  if((tag==='a'||tag==='button')&&textTgt.children&&textTgt.children.length){
    var labelEl=Array.from(textTgt.children).find(function(child){
      return child&&child.tagName&&!child.querySelector('img,video,iframe,svg,input,textarea,select')&&String(child.innerText||'').trim();
    });
    if(labelEl&&labelEl.parentNode){
      labelEl.parentNode.replaceChild(iconNode,labelEl);
      return iconNode;
    }
  }
  if(textTgt.parentNode&&textTgt.parentElement!==document.body&&tag!=='a'&&tag!=='button'){
    textTgt.parentNode.replaceChild(iconNode,textTgt);
    return iconNode;
  }
  return null;
}
function logoRoot(el){
  if(!el||!el.closest)return null;
  return el.closest('[data-sz-logo-scroller="1"],[data-sz-logo-wall="1"],[class^="mq-"],[class*=" mq-"]');
}
function logoTrack(el){
  var root=logoRoot(el)||el;
  if(!root||!root.querySelector)return null;
  return root.querySelector('[data-sz-logo-track="1"],.track')||root;
}
function logoItems(el){
  var track=logoTrack(el);
  if(!track||!track.children)return [];
  var items=Array.from(track.children).filter(function(child){
    return child&&child.tagName&&!child.hasAttribute('data-sz-ui');
  });
  var root=logoRoot(el);
  if(root&&root.getAttribute&&root.getAttribute('data-sz-logo-scroller')!==null&&items.length>=2&&items.length%2===0){
    var half=items.length/2;
    var left=items.slice(0,half).map(function(item){
      var img=item.querySelector&&item.querySelector('img');
      return img&&img.getAttribute('src')?img.getAttribute('src'):String(item.innerText||'').trim();
    });
    var right=items.slice(half).map(function(item){
      var img=item.querySelector&&item.querySelector('img');
      return img&&img.getAttribute('src')?img.getAttribute('src'):String(item.innerText||'').trim();
    });
    var repeated=left.length===right.length&&left.every(function(value,index){return value===right[index];});
    if(repeated)return items.slice(0,half);
  }
  return items;
}
function collectionRoot(el){
  if(!el||!el.closest)return null;
  return el.closest('[data-sz-collection-kind]');
}
function collectionMeta(el){
  var root=collectionRoot(el)||el;
  if(!root||!root.getAttribute)return null;
  var kind=root.getAttribute('data-sz-collection-kind');
  if(!kind)return null;
  var fields=[];
  try{
    var raw=JSON.parse(root.getAttribute('data-sz-collection-fields')||'[]');
    if(Array.isArray(raw)){
      fields=raw.map(function(def){
        return {
          key:String(def&&def.key||'').trim(),
          label:String(def&&def.label||def&&def.key||'').trim(),
          type:def&&typeof def.type==='string'?String(def.type):'text',
          placeholder:def&&def.placeholder?String(def.placeholder):'',
        };
      }).filter(function(def){return !!def.key;});
    }
  }catch(e){}
  return {
    root:root,
    kind:kind,
    label:root.getAttribute('data-sz-collection-label')||kind,
    fields:fields,
    fixed:root.getAttribute('data-sz-collection-fixed')==='1',
  };
}
function collectionItemsContainer(el){
  var root=collectionRoot(el)||el;
  if(!root||!root.querySelector)return root;
  return root.querySelector('[data-sz-collection-items="1"]')||root;
}
function collectionItemNodes(el){
  var container=collectionItemsContainer(el);
  if(!container||!container.children)return [];
  return Array.from(container.children).filter(function(child){
    return child&&child.tagName&&child.getAttribute&&child.getAttribute('data-sz-item')==='1';
  });
}
function collectionFieldNode(item,key){
  if(!item||!item.querySelectorAll)return null;
  var matches=item.querySelectorAll('[data-sz-field="'+key+'"]');
  for(var i=0;i<matches.length;i++){
    var match=matches[i];
    if(match&&match.closest&&match.closest('[data-sz-item="1"]')===item)return match;
  }
  return null;
}
function collectionListValue(node){
  if(!node)return '';
  var items=Array.from(node.querySelectorAll('[data-sz-list-item="1"]')).filter(function(child){
    return child&&child.closest&&child.closest('[data-sz-field]')===node;
  });
  if(!items.length&&node.children){
    items=Array.from(node.children).filter(function(child){return child&&child.tagName;});
  }
  return items.map(function(item){
    var label=item.querySelector&&item.querySelector('[data-sz-list-item-text="1"]');
    return String((label?label.innerText:item.innerText)||'').trim();
  }).filter(Boolean).join('\\n');
}
function readCollectionField(item,def){
  var node=collectionFieldNode(item,def.key);
  if(!node)return '';
  var type=(node.getAttribute&&node.getAttribute('data-sz-field-type'))||def.type||'text';
  var tag=node.tagName?node.tagName.toLowerCase():'';
  if(type==='image')return node.getAttribute('src')||'';
  if(type==='list')return collectionListValue(node);
  if(tag==='input'||tag==='textarea'||tag==='select')return String(node.value||'').trim();
  return String(node.innerText||node.textContent||'').trim();
}
function collectionData(el){
  var meta=collectionMeta(el);
  if(!meta||!meta.fields.length)return null;
  var items=collectionItemNodes(meta.root).map(function(item,index){
    var fields={};
    meta.fields.forEach(function(def){fields[def.key]=readCollectionField(item,def);});
    var title='';
    meta.fields.some(function(def){
      var value=String(fields[def.key]||'').trim();
      if(value){title=value;return true;}
      return false;
    });
    return {
      id:item.getAttribute('data-sz-item-key')||('item-'+(index+1)),
      title:title||('Item '+(index+1)),
      fields:fields,
    };
  });
  return {
    root:meta.root,
    kind:meta.kind,
    label:meta.label,
    fields:meta.fields,
    items:items,
    fixed:meta.fixed,
  };
}
function setCollectionTextValue(node,value){
  if(!node)return;
  var tag=node.tagName?node.tagName.toLowerCase():'';
  var next=String(value||'');
  if(tag==='input'||tag==='textarea'||tag==='select'){
    node.value=next;
    node.setAttribute('value',next);
    return;
  }
  var directText=Array.from(node.childNodes||[]).find(function(child){
    return child&&child.nodeType===3&&String(child.nodeValue||'').trim();
  });
  if(directText){
    directText.nodeValue=next;
    return;
  }
  node.textContent=next;
}
function setCollectionListValue(node,value){
  if(!node)return;
  var lines=String(value||'').split('\\n').map(function(line){return String(line||'').trim();}).filter(Boolean);
  var template=node.querySelector&&node.querySelector('[data-sz-list-item="1"]');
  node.innerHTML='';
  if(!lines.length)return;
  for(var i=0;i<lines.length;i++){
    var line=lines[i];
    var nextItem=template&&template.cloneNode?template.cloneNode(true):document.createElement(node.tagName&&node.tagName.toLowerCase()==='ol'?'li':'li');
    if(nextItem&&nextItem.setAttribute)nextItem.setAttribute('data-sz-list-item','1');
    var label=nextItem.querySelector&&nextItem.querySelector('[data-sz-list-item-text="1"]');
    if(label)label.textContent=line;
    else{
      nextItem.textContent='';
      var span=document.createElement('span');
      span.setAttribute('data-sz-list-item-text','1');
      span.textContent=line;
      nextItem.appendChild(span);
    }
    node.appendChild(nextItem);
  }
}
function syncCollectionLinkField(anchor,attr,value){
  if(!anchor||!anchor.closest||attr!=='href')return;
  var item=anchor.closest('[data-sz-item="1"]');
  if(!item)return;
  var collection=item.closest('[data-sz-collection-kind]');
  if(!collection||!collection.getAttribute)return;
  var kind=collection.getAttribute('data-sz-collection-kind')||'';
  if(['nav-links','footer-links','social-links','blog-grid'].indexOf(kind)<0)return;
  var urlField=collectionFieldNode(item,'url');
  if(urlField)setCollectionTextValue(urlField,String(value||''));
}
function syncCollectionDecorators(item,fields){
  if(!item||!fields)return;
  var collection=item.closest&&item.closest('[data-sz-collection-kind]');
  var collectionKind=collection&&collection.getAttribute?collection.getAttribute('data-sz-collection-kind'):'';
  var collectionItems=collection?collectionItemNodes(collection):[];
  var itemIndex=collectionItems.indexOf(item);
  var initial=item.querySelector&&item.querySelector('[data-sz-avatar-initial="1"]');
  if(initial){
    var seed=String(fields.name||fields.title||fields.plan||fields.question||'').trim();
    initial.textContent=seed?seed.charAt(0).toUpperCase():'•';
  }
  var image=collectionFieldNode(item,'image');
  if(image&&image.tagName&&image.tagName.toLowerCase()==='img'&&(fields.alt||fields.name||fields.label||fields.title)){
    image.setAttribute('alt',String(fields.alt||fields.name||fields.label||fields.title));
  }
  if(collectionKind==='comparison'){
    ['primary','secondary','tertiary'].forEach(function(key,idx){
      var cell=collectionFieldNode(item,key);
      if(!cell||!cell.style)return;
      var raw=String(fields[key]||'').trim().toLowerCase();
      var positive=['✓','yes','true','included','available','supported','1'].indexOf(raw)>=0;
      var negative=['✗','no','false','not included','unsupported','0','-','—'].indexOf(raw)>=0;
      cell.style.fontWeight='700';
      cell.style.color=positive?(idx===0?'var(--sz-comparison-primary-color, #7c3aed)':'#22c55e'):negative?'#ef4444':'';
    });
  }
  if(collectionKind==='social-links'){
    var anchor=item.tagName&&item.tagName.toLowerCase()==='a'?item:(item.querySelector&&item.querySelector('a'));
    if(anchor){
      anchor.setAttribute('href',String(fields.url||'#'));
      anchor.setAttribute('title',String(fields.platform||'Social'));
    }
    var icon=item.querySelector&&item.querySelector('[data-sz-social-icon="1"]');
    if(icon){
      icon.innerHTML='<path d="'+socialIconPath(String(fields.platform||''))+'"></path>';
    }
  }
  if(collectionKind==='nav-links'){
    var navAnchor=item.querySelector&&item.querySelector('[data-sz-nav-link="1"]');
    if(navAnchor){
      navAnchor.setAttribute('href',String(fields.url||'#'));
      navAnchor.setAttribute('title',String(fields.label||'Link'));
    }
  }
  if(collectionKind==='footer-links'){
    var footerAnchor=item.querySelector&&item.querySelector('[data-sz-footer-link="1"]');
    if(footerAnchor){
      footerAnchor.setAttribute('href',String(fields.url||'#'));
      footerAnchor.setAttribute('title',String(fields.label||'Link'));
    }
  }
  if(collectionKind==='footer-columns'){
    var linksNode=collectionFieldNode(item,'links');
    if(linksNode){
      var lines=String(fields.links||'').split('\\n').map(function(line){return String(line||'').trim();}).filter(Boolean);
      linksNode.innerHTML=lines.map(function(label){
        return '<a data-sz-footer-column-link="1" href="#" style="color:rgba(255,255,255,.6);text-decoration:none;font-size:13px;">'+label.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</a>';
      }).join('');
      if(!lines.length)linksNode.innerHTML='';
    }
  }
  if(collectionKind==='tabs'&&collection&&itemIndex>=0){
    var trigger=collection.querySelector('[data-sz-tab-trigger-index="'+itemIndex+'"] [data-sz-tab-label="1"]');
    if(trigger)trigger.textContent=String(fields.label||'Tab');
    var panel=collection.querySelector('[data-sz-tab-panel-index="'+itemIndex+'"] [data-sz-tab-body="1"]');
    if(panel)panel.textContent=String(fields.body||'');
  }
  if(collectionKind==='pricing-toggle-plans'&&collection&&itemIndex>=0){
    ['monthly','yearly'].forEach(function(mode){
      var card=collection.querySelector('[data-sz-pricing-mode="'+mode+'"] [data-sz-pricing-card="'+itemIndex+'"]');
      if(!card)return;
      var price=mode==='monthly'?String(fields.monthlyPrice||'0'):String(fields.yearlyPrice||'0');
      var period=mode==='monthly'?'/mo':'/mo billed yearly';
      var plan=card.querySelector('[data-sz-pricing-part="plan"]');
      var priceNode=card.querySelector('[data-sz-pricing-part="price"]');
      var periodNode=card.querySelector('[data-sz-pricing-part="period"]');
      var descNode=card.querySelector('[data-sz-pricing-part="description"]');
      var ctaNode=card.querySelector('[data-sz-pricing-part="cta"]');
      var featuresNode=card.querySelector('[data-sz-pricing-part="features"]');
      if(plan)plan.textContent=String(fields.plan||'Plan');
      if(priceNode)priceNode.textContent='$'+price;
      if(periodNode)periodNode.textContent=period;
      if(descNode)descNode.textContent=String(fields.description||'');
      if(ctaNode)ctaNode.textContent=String(fields.cta||'Choose plan');
      if(featuresNode)setCollectionListValue(featuresNode,String(fields.features||''));
    });
  }
  if(collectionKind==='blog-grid'){
    var blogLink=item.querySelector&&item.querySelector('[data-sz-blog-link="1"]');
    if(blogLink){
      blogLink.setAttribute('href',String(fields.url||'#'));
      blogLink.setAttribute('title',String(fields.title||fields.cta||'Read more'));
    }
  }
  if(collectionKind==='gallery-masonry'){
    var height=Math.max(120,Math.min(520,parseFloat(String(fields.height||''))||220));
    if(image&&image.style){
      image.style.height=height+'px';
    }
  }
  if(collectionKind==='tag-cloud'){
    var size=Math.max(10,Math.min(28,parseFloat(String(fields.size||'16'))||16));
    item.style.fontSize=size+'px';
    item.style.opacity=String(Math.max(0.58,Math.min(1,0.58+((size-10)/18)*0.32)));
  }
}
function socialIconPath(label){
  var normalized=String(label||'').trim().toLowerCase();
  if(normalized.indexOf('instagram')>=0)return 'M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zm4.5 3a5 5 0 1 1 0 10A5 5 0 0 1 12 7zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.25-.75a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z';
  if(normalized.indexOf('linkedin')>=0)return 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zm2-3a2 2 0 1 1 0-4 2 2 0 0 1 0 4z';
  if(normalized.indexOf('github')>=0)return 'M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z';
  return 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z';
}
function applyCollectionField(item,def,value){
  var node=collectionFieldNode(item,def.key);
  if(!node)return;
  var type=(node.getAttribute&&node.getAttribute('data-sz-field-type'))||def.type||'text';
  var next=String(value||'');
  if(type==='image'){
    if(node.tagName&&node.tagName.toLowerCase()==='img'){
      node.setAttribute('src',next);
      if(next&&!node.getAttribute('alt'))node.setAttribute('alt','Image');
      return;
    }
    var img=node.querySelector&&node.querySelector('img');
    if(img){
      img.setAttribute('src',next);
      if(next&&!img.getAttribute('alt'))img.setAttribute('alt','Image');
    }
    return;
  }
  if(type==='list'){
    setCollectionListValue(node,next);
    return;
  }
  setCollectionTextValue(node,next);
}
function widgetRoot(el){
  if(!el||!el.closest)return null;
  return el.closest('[data-sz-widget-kind]');
}
function widgetMeta(el){
  var root=widgetRoot(el)||el;
  if(!root||!root.getAttribute)return null;
  var kind=root.getAttribute('data-sz-widget-kind');
  if(!kind)return null;
  var fields=[];
  var state={};
  try{
    var rawFields=JSON.parse(root.getAttribute('data-sz-widget-fields')||'[]');
    if(Array.isArray(rawFields)){
      fields=rawFields.map(function(def){
        var parsed={
          key:String(def&&def.key||'').trim(),
          label:String(def&&def.label||def&&def.key||'').trim(),
          type:def&&typeof def.type==='string'?String(def.type):'text',
          placeholder:def&&def.placeholder?String(def.placeholder):'',
        };
        if(def&&typeof def.min==='number')parsed.min=def.min;
        if(def&&typeof def.max==='number')parsed.max=def.max;
        if(def&&typeof def.step==='number')parsed.step=def.step;
        return parsed;
      }).filter(function(def){return !!def.key;});
    }
  }catch(e){}
  try{
    var rawState=JSON.parse(root.getAttribute('data-sz-widget-state')||'{}');
    if(rawState&&typeof rawState==='object'&&!Array.isArray(rawState)){
      Object.keys(rawState).forEach(function(key){
        state[key]=String(rawState[key]??'');
      });
    }
  }catch(e){}
  return {
    root:root,
    kind:kind,
    label:root.getAttribute('data-sz-widget-label')||kind,
    fields:fields,
    state:state,
  };
}
function widgetData(el){
  var meta=widgetMeta(el);
  if(!meta||!meta.fields.length)return null;
  return meta;
}
function widgetPart(root,key){
  if(!root||!root.querySelectorAll)return null;
  var matches=root.querySelectorAll('[data-sz-widget-part="'+key+'"]');
  for(var i=0;i<matches.length;i++){
    var match=matches[i];
    if(match&&match.closest&&match.closest('[data-sz-widget-kind]')===root)return match;
  }
  return null;
}
function widgetText(root,key,value){
  var node=widgetPart(root,key);
  if(node)node.textContent=String(value??'');
}
function widgetNumber(value,fallback,min,max){
  var parsed=parseFloat(String(value??''));
  if(!isFinite(parsed))parsed=fallback;
  if(typeof min==='number')parsed=Math.max(min,parsed);
  if(typeof max==='number')parsed=Math.min(max,parsed);
  return parsed;
}
function widgetStateAttr(root,state){
  if(!root||!root.setAttribute)return;
  try{root.setAttribute('data-sz-widget-state',JSON.stringify(state||{}));}catch(e){}
}
function syncCountdownWidget(root,state){
  var labels={
    days:String(state.labelDays||'Days'),
    hours:String(state.labelHours||'Hours'),
    minutes:String(state.labelMinutes||'Mins'),
    seconds:String(state.labelSeconds||'Secs'),
  };
  widgetText(root,'days-label',labels.days);
  widgetText(root,'hours-label',labels.hours);
  widgetText(root,'minutes-label',labels.minutes);
  widgetText(root,'seconds-label',labels.seconds);
  var targetRaw=String(state.targetDate||'').trim();
  var target=targetRaw?new Date(targetRaw):null;
  var targetMs=target&&isFinite(target.getTime())?target.getTime():NaN;
  var diff=isFinite(targetMs)?Math.max(0,targetMs-Date.now()):0;
  var totalSeconds=Math.floor(diff/1000);
  var days=Math.floor(totalSeconds/86400);
  var hours=Math.floor((totalSeconds%86400)/3600);
  var minutes=Math.floor((totalSeconds%3600)/60);
  var seconds=totalSeconds%60;
  widgetText(root,'days-value',String(days).padStart(2,'0'));
  widgetText(root,'hours-value',String(hours).padStart(2,'0'));
  widgetText(root,'minutes-value',String(minutes).padStart(2,'0'));
  widgetText(root,'seconds-value',String(seconds).padStart(2,'0'));
}
function syncWidget(root){
  var meta=widgetMeta(root);
  if(!meta)return;
  var state=meta.state||{};
  if(meta.kind==='progress-bar'){
    var percent=Math.round(widgetNumber(state.percent,75,0,100));
    widgetText(meta.root,'label',state.label||'Progress');
    widgetText(meta.root,'value',state.value||String(percent)+'%');
    var fill=widgetPart(meta.root,'fill');
    if(fill&&fill.style)fill.style.width=percent+'%';
    meta.root.setAttribute('aria-valuenow',String(percent));
    return;
  }
  if(meta.kind==='counter-stat'){
    widgetText(meta.root,'value',state.value||'99%');
    widgetText(meta.root,'label',state.label||'Customer satisfaction');
    return;
  }
  if(meta.kind==='notification'){
    widgetText(meta.root,'title',state.title||'New message');
    widgetText(meta.root,'message',state.message||'You have 3 unread messages');
    widgetText(meta.root,'time',state.time||'now');
    return;
  }
  if(meta.kind==='rating'){
    var stars=Math.round(widgetNumber(state.stars,5,1,5));
    var starsEl=widgetPart(meta.root,'stars');
    if(starsEl){
      var existingStar=starsEl.querySelector&&starsEl.querySelector('svg');
      var starColor=existingStar?window.getComputedStyle(existingStar).fill:window.getComputedStyle(starsEl).color;
      starsEl.innerHTML=Array.from({length:5}).map(function(_,index){
        return '<svg viewBox="0 0 24 24" fill="currentColor" fill-opacity="'+(index<stars?'1':'0.22')+'" stroke="none" style="width:18px;height:18px;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
      }).join('');
      starsEl.style.color=starColor||'currentColor';
    }
    widgetText(meta.root,'score',state.score||'4.9');
    widgetText(meta.root,'reviews',state.reviews||'2,400 reviews');
    return;
  }
  if(meta.kind==='countdown'){
    syncCountdownWidget(meta.root,state);
    return;
  }
  if(meta.kind==='avatar-group'){
    widgetText(meta.root,'extra',state.extra||'+9');
    widgetText(meta.root,'label',state.label||'Join 200+ happy customers');
    return;
  }
  if(meta.kind==='navbar'||meta.kind==='navbar-center'||meta.kind==='navbar-minimal'){
    widgetText(meta.root,'brand',state.brand||'Brand');
    widgetText(meta.root,'cta-label',state.ctaLabel||(meta.kind==='navbar-center'?'Get started':'Book a call'));
    return;
  }
  if(meta.kind==='hero'){
    widgetText(meta.root,'eyebrow',state.eyebrow||'New launch');
    widgetText(meta.root,'title',state.title||'Built for clarity.');
    widgetText(meta.root,'accent',state.accent||'Designed to convert.');
    widgetText(meta.root,'body',state.body||'Describe what makes this project stand out.');
    widgetText(meta.root,'primary-label',state.primaryLabel||'Get started');
    widgetText(meta.root,'secondary-label',state.secondaryLabel||'View work');
    return;
  }
  if(meta.kind==='hero-split'){
    widgetText(meta.root,'title',state.title||'Brand');
    widgetText(meta.root,'accent',state.accent||'for bold brands.');
    widgetText(meta.root,'body',state.body||'Describe what makes this project stand out.');
    widgetText(meta.root,'primary-label',state.primaryLabel||'Get started');
    widgetText(meta.root,'secondary-label',state.secondaryLabel||'Learn more');
    return;
  }
  if(meta.kind==='section'){
    widgetText(meta.root,'title',state.title||'New section title');
    widgetText(meta.root,'body',state.body||'A flexible section for a focused message, feature, or proof point.');
    return;
  }
  if(meta.kind==='container'){
    widgetText(meta.root,'body',state.body||'Flexible container for grouped content.');
    return;
  }
  if(meta.kind==='columns'){
    widgetText(meta.root,'title',state.title||'Two-column layout');
    widgetText(meta.root,'body',state.body||'Use this for content paired with supporting detail, stats, or a call to action.');
    widgetText(meta.root,'aside-eyebrow',state.asideEyebrow||'Quick note');
    widgetText(meta.root,'aside-body',state.asideBody||'Ideal for a short highlight, metric, or supporting takeaway.');
    return;
  }
  if(meta.kind==='split-image'){
    widgetText(meta.root,'eyebrow',state.eyebrow||'Feature');
    widgetText(meta.root,'title',state.title||'Content that converts on sight');
    widgetText(meta.root,'body',state.body||'Pair a strong visual with a focused message and a clear next step.');
    widgetText(meta.root,'cta-label',state.ctaLabel||'Learn more →');
    return;
  }
  if(meta.kind==='footer'){
    widgetText(meta.root,'brand',state.brand||'Brand');
    widgetText(meta.root,'tagline',state.tagline||'Describe what makes this project stand out.');
    return;
  }
  if(meta.kind==='footer-columns'){
    widgetText(meta.root,'brand',state.brand||'Brand');
    widgetText(meta.root,'tagline',state.tagline||'Describe what makes this project stand out.');
    widgetText(meta.root,'copyright',state.copyright||'© 2026 Brand. All rights reserved.');
    return;
  }
  if(meta.kind==='contact'){
    widgetText(meta.root,'title',state.title||'Get in touch');
    widgetText(meta.root,'body',state.body||'We\\'d love to hear from you. Fill out the form or reach us directly.');
    widgetText(meta.root,'button-label',state.buttonLabel||'Send message');
    return;
  }
  if(meta.kind==='features'){
    widgetText(meta.root,'title',state.title||'Core features');
    widgetText(meta.root,'subtitle',state.subtitle||'Highlight the capabilities or differentiators that matter most.');
    return;
  }
  if(meta.kind==='testimonial'){
    var personName=String(state.name||'Sarah Johnson').trim();
    var derivedInitials=String(state.initial||'').trim()||personName.split(/\s+/).filter(Boolean).slice(0,2).map(function(part){return part.charAt(0).toUpperCase();}).join('')||'SJ';
    widgetText(meta.root,'quote',state.quote||'Working with Sitezy brought clarity, speed, and a stronger presence across every touchpoint.');
    widgetText(meta.root,'name',personName||'Sarah Johnson');
    widgetText(meta.root,'role',state.role||'Founder, Sitezy');
    widgetText(meta.root,'initial',derivedInitials);
    return;
  }
  if(meta.kind==='gallery'){
    widgetText(meta.root,'eyebrow',state.eyebrow||'Gallery');
    widgetText(meta.root,'title',state.title||'Show the work visually');
    widgetText(meta.root,'body',state.body||'Images inherit the site framing, radius, and shadow system.');
    return;
  }
  if(meta.kind==='features-list'){
    widgetText(meta.root,'title',state.title||'Everything you need');
    widgetText(meta.root,'subtitle',state.subtitle||'A complete toolkit built to help you move fast and look great.');
    return;
  }
  if(meta.kind==='cta-strip'){
    widgetText(meta.root,'title',state.title||'Ready to get started?');
    widgetText(meta.root,'body',state.body||'Join thousands of teams already using Sitezy.');
    widgetText(meta.root,'button-label',state.buttonLabel||'Start free →');
    return;
  }
  if(meta.kind==='newsletter'){
    widgetText(meta.root,'title',state.title||'Stay in the loop');
    widgetText(meta.root,'body',state.body||'Get insights, product updates, and resources delivered to your inbox.');
    var input=widgetPart(meta.root,'placeholder');
    if(input&&input.setAttribute)input.setAttribute('placeholder',String(state.placeholder||'Your email address'));
    widgetText(meta.root,'button-label',state.buttonLabel||'Subscribe');
    widgetText(meta.root,'note',state.note||'No spam. Unsubscribe any time.');
    return;
  }
  if(meta.kind==='comparison'){
    meta.root.style.setProperty('--sz-comparison-primary-color', window.getComputedStyle(meta.root).getPropertyValue('--accent-color') || '#7c3aed');
    widgetText(meta.root,'title',state.title||'How we compare');
    widgetText(meta.root,'subtitle',state.subtitle||'See how Sitezy stacks up against the alternatives.');
    widgetText(meta.root,'feature-label',state.featureLabel||'Feature');
    widgetText(meta.root,'primary-label',state.primaryLabel||'Sitezy');
    widgetText(meta.root,'secondary-label',state.secondaryLabel||'Competitor A');
    widgetText(meta.root,'tertiary-label',state.tertiaryLabel||'Competitor B');
    return;
  }
  if(meta.kind==='blog-grid'){
    widgetText(meta.root,'title',state.title||'From the blog');
    widgetText(meta.root,'subtitle',state.subtitle||'Insights, guides, and updates from the team.');
    return;
  }
  if(meta.kind==='gallery-masonry'){
    widgetText(meta.root,'title',state.title||'Our work');
    widgetText(meta.root,'subtitle',state.subtitle||'A flexible masonry wall for project imagery, case-study screenshots, or editorial moments.');
    return;
  }
  if(meta.kind==='pricing-toggle'){
    widgetText(meta.root,'title',state.title||'Choose your pace');
    widgetText(meta.root,'subtitle',state.subtitle||'Give visitors a clearer choice between monthly flexibility and yearly savings.');
    widgetText(meta.root,'monthly-label',state.monthlyLabel||'Monthly');
    widgetText(meta.root,'yearly-label',state.yearlyLabel||'Yearly');
    return;
  }
  if(meta.kind==='modal-popup'){
    widgetText(meta.root,'button-label',state.buttonLabel||'Open modal');
    widgetText(meta.root,'eyebrow',state.eyebrow||'Popup');
    widgetText(meta.root,'title',state.title||'Quick announcement');
    widgetText(meta.root,'body',state.body||'Use this modal for gated updates, promo messages, feature announcements, or a focused call to action without leaving the page.');
    widgetText(meta.root,'primary-label',state.primaryLabel||'Primary action');
    widgetText(meta.root,'secondary-label',state.secondaryLabel||'Dismiss');
  }
}
var widgetTimer=null;
function syncAllWidgets(){
  Array.from(document.querySelectorAll('[data-sz-widget-kind]')).forEach(function(node){
    syncWidget(node);
  });
}
function ensureWidgetTimer(){
  if(widgetTimer)return;
  widgetTimer=window.setInterval(function(){
    Array.from(document.querySelectorAll('[data-sz-widget-kind="countdown"]')).forEach(function(node){
      syncWidget(node);
    });
  },1000);
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
function glist(el){
  var c=el;
  while(c&&c!==document.body){
    if(!c.tagName){c=c.parentElement;continue;}
    var t=c.tagName.toLowerCase();
    if(t==='li'||t==='ul'||t==='ol')return c;
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
function iconNodeWrap(el){
  if(!el||!el.tagName)return null;
  if(el.getAttribute&&el.getAttribute('data-sz-icon')==='true')return el;
  if(el.tagName.toLowerCase()==='svg')return iconWrap(el);
  return el.querySelector?el.querySelector('[data-sz-icon="true"]'):null;
}
function fitIconToText(iconNode,refEl){
  var wrap=iconNodeWrap(iconNode);
  if(!wrap||!refEl||!refEl.tagName||!window.getComputedStyle)return;
  var cs=window.getComputedStyle(refEl);
  var fontSize=parseFloat(cs.fontSize)||16;
  var lineHeight=parseFloat(cs.lineHeight);
  var size=Math.round(Math.max(14,Math.min(42,fontSize*1.05)));
  if(!isNaN(lineHeight)&&lineHeight>0)size=Math.round(Math.max(size,Math.min(44,lineHeight*0.82)));
  wrap.style.width=size+'px';
  wrap.style.height=size+'px';
  wrap.style.alignSelf='center';
  wrap.style.verticalAlign='middle';
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
  if(BLK.indexOf(t)>=0){
    var s=window.getComputedStyle(el);
    var hasSimpleText=String(el.innerText||'').trim()&&el.children.length<=1&&!el.querySelector('img,video,iframe,input,textarea,select,form,ul,ol,nav,section,article,aside');
    return s.display.indexOf('flex')>=0||s.display.indexOf('grid')>=0||pv(s.paddingTop)+pv(s.paddingBottom)+pv(s.paddingLeft)+pv(s.paddingRight)>16||el.children.length>1||hasSimpleText;
  }
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
  if(act)eid(act);
  var textTgt=textChild(el,act);
  if(textTgt)eid(textTgt);
  var logoCollection=logoRoot(el);
  if(logoCollection)eid(logoCollection);
  var widget=widgetData(el);
  if(widget&&widget.root)eid(widget.root);
  var collection=collectionData(el);
  if(collection&&collection.root)eid(collection.root);
  var logoItemValues=logoItems(el).map(function(item){
    var img=item.querySelector&&item.querySelector('img');
    if(img&&img.getAttribute('src'))return img.getAttribute('src');
    return String(item.innerText||'').trim();
  }).filter(Boolean);
  var listTgt=glist(el);
  if(listTgt)eid(listTgt);
  var entranceAnimEl=animationTarget(el,dataEl,act,'entrance')||el;
  var hoverAnimEl=animationTarget(el,dataEl,act,'hover')||entranceAnimEl;
  var animEl=hoverAnimEl||entranceAnimEl||el;
  eid(animEl);
  if(entranceAnimEl)eid(entranceAnimEl);
  if(hoverAnimEl)eid(hoverAnimEl);
  ekey(el);ekey(dataEl);ekey(animEl);if(entranceAnimEl)ekey(entranceAnimEl);if(hoverAnimEl)ekey(hoverAnimEl);if(textTgt)ekey(textTgt);if(act)ekey(act);if(listTgt)ekey(listTgt);if(widget&&widget.root)ekey(widget.root);if(collection&&collection.root)ekey(collection.root);
  var p=el.parentElement,pc=p?window.getComputedStyle(p):null;
  var t=dataEl.tagName.toLowerCase(),c=window.getComputedStyle(el),textStyle=textTgt?window.getComputedStyle(textTgt):c,dataStyle=dataEl!==el?window.getComputedStyle(dataEl):c,animStyle=animEl!==el?window.getComputedStyle(animEl):c,entranceAnimStyle=entranceAnimEl!==el?window.getComputedStyle(entranceAnimEl):c,hoverAnimStyle=hoverAnimEl!==el?window.getComputedStyle(hoverAnimEl):c,listStyle=listTgt?window.getComputedStyle(listTgt):c,linkStyle=act&&act.tagName&&act.tagName.toLowerCase()==='a'?window.getComputedStyle(act):c,sec=gsec(el),sc=sec?window.getComputedStyle(sec):null;
  var linkEl=act&&act.tagName&&act.tagName.toLowerCase()==='a'?act:null;
  var buttonEl=act&&act.tagName&&act.tagName.toLowerCase()==='button'?act:null;
  var secBackdrop=sec?secVisual(sec):null;
  if(secBackdrop)eid(secBackdrop);
  var secBackdropTag=secBackdrop&&secBackdrop.tagName?secBackdrop.tagName.toLowerCase():null;
  var _computedAnimIn=hasCustomEntranceCss(entranceAnimEl,entranceAnimStyle)?'custom':'none';
  var _computedHover=hasCustomHoverCss(hoverAnimEl,hoverAnimStyle)?'custom':'none';
  var responsiveTargets=uniqueEls([el,dataEl,textTgt,animEl,entranceAnimEl,hoverAnimEl,act,listTgt]);
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
    animationEntranceTargetNodeId:(entranceAnimEl.getAttribute('data-sz-id')||null),
    animationHoverTargetNodeId:(hoverAnimEl.getAttribute('data-sz-id')||null),
    mediaTargetNodeId:dataEl!==el?(dataEl.getAttribute('data-sz-id')||null):null,
    textTargetNodeId:textTgt?(textTgt.getAttribute('data-sz-id')||null):null,
    textTargetTag:textTgt&&textTgt.tagName?textTgt.tagName.toLowerCase():null,
    widgetNodeId:widget&&widget.root?(widget.root.getAttribute('data-sz-id')||null):null,
    widgetKind:widget?widget.kind:null,
    widgetLabel:widget?widget.label:null,
    widgetFields:widget?widget.fields:[],
    widgetState:widget?widget.state:{},
    collectionNodeId:collection&&collection.root?(collection.root.getAttribute('data-sz-id')||null):null,
    collectionKind:collection?collection.kind:null,
    collectionLabel:collection?collection.label:null,
    collectionFixed:!!(collection&&collection.fixed),
    collectionFields:collection?collection.fields:[],
    collectionItems:collection?collection.items:[],
    logoCollectionNodeId:logoCollection?(logoCollection.getAttribute('data-sz-id')||null):null,
    linkTargetNodeId:linkEl?(linkEl.getAttribute('data-sz-id')||null):null,
    listTargetNodeId:listTgt?(listTgt.getAttribute('data-sz-id')||null):null,
    parentNodeId:gpar(el)?gpar(el).getAttribute('data-sz-id'):null,
    sectionId:sec?(sec.getAttribute('data-sz-section-id')||null):null,
    sectionName:sec?(sec.getAttribute('data-sz-section-name')||null):null,
    sectionType:sec?(sec.getAttribute('data-sz-section-type')||null):null,
    tag:t,label:t==='img'?(dataEl.getAttribute('alt')||'Image'):t==='video'?'Video':t==='iframe'?'Embed':t==='svg'?'Icon':tr(dataEl.innerText||t,40),
    role,depth:0,text:tr(el.innerText||'',200),editableText:textTgt?String(textTgt.innerText||'').trim():null,logoItems:logoItemValues,
    src:(t==='img'||t==='video'||t==='iframe')?dataEl.getAttribute('src'):null,
    altText:t==='img'?(dataEl.getAttribute('alt')||''):null,
    href:(linkEl?linkEl.getAttribute('href'):el.getAttribute('href'))||null,target:(linkEl?linkEl.getAttribute('target'):el.getAttribute('target'))||null,
    isImg:t==='img',isVideo:t==='video',isIframe:t==='iframe',isText:fn(el),isBtn:!!buttonEl||!!linkEl,
    isInput:fi(el),isSvg:el.tagName.toLowerCase()==='svg',hasEditableText:!!textTgt&&!!String(textTgt.innerText||'').trim(),
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
    fontSize:Math.round(parseFloat(textStyle.fontSize)||16),
    fontFamily:textStyle.fontFamily,fontWeight:textStyle.fontWeight,fontStyle:textStyle.fontStyle,
    fontVariantCaps:textStyle.fontVariantCaps||'normal',
    textAlign:textStyle.textAlign,lineHeight:textStyle.lineHeight,letterSpacing:textStyle.letterSpacing,
    textDecoration:textStyle.textDecoration,
    textDecorationStyle:linkStyle.textDecorationStyle||textStyle.textDecorationStyle||'solid',
    textUnderlineOffset:linkStyle.textUnderlineOffset||textStyle.textUnderlineOffset||'0px',
    textTransform:textStyle.textTransform,
    whiteSpace:textStyle.whiteSpace,
    overflowWrap:textStyle.overflowWrap,
    wordBreak:textStyle.wordBreak,
    textIndent:textStyle.textIndent,
    textOpacity:String(ra(textStyle.color)),
    listStyleType:listStyle.listStyleType||'disc',
    listStylePosition:listStyle.listStylePosition||'outside',
    columnCount:c.columnCount||'auto',
    columnGap:c.columnGap||'normal',
    color:rh(textStyle.color),
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
    animationIn:entranceAnimEl.getAttribute('data-sz-anim-in')||_computedAnimIn,
    animationHover:hoverAnimEl.getAttribute('data-sz-hover-fx')||_computedHover,
    hasCustomEntranceAnimation:_computedAnimIn==='custom',
    hasCustomHoverAnimation:_computedHover==='custom',
    animationDuration:(hoverAnimEl.style.getPropertyValue('--sz-anim-duration')||entranceAnimEl.style.getPropertyValue('--sz-anim-duration')||animEl.style.getPropertyValue('--sz-anim-duration'))||((entranceAnimStyle.animationDuration&&entranceAnimStyle.animationDuration!=='0s')?entranceAnimStyle.animationDuration:((hoverAnimStyle.transitionDuration&&hoverAnimStyle.transitionDuration!=='0s')?hoverAnimStyle.transitionDuration:(animStyle.transitionDuration||'600ms'))),
    animationDelay:(hoverAnimEl.style.getPropertyValue('--sz-anim-delay')||entranceAnimEl.style.getPropertyValue('--sz-anim-delay')||animEl.style.getPropertyValue('--sz-anim-delay'))||((entranceAnimStyle.animationDelay&&entranceAnimStyle.animationDelay!=='0s')?entranceAnimStyle.animationDelay:((hoverAnimStyle.transitionDelay&&hoverAnimStyle.transitionDelay!=='0s')?hoverAnimStyle.transitionDelay:(animStyle.transitionDelay||'0ms'))),
    animationEase:(hoverAnimEl.style.getPropertyValue('--sz-anim-ease')||entranceAnimEl.style.getPropertyValue('--sz-anim-ease')||animEl.style.getPropertyValue('--sz-anim-ease'))||((entranceAnimStyle.animationTimingFunction&&entranceAnimStyle.animationTimingFunction!=='ease')?entranceAnimStyle.animationTimingFunction:((hoverAnimStyle.transitionTimingFunction&&hoverAnimStyle.transitionTimingFunction!=='ease')?hoverAnimStyle.transitionTimingFunction:(animStyle.transitionTimingFunction||'cubic-bezier(0.22,1,0.36,1)'))),
    secBg:sc?(rh(sc.backgroundColor)||null):null,
    secPadding:sc?sc.padding:null,
    secHasBgImage:!!_secBgUrl,secBgImageSrc:_secBgUrl,
    secBgPosition:sc?sc.backgroundPosition:'center',secBgSize:sc?sc.backgroundSize:'cover',
    sectionVisualNodeId:(!_secBgUrl&&secBackdrop)?(secBackdrop.getAttribute('data-sz-id')||null):null,
    sectionVisualSrc:(!_secBgUrl&&secBackdrop&&['img','video','iframe'].indexOf(secBackdropTag)>=0)?(secBackdrop.getAttribute('src')||null):null,
    sectionVisualKind:(!_secBgUrl&&secBackdropTag==='img')?'image':(!_secBgUrl&&secBackdropTag==='video')?'video':(!_secBgUrl&&secBackdropTag==='iframe')?'embed':null,
  };
}

var sel=null,hov=null,editing=false,editEl=null;
var undos=[],redos=[];
var styleBatch=null,styleBatchTimer=null;
var CLIP_KEY='sitezy-editor-clipboard-v1';
var clip=null;
var dragEl=null,dragGhost=null,dl=null,dropTarget=null,dropPos=null;
var mdEl=null,mdX=0,mdY=0,dragging=false;

// ── Resize + padding overlay ──────────────────────────────────────────────
var ov=null,rzEl=null,rzMode='',rzSX=0,rzSY=0,rzSW=0,rzSH=0;
var padEl=null,padSide='',padSX=0,padSY=0,padS0=0;

function mkOv(){
  if(ov)return;
  ov=document.createElement('div');ov.id='sz-ov';
  ov.setAttribute('data-sz-ui','1');
  ov.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:2147483646;display:block;overflow:visible;';
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
  if(!ov)return;
  var hs=ov.querySelectorAll('[data-rh],[data-ph]');
  function hideSelChrome(){
    hs.forEach(function(h){h.style.display='none';});
  }
  if(!sel||dragging||editing||!document.body.contains(sel)){
    hideSelChrome();
    return;
  }
  var vis=visualTarget(sel);
  if(!vis||!document.body.contains(vis)){
    hideSelChrome();
    return;
  }
  var r=vis.getBoundingClientRect();
  var c=window.getComputedStyle(vis);
  var pt=Math.max(4,pv(c.paddingTop)),pr=Math.max(4,pv(c.paddingRight)),pb=Math.max(4,pv(c.paddingBottom)),pl=Math.max(4,pv(c.paddingLeft));
  var MX=[[r.left+r.width/2,r.top],[r.left+r.width,r.top],[r.left+r.width,r.top+r.height/2],[r.left+r.width,r.top+r.height],[r.left+r.width/2,r.top+r.height],[r.left,r.top+r.height],[r.left,r.top+r.height/2],[r.left,r.top]];
  var showHandles=r.width>=28&&r.height>=24;
  for(var i=0;i<hs.length;i++){
    hs[i].style.display=showHandles?'':'none';
    if(showHandles&&i<8){hs[i].style.left=MX[i][0]+'px';hs[i].style.top=MX[i][1]+'px';}
  }
  if(showHandles){
    var pth=ov.querySelector('[data-ph="pt"]');pth.style.left=r.left+'px';pth.style.top=r.top+'px';pth.style.width=r.width+'px';pth.style.height=pt+'px';pth.style.display='';
    var prh=ov.querySelector('[data-ph="pr"]');prh.style.left=(r.right-pr)+'px';prh.style.top=r.top+'px';prh.style.width=pr+'px';prh.style.height=r.height+'px';prh.style.display='';
    var pbh=ov.querySelector('[data-ph="pb"]');pbh.style.left=r.left+'px';pbh.style.top=(r.bottom-pb)+'px';pbh.style.width=r.width+'px';pbh.style.height=pb+'px';pbh.style.display='';
    var plh=ov.querySelector('[data-ph="pl"]');plh.style.left=r.left+'px';plh.style.top=r.top+'px';plh.style.width=pl+'px';plh.style.height=r.height+'px';plh.style.display='';
  }
}

function startRz(e,mode){
  if(!sel||editing||dragging)return;
  e.stopPropagation();e.preventDefault();
  var target=visualTarget(sel);
  if(!target)return;
  var c=window.getComputedStyle(target);
  rzEl=target;rzMode=mode;rzSX=e.clientX;rzSY=e.clientY;
  rzSW=parseFloat(c.width)||target.offsetWidth;rzSH=parseFloat(c.height)||target.offsetHeight;
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

function msel(el){
  if(!el)return;
  var vis=visualTarget(el)||el;
  vis.setAttribute('data-sz-sel','1');
  if(fsec(el))vis.setAttribute('data-sz-sec','1');else vis.removeAttribute('data-sz-sec');
}
function usel(el){
  if(!el)return;
  el.removeAttribute('data-sz-sel');
  el.removeAttribute('data-sz-sec');
  var vis=visualTarget(el);
  if(vis&&vis!==el){
    vis.removeAttribute('data-sz-sel');
    vis.removeAttribute('data-sz-sec');
  }
}
function mhov(el){if(!el)return;el.setAttribute('data-sz-hov','1');if(fsec(el))el.setAttribute('data-sz-sec-hov','1');}
function uhov(el){if(!el)return;el.removeAttribute('data-sz-hov');el.removeAttribute('data-sz-sec-hov');}

function cleanSnap(){
  var clone=document.body.cloneNode(true);
  if(!clone||!clone.querySelectorAll)return document.body.innerHTML;
  clone.querySelectorAll('script,style,noscript,link,meta,#sz-ov,[data-sz-ui],.sz-dl,[data-sz-hov],[data-sz-sel],[data-sz-sec],[data-sz-sec-hov],[data-sz-drag],[data-sz-id],[contenteditable],[data-sz-sec-name],[data-sz-hover-preview]').forEach(function(el){
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
    el.removeAttribute('data-sz-hover-preview');
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
function commit(){initIds();syncAllWidgets();ensureWidgetTimer();rememberCurrent();post('html-update',{html:snap()});if(sel&&document.body.contains(sel))post('select',describe(sel));posOv();}
function visualTarget(el){
  if(!el||!el.tagName)return el;
  return mediaChild(el)||el;
}
function gid(prefix){
  return (prefix||'sz')+'-'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
}
function clipboardSource(el){
  if(!el)return null;
  var icon=iconUnit(el);
  if(icon)return icon;
  var media=mediaDeleteUnit(el);
  if(media)return media;
  var form=nearestForm(el);
  if(form){
    var field=fieldAnchor(el,form);
    if(field&&field!==form)return field;
  }
  return el;
}
function clipboardPlacementFor(el){
  return fsec(el)?'section':'inline';
}
function updateMultiIdAttr(el,attr,idMap){
  var raw=el.getAttribute(attr);
  if(!raw)return;
  var next=String(raw).split(/\s+/).map(function(part){return idMap[part]||part;}).join(' ').trim();
  if(next)el.setAttribute(attr,next);
}
function remapInlineRefs(text,idMap,nameMap){
  var next=String(text||'');
  Object.keys(idMap).forEach(function(oldId){
    next=next.split(oldId).join(idMap[oldId]);
  });
  Object.keys(nameMap).forEach(function(oldName){
    next=next.split(oldName).join(nameMap[oldName]);
  });
  return next;
}
function normalizeCloneTree(root){
  if(!root||!root.tagName)return root;
  var all=[root].concat(Array.from(root.querySelectorAll('*')));
  var idMap={},nameMap={};
  all.forEach(function(el){
    ['data-sz-sel','data-sz-hov','data-sz-sec','data-sz-sec-hov','data-sz-drag','data-sz-hover-preview','contenteditable'].forEach(function(attr){el.removeAttribute(attr);});
    el.removeAttribute('data-sz-id');
    el.removeAttribute('data-sz-key');
    if(el.getAttribute('data-sz-section-id'))el.setAttribute('data-sz-section-id',gid('sec'));
    if(el.id){
      idMap[el.id]=gid('id');
      el.id=idMap[el.id];
    }
    if(el.tagName&&el.tagName.toLowerCase()==='input'&&String(el.getAttribute('type')||'').toLowerCase()==='radio'){
      var radioName=el.getAttribute('name');
      if(radioName){
        if(!nameMap[radioName])nameMap[radioName]=gid('grp');
        el.setAttribute('name',nameMap[radioName]);
      }
    }
  });
  all.forEach(function(el){
    updateMultiIdAttr(el,'aria-controls',idMap);
    updateMultiIdAttr(el,'aria-labelledby',idMap);
    updateMultiIdAttr(el,'aria-describedby',idMap);
    var htmlFor=el.getAttribute('for');
    if(htmlFor&&idMap[htmlFor])el.setAttribute('for',idMap[htmlFor]);
    var href=el.getAttribute('href');
    if(href&&href.charAt(0)==='#'&&idMap[href.slice(1)])el.setAttribute('href','#'+idMap[href.slice(1)]);
    ['onclick','onchange','oninput','for'].forEach(function(attr){
      var raw=el.getAttribute(attr);
      if(raw)el.setAttribute(attr,remapInlineRefs(raw,idMap,nameMap));
    });
    if(el.tagName&&el.tagName.toLowerCase()==='style'&&el.textContent){
      el.textContent=remapInlineRefs(el.textContent,idMap,nameMap);
    }
  });
  return root;
}
function saveClipboardState(){
  try{
    if(clip&&clip.html)window.sessionStorage.setItem(CLIP_KEY,JSON.stringify(clip));
    else window.sessionStorage.removeItem(CLIP_KEY);
  }catch(e){}
  post('clipboard-state',{has:!!(clip&&clip.html)});
}
function loadClipboardState(){
  try{
    var raw=window.sessionStorage.getItem(CLIP_KEY);
    clip=raw?JSON.parse(raw):null;
  }catch(e){
    clip=null;
  }
  post('clipboard-state',{has:!!(clip&&clip.html)});
}
function buildClipboardPayload(src){
  if(!src||!src.tagName)return null;
  var cl=src.cloneNode(true);
  normalizeCloneTree(cl);
  return {
    html:cl.outerHTML,
    placement:clipboardPlacementFor(src),
  };
}
function copyEl(){
  if(!sel)return false;
  var src=clipboardSource(sel);
  if(!src||!src.tagName)return false;
  clip=buildClipboardPayload(src);
  saveClipboardState();
  return !!clip;
}
function cutEl(){
  if(!sel)return false;
  if(!copyEl())return false;
  delEl();
  return true;
}
function pasteEl(){
  if(!clip||!clip.html)return null;
  var wrap=document.createElement('div');
  wrap.innerHTML=clip.html;
  var node=wrap.firstElementChild;
  if(!node)return null;
  normalizeCloneTree(node);
  var currentSection=sel?gsec(sel):null;
  var inserted=insertSmart(
    node,
    clip.placement||'inline',
    currentSection?(currentSection.getAttribute('data-sz-section-id')||null):null,
    sel?(sel.getAttribute('data-sz-id')||null):null
  );
  return inserted||node;
}

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
  if(!sel||editing)return;
  var tgt=textChild(sel,gact(sel));
  if(!tgt)return;
  pushU();editing=true;editEl=tgt;tgt.contentEditable='true';tgt.focus();document.body.classList.add('sz-editing');posOv();
  try{var r=document.createRange(),s=window.getSelection();r.selectNodeContents(tgt);r.collapse(false);s.removeAllRanges();s.addRange(r);}catch(e){}
  post('editing',describe(sel));
}
function exitEdit(){
  if(!sel||!editing)return;
  editing=false;
  if(editEl){editEl.contentEditable='false';}
  editEl=null;
  document.body.classList.remove('sz-editing');
  posOv();
  commit();
}

function delEl(){
  if(!sel)return;
  var tgt=iconUnit(sel)||mediaDeleteUnit(sel)||sel,nxt=gpar(tgt)||gsec(tgt);
  pushU();desel();
  tgt.style.transition='opacity 120ms';tgt.style.opacity='0';
  setTimeout(function(){tgt.remove();commit();if(nxt&&document.body.contains(nxt))selEl(nxt);},130);
}
function dupEl(){
  if(!sel)return;
  var src=clipboardSource(sel);
  if(!src||!src.tagName)return;
  var payload=buildClipboardPayload(src);
  if(!payload||!payload.html)return;
  var wrap=document.createElement('div');
  wrap.innerHTML=payload.html;
  var cl=wrap.firstElementChild;
  if(!cl)return;
  pushU();
  var currentSection=sel?gsec(sel):null;
  var inserted=insertSmart(
    cl,
    payload.placement||'inline',
    currentSection?(currentSection.getAttribute('data-sz-section-id')||null):null,
    sel?(sel.getAttribute('data-sz-id')||null):null
  );
  commit();selEl(reselectTarget(inserted||cl));
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
    var intentPos;
    if(c.parentElement===document.body)intentPos=e.clientY<rr.top+rr.height/2?'before':'after';
    else{
      var z=rr.height*.25;
      intentPos=e.clientY<rr.top+z?'before':e.clientY>rr.bottom-z?'after':'inside';
    }
    var dropChoice=normalizeDropChoice(c,intentPos,dragEl);
    if(!dropChoice)continue;
    showDl(dropChoice.target,dropChoice.pos);
    return;
  }clearDl();
}
function eDrag(){
  if(!dragging){mdEl=null;return;}
  if(dragEl)dragEl.removeAttribute('data-sz-drag');
  if(dragGhost){dragGhost.remove();dragGhost=null;}
  document.body.classList.remove('sz-dragging');
  if(dragEl&&dropTarget&&dropTarget!==dragEl){
    var finalDrop=normalizeDropChoice(dropTarget,dropPos,dragEl);
    if(finalDrop&&finalDrop.target&&finalDrop.target!==dragEl&&!(dragEl.contains&&dragEl.contains(finalDrop.target))){
      if(finalDrop.pos==='before'&&finalDrop.target.parentNode){
        finalDrop.target.parentNode.insertBefore(dragEl,finalDrop.target);
      }else if(finalDrop.pos==='after'&&finalDrop.target.parentNode){
        finalDrop.target.parentNode.insertBefore(dragEl,finalDrop.target.nextSibling);
      }else if(finalDrop.pos==='inside'){
        var nav=navHost(finalDrop.target);
        if(nav&&canPlaceInlineInNav(dragEl)){
          placeInlineInNav(nav,dragEl,finalDrop.target);
        }else{
          var form=nearestForm(finalDrop.target);
          if(form&&isFormFieldNode(dragEl)&&!(hasNestedForm(dragEl)||(dragEl.tagName&&dragEl.tagName.toLowerCase()==='form'))){
            placeInForm(form,dragEl,finalDrop.target);
          }else if(fsec(finalDrop.target)){
            (contentContainer(finalDrop.target)||finalDrop.target).appendChild(dragEl);
          }else{
            finalDrop.target.appendChild(dragEl);
          }
        }
      }
      commit();selEl(reselectTarget(dragEl));
    }
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
function navHost(el){
  return el&&el.closest?el.closest('nav,header,[data-sz-section-type="navbar"]'):null;
}
function interactiveChildCount(el){
  if(!el||!el.children)return 0;
  return Array.from(el.children).filter(function(child){
    if(!child||!child.tagName)return false;
    var t=child.tagName.toLowerCase();
    return t==='a'||t==='button';
  }).length;
}
function unwrapNavInlineNode(node){
  if(!node||!node.tagName)return node;
  var tag=node.tagName.toLowerCase();
  if(tag==='a'||tag==='button'){
    node.style.flexShrink=node.style.flexShrink||'0';
    return node;
  }
  if(tag!=='div'&&tag!=='span')return node;
  var kids=Array.from(node.childNodes||[]).filter(function(child){
    return child&&((child.nodeType===1)||(child.nodeType===3&&String(child.nodeValue||'').trim()));
  });
  if(kids.length!==1||kids[0].nodeType!==1)return node;
  var only=kids[0];
  if(!only.tagName)return node;
  var onlyTag=only.tagName.toLowerCase();
  if(onlyTag!=='a'&&onlyTag!=='button')return node;
  only.style.display=only.style.display||'inline-flex';
  only.style.flexShrink=only.style.flexShrink||'0';
  only.style.margin='0';
  return only;
}
function unwrapNavMediaNode(node){
  if(!node||!node.tagName)return node;
  var tag=node.tagName.toLowerCase();
  var media=(tag==='img'||tag==='video'||tag==='iframe')?node:mediaChild(node);
  if(!media||!media.tagName)return node;
  var mediaTag=media.tagName.toLowerCase();
  if(mediaTag==='img'){
    media.style.display='block';
    media.style.width='auto';
    media.style.height=(media.style.height&&media.style.height!=='auto')?media.style.height:'40px';
    media.style.maxHeight='40px';
    media.style.maxWidth='180px';
    media.style.objectFit='contain';
    media.style.flexShrink='0';
    media.removeAttribute('srcset');
  }else{
    media.style.display=media.style.display||'block';
    media.style.flexShrink=media.style.flexShrink||'0';
    media.style.maxWidth='180px';
    media.style.maxHeight='40px';
  }
  return media;
}
function canPlaceInlineInNav(node){
  var navNode=unwrapNavInlineNode(node);
  if(navNode&&navNode.tagName){
    var t=navNode.tagName.toLowerCase();
    if(t==='a'||t==='button')return true;
  }
  navNode=unwrapNavMediaNode(node);
  if(!navNode||!navNode.tagName)return false;
  var mt=navNode.tagName.toLowerCase();
  return mt==='img'||mt==='video'||mt==='iframe';
}
function compositeRoot(el){
  if(!el||!el.closest)return null;
  return el.closest('[data-sz-widget-kind],[data-sz-collection-kind]');
}
function compositeDropLock(target,node){
  if(!target||!node||!target.closest)return null;
  var root=compositeRoot(target);
  if(!root||root===node||(node.contains&&node.contains(root)))return null;
  if(!isBlockInsertNode(node)&&!fsec(node))return null;
  return root;
}
function findNavInsertContainer(host,ref){
  if(!host)return null;
  var act=gact(ref);
  var actParent=act&&act.parentElement&&host.contains(act.parentElement)?act.parentElement:null;
  if(actParent&&interactiveChildCount(actParent)>=2)return actParent;
  var best=null,bestScore=-1;
  Array.from(host.querySelectorAll('*')).forEach(function(el){
    if(!el||!el.tagName)return;
    if(el.querySelector&&el.querySelector('form,video,iframe'))return;
    var count=interactiveChildCount(el);
    if(!count)return;
    var score=count*4;
    var cs=window.getComputedStyle(el);
    if(cs.display==='flex'||cs.display==='inline-flex'||cs.display==='grid'||cs.display==='inline-grid')score+=3;
    if(act&&el.contains(act))score+=4;
    if(el===host.firstElementChild)score+=1;
    if(count===1)score-=1;
    if(score>bestScore){bestScore=score;best=el;}
  });
  return best||host.firstElementChild||host;
}
function placeInlineInNav(host,node,ref){
  if(!host||!node)return null;
  var navNode=unwrapNavInlineNode(node);
  if(!(navNode&&navNode.tagName&&(navNode.tagName.toLowerCase()==='a'||navNode.tagName.toLowerCase()==='button'))){
    navNode=unwrapNavMediaNode(node);
  }
  var act=gact(ref);
  var actParent=act&&act.parentElement&&host.contains(act.parentElement)?act.parentElement:null;
  if(act&&actParent&&navNode&&navNode.tagName){
    var navTag=navNode.tagName.toLowerCase();
    if(navTag==='img'||navTag==='video'||navTag==='iframe'){
      actParent.insertBefore(navNode,act.nextSibling);
      return navNode;
    }
  }
  if(act&&actParent&&interactiveChildCount(actParent)>=2){
    actParent.insertBefore(navNode,act.nextSibling);
    return navNode;
  }
  var target=findNavInsertContainer(host,ref);
  if(target){
    target.appendChild(navNode);
    return navNode;
  }
  host.appendChild(navNode);
  return navNode;
}
function normalizeDropChoice(target,pos,dragged){
  if(!target||!dragged||target===dragged||(dragged.contains&&dragged.contains(target)))return null;
  var nextTarget=iconUnit(target)||target;
  var nextPos=pos||'after';
  var compositeLock=compositeDropLock(nextTarget,dragged);
  if(compositeLock){
    return {
      target:compositeLock,
      pos:nextPos==='before'?'before':'after'
    };
  }
  if(fsec(dragged)){
    nextTarget=fsec(nextTarget)?nextTarget:(gsec(nextTarget)||nextTarget);
    if(!nextTarget||nextTarget===dragged)return null;
    return {
      target:nextTarget,
      pos:nextPos==='before'?'before':'after'
    };
  }
  var nav=navHost(nextTarget);
  if(nav){
    if(canPlaceInlineInNav(dragged)){
      return {
        target:findNavInsertContainer(nav,nextTarget)||nav,
        pos:'inside'
      };
    }
    return {
      target:gsec(nav)||nav,
      pos:'after'
    };
  }
  var form=nearestForm(nextTarget);
  if(form){
    if((dragged.tagName&&dragged.tagName.toLowerCase()==='form')||hasNestedForm(dragged)){
      return { target:form, pos:'after' };
    }
    if(isFormFieldNode(dragged)){
      if(nextPos==='inside')return { target:form, pos:'inside' };
      return {
        target:fieldAnchor(nextTarget,form)||form,
        pos:nextPos
      };
    }
  }
  if(nextPos==='inside'){
    if(fn(nextTarget)||fm(nextTarget)||fi(nextTarget)||isInlineRef(nextTarget)){
      var host=gpar(nextTarget)||gsec(nextTarget)||nextTarget.parentElement;
      if(!host||host===dragged||(dragged.contains&&dragged.contains(host)))return null;
      nextTarget=host;
    }else if(fsec(nextTarget)){
      nextTarget=contentContainer(nextTarget)||nextTarget;
    }
  }else if(fn(nextTarget)||fm(nextTarget)||fi(nextTarget)||isInlineRef(nextTarget)){
    nextTarget=blockAnchor(nextTarget)||nextTarget;
  }
  if(!nextTarget||nextTarget===dragged||(dragged.contains&&dragged.contains(nextTarget)))return null;
  return { target:nextTarget, pos:nextPos };
}
function mediaDeleteUnit(el){
  if(!el||!el.tagName)return null;
  var media=fm(el)?el:mediaChild(el);
  if(!media||!media.tagName)return null;
  var unit=media;
  var parent=media.parentElement;
  while(parent&&parent!==document.body){
    if(parent.hasAttribute&&parent.hasAttribute('data-sz-ui'))break;
    if(mediaChild(parent)===media){
      unit=parent;
      parent=parent.parentElement;
      continue;
    }
    break;
  }
  return unit;
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
  var compositeLock=ref?compositeDropLock(ref,node):null;
  if(compositeLock&&compositeLock.parentNode){
    compositeLock.parentNode.insertBefore(node,compositeLock.nextSibling);
    return node;
  }
  if(node&&node.getAttribute&&node.getAttribute('data-sz-icon')==='true'){
    var iconRef=iconUnit(ref)||ref;
    fitIconToText(node,textChild(iconRef,gact(iconRef))||iconRef);
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
  var sectionRef=qsec(sectionId);
  var host=(placement==='inline'&&((ref&&navHost(ref))||(sectionRef&&navHost(sectionRef))||(sectionRef&&sectionRef.tagName&&(['nav','header'].indexOf(sectionRef.tagName.toLowerCase())>=0||sectionRef.getAttribute('data-sz-section-type')==='navbar')?sectionRef:null)))||null;
  if(host&&canPlaceInlineInNav(node)){
    var placedNavNode=placeInlineInNav(host,node,ref);
    if(placedNavNode)return placedNavNode;
  }
  if(host&&!canPlaceInlineInNav(node)){
    var navSection=gsec(host)||host;
    if(navSection&&navSection.parentNode){
      navSection.parentNode.insertBefore(node,navSection.nextSibling);
      return node;
    }
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
function isTextStyleProp(prop){
  return [
    'fontSize','fontFamily','fontWeight','fontStyle','fontVariantCaps','textAlign','lineHeight','letterSpacing',
    'textDecoration','textDecorationStyle','textUnderlineOffset','textTransform','whiteSpace','overflowWrap',
    'wordBreak','textIndent','columnCount','columnGap','color','textShadow','webkitTextStroke',
    'webkitBackgroundClip','backgroundClip','webkitTextFillColor'
  ].indexOf(prop)>=0;
}
function isMediaStyleProp(prop){
  return ['objectFit','objectPosition'].indexOf(prop)>=0;
}
function isLinkStyleProp(prop){
  return ['textDecorationStyle','textUnderlineOffset'].indexOf(prop)>=0;
}
function isListStyleProp(prop){
  return ['listStyleType','listStylePosition'].indexOf(prop)>=0;
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
  var target=qid(nodeId)||base;
  if(!target)return null;
  if(attr==='href'||attr==='target'){
    var iconTgt=iconUnit(target);
    if(iconTgt)return iconTgt;
    var mediaTgt=mediaChild(target)||target;
    if(mediaTgt&&mediaTgt.tagName){
      var mt=mediaTgt.tagName.toLowerCase();
      if(mt==='img'||mt==='video'||mt==='iframe'){
        var mediaParent=mediaTgt.parentElement;
        if(mediaParent&&mediaParent!==document.body){
          var parentTag=mediaParent.tagName?mediaParent.tagName.toLowerCase():'';
          var onlyMedia=mediaParent.children&&mediaParent.children.length===1;
          var hasTextSibling=!!(mediaParent.querySelector&&mediaParent.querySelector('h1,h2,h3,h4,h5,h6,p,a,button,li,span,label,figcaption,blockquote'));
          if((parentTag==='figure'||parentTag==='div'||parentTag==='span')&&onlyMedia&&!hasTextSibling){
            target=mediaParent;
          } else {
            target=mediaTgt;
          }
        } else {
          target=mediaTgt;
        }
      }
    }
  }
  var act=gact(target);
  if((attr==='href'||attr==='target')&&act&&act.tagName&&act.tagName.toLowerCase()==='a'){
    return act;
  }
  if(['src','poster','alt','allow','allowfullscreen','autoplay','loop','muted','controls'].indexOf(attr)>=0){
    return mediaChild(target)||target;
  }
  return target;
}
function styleTarget(base,nodeId,prop){
  var explicit=qid(nodeId);
  if(explicit)return explicit;
  if(!base)return null;
  if(isMediaStyleProp(prop))return mediaChild(base)||base;
  if(isListStyleProp(prop))return glist(base)||base;
  if(isLinkStyleProp(prop)){
    var linkAct=gact(base);
    if(linkAct&&linkAct.tagName&&linkAct.tagName.toLowerCase()==='a')return linkAct;
  }
  if(isTextStyleProp(prop)){
    var textAct=gact(base);
    var tgt=textChild(base,textAct);
    if(tgt)return tgt;
  }
  return base;
}
function preserveNavMediaFrame(el){
  if(!el||!el.tagName)return;
  var tag=el.tagName.toLowerCase();
  if(tag!=='img'&&tag!=='video'&&tag!=='iframe')return;
  var navHost=el.closest&&el.closest('nav,header,[data-sz-section-type="navbar"]');
  if(!navHost)return;
  var rect=el.getBoundingClientRect?el.getBoundingClientRect():null;
  if(!rect||!rect.width||!rect.height)return;
  el.style.width=Math.round(rect.width)+'px';
  el.style.height=Math.round(rect.height)+'px';
  if(tag==='img'){
    el.style.objectFit=el.style.objectFit||'contain';
    el.style.display=el.style.display||'block';
    el.style.maxWidth='100%';
    el.style.flexShrink=el.style.flexShrink||'0';
  }
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
  if(sel===t){if(textChild(t,gact(t)))enterEdit();return;}
  selEl(t);
},true);
document.addEventListener('dblclick',function(e){
  if(dragging)return;
  var t=resolve(e.target,e.clientX,e.clientY);
  if(!t)return;
  // Double-click text → enter text editing mode
  if(textChild(t,gact(t))){e.preventDefault();e.stopPropagation();selEl(t);enterEdit();return;}
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
  if(mod&&e.key==='v'&&!editing){e.preventDefault();if(!(clip&&clip.html))return;pushU();var pasted=pasteEl();if(pasted){commit();selEl(reselectTarget(pasted));}return;}
  if(e.key==='Escape'){if(editing)exitEdit();else desel();return;}
  if(!editing&&sel){
    if((e.key==='Delete'||e.key==='Backspace')&&INP.indexOf(sel.tagName.toLowerCase())<0){e.preventDefault();delEl();return;}
    if(e.key==='Enter'&&fn(sel)){e.preventDefault();enterEdit();return;}
    if(mod&&e.key==='c'){e.preventDefault();copyEl();return;}
    if(mod&&e.key==='x'){e.preventDefault();cutEl();return;}
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
    var styleTgt=styleTarget(sel,d.nodeId,d.prop);
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
    // Setting href on a non-anchor → convert or wrap it in <a> so navigation works.
    // Buttons become anchors directly; media/containers/icons are wrapped to preserve structure.
    if(d.attr==='href' && tgt.tagName.toLowerCase()!=='a' && attrVal!==null && attrVal!==undefined && attrVal!==''){
      var tagName=tgt.tagName.toLowerCase();
      if(tagName==='button' || fn(tgt) || fi(tgt)){
        var an=document.createElement('a');
        an.innerHTML=tgt.innerHTML;
        an.className=tgt.className;
        if(tgt.style.cssText)an.style.cssText=tgt.style.cssText;
        Array.from(tgt.attributes).forEach(function(at){if(at.name!=='type')an.setAttribute(at.name,at.value);});
        an.setAttribute('href',attrVal);
        tgt.parentNode.replaceChild(an,tgt);
        if(sel===tgt)sel=an;
        tgt=an;
      } else {
        var wrap=document.createElement('a');
        wrap.setAttribute('href',attrVal);
        wrap.style.textDecoration='none';
        wrap.style.color='inherit';
        var computed=window.getComputedStyle(tgt);
        var display=(computed&&computed.display)||'inline-block';
        wrap.style.display=display==='inline'?'inline-block':display;
        if(display==='block'||display==='flex'||display==='grid')wrap.style.width='100%';
        tgt.parentNode.insertBefore(wrap,tgt);
        wrap.appendChild(tgt);
        eid(wrap);ekey(wrap);
        if(sel===tgt)sel=tgt;
      }
    } else if(d.value===null||d.value===undefined){
      tgt.removeAttribute(d.attr);
    } else {
      if((d.attr==='src'||d.attr==='poster')&&tgt.tagName&&['img','video','iframe'].indexOf(tgt.tagName.toLowerCase())>=0){
        preserveNavMediaFrame(tgt);
      }
      tgt.setAttribute(d.attr,d.value??d.val);
    }
    if(tgt.tagName&&tgt.tagName.toLowerCase()==='a'&&(d.attr==='href'||d.attr==='target')){
      syncCollectionLinkField(tgt,d.attr,d.value??d.val);
    }
    if(tgt.tagName&&tgt.tagName.toLowerCase()==='video'&&(d.attr==='src'||d.attr==='poster')){
      try{tgt.load();}catch(err){}
    }
    commit();
  }
  if(d.type==='apply-text-content'){
    var textTgt=qid(d.nodeId)||textChild(sel,gact(sel))||sel;
    if(!textTgt)return;
    pushU();
    var nextText=String(d.value??'');
    if((textTgt.tagName||'').toLowerCase()==='input'||(textTgt.tagName||'').toLowerCase()==='textarea'){
      textTgt.setAttribute('value',nextText);
      textTgt.value=nextText;
      commit();
      return;
    }
    if((textTgt.tagName||'').toLowerCase()==='select'){
      var firstOption=textTgt.querySelector('option');
      if(firstOption)firstOption.textContent=nextText;
      commit();
      return;
    }
    var directText=Array.from(textTgt.childNodes).find(function(node){
      return node&&node.nodeType===3&&String(node.nodeValue||'').trim();
    });
    if(directText){
      directText.nodeValue=nextText;
      commit();
      return;
    }
    if((textTgt.tagName||'').toLowerCase()==='a'||(textTgt.tagName||'').toLowerCase()==='button'){
      var labelEl=Array.from(textTgt.children).find(function(child){
        return child&&child.tagName&&!child.querySelector('img,video,iframe,svg,input,textarea,select')&&String(child.innerText||'').trim();
      });
      if(labelEl){
        labelEl.textContent=nextText;
        commit();
        return;
      }
      var span=document.createElement('span');
      span.setAttribute('data-sz-text-label','1');
      span.textContent=nextText;
      textTgt.appendChild(span);
      commit();
      return;
    }
    textTgt.textContent=nextText;
    commit();
  }
  if(d.type==='apply-logo-items'){
    var logoTgt=qid(d.nodeId)||logoRoot(sel)||sel;
    if(!logoTgt)return;
    var track=logoTrack(logoTgt);
    if(!track)return;
    var items=Array.isArray(d.items)?d.items.map(function(item){return String(item||'').trim();}).filter(Boolean):[];
    if(!items.length)return;
    var baseChip=track.children&&track.children[0]?track.children[0]:null;
    var baseChipStyle=baseChip&&baseChip.getAttribute?String(baseChip.getAttribute('style')||''): '';
    var isScroller=!!(logoTgt.getAttribute('data-sz-logo-scroller')||logoTgt.matches('[class^="mq-"],[class*=" mq-"]'));
    function logoChipHtml(item){
      var isUrl=/^(https?:)?\\/\\//i.test(item)||/^\\//.test(item)||/\\.(svg|png|jpe?g|webp|gif)(\\?.*)?$/i.test(item);
      if(isUrl){
        return '<div data-sz-logo-chip="1" style="'+baseChipStyle+'"><img src="'+item.replace(/"/g,'&quot;')+'" alt="Logo" style="max-height:28px;width:auto;display:block;object-fit:contain;" /></div>';
      }
      return '<div data-sz-logo-chip="1" style="'+baseChipStyle+'">'+item.replace(/</g,'&lt;').replace(/>/g,'&gt;')+'</div>';
    }
    pushU();
    track.innerHTML=(isScroller?items.concat(items):items).map(logoChipHtml).join('');
    initIds();
    commit();
    selEl(logoTgt);
  }
  if(d.type==='apply-widget-state'){
    var widgetTgt=qid(d.nodeId)||widgetRoot(sel)||sel;
    var widgetInfo=widgetData(widgetTgt);
    if(!widgetInfo)return;
    var nextState=Object.assign({},widgetInfo.state||{});
    var payload=d.state&&typeof d.state==='object'&&!Array.isArray(d.state)?d.state:{};
    Object.keys(payload).forEach(function(key){
      nextState[key]=String(payload[key]??'');
    });
    pushU();
    widgetStateAttr(widgetInfo.root,nextState);
    syncWidget(widgetInfo.root);
    commit();
  }
  if(d.type==='apply-collection-items'){
    var collectionTgt=qid(d.nodeId)||collectionRoot(sel)||sel;
    var collectionInfo=collectionData(collectionTgt);
    if(!collectionInfo)return;
    var nextItems=Array.isArray(d.items)?d.items:[];
    var itemNodes=collectionItemNodes(collectionInfo.root);
    if(!itemNodes.length)return;
    pushU();
    var count=Math.min(itemNodes.length,nextItems.length||itemNodes.length);
    for(var ci=0;ci<count;ci++){
      var itemNode=itemNodes[ci];
      var payload=nextItems[ci]&&nextItems[ci].fields?nextItems[ci].fields:{};
      collectionInfo.fields.forEach(function(def){
        if(Object.prototype.hasOwnProperty.call(payload,def.key))applyCollectionField(itemNode,def,payload[def.key]);
      });
      syncCollectionDecorators(itemNode,payload);
    }
    initIds();
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
    var entranceTgt=qid(d.entranceNodeId)||styleTarget(sel,d.nodeId,'animationEntrance');
    var hoverTgt=qid(d.hoverNodeId)||styleTarget(sel,d.nodeId,'animationHover');
    var animTgt=hoverTgt||entranceTgt;
    if(!animTgt&&!entranceTgt&&!hoverTgt)return;
    if(!entranceTgt)entranceTgt=animTgt;
    if(!hoverTgt)hoverTgt=animTgt;
    pushU();
    var hasEntrance=Object.prototype.hasOwnProperty.call(d,'entrance');
    var hasHover=Object.prototype.hasOwnProperty.call(d,'hover');
    var hasDuration=Object.prototype.hasOwnProperty.call(d,'duration');
    var hasDelay=Object.prototype.hasOwnProperty.call(d,'delay');
    var hasEase=Object.prototype.hasOwnProperty.call(d,'ease');
    if(entranceTgt&&shouldForceInlineBlock(entranceTgt))entranceTgt.style.display='inline-block';
    if(hoverTgt&&shouldForceInlineBlock(hoverTgt))hoverTgt.style.display='inline-block';
    var motionRoot=sel&&((entranceTgt&&sel.contains(entranceTgt))||(hoverTgt&&sel.contains(hoverTgt)))?sel:(hoverTgt||entranceTgt||sel);
    if(hasEntrance&&(!d.entrance||d.entrance==='none')){
      entranceTgt.removeAttribute('data-sz-anim-in');
      entranceTgt.style.animation='none';
      entranceTgt.style.removeProperty('animation-name');
      entranceTgt.style.removeProperty('animation-duration');
      entranceTgt.style.removeProperty('animation-delay');
      entranceTgt.style.removeProperty('animation-timing-function');
      entranceTgt.style.removeProperty('animation-fill-mode');
      entranceTgt.style.removeProperty('will-change');
    }else if(hasEntrance){
      entranceTgt.style.animation='none';
      void entranceTgt.offsetWidth;
      entranceTgt.style.removeProperty('animation');
      entranceTgt.setAttribute('data-sz-anim-in',String(d.entrance));
      var animName=animNameForPreset(String(d.entrance));
      if(animName)entranceTgt.style.setProperty('animation-name',animName);
      else entranceTgt.style.removeProperty('animation-name');
      entranceTgt.style.setProperty('animation-duration',String(d.duration||'600ms'));
      entranceTgt.style.setProperty('animation-delay',String(d.delay||'0ms'));
      entranceTgt.style.setProperty('animation-timing-function',String(d.ease||'cubic-bezier(0.22,1,0.36,1)'));
      entranceTgt.style.setProperty('animation-fill-mode','both');
      entranceTgt.style.setProperty('will-change','transform, opacity');
    }
    if(hasHover&&(!d.hover||d.hover==='none')){
      hoverTgt.removeAttribute('data-sz-hover-fx');
      hoverTgt.removeAttribute('data-sz-hover-lock');
      if(sel&&sel.contains(hoverTgt))sel.removeAttribute('data-sz-hover-lock');
      hoverTgt.removeAttribute('data-sz-hover-preview');
      if(hoverTgt.__szHoverPreviewTimer){clearTimeout(hoverTgt.__szHoverPreviewTimer);hoverTgt.__szHoverPreviewTimer=null;}
      hoverTgt.style.transition='none';
      hoverTgt.style.removeProperty('transition-property');
      hoverTgt.style.removeProperty('transition-duration');
      hoverTgt.style.removeProperty('transition-delay');
      hoverTgt.style.removeProperty('transition-timing-function');
      hoverTgt.style.removeProperty('--sz-hover-base-transform');
      hoverTgt.style.removeProperty('--sz-hover-base-shadow');
    }else if(hasHover){
      hoverTgt.style.removeProperty('transition');
      hoverTgt.setAttribute('data-sz-hover-fx',String(d.hover));
      var hoverRoot=sel&&sel.contains(hoverTgt)?sel:hoverTgt;
      hoverRoot.setAttribute('data-sz-hover-lock','1');
      var animCs=window.getComputedStyle(hoverTgt);
      var animBaseTransform=animCs.transform&&animCs.transform!=='none'?animCs.transform:'translateZ(0px)';
      var animBaseShadow=animCs.boxShadow&&animCs.boxShadow!=='none'?animCs.boxShadow:'none';
      hoverTgt.style.setProperty('--sz-hover-base-transform',animBaseTransform);
      hoverTgt.style.setProperty('--sz-hover-base-shadow',animBaseShadow);
      hoverTgt.style.setProperty('transition-property','transform, box-shadow, filter, opacity');
      hoverTgt.style.setProperty('transition-duration',String(d.duration||'280ms'));
      hoverTgt.style.setProperty('transition-delay',String(d.delay||'0ms'));
      hoverTgt.style.setProperty('transition-timing-function',String(d.ease||'cubic-bezier(0.22,1,0.36,1)'));
      hoverTgt.style.setProperty('will-change','transform, box-shadow, filter, opacity');
      hoverTgt.setAttribute('data-sz-hover-preview','1');
      if(hoverTgt.__szHoverPreviewTimer)clearTimeout(hoverTgt.__szHoverPreviewTimer);
      hoverTgt.__szHoverPreviewTimer=setTimeout(function(){
        hoverTgt.removeAttribute('data-sz-hover-preview');
        hoverTgt.__szHoverPreviewTimer=null;
      },1400);
    }
    if(hasDuration){
      [entranceTgt,hoverTgt].filter(Boolean).forEach(function(target){
        if(d.duration)target.style.setProperty('--sz-anim-duration',String(d.duration));
        else target.style.removeProperty('--sz-anim-duration');
        if(target.getAttribute('data-sz-anim-in'))target.style.setProperty('animation-duration',String(d.duration||'600ms'));
        if(target.getAttribute('data-sz-hover-fx'))target.style.setProperty('transition-duration',String(d.duration||'280ms'));
      });
    }
    if(hasDelay){
      [entranceTgt,hoverTgt].filter(Boolean).forEach(function(target){
        if(d.delay)target.style.setProperty('--sz-anim-delay',String(d.delay));
        else target.style.removeProperty('--sz-anim-delay');
        if(target.getAttribute('data-sz-anim-in'))target.style.setProperty('animation-delay',String(d.delay||'0ms'));
        if(target.getAttribute('data-sz-hover-fx'))target.style.setProperty('transition-delay',String(d.delay||'0ms'));
      });
    }
    if(hasEase){
      [entranceTgt,hoverTgt].filter(Boolean).forEach(function(target){
        if(d.ease)target.style.setProperty('--sz-anim-ease',String(d.ease));
        else target.style.removeProperty('--sz-anim-ease');
        if(target.getAttribute('data-sz-anim-in'))target.style.setProperty('animation-timing-function',String(d.ease||'cubic-bezier(0.22,1,0.36,1)'));
        if(target.getAttribute('data-sz-hover-fx'))target.style.setProperty('transition-timing-function',String(d.ease||'cubic-bezier(0.22,1,0.36,1)'));
      });
    }
    var hasBuilderMotion=!!((entranceTgt&&entranceTgt.getAttribute('data-sz-anim-in'))||(hoverTgt&&hoverTgt.getAttribute('data-sz-hover-fx')));
    if(motionRoot){
      if(hasBuilderMotion)motionRoot.setAttribute('data-sz-motion-lock','1');
      else motionRoot.removeAttribute('data-sz-motion-lock');
    }
    commit();
  }
  if(d.type==='preview-animation'){
    var previewEntrance=qid(d.entranceNodeId)||styleTarget(sel,d.nodeId,'animationEntrance');
    var previewHover=qid(d.hoverNodeId)||styleTarget(sel,d.nodeId,'animationHover');
    if(d.mode==='entrance'&&previewEntrance){
      var preset=String(d.entrance||previewEntrance.getAttribute('data-sz-anim-in')||'').trim();
      if(!preset||preset==='none'||preset==='custom')return;
      var animName=animNameForPreset(preset);
      if(!animName)return;
      previewEntrance.style.animation='none';
      void previewEntrance.offsetWidth;
      previewEntrance.style.removeProperty('animation');
      previewEntrance.style.setProperty('animation-name',animName);
      previewEntrance.style.setProperty('animation-duration',String(d.duration||previewEntrance.style.getPropertyValue('animation-duration')||'600ms'));
      previewEntrance.style.setProperty('animation-delay','0ms');
      previewEntrance.style.setProperty('animation-timing-function',String(d.ease||previewEntrance.style.getPropertyValue('animation-timing-function')||'cubic-bezier(0.22,1,0.36,1)'));
      previewEntrance.style.setProperty('animation-fill-mode','both');
      return;
    }
    if(d.mode==='hover'&&previewHover){
      var hoverFx=String(d.hover||previewHover.getAttribute('data-sz-hover-fx')||'').trim();
      if(!hoverFx||hoverFx==='none'||hoverFx==='custom')return;
      previewHover.setAttribute('data-sz-hover-preview','1');
      if(previewHover.__szHoverPreviewTimer)clearTimeout(previewHover.__szHoverPreviewTimer);
      previewHover.__szHoverPreviewTimer=setTimeout(function(){
        previewHover.removeAttribute('data-sz-hover-preview');
        previewHover.__szHoverPreviewTimer=null;
      },1400);
    }
  }
  if(d.type==='start-edit'){if(sel)enterEdit();}
  if(d.type==='stop-edit'){if(editing)exitEdit();}
  if(d.type==='deselect'){if(editing)exitEdit();desel();}
  if(d.type==='replace-src'){if(!sel||sel.tagName.toLowerCase()!=='img')return;pushU();preserveNavMediaFrame(sel);sel.setAttribute('src',d.url);sel.removeAttribute('srcset');commit();}
  if(d.type==='delete'){delEl();}
  if(d.type==='copy'){copyEl();}
  if(d.type==='cut'){cutEl();}
  if(d.type==='paste'){if(!(clip&&clip.html))return;pushU();var _pasted=pasteEl();if(_pasted){commit();selEl(reselectTarget(_pasted));}}
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
      var _inserted=insertSmart(_sme,d.placement||'inline',d.sectionId||null,d.nodeId||null)||_sme;
      commit();
      // For icon spans, select the SVG inside so the icon panel opens immediately
      var _selTarget=(_inserted.tagName&&_inserted.tagName.toLowerCase()==='span'&&_inserted.getAttribute('data-sz-icon')==='true')?(_inserted.querySelector('svg')||_inserted):_inserted;
      selEl(_selTarget);
    }
  }
  if(d.type==='replace-text-with-icon'){
    var _rti=document.createElement('div');_rti.innerHTML=d.html||'';
    var _rtie=_rti.firstElementChild;
    if(_rtie){
      pushU();
      var _replaced=replaceTextWithIcon(_rtie,d.nodeId||null);
      if(!_replaced)_replaced=insertSmart(_rtie,d.placement||'inline',d.sectionId||null,d.nodeId||null);
      commit();
      var _replaceBase=_replaced||_rtie;
      var _replaceTarget=(_replaceBase.tagName&&_replaceBase.tagName.toLowerCase()==='span'&&_replaceBase.getAttribute('data-sz-icon')==='true')?(_replaceBase.querySelector('svg')||_replaceBase):_replaceBase;
      selEl(_replaceTarget);
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

mkOv();initIds();syncAllWidgets();ensureWidgetTimer();loadClipboardState();undos.push(snap());post('ready',{u:false,r:false});
window.addEventListener('scroll',posOv,true);window.addEventListener('resize',posOv);
})();
</scr`+`ipt>`;
}
