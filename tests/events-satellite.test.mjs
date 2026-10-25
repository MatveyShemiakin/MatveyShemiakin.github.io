import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const window={};
const source=fs.existsSync('assets/events/satellite.js')?fs.readFileSync('assets/events/satellite.js','utf8'):'';
vm.runInNewContext(source,{window});
test('satellite tiles progress from planet to city detail',()=>{
 const s=window.EventsSatellite;assert.ok(s,'satellite renderer exists');
 assert.equal(s.level(180,0),3);assert.ok(s.level(180*128,0)>s.level(180,0));assert.equal(s.level(1e9,0),14);
});
test('Mercator wraps the date line and clamps the poles',()=>{
 const s=window.EventsSatellite;assert.ok(s);
 assert.equal(s.mercator(0,180).u,s.mercator(0,-180).u);
 assert.ok(Math.abs(s.mercator(0,0).v-.5)<1e-10);
 for(const lat of [-90,90]){const p=s.mercator(lat,0);assert.ok(p.v>=0&&p.v<=1)}
 assert.equal(s.tileUrl('satellite',3,-1,2),s.tileUrl('satellite',3,7,2));
 assert.match(s.tileUrl('satellite',3,7,2),/s2cloudless_3857\/default\/g\/3\/2\/7.jpg$/);
 assert.match(s.tileUrl('labels',3,7,2),/overlay_bright_3857/);
});
test('inverse sphere projection centres on the chosen city at every zoom',()=>{
 const s=window.EventsSatellite;assert.ok(s);
 for(const radius of [150,150000]){const p=s.location(0,0,radius,55.76,37.62);assert.ok(Math.abs(p.lat-55.76)<1e-8);assert.ok(Math.abs(p.lon-37.62)<1e-8)}
 assert.equal(s.location(200,0,150,0,0),null);
 const p=s.location(10,0,150000,1.35,103.82);assert.ok(p.lon>103.82);
});

function rendererHarness(){
 const requests=[],outputs=[];const local={};
 const context={fillRect(){},drawImage(){},getImageData(x,y,w,h){return{data:new Uint8ClampedArray(w*h*4).fill(128)}},createImageData(w,h){return{data:new Uint8ClampedArray(w*h*4)}},putImageData(image){outputs.push(image)}};
 const canvas={width:32,height:32,clientWidth:320,dataset:{},getContext(){return context}};
 class TileImage{set src(url){requests.push({url,image:this})}}
 vm.runInNewContext(source,{window:local,document:{createElement(){return{width:0,height:0,getContext(){return context}}}},Image:TileImage});
 const renderer=local.EventsSatellite.create(canvas,()=>{});
 return{renderer,canvas,requests,outputs};
}
test('raster keeps the globe transparent outside the horizon and uses higher resolution for a city',()=>{
 const h=rendererHarness();const world=h.renderer.paint(25,35,1);const image=h.outputs.at(-1).data;
 assert.equal(image[3],0);assert.equal(image[(16*32+16)*4+3],255);
 const city=h.renderer.paint(1.35,103.82,1024);assert.ok(city.level>world.level);assert.ok(city.level<=14);
});
test('repainting does not duplicate in-flight satellite requests or flood a failed provider',()=>{
 const h=rendererHarness();h.renderer.paint(25,35,1);assert.equal(h.requests.length,4);
 h.renderer.paint(25,35,1);assert.equal(h.requests.length,4);
 for(let i=0;i<h.requests.length;i++){assert.ok(i<100);h.requests[i].image.onerror()}
 const count=h.requests.length;h.renderer.paint(25,35,1);assert.equal(h.requests.length,count);
 assert.ok(h.renderer.paint(25,35,1).errors>0);
});
