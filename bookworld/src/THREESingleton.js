import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
// import { NodeToyMaterial } from "@nodetoy/three-nodetoy";


import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import * as TWEEN from 'three/addons/libs/tween.module.js';
import { ShowInfoPopup } from './info.js';

var ismouseDown = false;
var isDrag = false;

var isChangingMode = false;
var hiding = false;

var loadingDiv;
var currentHighlightBook;
var _scrollYMaterials = [];
var _scrollXMaterials = [];

var mainScene;
var effectOpen;
var effectStand;
var effectStandBook;
var effectOpenTween;
var effectStandTween;

var openPorTween;
var openPorTweenUI;
var openMenuTween;
var openMenuTweenUI;

var openPos;

var cameraTermPos = new THREE.Vector3();
var cameraTermRot = new THREE.Quaternion();
var cameraOldRot = new THREE.Quaternion();

var mousePos = new THREE.Vector2(0,window.innerWidth);
var rayMousePos = new THREE.Vector2();
var raycaster = new THREE.Raycaster();
raycaster.layers.set(1);

let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

var _clock;
var _deltaTime;
var _elapTime;


var _scene;
var _camera;
var _renderer;

var _updateFunctions = [];


var _composer;
var _outputPass;
var _renderPass;
var _bloomPass;
var _outlinePass;


export function Init() {
    loadingDiv = document.getElementById("loading");

    document.getElementById("backbutton").addEventListener("click", (e) => {
        ShowMenu()
    })


    _clock = new THREE.Clock(true);
    _deltaTime = _clock.getDelta();
    _elapTime = 0;

    _scene = new THREE.Scene()
    _scene.background = null;
    // _scene.fog = new THREE.FogExp2( 0xbaeef5, 0.0005 );

    _camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 10000)
    _camera.rotation.set(-0.27, 0, 0);
    _camera.position.set(0, 0.6, 2.07);
    cameraTermPos.copy(_camera.position);
    _camera.lookAt(_scene.position)
    _scene.add(_camera);

    _renderer = new THREE.WebGLRenderer({ antialias: false });
    _renderer.toneMapping = THREE.ACESFilmicToneMapping;
    _renderer.toneMappingExposure = 1;
    _renderer.info.autoReset = false;
    _renderer.setSize(window.innerWidth, window.innerHeight);
    _renderer.shadowMap.enabled = true;
    _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    _renderer.domElement.style.zIndex = 3;
    _renderer.domElement.style.position = "fixed";
    // if (!isTouchDevice) {

    // } else {

    // }
    CreateLights();

    if (window.matchMedia("(pointer: coarse)").matches) {
        _renderer.domElement.addEventListener('touchstart', onTouchStart);
        _renderer.domElement.addEventListener('touchmove', onTouchMove);
        _renderer.domElement.addEventListener('touchend', onTouchEnd);
    }
    else {
        _renderer.domElement.addEventListener('pointermove', onDocumentMouseMove);
        _renderer.domElement.addEventListener('pointerdown', onDocumentMouseDown);
        _renderer.domElement.addEventListener('pointerup', onDocumentMouseUp);
    }

    // controls = new OrbitControls( _camera, _renderer.domElement );

    _renderer.setAnimationLoop(Update);
    document.body.appendChild(_renderer.domElement)


    _composer = new EffectComposer(_renderer);
    _renderPass = new RenderPass(_scene, _camera);

    _bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.3, 0.9);

    _outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), _scene, _camera);
    _outlinePass.hiddenEdgeColor.set('#1aff47');
    _outlinePass.edgeStrength = 8;
    _outlinePass.visibleEdgeColor.set('#1aff47');

    _outputPass = new OutputPass();
    _outputPass.enabled = true;

    _composer.addPass(_renderPass);
    _composer.addPass(_outlinePass);
    _composer.addPass(_bloomPass);
    _composer.addPass(_outputPass);

    SetupRender();


}

