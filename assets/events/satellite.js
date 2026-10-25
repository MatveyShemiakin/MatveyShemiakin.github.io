/* EOxCloudless 2016/2017 (CC BY 4.0), EOX/OSM labels. Native Canvas tile pyramid. */
(()=>{'use strict';
const R=Math.PI/180,MAX_LAT=85.05112878;
const wrap=x=>((x%1)+1)%1;
function mercator(lat,lon){const a=Math.max(-MAX_LAT,Math.min(MAX_LAT,lat))*R;return{u:wrap(lon/360+.5),v:Math.max(0,Math.min(1,.5-Math.log(Math.tan(Math.PI/4+a/2))/(2*Math.PI)))}}
function level(radius,lat){return Math.max(0,Math.min(14,Math.ceil(Math.log2(2*Math.PI*radius/(256*Math.max(.1,Math.cos(lat*R)))))))}
function tileUrl(layer,z,x,y){const n=2**z;x=((x%n)+n)%n;return `https://tiles.maps.eox.at/wmts/1.0.0/${layer==='labels'?'overlay_bright_3857':'s2cloudless_3857'}/default/g/${z}/${y}/${x}.${layer==='labels'?'png':'jpg'}`}
function location(x,y,radius,lat,lon){const px=x/radius,py=-y/radius,rr=px*px+py*py;if(rr>1)return null;const z=Math.sqrt(1-rr),a=lat*R,b=lon*R,sa=Math.sin(a),ca=Math.cos(a),sb=Math.sin(b),cb=Math.cos(b),wx=px*cb-py*sa*sb+z*ca*sb,wy=py*ca+z*sa,wz=-px*sb-py*sa*cb+z*ca*cb;return{lat:Math.asin(Math.max(-1,Math.min(1,wy)))/R,lon:Math.atan2(wx,wz)/R,z}}
function create(canvas,onChange){
 const ctx=canvas.getContext('2d',{alpha:true}),cache=new Map(),failed=new Map(),pending=new Set();
 const atlas=document.createElement('canvas'),ac=atlas.getContext('2d',{willReadFrequently:true});
 let active=0,queue=[],wanted=new Set(),revision=0,geometry=null,atlasKey='',pixels=null,atlasWidth=0,success=0,errors=0;
 function key(layer,z,x,y){const n=2**z;return `${layer}/${z}/${((x%n)+n)%n}/${y}`}
 function pump(){while(active<4&&queue.length){const request=queue.shift();if(!wanted.has(request.key)||cache.has(request.key)||pending.has(request.key))continue;active++;pending.add(request.key);const image=new Image();image.crossOrigin='anonymous';image.onload=()=>{cache.set(request.key,{image,touched:Date.now()});success++;revision++;while(cache.size>128){const old=[...cache.keys()].find(k=>!wanted.has(k)&&!k.startsWith('satellite/0/'));if(!old)break;cache.delete(old)}pending.delete(request.key);active--;pump();onChange()};image.onerror=()=>{failed.set(request.key,Date.now());errors++;pending.delete(request.key);active--;pump();onChange()};image.src=tileUrl(request.layer,request.z,request.x,request.y)}}
 function request(layer,z,x,y){if(y<0||y>=2**z)return;const k=key(layer,z,x,y);wanted.add(k);if(pending.has(k))return;if(cache.has(k)){cache.get(k).touched=Date.now();return}if(failed.has(k)&&Date.now()-failed.get(k)<60000)return;if(!queue.some(q=>q.key===k))queue.push({key:k,layer,z,x,y})}
 function makeGeometry(lat,lon,zoom){
  const w=canvas.width,h=canvas.height,r=Math.min(w,h)*.405*zoom,signature=[w,h,lat,lon,zoom].join('/');if(geometry&&geometry.signature===signature)return geometry;
  const u=new Float64Array(w*h),v=new Float64Array(w*h),shade=new Float32Array(w*h);u.fill(-999);
  const centre=mercator(lat,lon).u;let u0=Infinity,u1=-Infinity,v0=1,v1=0;
  const a=lat*R,b=lon*R,sa=Math.sin(a),ca=Math.cos(a),sb=Math.sin(b),cb=Math.cos(b);
  for(let y=0;y<h;y++){const py=(h/2-y)/r;for(let x=0;x<w;x++){const px=(x-w/2)/r,rr=px*px+py*py;if(rr>1)continue;const i=y*w+x,z=Math.sqrt(1-rr),wx=px*cb-py*sa*sb+z*ca*sb,wy=py*ca+z*sa,wz=-px*sb-py*sa*cb+z*ca*cb;let mu=wrap(Math.atan2(wx,wz)/(2*Math.PI)+.5);mu-=Math.round(mu-centre);const mv=Math.max(0,Math.min(1-1e-10,.5-Math.log(Math.tan(Math.PI/4+Math.asin(Math.max(-.9962721,Math.min(.9962721,wy)))/2))/(2*Math.PI)));u[i]=mu;v[i]=mv;shade[i]=zoom<2?.72+.28*z:1;u0=Math.min(u0,mu);u1=Math.max(u1,mu);v0=Math.min(v0,mv);v1=Math.max(v1,mv)}}
  let z=level(r/(canvas.width/canvas.clientWidth),lat),bounds;
  do{const n=2**z;bounds={x0:Math.floor(u0*n),x1:Math.floor(u1*n),y0:Math.floor(v0*n),y1:Math.floor(v1*n)};if((bounds.x1-bounds.x0+1)*(bounds.y1-bounds.y0+1)<=32||z===0)break;z--}while(true);
  geometry={signature,u,v,shade,z,...bounds};return geometry;
 }
 function composite(g){
  const id=[g.z,g.x0,g.y0,g.x1,g.y1,revision].join('/');if(id===atlasKey)return;atlasKey=id;
  const n=2**g.z;atlas.width=(g.x1-g.x0+1)*256;atlas.height=(g.y1-g.y0+1)*256;atlasWidth=atlas.width;
  ac.fillStyle='#16364c';ac.fillRect(0,0,atlas.width,atlas.height);
  for(let y=g.y0;y<=g.y1;y++)for(let x=g.x0;x<=g.x1;x++){
   const dx=(x-g.x0)*256,dy=(y-g.y0)*256;
   for(let z=g.z;z>=0;z--){const d=2**(g.z-z),tile=cache.get(key('satellite',z,Math.floor(x/d),Math.floor(y/d)));if(!tile)continue;const sx=((x%d)+d)%d*256/d,sy=((y%d)+d)%d*256/d;ac.drawImage(tile.image,sx,sy,256/d,256/d,dx,dy,256,256);break}
   const labels=cache.get(key('labels',g.z,x,y));if(labels)ac.drawImage(labels.image,dx,dy,256,256);
  }
  pixels=ac.getImageData(0,0,atlas.width,atlas.height).data;
 }
 function paint(lat,lon,zoom){
  const g=makeGeometry(lat,lon,zoom);wanted=new Set();queue=queue.filter(q=>cache.has(q.key));
  request('satellite',0,0,0);
  // A coarser parent arrives first; current-resolution tiles replace it independently.
  const parent=Math.max(0,g.z-2),d=2**(g.z-parent);
  for(let y=Math.floor(g.y0/d);y<=Math.floor(g.y1/d);y++)for(let x=Math.floor(g.x0/d);x<=Math.floor(g.x1/d);x++)request('satellite',parent,x,y);
  for(let y=g.y0;y<=g.y1;y++)for(let x=g.x0;x<=g.x1;x++)request('satellite',g.z,x,y);
  for(let y=g.y0;y<=g.y1;y++)for(let x=g.x0;x<=g.x1;x++)request('labels',g.z,x,y);
  pump();composite(g);
  const image=ctx.createImageData(canvas.width,canvas.height),out=image.data,n=2**g.z;
  for(let i=0;i<g.u.length;i++){if(g.u[i]===-999)continue;const x=Math.min(atlas.width-1,Math.max(0,Math.floor((g.u[i]*n-g.x0)*256))),y=Math.min(atlas.height-1,Math.max(0,Math.floor((g.v[i]*n-g.y0)*256))),j=(y*atlasWidth+x)*4,k=i*4;out[k]=pixels[j]*g.shade[i];out[k+1]=pixels[j+1]*g.shade[i];out[k+2]=pixels[j+2]*g.shade[i];out[k+3]=255}
  ctx.putImageData(image,0,0);
  canvas.dataset.tileLevel=String(g.z);canvas.dataset.imageryLoaded=String(success);canvas.dataset.tileErrors=String(errors);
  return{level:g.z,loading:active+queue.length,available:success>0,errors};
 }
 return{paint};
}
window.EventsSatellite={mercator,level,tileUrl,location,create};
})();
