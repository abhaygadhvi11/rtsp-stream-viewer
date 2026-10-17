declare module '@cycjimmy/jsmpeg-player' {
  export interface JSMpegPlayerOptions {
    canvas: HTMLCanvasElement;
    autoplay?: boolean;
    audio?: boolean;
    loop?: boolean;
    disableGl?: boolean;
    disableWebAssembly?: boolean;
    preserveDrawingBuffer?: boolean;
    progressive?: boolean;
    throttled?: boolean;
    chunkSize?: number;
    videoBufferSize?: number;
    audioBufferSize?: number;
    pauseWhenHidden?: boolean;
    onVideoDecode?: (decoder: any, time: number) => void;
    onAudioDecode?: (decoder: any, time: number) => void;
    onSourceEstablished?: (source: any) => void;
    onSourceCompleted?: (source: any) => void;
  }

  export class Player {
    constructor(url: string, options: JSMpegPlayerOptions);
    play(): void;
    pause(): void;
    stop(): void;
    destroy(): void;
    volume: number;
    currentTime: number;
    paused: boolean;
  }

  const JSMpeg: {
    Player: typeof Player;
    VideoElement: any;
  };

  export default JSMpeg;
}