function Update() {
    if (hiding) return;
    _deltaTime = _clock.getDelta();

    _scrollYMaterials.forEach(mat => {
        mat.emissiveMap.offset.y += mat.userData.scrollY;
    });
    _scrollXMaterials.forEach(mat => {
        mat.emissiveMap.offset.x += mat.userData.scrollX;
    });

    if (isChangingMode == false) {
        cameraTermPos.x += (((mousePos.x - windowHalfX) / 800) - cameraTermPos.x) * .05;
        cameraTermPos.y += (-((mousePos.y - windowHalfY) / 200) - cameraTermPos.y) * .05;
        cameraTermPos.z = _camera.position.z;
        _camera.position.lerp(cameraTermPos, 0.1);
        if (_camera.position.y < 0.6) {
            _camera.position.y = 0.6;
        }
        cameraOldRot.copy(_camera.quaternion);
        _camera.lookAt(_scene.position);
        _camera.updateProjectionMatrix();

        cameraTermRot.copy(_camera.quaternion);
        _camera.quaternion.copy(cameraOldRot);
        _camera.quaternion.slerp(cameraTermRot, 0.1);

        raycaster.setFromCamera(rayMousePos, _camera);
        const intersects = raycaster.intersectObject(_scene, true);
        if (intersects.length > 0) {
            const selectedObject = intersects[0].object;
            if (selectedObject.parent.name == "BookOpen" || selectedObject.parent.name == "BookStand") {
                HighlightBook(selectedObject);
            }
            else {
                RemoveSelectedObject();
            }
        }
        else {
            RemoveSelectedObject();
        }
    }

    _elapTime = _clock.getElapsedTime();
    if (!document.hidden)
        TWEEN.update();
    _updateFunctions.forEach(element => {
        element(_deltaTime, _elapTime);
    });

    _composer.render();

    // PrintStatus();
}

function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    _camera.aspect = window.innerWidth / window.innerHeight
    _camera.updateProjectionMatrix()

    // _bloomPass.setSize(window.innerWidth, window.innerHeight);
    _renderer.setSize(window.innerWidth, window.innerHeight);
    _composer.setSize(window.innerWidth, window.innerHeight);
}
function SetupRender() {
    window.addEventListener('resize', () => { onWindowResize() }, false)
}

export function AddObjectToScene(object) {
    _scene.add(object);
    if (object.name == "effectOpen") {
        effectOpen = object;
    }
    else if (object.name == "effectStand") {
        effectStand = object;
    }
    else if (object.name == "mainscene") {
        mainScene = object;
        object.traverse((child) => {
            if (child.name == "StandBook") {
                effectStandBook = child;
            } else if (child.name == "BookOpen") {
                openPos = new THREE.Vector3();
                child.getWorldPosition(openPos);
            }
        })
    }

    if(effectOpen != null && effectStand != null && mainScene != null){
        document.getElementById("loading-progress").style.animationName = "split-effect-hide";

        setTimeout(()=>{
            document.getElementById("loading-progress").style.display = "none";
        },400)
    }
}

function PrintStatus() {
    console.log("Calls: " + _renderer.info.render.calls + " " + _renderer.info.render.triangles);
    _renderer.info.reset();
}
function StopAllTween() {
    openMenuTween?.stop();
    openMenuTweenUI?.stop();
    openPorTween?.stop();
    openPorTweenUI?.stop();
}


function onTouchStart(event) {
    ismouseDown = true;

}
function onTouchMove(event) {
    mousePos.x = event.changedTouches[0].clientX;
    mousePos.y = event.changedTouches[0].clientY;

    rayMousePos.x = (event.changedTouches[0].clientX / window.innerWidth) * 2 - 1;
    rayMousePos.y = - (event.changedTouches[0].clientY / window.innerHeight) * 2 + 1;
}
function onTouchEnd(event) {
    ismouseDown = false;
    rayMousePos.x = (event.changedTouches[0].clientX / window.innerWidth) * 2 - 1;
    rayMousePos.y = - (event.changedTouches[0].clientY / window.innerHeight) * 2 + 1;
    CheckSelectBook();
}
function onDocumentMouseMove(event) {

    mousePos.x = event.clientX;
    mousePos.y = event.clientY;

    rayMousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
    rayMousePos.y = - (event.clientY / window.innerHeight) * 2 + 1;

}
function onDocumentMouseUp(event) {
    rayMousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
    rayMousePos.y = - (event.clientY / window.innerHeight) * 2 + 1;
    CheckSelectBook();
    ismouseDown = false;
    isDrag = false;
}

