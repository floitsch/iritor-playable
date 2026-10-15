// Copyright (C) 2026 Toit contributors.
// Local paper-doll controls using original slot, packing and gender checks.
var armorSlotLayout=[{slot:-94,x:8,y:0,h:2,label:'Head'},{slot:-92,x:8,y:2,h:3,label:'Body'},{slot:-93,x:5,y:3,h:2,label:'Arms'},{slot:-91,x:8,y:5,h:3,label:'Legs'},{slot:-96,x:11,y:2,h:4,label:'Weapon'}];
function drawArmorSlots(g){
 for(let cell of armorSlotLayout){
  g.fillStyle='#202e3d';g.fillRect(cell.x*24,cell.y*24,48,cell.h*24);g.strokeStyle='#6b8195';g.strokeRect(cell.x*24+.5,cell.y*24+.5,47,cell.h*24-1);
  let id=Module._inventory_equipped(cell.slot),picture=id?lootItemImage(id):null;
  if(picture&&picture.complete&&picture.naturalWidth){let item=items.find(i=>i.id===id);if(item)g.drawImage(picture,cell.x*24,cell.y*24,item.w*24,item.h*24);}
  g.font='10px system-ui';g.fillStyle='#ecf1f5';g.fillText(cell.label,cell.x*24+2,cell.y*24+11);
 }
}
function armorSlotClick(x,y){
 let cell=armorSlotLayout.find(c=>x>=c.x&&x<c.x+2&&y>=c.y&&y<c.y+c.h);if(!cell)return false;
 let id=Module._inventory_equipped(cell.slot);
 if(id){if(!Module._inventory_unequip(id)){document.getElementById('inventory-status').textContent='There is no room in the bag.';return true;}}
 else if(selected){if(!Module._inventory_equip(selected,cell.slot)){document.getElementById('inventory-status').textContent='This item does not fit that slot or character.';return true;}}
 inventorySync();updateCharacterControls();return true;
}
