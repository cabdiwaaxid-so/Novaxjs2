const Novax = require('../index');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

async function testLayouts() {
  const app = new Novax();
  const viewsPath = path.join(__dirname, 'views_layout');

  if (!fs.existsSync(viewsPath)) {
    fs.mkdirSync(viewsPath);
  }

  app.setViewEngine('novax', {
    viewsPath: viewsPath
  });

  const layout = `
<!DOCTYPE html>
<html>
<head><title>@title</title></head>
<body>
  <header>My App</header>
  <main>
    @yield('content')
  </main>
  <footer>@yield('footer')</footer>
</body>
</html>
`;

  const page = `
@extends('layout')
@section('content')
  <h1>Welcome to @name's page</h1>
@end
@section('footer')
  Contact us at @email
@end
`;

  fs.writeFileSync(path.join(viewsPath, 'layout.html'), layout);
  fs.writeFileSync(path.join(viewsPath, 'page.html'), page);

  console.log('--- Testing Layouts ---');
  try {
    const result = await app.render('page', {
      title: 'Home Page',
      name: 'Alice',
      email: 'alice@example.com'
    });

    console.log('Layout Result:\n', result);

    assert(result.includes('<title>Home Page</title>'));
    assert(result.includes('<h1>Welcome to Alice\'s page</h1>'));
    assert(result.includes('Contact us at alice@example.com'));
    assert(result.includes('<header>My App</header>'));

    console.log('✅ Layout test passed!');
  } catch (err) {
    console.error('❌ Layout test failed:', err);
  }
}

testLayouts();