function CheckSelectBook() {
    raycaster.setFromCamera(rayMousePos, _camera);
    const intersects = raycaster.intersectObject(_scene, true);
    if (intersects.length > 0) {
        const selectedObject = intersects[0].object;
        if (selectedObject.parent.name == "BookOpen") {
            HighlightBook(selectedObject);
            StopAllTween();
            isChangingMode = true;
            let oldRot = _camera.quaternion.clone();
            _camera.lookAt(openPos);
            _camera.updateProjectionMatrix();
            let newRot = _camera.quaternion.clone();
            _camera.quaternion.copy(oldRot);
            openPorTween = new TWEEN.Tween({ t: 30 }).to({ t: 0 }, 2000).easing(TWEEN.Easing.Back.In).onUpdate((value) => {
                _camera.fov = value.t;
                _camera.quaternion.slerp(newRot, 0.1);
                _camera.updateProjectionMatrix();
            }).start().onComplete(() => {
                GetPortfolioData();
                document.getElementById("portfolio").style.display = "block";
                loading.style.display = "block";
                loading.style.backgroundColor = 'rgba(30, 30, 30, 1)';
                openPorTweenUI = new TWEEN.Tween({ x: 1 }).to({ x: 0 }, 2000).onUpdate((value) => {
                    loading.style.backgroundColor = 'rgba(30, 30, 30, ' + value.x + ')';
                }).start().onComplete(() => {
                    hiding = true;
                    loading.style.display = "none";
                });

            });
        }
        else if (selectedObject.parent.name == "BookStand") {
            ShowInfoPopup();

        }
    }
}

