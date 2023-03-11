import { print } from 'graphql/index';
import { ObjectType } from './_types';

export const getUsedFragments = (raw: string, allFragments: ObjectType[], results: ObjectType[] = []) => {
  const fragments = [...raw.matchAll(/\.\.\.(\w*)$/gm)]
    .map(([_, name]) => name)
    .map(name => allFragments.find(d => d.name === name));

  for (let fragment of fragments) {
    getUsedFragments(print(fragment.type), allFragments, results);
  }
  results.push(...fragments);
  return results;
};
