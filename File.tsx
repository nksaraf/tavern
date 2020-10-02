import { Text } from "ink";
import React from "react";
import { useAtom, atom } from "jotai";
import { useUpdateAtom } from "jotai/utils.cjs";
import * as fs from "fs";
import { atomFamily } from "./jotai";
import { wait } from "./index";

export const fileAtom = atomFamily<
  string,
  {
    contents: string | undefined;
    status: "empty" | "filled" | "writing" | "written";
  }
>((path: string) => ({
  contents: undefined,
  status: "empty" as const,
}));
const readFileAtom = atomFamily(
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
      return { contents: undefined, status: "empty" };
    }
  },
  (path: string) => (get, set, update) => {
    set(fileAtom(path), update);
  }
);

export const writeFileAtom = atomFamily(
  (path: string) => (get) => get(readFileAtom(path)),
  (path: string) => async (get, set, contents: string) => {
    await wait(2000);
    fs.writeFileSync(path, contents);
    set(readFileAtom(path), { contents: contents, status: "written" });
  }
);

export const touchedFiles = {};

function getPrevTouchedFiles() {
  const envContents = fs.readFileSync("./.tavern").toString();
  const env = envContents ? JSON.parse(envContents) : [];
  return env;
}

function writeTouchedFilesState(files) {
  fs.writeFileSync("./.tavern", JSON.stringify(files));
}

export function cleanup() {
  const prevFiles = getPrevTouchedFiles();
  const files = Object.keys(touchedFiles);
  const filesToDelete = prevFiles.filter((e) => !files.find((v) => v === e));

  filesToDelete.forEach((file) => {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  });

  writeTouchedFilesState(Object.keys(touchedFiles));
}

export const File = ({
  path,
  children,
}: {
  path: string;
  children: string;
}) => {
  const [oldContents, setContents, status] = useFile(path);

  React.useEffect(() => {
    setContents(children);
  }, [children]);

  return <Text>{status}</Text>;
};

const touchFile = (path, contents?: any) => {
  touchedFiles[path] = contents;
};

export function useFile(path: string) {
  const setAtomValue = useUpdateAtom(fileAtom(path));
  const [value, setContents] = useAtom(writeFileAtom(path));

  return [
    value.contents,
    React.useCallback(
      (contents?: string) => {
        touchFile(path, contents);
        if (contents !== value.contents && Boolean(contents)) {
          setAtomValue({ status: "writing", contents: value.contents });
          setContents(contents);
        }
      },
      [setAtomValue, value.contents]
    ),
    value.status,
  ] as [typeof value["contents"], typeof setContents, typeof value["status"]];
}
