import React from "react";
import { File, useFile } from "./File";
import { ensureExists, usePackageJSON } from "./PackageJson";
import { format } from "./format";
import pathUtils from "path";
import * as fs from "fs";

export function addEntryPointToTsupScript(script: string, src: string) {
  if (script) {
    let parseScripts: string = script;
    const matched = parseScripts.match(
      /yarn tsup (?<group>(src\/[a-zA-Z]+\.tsx? )+)--(?<opt>.*)/
    );
    if (matched && matched.length === 4) {
      const included = matched[1].includes(src);
      console.log(included, src);

      if (!included) {
        parseScripts = `yarn tsup ${matched[1]}${src} --${matched[3]}`;
      }
    }
    return parseScripts;
  } else {
    return `yarn tsup ${src} --format cjs,esm --legacy-output --dts`;
  }
}

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

export function resolveEntry(name, root = "src") {
  return [
    pathUtils.join(root, `${name}.ts`),
    pathUtils.join(root, `${name}.tsx`),
  ].find((path) => fs.existsSync(path));
}

export const EntryPoint = ({ name, source = resolveEntry(name) }) => {
  const { status, packageJson, touchEntryPoint, update } = usePackageJSON();
  const { status: srcStatus, dispatch: srcDispatch } = useFile(source);

  React.useEffect(() => {
    if (status === "filled") {
      update({
        ...packageJson,
        exports: {
          ...(packageJson.exports ?? {}),
          [`./${name}`]: {
            import: `./dist/esm/${name}.js`,
            browser: `./dist/esm/${name}.js`,
            require: `./dist/${name}.js`,
            node: `./dist/${name}.js`,
            default: `./dist/esm/${name}.js`,
          },
        },
        scripts: {
          ...(packageJson.scripts ?? {}),
          build: addEntryPointToTsupScript(
            packageJson.scripts?.["build"],
            source
          ),
        },
        files: ensureExists(packageJson.files ?? [], name),
      });
    }
  }, [status, update, packageJson, source, name]);

  React.useEffect(() => {
    touchEntryPoint(name);
  }, [touchEntryPoint]);

  React.useEffect(() => {
    if (srcStatus === "empty") {
      srcDispatch({ type: "WRITE_FILE", contents: "" });
    }
  }, [srcStatus]);

  return (
    <>
      {status === "filled" ? (
        <EntryPointPackageJson name={name} rootName={packageJson.name} />
      ) : null}
    </>
  );
};
