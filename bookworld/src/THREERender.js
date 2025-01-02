import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
// import { NodeToyMaterial } from "@nodetoy/three-nodetoy";


import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import * as TWEEN from 'three/addons/libs/tween.module.js';


var controls;
var isChangingMode = false;
var hiding = false;

var loadingDiv;
var _scrollYMaterials = [];
var _scrollXMaterials = [];


var mousePos = new THREE.Vector2(0,window.innerWidth);
var ismouseDown = false;
var isDrag = false;
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



    _clock = new THREE.Clock(true);
    _deltaTime = _clock.getDelta();
    _elapTime = 0;

    _scene = new THREE.Scene()
    _scene.background = null;
    // _scene.fog = new THREE.FogExp2( 0xbaeef5, 0.0005 );

    _camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 10000)
    _camera.rotation.set(-0.27, 0, 0);
    _camera.position.set(3, 3, 5);
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
    _renderer.xr.enabled = true;
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

    controls = new OrbitControls( _camera, _renderer.domElement );

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

function Update( timestamp, frame) {
    if (hiding) return;
    _deltaTime = _clock.getDelta();

    _scrollYMaterials.forEach(mat => {
        mat.emissiveMap.offset.y += mat.userData.scrollY;
    });
    _scrollXMaterials.forEach(mat => {
        mat.emissiveMap.offset.x += mat.userData.scrollX;
    });


    _elapTime = _clock.getElapsedTime();
    if (!document.hidden)
        TWEEN.update();
    _updateFunctions.forEach(element => {
        element(_deltaTime, _elapTime,  timestamp, frame);
    });

    // _composer.render();
    _renderer.render(_scene, _camera);

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
}

function PrintStatus() {
    console.log("Calls: " + _renderer.info.render.calls + " " + _renderer.info.render.triangles);
    _renderer.info.reset();
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
    ismouseDown = false;
    isDrag = false;
}


function onDocumentMouseDown(event) {
    // console.log("mouse down");

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
export function GetRenderer(){
    return _renderer;
}
function CreateLights() {


    // const spotLight = new THREE.SpotLight(0xffffff, 150);
    // spotLight.position.set(0, 5, 0);
    // // spotLight.map = new THREE.TextureLoader().load( url );
    // // spotLight.lookAt(new THREE.Vector3(0,0,1))
    // spotLight.castShadow = true;
    // spotLight.angle = 0.2;
    // spotLight.penumbra = 0.4;

    // spotLight.shadow.mapSize.width = 1024;
    // spotLight.shadow.mapSize.height = 1024;

    // spotLight.shadow.camera.near = 5;
    // spotLight.shadow.camera.far = 10;
    // spotLight.shadow.bias = -0.0005;

    // _scene.add(spotLight);

    let _hdrEquirectangularMap = new RGBELoader()
        .load('assets/images/shanghai_bund_1k.hdr', () => {
            _hdrEquirectangularMap.mapping = THREE.EquirectangularReflectionMapping;
            _hdrEquirectangularMap.minFilter = THREE.LinearFilter;
            _hdrEquirectangularMap.magFilter = THREE.LinearFilter;
            _hdrEquirectangularMap.needsUpdate = true;
            _scene.environment = _hdrEquirectangularMap;
            // _scene.background = _hdrEquirectangularMap;
        });
}

export function AddUpdateFunction(func){
_updateFunctions.push(func);
}