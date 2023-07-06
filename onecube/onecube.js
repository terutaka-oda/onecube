"use strict";

let scene = new THREE.Scene();
//let light = new THREE.AmbientLight( 0xffffff );
//scene.add(light);

let lights = [];
lights[ 0 ] = new THREE.PointLight( 0xffffff, 1, 0 );
lights[ 1 ] = new THREE.PointLight( 0xffffff, 2, 0 );
lights[ 2 ] = new THREE.PointLight( 0xffffff, 2, 0 );

lights[ 0 ].position.set( 0, 500, 0 );
lights[ 1 ].position.set( 200, 200, 200 );
lights[ 2 ].position.set( -200, -200, -200 );

scene.add( lights[ 0 ] );
scene.add( lights[ 1 ] );
scene.add( lights[ 2 ] );
let area = document.getElementById("cube");
let area_offset = area.getBoundingClientRect();
let text_area = document.getElementById("text");
if (text_area == null) {
    alert("not found text");
}
let width = area.getAttribute("width");
let height = area.getAttribute("height");
let camera = new THREE.PerspectiveCamera(75,
                                         width / height,
                                         1, 1000);

let renderer = new THREE.WebGLRenderer( { antialias: true } );
renderer.setSize(width, height);
area.appendChild(renderer.domElement);

let g = plane_init();

scene.add(g);
let cq =  new THREE.Quaternion();
const cmask = 0x707070;
camera.position.z = 10; 
camera.position.x = 10; 
camera.position.y = 10; 
camera.lookAt(new THREE.Vector3(0,0,0));
let controls = new THREE.TrackballControls(camera, renderer.domElement);
//g.rotation.y += Math.PI/4;

let step = 20;
let delta = Math.PI/step;
let renderarray = null;
let renderend = null;
let op_queue = [];
let render_index = 0;

let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2();
let offset = new THREE.Vector2();
let intersection = new THREE.Vector3();
let mouseoverObj;
let draggedObj;
let draggedPlaneObj;
let support_touch = 'ontouchstart' in document;
let MD = support_touch ? 'touchstart' : 'mousedown';
let MM = support_touch ? 'touchmove' : 'mousemove';
let MU = support_touch ? 'touchend' : 'mouseup';

renderer.domElement.addEventListener(MD, onDocumentMouseDown, false);
renderer.domElement.addEventListener(MM, onDocumentMouseMove, false);
renderer.domElement.addEventListener(MU, onDocumentMouseUp, false);

