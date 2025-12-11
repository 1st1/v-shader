import {
  BufferGeometry,
  Float32BufferAttribute,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  NoBlending,
  Mesh,
  LinearToneMapping,
  Color,
  GLSL3,
  MathUtils,
  Clock,
  DataTexture,
  RGBAFormat,
  LinearFilter,
  WebGLRenderTarget,
} from 'three'
import { useEffect, useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';

import bgShader from "./blobs";
import shiftShader from "./shift";
import { readPaneSettings } from '../settings';

import { createNoise2D } from 'simplex-noise';
const noise2D = createNoise2D();

const vertexShader = `precision highp float;
void main() {
  gl_Position = vec4(position, 1.0);
}`;

function generateNoiseTexture(width: number, height: number): DataTexture {
  const size = width * height;
  const data = new Uint8Array(4 * size);
  const noise = createNoise2D();
  const frequency = 10000.0;

  let i = 0
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const nx = x / width;
      const ny = y / height;
      const n = (noise(nx * frequency, ny * frequency) + 1) / 2;
      const v = Math.floor(n * 150) + 100;
      data[i++] = v;    // Red
      data[i++] = v;    // Green
      data[i++] = v;    // Blue
      data[i++] = 255;  // Alpha
    }
  }

  const texture = new DataTexture(data, width, height, RGBAFormat)
  texture.needsUpdate = true;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

const getFullscreenTriangle = () => {
  const geometry = new BufferGeometry();

  geometry.setAttribute(
    'position',
    new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3)
  );

  geometry.setAttribute(
    'uv',
    new Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2)
  );

  return geometry;
};

type EnvironmentProps = {
  lowPerf: boolean
}

function colorToVec(hex: string) {
  const col = new Color(hex);
  const rgb = col.convertLinearToSRGB().toArray();
  return `vec3(${rgb[0].toFixed(3)}, ${rgb[1].toFixed(3)}, ${rgb[2].toFixed(3)})`;
}

function posToVec({ x, y }: { x: number, y: number }) {
  return `vec2(${(-x).toFixed(3)}, ${y.toFixed(3)})`
}

function dimToVec({ x, y }: { x: number, y: number }) {
  return `vec2(${(x).toFixed(3)}, ${y.toFixed(3)})`
}

