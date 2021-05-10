import * as THREE from './threeJSLocal/build/three.module.js';
import { Line2 } from './threeJSLocal/examples/jsm/lines/Line2.js';
import { LineMaterial } from './threeJSLocal/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from './threeJSLocal/examples/jsm/lines/LineGeometry.js';

export class QuatRotationArch extends THREE.Group {
    /**
     * 
     * @param {THREE.Vector3} startPoint 
     * @param {THREE.Quaternion} quat 
     * @param {hex} colorHex
     * @param {size} - line size (width)
     */
    constructor(startPoint, quat, showArrow = true, colorHex = 0x000000, size = 4) {
        super();

        this.__destructors = [];

        this.LineMaterial = new LineMaterial({
            color: colorHex,
            linewidth: size,
        });

        let matDestructor = () => { this.LineMaterial.dispose() }
        this.__destructors.push(matDestructor);

        let resolution = 360;

        // make arch
        {
            let startPos = startPoint.clone();
            let endPos;
            let t = 1 / resolution;

            for (var indx = 0; indx < resolution; indx++) {
                let q = new THREE.Quaternion().identity();
                q.slerp(quat, t);
                endPos = startPos.clone().applyQuaternion(q);
                let { line, destructor } = _MakeLine(startPos, endPos, this.LineMaterial);
                this.add(line);
                this.__destructors.push(destructor);
                startPos = endPos;
            }
        }

        // add middle cone
        if (showArrow) {
            let baseSize = 0.06 * (size / 4);
            let height = 0.15 * (size / 4);
            let geometry = new THREE.ConeGeometry(baseSize, height, 6);
            let material = new THREE.MeshBasicMaterial({ color: colorHex });
            let cone = new THREE.Mesh(geometry, material);

            let middleRotQ = new THREE.Quaternion().identity();
            middleRotQ.slerp(quat, 0.5);
            let middlePoint = startPoint.clone().applyQuaternion(middleRotQ);
            middleRotQ.slerp(quat, 1.0 / resolution);
            let nextPoint = startPoint.clone().applyQuaternion(middleRotQ);
            let coneDirection = nextPoint.sub(middlePoint).normalize();
            let coneRotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), coneDirection);

            cone.translateX(middlePoint.x);
            cone.translateY(middlePoint.y);
            cone.translateZ(middlePoint.z);
            cone.applyQuaternion(coneRotation);

            this.add(cone);
            const destructor = () => {
                geometry.dispose();
                material.dispose();
            };

            this.__destructors.push(destructor);
        }

        this.OnRendererSizeUpdate();

    }

    OnRendererSizeUpdate() {
        this.LineMaterial.resolution.set(window.innerWidth, window.innerHeight); // resolution of the viewport
    }

    Destroy() {
        for (let index = 0; index < this.__destructors.length; index++) {
            const element = this.__destructors[index];
            element();
        }
    }
}

function _MakeLine(startPosition, endPosition, material) {
    let positions = [startPosition.x, startPosition.y, startPosition.z, endPosition.x, endPosition.y, endPosition.z];
    let geometry = new LineGeometry();
    geometry.setPositions(positions);

    let line = new Line2(geometry, material);
    line.computeLineDistances();
    line.scale.set(1, 1, 1);

    let destructor = () => { geometry.dispose(); }

    return { line, destructor }
}