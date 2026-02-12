const Novax = require('../index');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function runTests() {
  const app = new Novax();
  const viewsPath = path.join(__dirname, 'views');

  if (!fs.existsSync(viewsPath)) {
    fs.mkdirSync(viewsPath);
  }

  app.setViewEngine('novax', {
    viewsPath: viewsPath
  });

  const tests = [
    {
      name: 'Basic Variable',
      template: 'Hello @name!',
      data: { name: 'World' },
      expected: 'Hello World!'
    },
    {
      name: 'Nested Objects',
      template: 'User: @user.name (@user.email)',
      data: { user: { name: 'Alice', email: 'alice@example.com' } },
      expected: 'User: Alice (alice@example.com)'
    },
    {
      name: 'Simple IF',
      template: '@if(show)Yes@end',
      data: { show: true },
      expected: 'Yes'
    },
    {
      name: 'IF/ELSE',
      template: '@if(show)Yes@else No@end',
      data: { show: false },
      expected: ' No'
    },
    {
      name: 'Nested IF (Current Fail)',
      template: '@if(outer)Outer @if(inner)Inner@end@end',
      data: { outer: true, inner: true },
      expected: 'Outer Inner'
    },
    {
      name: 'Simple EACH',
      template: '@each(item in items)@item @end',
      data: { items: [1, 2, 3] },
      expected: '1 2 3 '
    },
    {
      name: 'Nested EACH (Current Fail)',
      template: '@each(i in outer)@i:@each(j in inner)@j@end @end',
      data: { outer: ['A', 'B'], inner: [1, 2] },
      expected: 'A:12 B:12 '
    },
    {
      name: 'Destructuring @var',
      template: '@var {name, age} = user;Name: @name, Age: @age',
      data: { user: { name: 'Bob', age: 30 } },
      expected: 'Name: Bob, Age: 30'
    },
    {
      name: 'Include',
      template: '@include("partial.html", {val: "test"})',
      partials: { 'partial.html': 'Value: @val' },
      data: {},
      expected: 'Value: test'
    },
    {
      name: 'Comments',
      template: 'Hello@# comment #@ World',
      data: {},
      expected: 'Hello World'
    },
    {
      name: 'Filters',
      template: 'Hello @name|toUpperCase!',
      data: { name: 'world' },
      expected: 'Hello WORLD!'
    },
    {
      name: 'isFirst/isLast',
      template: '@each(i in items)@i(@isFirst,@isLast)@end',
      data: { items: [1, 2] },
      expected: '1(true,false)2(false,true)'
    },
    {
      name: 'JSON Filter',
      template: 'Data: @obj|json',
      data: { obj: { a: 1 } },
      expected: 'Data: {"a":1}'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    if (t.partials) {
      for (const [name, content] of Object.entries(t.partials)) {
        fs.writeFileSync(path.join(viewsPath, name), content);
      }
    }

    const templateName = t.name.replace(/[\s\/]+/g, '_').toLowerCase();
    fs.writeFileSync(path.join(viewsPath, `${templateName}.html`), t.template);

    try {
      const result = await app.render(templateName, t.data);
      assert.strictEqual(result.trim(), t.expected.trim());
      console.log(`✅ ${t.name}`);
      passed++;
    } catch (err) {
      console.log(`❌ ${t.name}`);
      console.log(`   Expected: ${t.expected}`);
      console.log(`   Actual:   ${err.actual || err.message}`);
      failed++;
    }
  }

  console.log(`\nTests finished: ${passed} passed, ${failed} failed.`);
}

runTests().catch(console.error);
