/* global THREE */
import { repairModels } from './model-audit.js';
import { M, emissive } from './materials.js';
import { box, bevelBox, cable, label, batchStatic } from './detail.js';
import { textured, surface, contactTexture } from './surfaces.js';

const screwGeometry=new THREE.CircleGeometry(.012,6);
const serverPanelMaterial=textured(0x28323b,'metal',{roughness:.65,metalness:.35,envMapIntensity:.12});

const palette = {
  server: {accent:0x458f9e,wall:0x29343e,floor:0x303944},
  monitor:{accent:0x467789,wall:0x26313c,floor:0x232b33},
  office: {accent:0xba8b4d,wall:0x453b31,floor:0x403c36},
  secure: {accent:0x408ac0,wall:0x25333f,floor:0x2b3742},
};
function contact(parent,x,z,w,d) {
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({map:contactTexture(),transparent:true,depthWrite:false,opacity:.65,toneMapped:false}));
  mesh.rotation.x=-Math.PI/2;mesh.position.set(x,(parent.userData.floorSurfaceHeight||0)+.003,z);parent.add(mesh);
}
function chair(parent, x,z,rotation=0) {
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;parent.add(g);
  box(g,[.69,.14,.65],[0,.64,0],M.leather);
  const back=box(g,[.66,.71,.12],[0,1.03,-.29],M.leather);back.rotation.x=-.12;
  box(g,[.08,.45,.08],[0,.31,0],M.metal);
  for(const s of [-1,1]) {
    box(g,[.05,.29,.06],[s*.38,.73,.05],M.metal);
    box(g,[.08,.05,.43],[s*.38,.88,0],M.black);
  }
  for(let i=0;i<5;i++) {
    const a=i*Math.PI*2/5;
    const leg=box(g,[.055,.06,.48],[Math.sin(a)*.22,.14,Math.cos(a)*.22],M.metalDark);leg.rotation.y=a;
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.06,12),M.black);
    wheel.rotation.z=Math.PI/2;wheel.position.set(Math.sin(a)*.43,.075,Math.cos(a)*.43);wheel.position.y=(parent.userData.floorSurfaceHeight||0)+.055;g.add(wheel);
  }
  contact(parent,x,z,1.1,1.1);return g;
}
function plant(parent,x,z) {
  const g=new THREE.Group();g.position.set(x,0,z);parent.add(g);
  const pot=new THREE.Mesh(new THREE.CylinderGeometry(.27,.2,.46,24),textured(0x79766e,'concrete',{roughness:.9}));pot.position.y=.23;g.add(pot);
  const leafMat=new THREE.MeshStandardMaterial({color:0x182b1c,roughness:.95,envMapIntensity:.08,side:THREE.DoubleSide});
  for(let i=0;i<11;i++) {
    const a=i*2.4,height=.7+(i%4)*.18;
    cable(g,[[0,.44,0],[Math.sin(a)*.12,height*.8,Math.cos(a)*.12],[Math.sin(a)*.28,height,Math.cos(a)*.28]],M.wood,.008);
    const leaf=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),leafMat);
    leaf.scale.set(.48,1.6,.1);leaf.position.set(Math.sin(a)*.3,height+.12,Math.cos(a)*.3);leaf.rotation.set(.3,a,-Math.sin(a)*.5);g.add(leaf);
  }
  contact(parent,x,z,.9,.9);
}
function cityWindow(parent,W,D) {
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;const c=canvas.getContext('2d');
  const g=c.createLinearGradient(0,0,0,512);g.addColorStop(0,'#111c30');g.addColorStop(1,'#384450');c.fillStyle=g;c.fillRect(0,0,1024,512);
  c.fillStyle='#a0aab0';c.beginPath();c.arc(810,85,18,0,Math.PI*2);c.fill();
  for(let i=0;i<26;i++) {
    const x=i*43-10,h=95+(i*73%210);c.fillStyle=i%2?'#111b27':'#182432';c.fillRect(x,512-h,39,h);
    for(let row=0;row<h/12-1;row++)for(let col=0;col<4;col++) {
      if((i*11+row*7+col*13)%5<2)continue;c.fillStyle=(row+i)%3?'#8a8069':'#6f8b9c';c.fillRect(x+5+col*8,520-h+row*12,3,5);
    }
  }
  const tx=new THREE.CanvasTexture(canvas);tx.encoding=THREE.sRGBEncoding;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(4.2,2.2),new THREE.MeshBasicMaterial({map:tx,toneMapped:false,color:0x9caabb}));
  mesh.position.set(-1.4,2.6,D/2-.12);mesh.rotation.y=Math.PI;parent.add(mesh);
  for(const x of [-3.5,-2.1,-.7,.7])box(parent,[.055,2.3,.09],[x,2.6,D/2-.16],M.metalDark);
  for(const y of [1.47,3.73])box(parent,[4.3,.06,.12],[-1.4,y,D/2-.17],M.metalDark);
  for(let i=0;i<5;i++)box(parent,[.042,2.8,.12],[.85+i*.13,2.5,D/2-.22],M.wood);
}
function rackDetails(rack, idx) {
  for(const s of [-1,1]) {
    box(rack,[.055,4.28,.08],[s*.565,2.2,.75],M.metal);
    for(let y=.35;y<4.25;y+=.19)box(rack,[.016,.028,.014],[s*.563,y,.798],M.black);
  }
  box(rack,[1.12,.085,.08],[0,4.35,.75],M.metal);
  box(rack,[1.2,.1,1.48],[0,.12,0],M.black);
  label(rack,`RACK / 0${idx+1}`,[0,4.04,.786],.88,'#8ab0bb',0,'MERIDIAN / DC-B3');
  for(let row=0;row<12;row++) {
    const y=.6+row*.28;
    // 每排仅保留原有的一枚状态灯；新细节不增加任何红色/绿色计数线索。
    box(rack,[.36,.018,.018],[.19,y+.064,.77],M.metal);
    for(let i=0;i<7;i++)box(rack,[.012,.12,.01],[.02+i*.052,y,.779],M.black);
    for(const x of [-.48,.48]) {
      const screw=new THREE.Mesh(screwGeometry,M.usbMet);screw.position.set(x,y,.779);rack.add(screw);
    }
  }
  batchStatic(rack);
}
export function dressRoom(group, {kind,W,D,H,pickables,shadowLight}) {
  const style=palette[kind],office=kind==='office';
  group.updateMatrixWorld(true);
  const protectedRegions=pickables.map(p=>new THREE.Box3().setFromObject(p.mesh));
  group.traverse(m=>{if(m.isMesh && m.geometry.type==='PlaneGeometry' && m.material.map)protectedRegions.push(new THREE.Box3().setFromObject(m));});
  // 先处理原模型；保持变换、尺寸、父子关系、可见性及 pickId 不变。
  group.traverse(mesh=> {
    if(!mesh.isMesh)return;
    if(mesh.material.isMeshBasicMaterial)mesh.material.toneMapped=false;
    const p=mesh.geometry.parameters;
    if(mesh.geometry.type==='BoxGeometry' && p) {
      const shell=p.width>=W-.2 || p.depth>=D-.2 || p.height>=H-.2;
      mesh.userData.visualBoxSize=[p.width,p.height,p.depth];
      if(!shell)mesh.geometry=Math.min(p.width,p.height,p.depth)>.035 ? bevelBox(p.width,p.height,p.depth) : bevelBox(p.width,p.height,p.depth,0);
      if(kind==='server' && p.width===1.05 && p.height===.22)mesh.material=serverPanelMaterial;
      mesh.castShadow=!shell;mesh.receiveShadow=true;
      if(shell && p.height>.3) {
        mesh.material=textured(office?0x343430:style.wall,'concrete',{roughness:.9,envMapIntensity:.12});
      }
      if(office && p.width>=W-.2 && p.depth>=D-.2 && mesh.position.y>H-.2)mesh.material=textured(0x444844,'concrete',{roughness:.95,envMapIntensity:.08});
      if(p.width>=W-.2 && p.depth>=D-.2 && mesh.position.y<0) {
        const texture=surface(office?'carpet':'tile').clone();texture.needsUpdate=true;texture.repeat.set(W/(office?1:2),D/(office?1:2));
        mesh.material=new THREE.MeshStandardMaterial({color:style.floor,map:texture,roughness:office?.98:.67,metalness:office?0:.22,envMapIntensity:.2});
      }
    } else if(mesh.geometry.type!=='PlaneGeometry' && mesh.geometry.type!=='CircleGeometry') {
      mesh.castShadow=true;mesh.receiveShadow=true;
    }
  });
  repairModels(group,{kind,pickables,W,D});
  if(shadowLight) {
    shadowLight.castShadow=true;shadowLight.shadow.mapSize.set(512,512);
    shadowLight.shadow.bias=-.001;shadowLight.shadow.normalBias=.025;
    shadowLight.shadow.camera.near=.2;shadowLight.shadow.camera.far=25;
  }
  const details=new THREE.Group();details.name='architectural-details';details.userData.floorSurfaceHeight=kind==='server'?.02:0;group.add(details);
  if(kind==='server') {
    const tileMaterial=textured(0x303944,'tile',{roughness:.7,metalness:.18,envMapIntensity:.15});
    let keyMaterial;
    for(const m of [...group.children]) {
      const dimensions=m.userData.visualBoxSize;
      if(dimensions?.[0]===1.95 && dimensions[1]===.02){m.material=tileMaterial;group.remove(m);details.add(m);}
      if(dimensions?.[0]===.065 && dimensions[1]===.03){keyMaterial=keyMaterial||m.material;m.material=keyMaterial;group.remove(m);details.add(m);}
    }
  }
  const trim=textured(office?0x51483b:0x3a4854,'metal',{metalness:.65,roughness:.43,envMapIntensity:.2});
  const dark=M.metalDark;
  // 踢脚线、柱间接缝、顶棚模块。右侧门洞始终留空。
  for(const z of [-D/2+.14,D/2-.14]) {
    box(details,[W-.3,.12,.05],[0,.1,z],trim);
    box(details,[W-.3,.1,.08],[0,H-.24,z],dark);
    for(let x=-W/2+1.7;x<W/2-.5;x+=1.7) {
      const obstructsClue=protectedRegions.some(b=>x>b.min.x-.04 && x<b.max.x+.04 && z>b.min.z-.06 && z<b.max.z+.06);
      if(!obstructsClue)box(details,[.025,H-.55,.025],[x,H/2,z+.003*Math.sign(-z)],dark);
    }
  }
  box(details,[.05,.12,D-.3],[-W/2+.14,.1,0],trim);
  for(const side of [-1,1])for(const z of [-D/2+1.2,D/2-1.2]) {
    box(details,[.06,.12,2.05],[side*(W/2-.14),.1,z],trim);
  }
  for(let z=-D/2+1.25;z<D/2;z+=1.6) {
    box(details,[W-.3,.09,.08],[0,H-.18,z],trim);
    for(const x of [-W*.24,W*.24]) {
      box(details,[.5,.06,1.22],[x,H-.22,z],dark);
      // 光源实体只有很弱的自发光，不添加照明，保留台灯与手电的原有照明流程。
      box(details,[.31,.012,1.04],[x,H-.256,z],emissive(office?0x68533a:kind==='server'?0x050a0d:0x182f38),false);
    }
  }
  if(!office) {
    // 顶部电缆桥架 + 支架 + 维修风管。
    for(const x of [-W*.32,-W*.32+.42])box(details,[.045,.12,D-.4],[x,H-.56,0],trim);
    for(let z=-D/2+.4;z<D/2;z+=.36)box(details,[.42,.025,.035],[-W*.32+.21,H-.59,z],dark);
    for(let i=0;i<3;i++)cable(details,[[-W*.32+.08+i*.11,H-.55,-D/2+.3],[-W*.32+.08+i*.11,H-.51,0],[-W*.32+.08+i*.11,H-.55,D/2-.3]],M.black,.021);
    box(details,[.56,.32,D-.4],[W*.32,H-.42,0],trim);
    for(let z=-D/2+.5;z<D/2;z+=1.1)box(details,[.58,.025,.06],[W*.32,H-.59,z],M.metal);
  }
  // 进门位置的框架与门楣铭牌，不覆盖密码盘或往返标志。
  const opening=kind==='secure'?4:3,doorHeight=kind==='server'?4:3.2;
  for(const z of [-opening/2,opening/2])box(details,[.12,doorHeight,.1],[W/2-.19,doorHeight/2,z],trim);
  box(details,[.12,.13,opening+.15],[W/2-.19,doorHeight+.04,0],trim);
  label(details,office?'MERIDIAN / 07':kind==='server'?'DC / B3':kind==='monitor'?'SEC / 06':'OBELISK / 08',[W/2-.21,doorHeight+.4,0],1.9,'#96a9af',-Math.PI/2);
  if(kind==='server') {
    for(let i=0;i<3;i++) {
      const rack=pickables.find(p=>p.id==='r1_rack'+i)?.mesh;if(rack)rackDetails(rack,i);
      contact(details,2.5+i*1.7,-5.0,1.65,2.0);
    }
    chair(details,-1.8,-3.02,Math.PI);
    cable(details,[[-2.8,1.22,-4.65],[-2.9,.5,-4.95],[-3.5,.1,-4.9]],M.black,.017);
    contact(details,-2.2,-4.4,4.65,2.1);contact(details,-7,-3,1.6,1.8);
    label(details,'MERIDIAN',[-1.3,4.8,-D/2+.12],3.0,'#667c89',0,'DATA CENTRE / BASEMENT 03');
    const pc=pickables.find(p=>p.id==='r1_pc')?.mesh;
    if(pc)for(let i=0;i<10;i++)box(pc,[.01,.025,.7],[.256,.12+i*.044,.07],M.black);
    // 原台灯就是唯一控制开关；只给其几何添加灯泡，不给灯泡独立光源。
    const lamp=pickables.find(p=>p.id==='r1_lamp')?.mesh;
    if(lamp){const bulb=new THREE.Mesh(new THREE.SphereGeometry(.045,16,12),M.cup);bulb.position.set(.42,.91,0);lamp.add(bulb);}
  } else if(kind==='monitor') {
    chair(details,0,1.75,0);
    for(const x of [-3,-1,1,3])label(details,'VIDEO / SEC',[x,.95,-D/2+.115],1.1,'#537580',0,'MERIDIAN CCTV / ARCHIVE');
    for(const x of [-1.3,1.3])box(details,[.12,.8,.9],[x,.5,.05],trim);
    contact(details,0,.15,4.1,2.1);
    for(let i=0;i<12;i++)box(details,[.055,.018,.045],[-.48+i*.085,1.075,.35],M.black);
  } else if(office) {
    // 原书架是实心方块，书本埋在其中。将外壳改为敞口板件；原书本与碰撞盒不变。
    const shelf=group.children.find(g=>g.isGroup && g.position.x===2.5 && g.position.z===-4.3);
    if(shelf) {
      const solid=shelf.children.find(m=>m.userData.visualBoxSize?.[1]===3.2);if(solid)shelf.remove(solid);
      box(shelf,[.035,3.2,1.4],[.18,1.6,0],M.wood);
      for(const z of [-.68,.68])box(shelf,[.4,3.2,.045],[0,1.6,z],M.wood);
      for(const y of [.05,.75,1.45,2.15,3.16])box(shelf,[.4,.055,1.4],[0,y,0],M.wood);
    }
    box(details,[.045,1.65,1.43],[-W/2+.945,1,1],M.metalDark);
    for(const z of [.29,1.71])box(details,[.05,1.75,.045],[-W/2+.97,1,z],M.wood);
    for(const y of [.15,1.85])box(details,[.05,.04,1.46],[-W/2+.97,y,1],M.wood);
    for(const z of [.96,1.06])box(details,[.045,.35,.025],[-W/2+1,.95,z],M.metal);
    cityWindow(details,W,D);plant(details,-W/2+.6,D/2-.7);
    // 给现有椅子补扶手和五爪底座，保持其原位置。
    for(const x of [-1.88,-1.12]) {
      box(details,[.055,.3,.06],[x,.7,-3.45],M.metal);
      box(details,[.09,.05,.45],[x,.84,-3.5],M.leather);
    }
    for(let i=0;i<5;i++) {
      const a=i*Math.PI*2/5;
      const leg=box(details,[.06,.065,.45],[-1.5+Math.sin(a)*.2,.12,-3.5+Math.cos(a)*.2],M.metal);leg.rotation.y=a;
      const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.055,.055,.06,12),M.black);wheel.rotation.z=Math.PI/2;wheel.position.set(-1.5+Math.sin(a)*.43,.055,-3.5+Math.cos(a)*.43);details.add(wheel);
    }
    contact(details,-1.5,-2.5,3.6,2.1);contact(details,-1.5,-3.5,1.1,1.1);
    for(let x=-W/2+.5;x<W/2-.5;x+=.65)box(details,[.032,1.12,.035],[x,.65,D/2-.11],trim);
    box(details,[W-.3,.04,.045],[0,1.22,D/2-.13],trim);
    // 装饰台灯没有交互与独立光源。
    box(details,[.22,.055,.18],[-.3,1.17,-2.45],M.metal);
    cable(details,[[-.3,1.18,-2.45],[-.3,1.58,-2.45],[-.5,1.72,-2.45]],M.metal,.018);
    const shade=new THREE.Mesh(new THREE.ConeGeometry(.19,.22,24,1,true),textured(0x7c674d,'metal',{side:THREE.DoubleSide,metalness:.5}));shade.position.set(-.52,1.71,-2.45);details.add(shade);
  } else {
    // 给原来三个实心机柜补齐侧面模块，原蓝灯移到机壳表面，保持数量。
    for(let i=0;i<3;i++) {
      const cabinet=new THREE.Group();cabinet.position.set(-W/2+1.615,0,-2.5+i*1.7);cabinet.rotation.y=Math.PI/2;details.add(cabinet);
      box(cabinet,[1.25,4.2,.04],[0,2.2,0],M.metalDark);
      for(const x of [-.65,.65])box(cabinet,[.035,4.3,.06],[x,2.2,.02],trim);
      label(cabinet,`NODE / 0${i+1}`,[0,4.03,.045],1,'#698995',0,'SECURE / COMPUTE ARRAY');
      for(let row=0;row<6;row++) {
        const y=1+row*.5;box(cabinet,[1.17,.35,.04],[0,y,.04],M.rack);
        for(let k=0;k<8;k++)box(cabinet,[.018,.19,.018],[-.48+k*.105,y,.07],M.black);
      }
    }
    for(const m of group.children)if(m.geometry?.type==='CircleGeometry' && m.rotation.y===Math.PI/2)m.position.x+=.17;
    contact(details,0,0,5.5,5.5);
    for(const radius of [2.03,2.31]) {
      const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.013,8,96),emissive(0x427594));ring.rotation.x=-Math.PI/2;ring.position.y=radius<2.1?.354:.23;details.add(ring);
    }
    for(let i=0;i<20;i++) {
      const a=i*Math.PI*2/20;const slot=box(details,[.025,.11,.12],[Math.sin(a)*2.3,.16,Math.cos(a)*2.3],M.black);slot.rotation.y=a;
    }
    for(const x of [-W/2+.65,W/2-.65])for(const z of [-D/2+.7,D/2-.7]) {
      box(details,[.28,H-.45,.28],[x,(H-.45)/2,z],trim);
      box(details,[.012,H-.75,.055],[x-.15,(H-.75)/2+.14,z],emissive(0x25445b),false);
    }
    label(details,'SECURE COMPUTE',[0,2.8,-D/2+.19],3.8,'#688696',0,'OBELISK / AUTHORISED PERSONNEL ONLY');
  }
  batchStatic(details);
  group.userData.visualStyle=kind;
  if(kind==='server')group.userData.visualPowerLight=shadowLight;
}
