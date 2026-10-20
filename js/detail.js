/* global THREE */
// 程序化建模工具。缓存几何体，静态装饰实例化，避免为细节反复提交 draw call。
const geometryCache = new Map();
export function bevelBox(w, h, d, radius = Math.min(0.035, w * .18, h * .18, d * .18)) {
  const key = [w,h,d,radius].join('/');
  if (geometryCache.has(key)) return geometryCache.get(key);
  if (radius < .002) {
    const g = new THREE.BoxGeometry(w,h,d); geometryCache.set(key,g); return g;
  }
  const half = [w/2,h/2,d/2], core = half.map(v => v-radius);
  const coordinates = half.map(v => [-v,-v+radius*.3,-v+radius,v-radius,v-radius*.3,v]);
  const positions=[], normals=[], uv=[], indices=[];
  // cross(u, v) 的方向与 outward 一致。
  for (const [axis,u,v,sign] of [[0,2,1,-1],[0,1,2,1],[1,0,2,-1],[1,2,0,1],[2,1,0,-1],[2,0,1,1]]) {
    const base=positions.length/3;
    for(let j=0;j<6;j++) for(let i=0;i<6;i++) {
      const p=[0,0,0]; p[axis]=sign*half[axis]; p[u]=coordinates[u][i]; p[v]=coordinates[v][j];
      const c=p.map((x,a)=>Math.max(-core[a],Math.min(core[a],x)));
      const n=new THREE.Vector3(p[0]-c[0],p[1]-c[1],p[2]-c[2]).normalize();
      positions.push(c[0]+n.x*radius,c[1]+n.y*radius,c[2]+n.z*radius);
      normals.push(n.x,n.y,n.z); uv.push((p[u]+half[u])/(2*half[u]),(p[v]+half[v])/(2*half[v]));
    }
    for(let j=0;j<5;j++) for(let i=0;i<5;i++) {
      const a=base+j*6+i,b=a+1,c=a+6,d=c+1; indices.push(a,b,d,a,d,c);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  geometry.setIndex(indices); geometry.computeBoundingSphere();
  geometryCache.set(key,geometry); return geometry;
}
export function box(parent, size, position, material, rounded=true) {
  const mesh=new THREE.Mesh(rounded ? bevelBox(...size) : new THREE.BoxGeometry(...size),material);
  mesh.position.set(...position); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
export function cable(parent, points, material, radius=.025) {
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,32,radius,6,false),material);
  mesh.castShadow=true; parent.add(mesh); return mesh;
}
export function label(parent, text, position, width=1.2, color='#a3d5db', rotation=0, subtitle='MERIDIAN / RESTRICTED ACCESS') {
  const canvas=document.createElement('canvas'); canvas.width=768;canvas.height=192;
  const c=canvas.getContext('2d'); c.fillStyle='#101a22';c.fillRect(0,0,768,192);
  c.fillStyle=color;c.fillRect(0,0,8,192);c.font='600 68px monospace';c.fillText(text,32,91);
  c.fillStyle='#7e929c';c.font='22px monospace';c.fillText(subtitle,32,145);
  const texture=new THREE.CanvasTexture(canvas);texture.encoding=THREE.sRGBEncoding;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshStandardMaterial({map:texture,roughness:.93,metalness:0,envMapIntensity:.03}));
  mesh.position.set(...position);mesh.rotation.y=rotation; parent.add(mesh);return mesh;
}
export function batchStatic(group) {
  group.updateMatrixWorld(true);
  const batches=new Map();
  for(const mesh of [...group.children]) {
    if(!mesh.isMesh || mesh.isInstancedMesh || mesh.userData.blinker || mesh.material.transparent || mesh.geometry.type==='PlaneGeometry') continue;
    const key=mesh.geometry.uuid+'/'+mesh.material.uuid;
    if(!batches.has(key)) batches.set(key,[]);batches.get(key).push(mesh);
  }
  for(const meshes of batches.values()) {
    if(meshes.length<3)continue;
    const batch=new THREE.InstancedMesh(meshes[0].geometry,meshes[0].material,meshes.length);
    meshes.forEach((m,i)=>{batch.setMatrixAt(i,m.matrix);group.remove(m);});
    batch.castShadow=true;batch.receiveShadow=true;group.add(batch);
  }
}
