const path = require("path");

export function requireWithSucrase(filePath) {
  return eval("require")(
    path.join(process.cwd(), filePath.substr(0, filePath.lastIndexOf(".")))
  );
}
