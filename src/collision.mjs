export function canCross(obstacles, fromX, fromZ, toX, toZ, jumpHeight) {
  const dx=toX-fromX,dz=toZ-fromZ;
  const length2=dx*dx+dz*dz;
  if (!length2) return true;
  for (const obstacle of obstacles) {
    if (jumpHeight>=obstacle.clearance) continue;
    const ox=obstacle.x-fromX,oz=obstacle.z-fromZ;
    const before=ox*ox+oz*oz;
    const radius2=obstacle.radius*obstacle.radius;
    if (before<radius2 && (ox-dx)**2+(oz-dz)**2>=before) continue;
    const along=Math.max(0,Math.min(1,(ox*dx+oz*dz)/length2));
    if ((ox-dx*along)**2+(oz-dz*along)**2<radius2) return false;
  }
  return true;
}
