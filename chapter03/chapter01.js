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

function stringToBytes(s) {
  return Array.from(s).map((c) => c.charCodeAt(0));
}

function int32ToBytes(v) {
  return [v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff];
}

function magic() {
  // [0x00, 0x61, 0x73, 0x6d]
  return stringToBytes('\0asm');
}

function version() {
  // [0x01, 0x00, 0x00, 0x00]
  return int32ToBytes(1);
}

function u32(v) {
  if (v <= 127) {
    return [v];
  } else {
    throw new Error('Not Implemented');
  }
}

function vec(bytes0) {
  const bytes = bytes0.flat(Infinity);
  return [u32(bytes.length), ...bytes];
}

function section(id, entries) {
  const entryCount = entries.length;
  const bytes = vec([u32(entryCount), entries]);
  return [id, bytes];
}

const SECTION_ID_TYPE = 1;

const TYPE_FUNCTION = 0x60;

function resulttype(types) {
  return vec(types);
}

function functype(parameters, resulttypes) {
  return [TYPE_FUNCTION, resulttype(parameters), resulttype(resulttypes)];
}

function typesec(functypes) {
  return section(SECTION_ID_TYPE, functypes);
}

const SECTION_ID_FUNCTION = 3;

function idx(x) {
  return u32(x);
}

const typeidx = idx;

function funcsec(typeidxs) {
  return section(SECTION_ID_FUNCTION, typeidxs);
}

const SECTION_ID_CODE = 10;

const instr = {};
instr.end = () => 11;

function code(func) {
  return vec(func);
}

function func(locals, expr) {
  return [vec(locals), expr];
}

function codesec(codes) {
  return section(SECTION_ID_CODE, codes);
}

function compileNopLang(source) {
  if (source === '') {
    return [
      magic(),
      version(),
      typesec([functype([], [])]),
      funcsec([typeidx(0)]),
      codesec([code(func([], [instr.end()]))]),
    ];
  } else {
    throw new Error(`Expected empty code, got: "${source}"`);
  }
}

test('compileNopLang compiles to a wasm module', async () => {
  const { instance, module } = await instantiateModule(compileNopLang(''));

  assert.is(instance instanceof WebAssembly.Instance, true);
  assert.is(module instanceof WebAssembly.Module, true);
});

const SECTION_ID_EXPORT = 7;

function name(s) {
  return vec(stringToBytes(s));
}

function export_(nm, exportdesc) {
  return [name(nm), exportdesc];
}

function exportsec(exports) {
  return section(SECTION_ID_EXPORT, exports);
}

const funcidx = idx;

const exportdesc = {
  funcidx(v) {
    return [0x00, funcidx(v)];
  },
};

function module(sections) {
  return [magic(), version(), sections];
}

function compileNopLangExport(source) {
  if (source !== '') {
    throw new Error(`Expected empty code, got: "${source}"`);
  }

  return module([
    typesec([functype([], [])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.funcidx(0))]),
    codesec([code(func([], [instr.end()]))]),
  ]);
}

test('compileNopLang result compiles to a wasm module', async () => {
  const { instance } = await instantiateModule(compileNopLangExport(''));

  assert.is(instance.exports.main(), undefined);
  assert.throws(() => compileNopLangExport('42'));
});

function i32(v) {
  if (v <= 63) {
    return [v];
  } else {
    throw new Error('Not Implemented');
  }
}

const numtype = {
  i32() {
    return 0x7f;
  },
};

instr.nop = () => 0x01;
// Bytecode instruction to emit a literal i32 value
i32.const = (v) => [0x41, i32(v)];

function compileConstLang(source) {
  const value = Number.parseInt(source, 10);
  if (!Number.isInteger(value)) {
    throw new Error(`Expected an integer, got: "${source}"`);
  }

  return module([
    typesec([functype([], [numtype.i32()])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.funcidx(0))]),
    codesec([code(func([], [i32.const(value), instr.nop(), instr.end()]))]),
  ]);
}

function compileSplitLang(source) {
  const instrNames = {
    nop: 0x01,
    end: 11,
    'i32.const': 0x41,
    'i32.add': 0x6a,
    'i32.sub': 0x6b,
  };

  const instructions = source
    .trim()
    .split(/\s+/g)
    .map((token) => {
      const value = Number.parseInt(token, 10);
      if (Number.isFinite(value)) {
        return i32(value);
      } else if (instrNames[token]) {
        return instrNames[token];
      } else {
        throw new Error(`Expected integer or instruction, got: "${token}"`);
      }
    })
    .flat(Infinity);

  return module([
    typesec([functype([], [numtype.i32()])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.funcidx(0))]),
    codesec([code(func([], instructions))]),
  ]);
}

function compileSplitLang1(source) {
  const instrNames = {
    nop: 0x01,
    end: 11,
    'i32.add': 0x6a,
    'i32.sub': 0x6b,
  };

  const instructions = source
    .trim()
    .split(/\s+/g)
    .map((token) => {
      const value = Number.parseInt(token, 10);
      if (Number.isFinite(value)) {
        return [0x41, i32(value)];
      } else if (instrNames[token]) {
        return instrNames[token];
      } else {
        throw new Error(`Expected integer or instruction, got: "${token}"`);
      }
    })
    .flat(Infinity);

  return module([
    typesec([functype([], [numtype.i32()])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.funcidx(0))]),
    codesec([code(func([], instructions))]),
  ]);
}

function compileSplitLang2(source) {
  const instrNames = {
    nop: 0x01,
    end: 11,
    '+': 0x6a,
    '-': 0x6b,
  };

  const instructions = source
    .trim()
    .split(/\s+/g)
    .map((token) => {
      const value = Number.parseInt(token, 10);
      if (Number.isFinite(value)) {
        return [0x41, i32(value)];
      } else if (instrNames[token]) {
        return instrNames[token];
      } else {
        throw new Error(`Expected integer or instruction, got: "${token}"`);
      }
    })
    .flat(Infinity);

  instructions.push(instrNames.end);

  return module([
    typesec([functype([], [numtype.i32()])]),
    funcsec([typeidx(0)]),
    exportsec([export_('main', exportdesc.funcidx(0))]),
    codesec([code(func([], instructions))]),
  ]);
}

export {
  code,
  codesec,
  export_,
  exportdesc,
  exportsec,
  func,
  funcidx,
  funcsec,
  functype,
  instantiateModule,
  instr,
  int32ToBytes,
  magic,
  module,
  name,
  resulttype,
  section,
  SECTION_ID_CODE,
  SECTION_ID_EXPORT,
  SECTION_ID_FUNCTION,
  SECTION_ID_TYPE,
  setup,
  stringToBytes,
  typeidx,
  typesec,
  u32,
  vec,
  version,
};
