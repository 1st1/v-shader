/* eslint-disable react-hooks/rules-of-hooks */

import {
  ReactNode,
  useContext,
  useEffect,
  createContext,
  useState,
} from "react";

import {BladeApi, Pane as Pain, FolderApi, ListBladeApi} from "tweakpane";
import * as TweakpainEssentialsPlugin from "@tweakpane/plugin-essentials";
import * as TweakpaneRotationInputPlugin from "@0b5vr/tweakpane-plugin-rotation";
import * as TweakpaneCameraKitPlugin from "@tweakpane/plugin-camerakit";

import {addEffect, addAfterEffect} from "@react-three/fiber";

type KeyOf<T extends object> = Extract<keyof T, string>;

type PaneConfig = {
  container?: HTMLElement;
  expanded?: boolean;
  title?: string;
};

type AddBladeParams = Parameters<Pain["addBlade"]>;
type AddBladeOptions = AddBladeParams[0];

type AddBindingParams = Parameters<Pain["addBinding"]>;
type BindingOptions = AddBindingParams[2];
type AddBindingCallback = (name: string, options?: BindingOptions) => void;

type AddFolderParams = Parameters<Pain["addFolder"]>;
type AddFolderOptions = AddFolderParams[0];
type AddFolderCallback = (options: AddFolderOptions) => Folder;

type AddInfoFunction = (options?: {label?: string; rows?: number}) => void;

type AddListOptions = {
  [key: string]: string;
}

type LayoutCallbacks = {
  addBinding: AddBindingCallback;
  addFolder: AddFolderCallback;
  addFPS: (options?: AddBladeOptions) => void;
  addSeparator: () => void;
  addExport: () => void;
  addInfo: AddInfoFunction;
  addCurve: (name: string) => void;
  addList: (name: string, options: AddListOptions) => void;
};

type CreatePaneOptions<T> = {
  config: PaneConfig;
  settings: T;
  layout: (cbs: LayoutCallbacks) => void;
};

type BladeCallback = (blade: BladeApi) => void;

type ContextType<T> = {
  settings: T;
  onChange: Map<string, Set<(v: any) => void>>;
  pain?: Pain;
  fpsBlade?: BladeApi;
  infoBlade?: BladeApi;
  latestInfo?: string;
  onInfo?: (v: string) => void;
};

const folderKey = Symbol("folder");

type Folder = {
  [folderKey]: FolderApi;
  addBinding: AddBindingCallback;
  addFolder: AddFolderCallback;
  addSeparator: () => void;
  addCurve: (name: string) => void;
  addList: (name: string, options: AddListOptions) => void;
};

