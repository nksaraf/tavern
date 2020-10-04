require("dotenv").config();
import { render, Text } from "ink";

import React, { Suspense } from "react";
import Spinner from "ink-spinner";
import { ErrorBoundary } from "react-error-boundary";
import { Provider } from "jotai";

import { useFile, File, cleanup } from "./File";

export * from "./File";
export * from "jotai";
export * from "./jotai";
export * from "./use-asset";
export * from "ink";

export const wait = (time) => {
  return new Promise((res) =>
    setTimeout(() => {
      res();
    }, time)
  );
};

export const Execution = ({ children }) => {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => <Text>{error.toString()}</Text>}
    >
      <Suspense fallback={<Spinner type="dots10" />}>{children}</Suspense>
    </ErrorBoundary>
  );
};

export default function App() {
  return (
    <>
      <Execution>
        <File path="./hello.txt">Hello World1</File>
      </Execution>
    </>
  );
}

export function Env({ children }) {
  React.useEffect(() => {
    return () => {
      try {
        cleanup();
      } catch (e) {
        console.log(e);
      }
    };
  }, []);

  return <>{children}</>;
}

export const TavernProvider = ({ children }) => {
  return (
    <Provider>
      <ErrorBoundary
        fallbackRender={({ error }) => <Text>{error.toString()}</Text>}
      >
        <Suspense fallback={<Text>Loading env...</Text>}>
          <Env>{children}</Env>
        </Suspense>
      </ErrorBoundary>
    </Provider>
  );
};
