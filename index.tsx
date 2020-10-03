require("dotenv").config();
import { render, Text } from "ink";

import React, { Suspense } from "react";
import Spinner from "ink-spinner";
import { ErrorBoundary, useErrorHandler } from "react-error-boundary";
import { Provider } from "jotai";
import yaml from "yaml";
import { useAsset } from "./use-asset";
import { hasuraQuery } from "./fetchHasura";
import deepEqual from "fast-deep-equal";
import { useFile, File, fileAtom, cleanup } from "./File";

export const wait = (time) => {
  return new Promise((res) =>
    setTimeout(() => {
      res();
    }, time)
  );
};

const Execution = ({ children }) => {
  return (
    <ErrorBoundary
      fallbackRender={({ error }) => <Text>{error.toString()}</Text>}
    >
      <Suspense fallback={<Spinner type="dots10" />}>{children}</Suspense>
    </ErrorBoundary>
  );
};

async function getHasuraMetadata() {
  const response = await hasuraQuery([{ type: "export_metadata", args: {} }]);
  return response[0].response;
}

const Hasura = ({ rootDir = "./hasura" }) => {
  const [hasuraMetadata, setHasuraMetadata, status] = useFile(
    rootDir + "/migrations/metadata.yaml"
  );

  return <Text>{status}</Text>;
};

export default function App() {
  return (
    <>
      <Execution>
        <Hasura />
        <File path="./hello.txt">Hello World123</File>
      </Execution>
    </>
  );
}

function Env({ children }) {
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

render(
  <Provider>
    <ErrorBoundary
      fallbackRender={({ error }) => <Text>{error.toString()}</Text>}
    >
      <Suspense fallback={<Text>Loading env...</Text>}>
        <Env>
          <App />
        </Env>
      </Suspense>
    </ErrorBoundary>
  </Provider>
);
