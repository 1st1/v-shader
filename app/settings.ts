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
    bg_aces: true,
    bg_contrast: 1.67,
    bg_film_grain: .99,
    bg_brightness: 0.147,
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

    scene.addBinding("bg_aces", { label: "ACES Film" });
    scene.addBinding("bg_contrast", { min: 0, max: 2, step: 0.01 });
    scene.addBinding("bg_brightness", { min: -0.5, max: 0.5, step: 0.001 });
    scene.addBinding("bg_film_grain", { min: 0, max: 1, step: 0.005 });

    ////////////////////////////////////////////////////////////

    addExport();
  },
});
