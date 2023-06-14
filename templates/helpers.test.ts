import { first, get } from './helpers';

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
  test('first product', () => {
    const data = { products: [] as any[] };

    expect(first('products')(data)).toBeUndefined();
  });

  test('first product', () => {
    const data = { products: [{ id: 'abc' }, { id: 'def' }] };

    expect(first('products')(data)).toBe(data.products[0]);
  });
});
