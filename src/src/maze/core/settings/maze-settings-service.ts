import type * as THREE from 'three';
import type { MeshFactory } from '../../../resources/mesh-factory';
import type { ResourceManager } from '../../../resources/resource-manager';
import {
  setAdaptiveQualityEnabledApi,
  setCameraZoomLimitEnabledApi,
  setCameraZoomMaxDistanceApi,
  setCameraZoomMinDistanceApi,
  setFloorGridEnabledApi,
  setHideEdgesDuringInteractionEnabledApi,
  setMeshMergeThresholdApi,
  setMeshReductionEnabledApi,
  toggleEdgesApi,
  updateFloorColorApi,
  updateFloorOpacityApi,
  updateWallColorApi,
  updateWallOpacityApi,
} from '../api/maze-settings-api';

type MazeSettingsApiContext = Parameters<typeof updateWallColorApi>[0];

interface MazeSettingsStateAccess {
  wallColor: THREE.Color;
  floorColor: THREE.Color;
  meshFactory: MeshFactory;
  resourceManager: ResourceManager;
  getMaze: () => number[][][];
  getWallOpacity: () => number;
  setWallOpacity: (value: number) => void;
  getFloorOpacity: () => number;
  setFloorOpacity: (value: number) => void;
  getShowEdges: () => boolean;
  setShowEdges: (value: boolean) => void;
  getShowFloorGrid: () => boolean;
  setShowFloorGrid: (value: boolean) => void;
  getMeshReductionEnabled: () => boolean;
  setMeshReductionEnabled: (value: boolean) => void;
  getMeshMergeThreshold: () => number;
  setMeshMergeThreshold: (value: number) => void;
  getHideEdgesDuringInteractionEnabled: () => boolean;
  setHideEdgesDuringInteractionEnabled: (value: boolean) => void;
  getEdgesTemporarilyHidden: () => boolean;
  setEdgesTemporarilyHidden: (value: boolean) => void;
  getCurrentInteractionMode: () => boolean;
  hasEdgeObjects: () => boolean;
  getAdaptiveQualityEnabled: () => boolean;
  setAdaptiveQualityEnabled: (value: boolean) => void;
  getCameraZoomLimitEnabled: () => boolean;
  setCameraZoomLimitEnabled: (value: boolean) => void;
  getCameraZoomMinDistance: () => number;
  setCameraZoomMinDistance: (value: number) => void;
  getCameraZoomMaxDistance: () => number;
  setCameraZoomMaxDistance: (value: number) => void;
  updateMeshFactorySettings: (settings: { showEdges?: boolean; showFloorGrid?: boolean }) => void;
  rebuildEdges: () => void;
  setEdgeVisibility: (visible: boolean) => void;
  rebuildMazePreservingCamera: () => void;
  resetAdaptiveQualityMetrics: () => void;
  applyRendererSizeForCurrentMode: () => void;
  configureCameraZoomLimits: () => void;
  updateControls: () => void;
  requestRender: () => void;
}

export class MazeSettingsService {
  constructor(private readonly state: MazeSettingsStateAccess) {}

  public updateWallColor(color: string): void {
    updateWallColorApi(this.createContext(), color);
  }

  public updateFloorColor(color: string): void {
    updateFloorColorApi(this.createContext(), color);
  }

  public updateWallOpacity(opacity: number): void {
    updateWallOpacityApi(this.createContext(), opacity);
  }

  public updateFloorOpacity(opacity: number): void {
    updateFloorOpacityApi(this.createContext(), opacity);
  }

  public toggleEdges(showEdges: boolean): void {
    toggleEdgesApi(this.createContext(), showEdges);
  }

  public setFloorGridEnabled(enabled: boolean): void {
    setFloorGridEnabledApi(this.createContext(), enabled);
  }

  public setMeshReductionEnabled(enabled: boolean): void {
    setMeshReductionEnabledApi(this.createContext(), enabled);
  }

  public setMeshMergeThreshold(threshold: number): void {
    setMeshMergeThresholdApi(this.createContext(), threshold);
  }

  public setHideEdgesDuringInteractionEnabled(enabled: boolean): void {
    setHideEdgesDuringInteractionEnabledApi(this.createContext(), enabled);
  }

  public setAdaptiveQualityEnabled(enabled: boolean): void {
    setAdaptiveQualityEnabledApi(this.createContext(), enabled);
  }

  public setCameraZoomLimitEnabled(enabled: boolean): void {
    setCameraZoomLimitEnabledApi(this.createContext(), enabled);
  }

  public setCameraZoomMinDistance(distance: number): void {
    setCameraZoomMinDistanceApi(this.createContext(), distance);
  }

  public setCameraZoomMaxDistance(distance: number): void {
    setCameraZoomMaxDistanceApi(this.createContext(), distance);
  }

  private createContext(): MazeSettingsApiContext {
    return {
      wallColor: this.state.wallColor,
      floorColor: this.state.floorColor,
      meshFactory: this.state.meshFactory,
      resourceManager: this.state.resourceManager,
      maze: this.state.getMaze(),
      getWallOpacity: this.state.getWallOpacity,
      setWallOpacity: this.state.setWallOpacity,
      getFloorOpacity: this.state.getFloorOpacity,
      setFloorOpacity: this.state.setFloorOpacity,
      getShowEdges: this.state.getShowEdges,
      setShowEdges: this.state.setShowEdges,
      getShowFloorGrid: this.state.getShowFloorGrid,
      setShowFloorGrid: this.state.setShowFloorGrid,
      getMeshReductionEnabled: this.state.getMeshReductionEnabled,
      setMeshReductionEnabled: this.state.setMeshReductionEnabled,
      getMeshMergeThreshold: this.state.getMeshMergeThreshold,
      setMeshMergeThreshold: this.state.setMeshMergeThreshold,
      getHideEdgesDuringInteractionEnabled: this.state.getHideEdgesDuringInteractionEnabled,
      setHideEdgesDuringInteractionEnabled: this.state.setHideEdgesDuringInteractionEnabled,
      getEdgesTemporarilyHidden: this.state.getEdgesTemporarilyHidden,
      setEdgesTemporarilyHidden: this.state.setEdgesTemporarilyHidden,
      getCurrentInteractionMode: this.state.getCurrentInteractionMode,
      hasEdgeObjects: this.state.hasEdgeObjects,
      getAdaptiveQualityEnabled: this.state.getAdaptiveQualityEnabled,
      setAdaptiveQualityEnabled: this.state.setAdaptiveQualityEnabled,
      getCameraZoomLimitEnabled: this.state.getCameraZoomLimitEnabled,
      setCameraZoomLimitEnabled: this.state.setCameraZoomLimitEnabled,
      getCameraZoomMinDistance: this.state.getCameraZoomMinDistance,
      setCameraZoomMinDistance: this.state.setCameraZoomMinDistance,
      getCameraZoomMaxDistance: this.state.getCameraZoomMaxDistance,
      setCameraZoomMaxDistance: this.state.setCameraZoomMaxDistance,
      updateMeshFactorySettings: this.state.updateMeshFactorySettings,
      rebuildEdges: this.state.rebuildEdges,
      setEdgeVisibility: this.state.setEdgeVisibility,
      rebuildMazePreservingCamera: this.state.rebuildMazePreservingCamera,
      resetAdaptiveQualityMetrics: this.state.resetAdaptiveQualityMetrics,
      applyRendererSizeForCurrentMode: this.state.applyRendererSizeForCurrentMode,
      configureCameraZoomLimits: this.state.configureCameraZoomLimits,
      updateControls: this.state.updateControls,
      requestRender: this.state.requestRender,
    };
  }
}