function createSettings<T extends {[key: string]: any}>({
  config,
  settings,
  layout,
}: CreatePaneOptions<T>) {
  const defaultUserMessage = "Gel 🤘";

  const __ctx: ContextType<T> = {
    settings,
    onChange: new Map(),
    fpsBlade: undefined,
  };
  const PaneContext = createContext<ContextType<T>>(__ctx);

  function Settings({children}: {children: ReactNode}) {
    addEffect(() => {
      if (__ctx.fpsBlade) {
        // @ts-ignore
        __ctx.fpsBlade.begin();
      }
    });

    addAfterEffect(() => {
      if (__ctx.fpsBlade) {
        // @ts-ignore
        __ctx.fpsBlade.end();
      }
    });

    useEffect(() => {
      return () => {
        __ctx.onChange.clear();
      };
    });

    return (
      <PaneContext.Provider value={__ctx}>{children}</PaneContext.Provider>
    );
  }

  function Pane() {
    const ctx = useContext(PaneContext);

    useEffect(() => {
      if (!Object.hasOwn(config, "expanded")) {
        const saved = localStorage.getItem("pain-expanded");
        if (saved === "1") {
          config.expanded = true;
        } else {
          config.expanded = false;
        }
      }

      const pain = new Pain(config);

      pain.registerPlugin(TweakpainEssentialsPlugin);
      pain.registerPlugin(TweakpaneRotationInputPlugin);
      pain.registerPlugin(TweakpaneCameraKitPlugin);

      pain.on("fold", (e) => {
        localStorage.setItem("pain-expanded", e.expanded ? "1" : "0");
        if (e.expanded) {
          refreshBezierCurveWidgets(settings, pain);
        }
      });

      const addInfo: AddInfoFunction = ({label, rows} = {rows: 1}) => {
        if (ctx.infoBlade) {
          throw new Error("Info blade has already been added");
        }
        const info = {info: ctx.latestInfo || ""};
        ctx.infoBlade = pain.addBinding(info, "info", {
          multiline: true,
          readonly: true,
          label,
          rows,
        });
        ctx.onInfo = (v: string) => {
          info.info = v;
        };
      };

      const addExport = () => {
        const f = pain.addFolder({
          title: "Settings",
        });
        f.addBlade({
          view: "buttongrid",
          size: [2, 1],
          cells: (x: number, y: number) => ({
            title: [["Import", "Export"]][y][x],
          }),
          // @ts-ignore
        }).on("click", (ev: any) => {
          if (ev.index[0] == 0) {
            let vs = prompt("Paste the settings JSON");
            if (!vs) {
              return;
            }

            vs = vs.replace(/(\w+):/g, (_, m) => JSON.stringify(m) + ":");
            const newSettings = JSON.parse(vs);
            for (let [name, val] of Object.entries(newSettings)) {
              if (Object.hasOwn(ctx.settings, name)) {
                ctx.settings[name as keyof T] = val as any;
                notify(name, val);
              }
            }
            pain.refresh();
            refreshBezierCurveWidgets(settings, pain);
            notifyUser("JSON applied");
          } else {
            let v = JSON.stringify(ctx.settings, null, "  ");
            v = v.replace(/(")(\w+)(":)/g, (_1, _2, m) => `${m}:`);
            v = v.replace(/(\d*\.\d*)/g, (_1, m) => {
              // safe to replace all trailing 0, as toFixed will always
              // render '.0000' even for integers.
              return parseFloat(m).toFixed(4).replace(/[0]+$/, "");
            });
            v = v.replace(/\n\s{4}/gm, " ");
            v = v.replace(/\n?\s{2}\},\n/gm, " },\n");
            v = v.replace(/\n?\s{2}\],\n/gm, " ],\n");
            navigator.clipboard.writeText(v);
            notifyUser("JSON copied to clipboard");
          }
        });
        const infoBlade = f.addBlade({
          view: "text",
          disabled: true,
          parse: (v: any) => String(v),
          value: defaultUserMessage,
        });

        const notifyUser = (msg: string) => {
          // @ts-ignore
          infoBlade.value = msg;
          // @ts-ignore
          setTimeout(() => {
            // @ts-ignore
            infoBlade.value = defaultUserMessage;
          }, 2000);
        };
      };

      ctx.pain = pain;

      const notify = (name: string, value: any) => {
        if (ctx.onChange.has(name)) {
          const s = ctx.onChange.get(name)!;
          s.forEach((cb) => {
            if (value != null && value.constructor.name === "Object") {
              value = Object.assign({}, value);
            }
            cb(value);
          });
        }
      };

      const _addBinding = (
        o: FolderApi,
        name: string,
        options: BindingOptions
      ) => {
        const b = o.addBinding(settings, name, options);
        b.on("change", (ev) => {
          notify(name, ev.value);
        });
      };

      const addBinding: AddBindingCallback = (name, options) => {
        return _addBinding(pain, name, options);
      };

      const _addCurve = (o: FolderApi, name: string) => {
        const b = o.addBlade({
          view: "cubicbezier",
          value: settings[name],
          expanded: true,
          label: name,
          picker: "inline",
        }) as TweakpainEssentialsPlugin.CubicBezierApi;
        // @ts-ignore
        b._name_ = name;
        b.on("change", (ev) => {
          const val = [ev.value.x1, ev.value.y1, ev.value.x2, ev.value.y2];
          // @ts-ignore
          settings[name] = val;
          notify(name, val);
        });
      };

      const _addList = (o: FolderApi, name: string, options: AddListOptions) => {
        const b = o.addBlade({
          view: "list",
          value: settings[name],
          expanded: true,
          label: name,
          options: Object.entries(options).map(([key, label]) => ({
            text: label,
            value: key,
          })),
        });
        // @ts-ignore
        b._name_ = name;
        // @ts-ignore
        b.on("change", (ev) => {
          // @ts-ignore
          settings[name] = ev.value;
          // @ts-ignore
          notify(name, ev.value);
        });
      };

      const addCurve = (name: string) => {
        return _addCurve(pain, name);
      };

      const addList = (name: string, options: AddListOptions) => {
        return _addList(pain, name, options);
      };

      const addFPS = (options?: AddBladeOptions) => {
        if (ctx.fpsBlade) {
          throw new Error("FPS blade has already been added");
        }
        ctx.fpsBlade = pain.addBlade(
          Object.assign(
            {
              view: "fpsgraph",
              rows: 2,
              max: 140,
              min: 0,
            },
            options || {}
          )
        );
      };

      const addSeparator = () => {
        pain.addBlade({view: "separator"});
      };

      const _addFolder = (o: FolderApi, options: AddFolderOptions) => {
        const f = o.addFolder(options);
        return {
          [folderKey]: f,

          addBinding(name: string, options: BindingOptions) {
            return _addBinding(this[folderKey], name, options);
          },

          addCurve(name: string) {
            return _addCurve(this[folderKey], name);
          },

          addFolder(options: AddFolderOptions) {
            return _addFolder(this[folderKey], options);
          },

          addSeparator() {
            this[folderKey].addBlade({view: "separator"});
          },

          addList(name: string, options: AddListOptions) {
            return _addList(this[folderKey], name, options);
          },
        };
      };

      const addFolder: AddFolderCallback = (options) => {
        return _addFolder(pain, options);
      };

      layout({
        addBinding,
        addSeparator,
        addFolder,
        addFPS,
        addExport,
        addInfo,
        addCurve,
        addList,
      });

      pain.element.style.zIndex = "200";
      pain.element.style.position = "fixed";
      pain.element.style.left = "";
      pain.element.style.right = "10px";
      pain.element.style.overflowY = "auto";
      pain.element.style.maxHeight = "calc(100vh - 20px)";
      pain.element.setAttribute("data-lenis-prevent", "data-lenis-prevent");

      return () => {
        if (ctx.fpsBlade) {
          ctx.fpsBlade.dispose();
          ctx.fpsBlade = undefined;
        }
        if (ctx.infoBlade) {
          ctx.infoBlade.dispose();
          ctx.infoBlade = undefined;
        }
        pain.dispose();
        ctx.pain = undefined;
        ctx.onInfo = undefined;
      };
    }, []);

    return <div></div>;
  }

  type UnwrapNames<t extends (keyof T)[]> = t extends [
    infer Head,
    ...infer Tail,
  ]
    ? [
        Head extends keyof T ? T[Head] : never,
        ...UnwrapNames<Tail extends (keyof T)[] ? Tail : never>,
      ]
    : [];

  function readPaneSettingsAsArray<Ns extends KeyOf<T>[]>(
    names: [...Ns]
  ): UnwrapNames<Ns> {
    const ctx = useContext(PaneContext);

    const handles = names.map((n) => {
      const [val, setVal] = useState<any>(ctx.settings[n]);
      return [n as string, val, setVal];
    });

    useEffect(() => {
      for (let [name, _, setVal] of handles) {
        if (!ctx.onChange.has(name)) {
          ctx.onChange.set(name, new Set());
        }
        const s = ctx.onChange.get(name)!;
        if (!s.has(setVal)) {
          s.add(setVal);
        }
      }

      return () => {
        for (let [name, _, setVal] of handles) {
          const onCh = ctx.onChange.get(name);
          onCh && onCh.delete(setVal);
        }
      };
    });

    return handles.map(([_, val]) => val) as UnwrapNames<Ns>;
  }

  function readPaneSettings<
    Ns extends KeyOf<T>[],
    R extends {[k in Ns[number]]: T[k]},
  >(names: [...Ns]): R {
    const values = readPaneSettingsAsArray(names);
    const ret = {} as T;
    for (let i = 0; i < names.length; i++) {
      ret[names[i]] = values[i];
    }
    return ret as unknown as R;
  }

  function usePaneSetting<N extends KeyOf<T>>(
    name: N
  ): [T[N], (v: T[N]) => void] {
    const ctx = useContext(PaneContext);

    const update = (v: T[N]) => {
      settings[name] = v;
      if (ctx.pain) {
        ctx.pain.refresh();
      }
    };

    const [val, setVal] = useState<any>(settings[name]);

    if (val !== settings[name]) {
      update(val);
    }

    useEffect(() => {
      if (!ctx.onChange.has(name)) {
        ctx.onChange.set(name, new Set());
      }
      const s = ctx.onChange.get(name)!;
      if (!s.has(setVal)) {
        s.add(setVal);
      }

      return () => {
        const onch = ctx.onChange.get(name);
        onch && onch.delete(setVal);
      };
    });

    return [
      val,
      (v: T[N]) => {
        update(v);
        setVal(v);
      },
    ];
  }

  function setInfo(info: string) {
    const ctx = useContext(PaneContext);
    ctx.latestInfo = info;
    if (ctx.onInfo) {
      ctx.onInfo(info);
    }
  }

  return {
    Settings,
    Pane,
    readPaneSettingsAsArray,
    readPaneSettings,
    usePaneSetting,
    setInfo,
  };
}

function refreshBezierCurveWidgets(settings: any, c: FolderApi) {
  // When the debug panel is rendered collapsed, its nested
  // bezier curve widgets aren't properly initialized and will
  // not render well when the panel is eventually expanded.
  // Fix that by force-refreshing bezier curve pickers.
  //
  // On top of that, I still don't understand the relationship
  // between bindings, views, and blades. I just can't figure out
  // how to add a binding that has a 'curvebezier' view - it fails
  // on attempt. So we use a blade, but then we have to manually
  // synchronize settings/blade component on refresh. Insane.
  for (let i = 0; i < c.children.length; i++) {
    let cmp = c.children[i];
    if (cmp instanceof FolderApi) {
      refreshBezierCurveWidgets(settings, cmp as FolderApi);
    } else {
      if (cmp instanceof TweakpainEssentialsPlugin.CubicBezierApi) {
        // @ts-ignore
        const updVal = settings[cmp._name_];
        const bsVal = new TweakpainEssentialsPlugin.CubicBezier(...updVal);
        cmp.value = bsVal;
        // @ts-ignore
        cmp.controller.valueController["pickerC_"]["gc_"].refresh();
      }
    }
  }
}

export default createSettings;
