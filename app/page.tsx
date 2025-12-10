"use client";

import { useContext } from "react";

import {
  Three,
  ThreeContextProvider,
  ThreeContext,
} from "./env";

function Render() {
  const threeCtx = useContext(ThreeContext)!;
  let extraClass = "";

  if (threeCtx.lowPerf) {
    extraClass = "low-perf";
  }

  return <Three />;
}

export default function Home() {
  return (
    <ThreeContextProvider>
      <Render />
    </ThreeContextProvider>
  );
}
