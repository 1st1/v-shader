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

  vec3 col = vec3(.1, .1, .1);

  col = applyFilmGrain(col);

  outColor = vec4(col, 1.);
}`;


export default bgShader;
