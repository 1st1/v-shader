const bgShader = () => /*glsl*/`precision highp float;

#define IGNORE_THRESHOLD 0.018

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

vec3 applyACES(vec3 x) {
  float a = 2.41;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return (x * (a * x + b)) / (x * (c * x + d) + e);
}

float sdLine(vec2 p, vec2 a, vec2 b)
{
    vec2 pa = p - a;
    vec2 ba = b - a;

    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba*h);
}

float sdTriangle(vec2 p, float r) {
  const float k = 1.7320508075688772;

  p.x = abs(p.x) - r;
  p.y = p.y + r / k;

  if (p.x + k * p.y > 0.0) {
    p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
  }

  p.x -= clamp(p.x, -2.0 * r, 0.0);
  return -length(p) * sign(p.y);
}

float pseudoGaussianNoise(vec2 p)
{
  ivec2 ip = (ivec2(1337 * uFrame) + ivec2(p)) % ivec2(NOISE_WIDTH, NOISE_WIDTH);
  float blue_noise = 2.0 * texelFetch( uBlueNoise, ip, 0 ).r - 1.0;
  return sign(blue_noise) * (1.0 - sqrt(1.0 - abs(blue_noise)));
}

float calcGrain(float luma) {
  float luma_factor = max(FILM_GRAIN_INTENSITY * (luma - luma * luma), 0.0);
  float blue_noise = pseudoGaussianNoise(gl_FragCoord.xy);
  float new_luma = luma + luma_factor * blue_noise;
  return new_luma / luma;
}

float wave(float x) {
  return smoothstep(0.9, 1., abs(fract(x * 10.) - 0.5) + 0.5);
}

void main() {
  vec2 uv = (
    (gl_FragCoord.xy - .5 * uResolution.xy) /
    max(uResolution.x, uResolution.y)
  );

  float dist = 0.;

  float k = (clamp(wave(uTime * 2. - uv.x / 90.), 0.1, 1.)) / (
    exp(0.4 - abs(uv.y))
  ) + 1.4;

  dist = clamp(.0023 / abs(sdTriangle((uv + vec2(0., -0.07)), 0.16)), 0., 4.);
  dist *= max(.43 - pow(length((uv + vec2(-0.16, -0.02))), 0.756), 0.0015);

  dist *= pow(calcGrain(dist), 1.5 * k);

  dist *= (k + 0.3);
  
  vec3 col = applyACES(vec3(clamp(dist, 0., 1.)));

  outColor = vec4(col, 1.);
}`;


export default bgShader;
