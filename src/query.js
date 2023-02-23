const { print } = require('graphql/index');
const getUsedFragments = (raw, allFragments, results = []) => {
  const fragments = [...raw.matchAll(/\.\.\.(\w*)$/gm)]
    .map(([_, name]) => name)
    .map(name => allFragments.find(d => d.name === name));

  for (let fragment of fragments) {
    getUsedFragments(print(fragment.type), allFragments, results);
  }
  results.push(...fragments);
  return results;
};

module.exports = { getUsedFragments };