function plane_init() {
    let c;
    let i;
    let g = new THREE.Group();
    for (i = 0; i < 9; i++) {
        var x = (parseInt(i / 3))-1;
        var z = (i % 3) - 1;
        c = cube_init();
        c.position.x = x;
        c.position.y = 0;
        c.position.z = z;
        c.name = ""+x+","+z
        g.add(c);
    }
    return g;
}
function cube_init() {
    let p = [ {color: 0x0000ff, position: {x: 0, y: 0, z: -0.5},
               rotate: {x: -Math.PI, y: 0, z: 0}},
              {color: 0x00ff00, position: {x: -0.5, y: 0, z: 0},
               rotate: {x: 0, y: -Math.PI/2, z: 0}},
              {color: 0xff0000, position: {x: 0, y: -0.5, z: 0},
               rotate: {x: Math.PI/2, y: 0, z: 0}},
              {color: 0x00ffff, position: {x: 0.5, y: 0, z: 0},
               rotate: {x: 0, y: Math.PI/2, z: 0}},
              {color: 0xffff00, position: {x: 0, y: 0.5, z: 0},
               rotate: {x: -Math.PI/2, y: 0, z: 0}},
              {color: 0xff00ff, position: {x: 0, y: 0, z: 0.5},
               rotate: {x: 0, y: 0, z: 0}}
            ];
    let i;
    let group = new THREE.Group();
    let SIZE = 1;
    for (i = 0; i < p.length; i++) {
        let geometry = new THREE.PlaneGeometry( SIZE, SIZE );
        let material = new THREE.MeshStandardMaterial( {color: p[i].color});
        let plane = new THREE.Mesh( geometry, material );
        let edge_geometry = new THREE.EdgesGeometry(plane.geometry);
        let edge_material = new THREE.LineBasicMaterial({color: 0x000000, linewidth: 1} );
        let edges = new THREE.LineSegments( edge_geometry, edge_material);
        plane.add(edges);
        let pos = p[i].position;
        plane.position.set(pos.x, pos.y, pos.z);
        plane.rotation.x=p[i].rotate.x;
        plane.rotation.y=p[i].rotate.y;
        plane.rotation.z=p[i].rotate.z;
        group.add(plane);
    }
    return group;
}
//var geometry = new THREE.BoxGeometry(1, 1, 1);
//var g = cube_init();
function render() {
    requestAnimationFrame(render);
//    g.rotation.y += 0.01;
//    g.rotation.x += 0.01;
    if (renderarray) {
        render_index = renderarray(render_index);
    }
    if (render_index == step) {
        render_index = 0;
        renderarray = null;
        renderend();
        if (isok().length == 9) {
            alert("congraturatoin!!");
        }
        if (op_queue.length > 0) {
            (op_queue.shift())();
        }
    }
    controls.update();
    renderer.render(scene, camera);
};
function getcubes(g, a, v) {
    let reg;
    let r;
    if (a == "x") {
        reg = new RegExp("^" + v + ",");
    } else if (a == "z") {
        reg = new RegExp("," + v + "$");
    }
    r = g.children.filter(function (e, i, o) {
        return e.name.match(reg) ? true : false;
    });
    return r;
}
function op(x, a, direct, nolog) {
    let cubes;
    let mstep;
    let br = document.createElement("br");
    let t = document.createTextNode("op(" + x + ", " + a + ")");
    let cvec = camera.position.y < 0 ? -1 : 1;
    if (nolog == undefined) {
        text_area.appendChild(br);
        text_area.appendChild(t);
    }
    mstep = Math.PI/step * direct * cvec;
    cubes = getcubes(g, a, x);
    //    alert(x);
    let q = new THREE.Quaternion();
    let m = cubes.map(function(e, i, o) {
        if (a == "x") {
            return function (v) {
                q.setFromAxisAngle(new THREE.Vector3(1,0,0), mstep);
                e.position.applyQuaternion(q);
//                e.rotation.applyQuaternion(q);
                e.rotation.x += mstep;
                e.rotation.x -= (e.rotation.x >= Math.PI*2 ? Math.PI*2 : 0)
            };
        } else if (a == "z") {
            return function (v) {
                q.setFromAxisAngle(new THREE.Vector3(0,0,1), mstep);
                e.position.applyQuaternion(q);
                //                e.rotation.applyQuaternion(q);
                if (Math.abs(e.rotation.x - Math.PI) < delta) {
                    e.rotation.z -= mstep;
                } else {
                    e.rotation.z += mstep;
                }
                e.rotation.z -= (e.rotation.z >= Math.PI*2 ? Math.PI*2 : 0)
            };
        }});
    renderarray = function (i) {
        m.forEach(function(e, idx, o) {
            e(i, a);
        });
        i += 1;
        return i;
    };
    renderend = function () {
        g.children.map(function (e, idx, o) {
            let nx = Math.round(e.position.x);
            let nz = Math.round(e.position.z);
            let v;
            e.position.x = nx;
            e.position.y = 0;
            e.position.z = nz;
            e.name = "" + nx + "," + nz;
            v = angle_normalize(e.rotation.x);
            e.rotation.x = v;
            v = angle_normalize(e.rotation.y);
            e.rotation.y = v;
            v = angle_normalize(e.rotation.z);
            e.rotation.z = v;
        });
    };
    
}
function angle_normalize(a) {
    let v;
    let s = 1;
    if (a < 0) {
        s = -1;
    }
    v = Math.round(s*a/Math.PI);
    v = (v >= 2 ? 0 : v);
    return v * Math.PI;
}
function isok() {
    let delta = 0.01
    let k = g.children.filter(function (e) {
        if (Math.abs(e.rotation._x - g.children[0].rotation._x) < delta &&
            Math.abs(e.rotation._y - g.children[0].rotation._y) < delta &&
            Math.abs(e.rotation._z - g.children[0].rotation._z) < delta ) {
            return true;
        } else {
            return false;
        }
    });
    return k;
}
/**
 * eventからmouse座標を拾い、THREE.Vectorベクトルにする
 * 
 */
