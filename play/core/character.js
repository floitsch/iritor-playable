// Copyright (C) 2026 Toit contributors.
// Local character storage replaces the unavailable account/database transport.
const characterStorageKey='iritor.core.character.v1';
function characterState(){return JSON.parse(Module.ccall('character_state_json','string',[],[]));}
function characterMessage(text){document.getElementById('character-save-status').textContent=text;}
function characterValidateFile(value){
 if(!value||value.schema!=='iritor-core-character'||![1,2,3].includes(value.version)||typeof value.name!=='string'||!value.name.trim()||new TextEncoder().encode(value.name).length>29||/[\x00-\x1f\x7f]/.test(value.name))throw Error('This is not a supported local Iritor character file.');
 const integer=n=>Number.isInteger(n)&&Number.isFinite(n),number=n=>typeof n==='number'&&Number.isFinite(n);
 if(![0,1].includes(value.custom)||![0,1].includes(value.is_dead)||!number(value.total_xp)||!number(value.current_hp)||!Array.isArray(value.pure)||value.pure.length!==6||!value.pure.every(integer)||!Array.isArray(value.spent_xp)||value.spent_xp.length!==9||!value.spent_xp.every(number)||!Array.isArray(value.items)||value.items.length>57)throw Error('Invalid character values.');
 for(let item of value.items)if(!item||!['width','height','class','x','y','slot'].every(key=>integer(item[key])))throw Error('Invalid inventory values.');
 if(value.version>=2&&value.items.some(item=>!integer(item.subclass)||!integer(item.variant)))throw Error('Missing item identity.');
 if(value.version===3&&![1,2].includes(value.gender))throw Error('Invalid character appearance.');
 if(value.version===1&&value.items.some(item=>(item.subclass||0)!==0||(item.variant||0)!==0))throw Error('Unsupported legacy item identity.');
 return value;
}
function characterImport(value){
 characterValidateFile(value);
 let values=[value.version,value.custom,value.total_xp,value.current_hp,value.is_dead,...(value.version===3?[value.gender]:[]),...value.pure,...value.spent_xp,value.items.length];
 for(let item of value.items){values.push(item.width,item.height,item.class);if(value.version>=2)values.push(item.subclass,item.variant);values.push(item.x,item.y,item.slot);}
 let status=Module.ccall('character_import','number',['string','string'],[value.name,values.join(' ')]);
 if(status!==0)throw Error('Character or inventory values were rejected ('+status+').');
 let restored=characterState();clearLootMessage();items=restored.items.map(item=>({id:item.id,w:item.width,h:item.height}));selected=0;stop();drawInventory();updateStats();updateCombat();updateCharacterControls();
 return restored;
}
function updateCharacterControls(){
 if(!ready)return;
 document.getElementById('save-character').disabled=!Module._character_can_save();document.getElementById('export-character').disabled=!Module._character_can_save();
 let saved=null;try{saved=JSON.parse(localStorage.getItem(characterStorageKey));}catch(e){}
 document.getElementById('continue-character').disabled=!saved;document.getElementById('delete-character-save').disabled=!saved;
 document.getElementById('continue-character').textContent=saved&&typeof saved.name==='string'?'Continue '+saved.name:'Continue character';
}
document.getElementById('create-local-character').onclick=()=>{
 if(!ready)return;let name=document.getElementById('new-character-name').value.trim(),pure=[...document.querySelectorAll('[data-pure]')].map(input=>Number(input.value));
 if(!name||new TextEncoder().encode(name).length>29||pure.some(n=>!Number.isInteger(n)||n<0||n>1000)){characterMessage('Enter a name of up to 29 UTF-8 bytes and whole attribute values.');return;}
 let status=Module.ccall('character_create_gender','number',['string',...Array(7).fill('number')],[name,Number(document.getElementById('new-character-gender').value),...pure]);
 if(status!==0){characterMessage(status===4?'Each attribute must be at least 10.':status===5?'The six attributes may total at most 160.':'Character could not be created ('+status+').');return;}
 clearLootMessage();stop();items=[];selected=0;drawInventory();updateStats();updateCombat();updateCharacterControls();characterMessage(name+' created with the recovered prototype starting data.');
};
document.getElementById('save-character').onclick=()=>{
 try{if(!ready||!Module._character_can_save())return;let value=characterState();characterValidateFile(value);localStorage.setItem(characterStorageKey,JSON.stringify(value));updateCharacterControls();characterMessage(value.name+' saved in this browser.');}catch(e){characterMessage('Could not save in this browser. You can export a character file instead.');}
};
document.getElementById('continue-character').onclick=()=>{
 try{let restored=characterImport(JSON.parse(localStorage.getItem(characterStorageKey)));characterMessage(restored.name+' resumed in a fresh local encounter.');}catch(e){characterMessage(e.message);}
};
document.getElementById('delete-character-save').onclick=()=>{try{localStorage.removeItem(characterStorageKey);updateCharacterControls();characterMessage('The local saved copy was deleted.');}catch(e){characterMessage('Could not delete the local saved copy.');}};
document.getElementById('export-character').onclick=()=>{
 if(!ready||!Module._character_can_save())return;let value=characterState(),blob=new Blob([JSON.stringify(value,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='iritor-character.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
document.getElementById('import-character').onchange=async event=>{
 let file=event.target.files[0];if(!file)return;
 try{if(file.size>65536)throw Error('The character file is too large.');let value=JSON.parse(await file.text());characterImport(value);characterMessage(value.name+' imported in a fresh local encounter. Save it here to keep a browser copy.');}catch(e){characterMessage(e.message);}finally{event.target.value='';}
};
