// Copyright (C) 2026 Toit contributors.
(async function(){
 const canvas=document.getElementById('core-vitals'),ctx=canvas.getContext('2d'),layout=await (await fetch('hud/layout.json')).json(),atlas=new Image();
 atlas.src='hud/atlas.png';await atlas.decode();let showText=true;
 function sprite(source,target){const s=source.map(Math.trunc),w=s[2]-s[0],h=s[3]-s[1];if(w>0&&h>0)ctx.drawImage(atlas,s[0],s[1],w,h,target[0],target[1],target[2]-target[0],target[3]-target[1]);}
 window.updateCoreVitals=function(){if(!ready||typeof Module._hud_vital_value!=='function')return;ctx.clearRect(0,0,900,25);const r=layout.rectangles;sprite(r.VITAL_BACKGROUND_SRC,r.VITAL_BACKGROUND_TRG);let values=[];
  for(let [i,name] of ['HP','SP','EP'].entries()){let maximum=Module._hud_vital_value(i,1),current=Module._hud_vital_value(i,0),rect=Array.from({length:8},(_,c)=>Module._hud_bar_rect(i,maximum,current,c));sprite(rect.slice(0,4),rect.slice(4));values.push({name,maximum,current,rect});}
  if(showText){ctx.font=layout.font.replace('Arial ','')+'px Arial, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='white';for(let [i,v] of values.entries()){let target=r['VITAL_'+v.name+'BAR_TRG'];ctx.fillText(Module._hud_round(v.current)+' / '+Module._hud_round(v.maximum),(target[0]+target[2])/2,(target[1]+target[3])/2);}}
  canvas.dataset.values=JSON.stringify(values);canvas.dataset.textVisible=String(showText);canvas.setAttribute('aria-label',values.map(v=>v.name+' '+v.current+' / '+v.maximum).join(', '));
 };
 canvas.onclick=event=>{const b=canvas.getBoundingClientRect(),x=(event.clientX-b.left)*900/b.width;if(x>=layout.rectangles.VITAL_BACKGROUND_TRG[0]&&x<=layout.rectangles.VITAL_BACKGROUND_TRG[2]){showText=!showText;updateCoreVitals();}};
 canvas.addEventListener('keydown',event=>{if(event.code==='Enter'||event.code==='Space'){event.preventDefault();event.stopPropagation();if(!event.repeat){showText=!showText;updateCoreVitals();}}});
 setInterval(updateCoreVitals,100);updateCoreVitals();
})().catch(error=>{document.getElementById('status').textContent='Vital strip could not load: '+error.message;console.error(error);});
