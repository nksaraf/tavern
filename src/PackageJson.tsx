import React from "react";
import { createContext } from "create-hook-context";
import { useFile } from "./File";
import * as fs from "fs";
import { format } from "./format";
import { usePersistentState } from "./usePersistentState";
import { useValueRef } from "usables/useValueRef";
import stringify from "fast-stable-stringify";
import { usePackage } from "./PackageProvider";
import { addEntryPointToTsupScript, resolveEntry } from "./EntryPoint";

export function ensureExists(data: string[], ...args: string[]) {
  for (var arg of args) {
    if (!data.includes(arg)) {
      data.push(arg);
    }
  }
  return data;
}

export function useCleanup(cb) {
  React.useEffect(() => {
    return () => {
      try {
        cb();
      } catch (err) {
        console.log(err);
      }
    };
  }, []);
}

const PackageJSONContext = createContext(({}: {}) => {
  const file = useFile("package.json", {
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

  const [
    packageJsonState,
    setPackageJsonState,
    oldPackageJsonState,
  ] = usePersistentState("packageJson", {});

  const ref = useValueRef(packageJsonState);
  const oldRef = useValueRef(oldPackageJsonState);
  const pkg = usePackage();
  React.useEffect(() => {
    if (file.status === "filled") {
      const data = file.transformed;
      update({
        ...data,
        name: pkg.name ?? data.name,
        version: pkg.version ?? data.version,
        module: "dist/esm/index.js",
        main: "dist/index.js",
        types: "dist/index.d.ts",
        repository: `https://github.com/nksaraf/${pkg.name ?? data.name}.git`,
        author: "Nikhil Saraf <nsaraf98@gmail.com>",
        license: "MIT",
        exports: {
          ...(data.exports ?? {}),
          "./package.json": "./package.json",
          "./": "./",
          ".": {
            import: "./dist/esm/index.js",
            browser: "./dist/esm/index.js",
            require: "./dist/index.js",
            node: "./dist/index.js",
            default: "./dist/esm/index.js",
          },
        },
        scripts: {
          ...(data.scripts ?? {}),
          build: addEntryPointToTsupScript(
            data.scripts?.["build"],
            resolveEntry("index")
          ),
          prepublishOnly: "yarn build",
        },
        files: ensureExists(data.files ?? [], "dist", "README.md"),
      });
    }
  }, [file.status, update, file.transformed]);

  useCleanup(() => {
    for (var entryPoint of Object.keys(oldRef.current ?? {})) {
      if (!ref.current[entryPoint]) {
        console.log("removing " + entryPoint);
        delete contentsRef.current.exports["./" + entryPoint];
        contentsRef.current.files = contentsRef.current.files.filter(
          (f) => f !== entryPoint
        );
        const script = contentsRef.current.scripts["build"];
        const matched = script.match(
          /yarn tsup (?<group>(src\/[a-zA-Z]+\.tsx? )+)--(?<opt>.*)/
        );
        if (matched && matched.length === 4) {
          const included = matched[1].includes(entryPoint);

          if (included) {
            contentsRef.current.scripts[
              "build"
            ] = `yarn tsup ${matched[1]
              .replace(`src/${entryPoint}.tsx `, "")
              .replace(`src/${entryPoint}.ts `, "")} --${matched[3]}`;
          }
        }
      }
    }

    fs.writeFileSync(
      "package.json",
      format({
        text: JSON.stringify(contentsRef.current, null, 2),
        filepath: "package.json",
      })
    );
  });

  return {
    ...file,
    update,
    packageJson: file.transformed,
    touchEntryPoint: React.useCallback(
      (key) => setPackageJsonState((state) => ({ ...state, [key]: true })),
      [setPackageJsonState]
    ),
  };
});

export const PackageJSONProvider = PackageJSONContext[0];
export const usePackageJSON = PackageJSONContext[1];
