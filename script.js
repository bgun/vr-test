'use strict';

// Paul Irish's requestAnimationFrame shim
// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
window.requestAnimFrame = (function() {
  return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame    ||
    window.oRequestAnimationFrame      ||
    window.msRequestAnimationFrame     ||
    function( callback ){
      window.setTimeout(callback, 1000 / 60);
    };
})();

var game = {
  entities: {
    badguys: [],
    camera:  {},
    scene:   {},
    turret:  {}
  },
  materials: {
    metalMaterial: new THREE.MeshPhongMaterial({
      color: 0xDDDDDD,
      metal: true,
      reflectivity: 0.25
    }),
    metalWireMaterial: new THREE.MeshPhongMaterial({
      color: 0x666666,
      wireframe: true,
      wireframeLinewidth: 4
    }),
    metalFlatMaterial: new THREE.MeshLambertMaterial({
      color: 0xDDDDDD,
      shading: THREE.FlatShading
    }),
    groundMaterial: new THREE.MeshLambertMaterial({
      color: 0xFFFFFF,
    }),
    badguyMaterial: new THREE.MeshPhongMaterial({
      color: 0x555555,
      metal: true,
      shininess: 90
    }),
    badguyHurtMaterial: new THREE.MeshPhongMaterial({
      color: 0x994444,
      metal: true,
    }),
   spotMaterial: new THREE.MeshBasicMaterial({
      color: 0xFFFFFF
    })
  },
  // settings
  BULLET_SPEED: 15,
  ENEMY_MAX_LIFE: 3,
  ENEMY_MIN_DELAY: 20, // minimum delay between creating new enemies
  ENEMY_START_DISTANCE: 1000,
  ENEMY_SPEED: 1.2,
  RELOAD_DELAY: 200,
  TURRET_ACCEL: 0.002,
  TURRET_FRICTION: 0.001,
  TURRET_MAX_LIFE: 5,
  TURRET_MAX_SPEED: 0.05,
  // state
  enemyDelay: 0,
  reloading: false,
  turretRotationSpeed: 0
};

var camera, scene, renderer;
var effect, controls;
var element, container;

var clock = new THREE.Clock();

function update(dt) {
  resize();
  game.moveAll();
  camera.updateProjectionMatrix();
  controls.update(dt);
}

function render(dt) {
  effect.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  update(clock.getDelta());
  render(clock.getDelta());
}

function fullscreen() {
  if (container.requestFullscreen) {
    container.requestFullscreen();
  } else if (container.msRequestFullscreen) {
    container.msRequestFullscreen();
  } else if (container.mozRequestFullScreen) {
    container.mozRequestFullScreen();
  } else if (container.webkitRequestFullscreen) {
    container.webkitRequestFullscreen();
  }
}

function resize() {
  var width = container.offsetWidth;
  var height = container.offsetHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
  effect.setSize(width, height);
}

var init = function() {

  renderer = new THREE.WebGLRenderer();
  element = renderer.domElement;
  container = document.getElementById('container');
  container.appendChild(element);

  effect = new THREE.StereoEffect(renderer);

  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(90, 1, 0.001, 700);
  camera.position.set(0, 10, 0);
  camera.lookAt(new THREE.Vector3(0,0,0));
  scene.add(camera);

  controls = new THREE.OrbitControls(camera, element);
  controls.rotateUp(Math.PI / 4);
  controls.target.set(
    camera.position.x + 0.1,
    camera.position.y,
    camera.position.z
  );
  controls.noZoom = true;
  controls.noPan = true;

  function setOrientationControls(e) {
    if (!e.alpha) {
      return;
    }

    controls = new THREE.DeviceOrientationControls(camera, true);
    controls.connect();
    controls.update();

    element.addEventListener('click', fullscreen, false);

    window.removeEventListener('deviceorientation', setOrientationControls, true);
  }

  window.addEventListener('deviceorientation', setOrientationControls, true);
  window.addEventListener('resize', resize, false);

  setTimeout(resize, 1);

  var ground = new THREE.Mesh(
    new THREE.PlaneGeometry(4000,4000,100,100),
    game.materials.groundMaterial
  );
  ground.rotation.x = -(90*(Math.PI/180));
  ground.position.setY(0);
  ground.receiveShadow = true;

  // light the scene
  var keyLight = new THREE.SpotLight(0xffffff, 0.8);
  keyLight.position.set(500,500,500);
  var fillLight1 = new THREE.PointLight(0xff6666, 0.5);
  fillLight1.position.set(-1000,300,0);
  var fillLight2 = new THREE.PointLight(0xDDAA55, 0.3);
  fillLight2.position.set(1000,300,-300);

  // populate the scene
  scene.add(game.makeTurret());
  scene.add(ground);
  scene.add(keyLight);
  scene.add(fillLight1);
  scene.add(fillLight2);

  // start animation
  console.log("Initialized", game);
};