function Environment({ lowPerf }: EnvironmentProps) {
  const { gl } = useThree();

  const time = useRef(0);
  const clock = useRef(new Clock());
  const scroll = useRef(0);
  const lerpedScroll = useRef(0);

  const frameNumber = useRef<number>(0);
  const bgCamera = useRef<OrthographicCamera>();
  const bgScene = useRef<Scene>();
  const bgTargetScene = useRef<Scene>();
  const bgMaterial = useRef<ShaderMaterial>();
  const bgTargetMaterial = useRef<ShaderMaterial>();
  const currentDpr = useRef<number>(-1);
  const lastClientPosY = useRef<number>(0);
  const width = useRef<number>(window.innerWidth);
  const height = useRef<number>(window.innerHeight);

  const target = useRef<WebGLRenderTarget>();

  const posX = useRef<number>(0);
  const posY = useRef<number>(0);
  const lerpedPosition = useRef(new Vector2());

  const noiseWidth = 256;
  const noiseTexture = useMemo(
    () => generateNoiseTexture(noiseWidth, noiseWidth), []
  );

  const calcScroll = () =>
    document.documentElement.scrollTop / height.current;

  useEffect(() => {
    const onScroll = () => {
      if (bgMaterial.current != null) {
        const scrollOffset = calcScroll();
        scroll.current = scrollOffset;
        posY.current = scrollOffset + lastClientPosY.current - 0.5;
      }
    };

    const onMove = (e: any) => {
      posX.current = e.pageX / width.current - 0.5;
      posY.current = e.pageY / height.current - 0.5;
      lastClientPosY.current = e.clientY / height.current;
    };

    window.removeEventListener('mousemove', onMove);
    window.addEventListener('mousemove', onMove, { passive: true });

    window.removeEventListener('scroll', onScroll);
    window.addEventListener('scroll', onScroll, { passive: true });

    const onResize = () => {
      const res = gl.getDrawingBufferSize(new Vector2());

      width.current = window.innerWidth;
      height.current = window.innerHeight;

      if (bgMaterial.current != null) {
        bgMaterial.current.uniforms.uResolution.value = res;
      }
      if (bgTargetMaterial.current != null) {
        bgTargetMaterial.current.uniforms.uResolution.value = res;
      }
      if (target.current != null) {
        target.current.setSize(res.x, res.y);
      }
    };

    window.removeEventListener('resize', onResize);
    window.addEventListener('resize', onResize, { passive: true });

    return () => {
      document.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    }
  }, [bgMaterial.current]);

  const settings = readPaneSettings([
    'bg_scene',

    'bg_aces',
    "bg_contrast",
    "bg_brightness",
    "bg_film_grain",
  ]);

  const uRad = new Float32Array([0.5, 0.28, 1, 0.21, 0.37]);

  function computePositions(uTime: number) {
    uTime *= 2. / 500.;

    const uPosX = new Float32Array(5);
    const uPosY = new Float32Array(5);

    const seedOffsets = [112.0, 20.0, 117.5, 33.0, 15.0];
    const baseOffsetsX = [-1.2, 0.0, -0.6, 1.3, 0.4];
    const baseOffsetsY = [0.01, -0.1, 0.3, -0.3, 0.0];
    const amplitudeX = [2.3, 2.5, 1.9, 1.3, 1.0];
    const amplitudeY = [1.0, 2.8, 1.9, 1.3, 1.0];

    for (let i = 0; i < 5; i++) {
      const noiseX = noise2D(uTime + seedOffsets[i], i * 10);
      const noiseY = noise2D(uTime + seedOffsets[i] + 100, i * 10 + 100);
      uPosX[i] = baseOffsetsX[i] + noiseX * amplitudeX[i];
      uPosY[i] = baseOffsetsY[i] + noiseY * amplitudeY[i];
    }

    return [uPosX, uPosY];
  }

  useMemo(() => {
    gl.outputColorSpace = SRGBColorSpace;
    gl.toneMapping = LinearToneMapping;

    bgCamera.current = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const resolution = gl.getDrawingBufferSize(new Vector2());

    const _bgScene = new Scene();
    bgScene.current = _bgScene;

    const defines: any = {
      NOISE_WIDTH: noiseWidth,

      NUM_RANDOM: uRad.length,
      COLOR_SCENE: colorToVec(settings.bg_scene),
      SCENE_CONTRAST: settings.bg_contrast.toFixed(3),
      SCENE_BRIGHTNESS: settings.bg_brightness.toFixed(3),
    };

    if (settings.bg_aces) {
      defines.USE_ACES = true;
    }

    if (lowPerf) {
      defines.LOW_PERF = true;
    }

    if (settings.bg_film_grain > 0) {
      defines.FILM_GRAIN_INTENSITY = settings.bg_film_grain.toFixed(2);
    }

    const uTime = 0;
    const [uPosX, uPosY] = computePositions(uTime);

    const _target = new WebGLRenderTarget(
      resolution.x,
      resolution.y,
      {
        format: RGBAFormat,
        stencilBuffer: false,
        depthBuffer: false,
        // samples: (lowPerf || MAX_SHADERS <= 512) ? 0 : 0,
      }
    );
    _target.texture.colorSpace = SRGBColorSpace;
    _target.texture.generateMipmaps = false;
    target.current = _target;

    const _bgTargetMaterial = new ShaderMaterial({
      glslVersion: GLSL3,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
      defines,
      fragmentShader: shiftShader(),
      vertexShader,
      uniforms: {
        uRedOffset: { value: 0.0 },
        uGreenOffset: { value: 0.0 },
        uBlueOffset: { value: 0.0 },

        uDistortion: { value: 0.5 },
        uSpeed: { value: 0.5 },

        uBlueNoise: { value: noiseTexture },
        uTime: { value: uTime },
        uMouse: { value: new Vector2(0, 0) },
        uScroll: { value: calcScroll() },
        uScene: { value: target.current },
        uResolution: { value: resolution },
        uRad: { value: uRad },
        uPosX: { value: uPosX },
        uPosY: { value: uPosY },
        uOpacity: { value: 0 },
        uFrame: { value: 0 },
      },
    });
    bgTargetMaterial.current = _bgTargetMaterial;

    const _bgMaterial = new ShaderMaterial({
      glslVersion: GLSL3,
      transparent: false,
      depthTest: false,
      depthWrite: false,
      blending: NoBlending,
      defines,
      fragmentShader: bgShader(),
      vertexShader,
      uniforms: {
        uBlueNoise: { value: noiseTexture },
        uTime: { value: uTime },
        uMouse: { value: new Vector2(0, 0) },
        uScroll: { value: calcScroll() },
        uResolution: { value: resolution },
        uRad: { value: uRad },
        uPosX: { value: uPosX },
        uPosY: { value: uPosY },
        uOpacity: { value: 0 },
        uFrame: { value: 0 },
      },
    });
    bgMaterial.current = _bgMaterial;

    const bgTriangle = new Mesh(getFullscreenTriangle(), _bgMaterial);
    bgTriangle.frustumCulled = false;
    _bgScene.add(bgTriangle);

    const _bgTargetScene = new Scene();
    bgTargetScene.current = _bgTargetScene;

    const bgTargetTriangle = new Mesh(getFullscreenTriangle(), _bgTargetMaterial);
    bgTargetTriangle.frustumCulled = false;
    _bgTargetScene.add(bgTargetTriangle);
  }, [
    lowPerf, ...Array.from(Object.values(settings)),
  ]);

  const mclock = clock;

  useFrame(({ gl, clock }) => {
    if (!bgMaterial.current ||
      !bgCamera.current || !bgScene.current
    ) {
      return;
    }

    const dpr = gl.getPixelRatio();
    if (currentDpr.current != dpr) {
      const res = gl.getDrawingBufferSize(new Vector2());
      bgMaterial.current.uniforms.uResolution.value = res;
      currentDpr.current = dpr;
    }

    frameNumber.current += 1;
    if (frameNumber.current > 100000000) {
      frameNumber.current = 10;
    }
    const opacity = Math.min(frameNumber.current / 10.0, 1);

    lerpedScroll.current = MathUtils.lerp(
      lerpedScroll.current, scroll.current, 0.1
    );
    lerpedPosition.current.lerp(new Vector2(posX.current, posY.current), 0.1);
    const scrollOffset = lerpedScroll.current;

    time.current += mclock.current.getDelta() / 100.;
    const uTime = time.current;

    const [uPosX, uPosY] = computePositions(uTime);
    bgMaterial.current.uniforms.uPosX.value = uPosX;
    bgMaterial.current.uniforms.uPosY.value = uPosY;

    bgMaterial.current.uniforms.uScroll.value = scrollOffset;

    bgMaterial.current.uniforms.uTime.value = uTime;
    bgMaterial.current.uniforms.uOpacity.value = opacity;
    bgMaterial.current.uniforms.uFrame.value = frameNumber.current;
    bgMaterial.current.uniforms.uMouse.value = lerpedPosition.current;

    gl.setRenderTarget(target.current);
    gl.render(bgScene.current, bgCamera.current);

    bgTargetMaterial.current.uniforms.uScene.value = target.current.texture;
    bgTargetMaterial.current.uniforms.uTime.value = clock.getElapsedTime();
    bgTargetMaterial.current.uniforms.uScroll.value = calcScroll();
    bgTargetMaterial.current.uniforms.uOpacity.value = opacity;

    gl.setRenderTarget(null);
    gl.render(bgTargetScene.current, bgCamera.current);
  }, 1);

  return <>
    <group></group>
  </>
}

export default Environment;
