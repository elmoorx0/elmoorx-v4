/**
 * elmoorx bench — يُشغّل benchmarks للإطار
 */
import { $state, $computed, $effect, $store, sanitize, h, renderToString } from '../runtime/core.mjs';
import { stripTypes, transformJSX, compile } from '../compiler/index.mjs';

export async function runBenchmarks() {
  console.log('\n  ✦ Elmoorx v4 — Benchmarks\n  ' + '═'.repeat(50));

  const results = [];
  const N = 10000; // ops per bench

  // 1) Signals — read
  results.push(bench('signal read (no deps)', N, () => {
    const s = $state(42);
    for (let i = 0; i < N; i++) s();
  }));

  // 2) Signals — write
  results.push(bench('signal write (no deps)', N, () => {
    const s = $state(0);
    for (let i = 0; i < N; i++) s.set(i);
  }));

  // 3) Store — read
  results.push(bench('store read (1 prop)', N, () => {
    const store = $store({ count: 0 });
    for (let i = 0; i < N; i++) store.count;
  }));

  // 4) Store — write
  results.push(bench('store write (1 prop)', N, () => {
    const store = $store({ count: 0 });
    for (let i = 0; i < N; i++) store.count = i;
  }));

  // 5) Sanitize — clean HTML
  results.push(bench('sanitize clean HTML (50b)', N, () => {
    const html = '<p>Hello <strong>world</strong></p>';
    for (let i = 0; i < N; i++) sanitize(html);
  }));

  // 6) Sanitize — XSS
  results.push(bench('sanitize XSS payload (130b)', N, () => {
    const html = '<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">x</a>';
    for (let i = 0; i < N; i++) sanitize(html);
  }));

  // 7) h() — vdom creation
  results.push(bench('h() vdom creation', N, () => {
    for (let i = 0; i < N; i++) {
      h('div', { id: 'test', class: 'box' }, 'hello', h('span', null, 'world'));
    }
  }));

  // 8) renderToString
  results.push(bench('renderToString (small)', N, () => {
    const vdom = h('div', { class: 'container' },
      h('h1', null, 'Title'),
      h('p', null, 'Content'),
      h('ul', null, [1, 2, 3].map(i => h('li', { key: i }, String(i))))
    );
    for (let i = 0; i < N; i++) renderToString(vdom);
  }));

  // 9) Compiler — stripTypes
  results.push(bench('compiler stripTypes (1KB)', 1000, () => {
    const code = `
interface User { name: string; age: number; email: string }
type Status = 'active' | 'inactive';
function getUser(id: number): User {
  const user = { name: 'Ali', age: 30, email: 'a@b.com' } as User;
  return user;
}
const users: User[] = [getUser(1), getUser(2)];
`;
    for (let i = 0; i < 1000; i++) stripTypes(code);
  }));

  // 10) Compiler — transformJSX
  results.push(bench('compiler transformJSX (500b)', 1000, () => {
    const code = `const el = <div className="container"><h1 id="title">Hello</h1><p>World</p></div>;`;
    for (let i = 0; i < 1000; i++) transformJSX(code);
  }));

  // النتائج
  console.log('\n  ' + '─'.repeat(50));
  console.log('  النتائج:\n');
  for (const r of results) {
    const opsPerSec = r.elapsed > 0 ? Math.round(r.iterations / r.elapsed * 1000) : 0;
    const opsFormatted = opsPerSec.toLocaleString();
    console.log(`  ${r.name.padEnd(40)} ${opsFormatted.padStart(15)} ops/s`);
  }
  console.log('\n  ' + '═'.repeat(50) + '\n');

  return results;
}

function bench(name, iterations, fn) {
  // warmup
  for (let i = 0; i < 3; i++) {
    try { fn(); } catch {}
  }

  const start = performance.now();
  fn();
  const elapsed = performance.now() - start;

  return { name, iterations, elapsed };
}
