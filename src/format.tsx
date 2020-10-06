const prettier = require("prettier");

export const format = ({ text, filepath }) => {
  return prettier.format(text, {
    filepath,
  });
};
