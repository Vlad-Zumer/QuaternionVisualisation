import * as THREE from './threeJSLocal/build/three.module.js';
import { OrbitControls } from './threeJSLocal/examples/jsm/controls/OrbitControls.js';
import { GUI } from './threeJSLocal/examples/jsm/libs/dat.gui.module.js';

import { Better3DGizmo } from './Better3DGizmo.js'
import { GUIManager, GUIObjHelpers } from './datGUIHelper.js';
import { Better3DArrow } from './Better3DArrow.js';
import { QuatRotationArch } from './QuatRotationArc.js';

let WindowResizeListenerObjects = [];

function Init() {
	// set up scene
	var scene = new THREE.Scene();

	// set up camera
	const fov = 45;
	const aspectRatio = window.innerWidth / window.innerHeight;
	const nearPlane = 0.1;
	const farPlane = 2000;
	var camera = new THREE.PerspectiveCamera(fov, aspectRatio, nearPlane, farPlane);

	// position camera so it looks good
	camera.position.x = 4.5;
	camera.position.y = 4.5;
	camera.position.z = 4.5;

	// set up renderer
	let renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setClearColor(0x888888, 1);
	renderer.setSize(window.innerWidth, window.innerHeight);

	// set up controls
	let controls = new OrbitControls(camera, renderer.domElement);
	controls.enablePan = false; // do not pan
	controls.maxDistance = 50; // do not go further than 50
	controls.minDistance = 1; // do not go closer than 1


	// listen to window resize
	window.addEventListener('resize', OnWindowResize);

	return { scene, camera, renderer, controls };
}

function GUIInit() {
	let myGUI = new GUI();
	myGUI.width = window.innerWidth / 6.0;

	let manager = new GUIManager(myGUI);
	manager.onChange(OnGUIValueChanged);

	let guiDesc = {
		'Object Properties': {
			'Object Type': GUIObjHelpers.CreateOptions('Ball', ['Ball']),
			'Starting Position': {
				'X': GUIObjHelpers.CreateNumberSlider(1, 0, 2, 0.01),
				'Y': GUIObjHelpers.CreateNumberSlider(0, 0, 2, 0.01),
				'Z': GUIObjHelpers.CreateNumberSlider(0, 0, 2, 0.01),
			},
		},
		'Inputs': {
			'Input Mode': GUIObjHelpers.CreateOptions('Degrees', ['Degrees']),
			'Active Input Type': GUIObjHelpers.CreateOptions('Euler Angles', ['Euler Angles', 'Axis-Angle', 'Quaternion']),
			'Euler Angles Input': {
				'Order': GUIObjHelpers.CreateOptions('XYZ', ['XYZ', 'ZYX', 'YZX']),
				'Rot X': GUIObjHelpers.CreateNumberSlider(0, -180, 180, 0.1),
				'Rot Y': GUIObjHelpers.CreateNumberSlider(0, -180, 180, 0.1),
				'Rot Z': GUIObjHelpers.CreateNumberSlider(0, -180, 180, 0.1),
			},
			'Axis-Angle Input': {
				'Axis X': GUIObjHelpers.CreateNumberSlider(0, 0, 5, 0.001),
				'Axis Y': GUIObjHelpers.CreateNumberSlider(0, 0, 5, 0.001),
				'Axis Z': GUIObjHelpers.CreateNumberSlider(0, 0, 5, 0.001),
				'Angle': GUIObjHelpers.CreateNumberSlider(0, -180, 180, 0.5),
				'Normalize Axis Display': function () { NormalizeAxisDisplay(); },
			},
			'Quaternion Proportional Input': {
				'X': GUIObjHelpers.CreateNumberSlider(0, 0, 1, 0.001),
				'Y': GUIObjHelpers.CreateNumberSlider(0, 0, 1, 0.001),
				'Z': GUIObjHelpers.CreateNumberSlider(0, 0, 1, 0.001),
				'W': GUIObjHelpers.CreateNumberSlider(1, 0, 1, 0.001),
				'Apply': function () { ApplyQuaternionRotation(); },
			}
		},
		'Quaternion Actual Values': {
			'X': GUIObjHelpers.CreateNumberSlider(0, 0, 1, 0.001),
			'Y': GUIObjHelpers.CreateNumberSlider(0, 0, 1, 0.001),
			'Z': GUIObjHelpers.CreateNumberSlider(0, 0, 1, 0.001),
			'W': GUIObjHelpers.CreateNumberSlider(1, 0, 1, 0.001),
			'Show Axis Of Rotation': false,
		},
	};

	let bindedObj = manager.makeGUI(guiDesc);

	let allFolderControls = manager.getControls("/*", GUIManager.ControlType.FOLDER_CONTROL);
	allFolderControls.forEach((val) => { val.open(); });

	let quatDisplayControls = manager.getControls('/Quaternion Actual Values/*', GUIManager.ControlType.VALUE_CONTROL);
	quatDisplayControls.forEach((val) => { DisableGUIControl(val, false); });

	quatDisplayControls = manager.getControls('/Quaternion Actual Values/Show Axis Of Rotation', GUIManager.ControlType.VALUE_CONTROL);
	quatDisplayControls.forEach((val) => { EnableGUIControl(val); });

	return { bindedObj, manager };
}


