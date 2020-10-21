import { createContext } from "create-hook-context";
import { useValueRef } from "usables/useValueRef";
import { usePersistentStateWithCleanup } from "./persistence";
import React from "react";
import { Text } from "ink";
import { File, useFile } from "./file";
import { usePackageJSON } from "./package-json";
import { format, ensureExists, resolveEntry } from "./utils";

export function useMainEntryPoint({ status, update, json }) {
  React.useEffect(() => {
    if (status === "filled") {
      const packageJson = json;
      update({
        ...packageJson,
        module: "dist/esm/index.js",
        main: "dist/index.js",
        types: "dist/index.d.ts",
        exports: {
          ...(packageJson.exports ?? {}),
          ".": {
            import: "./dist/esm/index.js",
            browser: "./dist/esm/index.js",
            require: "./dist/index.js",
            node: "./dist/index.js",
            default: "./dist/esm/index.js",
          },
        },
        scripts: {
          ...(packageJson.scripts ?? {}),
          build: addEntryPointToTsupScript(
            packageJson.scripts?.["build"],
            resolveEntry("index")
          ),
        },
        files: ensureExists(packageJson.files ?? [], "dist"),
      });
    }
  }, [status, update, json]);

  return () => {};
}

// export const MainEntryPoint = () => {
//   const packageJson = usePackageJSON();
//   // useMainEntryPoint(packageJson);

//   return <Text>index</Text>;
// };

export function addEntryPointToTsupScript(script: string, src: string) {
  if (script) {
    let parseScripts: string = script;
    const parts = script.split(" ").filter((a) => a.length > 0);
    console.log(parts);

    if (parts.includes(src)) {
    }

    return parseScripts;
  } else {
    return `yarn tsup ${src} --format cjs,esm --legacy-output --dts`;
  }
}

export const TSUPContext = createContext(({}: {}) => {
  const packageJson = usePackageJSON();
  const contentsRef = useValueRef(packageJson.json);

  const { cleanup, touch } = usePersistentStateWithCleanup(
    "entryPoints",
    (entryPoint, value) => {
      delete contentsRef.current.exports["./" + entryPoint];

      contentsRef.current.files = contentsRef.current.files.filter(
        (f) => f !== entryPoint
      );

      const script = contentsRef.current.scripts["build"];
      if (script) {
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
              .replace(`src/${entryPoint}.ts `, "")}--${matched[3]}`;
          }
        }
      }
    }
  );

  // React.useEffect(() => {
  //   packageJson.registerCleanup(cleanup);
  // }, [cleanup, packageJson.registerCleanup]);

  return {
    touchEntryPoint: React.useCallback((key: string) => touch(key, true), [
      touch,
    ]),
  };
});

export const TSUPProvider = TSUPContext[0];
export const useTsup = TSUPContext[1];

export function EntryPointPackageJson({
  name,
  rootName,
}: {
  name: any;
  rootName: any;
}) {
  return (
    <File
      path={`${name}/package.json`}
      contents={format({
        text: JSON.stringify(
          {
            name: `${rootName}/${name}`,
            private: true,
            main: `../dist/${name}.js`,
            module: `../dist/esm/${name}.js`,
            types: `../dist/${name}.d.ts`,
          },
          null,
          2
        ),
        filepath: `${name}/package.json`,
      })}
    />
  );
}

import produce from "immer";

const transform = () => ({
  add: produce((old, name) => {
    old.exports = old.exports ?? {};
    old.exports[`./${name}`] = {
      import: `./dist/esm/${name}.js`,
      browser: `./dist/esm/${name}.js`,
      require: `./dist/${name}.js`,
      node: `./dist/${name}.js`,
      default: `./dist/esm/${name}.js`,
    };

    return old;
  }),
  remove: produce((old, name) => {
    if (old.exports[`./${name}`]) {
      delete old.exports[`./${name}`];
    }
  }),
});

// export const EntryPoint = ({ name, source = resolveEntry(name) }) => {
// const packageJson = usePackageJSON();
// const { status: srcStatus, dispatch: srcDispatch } = useFile(source);
// const { touchEntryPoint } = useTsup();

// React.useEffect(() => {
//   if (status === "filled") {
//     update({
//       ...packageJson,
//       exports: {
//         ...(packageJson.exports ?? {}),
//         [`./${name}`]: {
//           import: `./dist/esm/${name}.js`,
//           browser: `./dist/esm/${name}.js`,
//           require: `./dist/${name}.js`,
//           node: `./dist/${name}.js`,
//           default: `./dist/esm/${name}.js`,
//         },
//       },
//       scripts: {
//         ...(packageJson.scripts ?? {}),
//         build: addEntryPointToTsupScript(
//           packageJson.scripts?.["build"],
//           source
//         ),
//       },
//       files: ensureExists(packageJson.files ?? [], name),
//     });
//   }
// }, [status, update, packageJson, source, name]);

// React.useEffect(() => {
//   touchEntryPoint(name);
// }, [touchEntryPoint, name]);

// React.useEffect(() => {
//   if (srcStatus === "empty") {
//     srcDispatch({ type: "WRITE_FILE", contents: "" });
//   }
// }, [srcStatus]);

// return (
//   <>
//     {status === "filled" ? (
//       <EntryPointPackageJson name={name} rootName={packageJson.name} />
//     ) : null}
//   </>
// );
// };
