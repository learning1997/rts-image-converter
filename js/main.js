// ── Tabs
function switchTab(id,el){
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('panel-'+id).classList.add('active');
}

// ── Toast
function toast(msg,icon='✓'){
  document.getElementById('t-msg').textContent=msg;
  document.getElementById('t-icon').textContent=icon;
  const t=document.getElementById('toast');
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),3200);
}

// ════════════════════════════
//  CONVERTER
// ════════════════════════════
let convFiles=[];
let convBlobs={};
const selFmts=new Set(['webp']);

document.querySelectorAll('.fmt-chip').forEach(c=>{
  c.addEventListener('click',()=>{
    const f=c.dataset.fmt;
    if(selFmts.has(f)){selFmts.delete(f);c.classList.remove('on');}
    else{selFmts.add(f);c.classList.add('on');}
  });
});

document.getElementById('conv-input').addEventListener('change',e=>addConvFiles(e.target.files));
const convDrop=document.getElementById('conv-drop');
convDrop.addEventListener('dragover',e=>{e.preventDefault();convDrop.classList.add('drag-over');});
convDrop.addEventListener('dragleave',()=>convDrop.classList.remove('drag-over'));
convDrop.addEventListener('drop',e=>{e.preventDefault();convDrop.classList.remove('drag-over');addConvFiles(e.dataTransfer.files);});

function addConvFiles(files){
  const imgs=Array.from(files).filter(f=>f.type.startsWith('image/'));
  if(!imgs.length){toast('No image files found!','⚠');return;}
  convFiles=[...convFiles,...imgs];
  renderConvList();
  document.getElementById('conv-btn').disabled=false;
  toast(`Added ${imgs.length} image(s)`,'📂');
}

function renderConvList(){
  const list=document.getElementById('conv-list');
  list.innerHTML='';
  convFiles.forEach((f,i)=>{
    const div=document.createElement('div');
    div.className='file-item';div.id='fi-'+i;
    div.innerHTML=`<img class="file-thumb" id="fth-${i}" src=""><span class="file-name">${f.name}</span><span class="file-size">${(f.size/1024).toFixed(0)} KB</span><span class="file-status st-q" id="fst-${i}">Queued</span>`;
    list.appendChild(div);
    document.getElementById('fth-'+i).src=URL.createObjectURL(f);
  });
}

async function startConvert(){
  if(!convFiles.length||!selFmts.size){toast('Select files and formats first','⚠');return;}
  const quality=+document.getElementById('sl-q').value/100;
  const maxW=+document.getElementById('sl-w').value;
  const maxH=+document.getElementById('sl-h').value;
  const btn=document.getElementById('conv-btn');
  btn.disabled=true;btn.textContent='⚡ Converting…';
  const pw=document.getElementById('conv-pw');const pf=document.getElementById('conv-pf');
  pw.style.display='block';pf.style.width='0%';
  convBlobs={};
  let done=0;const total=convFiles.length*selFmts.size;
  for(let i=0;i<convFiles.length;i++){
    const file=convFiles[i];
    const stEl=document.getElementById('fst-'+i);
    stEl.textContent='Converting…';stEl.className='file-status st-act';
    const img=await loadImg(file);
    let w=img.naturalWidth,h=img.naturalHeight;
    if(maxW>0&&w>maxW){h=Math.round(h*maxW/w);w=maxW;}
    if(maxH>0&&h>maxH){w=Math.round(w*maxH/h);h=maxH;}
    const canvas=document.createElement('canvas');
    canvas.width=w;canvas.height=h;
    canvas.getContext('2d').drawImage(img,0,0,w,h);
    for(const fmt of selFmts){
      const mime={webp:'image/webp',jpeg:'image/jpeg',png:'image/png',gif:'image/png',bmp:'image/bmp',ico:'image/png'}[fmt]||'image/png';
      const q=['png','gif','ico'].includes(fmt)?1:quality;
      const blob=await canvasBlob(canvas,mime,q);
      const base=file.name.replace(/\.[^/.]+$/,'');
      convBlobs[`${base}.${fmt}`]=blob;
      done++;pf.style.width=(done/total*100)+'%';
    }
    stEl.textContent='✓ Done';stEl.className='file-status st-done';
  }
  btn.disabled=false;btn.textContent='⚡ Convert All';
  document.getElementById('conv-dl-zip-btn').style.display='';
  toast(`Converted ${total} file(s)!`,'✓');
}