function DisableGUIControl(control, invalid = true) {
	let domElementForPointerEvents_ClassList = control.domElement.parentElement.parentElement.classList;
	let domElementForDisplay_ClassList = control.domElement.previousElementSibling.classList;

	domElementForPointerEvents_ClassList.add('no-pointer-events');
	domElementForDisplay_ClassList.add('control-disabled');

	if (invalid) {
		domElementForDisplay_ClassList.add('control-invalid');
	}
}

function EnableGUIControl(control) {
	let domElementForPointerEvents_ClassList = control.domElement.parentElement.parentElement.classList;
	let domElementForDisplay_ClassList = control.domElement.previousElementSibling.classList;

	domElementForPointerEvents_ClassList.remove('no-pointer-events');
	domElementForDisplay_ClassList.remove('control-disabled');
	domElementForDisplay_ClassList.remove('control-invalid');
}

function UpdateGUI() {

	// Update Input Enable GUI
	{
		let value = GUIObject.bindedObj['Inputs']['Active Input Type'];
		let controls = [];
		switch (value) {
			case 'Euler Angles':
				controls = GUIObject.manager.getControls('/Inputs/Axis-Angle Input/*', GUIManager.ControlType.VALUE_CONTROL);
				controls = controls.concat(GUIObject.manager.getControls('/Inputs/Quaternion Proportional Input/*', GUIManager.ControlType.VALUE_CONTROL));
				controls.forEach((control) => { DisableGUIControl(control); });
				controls = GUIObject.manager.getControls('/Inputs/Euler Angles Input/*', GUIManager.ControlType.VALUE_CONTROL);
				controls.forEach((control) => { EnableGUIControl(control); });
				controls = GUIObject.manager.getControls('/Inputs/Euler Angles Input/', GUIManager.ControlType.FOLDER_CONTROL);
				controls.forEach((control) => { control.open(); });
				break;
			case 'Axis-Angle':
				controls = GUIObject.manager.getControls('/Inputs/Euler Angles Input/*', GUIManager.ControlType.VALUE_CONTROL);
				controls = controls.concat(GUIObject.manager.getControls('/Inputs/Quaternion Proportional Input/*', GUIManager.ControlType.VALUE_CONTROL));
				controls.forEach((control) => { DisableGUIControl(control); })
				controls = GUIObject.manager.getControls('/Inputs/Axis-Angle Input/*', GUIManager.ControlType.VALUE_CONTROL);
				controls.forEach((control) => { EnableGUIControl(control); });
				controls = GUIObject.manager.getControls('/Inputs/Axis-Angle Input/', GUIManager.ControlType.FOLDER_CONTROL);
				controls.forEach((control) => { control.open(); });
				break;
			case 'Quaternion':
				controls = GUIObject.manager.getControls('/Inputs/Axis-Angle Input/*', GUIManager.ControlType.VALUE_CONTROL);
				controls = controls.concat(GUIObject.manager.getControls('/Inputs/Euler Angles Input/*', GUIManager.ControlType.VALUE_CONTROL));
				controls.forEach((control) => { DisableGUIControl(control); })
				controls = GUIObject.manager.getControls('/Inputs/Quaternion Proportional Input/*', GUIManager.ControlType.VALUE_CONTROL);
				controls.forEach((control) => { EnableGUIControl(control); });
				controls = GUIObject.manager.getControls('/Inputs/Quaternion Proportional Input/', GUIManager.ControlType.FOLDER_CONTROL);
				controls.forEach((control) => { control.open(); });
				break;
		}
	}

	// Update Quaternion Display Values
	{
		GUIObject.bindedObj['Quaternion Actual Values']['X'] = rotation.x;
		GUIObject.bindedObj['Quaternion Actual Values']['Y'] = rotation.y;
		GUIObject.bindedObj['Quaternion Actual Values']['Z'] = rotation.z;
		GUIObject.bindedObj['Quaternion Actual Values']['W'] = rotation.w;
	}

	GUIObject.manager.updateVisuals();

}

