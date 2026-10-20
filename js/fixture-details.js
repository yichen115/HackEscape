/* global THREE */
import { M } from './materials.js';
import { box, cable, bevelBox } from './detail.js';
import { surface, textured } from './surfaces.js';

function cloth(shape,material,depth=.12) {
  const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:Math.min(.015,depth*.2),bevelThickness:Math.min(.013,depth*.12),bevelSegments:3,steps:1,curveSegments:10});
  geometry.translate(0,0,-depth/2);
  const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
export function hangingCoat(coat) {
  if(!coat)return;
  const fabric=surface('carpet').clone();fabric.repeat.set(2.5,3);fabric.needsUpdate=true;
  const mat=new THREE.MeshStandardMaterial({color:0x303a45,map:fabric,bumpMap:fabric,bumpScale:.0009,roughness:.98,metalness:0,envMapIntensity:.025});
  const seamMat=new THREE.MeshStandardMaterial({color:0x111820,roughness:1,envMapIntensity:0});
  const lapelMat=mat.clone();lapelMat.color.setHex(0x414b55);
  coat.clear();coat.name='hanging-coat';coat.rotation.y=Math.PI;coat.position.z=-.14;
  cable(coat.parent,[[0,2,0],[0,2,-.16]],M.metal,.016);
  // 一个轮廓包含衣身、肩膀和双袖。上臂接缝不再由独立网格相互搭接。
  const torso=new THREE.Shape();
  torso.moveTo(-.06,1.86);torso.lineTo(-.17,1.86);
  torso.quadraticCurveTo(-.30,1.86,-.39,1.69);
  torso.quadraticCurveTo(-.49,1.26,-.565,.87);
  torso.quadraticCurveTo(-.565,.83,-.53,.82);torso.lineTo(-.43,.84);
  torso.quadraticCurveTo(-.35,1.17,-.285,1.37);
  torso.lineTo(-.265,.75);torso.quadraticCurveTo(-.12,.70,0,.735);torso.quadraticCurveTo(.12,.70,.265,.75);
  torso.lineTo(.285,1.37);torso.quadraticCurveTo(.35,1.17,.43,.84);
  torso.lineTo(.53,.82);torso.quadraticCurveTo(.565,.83,.565,.87);
  torso.quadraticCurveTo(.49,1.26,.39,1.69);torso.quadraticCurveTo(.30,1.86,.17,1.86);
  torso.lineTo(.06,1.86);torso.lineTo(.09,1.74);torso.lineTo(0,1.67);torso.lineTo(-.09,1.74);torso.closePath();
  const body=cloth(torso,mat,.048);body.name='coat-torso';coat.add(body);
  for(const sign of [-1,1]) {
    // 袖口与缝线只有薄薄的表面细节，承载体仍是同一个连续衣身。
    const cuff=box(coat,[.12,.025,.005],[sign*.49,.858,.033],seamMat);cuff.rotation.z=sign*.20;
    cable(coat,[[sign*.37,1.66,.032],[sign*.415,1.31,.033],[sign*.49,.88,.032]],seamMat,.0013);
    const lapel=new THREE.Shape();lapel.moveTo(sign*.055,1.85);lapel.lineTo(sign*.20,1.78);lapel.lineTo(sign*.095,1.51);lapel.lineTo(sign*.015,1.70);lapel.closePath();
    const fold=cloth(lapel,lapelMat,.008);fold.position.z=.035;coat.add(fold);
    box(coat,[.133,.155,.004],[sign*.15,1.09,.032],mat);
    cable(coat,[[sign*.216,1.163,.036],[sign*.15,1.156,.036],[sign*.085,1.163,.036]],seamMat,.003);
    cable(coat,[[sign*.21,1.53,.032],[sign*.195,1.22,.034],[sign*.215,.80,.032]],seamMat,.0013);
  }
  cable(coat,[[.008,1.65,.032],[.007,1.25,.033],[.006,.79,.032]],seamMat,.004);
  for(let i=0;i<5;i++) {
    const button=new THREE.Mesh(new THREE.CylinderGeometry(.013,.013,.006,12),M.metalDark);button.rotation.x=Math.PI/2;button.position.set(-.035,1.48-i*.14,.036);coat.add(button);
  }
  cable(coat,[[-.27,1.73,0],[0,1.93,0],[.27,1.73,0]],M.metal,.008);
  cable(coat,[[0,1.92,0],[0,1.99,0],[.045,2.035,0],[.065,1.99,0]],M.metal,.008);
  coat.userData.modelRepaired=true;coat.userData.continuousShoulders=true;
}
function cardPrint(parent,text,width,height,y) {
  const canvas=document.createElement('canvas');canvas.width=400;canvas.height=Math.round(400*height/width);const c=canvas.getContext('2d'),ch=canvas.height;
  c.fillStyle='#c8ccc1';c.fillRect(0,0,400,ch);c.fillStyle='#264c4e';c.fillRect(0,0,400,Math.min(58,ch*.26));
  c.fillStyle='#d2e0d9';c.font='24px monospace';c.fillText('MERIDIAN',18,Math.min(39,ch*.2));
  c.fillStyle='#283b3d';c.font='24px monospace';c.fillText(text,18,ch*.49);
  c.fillStyle='#687d78';c.font='16px monospace';c.fillText('AUTHORISED EQUIPMENT',18,ch*.64);
  for(let i=0;i<60;i++){c.fillStyle=i%3?'#3f4d49':'#c8ccc1';c.fillRect(18+i*4,ch-40,2,25);}
  const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
  const face=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map:texture,roughness:.9,envMapIntensity:.02}));
  face.rotation.x=-Math.PI/2;face.position.y=y;
  Object.defineProperty(face,'visible',{configurable:true,enumerable:true,get:()=>parent.visible});
  parent.add(face);return face;
}
export function drawerDetails(group,kind,pickables) {
  const find=id=>pickables.find(p=>p.id===id)?.mesh;
  const office=kind==='office',drawer=find(office?'r3_desk_drawer':'r2_drawer');if(!drawer)return;
  const width=office?.85:1,depth=office?.6:.7;
  const boards=textured(office?0x705038:0x384650,office?'wood':'metal',{roughness:.74,metalness:office?0:.4,envMapIntensity:.08});
  for(const mesh of [...drawer.children]) {
    const dimensions=mesh.userData.visualBoxSize;
    if(dimensions && (dimensions[0]===width || dimensions[2]===depth))mesh.material=boards;
    if(dimensions?.[0]===(office?.22:.3) && dimensions[1]===(office?.04:.05))drawer.remove(mesh);
  }
  const fixed=new THREE.Group();fixed.name='drawer-fixed-housing';drawer.parent.add(fixed);
  // 固定柜体与移动抽屉是两个节点，导轨不会随抽屉一起滑出。
  if(office) {
    for(const x of [.535,1.465])box(fixed,[.045,.92,.87],[x,.53,-.32],boards);
    box(fixed,[.98,.08,.87],[1,.065,-.32],boards);
    box(fixed,[.90,.92,.035],[1,.53,.0975],boards);
    box(fixed,[.90,.10,.035],[1,.9275,-.7475],boards);
    box(fixed,[.90,.415,.035],[1,.3125,-.7475],boards);
    for(const x of [.56,1.44])box(fixed,[.012,.033,.69],[x,.66,-.37],M.metalDark);
    const front=drawer.children.find(m=>m.userData.visualBoxSize?.[1]===.35);if(front)front.position.z=-.32;
    cable(drawer,[[-.095,0,-.347],[-.095,0,-.39],[.095,0,-.39],[.095,0,-.347]],M.metal,.009);
    const kit=find('r3_dustkit');kit.position.y=-.13;cardPrint(kit,'LATENT PRINT KIT',.27,.135,.129);
  } else {
    fixed.position.copy(drawer.position);fixed.position.y=0;
    for(const x of [-.5175,.5175])box(fixed,[.025,.84,.82],[x,.5,-.06],boards);
    box(fixed,[1.06,.08,.82],[0,.065,-.06],boards);
    box(fixed,[1.06,.025,.82],[0,.929,-.06],boards);
    box(fixed,[1.015,.84,.025],[0,.5,-.4575],boards);
    box(fixed,[1.015,.14,.025],[0,.8525,.3375],boards);
    box(fixed,[1.015,.23,.025],[0,.2,.3375],boards);
    for(const x of [-.502,.502])box(fixed,[.012,.032,.6],[x,.515,-.05],M.metal);
    cable(drawer,[[-.13,0,.355],[-.13,0,.402],[.13,0,.402],[.13,0,.355]],M.metal,.012);
    const card=find('r2_keycard');card.position.y=-.1475;card.material=new THREE.MeshStandardMaterial({color:0xa3b9aa,roughness:.8,envMapIntensity:.03});cardPrint(card,'SECURITY ACCESS',.30,.475,.009);
    const flashlight=find('r2_flashlight');flashlight.position.set(.23,-.065,.02);flashlight.rotation.y=Math.PI/2;
    const lens=new THREE.Mesh(new THREE.CircleGeometry(.061,24),new THREE.MeshStandardMaterial({color:0xb6c6cd,roughness:.22,metalness:.25,envMapIntensity:.3}));lens.rotation.y=Math.PI/2;lens.position.x=.304;flashlight.add(lens);
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.067,.005,6,24),M.metalDark);rim.rotation.y=Math.PI/2;rim.position.x=.306;flashlight.add(rim);
  }
  for(const x of [-.4,.4])for(const z of [-.3,.3])box(fixed,[.075,.025,.075],[office?1+x:x,.0125,office?-.32+z:-.06+z],M.black);
  for(const x of [-width/2-.006,width/2+.006])box(drawer,[.01,.028,depth*.78],[x,-.04,0],M.metal);
  drawer.userData.fixedHousing=fixed;drawer.userData.modelRepaired=true;
}