async function downloadAll(){
  const keys=Object.keys(convBlobs);if(!keys.length)return;
  if(keys.length===1){dlBlob(convBlobs[keys[0]],keys[0]);return;}
  const zip=new JSZip();keys.forEach(k=>zip.file(k,convBlobs[k]));
  dlBlob(await zip.generateAsync({type:'blob'}),'rts-converted.zip');
  toast('ZIP downloaded!','↓');
}

function clearConv(){
  convFiles=[];convBlobs={};
  document.getElementById('conv-list').innerHTML='';
  document.getElementById('conv-btn').disabled=true;
  document.getElementById('conv-dl-zip-btn').style.display='none';
  document.getElementById('conv-pw').style.display='none';
  document.getElementById('conv-pf').style.width='0%';
  document.getElementById('conv-input').value='';
}

// ════════════════════════════
//  PLACEHOLDER
// ════════════════════════════
let phFiles=[];
let phAlign='center';
let phMode='custom'; // 'custom' | 'upload'
const loadedFonts=new Set(['Syne','DM Mono']);
const IMG_EXT=/\.(jpe?g|png|webp|gif|bmp|tiff?|svg|avif|ico|heic|heif)$/i;
function isImg(f){return f.type.startsWith('image/')||IMG_EXT.test(f.name);}

// ── Mode switching
function setMode(mode){
  phMode=mode;
  document.getElementById('mode-custom-btn').classList.toggle('active', mode==='custom');
  document.getElementById('mode-upload-btn').classList.toggle('active', mode==='upload');
  document.getElementById('mode-custom-section').style.display = mode==='custom'?'':'none';
  document.getElementById('mode-upload-section').style.display = mode==='upload'?'':'none';
  document.getElementById('upload-size-note').style.display    = mode==='upload'?'':'none';
  // Buttons
  document.getElementById('dl-custom-btn').style.display = mode==='custom'?'':'none';
  document.getElementById('dl-one-btn').style.display    = 'none';
  document.getElementById('ph-dl-zip-btn').style.display    = 'none';
  // Note text
  document.getElementById('preview-note').textContent =
    mode==='custom'
      ? 'Preview shows custom size — change W/H above to adjust.'
      : 'Preview uses first uploaded image\'s dimensions.';
  if(mode==='upload' && phFiles.length) updateUploadButtons();
  renderPH();
}

function updateUploadButtons(){
  document.getElementById('dl-one-btn').style.display  = phFiles.length>=1 ? '' : 'none';
  document.getElementById('ph-dl-zip-btn').style.display  = phFiles.length>1  ? '' : 'none';
  // Update button label for single file
  if(phFiles.length===1){
    document.getElementById('dl-one-btn').textContent='↓ Download Placeholder';
  } else {
    document.getElementById('dl-one-btn').textContent='↓ Download First Image';
  }
}

// ── Size preset helper
function setSize(w,h){
  document.getElementById('ph-w').value=w;
  document.getElementById('ph-h').value=h;
  renderPH();
}

// ── Individual file upload
document.getElementById('ph-file-input').addEventListener('change',function(e){
  const files=Array.from(e.target.files).filter(isImg);
  if(!files.length){toast('No image files found!','⚠');return;}
  phFiles=[...phFiles,...files];
  refreshPhUI();
  toast(`Added ${files.length} image(s)`,'🖼');
});

// ── Folder upload — filter by extension (file.type can be empty in some browsers)
document.getElementById('ph-folder-input').addEventListener('change',function(e){
  const imgs=Array.from(e.target.files).filter(isImg);
  if(!imgs.length){toast('No images found in folder!','⚠');return;}
  phFiles=[...phFiles,...imgs];
  refreshPhUI();
  toast(`Loaded ${imgs.length} image(s) from folder`,'📁');
});

function clearPh(){
  phFiles=[];
  document.getElementById('ph-badge').style.display='none';
  document.getElementById('ph-src-grid').innerHTML='';
  document.getElementById('dl-one-btn').style.display='none';
  document.getElementById('ph-dl-zip-btn').style.display='none';
  document.getElementById('ph-file-input').value='';
  document.getElementById('ph-folder-input').value='';
}

function refreshPhUI(){
  document.getElementById('ph-badge').style.display='inline-flex';
  document.getElementById('ph-cnt').textContent=`${phFiles.length} image${phFiles.length>1?'s':''} loaded`;
  updateUploadButtons();
  // Render thumbs (max 48)
  const grid=document.getElementById('ph-src-grid');
  grid.innerHTML='';
  phFiles.slice(0,48).forEach(f=>{
    const div=document.createElement('div');div.className='src-thumb';
    const img=document.createElement('img');img.src=URL.createObjectURL(f);
    const ov=document.createElement('div');ov.className='src-ov';
    ov.textContent=f.name.replace(/^.*[/\\]/,'');
    div.appendChild(img);div.appendChild(ov);grid.appendChild(div);
  });
  if(phFiles.length>48){
    const more=document.createElement('div');
    more.className='src-thumb';
    more.style.cssText='display:flex;align-items:center;justify-content:center;font-family:DM Mono,monospace;font-size:.65rem;color:var(--text2);text-align:center;padding:4px;';
    more.textContent=`+${phFiles.length-48} more`;
    grid.appendChild(more);
  }
  // Update preview using first image dimensions
  if(phMode==='upload') renderPH();
}