function UpdateScene() {
	// changes to procedural geometry

	// Axis of rotation
	{
		scene.remove(axisOfRotation);
		// do not show if there is no rotation
		if (!rotation.equals(new THREE.Quaternion().identity())) {
			WindowResizeListenerObjects = WindowResizeListenerObjects.filter(val => val !== axisOfRotation);
			if (GUIObject.bindedObj['Quaternion Actual Values']['Show Axis Of Rotation']) {
				let { axis, _ } = GetAxisAngle(rotation);
				axisOfRotation = new Better3DArrow(axis.clone().normalize().multiplyScalar(-3), axis.clone().normalize().multiplyScalar(3));
				scene.add(axisOfRotation);
				WindowResizeListenerObjects.push(axisOfRotation);
			}
		}
	}

	// Rotation Arch
	{
		scene.remove(rotationPath);
		WindowResizeListenerObjects = WindowResizeListenerObjects.filter(val => val !== rotationPath);
		let { _, angle } = GetAxisAngle(rotation);
		const angleDeg = THREE.MathUtils.radToDeg(angle);
		const showMiddleArrow = angleDeg > 30.0 && (objectToRotate.position.clone().sub(rotatedObject.position.clone()).length() > 0.4);
		rotationPath = new QuatRotationArch(objectToRotate.position.clone(), rotation.clone(), showMiddleArrow);
		scene.add(rotationPath);
		WindowResizeListenerObjects.push(rotationPath);
	}
}

function UpdateAll() {
	UpdateGUI();
	UpdateScene();
}

