import React from "react";
import { createContext } from "create-hook-context";
import { useValueRef } from "usables/useValueRef";
import { ensureExists, useJsonFile } from "./utils";
// import {}
import produce from "immer";
import { FileState } from "./file";
import { Executor, Task } from "./executor";

// export function PackageInfo() {
//   const pkg = usePackage();
//   const file = usePackageJSON();

//   React.useEffect(() => {
//     file.onUpdate
//     if (file.isIn("filled")) {
//       const packageJson = file.json;
//       file.update(
//         produce(packageJson, (draft) => {
//           if (pkg.name) draft.name = pkg.name;
//           if (pkg.version) draft.version = pkg.version;
//           draft.repository = `https://github.com/nksaraf/${draft.name}.git`;
//           draft.author = "Nikhil Saraf <nsaraf98@gmail.com>";
//           draft.license = "MIT";
//           draft.exports = draft.exports ?? {};
//           draft.exports["./package.json"] = "./package.json";
//           draft.exports["./"] = "./";
//           draft.files = ensureExists(draft.files ?? [], "README.md");
//         })
//       );
//     }
//   }, [file.isIn, file.update, file.json]);

//   return <Task onRun={}>;
// }

const [CleanupProvider, useCleanup] = createContext(({}: {}) => {
  const [cleanups, setCleanups] = React.useState([]);
  const cleanupsRef = useValueRef(cleanups);

  const cleanup = () => {
    cleanupsRef.current.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.log(e);
      }
    });
  };

  return {
    registerCleanup: React.useCallback(
      (cleanup) => setCleanups((cl) => [...cl, cleanup]),
      [setCleanups]
    ),
    cleanup,
  };
});

const CleanupTask = () => {
  const cleanup = useCleanup();

  return <Task name="cleanup" onRun={cleanup} />;
};

export const PackageJSONContext = createContext(({}: {}) => {
  const file = useJsonFile("package.json");

  return {
    ...file,
    packageJson: file.json,
  };
});

export const PackageJSONProvider = PackageJSONContext[0];
export const usePackageJSON = PackageJSONContext[1];

function PackageJsonCleanup() {
  const packageJson = usePackageJSON();
  return <Task name="cleanup" onRun={packageJson.cleanup} />;
}

export const PackageContext = createContext(
  (props: { name: string; version: string }) => props
);

export const PackageProvider = PackageContext[0];
export const usePackage = PackageContext[1];

export function Package({ name, version, children }) {
  return (
    <PackageProvider name={name} version={version}>
      <PackageJSONProvider>
        <Executor executeOnRender={true}>
          {children}
          <PackageJsonCleanup />
        </Executor>
      </PackageJSONProvider>
    </PackageProvider>
  );
}
