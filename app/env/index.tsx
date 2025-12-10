'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import type { SetStateAction, Dispatch } from 'react';

import { Canvas } from '@react-three/fiber';
import { PerformanceMonitor, StatsGl } from '@react-three/drei'
import { Settings, Pane, usePaneSetting, readPaneSettings, setInfo } from '../settings';
import Environment from "./env";
import { PatchedView } from "./utils/view";
import { useWebgl } from "./utils/hasWebgl";

// start: 20fps dpr=2
// now: 60fps dpr=1.5; 45-50fps dpr=2

type ThreeOptions = {
  eventSource?: React.MutableRefObject<HTMLElement>
  showDebug?: boolean
  showStats?: boolean
}

type ThreeLowPerfContext = null | {
  lowPerf: boolean,
  setLowPerf: Dispatch<SetStateAction<boolean>>
}

const ThreeContext = createContext<ThreeLowPerfContext>(null);

function ThreeContextProvider({ children }: { children: React.ReactNode }) {
  const stateFuncs = useState<boolean>(false);
  const state = {
    lowPerf: stateFuncs[0],
    setLowPerf: stateFuncs[1]
  };

  return <ThreeContext.Provider value={state}>
    {children}
  </ThreeContext.Provider>
}

function ThreeCore({ eventSource, showDebug, showStats }: ThreeOptions) {
  const context = useContext(ThreeContext);
  if (context == null) {
    throw new Error('ThreeLowPerf context not found');
  }

  const [lowPerf, setLowPerf] = useState<boolean>(false);

  const nativeDpr = typeof window == 'undefined' ? 1 : window.devicePixelRatio;

  let [maxDpr, setMaxDpr] = usePaneSetting('scene_max_dpr');
  maxDpr = Math.min(nativeDpr, maxDpr);

  const [dpr, setDpr] = useState<number>(maxDpr);

  if (dpr != maxDpr) {
    setDpr(maxDpr);
  }

  const latestStats =
    `DPR=${dpr} / native=${nativeDpr} | ${lowPerf ? 'Low Settings' : 'High Settings'}`;
  setInfo(latestStats);

  return <>
    <Canvas
      className='.three'
      eventSource={eventSource}
      eventPrefix="client"
      gl={{ antialias: false }}
      style={{ height: '115vh' }}
      dpr={dpr}>

      <Environment lowPerf={lowPerf} />
      <PatchedView.Port />

      {(showDebug || showStats) ? <StatsGl /> : null}

      {showDebug ? null : <PerformanceMonitor
        flipflops={0}
        bounds={(refreshrate) => (refreshrate > 60 ? [50, 80] : [50, 60])}
        onDecline={
          () => {
            setDpr(0.5);
            setMaxDpr(0.5);
            setLowPerf(true);
            context.setLowPerf(true)
          }
        }
      />}
    </Canvas>
  </>
}

function Three({ eventSource }: ThreeOptions) {
  const [showDebug, setShowDebug] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const hasWebgl = useWebgl();

  useEffect(() => {
    if (typeof window != 'undefined') {
      if (window.location.href.match('debug')) {
        setShowDebug(true);
      }
      if (window.location.href.match('stats')) {
        setShowStats(true);
      }
    }
  }, []);

  return <Settings>
    {showDebug ? <Pane /> : null}
    {hasWebgl ?
      <ThreeCore
        eventSource={eventSource}
        showDebug={showDebug}
        showStats={showStats} /> :
      null}
  </Settings>
}

export { Three, ThreeContext, ThreeContextProvider };
