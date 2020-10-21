import mdx from "@mdx-js/mdx";
import * as pirates from "pirates";
import { Options, transform } from "sucrase";

export function addHook(
  extension: string,
  { mdx: isMdx, ...options }: Options & { mdx?: boolean }
): void {
  pirates.addHook(
    (code: string, filePath: string): string => {
      const { code: transformedCode, sourceMap } = transform(
        isMdx
          ? `const {mdx} = require("@mdx-js/react");
          const path = require('path');
        ${mdx.sync(`${code}`)}`
          : code,
        {
          ...options,
          jsxPragma: isMdx ? "mdx" : "React.createElement",
          sourceMapOptions: { compiledFilename: filePath },
          filePath,
        }
      );

      const mapBase64 = Buffer.from(JSON.stringify(sourceMap)).toString(
        "base64"
      );
      const suffix = `//# sourceMappingURL=data:application/json;charset=utf-8;base64,${mapBase64}`;
      return `${transformedCode}\n${suffix}`;
    },
    { exts: [extension] }
  );
}

export function registerExtensions(): void {
  addHook(".mdx", { transforms: ["imports", "typescript", "jsx"], mdx: true });
  addHook(".md", { transforms: ["imports", "typescript", "jsx"], mdx: true });
  addHook(".js", { transforms: ["imports", "flow", "jsx"] });
  addHook(".jsx", { transforms: ["imports", "flow", "jsx"] });
  addHook(".ts", { transforms: ["imports", "typescript"] });
  addHook(".tsx", { transforms: ["imports", "typescript", "jsx"] });
}

registerExtensions();
