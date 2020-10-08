import React from "react";
import { createContext } from "create-hook-context";
import { useValueRef } from "usables/useValueRef";
import { ensureExists, useJsonFile, useCleanup } from "./utils";
import produce from "immer";

export function usePackageInfo({ status, update, json }) {
  const pkg = usePackage();
  React.useEffect(() => {
    if (status === "filled") {
      const packageJson = json;
      update(
        produce(packageJson, (draft) => {
          if (pkg.name) draft.name = pkg.name;
          if (pkg.version) draft.version = pkg.version;
          draft.repository = `https://github.com/nksaraf/${draft.name}.git`;
          draft.author = "Nikhil Saraf <nsaraf98@gmail.com>";
          draft.license = "MIT";
          draft.exports = draft.exports ?? {};
          draft.exports["./package.json"] = "./package.json";
          draft.exports["./"] = "./";
          draft.files = ensureExists(draft.files ?? [], "README.md");
        })
      );
    }
  }, [status, update, json]);

  return () => {};
}

export const PackageJSONContext = createContext(({}: {}) => {
  const file = useJsonFile("package.json");
  const [cleanups, setCleanups] = React.useState([]);
  const cleanupsRef = useValueRef(cleanups);

  usePackageInfo(file);

  useCleanup(() => {
    cleanupsRef.current.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        console.log(e);
      }
    });
  });

  useCleanup(file.cleanup);

  return {
    ...file,
    packageJson: file.json,
    registerCleanup: React.useCallback(
      (cleanup) => setCleanups((cl) => [...cl, cleanup]),
      [setCleanups]
    ),
  };
});

export const PackageJSONProvider = PackageJSONContext[0];
export const usePackageJSON = PackageJSONContext[1];

export const PackageContext = createContext(
  (props: { name: string; version: string }) => props
);

export const PackageProvider = PackageContext[0];
export const usePackage = PackageContext[1];

export function Package({ name, version, children }) {
  return (
    <PackageProvider name={name} version={version}>
      <PackageJSONProvider>{children}</PackageJSONProvider>
    </PackageProvider>
  );
}
