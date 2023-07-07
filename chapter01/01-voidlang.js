import { setup } from '../book.js';

const { test, assert } = setup('chapter01');

function compileVoidLang(code) {
  if (code === '') {
    return [0, 97, 115, 109, 1, 0, 0, 0];
  } else {
    throw new Error(`Expected empty code, got: "${code}"`);
  }
}

test('compileVoidLang works for empty string', () => {
  const bytes = compileVoidLang('');
  assert.is(Array.isArray(bytes), true);
  assert.throws(() => compileVoidLang('42'));
});

function instantiateModule(arrayOfBytes) {
  // flatten the array to allow generating nested arrays
  const flatBytes = arrayOfBytes.flat(Infinity);

  return WebAssembly.instantiate(Uint8Array.from(flatBytes));
}

test('compileVoidLang result compiles to a WebAssembly object', async () => {
  const { instance, module } = await instantiateModule(compileVoidLang(''));

  assert.is(instance instanceof WebAssembly.Instance, true);
  assert.is(module instanceof WebAssembly.Module, true);
});

test.run();
