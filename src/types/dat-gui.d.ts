declare module 'dat.gui' {
  export class GUI {
    constructor();
    addColor(object: object, property: string): GUIController;
    add(object: object, property: string, ...params: any[]): GUIController;
    domElement: HTMLElement;
  }

  export class GUIController {
    onChange(callback: (value: any) => void): GUIController;
  }
}
