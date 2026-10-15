// Copyright (C) 2026 Toit contributors.
// Original item icons/identities with local corpse interaction controls.
let lootCatalogMap=new Map(),lootIconImages=new Map();
var lootCatalogReady=fetch('loot-catalog.json').then(response=>{if(!response.ok)throw Error('Item catalogue could not load.');return response.json();}).then(rows=>{
 for(let row of rows){let key=[row.item_class,row.subclass,row.variant].join('-');lootCatalogMap.set(key,row);let img=new Image();img.src=row.icon;img.onload=()=>{if(ready)drawInventory();};lootIconImages.set(key,img);}
 if(ready)drawInventory();return rows;
});
function lootItemKey(id){return [Module._inventory_item_class(id),Module._inventory_item_subclass(id),Module._inventory_item_variant(id)].join('-');}
function lootItemInfo(id){return lootCatalogMap.get(lootItemKey(id));}
function lootItemImage(id){return lootIconImages.get(lootItemKey(id));}
function clearLootMessage(){document.getElementById('loot-status').textContent='';}
function inventorySync(){items=JSON.parse(Module.ccall('inventory_items_json','string',[],[]));selected=0;drawInventory();}
document.getElementById('loot-corpse').onclick=()=>{
 if(!ready)return;stop();
 if(!Module._loot_selected()){document.getElementById('loot-status').textContent='Select a corpse to loot.';return;}
 inventorySync();updateCombat();updateCharacterControls();
 let kept=Module._loot_placed(),discarded=Module._loot_discarded();
 document.getElementById('loot-status').textContent='Corpse looted: '+kept+' item'+(kept===1?'':'s')+' kept.'+(discarded?' '+discarded+' did not fit in the bag.':'');
};