function OnGUIValueChanged(path, value) {

	if (path.startsWith('/Object Properties')) {
		if (path.startsWith('/Object Properties/Starting Position')) {
			MoveObjectToPosition(
				objectToRotate,
				new THREE.Vector3(
					GUIObject.bindedObj['Object Properties']['Starting Position']['X'],
					GUIObject.bindedObj['Object Properties']['Starting Position']['Y'],
					GUIObject.bindedObj['Object Properties']['Starting Position']['Z']
				)
			);

			MoveObjectToPosition(
				rotatedObject,
				GetRotatedObjPosition()
			);
		}
	}

	if (path.startsWith('/Inputs')) {
		if (path.startsWith('/Inputs/Euler Angles Input')) {
			// regenerate from euler angles
			let order = GUIObject.bindedObj['Inputs']['Euler Angles Input']['Order'];
			let x = THREE.MathUtils.degToRad(GUIObject.bindedObj['Inputs']['Euler Angles Input']['Rot X']);
			let y = THREE.MathUtils.degToRad(GUIObject.bindedObj['Inputs']['Euler Angles Input']['Rot Y']);
			let z = THREE.MathUtils.degToRad(GUIObject.bindedObj['Inputs']['Euler Angles Input']['Rot Z']);
			let euler = new THREE.Euler(x, y, z, order);

			rotation = new THREE.Quaternion().setFromEuler(euler);
			MoveObjectToPosition(
				rotatedObject,
				GetRotatedObjPosition()
			);

			// update rest of the object
			let { axis, angle } = GetAxisAngle(rotation);
			GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis X'] = axis.x;
			GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis Y'] = axis.y;
			GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis Z'] = axis.z;
			GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Angle'] = THREE.MathUtils.radToDeg(angle);

			GUIObject.bindedObj['Inputs']['Quaternion Proportional Input']['X'] = rotation.x;
			GUIObject.bindedObj['Inputs']['Quaternion Proportional Input']['Y'] = rotation.y;
			GUIObject.bindedObj['Inputs']['Quaternion Proportional Input']['Z'] = rotation.z;
			GUIObject.bindedObj['Inputs']['Quaternion Proportional Input']['W'] = rotation.w;

		}
		if (path.startsWith('/Inputs/Axis-Angle Input')) {
			// regenerate from axis-angle
			let axis = new THREE.Vector3();
			axis.x = GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis X'];
			axis.y = GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis Y'];
			axis.z = GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis Z'];
			axis = axis.normalize();
			let angle = GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Angle'];
			angle = THREE.MathUtils.degToRad(angle);

			rotation = new THREE.Quaternion().setFromAxisAngle(axis, angle);
			MoveObjectToPosition(
				rotatedObject,
				GetRotatedObjPosition()
			);

			// update rest of object
			let order = GUIObject.bindedObj['Inputs']['Euler Angles Input']['Order'];
			let euler = new THREE.Euler().setFromQuaternion(rotation, order);
			GUIObject.bindedObj['Inputs']['Euler Angles Input']['Rot X'] = THREE.MathUtils.radToDeg(euler.x);
			GUIObject.bindedObj['Inputs']['Euler Angles Input']['Rot Y'] = THREE.MathUtils.radToDeg(euler.y);
			GUIObject.bindedObj['Inputs']['Euler Angles Input']['Rot Z'] = THREE.MathUtils.radToDeg(euler.z);

			GUIObject.bindedObj['Inputs']['Quaternion Proportional Input']['X'] = rotation.x;
			GUIObject.bindedObj['Inputs']['Quaternion Proportional Input']['Y'] = rotation.y;
			GUIObject.bindedObj['Inputs']['Quaternion Proportional Input']['Z'] = rotation.z;
			GUIObject.bindedObj['Inputs']['Quaternion Proportional Input']['W'] = rotation.w;
		}
		if (path.startsWith('/Inputs/Quaternion Proportional Input')) {
			// regenerate from quaternion
			// Do nothing until apply
		}
	}


	UpdateAll();
}

function ApplyQuaternionRotation() {
	let newRot = new THREE.Quaternion().identity();
	newRot.x = GUIObject.bindedObj['Inputs']['Quaternion Proportional Input']['X'];
	newRot.y = GUIObject.bindedObj['Inputs']['Quaternion Proportional Input']['Y'];
	newRot.z = GUIObject.bindedObj['Inputs']['Quaternion Proportional Input']['Z'];
	newRot.w = GUIObject.bindedObj['Inputs']['Quaternion Proportional Input']['W'];
	newRot = newRot.normalize();

	rotation = newRot.clone();
	MoveObjectToPosition(
		rotatedObject,
		GetRotatedObjPosition()
	);

	// update rest of object
	let order = GUIObject.bindedObj['Inputs']['Euler Angles Input']['Order'];
	let euler = new THREE.Euler().setFromQuaternion(rotation, order);
	GUIObject.bindedObj['Inputs']['Euler Angles Input']['Rot X'] = THREE.MathUtils.radToDeg(euler.x);
	GUIObject.bindedObj['Inputs']['Euler Angles Input']['Rot Y'] = THREE.MathUtils.radToDeg(euler.y);
	GUIObject.bindedObj['Inputs']['Euler Angles Input']['Rot Z'] = THREE.MathUtils.radToDeg(euler.z);

	let { axis, angle } = GetAxisAngle(rotation);
	GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis X'] = axis.x;
	GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis Y'] = axis.y;
	GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis Z'] = axis.z;
	GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Angle'] = THREE.MathUtils.radToDeg(angle);

	UpdateAll();

}

