module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo', 'nativewind/babel'],
    plugins: [
      function stripImportMeta({ types: t }) {
        return {
          name: 'strip-import-meta',
          visitor: {
            MetaProperty(path) {
              if (
                path.node.meta.name === 'import' &&
                path.node.property.name === 'meta'
              ) {
                path.replaceWith(t.objectExpression([]));
              }
            },
          },
        };
      },
    ],
  };
};
