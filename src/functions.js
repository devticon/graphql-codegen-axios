const getFunctionChain = (operation, useSingleResults) => {
  const chain = [];
  for (let selection of operation.selectionSet.selections) {
    const directives = selection.directives.map(d => d.name.value);
    const propertyName = selection.name.value;
    for (let directive of directives) {
      if (directive === 'nonNullable' || directive === 'firstOrFail') {
        chain.push(`${directive}("${propertyName}", body)`);
      } else if (directive === 'first') {
        chain.push(`${directive}("${propertyName}")`);
      } else {
        chain.push(directive);
      }
    }
  }

  if (useSingleResults) {
    const propertyName = operation.selectionSet.selections[0].name.value;
    chain.push(`unpackSingleResults("${propertyName}")`);
  }
  return chain;
};

const isSingleResultOperation = (operation, config) => {
  if (config.autoSingleResult === undefined || config.autoSingleResult === true) {
    return operation.selectionSet.selections.length === 1;
  }
  return operation.directives.some(d => d.name.value === 'singleResult');
};

module.exports = { getFunctionChain, isSingleResultOperation };
