import * as THREE from './threeJSLocal/build/three.module.js';
import { Line2 } from './threeJSLocal/examples/jsm/lines/Line2.js';
import { LineMaterial } from './threeJSLocal/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from './threeJSLocal/examples/jsm/lines/LineGeometry.js';

export class Better3DArrow extends THREE.Group {
    /**
     * 
     * @param {THREE.Vector3} startPoint 
     * @param {THREE.Vector3} endPoint 
     * @param {hex} colorHex
     * @param {size} - line size (width)
     */
    constructor(startPoint, endPoint, colorHex = 0x000000, size = 4) {
        super();

        let cone, line;
        // add make line
        {
            let positions = [startPoint.x, startPoint.y, startPoint.z, endPoint.x, endPoint.y, endPoint.z];
            let geometry = new LineGeometry();
            geometry.setPositions(positions);

            this.LineMaterial = new LineMaterial({
                color: colorHex,
                linewidth: size,
            });

            line = new Line2(geometry, this.LineMaterial);
            line.computeLineDistances();
            line.scale.set(1, 1, 1);
        }

        // make cone
        {
            let baseSize = 0.05 * (size / 4);
            let height = 0.25 * (size / 4);
            let geometry = new THREE.ConeGeometry(0.05, 0.25, 4);
            let material = new THREE.MeshBasicMaterial({ color: colorHex });
            cone = new THREE.Mesh(geometry, material);

            let rotDir = endPoint.clone().sub(startPoint).normalize();
            let rotationQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), rotDir);
            cone.translateX(endPoint.x);
            cone.translateY(endPoint.y);
            cone.translateZ(endPoint.z);
            cone.applyQuaternion(rotationQ);
        }


        this.add(line);
        this.add(cone);

        this.OnRendererSizeUpdate();

    }

    OnRendererSizeUpdate() {
        this.LineMaterial.resolution.set(window.innerWidth, window.innerHeight); // resolution of the viewport
    }
}