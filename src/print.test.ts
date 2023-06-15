import { Directive, Operation } from './_types';
import { directivesToFunctions } from './print';

describe('print', () => {
  describe('directivesToFunctions', () => {
    test('directive functions order by path length', () => {
      expect(
        directivesToFunctions([
          {
            name: 'firstOrFail',
            path: 'products',
            args: {},
          },
          {
            name: 'first',
            path: 'products.categories',
            args: {},
          },
          {
            name: 'first',
            path: 'products.categories.tags',
            args: {},
          },
        ]),
      ).toEqual(['first("products.categories.tags")', 'first("products.categories")', 'firstOrFail("products")']);
    });
  });
});
