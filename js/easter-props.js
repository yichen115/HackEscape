/* global THREE */
import { M } from './materials.js';
import { makeScreenTexture } from './tex.js';

export function addCupBottomMark(cup) {
  const map = makeScreenTexture((c, cv) => {
    c.fillStyle='#e8e8ea'; c.fillRect(0,0,cv.width,cv.height);
    c.textAlign='center'; c.fillStyle='#2c3940';
    c.font='bold 100px monospace'; c.fillText('418',256,230);
    c.font='27px monospace'; c.fillText("I'M A TEAPOT",256,288);
  },512,512);
  const mark=new THREE.Mesh(new THREE.CircleGeometry(.105,24),new THREE.MeshStandardMaterial({map,roughness:.95}));
  mark.name='cup-bottom-mark'; mark.rotation.x=Math.PI/2; mark.position.y=-.0001;
  cup.add(mark);
}

export function paperPlaque(title, lines, width=.72, height=.48) {
  const root=new THREE.Group();
  const backing=new THREE.Mesh(new THREE.BoxGeometry(width+.04,height+.04,.02),M.metalDark);
  root.add(backing);
  const map=makeScreenTexture((c,cv) => {
    c.fillStyle='#e4ddc3'; c.fillRect(0,0,cv.width,cv.height);
    c.fillStyle='#344047'; c.fillRect(0,0,cv.width,10);
    c.font='bold 38px monospace'; c.fillText(title,28,68);
    c.font='28px monospace'; lines.forEach((line,i)=>c.fillText(line,28,124+i*46));
  },768,Math.round(768*height/width));
  const face=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshStandardMaterial({map,roughness:.97,metalness:0}));
  face.position.z=.011; face.userData.surfaceKind='paper'; root.add(face);
  return root;
}

export function rubberDuck() {
  const root=new THREE.Group(); root.name='rubber-debug-duck';
  const yellow=new THREE.MeshStandardMaterial({color:0xf1c447,roughness:.68});
  const orange=new THREE.MeshStandardMaterial({color:0xd98132,roughness:.72});
  function sphere(name,scale,position,material=yellow) {
    const mesh=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),material);
    mesh.name=name; mesh.scale.set(...scale); mesh.position.set(...position); root.add(mesh);
  }
  const foot=new THREE.Mesh(new THREE.CylinderGeometry(.08,.08,.03,20),yellow);
  foot.name='duck-foot'; foot.position.y=.015; root.add(foot);
  sphere('duck-body',[.115,.10,.14],[0,.12,0]);
  sphere('duck-head',[.075,.075,.075],[0,.235,.09]);
  for (const side of [-1,1]) {
    sphere('duck-wing',[.025,.045,.09],[side*.10,.13,-.015]);
    sphere('duck-eye',[.008,.008,.008],[side*.055,.25,.135],M.black);
  }
  const beak=new THREE.Mesh(new THREE.ConeGeometry(.035,.09,12),orange);
  beak.scale.x=1.35; beak.rotation.x=Math.PI/2; beak.position.set(0,.226,.19); root.add(beak);
  return root;
}
