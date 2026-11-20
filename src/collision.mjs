function blocker(obstacles, fromX, fromZ, toX, toZ, jumpHeight) {
  const dx=toX-fromX,dz=toZ-fromZ;
  const length2=dx*dx+dz*dz;
  if (!length2) return null;
  for (const obstacle of obstacles) {
    if (jumpHeight>=obstacle.clearance) continue;
    const ox=obstacle.x-fromX,oz=obstacle.z-fromZ;
    const before=ox*ox+oz*oz;
    const radius2=obstacle.radius*obstacle.radius;
    if (before<radius2 && (ox-dx)**2+(oz-dz)**2>=before) continue;
    const along=Math.max(0,Math.min(1,(ox*dx+oz*dz)/length2));
    if ((ox-dx*along)**2+(oz-dz*along)**2<radius2) return obstacle;
  }
  return null;
}

export function slideMovement(obstacles, x, z, toX, toZ, height) {
  const hit = blocker(obstacles, x, z, toX, toZ, height);
  if (!hit) return [toX, toZ];

  const dx = toX - x, dz = toZ - z;
  const distance = Math.hypot(dx, dz);
  const normalLength = Math.hypot(x - hit.x, z - hit.z);
  const nx = normalLength ? (x - hit.x) / normalLength : -dx / distance;
  const nz = normalLength ? (z - hit.z) / normalLength : -dz / distance;
  const projected = -nz * dx + nx * dz;
  const side = projected < -1e-7 ? -1 : 1;
  const stride = Math.max(Math.abs(projected), distance * .58);
  for (const direction of [side, -side]) {
    // A small outward component leaves room to turn around the obstacle.
    for (const fraction of [1, .62, .34]) {
      const tx = x - nz * stride * direction * fraction + nx * distance * .12;
      const tz = z + nx * stride * direction * fraction + nz * distance * .12;
      if (!blocker(obstacles, x, z, tx, tz, height)) return [tx, tz];
    }
  }
  return [x, z];
}
