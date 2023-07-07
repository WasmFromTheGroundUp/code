import { setup } from '../book.js';

const { test, assert, ohm, extractExamples } = setup('chapter03');

const grammarDef = `
  Wafer {
    Main = Expr
    Expr = number
    number = digit+

    // Examples:
    //+ "42", "1"
    //- "abc"
  }
`;

const wafer = ohm.grammar(grammarDef);

test('Arithmetic examples', () => {
  for (const ex of extractExamples(grammarDef)) {
    const matchResult = wafer.match(ex.example, ex.rule);
    assert.is(matchResult.succeeded(), ex.shouldMatch);
  }
});

test.run();