function get_mouse_to_vector(event) {
    let e;
    if (support_touch) {
        e = event.touches[0];
    } else {
        e = event;
    }
    let x = ((e.clientX - area_offset.left) / width ) * 2 - 1;
    let y = - ((e.clientY - area_offset.top) / height) * 2 + 1;
    return new THREE.Vector2(x, y);
}
function intersects_objects_from_mouse(mouse, camera, objs) {
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(objs, true );
}

function subcubes(intersects) {
    var max = 100;
    var f = intersects.filter(function (e) {
        if (e.object.type == "Mesh") {
            var m = e.distance;
            if (m < max) {
                max = m;
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }});
    return f;
}
function onDocumentMouseDown(event) {
    event.preventDefault();
    mouse = get_mouse_to_vector(event);
    let intersects = intersects_objects_from_mouse(mouse, camera, g.children);
    if (intersects.length <= 0) {
        return;
    }
    let f = subcubes(intersects);
    if (f.length <= 0) {
        return;
    }
    controls.enabled = false;
    offset.copy(f[0].point);
    draggedPlaneObj = f[0].object;
    draggedObj = draggedPlaneObj.parent;
    hilight(1);
}
function onDocumentMouseMove(event) {
    let intersects;
    event.preventDefault();
    mouse = get_mouse_to_vector(event);
    if (!draggedObj) {
        return;
    }
    // カメラから見たマウスの位置のオブジェクトを取り出す
    intersects = intersects_objects_from_mouse(mouse, camera, g.children);
    if (intersects.length == 0) {
        return;
    }
    // オブジェクトのうち、キューブを取り出す
    let f = subcubes(intersects);
    if (f.length == 0) {
        return;
    }
    let p = f[0].object.parent;
    let n = p.name.split(",");
    //        text.appendChild(document.createTextNode(n));
    // 同じキューブを掴んだまま
    if (p.name == draggedObj.name) {
        return;
    }
    let b = draggedObj.name.split(",");
    let x;
    let a;
    let d;
    if (b[0] == n[0] && b[1] != n[1]) {
        // xが同じでzが違うということは、xの値の位置でx軸に沿って回転。
        a = "x";
        x = b[0];
        d = n[1] - b[1];
    } else if (b[0] != n[0] && b[1] == n[1]) {
        // zが同じでxが違うということは、zの値の位置でz軸に沿って回転。
        a = "z";
        x = b[1];
        d = b[0] - n[0];
    } else {
        // それ以外は対象外として無視
        return ;
    }
    // 回転することが決ったので、draggedObjをnullにしておく
    draggedObj = null;
    hilight(0);
    op(x, a, d);
}
function hilight(a) {
    if (draggedPlaneObj) {
        let c = draggedPlaneObj.material.color.getHex();
        draggedPlaneObj.material.color.setHex(c ^ cmask);
    }
    if (!a) {
        draggedPlaneObj = null;
    }
}
function onDocumentMouseUp(event) {
    event.preventDefault();
    controls.enabled = true;
    hilight(0);
    if (draggedObj) {
        
//        draggedPlaneObj.children[0].material.color.setHex(0x000000);
        draggedObj = null;
    }
}
function init_game() {
    let i = 0;
    for (i = 0; i < 5; i++) {
        let r = parseInt(Math.random() * 3);
        //        text.appendChild(document.createTextNode(r));
        //        text.appendChild(document.createTextNode(j));
        if (i % 2 == 0) {
            op_queue.push(function() { op(r-1, "z", 1, "nolog"); });
        } else {
            op_queue.push(function() { op(r-1, "x", 1, "nolog"); });
        }
    }
    (op_queue.shift())();
}
init_game();
render();
