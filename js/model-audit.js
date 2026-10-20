/* global THREE */
// 对原物体进行几何/材质修正，保留同一个交互根节点和动态屏幕对象。
import { drawerDetails, hangingCoat, staticDisplay, keypadDisplay } from './fixture-details.js';
import { M } from './materials.js';
import { box, bevelBox, cable } from './detail.js';
import { textured, surface } from './surfaces.js';

const paperGrain=surface('paper');
const matteFrame=textured(0x384249,'metal',{roughness:.68,metalness:.45,envMapIntensity:.12});
function printSurface(root,kind) {
  const face=root.children.find(m=>m.isMesh && m.geometry.type==='PlaneGeometry' && m.material.map);
  if(!face)return;
  const {width:w,height:h}=face.geometry.parameters;
  face.name='printed-surface';face.userData.surfaceKind=kind;
  face.material=new THREE.MeshStandardMaterial({map:face.material.map,color:kind==='painting'?0xf2efdf:0xffffff,
    roughness:kind==='board'?.8:.97,metalness:0,envMapIntensity:.025,bumpMap:paperGrain,bumpScale:kind==='board'?.00012:.00065});
  face.receiveShadow=true;face.castShadow=false;
  const backing=root.children.find(m=>m.userData.visualBoxSize);
  if(kind==='paper' && backing) {
    const dimensions=backing.userData.visualBoxSize;
    backing.geometry=bevelBox(dimensions[0],dimensions[1],.007,0);
    backing.position.z=face.position.z-.005;
    backing.material=textured(0x6b6659,'paper',{roughness:1,envMapIntensity:0});
    const geometry=new THREE.PlaneGeometry(w,h,16,20),position=geometry.getAttribute('position');
    for(let i=0;i<position.count;i++) {
      const x=position.getX(i)/(w/2),y=position.getY(i)/(h/2);
      const corner=Math.pow(Math.max(0,x-.72)/.28,2)*Math.pow(Math.max(0,-y-.6)/.4,2)*.009;
      position.setZ(i,.0008*Math.sin(x*5+y*3)+corner);
    }
    geometry.computeVertexNormals();face.geometry=geometry;
    for(const x of [-w*.34,w*.34]) {
      box(root,[.095,.012,.012],[x,h/2+.004,face.position.z+.003],matteFrame);
      // 固定夹后面的支点与墙面相连。
      box(root,[.035,.024,.056],[x,h/2+.004,.004],matteFrame,false);
    }
  } else if(backing) {
    const [bw,bh]=backing.userData.visualBoxSize;
    const frameMaterial=kind==='board'?matteFrame:M.photoFrame;
    backing.material=kind==='board'?M.metalDark:M.wood;
    const depth=.027,rail=Math.min(.032,(bw-w)/2,(bh-h)/2);
    for(const x of [-bw/2+rail/2,bw/2-rail/2])box(root,[rail,bh,depth],[x,0,face.position.z+.002],frameMaterial);
    for(const y of [-bh/2+rail/2,bh/2-rail/2])box(root,[bw-rail*2,rail,depth],[0,y,face.position.z+.002],frameMaterial);
  }
}
function alignFace(face,housing,thickness) {
  const normal=new THREE.Vector3(0,0,1).applyEuler(housing.rotation);
  face.position.copy(housing.position).addScaledVector(normal,thickness/2+.0015);
  face.rotation.copy(housing.rotation);
  face.userData.housing=housing;face.name='display-face';
}
function rearDetails(parent,w,h,d) {
  for(let i=0;i<8;i++)box(parent,[w*.35,.009,.004],[0,-h*.17+i*.027,-d/2-.001],M.black,false);
  for(const x of [-w*.4,w*.4])for(const y of [-h*.37,h*.37]) {
    const screw=new THREE.Mesh(new THREE.CircleGeometry(.007,8),M.metal);
    screw.rotation.y=Math.PI;screw.position.set(x,y,-d/2-.003);parent.add(screw);
  }
}
function secureWorkstation(ws) {
  const housing=ws.children.find(m=>m.userData.visualBoxSize?.[0]===1.8);
  const face=ws.children.find(m=>m.isMesh && m.geometry.type==='PlaneGeometry');
  const usb=ws.children.find(m=>m.userData.visualBoxSize?.[0]===.04);
  if(!housing || !face)return;
  // 将 70 cm 厚的实心方块改为 10 cm 屏壳。屏幕随同一铰接组件后仰。
  ws.remove(housing);ws.remove(face);
  const display=new THREE.Group();display.name='workstation-display';display.position.set(0,.95,.45);display.rotation.x=-.15;ws.add(display);
  housing.geometry=bevelBox(1.76,.9,.1,.018);housing.position.set(0,0,-.0515);housing.rotation.set(0,0,0);
  housing.material=textured(0x26313a,'metal',{roughness:.63,metalness:.45,envMapIntensity:.12});housing.name='display-housing';display.add(housing);
  face.position.set(0,0,0);face.rotation.set(0,0,0);face.name='display-face';face.userData.housing=housing;display.add(face);
  // 屏框、下沿、后盖、支架都跟随真实屏幕节点，侧面没有悬空贴片。
  for(const x of [-.854,.854])box(display,[.028,.864,.023],[x,0,.001],M.black);
  for(const y of [-.432,.432])box(display,[1.68,.028,.023],[0,y,.001],M.black);
  const rear=new THREE.Group();rear.position.z=-.0515;display.add(rear);rearDetails(rear,1.76,.9,.1);
  const base=box(ws,[.72,.065,.46],[0,.0325,.03],M.metalDark);
  base.name='workstation-base';
  cable(ws,[[0,.065,.03],[0,.34,.08],[0,.51,.31]],M.metal,.045);
  box(display,[.21,.14,.08],[0,-.34,-.12],M.metalDark);
  cable(ws,[[.23,.75,.36],[.28,.38,.2],[.23,.075,.13]],M.black,.011);
  if(usb){usb.geometry=bevelBox(.14,.026,.008,0);ws.remove(usb);usb.position.set(.58,-.431,.012);display.add(usb);}
  ws.userData.modelRepaired=true;ws.userData.displayFace=face;ws.userData.displayHousing=housing;
}
function laptopModel(laptop) {
  const base=laptop.children.find(m=>m.userData.visualBoxSize?.[0]===.8);
  const housing=laptop.children.find(m=>m.userData.visualBoxSize?.[0]===.78);
  const face=laptop.userData.scrFace;
  if(!base || !housing || !face)return;
  base.position.y=1.135;housing.position.y=1.405;alignFace(face,housing,.03);
  const sensor=laptop.children.find(m=>m.geometry?.type==='CircleGeometry');if(sensor)sensor.position.y=1.158;
  const keyboard=new THREE.Mesh(new THREE.PlaneGeometry(.53,.23),M.black);keyboard.rotation.x=-Math.PI/2;keyboard.position.set(-.035,1.157,-.025);laptop.add(keyboard);
  for(let row=0;row<4;row++)for(let i=0;i<9;i++)box(laptop,[.044,.002,.036],[-.268+i*.058,1.159,-.112+row*.048],M.metalDark,false);
  box(laptop,[.22,.002,.115],[0,1.158,.18],M.metalDark,false);
  const hinge=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.66,12),M.metalDark);
  hinge.rotation.z=Math.PI/2;hinge.position.set(0,1.154,-.255);laptop.add(hinge);
  laptop.userData.displayFace=face;laptop.userData.displayHousing=housing;laptop.userData.modelRepaired=true;
}
export function repairModels(group,{kind,pickables,W,D}) {
  const find=id=>pickables.find(p=>p.id===id)?.mesh;
  for(const [id,type] of [
    ['r1_photo','photo'],['r1_cal','paper'],['r1_wb','board'],
    ['r2_wb','board'],['r3_photo','photo'],['r3_painting','painting'],['r4_poster','paper'],
  ]) {const root=find(id);if(root)printSurface(root,type);}
  if(kind==='server') {
    const monitor=find('r1_monitor');const housing=monitor.children.find(m=>m.userData.visualBoxSize?.[0]===1.8);
    const face=monitor.children.find(m=>m.geometry?.type==='PlaneGeometry');
    if(face && housing){alignFace(face,housing,.08);monitor.userData.displayFace=face;monitor.userData.displayHousing=housing;}
    const keypad=find('r1_doorpad');if(keypad){keypad.position.x=W/2-.148;keypadDisplay(keypad,3);}

    const photo=find('r1_photo');if(photo)photo.position.x=-W/2+.132;
  }
  if(kind==='monitor') {
    hangingCoat(find('r2_coat'));drawerDetails(group,kind,pickables);
    for(const face of group.children) {
      if(face.geometry?.type!=='PlaneGeometry' || face.geometry.parameters.width!==1.55)continue;
      const housing=group.children.find(m=>m.userData.visualBoxSize?.[0]===1.7 && m.position.x===face.position.x && m.position.y===face.position.y);
      if(housing)alignFace(face,housing,.06);
    }

    const console=find('r2_console');
    const face=console.children.find(m=>m.isMesh && m.geometry.type==='PlaneGeometry' && m.material.map);
    const housing=console.children.find(m=>m.userData.visualBoxSize?.[0]===2.5);
    if(face && housing){alignFace(face,housing,.08);console.userData.displayFace=face;console.userData.displayHousing=housing;}
    // 支架连到控制台桌面；背面加入通风孔，而非空白黑平面。
    for(const x of [-.78,.78])box(console,[.09,.3,.12],[x,1.18,-.4],M.metal);
    const back=new THREE.Group();back.position.copy(housing.position);back.rotation.copy(housing.rotation);console.add(back);rearDetails(back,2.5,1.3,.08);
    cable(console,[[.12,1.34,-.39],[.12,1.16,-.55],[.3,1.06,-.5]],M.black,.012);
  }
  if(kind==='office') {
    drawerDetails(group,kind,pickables);
    const keypad=find('r3_doorpad');if(keypad){keypad.position.x=-.094;keypadDisplay(keypad,4);}

    const glass=find('r3_glass');
    const bowl=glass?.children.find(m=>m.geometry?.type==='CylinderGeometry' && m.geometry.parameters.radiusTop===.06);
    const stem=glass?.children.find(m=>m.geometry?.type==='CylinderGeometry' && m.geometry.parameters.radiusTop===.01);
    if(stem){stem.geometry=new THREE.CylinderGeometry(.01,.01,.06,16);stem.position.y=.035;}
    const foot=glass?.children.find(m=>m.geometry?.type==='CylinderGeometry' && m.geometry.parameters.radiusTop===.05);if(foot)foot.position.y=.0025;
    if(bowl){bowl.geometry=new THREE.LatheGeometry([[.04,-.07],[.048,-.046],[.059,.012],[.061,.065],[.058,.069],[.055,.06],[.052,.012],[.043,-.045],[.037,-.061]].map(p=>new THREE.Vector2(...p)),32);bowl.name='open-glass-bowl';}

    const laptop=find('r3_laptop');if(laptop){laptopModel(laptop);staticDisplay(laptop.userData.scrFace,'FINGERPRINT REQUIRED','TOUCH SENSOR TO UNLOCK');}
    const photo=find('r3_photo');
    if(photo){photo.position.y=1.31;const leg=box(photo,[.035,.21,.018],[0,-.1035,-.063],M.wood);leg.rotation.x=.5;leg.name='photo-easel';}
    const shelf=group.children.find(g=>g.isGroup && g.position.x===2.5 && g.position.z===-4.3);
    if(shelf) {
      const colors=[0x33454e,0x625544,0x49534b,0x304653,0x67594d,0x454f54,0x61665b];
      for(const book of [...shelf.children]) {
        if(book.userData.visualBoxSize?.[0]!==.2 || book.userData.visualBoxSize?.[1]!==.4)continue;
        const color=colors[Math.round((book.position.z+.5)/.18)%colors.length];
        book.position.y-=.018;
        book.geometry=bevelBox(.198,.398,.154,.003);
        book.material=textured(0xc6c1aa,'paper',{roughness:.98,envMapIntensity:.025});
        const cover=textured(color,'carpet',{roughness:.95,envMapIntensity:.025});
        box(book,[.205,.409,.006],[0,0,-.079],cover);box(book,[.205,.409,.006],[0,0,.079],cover);
        box(book,[.008,.409,.16],[-.102,0,0],cover);
        for(const y of [-.11,.08,.10])box(book,[.001,.004,.105],[-.107,y,0],M.paper,false);
        book.name='bound-book';
      }
    }
    const wineCab=find('r3_glass')?.parent;
    const bottle=wineCab?.children.find(m=>m.geometry?.type==='CylinderGeometry' && m.geometry.parameters.height===.32);
    if(bottle) {
      bottle.geometry=new THREE.LatheGeometry([[.068,-.16],[.08,-.145],[.08,.026],[.065,.069],[.026,.103],[.026,.151]].map(p=>new THREE.Vector2(...p)),32);
      bottle.material=new THREE.MeshStandardMaterial({color:0x594b2b,transparent:true,opacity:.87,roughness:.35,envMapIntensity:.1});
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(.028,.028,.032,20),M.black);cap.position.copy(bottle.position);cap.position.y+=.166;wineCab.add(cap);
    }
    const painting=find('r3_painting');if(painting)painting.position.x=W/2-.127;
  }
  if(kind==='secure') {
    const workstation=find('r4_ws');
    secureWorkstation(workstation);
    for(const mesh of workstation.parent.children) {
      const p=mesh.geometry?.parameters;
      if(mesh.geometry?.type==='CylinderGeometry' && p.radialSegments===24)mesh.geometry=new THREE.CylinderGeometry(p.radiusTop,p.radiusBottom,p.height,96,p.heightSegments,p.openEnded);
    }
    const screen=group.children.find(g=>g.isGroup && g.position.y===4.2 && g.position.z===-D/2+.2);
    if(screen) {
      const face=screen.children.find(m=>m.geometry?.type==='PlaneGeometry');
      const housing=screen.children.find(m=>m.userData.visualBoxSize?.[0]===5);
      if(housing)housing.material=matteFrame;
      if(face){face.name='countdown-display';face.userData.housing=housing;}
      for(const x of [-2.465,2.465])box(screen,[.065,1.5,.04],[x,0,.06],M.black);
      for(const y of [-.765,.765])box(screen,[5,.065,.04],[0,y,.06],M.black);
      for(const x of [-1.9,1.9])for(const y of [-.55,.55])box(screen,[.11,.11,.05],[x,y,-.075],matteFrame);
      screen.userData.modelRepaired=true;
    }
  }
}
