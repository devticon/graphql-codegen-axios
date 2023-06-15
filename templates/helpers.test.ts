import { first, firstOrFail, get, singleResult } from './helpers';

describe('get', () => {
  test('get product.id', () => {
    const data = { product: { id: 'abc' } };

    expect(get('product.id', data)).toBe(data.product.id);
  });

  test('get products.X.id', () => {
    const data = { products: [{ id: 'abc' }, { id: 'def' }] };

    expect(get('products.0.id', data)).toBe(data.products[0].id);
    expect(get('products.1.id', data)).toBe(data.products[1].id);
  });
});

describe('first', () => {
  test('first of empty array', () => {
    const data = { products: [] as any[] };

    expect(first('products')(data)).toMatchObject({ products: undefined });
  });

  test('first of nested array', () => {
    const data = {
      products: [
        { id: 'abc', tags: ['a', 'b', 'c'] },
        { id: 'def', tags: ['e', 'f', 'g'] },
      ],
    };
    const result = first('products.tags')(data);

    expect(result.products[0].tags).toBe('a');
    expect(result.products[1].tags).toBe('e');
  });
});

describe('examples', () => {
  test('ProductQuery', () => {
    const data = {
      products: [
        {
          id: 'abb93227-1994-4cb0-bfce-b16c40d3bd0d',
          categories: [{ id: '9b0fc003-6894-477a-87b3-0fd8e8165bd0' }, { id: 'a7a3336f-8aa6-481f-a89e-38df33651b63' }],
        },
      ],
    };

    firstOrFail('products')(data);
    first('products.categories')(data);
    singleResult('products')(data);

    expect(data).toBeDefined();
  });
});
