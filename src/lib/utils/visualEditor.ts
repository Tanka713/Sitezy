/**
 * Sitezy Visual Editor — minimal iframe script.
 *
 * Philosophy: NO floating toolbars, NO injected UI inside the page.
 * The iframe only does THREE things:
 *   1. Reports hover/click to parent (postMessage)
 *   2. Highlights the hovered/selected element with a clean CSS outline
 *   3. Enters contentEditable on double-click for direct text editing
 *
 * All controls live in the React sidebar — zero chrome inside the page.
 */
export function buildVisualEditorScript(): string {
  return `<script>
(function(){
'use strict';

var SEL_ATTR  = 'data-sz';
var sel       = null;   // selected element
var isEditing = false;
var undoStack = [];
var redoStack = [];

// ── CSS injected into page ────────────────────────────────────────────────────
var style = document.createElement('style');
style.textContent = [
  '[data-sz-hover]{outline:2px dashed rgba(99,102,241,0.55)!important;outline-offset:2px!important;cursor:pointer!important;}',
  '[data-sz-selected]{outline:2px solid #f97316!important;outline-offset:2px!important;}',
  '[data-sz-editing]{outline:2px solid #f97316!important;outline-offset:2px!important;caret-color:#f97316;}',
  // Remove pointer events from SVG children to avoid ghost clicks
  'svg,svg *{pointer-events:none!important;}',
].join('');
document.head.appendChild(style);

// ── postMessage ───────────────────────────────────────────────────────────────
function post(type, payload){
  try{ window.parent.postMessage({source:'sitezy-editor',type:type,payload:payload||{}}, '*'); }catch(e){}
}

// ── Snapshot / undo ───────────────────────────────────────────────────────────
function snap(){ return document.body.innerHTML; }

function saveUndo(){
  var h = snap();
  if(undoStack.length && undoStack[undoStack.length-1]===h) return;
  undoStack.push(h);
  if(undoStack.length>80) undoStack.shift();
  redoStack=[];
  post('stack-change',{canUndo:undoStack.length>1,canRedo:false});
}

function doUndo(){
  if(undoStack.length<=1) return;
  redoStack.push(undoStack.pop());
  document.body.innerHTML = undoStack[undoStack.length-1];
  post('html-update',{html:document.body.innerHTML});
  post('stack-change',{canUndo:undoStack.length>1,canRedo:redoStack.length>0});
  deselect();
}

function doRedo(){
  if(!redoStack.length) return;
  var h = redoStack.pop();
  undoStack.push(h);
  document.body.innerHTML = h;
  post('html-update',{html:document.body.innerHTML});
  post('stack-change',{canUndo:undoStack.length>1,canRedo:redoStack.length>0});
  deselect();
}

function commit(){
  post('html-update',{html:snap()});
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function isEditor(el){ return !el||!el.closest; }

function getSection(el){
  if(!el) return null;
  var c=el;
  while(c&&c.parentElement&&c.parentElement!==document.body) c=c.parentElement;
  return (c&&c!==document.body&&c.nodeType===1)?c:null;
}

function describeEl(el){
  if(!el||!el.tagName) return null;
  var tag = el.tagName.toLowerCase();
  var text = (el.innerText||el.textContent||'').trim().slice(0,120);
  var isImg = tag==='img';
  var isText = ['h1','h2','h3','h4','h5','h6','p','span','a','li','button','label','strong','em','small','figcaption'].includes(tag);
  var isSec = el.parentElement===document.body;
  var cs = window.getComputedStyle(el);
  return {
    tag: tag,
    text: text,
    src: isImg ? el.src : null,
    href: el.href||el.getAttribute('href')||null,
    isImg: isImg,
    isText: isText,
    isSec: isSec,
    isBtn: tag==='a'||tag==='button'||(el.getAttribute('role')==='button'),
    fontSize: Math.round(parseFloat(cs.fontSize)),
    fontWeight: cs.fontWeight,
    textAlign: cs.textAlign,
    color: cs.color,
    backgroundColor: cs.backgroundColor,
    backgroundImage: cs.backgroundImage,
    padding: cs.padding,
    borderRadius: cs.borderRadius,
    section: isSec ? null : (getSection(el) ? true : false),
  };
}

// ── Selection ─────────────────────────────────────────────────────────────────
function deselect(){
  if(sel){
    sel.removeAttribute('data-sz-selected');
    sel.removeAttribute('data-sz-editing');
    if(sel.contentEditable==='true'){
      sel.contentEditable='false';
      isEditing=false;
    }
  }
  sel=null;
  post('deselect',{});
}

function selectEl(el){
  if(sel===el) return;
  deselect();
  sel=el;
  el.setAttribute('data-sz-selected','1');
  post('select',describeEl(el));
}

// ── Edit mode ─────────────────────────────────────────────────────────────────
function startEdit(el){
  if(isEditing&&sel===el) return;
  if(isEditing) endEdit();
  selectEl(el);
  isEditing=true;
  saveUndo();
  el.contentEditable='true';
  el.setAttribute('data-sz-editing','1');
  el.removeAttribute('data-sz-selected');
  el.focus();
  // cursor to end
  try{
    var r=document.createRange(), s=window.getSelection();
    r.selectNodeContents(el); r.collapse(false);
    s.removeAllRanges(); s.addRange(r);
  }catch(e){}
  post('editing',{tag:el.tagName,text:(el.innerText||'').slice(0,120)});
}

function endEdit(){
  if(!isEditing||!sel) return;
  isEditing=false;
  sel.contentEditable='false';
  sel.removeAttribute('data-sz-editing');
  sel.setAttribute('data-sz-selected','1');
  commit();
  post('select',describeEl(sel));
}

// ── Apply style from parent ───────────────────────────────────────────────────
function applyStyle(prop,val){
  if(!sel) return;
  saveUndo();
  sel.style[prop]=val;
  commit();
}

function applyAttr(attr,val){
  if(!sel) return;
  saveUndo();
  sel.setAttribute(attr,val);
  commit();
}

function replaceSrc(url){
  if(!sel||sel.tagName.toLowerCase()!=='img') return;
  saveUndo();
  sel.src=url;
  sel.removeAttribute('srcset');
  commit();
}

function applyBgImage(url){
  if(!sel) return;
  saveUndo();
  sel.style.backgroundImage='url("'+url+'")';
  sel.style.backgroundSize='cover';
  sel.style.backgroundPosition='center';
  commit();
}

function deleteSelected(){
  if(!sel) return;
  saveUndo();
  sel.remove();
  deselect();
  commit();
}

function duplicateSection(){
  var sec = sel ? (sel.parentElement===document.body?sel:getSection(sel)) : null;
  if(!sec) return;
  saveUndo();
  var clone=sec.cloneNode(true);
  clone.removeAttribute('id');
  sec.parentNode.insertBefore(clone,sec.nextSibling);
  commit();
}

function moveSectionUp(){
  var sec = sel ? (sel.parentElement===document.body?sel:getSection(sel)) : null;
  if(!sec) return;
  var prev=sec.previousElementSibling;
  if(prev){ saveUndo(); sec.parentNode.insertBefore(sec,prev); commit(); }
}

function moveSectionDown(){
  var sec = sel ? (sel.parentElement===document.body?sel:getSection(sel)) : null;
  if(!sec) return;
  var next=sec.nextElementSibling;
  if(next){ saveUndo(); sec.parentNode.insertBefore(next,sec); commit(); }
}

function setBgColor(color){
  var sec = sel ? (sel.parentElement===document.body?sel:getSection(sel)) : null;
  if(!sec) return;
  saveUndo(); sec.style.backgroundColor=color; commit();
}

function setSectionPadding(pad){
  var sec = sel ? (sel.parentElement===document.body?sel:getSection(sel)) : null;
  if(!sec) return;
  saveUndo(); sec.style.padding=pad; commit();
}

// ── Hover ─────────────────────────────────────────────────────────────────────
var lastHover=null;
document.addEventListener('mouseover',function(e){
  var el=e.target;
  if(!el||!el.tagName||el===document.body||el===document.documentElement) return;
  if(el===lastHover) return;
  if(lastHover) lastHover.removeAttribute('data-sz-hover');
  // Don't hover-highlight the selected element
  if(el!==sel){ el.setAttribute('data-sz-hover','1'); }
  lastHover=el;
},true);

document.addEventListener('mouseout',function(e){
  if(e.target&&e.target.removeAttribute) e.target.removeAttribute('data-sz-hover');
},true);

// ── Click → select ────────────────────────────────────────────────────────────
document.addEventListener('click',function(e){
  var el=e.target;
  if(!el||!el.tagName) return;
  if(el===document.body||el===document.documentElement){ deselect(); return; }
  // If we're editing this element, let clicks through
  if(isEditing&&sel&&sel.contains(el)) return;
  e.preventDefault();
  e.stopPropagation();
  if(isEditing) endEdit();
  selectEl(el);
},true);

// ── Double-click → edit ───────────────────────────────────────────────────────
document.addEventListener('dblclick',function(e){
  var el=e.target;
  if(!el||!el.tagName||el===document.body) return;
  var tag=el.tagName.toLowerCase();
  var editable=['h1','h2','h3','h4','h5','h6','p','span','a','li','button','label',
                'strong','em','small','figcaption','td','th','blockquote','div'];
  // Don't edit SVG, img, body-level sections directly
  if(!editable.includes(tag)) return;
  e.preventDefault();
  e.stopPropagation();
  startEdit(el);
},true);

// ── Keyboard ──────────────────────────────────────────────────────────────────
document.addEventListener('keydown',function(e){
  var mod=e.metaKey||e.ctrlKey;
  if(mod&&e.key==='z'&&!e.shiftKey){ e.preventDefault(); doUndo(); return; }
  if(mod&&(e.key==='y'||(e.key==='z'&&e.shiftKey))){ e.preventDefault(); doRedo(); return; }
  if(e.key==='Escape'){
    if(isEditing) endEdit();
    else deselect();
    return;
  }
  if(!isEditing&&sel&&(e.key==='Delete'||e.key==='Backspace')){
    // Only delete if not a form element
    var t=sel.tagName.toLowerCase();
    if(!['input','textarea','select'].includes(t)){
      e.preventDefault();
      deleteSelected();
    }
  }
  if(!isEditing&&sel&&e.key==='Enter'){
    var t=sel.tagName.toLowerCase();
    if(['h1','h2','h3','h4','h5','h6','p','span','a','button','label','li','strong','em','small'].includes(t)){
      e.preventDefault();
      startEdit(sel);
    }
  }
},false);

// ── Messages from parent ──────────────────────────────────────────────────────
window.addEventListener('message',function(e){
  if(!e.data||e.data.target!=='sitezy-iframe') return;
  var d=e.data;
  if(d.type==='apply-style')      applyStyle(d.prop, d.val);
  if(d.type==='apply-attr')       applyAttr(d.attr, d.val);
  if(d.type==='replace-src')      replaceSrc(d.url);
  if(d.type==='apply-bg-image')   applyBgImage(d.url);
  if(d.type==='delete-selected')  deleteSelected();
  if(d.type==='duplicate-section') duplicateSection();
  if(d.type==='move-up')          moveSectionUp();
  if(d.type==='move-down')        moveSectionDown();
  if(d.type==='set-bg-color')     setBgColor(d.color);
  if(d.type==='set-padding')      setSectionPadding(d.pad);
  if(d.type==='undo')             doUndo();
  if(d.type==='redo')             doRedo();
  if(d.type==='deselect')         deselect();
  if(d.type==='start-edit')       { if(sel) startEdit(sel); }
});

// ── Init ──────────────────────────────────────────────────────────────────────
undoStack.push(snap());
post('editor-ready',{canUndo:false,canRedo:false});

})();
</script>`;
}