// ── Presets
const PRESETS={
  classic:{bg:'#ebebeb',fg:'#888888'},
  dark:   {bg:'#1e1e2e',fg:'#555577'},
  blue:   {bg:'#0d1b2e',fg:'#00bcd4'},
  warm:   {bg:'#f5f0e8',fg:'#a07850'},
  green:  {bg:'#0d1a0d',fg:'#00cc55'},
};
function applyPreset(){
  const v=document.getElementById('ph-preset').value;
  if(!PRESETS[v])return;
  document.getElementById('ph-bg').value=PRESETS[v].bg;
  document.getElementById('ph-bg-hex').value=PRESETS[v].bg;
  document.getElementById('ph-fg').value=PRESETS[v].fg;
  document.getElementById('ph-fg-hex').value=PRESETS[v].fg;
  renderPH();
}
function syncHex(pid,hid){document.getElementById(hid).value=document.getElementById(pid).value;}
function syncPicker(pid,hid){
  const hex=document.getElementById(hid).value;
  if(/^#[0-9a-f]{6}$/i.test(hex)){document.getElementById(pid).value=hex;renderPH();}
}
function setAlign(el,align){
  phAlign=align;
  document.querySelectorAll('.aln-btn').forEach(b=>b.classList.remove('on'));
  el.classList.add('on');
  renderPH();
}
function loadGFont(){
  const font=document.getElementById('ph-font').value;
  if(!loadedFonts.has(font)){
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href=`https://fonts.googleapis.com/css2?family=${encodeURIComponent(font)}&display=swap`;
    document.head.appendChild(link);
    loadedFonts.add(font);
    document.fonts.load(`20px "${font}"`).then(()=>renderPH());
    return;
  }
  renderPH();
}

// ── Render preview
async function renderPH(){
  let w,h;
  if(phMode==='upload' && phFiles.length>0){
    // Use first image's actual dimensions for preview
    try{
      const img=await loadImg(phFiles[0]);
      w=img.naturalWidth||800; h=img.naturalHeight||600;
    }catch(e){w=800;h=600;}
  } else {
    w=parseInt(document.getElementById('ph-w').value)||800;
    h=parseInt(document.getElementById('ph-h').value)||600;
  }
  const canvas=document.getElementById('ph-canvas');
  canvas.width=w; canvas.height=h;
  drawPH(canvas,w,h);
  document.getElementById('dim-badge').textContent=`${w} × ${h}`;
}

function getSettings(){
  return{
    bg: document.getElementById('ph-bg').value,
    fg: document.getElementById('ph-fg').value,
    txt:document.getElementById('ph-text').value,
    fs: parseInt(document.getElementById('ph-fs').value)||32,
    fnt:document.getElementById('ph-font').value,
    dim:document.getElementById('ph-dim').value==='1',
  };
}

function drawPH(canvas,w,h,s){
  if(!s)s=getSettings();
  const{bg,fg,txt,fs,fnt,dim}=s;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,w,h);
  // Diagonal stripes
  ctx.save();
  ctx.strokeStyle=alphaC(fg,.13);ctx.lineWidth=1;
  const step=Math.max(20,Math.min(w,h)/14);
  for(let x=-h;x<w+h;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+h,h);ctx.stroke();}
  ctx.restore();
  // Cross diagonals
  ctx.save();
  ctx.strokeStyle=alphaC(fg,.22);ctx.lineWidth=1.5;
  ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,h);ctx.stroke();
  ctx.beginPath();ctx.moveTo(w,0);ctx.lineTo(0,h);ctx.stroke();
  ctx.restore();
  // Center crosshair
  const cx=w/2,cy=h/2,cr=Math.min(w,h)*.075;
  ctx.save();
  ctx.strokeStyle=alphaC(fg,.3);ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(cx,cy,cr,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx-cr*1.5,cy);ctx.lineTo(cx+cr*1.5,cy);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx,cy-cr*1.5);ctx.lineTo(cx,cy+cr*1.5);ctx.stroke();
  ctx.restore();
  // Border
  ctx.save();
  ctx.strokeStyle=alphaC(fg,.35);ctx.lineWidth=2;
  ctx.strokeRect(1,1,w-2,h-2);
  ctx.restore();
  // Text
  if(txt){
    ctx.save();
    const safFs=Math.min(fs,w/3,h/3);
    ctx.font=`600 ${safFs}px "${fnt}",sans-serif`;
    ctx.textAlign='center';ctx.textBaseline='middle';
    let ty=h/2;
    if(phAlign==='top')   ty=safFs*1.8;
    if(phAlign==='bottom')ty=h-safFs*1.8;
    const tw=Math.min(ctx.measureText(txt).width,w-32);
    const pad=safFs*.32;
    ctx.fillStyle=alphaC(bg,.8);
    rRect(ctx,cx-tw/2-pad,ty-safFs/2-pad,tw+pad*2,safFs+pad*2,6);ctx.fill();
    ctx.fillStyle=fg;
    ctx.fillText(txt,cx,ty,w-32);
    ctx.restore();
  }
  // Dimension badge
  if(dim){
    ctx.save();
    const label=`${w} × ${h}`;
    const fsize=Math.max(11,Math.min(14,Math.min(w,h)/25));
    ctx.font=`500 ${fsize}px "DM Mono",monospace`;
    ctx.textAlign='left';ctx.textBaseline='top';
    const bw=ctx.measureText(label).width+16,bh=fsize+10;
    ctx.fillStyle=alphaC(fg,.18);
    rRect(ctx,10,10,bw,bh,4);ctx.fill();
    ctx.fillStyle=alphaC(fg,.75);
    ctx.fillText(label,18,15);
    ctx.restore();
  }
}

