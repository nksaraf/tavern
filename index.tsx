require("dotenv").config();
import { render, Text } from "ink";

import React, { Suspense } from "react";
import * as fs from "fs";
import { atomFamily } from "./jotai";
import Spinner from "ink-spinner";
import { ErrorBoundary, useErrorHandler } from "react-error-boundary";
import { Provider, useAtom } from "jotai";
import yaml from "yaml";
import { useAsset } from "./use-asset";
import { hasuraQuery } from "./fetchHasura";
import deepEqual from "fast-deep-equal";

const fileAtom = atomFamily<
  string,
  {
    contents: string | undefined;
    status: "empty" | "filled" | "writing" | "written";
  }
>((path: string) => ({
  contents: undefined,
  status: "empty" as const,
}));

const readWriteFileAtom = atomFamily(
  (path: string) => async (
    get
  ): Promise<{
    contents: string | undefined;
    status: "empty" | "filled" | "writing" | "written";
  }> => {
    const value = get(fileAtom(path));
    if (value.status !== "empty") {
      return value;
    }
    try {
      const result = fs.readFileSync(path).toString();
      return { contents: result, status: "filled" };
    } catch (e) {
      console.log(e);
      return { contents: undefined, status: "empty" };
    }
  },
  (path: string) => async (get, set, contents: string) => {
    set(fileAtom(path), { contents: undefined, status: "writing" });
    await wait(2000);
    fs.writeFileSync(path, contents);
    set(fileAtom(path), { contents: contents, status: "written" });
  }
);

const wait = (time) => {
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

const File = ({ path, children }: { path: string; children: string }) => {
  const [oldContents, setContents, status] = useFile(path);
  // const [state, setState] = React.useState("idle");

  React.useEffect(() => {
    if (children !== oldContents) {
      wait(3000).then(() => {
        setContents(children);
        // setState("writing");
      });
    }
    // } else if (state === "writing") {
    //   setState("written");
    // } else {
    //   setState("idle");
    // }
  }, [children, oldContents, setContents]);

  return <Text>{status}</Text>;
};

function useFile(path: string) {
  const [{ status, contents }, setContents] = useAtom(readWriteFileAtom(path));
  return [contents, setContents, status] as [
    typeof contents,
    typeof setContents,
    typeof status
  ];
}

async function getHasuraMetadata() {
  const response = await hasuraQuery([{ type: "export_metadata", args: {} }]);
  return response[0].response;
}

const Hasura = ({ rootDir = "./hasura" }) => {
  const [hasuraMetadata, setHasuraMetadata, status] = useFile(
    rootDir + "/migrations/metadata.yaml"
  );

  console.log();

  return <Text>{status}</Text>;
};

export default function App() {
  return (
    <>
      <Execution>
        <Hasura />
        <File path="./hello.txt">Hello World</File>
      </Execution>
    </>
  );
}

function Env({ children }) {
  const [envContents, setEnvContents] = useFile("./.tavern");
  const handleError = useErrorHandler();

  React.useEffect(() => {
    const [env] = envContents ? JSON.parse(envContents) : [];
    return () => {
      try {
        const files = fileAtom.atoms.map((atom) => atom[0]);
        const toDelete = env.filter((e) => !files.find((v) => v === e));
        toDelete.forEach((file) => {
          fs.unlinkSync(file);
        });
        fs.writeFileSync(
          "./.tavern",
          JSON.stringify(fileAtom.atoms.map((atom) => atom[0]))
        );
      } catch (e) {
        handleError(e);
      }
    };
  }, [envContents]);

  return <>{children}</>;
}

render(
  <Provider>
    {/* <ErrorBoundary
      fallbackRender={({ error }) => <Text>{error.toString()}</Text>}
    > */}
    <Suspense fallback={<Text>Loading env...</Text>}>
      <Env>
        <App />
      </Env>
    </Suspense>
    {/* </ErrorBoundary> */}
  </Provider>
);