function NormalizeAxisDisplay() {
	let axis = new THREE.Vector3();
	axis.x = GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis X'];
	axis.y = GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis Y'];
	axis.z = GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis Z'];
	axis = axis.normalize();
	GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis X'] = axis.x;
	GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis Y'] = axis.y;
	GUIObject.bindedObj['Inputs']['Axis-Angle Input']['Axis Z'] = axis.z;

	UpdateAll();

}

function OnWindowResize() {

	// recalculate camera aspect and projection matrix
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	// reset renderer size
	renderer.setSize(window.innerWidth, window.innerHeight);

	for (let index = 0; index < WindowResizeListenerObjects.length; index++) {
		WindowResizeListenerObjects[index].OnRendererSizeUpdate();
	}
}

function Add3DOriginGizmo(scene) {
	let OriginGizmo3D = new Better3DGizmo(3);
	scene.add(OriginGizmo3D);
	WindowResizeListenerObjects.push(OriginGizmo3D);
}

function MoveObjectToPosition(object, position) {
	let currPos = object.position;
	object.translateX(-currPos.x);
	object.translateY(-currPos.y);
	object.translateZ(-currPos.z);

	object.translateX(position.x);
	object.translateY(position.y);
	object.translateZ(position.z);
}

function AddObjectToRotate(scene) {
	let geometry = new THREE.OctahedronGeometry(.075, 5);
	const material = new THREE.MeshBasicMaterial({ color: 0xF0A0F0 });
	objectToRotate = new THREE.Mesh(geometry, material);

	scene.add(objectToRotate);

	let initPosition = GUIObject.bindedObj['Object Properties']['Starting Position'];
	MoveObjectToPosition(objectToRotate, new THREE.Vector3(initPosition['X'], initPosition['Y'], initPosition['Z']));

}

function GetRotatedObjPosition() {
	let rotatedPos = objectToRotate.position.clone().applyQuaternion(rotation);
	return rotatedPos;
}

function GetAxisAngle(quat) {
	// https://www.euclideanspace.com/maths/geometry/rotations/conversions/quaternionToAngle/index.htm

	let angle = Math.acos(quat.w) * 2;
	let axis = new THREE.Vector3();
	if ((1 - (quat.w * quat.w) < 0.000001)) {
		axis.x = quat.x;
		axis.y = quat.y;
		axis.z = quat.z;
	} else {
		const s = Math.sqrt(1 - quat.w * quat.w);
		axis.x = quat.x / s;
		axis.y = quat.y / s;
		axis.z = quat.z / s;
	}

	return { axis, angle };
}

function AddRotatedObject(scene) {
	let geometry = new THREE.OctahedronGeometry(0.095, 0);
	const material = new THREE.MeshBasicMaterial({ color: 0x22DD55 });
	rotatedObject = new THREE.Mesh(geometry, material);

	scene.add(rotatedObject);
	MoveObjectToPosition(rotatedObject, GetRotatedObjPosition());
}

let initObject = Init();
let GUIObject = GUIInit();

let scene = initObject.scene;
let camera = initObject.camera;
let renderer = initObject.renderer;
let controls = initObject.controls;

document.body.appendChild(renderer.domElement);

// Add objects
Add3DOriginGizmo(scene);

let rotation = new THREE.Quaternion().identity();
let objectToRotate = {};
let rotatedObject = {};
let rotationPath = {};
let axisOfRotation = {};


AddObjectToRotate(scene);
AddRotatedObject(scene);

UpdateAll();

var Animate = function () {
	requestAnimationFrame(Animate);
	rotatedObject.geometry.rotateY(0.1);
	renderer.render(scene, camera);
};

Animate();