function alphaC(hex,alpha){
  let h=hex.replace('#','');
  if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${alpha})`;
}
function rRect(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);
  ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);
  ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();
}

// ── Download: custom mode (canvas as-is)
function dlSingle(){
  const canvas=document.getElementById('ph-canvas');
  const fmt=document.getElementById('ph-fmt').value;
  const mime=mimeFor(fmt);
  canvas.toBlob(blob=>{
    const w=canvas.width, h=canvas.height;
    dlBlob(blob,`placeholder-${w}x${h}.${fmt}`);
    toast('Downloaded!','↓');
  },mime,.93);
}

// ── Download: upload mode — single file or all as ZIP
async function dlFromUpload(asZip){
  if(!phFiles.length){toast('No images loaded!','⚠');return;}
  const fmt=document.getElementById('ph-fmt').value;
  const mime=mimeFor(fmt);
  const s=getSettings();
  const note=document.getElementById('gen-note');

  const filesToProcess = asZip ? phFiles : [phFiles[0]];
  note.style.display='block';

  const zip = asZip ? new JSZip() : null;
  const folder = asZip ? zip.folder('placeholders') : null;
  let done=0;

  for(const f of filesToProcess){
    note.textContent=`Generating… ${done+1} / ${filesToProcess.length}`;
    let w=800,h=600;
    try{
      const img=await loadImg(f);
      w=img.naturalWidth||800; h=img.naturalHeight||600;
    }catch(e){}
    const c=document.createElement('canvas');
    c.width=w;c.height=h;
    drawPH(c,w,h,s);
    const blob=await canvasBlob(c,mime,.93);
    if(asZip){
      const rel=(f.webkitRelativePath||f.name).replace(/\.[^/.]+$/,'');
      folder.file(`${rel}.${fmt}`,blob);
    } else {
      const base=f.name.replace(/\.[^/.]+$/,'');
      dlBlob(blob,`${base}.${fmt}`);
    }
    done++;
    await new Promise(r=>setTimeout(r,0));
  }

  note.style.display='none';
  if(asZip){
    dlBlob(await zip.generateAsync({type:'blob'}),'rts-placeholders.zip');
    toast(`${phFiles.length} placeholders downloaded!`,'✓');
  } else {
    toast('Downloaded!','↓');
  }
}

// ── Shared helpers
function loadImg(file){
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>res(img);img.onerror=rej;
    img.src=URL.createObjectURL(file);
  });
}
function canvasBlob(canvas,mime,q){return new Promise(r=>canvas.toBlob(r,mime,q));}
function dlBlob(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();}
function mimeFor(fmt){return{png:'image/png',jpeg:'image/jpeg',webp:'image/webp'}[fmt]||'image/png';}

// Init
setMode('custom');
['ph-w','ph-h','ph-text','ph-fs'].forEach(id=>{
  document.getElementById(id).addEventListener('input',renderPH);
});
document.getElementById('ph-dim').addEventListener('change',renderPH);