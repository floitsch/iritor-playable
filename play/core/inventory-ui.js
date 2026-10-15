// Copyright (C) 2026 Toit contributors.
// Original inventory geometry/art with the existing local selection transactions.
var originalInventoryLayout=null,originalInventoryAtlas=null;
function inventoryUIFit(){const panel=document.getElementById('inventory'),stage=document.getElementById('stage'),scene=document.getElementById('canvas');let sceneScale=scene.getBoundingClientRect().width/900,top=25*sceneScale,scale=Math.min(sceneScale,(stage.clientHeight-top)/586);panel.style.top=top+'px';panel.style.width=Math.max(1,512*scale)+'px';}
function inventoryUIItemRect(item){let slot=Module._inventory_item_slot(item.id),x=Module._inventory_item_x(item.id),y=Module._inventory_item_y(item.id);return Array.from({length:4},(_,c)=>Module._inventory_ui_item_rect(slot,x,y,item.w,item.h,c));}
function drawOriginalInventory(){const canvas=document.getElementById('grid'),g=canvas.getContext('2d');g.clearRect(0,0,512,586);items=JSON.parse(Module.ccall('inventory_items_json','string',[],[]));if(!items.some(i=>i.id===selected))selected=0;document.getElementById('inventory-actions').hidden=document.getElementById('inventory').hidden;canvas.dataset.selected=String(selected);inventoryUIFit();if(!originalInventoryLayout||!originalInventoryAtlas)return;
 const r=originalInventoryLayout.rectangles;function sprite(source,target){g.drawImage(originalInventoryAtlas,...[source[0],source[1],source[2]-source[0],source[3]-source[1]],target[0],target[1]-25,target[2]-target[0],target[3]-target[1]);}
 sprite(r.INVENTORY_BACKGROUND_SRC,r.INVENTORY_BACKGROUND_TRG);const male=Module._character_get_gender()!==2;if(male)sprite(r.INVENTORY_MALE_BACKGROUND_SRC,r.INVENTORY_MALE_BACKGROUND_TRG);canvas.dataset.maleOverlay=String(male);
 for(let item of items){if(Module._inventory_item_slot(item.id)===-99)continue;let picture=lootItemImage(item.id),rect=inventoryUIItemRect(item);item.x=Module._inventory_item_x(item.id);item.y=Module._inventory_item_y(item.id);if(picture&&picture.complete&&picture.naturalWidth)g.drawImage(picture,rect[0],rect[1]-25,rect[2]-rect[0],rect[3]-rect[1]);if(item.id===selected){g.strokeStyle='#f1c96f';g.lineWidth=2;g.strokeRect(rect[0]+1,rect[1]-25+1,rect[2]-rect[0]-2,rect[3]-rect[1]-2);}}
 canvas.dataset.ready='true';
}
function originalInventoryClick(event){if(!ready||!originalInventoryLayout)return;let g=document.getElementById('grid'),b=g.getBoundingClientRect(),x=Math.trunc((event.clientX-b.left)*512/b.width),y=Math.trunc((event.clientY-b.top)*586/b.height+25);
 function hit(w,h){return [0,1,2].map(c=>Module._inventory_ui_hit(x,y,w,h,c));}
 let [slot,cellX,cellY]=hit(1,1);
 if(slot!==-98&&slot!==-99){let worn=Module._inventory_equipped(slot);if(worn){if(!Module._inventory_unequip(worn)){document.getElementById('inventory-status').textContent='There is no room in the bag.';return;}}else if(selected){if(!Module._inventory_equip(selected,slot)){document.getElementById('inventory-status').textContent=slot===-95?'Secondary equipment is not restored in this browser stage.':'This item does not fit that slot or character.';return;}}inventorySync();updateCharacterControls();return;}
 let item=slot===-98?items.find(i=>Module._inventory_item_slot(i.id)===-98&&cellX>=i.x&&cellX<i.x+i.w&&cellY>=i.y&&cellY<i.y+i.h):null;
 if(item)selected=item.id;else if(selected){let current=items.find(i=>i.id===selected);if(current){let destination=hit(current.w,current.h);if(destination[0]===-98&&Module._inventory_move(selected,destination[1],destination[2]))selected=0;}}
 drawInventory();
}
new MutationObserver(()=>{document.getElementById('inventory-actions').hidden=document.getElementById('inventory').hidden;if(!document.getElementById('inventory').hidden&&ready)drawInventory();}).observe(document.getElementById('inventory'),{attributes:true,attributeFilter:['hidden']});
setInterval(()=>{if(ready&&!document.getElementById('inventory').hidden)drawInventory();},100);
(async function(){const response=await fetch('hud/inventory-layout.json');if(!response.ok)throw Error('Inventory layout could not load.');originalInventoryLayout=await response.json();let image=new Image();image.src='hud/atlas.png';await image.decode();originalInventoryAtlas=image;new ResizeObserver(inventoryUIFit).observe(document.getElementById('stage'));if(ready)drawInventory();})().catch(error=>{document.getElementById('status').textContent=error.message;console.error(error);});
