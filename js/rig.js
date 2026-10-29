// The camera: sits at the chair, follows the mouse a little, and leans in to whatever you pick up.
import * as THREE from "three";

export function createRig(camera, room) {
  const pos = room.seat.clone(), tgt = room.look.clone();
  const goalPos = new THREE.Vector3(), goalTgt = new THREE.Vector3();
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  const up = new THREE.Vector3(0, 1, 0), fwd = new THREE.Vector3(), right = new THREE.Vector3(), aim = new THREE.Vector3();
  let focus = null;

  // Work out a good place to stand for each object, from its size and position.
  function focusFor(item) {
    if (item.view === "projects" && room.screen) return screenFocus(room.screen);
    const box = new THREE.Box3().setFromObject(item.object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    if (item.view === "city") {
      const out = center.clone().sub(room.seat).normalize();
      return { pos: room.seat.clone().lerp(center, 0.55), tgt: center.clone().addScaledVector(out, 2.5) };
    }
    const flat = size.y < 0.15 * Math.max(size.x, size.z);
    const dir = room.seat.clone().sub(center).normalize();
    dir.y += flat ? 0.9 : 0.15;
    dir.normalize();
    const dist = THREE.MathUtils.clamp(size.length() * 1.3, 0.35, 0.9);
    return { pos: center.clone().addScaledVector(dir, dist), tgt: center };
  }

  // Square up to the monitor so the HTML screen can sit exactly on it.
  function screenFocus(screen) {
    screen.geometry.computeBoundingBox();
    const s = screen.geometry.boundingBox.getSize(new THREE.Vector3());
    const scale = screen.getWorldScale(new THREE.Vector3());
    const w = s.x * scale.x, h = s.y * scale.y;
    const center = screen.getWorldPosition(new THREE.Vector3());
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(screen.getWorldQuaternion(new THREE.Quaternion()));
    const vfov = THREE.MathUtils.degToRad(camera.fov);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
    const dist = Math.max((h / 0.72) / (2 * Math.tan(vfov / 2)), (w / 0.94) / (2 * Math.tan(hfov / 2)));
    return { pos: center.clone().addScaledVector(normal, dist), tgt: center };
  }

  return {
    setPointer(nx, ny) { look.tx = nx; look.ty = ny; },
    focus(item) { focus = item ? focusFor(item) : null; },
    get focused() { return !!focus; },
    update(t, dt, still, reduceMotion) {
      if (focus) { goalPos.copy(focus.pos); goalTgt.copy(focus.tgt); }
      else { goalPos.copy(room.seat); goalTgt.copy(room.look); }
      const k = 1 - Math.exp(-dt * 3.2);
      pos.lerp(goalPos, k); tgt.lerp(goalTgt, k);

      const lk = 1 - Math.exp(-dt * 4);
      look.x += ((still ? 0 : look.tx) - look.x) * lk;
      look.y += ((still ? 0 : look.ty) - look.y) * lk;
      fwd.subVectors(tgt, pos).normalize();
      right.crossVectors(fwd, up).normalize();
      const amount = focus ? 0.07 : 0.5;
      aim.copy(tgt).addScaledVector(right, look.x * amount).addScaledVector(up, look.y * amount * 0.55);

      camera.position.copy(pos);
      if (!reduceMotion && !focus) camera.position.y += Math.sin(t * 0.9) * 0.004; // breathing
      camera.lookAt(aim);
    }
  };
}
