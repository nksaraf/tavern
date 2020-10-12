const prettier = require("prettier");

export const format = ({ text, filepath }) => {
  return prettier.format(text, {
    filepath,
  });
};

import React from "react";
import { useFile } from "./file";
import * as fs from "fs";
import { useValueRef } from "usables/useValueRef";
import stringify from "fast-stable-stringify";

export function ensureExists(data: string[], ...args: string[]) {
  for (var arg of args) {
    if (!data.includes(arg)) {
      data.push(arg);
    }
  }
  return data;
}

export { stringify };

export function useCleanup(cb: () => void) {
  const cbRef = useValueRef(cb);
  React.useEffect(() => {
    return () => {
      try {
        cbRef.current();
      } catch (err) {
        console.log(err);
      }
    };
  }, []);
}

export function useJsonFile(path: string) {
  const file = useFile(path, {
    transform: (contents) => (contents ? JSON.parse(contents) : {}),
    defaultTransformedData: {},
  });

  const contentsRef = useValueRef(file.transformed);

  const update = React.useCallback(
    (data) => {
      if (stringify(data) !== stringify(file.transformed)) {
        file.dispatch({
          type: "SET_CONTENTS",
          contents: JSON.stringify(data, null, 2),
        });
      }
    },
    [file.dispatch, file.transformed]
  );

  const write = React.useCallback(
    (data) => {
      if (stringify(data) !== stringify(file.transformed)) {
        file.dispatch({
          type: "WRITE_FILE",
          contents: JSON.stringify(data, null, 2),
        });
      }
    },
    [file.dispatch, file.transformed]
  );

  const cleanup = React.useCallback(
    () =>
      fs.writeFileSync(
        path,
        format({
          text: JSON.stringify(contentsRef.current, null, 2),
          filepath: "file.json",
        })
      ),
    [path]
  );

  return { ...file, update, write, cleanup, path, json: file.transformed };
}

const path = require("path");

export function requireWithSucrase(filePath) {
  return eval("require")(
    path.join(process.cwd(), filePath.substr(0, filePath.lastIndexOf(".")))
  );
}

import pathUtils from "path";

export function resolveEntry(name, root = "src") {
  return [
    pathUtils.join(root, `${name}.ts`),
    pathUtils.join(root, `${name}.tsx`),
  ].find((path) => fs.existsSync(path));
}

export async function wait(time: number) {
  return new Promise((res, rej) => {
    setTimeout(() => {
      return res();
    }, time);
  });
}
export async function waitRandomly() {
  const time = Math.random() * 2000 + 1000;
  await wait(time);
  if (Math.random() > 1.9) {
    throw new Error("something wrong");
  }
}
