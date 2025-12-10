import createSettings from "./env/utils/createSettings";

export const {
  Settings,
  Pane,
  setInfo,
  readPaneSettings,
  usePaneSetting,
  readPaneSettingsAsArray,
} = createSettings({
  config: {
    title: "Config",
  },

  settings: {
    debug_raymarch: false,
    scene_max_dpr: 1,
    bg_scene: "#191819",
    bg_vignette_strength: 0,
    bg_aces: true,
    bg_contrast: 1.67,
    bg_film_grain: 0.205,
    bg_brightness: 0.147,
    bg_blob1_pos: { x: -1, y: -1 },
    bg_blob1_strength: 0.09,
    bg_blob1_color: "#a8a8a8",
    bg_blob1_dims: { x: 8, y: 8 },
    bg_blob2_pos: { x: 1, y: -1 },
    bg_blob2_strength: 0.15,
    bg_blob2_color: "#c5c5c5",
    bg_blob2_dims: { x: 8, y: 8 },
    bg_blob3_pos: { x: 1, y: 1 },
    bg_blob3_strength: 0.07,
    bg_blob3_color: "#dbdbdb",
    bg_blob3_dims: { x: 8, y: 8 },
    bg_blob4_pos: { x: 0.5, y: 0.4594 },
    bg_blob4_strength: 0,
    bg_blob4_color: "#d8d8d8",
    bg_blob4_dims: { x: 5.625, y: 4.1875 },
    fg_blob1_pos: { x: 0.4453, y: -0.3453 },
    fg_blob1_strength: 0.05,
    fg_blob1_color: "#d2d2d2",
    fg_blob1_dims: { x: 3.0625, y: 1.3625 },
    fg_blob2_pos: { x: -0.3828, y: 0.1703 },
    fg_blob2_strength: 0.04,
    fg_blob2_color: "#464646",
    fg_blob2_dims: { x: 2.1875, y: 1.7375 },
    bg_blob_fade_after: 0.82,
    bg_blob_fade_coeff: 10,
    bg_blob_fade_max: 0.05,
    bg_pattern: "0",
    bg_pattern_intensity: 0.11,
    bg_pattern_scale: 2,
    bg_visible: false,
    ball_refract_bg: true,
    ball_refract_caustics: true,
    ball_light_match_ar: true,
    ball_light_dims: { x: 4.4, y: 4.4 },
    ball_light_color: "#999999",
    ball_mat_color: "#363636",
    ball_mat_light_mix: 0,
    ball_speed: 20,
    ball_speed_max_break_coeff: 7,
    ball_refraction_index: 0.68,
    ball_contrast_boost: 0.9,
    ball_brightness_boost: -0.038,
    ball_diffuseness: 0.001,
    ball_reflect_intensity: 0.109,
    ball_caustic_intensity: 0.026,
    ball_bg_intensity: 0.96,
    ball_bg_saturation: 1.19,
  },

  layout: ({
    addBinding,
    addFolder,
    addFPS,
    addExport,
    addInfo,
    addSeparator,
  }) => {
    addFPS();
    addInfo();

    addBinding("scene_max_dpr", {
      min: 0.5,
      max: 2,
      step: 0.5,
    });

    ////////////////////////////////////////////////////////////

    const scene = addFolder({ title: "Scene" });

    scene.addBinding("bg_scene", { label: "Scene Canvas Color" });
    scene.addBinding("bg_vignette_strength", {
      min: 0,
      max: 1,
      step: 0.01,
    });

    scene.addBinding("bg_aces", { label: "ACES Film" });
    scene.addBinding("bg_contrast", { min: 0, max: 2, step: 0.01 });
    scene.addBinding("bg_brightness", { min: -0.5, max: 0.5, step: 0.001 });
    scene.addBinding("bg_film_grain", { min: 0, max: 1, step: 0.005 });
    scene.addSeparator();

    scene.addBinding("bg_visible");
    scene.addList("bg_pattern", {
      0: "None",
      1: "Dots",
      2: "Checkers",
    });
    scene.addBinding("bg_pattern_intensity", { min: 0, max: 2, step: 0.01 });
    scene.addBinding("bg_pattern_scale", { min: 1, max: 20, step: 0.1 });

    ////////////////////////////////////////////////////////////

    const balls = addFolder({ title: "Balls" });

    balls.addBinding("ball_refract_bg");
    balls.addBinding("ball_refract_caustics");
    balls.addBinding("ball_light_match_ar");
    balls.addBinding("ball_light_dims", {
      x: { min: 0.1, max: 6 },
      y: { min: 0.1, max: 6 },
    });
    balls.addBinding("ball_light_color");
    balls.addBinding("ball_mat_color");
    balls.addBinding("ball_mat_light_mix", { min: 0, max: 1, step: 0.01 });
    balls.addBinding("ball_speed", { min: 0.01, max: 200, step: 0.01 });
    balls.addBinding("ball_speed_max_break_coeff", {
      min: 1,
      max: 50,
      step: 0.01,
    });
    balls.addBinding("ball_refraction_index", { min: 0, max: 1, step: 0.01 });
    balls.addBinding("ball_contrast_boost", { min: 0, max: 2, step: 0.01 });
    balls.addBinding("ball_brightness_boost", {
      min: -0.5,
      max: 0.5,
      step: 0.001,
    });
    balls.addBinding("ball_diffuseness", {
      min: 0.001,
      max: 0.999,
      step: 0.001,
    });
    balls.addBinding("ball_reflect_intensity", { min: 0, max: 1, step: 0.001 });
    balls.addBinding("ball_caustic_intensity", {
      min: 0,
      max: 0.3,
      step: 0.001,
    });
    balls.addBinding("ball_bg_intensity", { min: 0, max: 3, step: 0.01 });
    balls.addBinding("ball_bg_saturation", { min: 0.2, max: 5, step: 0.01 });

    ////////////////////////////////////////////////////////////

    const bs = addFolder({ title: "Background blobs", expanded: true });

    bs.addBinding("bg_blob1_pos", {
      x: { min: -1, max: 1 },
      y: { min: -1, max: 1 },
    });
    bs.addBinding("bg_blob1_strength", { min: 0, max: 1, step: 0.01 });
    bs.addBinding("bg_blob1_color");
    bs.addBinding("bg_blob1_dims", {
      x: { min: 0.1, max: 8 },
      y: { min: 0.1, max: 8 },
    });
    bs.addSeparator();

    bs.addBinding("bg_blob2_pos", {
      x: { min: -1, max: 1 },
      y: { min: -1, max: 1 },
    });
    bs.addBinding("bg_blob2_strength", { min: 0, max: 1, step: 0.01 });
    bs.addBinding("bg_blob2_color");
    bs.addBinding("bg_blob2_dims", {
      x: { min: 0.1, max: 8 },
      y: { min: 0.1, max: 8 },
    });
    bs.addSeparator();

    bs.addBinding("bg_blob3_pos", {
      x: { min: -1, max: 1 },
      y: { min: -1, max: 1 },
    });
    bs.addBinding("bg_blob3_strength", { min: 0, max: 1, step: 0.01 });
    bs.addBinding("bg_blob3_color");
    bs.addBinding("bg_blob3_dims", {
      x: { min: 0.1, max: 8 },
      y: { min: 0.1, max: 8 },
    });
    bs.addSeparator();

    bs.addBinding("bg_blob4_pos", {
      x: { min: -1, max: 1 },
      y: { min: -1, max: 1 },
    });
    bs.addBinding("bg_blob4_strength", { min: 0, max: 1, step: 0.01 });
    bs.addBinding("bg_blob4_color");
    bs.addBinding("bg_blob4_dims", {
      x: { min: 0.1, max: 8 },
      y: { min: 0.1, max: 8 },
    });
    bs.addSeparator();

    bs.addBinding("bg_blob_fade_after", { min: 0, max: 10, step: 0.01 });
    bs.addBinding("bg_blob_fade_coeff", { min: 0.01, max: 10, step: 0.01 });
    bs.addBinding("bg_blob_fade_max", { min: 0.01, max: 50, step: 0.01 });

    ////////////////////////////////////////////////////////////

    const fs = addFolder({ title: "Foreground blobs", expanded: true });

    fs.addBinding("fg_blob1_pos", {
      x: { min: -1, max: 1 },
      y: { min: -1, max: 1 },
    });
    fs.addBinding("fg_blob1_strength", { min: 0, max: 1, step: 0.01 });
    fs.addBinding("fg_blob1_color");
    fs.addBinding("fg_blob1_dims", {
      x: { min: 0.1, max: 8 },
      y: { min: 0.1, max: 8 },
    });
    fs.addSeparator();

    fs.addBinding("fg_blob2_pos", {
      x: { min: -1, max: 1 },
      y: { min: -1, max: 1 },
    });
    fs.addBinding("fg_blob2_strength", { min: 0, max: 1, step: 0.01 });
    fs.addBinding("fg_blob2_color");
    fs.addBinding("fg_blob2_dims", {
      x: { min: 0.1, max: 8 },
      y: { min: 0.1, max: 8 },
    });

    ////////////////////////////////////////////////////////////

    addSeparator();
    addBinding("debug_raymarch");

    addExport();
  },
});
