import React from "react";
import * as fs from "fs";
import { createContext } from "create-hook-context";
import { useCleanup } from "./PackageJson";
export const PersistentStorageContext = createContext(({}: {}) => {
  const oldState = React.useMemo(() => {
    try {
      return JSON.parse(fs.readFileSync(".tavern").toString() ?? "{}");
    } catch (e) {
      return {};
    }
  }, []);
  const [state, setState] = React.useState(oldState);
  const ref = React.useRef(state);
  ref.current = state;

  useCleanup(() => {
    fs.writeFileSync(".tavern", JSON.stringify(ref.current, null, 2));
  });

  return [state, setState, oldState] as [
    typeof state,
    typeof setState,
    typeof oldState
  ];
});

export const PersistentStorageProvider = PersistentStorageContext[0];
export const usePersistentStorage = PersistentStorageContext[1];
export function usePersistentState<V>(
  key: string,
  defaultValue: V | undefined
) {
  const [state, setState, oldState] = usePersistentStorage();
  const [localState, setLocalState] = React.useState<V | undefined>(
    defaultValue ?? state[key]
  );

  React.useEffect(() => {
    setState((old) => ({
      ...old,
      [key]: localState,
    }));
  }, [localState, key]);

  const oldLocalState = oldState[key];

  return [localState, setLocalState, oldLocalState as V | undefined] as [
    typeof localState,
    typeof setLocalState,
    typeof oldLocalState
  ];
}
