module.exports = function (api) {
  api.cache(false);

  const presets = [
    [
      "@babel/preset-env", {
        "targets": {
          "node": "current"
        }
      }
    ], "@babel/preset-typescript"
  ];
  const plugins = [
    "@babel/plugin-proposal-class-properties",
    "@babel/plugin-proposal-object-rest-spread"
  ]

  return {
    presets,
    plugins,
    env: {
      test: {
        plugins: [
          "istanbul"
        ]
      }
    }
  };
}