function onDocumentMouseDown(event) {
    // console.log("mouse down");

}
export function ShowMenu() {

    StopAllTween();
    hiding = false;

    loading.style.display = "block";
    loading.style.backgroundColor = 'rgba(30, 30, 30, 0)';
    openMenuTween = new TWEEN.Tween({ x: 0 }).to({ x: 1 }, 500).onUpdate((value) => {
        loading.style.backgroundColor = 'rgba(30, 30, 30, ' + value.x + ')';
    }).start().onComplete(() => {
        if (openMenuTweenUI) {
            openMenuTweenUI.stop();
        }
        document.getElementById("portfolio").style.display = "none";

        openMenuTweenUI = new TWEEN.Tween({ t: 0 }).to({ t: 30 }, 2000).easing(TWEEN.Easing.Back.Out).onUpdate((value) => {
            _camera.fov = value.t;
            _camera.updateProjectionMatrix();
            loading.style.backgroundColor = 'rgba(30, 30, 30, ' + (1 - (value.t / 30)) + ')';

        }).start().onComplete(() => {
            loading.style.display = "none";
            isChangingMode = false

        });
    });

}
function HighlightBook(selectedObject) {
    if (selectedObject.parent.name == "BookOpen") {
        if (currentHighlightBook)
            if (currentHighlightBook.name == selectedObject.parent.name)
                return;
        RemoveSelectedObject();
        currentHighlightBook = selectedObject.parent;
        AddSelectedObject(selectedObject.parent)
        if (effectOpen) {
            effectOpen.visible = true;

            if (effectOpenTween == null) {
                effectOpen.traverse((child) => {
                    if (child.type == "Mesh") {
                        child.material.opacity = 0
                    }
                })
                effectOpenTween = new TWEEN.Tween({ t: 0 }).to({ t: 1 }, 2000).start().onComplete(() => {
                    effectOpenTween = null;
                }).onUpdate((value) => {
                    effectOpen.traverse((child) => {
                        if (child.type == "Mesh") {
                            child.material.opacity = value.t
                        }
                    })
                })
            }
        }
    }
    else if (selectedObject.parent.name == "BookStand") {
        if (currentHighlightBook)
            if (currentHighlightBook.name == selectedObject.parent.name)
                return;

        RemoveSelectedObject();

        currentHighlightBook = selectedObject.parent;
        if (effectStand) {
            effectStand.visible = true;
            if (effectStandTween == null) {
                effectStand.traverse((child) => {
                    if (child.type == "Mesh") {
                        child.material.opacity = 0
                    }
                })
                effectStandBook.material.emissiveIntensity = 0
                effectStandTween = new TWEEN.Tween({ t: 0 }).to({ t: 1 }, 1000).start().onComplete(() => {
                    effectStandTween = null;
                }).onUpdate((value) => {
                    effectStandBook.material.emissiveIntensity = value.t * 50
                    effectStand.traverse((child) => {
                        if (child.type == "Mesh") {
                            child.material.opacity = value.t
                        }
                    })
                })
            }
        }
        AddSelectedObject(selectedObject.parent)

    }
}
function AddSelectedObject(object) {
    if (object)
        _outlinePass.selectedObjects = object.children;
    else
        _outlinePass.selectedObjects = [];
}
function RemoveSelectedObject() {
    if (effectOpen)
        effectOpen.visible = false;
    if (effectOpenTween) {
        effectOpenTween.stop();
        effectOpenTween = null;
    }
    if (effectStand) {
        effectStand.visible = false;
    }
    if (effectStandBook)
        effectStandBook.material.emissiveIntensity = 0

    if (effectStandTween) {
        effectStandTween.stop();
        effectStandTween = null;

    }
    AddSelectedObject(null);
    currentHighlightBook = null;
}
export function AddScrollYMat(mat) {
    _scrollYMaterials.push(mat);
}
export function AddScrollXMat(newmat) {
    if (!_scrollXMaterials.some(mat => mat.id === newmat.id)) {
        _scrollXMaterials.push(newmat);
        return;
    }
}

function CreateLights() {
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(4, 10, -6); //default; light shining from top
    light.castShadow = true; // default false
    light.shadow.mapSize.width = 2048; // default
    light.shadow.mapSize.height = 2048; // default
    light.shadow.camera.near = 0.0001; // default
    light.shadow.camera.far = 20; // default
    light.shadow.camera.top = 3;
    light.shadow.camera.bottom = -3;
    light.shadow.camera.left = -3;
    light.shadow.camera.right = 3;
    light.shadow.bias = -0.0002

    _scene.add(light);

    // const helper = new THREE.CameraHelper(light.shadow.camera);
    // _scene.add(helper);

    const spotLight = new THREE.SpotLight(0xffffff, 150);
    spotLight.position.set(0, 5, 0);
    // spotLight.map = new THREE.TextureLoader().load( url );
    // spotLight.lookAt(new THREE.Vector3(0,0,1))
    spotLight.castShadow = true;
    spotLight.angle = 0.2;
    spotLight.penumbra = 0.4;

    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;

    spotLight.shadow.camera.near = 5;
    spotLight.shadow.camera.far = 10;
    spotLight.shadow.bias = -0.0005;

    _scene.add(spotLight);

    let _hdrEquirectangularMap = new RGBELoader()
        .load('assets/images/shanghai_bund_1k.hdr', () => {
            _hdrEquirectangularMap.mapping = THREE.EquirectangularReflectionMapping;
            _hdrEquirectangularMap.minFilter = THREE.LinearFilter;
            _hdrEquirectangularMap.magFilter = THREE.LinearFilter;
            _hdrEquirectangularMap.needsUpdate = true;
            _scene.environment = _hdrEquirectangularMap;
        });
}