export function staticDisplay(face,title,subtitle) {
  const canvas=document.createElement('canvas');canvas.width=1024;
  const size=face.geometry.parameters;canvas.height=Math.round(1024*size.height/size.width);
  const c=canvas.getContext('2d'),h=canvas.height;
  c.fillStyle='#070f15';c.fillRect(0,0,1024,h);c.fillStyle='#68808b';c.font='25px monospace';c.fillText('MERIDIAN / LOCAL ACCESS',35,48);
  c.strokeStyle='#263a44';c.beginPath();c.moveTo(35,74);c.lineTo(989,74);c.stroke();
  c.fillStyle='#9bb1b4';c.font='39px monospace';c.textAlign='center';c.fillText(title,512,h*.48);
  c.fillStyle='#637d87';c.font='24px monospace';c.fillText(subtitle,512,h*.63);c.textAlign='start';
  const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
  face.material=new THREE.MeshBasicMaterial({map:texture,toneMapped:false});
}
export function keypadDisplay(root,length) {
  if(!root)return;
  let face=root.children.find(m=>m.geometry?.type==='PlaneGeometry');
  if(!face){face=new THREE.Mesh(new THREE.PlaneGeometry(.5,.17),new THREE.MeshBasicMaterial({color:0x8ca8a8,toneMapped:false}));face.position.set(0,.23,.0415);root.add(face);}
  const canvas=document.createElement('canvas');canvas.width=400;canvas.height=136;const c=canvas.getContext('2d');
  c.fillStyle='#03090d';c.fillRect(0,0,400,136);c.fillStyle='#b5c9ca';c.font='44px monospace';c.textAlign='center';c.fillText(Array(length).fill('_').join(' '),200,65);
  c.fillStyle='#536971';c.font='20px monospace';c.fillText('KEYPAD / INPUT',200,112);
  const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;face.material.map=texture;face.material.needsUpdate=true;
  face.name='keypad-display';
  const labels=[['1','2','3'],['4','5','6'],['7','8','9'],['CLR','0','OK']];
  for(const button of root.children) {
    const size=button.userData.visualBoxSize;
    if(!size || size[0]!==.11 || size[1]!==.11)continue;
    const row=Math.round((.05-button.position.y)/.14),column=Math.round((button.position.x+.2)/.2);
    button.position.y=.05-row*.125;
    const cv=document.createElement('canvas');cv.width=cv.height=128;const ctx=cv.getContext('2d');
    ctx.fillStyle='#afbfc1';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`${labels[row][column].length>1?32:70}px monospace`;ctx.fillText(labels[row][column],64,66);
    const map=new THREE.CanvasTexture(cv);map.encoding=THREE.sRGBEncoding;
    const ink=new THREE.Mesh(new THREE.PlaneGeometry(.083,.083),new THREE.MeshStandardMaterial({map,transparent:true,depthWrite:false,roughness:.85,envMapIntensity:.02}));
    ink.position.z=.0106;button.add(ink);
  }
}
