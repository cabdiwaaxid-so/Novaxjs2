const Novax = require('../index');
const fs = require('fs');
const path = require('path');

async function runTests() {
  const app = new Novax();
  const viewsPath = path.join(__dirname, 'views');

  if (!fs.existsSync(viewsPath)) {
    fs.mkdirSync(viewsPath);
  }

  app.setViewEngine('novax', {
    viewsPath: viewsPath
  });

  console.log('--- Running Nested IF Test ---');
  const nestedIfTemplate = `
@if(outer)
  Outer Content
  @if(inner)
    Inner Content
  @end
@end
`;
  fs.writeFileSync(path.join(viewsPath, 'nested_if.html'), nestedIfTemplate);

  try {
    const result1 = await app.render('nested_if', { outer: true, inner: true });
    console.log('Result (outer=true, inner=true):', result1.trim());

    const result2 = await app.render('nested_if', { outer: true, inner: false });
    console.log('Result (outer=true, inner=false):', result2.trim());
  } catch (err) {
    console.error('Test failed:', err);
  }

  console.log('\n--- Running Nested EACH Test ---');
  const nestedEachTemplate = `
@each(i in items)
  Item @i:
  @each(j in subitems)
    - Subitem @j
  @end
@end
`;
  fs.writeFileSync(path.join(viewsPath, 'nested_each.html'), nestedEachTemplate);

  try {
    const result3 = await app.render('nested_each', {
      items: [1, 2],
      subitems: ['A', 'B']
    });
    console.log('Result nested each:\n', result3.trim());
  } catch (err) {
    console.error('Test failed:', err);
  }
}

runTests();
