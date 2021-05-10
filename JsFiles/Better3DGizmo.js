import * as THREE from './threeJSLocal/build/three.module.js';
import { Line2 } from './threeJSLocal/examples/jsm/lines/Line2.js';
import { LineMaterial } from './threeJSLocal/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from './threeJSLocal/examples/jsm/lines/LineGeometry.js';

export class Better3DGizmo extends THREE.Group {
    constructor(gridSize = 0, vecSize = 1) {
        super();

        let { line: xLine, material: xMaterial, destructor: desX } = MakeLineFromOrigin({ x: vecSize, y: 0, z: 0 }, 0xff0000);
        let { line: yLine, material: yMaterial, destructor: desY } = MakeLineFromOrigin({ x: 0, y: vecSize, z: 0 }, 0x00ff00);
        let { line: zLine, material: zMaterial, destructor: desZ } = MakeLineFromOrigin({ x: 0, y: 0, z: vecSize }, 0x0000ff);

        let { sphere: sphere, destructor: desSphere } = MakeSphereAtOrigin();
        let grid = MakeGrid(gridSize);

        this.add(xLine);
        this.add(yLine);
        this.add(zLine);
        this.add(sphere);
        this.add(grid);

        this.__destructors = [];
        this.__destructors.push(desX);
        this.__destructors.push(desY);
        this.__destructors.push(desZ);
        this.__destructors.push(desSphere);

        this.LineMaterials = [];
        this.LineMaterials.push(xMaterial);
        this.LineMaterials.push(yMaterial);
        this.LineMaterials.push(zMaterial);

        this.OnRendererSizeUpdate();

    }

    OnRendererSizeUpdate() {

        for (let index = 0; index < this.LineMaterials.length; index++) {
            this.LineMaterials[index].resolution.set(window.innerWidth, window.innerHeight); // resolution of the viewport
        }

    }

    Destroy() {
        for (let index = 0; index < this.__destructors.length; index++) {
            const element = this.__destructors[index];
            element();
        }
    }
}


function MakeLineFromOrigin(dirObj, colorHex) {
    let positions = [0, 0, 0, dirObj.x, dirObj.y, dirObj.z];

    const geometry = new LineGeometry();
    geometry.setPositions(positions);

    let matLine = new LineMaterial({

        color: colorHex,
        linewidth: 6, // in pixels
        vertexColors: false,
        dashed: false,
        alphaToCoverage: true,

    });

    let line = new Line2(geometry, matLine);
    line.computeLineDistances();
    line.scale.set(1, 1, 1);

    let destructor = () => {
        geometry.dispose();
        matLine.dispose();
    }

    return { line: line, material: matLine, destructor: destructor };
}


function MakeSphereAtOrigin() {
    const geometry = new THREE.SphereGeometry(.04, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sphere = new THREE.Mesh(geometry, material);

    let destructor = () => {
        geometry.dispose();
        material.dispose();
    }

    return { sphere, destructor };
}

function MakeGrid(size) {
    size = size * 2;
    const divisions = 2 * size;
    const gridHelper = new THREE.GridHelper(size, divisions, 0xbbbbbb, 0xbbbbbb);

    return gridHelper;
}