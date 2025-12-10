const bgShader = () => /*glsl*/`precision highp float;

#define BG_BLOBS
#define IGNORE_THRESHOLD 0.018

#define BG_DIST 1.8

#ifdef DEBUG
  #define DEBUG_MULT 0.002

  struct DebugContext {
    int sminCalls;
  };

  DebugContext debugContext = DebugContext(0);

  #define INC_SMIN_CALLS() debugContext.sminCalls++;
#else
  #define INC_SMIN_CALLS()
#endif


uniform float uPosX[NUM_RANDOM];
uniform float uPosY[NUM_RANDOM];
uniform float uRad[NUM_RANDOM];

uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uTime;
uniform float uScroll;
uniform float uOpacity;
uniform int uFrame;
uniform sampler2D uBlueNoise;

out vec4 outColor;

vec3 contrastAndBrightness(vec3 v, float c, float b) {
  return clamp((v - 0.5 ) * c + 0.5 + b, 0., 1.);
}

float sdLens(vec3 p, float s) {
  vec3 r = vec3(s, s, s/2.);
  float k1 = length(p/r);
  return (k1 - 1.0) * min(min(r.x, r.y), r.z);
}

float sdLightBox(in vec2 p) {
  vec2 b = BALL_LIGHT_DIMS;
  #ifdef BALL_LIGHT_MATCH_AR
    float ar = uResolution.y / uResolution.x;
    b = vec2(b.x, b.x * ar);
  #endif

  vec2 d = abs(p)-b;
  return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

float smin(float a, float b) {
  INC_SMIN_CALLS();
  const float k = 0.5;
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * h * k * (1.0 / 6.0);
}

float map(vec3 p) {
  float sp =    sdLens(p - vec3(uPosX[0], uPosY[0], 0.0), uRad[0]);
  sp = smin(sp, sdLens(p - vec3(uPosX[1], uPosY[1], 0.0), uRad[1]));
  sp = smin(sp, sdLens(p - vec3(uPosX[2], uPosY[2], 0.0), uRad[2]));
  sp = smin(sp, sdLens(p - vec3(uPosX[3], uPosY[3], 0.0), uRad[3]));
  sp = smin(sp, sdLens(p - vec3(uPosX[4], uPosY[4], 0.0), uRad[4]));
  return sp;
}

vec3 getNormal(vec3 p) {
	float d = map(p);
  vec2 e = vec2(.0001, 0);

  vec3 n = d - vec3(
    map(p-e.xyy),
    map(p-e.yxy),
    map(p-e.yyx)
  );

  return normalize(n);
}

float traceRefl(vec3 ro, vec3 rd, float t0) {
  float t = abs(map(ro));
  float dt;

  while (t > 0.001 && t < t0) {
    vec3 p = ro + rd * t;
    dt = abs(map(p));
    if (dt < 0.001) {
      break;
    } else {
      t += dt;
    }
  }

  return min(t, t0);
}

vec3 phong(vec3 ambient, vec3 ro, vec3 lp, vec3 sp, vec3 sn, vec3 rd, float t) {
  float tlp = (lp.z - sp.z) / sn.z;
  vec3 ilp = sp + tlp * sn;
  float lightPower = (
    BALL_REFLECT_INTENSITY /
      sqrt(max(sdLightBox(ilp.xy - lp.xy), 0.01))
  );

  vec3 lightVector = normalize(lp);
  vec3 halfVector = normalize(ro + lightVector);

  float NdotL = dot(sn, lightVector);
  float NdotH = dot(sn, halfVector);
  float NdotH2 = NdotH * NdotH;

  float kDiffuse = max(0.0, NdotL);

  vec3 col = (
    ambient +
    vec3(kDiffuse * BALL_DIFFUSENESS) * BALL_LIGHT_COLOR +
    pow(lightPower, NdotH2) * BALL_LIGHT_COLOR / 10.
  );

  col = mix(col, BALL_MATERIAL_COLOR, BALL_MAT_LIGHT_MIX);

  col = clamp(col, 0., 1.);

  return contrastAndBrightness(col, BALL_CONTRAST_BOOST, BALL_BRIGHTNESS_BOOST);
}

float drawBlob(vec2 uv, vec2 dims) {
  float r = 0.;
  r = 0.07 / length(uv / dims);
  r = smoothstep(0.01, 0.6, r);

  r /= 1. + clamp(
    (uScroll - BLOB_FADE_AFTER) * BLOB_FADE_COEFF,
    0.,
    BLOB_MAX_FADE
  );

  return r;
}

vec3 drawBlobs(vec2 uv) {
  vec3 color = vec3(0.);

  if (BG_BLOB1_STRENGTH > 0.) {
    color += (
      BG_BLOB1_COLOR *
      drawBlob(uv + BG_BLOB1_POS, BG_BLOB1_DIMS) *
      BG_BLOB1_STRENGTH
    );
  }

  if (BG_BLOB2_STRENGTH > 0.) {
    color += (
      BG_BLOB2_COLOR *
      drawBlob(uv + BG_BLOB2_POS, BG_BLOB2_DIMS) *
      BG_BLOB2_STRENGTH
    );
  }

  if (BG_BLOB3_STRENGTH > 0.) {
    color += (
      BG_BLOB3_COLOR *
      drawBlob(uv + BG_BLOB3_POS, BG_BLOB3_DIMS) *
      BG_BLOB3_STRENGTH
    );
  }

  if (BG_BLOB4_STRENGTH > 0.) {
    color += (
      BG_BLOB4_COLOR *
      drawBlob(uv + BG_BLOB4_POS, BG_BLOB4_DIMS) *
      BG_BLOB4_STRENGTH
    );
  }

  return clamp(color, 0., 1.);
}

float sdfCheckers(vec2 uv) {
  float t = max((uv.x - uv.y), (uv.x + uv.y));
  float d = t * sign(uv.x) * t * sign(uv.y);
  return d > 0. ? 0. : 1.;
}

vec4 drawBg(vec2 uv, vec3 lp, bool pattern) {
  float c = 1.;
  if (pattern) {
    #if BG_PATTERN == 1
      vec2 mUv = fract(uv * BG_PATTERN_SCALE) - vec2(0.5);
      c = 1. - clamp(smoothstep(0.29, 0.3, length(mUv)), 0., 1.) *
        BG_PATTERN_INTENSITY;
    #endif

    #if BG_PATTERN == 2
      vec2 mUv = fract(uv * BG_PATTERN_SCALE) - vec2(0.5);
      c = 1. -clamp(max(step(mUv.x * mUv.y, 0.), 0.1), 0., 1.) *
        BG_PATTERN_INTENSITY;
    #endif
  }

  vec3 col = clamp(COLOR_SCENE * c, 0., 1.);

#ifndef BG_BLOBS
  return vec4(col, 1.);
#else
  return vec4(mix(col, drawBlobs(uv / 2.) * 2., 0.4), 1.);
#endif
}

float bgCausticIntensity(vec3 bgSp, vec3 lp, float slide, bool adjBg) {
  if (adjBg) {
    float tInt = -bgSp.z / (lp.z - bgSp.z);
    vec3 intPos = bgSp + tInt * (lp - bgSp);
    float d0 = map(intPos);
    if (d0 > IGNORE_THRESHOLD) {
      return 0.0004 / d0;
    }
  }

  vec3 rdb = normalize(lp - bgSp);
  float t = traceRefl(bgSp, rdb, 10.);
  if (t < 10.) {
    vec3 sp = bgSp + rdb * t;
    vec3 sn = getNormal(sp);
    vec3 rr = refract(rdb, sn, BALL_REFRACTION_INDEX + slide);
    vec3 roInside = sp + rr * 0.0001;
    float t = traceRefl(roInside, rr, 1.);
    if (t < 1.) {
      vec3 sp2 = roInside + rr * t;
      vec3 sn2 = -getNormal(sp2);
      vec3 rr2 = refract(rr, sn2, BALL_REFRACTION_INDEX + slide);

      vec3 sp3 = sp2 + rr2 * ((lp.z - sp2.z) / rr2.z);

      float d = BALL_CAUSTIC_INTENSITY /
        max(sdLightBox(sp3.xy-lp.xy), 0.05);

      d /= distance(bgSp, lp);

      return d;
    }
  }

  return 0.;
}

vec3 sat(vec3 rgb, float intensity) {
  vec3 L = vec3(0.2125, 0.7154, 0.0721);
  vec3 grayscale = vec3(dot(rgb, L)) / 4.;
  return mix(grayscale, rgb, intensity);
}

vec3 intersectBGPlane(vec3 ro, vec3 rd) {
    float t = (float(BG_DIST) - ro.z) / rd.z;
    return ro + rd * t;
}

vec4 calcRefractionLens(vec3 sp, vec3 sn, vec3 rd, vec3 lp, float slide) {
  vec4 bg = vec4(0);
  vec3 rr = refract(rd, sn, BALL_REFRACTION_INDEX + slide);
  vec3 roInside = sp + rr * 0.0001;
  float t = traceRefl(roInside, rr, 0.1);
  if (t < 0.1) {
    vec3 sp2 = roInside + rr * t;
    vec3 sn2 = -getNormal(sp2);
    vec3 rr2 = refract(rr, sn2, BALL_REFRACTION_INDEX + slide);
    vec3 bgPos = intersectBGPlane(sp2, rr2);

    #ifdef BALL_REFRACT_BG
      bg += drawBg(bgPos.xy, lp, true);
    #else
      bg += vec4(COLOR_SCENE, 1.);
    #endif

    #ifndef LOW_PERF
    #ifdef BALL_REFRACT_CAUSTICS
      float i = bgCausticIntensity(bgPos, lp, slide, false);
      bg += clamp(vec4(BALL_LIGHT_COLOR * i, 0), 0., 1.);
    #endif
    #endif
  }

  return bg;
}

vec3 phongRefl(vec2 uv, vec3 ro, vec3 lp, vec3 sp, vec3 rd, float t) {
  vec3 sn = getNormal(sp);

  vec3 bgCol = vec3(calcRefractionLens(sp, sn, rd, lp, 0.).rgb);

  if (BALL_BG_INTENSITY != 1.) {
    bgCol *= BALL_BG_INTENSITY;
  }
  if (BALL_BG_SATURATION != 1.) {
    bgCol = sat(bgCol, BALL_BG_SATURATION);
  }

  vec3 col = phong(bgCol, ro, lp, sp, sn, rd, t);

  col = clamp(col, 0., 1.);

  return col;
}

vec4 drawGel(vec2 uv) {
  vec3 ro = vec3(0.0,.0,-5.);
  vec3 rd = normalize(vec3(uv, 1.));
  vec3 p;

  vec3 lp = ro + vec3(0, 0., 0.) + vec3(uMouse * vec2(2, 2), 0);

  lp += vec3(0, 0, uScroll);

  float t0 = -ro.z / rd.z;
  vec3 col = vec3(0.);

  float d0 = map(ro + t0 * rd);
  float t = 0.;

  if (d0 < IGNORE_THRESHOLD) {

    t = map(ro);
    float dt = 0.;

    while (t > 0.001 && t < t0) {
      p = ro + rd * t;
      float m = map(p);
      dt = m;
      if (dt < 0.001) {
        break;
      } else {
        t += dt;
      }
    }

  } else {
    t = t0;
  }

  if (t >= t0) {
    // we hit the background
    #ifdef DEBUG
      return vec4(DEBUG_MULT * float(debugContext.sminCalls), 0., 0., 1.);
    #endif

    float tPlane = (float(BG_DIST) - ro.z) / rd.z;
    vec4 color = vec4(0.0);
    vec3 pos = ro + tPlane * rd;
    color = drawBg(pos.xy, lp, BG_VISIBLE);
    return color;
  } else {
    // we hit a sphere
    col = phongRefl(uv, ro, lp, p, rd, t);

    #ifdef DEBUG
      // avoid the compiler optimizing out the "col" calculation
      return mix(
        vec4(col, 1.),
        vec4(DEBUG_MULT * float(debugContext.sminCalls), 0., 0., 1.),
        0.99
      );
    #endif

    return vec4(col, 1.);
  }
}

vec3 applyACES(vec3 x) {
  float a = 2.41;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return (x * (a * x + b)) / (x * (c * x + d) + e);
}

float pseudoGaussianNoise(vec2 p)
{
  ivec2 ip = (ivec2(1337 * uFrame) + ivec2(p)) % ivec2(NOISE_WIDTH, NOISE_WIDTH);
  float blue_noise = 2.0 * texelFetch( uBlueNoise, ip, 0 ).r - 1.0;
  return sign(blue_noise) * (1.0 - sqrt(1.0 - abs(blue_noise)));
}

vec3 applyFilmGrain(vec3 col) {
  float luma = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));
  float luma_factor = max(FILM_GRAIN_INTENSITY * (luma - luma * luma), 0.0);
  float blue_noise = pseudoGaussianNoise(gl_FragCoord.xy);
  float new_luma = luma + luma_factor * blue_noise;
  return vec3(col.rgb * new_luma / luma);
}

void main() {
  vec2 uv = (
    (gl_FragCoord.xy - .5 * uResolution.xy) /
    max(uResolution.x, uResolution.y)
  );

  vec3 col = drawGel(uv).rgb;
  #ifdef DEBUG
    outColor = vec4(clamp(col, 0., 1.), 1.);
    return;
  #endif

  #ifdef VIGNETTE
    col *= (smoothstep(0.3,.99, abs(uv.x) + 1. - VIGNETTE) * 0.6 + 0.4);
  #endif

  if (FG_BLOB1_STRENGTH > 0.) {
    col += (
      FG_BLOB1_COLOR *
      drawBlob(uv + FG_BLOB1_POS, FG_BLOB1_DIMS) *
      FG_BLOB1_STRENGTH
    );
  }

  if (FG_BLOB2_STRENGTH > 0.) {
    col += (
      FG_BLOB2_COLOR *
      drawBlob(uv + FG_BLOB2_POS, FG_BLOB2_DIMS) *
      FG_BLOB2_STRENGTH
    );
  }

  col = clamp(col, 0., 1.);

  col = contrastAndBrightness(col, SCENE_CONTRAST, SCENE_BRIGHTNESS);
  #ifdef USE_ACES
    col = applyACES(col);
  #endif

  #ifndef LOW_PERF
    #ifdef FILM_GRAIN_INTENSITY
      col = applyFilmGrain(col);
    #endif
  #endif

  // fade ever slightly on scroll
  col /= (uScroll < 2. ? 2. : min(uScroll, 2.2)) / 2.;

  outColor = vec4(clamp(col * uOpacity, 0., 1.), 1.);
}`;


export default bgShader;