game.getRandomPointInRing = function(ringInner, ringWidth) {
  // Generate a random point within a ring with inner radius (ringInner) and outer radius (ringInner+ringWidth)
  var randAngle = Math.floor(Math.random()*360) * Math.PI/180;
  var x = Math.sin(randAngle) * (ringInner+Math.floor(Math.random()*ringWidth));
  var z = Math.cos(randAngle) * (ringInner+Math.floor(Math.random()*ringWidth));
  var y = 0;

  var pos = new THREE.Vector3(x,y,z);
  console.log("random point", pos);
  return pos;
};

game.getAngleTowardPoint = function(pos1, pos2) {
  // Get the angle to orient pos1 toward pos2. If pos2 is not provided assume center.
  if(!pos2) {
    pos2 = new THREE.Vector3(0,0,0);
  }
  var theta = Math.atan((pos1.x-pos2.x) / (pos1.z-pos2.z));
  console.log("THETA",theta);
  return theta;
}

game.makeTurret = function(x,y,z) {
  console.log("make turret");

  var t = new THREE.Object3D();
  t.position.set(x, y, z);

  var base = new THREE.Mesh(
    new THREE.CylinderGeometry(65,65,6,32,1,false),
    game.materials.metalMaterial);
  base.castShadow = true;
  base.receiveShadow = true;
  base.position.setY(3);

  var base2 = new THREE.Mesh(
    new THREE.CylinderGeometry(64,70,16,8,1,false),
    game.materials.metalWireMaterial);
  base2.castShadow = true;
  base2.receiveShadow = true;
  base2.position.setY(8);
  base2.rotation.set(22.5);

  var dome = new THREE.Mesh(
    new THREE.SphereGeometry(50,32,32,0,Math.PI*2,0,Math.PI/2),
    game.materials.metalMaterial);
  dome.castShadow = true;
  dome.receiveShadow = true;
  dome.position.setY(15);

  var lathePts = [];
  lathePts.push(new THREE.Vector3(12, 0, 0));
  lathePts.push(new THREE.Vector3(11, 0, 50));
  lathePts.push(new THREE.Vector3(13, 0, 51));
  lathePts.push(new THREE.Vector3(12, 0, 70));
  lathePts.push(new THREE.Vector3(10, 0, 71));
  lathePts.push(new THREE.Vector3(9,  0, 90));
  lathePts.push(new THREE.Vector3(6,  0, 90));
  lathePts.push(new THREE.Vector3(6,  0,  0));
  var gun  = new THREE.Mesh(
    new THREE.LatheGeometry(lathePts,4),
    game.materials.metalFlatMaterial);
  gun.position.set(0,38,(-90*Math.PI/180));
  gun.castShadow = true;
  gun.receiveShadow = true;
  gun.scale.set(1.2,1.2,1.2);

  t.add(base);
  t.add(base2);
  t.add(dome);
  t.add(gun);

  console.log("turret made");
  return t;
};

game.makeBadGuy = function() {
  console.log("make bad guy");
  var badguy = new THREE.Object3D();
  badguy.properties = {};
  var shell = new THREE.Mesh(
    new THREE.SphereGeometry(40,16,4,0,Math.PI*2,0,Math.PI/2),
    game.materials.badguyMaterial);
  shell.position.y = 0;
  shell.castShadow = true;
  shell.receiveShadow = true;

  badguy.add(shell);
  var pos = game.getRandomPointInRing(game.ENEMY_START_DISTANCE, 100);
  badguy.position.set(pos.x, pos.y, pos.z);
  console.log("badguy",badguy.position);
  badguy.rotation.y = game.getAngleTowardPoint(badguy.position, game.entities.turret.position);

  var hyp = Math.sqrt(Math.pow(badguy.position.x,2) + Math.pow(badguy.position.z,2));
  badguy.properties.speedX = -badguy.position.x * (game.ENEMY_SPEED / hyp);
  badguy.properties.speedZ = -badguy.position.z * (game.ENEMY_SPEED / hyp);
  badguy.properties.life = game.ENEMY_MAX_LIFE;

  scene.add(badguy);
  game.entities.badguys.push(badguy);
};

game.moveAll = function() {
  if (Math.floor(Math.random() * 200) === 1) {
    game.makeBadGuy();
  }
  // move bad guys and do hit tests
  for(var i in game.entities.badguys) {
    var b = game.entities.badguys[i];
    b.position.x += b.properties.speedX;
    b.position.z += b.properties.speedZ;
  }
};

init();
animate();