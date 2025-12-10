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
} from 'three'
import { useEffect, useMemo, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';

import bgShader from "./blobs";
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

function posToVec({x, y}: {x: number, y: number}) {
  return `vec2(${(-x).toFixed(3)}, ${y.toFixed(3)})`
}

function dimToVec({x, y}: {x: number, y: number}) {
  return `vec2(${(x).toFixed(3)}, ${y.toFixed(3)})`
}

function Environment({lowPerf}: EnvironmentProps) {
  const {gl} = useThree();

  const time = useRef(0);
  const clock = useRef(new Clock());
  const scroll = useRef(0);
  const lerpedScroll = useRef(0);

  const frameNumber = useRef<number>(0);
  const bgCamera = useRef<OrthographicCamera>();
  const bgScene = useRef<Scene>();
  const bgMaterial = useRef<ShaderMaterial>();
  const currentDpr = useRef<number>(-1);
  const lastClientPosY = useRef<number>(0);
  const width = useRef<number>(window.innerWidth);
  const height = useRef<number>(window.innerHeight);

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
    window.addEventListener('mousemove', onMove, {passive: true});

    window.removeEventListener('scroll', onScroll);
    window.addEventListener('scroll', onScroll, {passive: true});

    const onResize = () => {
      const res = gl.getDrawingBufferSize(new Vector2());

      width.current = window.innerWidth;
      height.current = window.innerHeight;

      if (bgMaterial.current != null) {
        bgMaterial.current.uniforms.uResolution.value = res;
      }
    };

    window.removeEventListener('resize', onResize);
    window.addEventListener('resize', onResize, {passive: true});

    return () => {
      document.removeEventListener('mousemove', onMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    }
  }, [bgMaterial.current]);

  const settings = readPaneSettings([
    'bg_scene',
    'bg_pattern',
    'bg_pattern_intensity',
    'bg_pattern_scale',
    'bg_visible',

    'bg_blob1_color',
    'bg_blob1_pos',
    'bg_blob1_strength',
    'bg_blob1_dims',
    'bg_blob2_color',
    'bg_blob2_pos',
    'bg_blob2_strength',
    'bg_blob2_dims',
    'bg_blob3_color',
    'bg_blob3_pos',
    'bg_blob3_strength',
    'bg_blob3_dims',
    'bg_blob4_color',
    'bg_blob4_pos',
    'bg_blob4_strength',
    'bg_blob4_dims',
    'bg_blob_fade_after',
    'bg_blob_fade_coeff',
    'bg_blob_fade_max',
    'bg_vignette_strength',

    'fg_blob1_color',
    'fg_blob1_pos',
    'fg_blob1_strength',
    'fg_blob1_dims',
    'fg_blob2_color',
    'fg_blob2_pos',
    'fg_blob2_strength',
    'fg_blob2_dims',

    'bg_aces',
    "bg_contrast",
    "bg_brightness",
    "bg_film_grain",

    'ball_refract_bg',
    'ball_refract_caustics',
    'ball_light_color',
    'ball_light_dims',
    'ball_light_match_ar',
    'ball_mat_color',
    'ball_mat_light_mix',
    'ball_speed',
    'ball_speed_max_break_coeff',
    'ball_refraction_index',
    'ball_contrast_boost',
    'ball_brightness_boost',
    'ball_diffuseness',
    'ball_reflect_intensity',
    'ball_caustic_intensity',
    'ball_bg_intensity',
    'ball_bg_saturation',
    'scene_max_dpr',

    'debug_raymarch',
  ]);

  const uRad = new Float32Array([0.5, 0.28, 1, 0.21, 0.37]);

  function computePositions(uTime: number) {
    uTime *= settings.ball_speed / 500.;

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
      BG_VISIBLE: settings.bg_visible ? 'true' : 'false',
      BG_PATTERN: parseInt(settings.bg_pattern),
      BG_PATTERN_INTENSITY: settings.bg_pattern_intensity.toFixed(2),
      BG_PATTERN_SCALE: settings.bg_pattern_scale.toFixed(1),

      BALL_LIGHT_COLOR: colorToVec(settings.ball_light_color),
      BALL_LIGHT_DIMS: dimToVec(settings.ball_light_dims),
      BALL_MATERIAL_COLOR: colorToVec(settings.ball_mat_color),
      BALL_MAT_LIGHT_MIX: settings.ball_mat_light_mix.toFixed(3),
      BALL_REFRACTION_INDEX: settings.ball_refraction_index.toFixed(3),
      BALL_CONTRAST_BOOST: settings.ball_contrast_boost.toFixed(3),
      BALL_BRIGHTNESS_BOOST: settings.ball_brightness_boost.toFixed(3),
      BALL_DIFFUSENESS: settings.ball_diffuseness.toFixed(3),
      BALL_REFLECT_INTENSITY: settings.ball_reflect_intensity.toFixed(3),
      BALL_CAUSTIC_INTENSITY: settings.ball_caustic_intensity.toFixed(3),
      BALL_BG_INTENSITY: settings.ball_bg_intensity.toFixed(3),
      BALL_BG_SATURATION: settings.ball_bg_saturation.toFixed(3),

      BG_BLOB1_COLOR: colorToVec(settings.bg_blob1_color),
      BG_BLOB1_POS: posToVec(settings.bg_blob1_pos),
      BG_BLOB1_STRENGTH: settings.bg_blob1_strength.toFixed(2),
      BG_BLOB1_DIMS: dimToVec(settings.bg_blob1_dims),
      BG_BLOB2_COLOR: colorToVec(settings.bg_blob2_color),
      BG_BLOB2_POS: posToVec(settings.bg_blob2_pos),
      BG_BLOB2_STRENGTH: settings.bg_blob2_strength.toFixed(2),
      BG_BLOB2_DIMS: dimToVec(settings.bg_blob2_dims),
      BG_BLOB3_COLOR: colorToVec(settings.bg_blob3_color),
      BG_BLOB3_POS: posToVec(settings.bg_blob3_pos),
      BG_BLOB3_STRENGTH: settings.bg_blob3_strength.toFixed(2),
      BG_BLOB3_DIMS: dimToVec(settings.bg_blob3_dims),
      BG_BLOB4_COLOR: colorToVec(settings.bg_blob4_color),
      BG_BLOB4_POS: posToVec(settings.bg_blob4_pos),
      BG_BLOB4_STRENGTH: settings.bg_blob4_strength.toFixed(2),
      BG_BLOB4_DIMS: dimToVec(settings.bg_blob4_dims),

      FG_BLOB1_COLOR: colorToVec(settings.fg_blob1_color),
      FG_BLOB1_POS: posToVec(settings.fg_blob1_pos),
      FG_BLOB1_STRENGTH: settings.fg_blob1_strength.toFixed(2),
      FG_BLOB1_DIMS: dimToVec(settings.fg_blob1_dims),
      FG_BLOB2_COLOR: colorToVec(settings.fg_blob2_color),
      FG_BLOB2_POS: posToVec(settings.fg_blob2_pos),
      FG_BLOB2_STRENGTH: settings.fg_blob2_strength.toFixed(2),
      FG_BLOB2_DIMS: dimToVec(settings.fg_blob2_dims),

      BLOB_FADE_AFTER: settings.bg_blob_fade_after.toFixed(2),
      BLOB_FADE_COEFF: settings.bg_blob_fade_coeff.toFixed(2),
      BLOB_MAX_FADE: settings.bg_blob_fade_max.toFixed(2),
    };

    if (settings.bg_aces) {
      defines.USE_ACES = true;
    }

    if (settings.bg_vignette_strength) {
      defines.VIGNETTE = settings.bg_vignette_strength.toFixed(2);
    }

    if (settings.ball_refract_bg) {
      defines.BALL_REFRACT_BG = true;
    }

    if (settings.ball_refract_caustics) {
      defines.BALL_REFRACT_CAUSTICS = true;
    }

    if (settings.debug_raymarch) {
      defines.DEBUG = true;
    }

    if (settings.ball_light_match_ar) {
      defines.BALL_LIGHT_MATCH_AR = true;
    }

    if (lowPerf) {
      defines.LOW_PERF = true;
    }

    if (settings.bg_film_grain > 0) {
      defines.FILM_GRAIN_INTENSITY = settings.bg_film_grain.toFixed(2);
    }

    const uTime = 0;
    const [uPosX, uPosY] = computePositions(uTime);

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
  }, [
    lowPerf, ...Array.from(Object.values(settings)),
  ]);

  useFrame(({gl}) => {
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

    time.current += (
      clock.current.getDelta() /
      Math.min(
        settings.ball_speed_max_break_coeff,
        Math.pow((scrollOffset + 1), 2)
      )
    );
    const uTime = time.current;

    const [uPosX, uPosY] = computePositions(uTime);
    bgMaterial.current.uniforms.uPosX.value = uPosX;
    bgMaterial.current.uniforms.uPosY.value = uPosY;

    bgMaterial.current.uniforms.uScroll.value = scrollOffset;

    bgMaterial.current.uniforms.uTime.value = uTime;
    bgMaterial.current.uniforms.uOpacity.value = opacity;
    bgMaterial.current.uniforms.uFrame.value = frameNumber.current;
    bgMaterial.current.uniforms.uMouse.value = lerpedPosition.current;

    gl.render(bgScene.current, bgCamera.current);
  }, 1);

  return <>
    <group></group>
  </>
}

export default Environment;
