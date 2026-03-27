import * as THREE from 'three';

/**
 * DisposalHelper - Utilities to dispose Three.js objects properly
 * Avoid memory leaks by disposing geometry, material, texture
 */
export class DisposalHelper {
  /**
   * Dispose an Object3D and all its children
   */
  static disposeObject(obj: THREE.Object3D): void {
    // Dispose mesh
    if (obj instanceof THREE.Mesh) {
      this.disposeMesh(obj);
    }
    // Dispose line segments (edges)
    else if (obj instanceof THREE.LineSegments || obj instanceof THREE.Line) {
      this.disposeLine(obj);
    }

    // Recursively dispose children
    const children = [...obj.children]; // Clone array because it will be modified in the loop
    children.forEach(child => {
      this.disposeObject(child);
      obj.remove(child);
    });
  }

  /**
   * Dispose a Mesh
   */
  static disposeMesh(mesh: THREE.Mesh): void {
    if (mesh.geometry && !mesh.userData.sharedGeometry) {
      mesh.geometry.dispose();
    }

    if (mesh.material && !mesh.userData.sharedMaterial) {
      this.disposeMaterial(mesh.material);
    }
  }

  /**
   * Dispose Line/LineSegments
   */
  static disposeLine(line: THREE.LineSegments | THREE.Line): void {
    if (line.geometry && !line.userData.sharedGeometry) {
      line.geometry.dispose();
    }

    if (line.material && !line.userData.sharedMaterial) {
      this.disposeMaterial(line.material);
    }
  }

  /**
   * Dispose material (can be single or array)
   */
  static disposeMaterial(material: THREE.Material | THREE.Material[]): void {
    if (Array.isArray(material)) {
      material.forEach(mat => mat.dispose());
    } else {
      material.dispose();
    }
  }

  /**
   * Dispose a scene completely
   */
  static disposeScene(scene: THREE.Scene): void {
    const objects = [...scene.children];
    objects.forEach(obj => {
      this.disposeObject(obj);
      scene.remove(obj);
    });
  }

  /**
   * Dispose a group of objects
   */
  static disposeGroup(group: THREE.Group): void {
    const children = [...group.children];
    children.forEach(child => {
      this.disposeObject(child);
      group.remove(child);
    });
  }

  /**
   * Dispose edges from a group
   */
  static disposeEdgesFromGroup(group: THREE.Group): THREE.LineSegments[] {
    const edges: THREE.LineSegments[] = [];

    group.children.forEach(child => {
      if (child instanceof THREE.LineSegments) {
        edges.push(child);
        this.disposeLine(child);
      }
    });

    edges.forEach(edge => group.remove(edge));

    return edges;
  }
}
