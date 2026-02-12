const Novax = require('../index');
const fs = require('fs');
const path = require('path');

async function benchmark() {
  const app = new Novax();
  const viewsPath = path.join(__dirname, 'views_bench');

  if (!fs.existsSync(viewsPath)) {
    fs.mkdirSync(viewsPath);
  }

  app.setViewEngine('novax', {
    viewsPath: viewsPath
  });

  const template = `
<h1>Benchmark</h1>
@each(i in items)
  <p>Item @i: @name</p>
  @if(i % 2 === 0)
    <span>Even</span>
  @else
    <span>Odd</span>
  @end
@end
`;
  fs.writeFileSync(path.join(viewsPath, 'bench.html'), template);

  const data = {
    name: 'Test',
    items: Array.from({ length: 100 }, (_, i) => i)
  };

  console.log('--- Benchmarking ---');

  // First run (compilation)
  const start1 = Date.now();
  await app.render('bench', data);
  const end1 = Date.now();
  console.log(`First run (compilation + render): ${end1 - start1}ms`);

  // Subsequent runs (cached)
  const iterations = 1000;
  const start2 = Date.now();
  for (let i = 0; i < iterations; i++) {
    await app.render('bench', data);
  }
  const end2 = Date.now();
  console.log(`${iterations} runs (cached): ${end2 - start2}ms`);
  console.log(`Average cached render time: ${(end2 - start2) / iterations}ms`);
}

benchmark();
