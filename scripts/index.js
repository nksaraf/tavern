const fs = require("fs");

const cont = fs.readFileSync("dist/index.js").toString();
fs.writeFileSync(
  "dist/index.js",
  cont.replace("exports. default", "module.exports")
);
