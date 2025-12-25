declare module 'essentia.js' {
  export function EssentiaWASM(): Promise<any>;
  export class Essentia {
    constructor(wasmModule: any);
    arrayToVector(array: Float32Array): any;
    vectorToArray(vector: any): number[];
    RhythmExtractor2013(audioVector: any): {
      bpm: number;
      ticks: any;
      confidence: number;
    };
    KeyExtractor(audioVector: any, options?: { profileType?: string }): {
      key: string;
      scale: string;
      strength: number;
    };
    delete(vector: any): void;
  }
}
