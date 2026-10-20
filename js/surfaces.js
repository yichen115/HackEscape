/* global THREE */
// 所有表面在本地生成；不需要加载纹理图片或模型。
const cache=new Map();
function random(seed) { return () => { seed=(1664525*seed+1013904223)>>>0; return seed/4294967296; }; }
export function surface(kind='metal') {
  if(cache.has(kind))return cache.get(kind);
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const c=canvas.getContext('2d'),rand=random(71+kind.length);
  const bases={metal:'#aab0b5',concrete:'#8b9094',wood:'#b9a18a',carpet:'#a7a5a0',tile:'#b4bec6',paper:'#bdbbb4'};
  c.fillStyle=bases[kind]||bases.metal;c.fillRect(0,0,512,512);
  for(let i=0;i<16000;i++) {
    const v=rand()>.5?255:0;c.fillStyle=`rgba(${v},${v},${v},${kind==='carpet'?.13:.045})`;
    const x=rand()*512,y=rand()*512;
    c.fillRect(x,y,kind==='metal'?rand()*24+2:1,kind==='wood'?rand()*20+2:1);
  }
  if(kind==='wood') {
    for(let i=0;i<125;i++) {
      const x=i*4+rand()*2;c.strokeStyle=`rgba(47,28,12,${rand()*.12+.04})`;c.lineWidth=rand()*2+.3;c.beginPath();
      for(let y=0;y<=512;y+=8) {const dx=Math.sin(y*.017+i)*3;c.lineTo(x+dx,y);}c.stroke();
    }
  }
  if(kind==='tile') {
    c.strokeStyle='rgba(36,46,55,.35)';c.lineWidth=4;c.strokeRect(2,2,508,508);
    c.strokeStyle='rgba(240,248,255,.3)';c.lineWidth=1;c.strokeRect(7,7,498,498);
    c.fillStyle='#525c64';for(const x of [15,497])for(const y of [15,497]) {c.beginPath();c.arc(x,y,2,0,Math.PI*2);c.fill();}
  }
  const tx=new THREE.CanvasTexture(canvas);tx.wrapS=tx.wrapT=THREE.RepeatWrapping;
  tx.encoding=THREE.sRGBEncoding;tx.anisotropy=4;
  cache.set(kind,tx);return tx;
}
export function textured(color,kind,options={}) {
  return new THREE.MeshStandardMaterial({color,map:surface(kind),roughness:kind==='wood'?.5:.72,...options});
}
export function contactTexture() {
  if(cache.has('contact'))return cache.get('contact');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');
  const g=c.createRadialGradient(64,64,8,64,64,64);g.addColorStop(0,'rgba(0,0,0,.48)');g.addColorStop(.5,'rgba(0,0,0,.23)');g.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=g;c.fillRect(0,0,128,128);const tx=new THREE.CanvasTexture(canvas);cache.set('contact',tx);return tx;
}
export function studioEnvironment(renderer) {
  const faces=[];
  for(let side=0;side<6;side++) {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;const c=canvas.getContext('2d');
    const g=c.createLinearGradient(0,0,0,64);g.addColorStop(0,side===2?'#8695a5':'#4b6576');g.addColorStop(.5,'#263540');g.addColorStop(1,'#11171d');
    c.fillStyle=g;c.fillRect(0,0,64,64);if(side!==3){c.fillStyle='#b6c8d1';c.fillRect(12,8,5,30);c.fillStyle='#716f63';c.fillRect(45,18,7,20);}faces.push(canvas);
  }
  const cube=new THREE.CubeTexture(faces);cube.encoding=THREE.sRGBEncoding;cube.needsUpdate=true;
  const generator=new THREE.PMREMGenerator(renderer);const target=generator.fromCubemap(cube);
  generator.dispose();cube.dispose();return target;
}
