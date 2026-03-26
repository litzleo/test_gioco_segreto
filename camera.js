const camera = { x:velocini.x + velocini.w/2, y:velocini.y + velocini.h/2, vx: 0, vy: 0 };
let fixedCamera = undefined

function muoviCamera(deltaTime) {
    let targetCamera = fixedCamera || {x:velocini.x + velocini.w/2, y:velocini.y + velocini.h/2};
    let dist = sq(targetCamera.x - camera.x) + sq(targetCamera.y - camera.y);
    if(dist > 250){
        camera.vx = (targetCamera.x - camera.x) * min(dist, MAX_VELOCITA_CAMERA) * deltaTime / 10;
        camera.vy = (targetCamera.y - camera.y) * min(dist, MAX_VELOCITA_CAMERA) * deltaTime / 10;

        camera.x += minAbs(camera.vx * deltaTime, targetCamera.x - camera.x);
        camera.y += minAbs(camera.vy * deltaTime, targetCamera.y - camera.y);
    }
}