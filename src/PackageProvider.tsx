import React from "react";
import { createContext } from "create-hook-context";
import { PackageJSONProvider } from "./PackageJson";

const PackageContext = createContext(
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
