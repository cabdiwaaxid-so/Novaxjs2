const Novax = require('../index');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function testNestedLayouts() {
  const app = new Novax();
  const viewsPath = path.join(__dirname, 'views_nested');

  if (!fs.existsSync(viewsPath)) {
    fs.mkdirSync(viewsPath);
  }

  app.setViewEngine('novax', {
    viewsPath: viewsPath
  });

  const base = `
<html>
<head><title>@title</title></head>
<body>
  @yield('body')
</body>
</html>
`;

  const layout = `
@extends('base')
@section('body')
  <div class="container">
    @yield('content')
  </div>
@end
`;

  const page = `
@extends('layout')
@section('content')
  <h1>Nested Layout Content</h1>
@end
`;

  fs.writeFileSync(path.join(viewsPath, 'base.html'), base);
  fs.writeFileSync(path.join(viewsPath, 'layout.html'), layout);
  fs.writeFileSync(path.join(viewsPath, 'page.html'), page);

  console.log('--- Testing Nested Layouts ---');
  try {
    const result = await app.render('page', { title: 'Nested Test' });
    console.log('Result:\n', result);
    assert(result.includes('<title>Nested Test</title>'));
    assert(result.includes('<div class="container">'));
    assert(result.includes('<h1>Nested Layout Content</h1>'));
    console.log('✅ Nested Layout test passed!');
  } catch (err) {
    console.error('❌ Nested Layout test failed:', err);
  }
}

testNestedLayouts();
