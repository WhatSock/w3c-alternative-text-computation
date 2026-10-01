const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

function createDom(html) {
  const dom = new JSDOM(html);
  return dom;
}

function runCalc(dom, el, calc) {
  return calc(el, null, false, {
    document: dom.window.document,
    getCSSText: () => ({ before: "", after: "", marker: "" }),
  });
}

function runTestWithModule(modulePath, label) {
  console.log(`Running tests for ${label} (${modulePath})...`);
  delete require.cache[require.resolve(modulePath)];
  const { calcNames } = require(modulePath);

  // 1. Issue #19 reproduction: inline child node inside visibility:hidden labelledby target
  {
    const dom = createDom(`
      <img src="foo.jpg" id="test" alt="test" aria-labelledby="t1">
      <div id="t1" style="visibility:hidden"><span>foo</span></div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "foo", "Issue #19: children of hidden elements exposed through labelledby");
  }

  // 2. Direct text node child inside visibility:hidden
  {
    const dom = createDom(`
      <img src="foo.jpg" id="test" alt="test" aria-labelledby="t1">
      <div id="t1" style="visibility:hidden">foo</div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "foo", "Direct text node in hidden labelledby target");
  }

  // 3. Multiple nested elements inside visibility:hidden
  {
    const dom = createDom(`
      <img src="foo.jpg" id="test" alt="test" aria-labelledby="t1">
      <div id="t1" style="visibility:hidden"><div><span>foo</span> <b>bar</b></div></div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "foo bar", "Nested elements in hidden labelledby target");
  }

  // 4. Deeply nested inline nodes in visibility:hidden
  {
    const dom = createDom(`
      <img src="foo.jpg" id="test" alt="test" aria-labelledby="t1">
      <div id="t1" style="visibility:hidden"><span><span><span>deep text</span></span></span></div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "deep text", "Deeply nested inline nodes in hidden labelledby target");
  }

  // 5. Children of display:none labelledby target
  {
    const dom = createDom(`
      <img src="foo.jpg" id="test" alt="test" aria-labelledby="t1">
      <div id="t1" style="display:none"><span>foo</span></div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "foo", "Child node in display:none labelledby target");
  }

  // 6. Target element inside hidden ancestor container with class="hidden" (display: none)
  {
    const dom = createDom(`
      <style>.hidden { display: none; }</style>
      <img src="foo.jpg" id="test" alt="test" aria-labelledby="t1">
      <div class="hidden"><div id="t1"><span>foo</span></div></div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "foo", "Child node in element inside hidden container");
  }

  // 7. Target element inside hidden ancestor container with visibility:hidden
  {
    const dom = createDom(`
      <img src="foo.jpg" id="test" alt="test" aria-labelledby="t1">
      <div style="visibility:hidden"><div id="t1"><span>foo</span></div></div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "foo", "Child node in element inside visibility:hidden container");
  }

  // 8. Element with hidden attribute
  {
    const dom = createDom(`
      <img src="foo.jpg" id="test" alt="test" aria-labelledby="t1">
      <div id="t1" hidden><span>foo</span></div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "foo", "Child node in element with hidden attribute");
  }

  // 9. Element with aria-hidden="true"
  {
    const dom = createDom(`
      <img src="foo.jpg" id="test" alt="test" aria-labelledby="t1">
      <div id="t1" aria-hidden="true"><span>foo</span></div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "foo", "Child node in element with aria-hidden=true");
  }

  // 10. Visible labelledby target with hidden child (must exclude hidden child)
  {
    const dom = createDom(`
      <button id="test" aria-labelledby="t1"></button>
      <div id="t1"><span>visible</span> <span style="visibility:hidden">hidden</span> <span style="display:none">secret</span> <span aria-hidden="true">private</span></div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "visible", "Visible labelledby target excludes hidden children");
  }

  // 11. Multiple labelledby targets (one hidden with children, one visible with children)
  {
    const dom = createDom(`
      <button id="test" aria-labelledby="t1 t2"></button>
      <div id="t1" style="visibility:hidden"><span>hello</span></div>
      <div id="t2"><span>world</span></div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "hello world", "Multiple labelledby targets with hidden child traversal");
  }

  // 12. Self-referencing labelledby target alongside hidden element with children
  {
    const dom = createDom(`
      <button id="test" aria-labelledby="test t1">self</button>
      <div id="t1" style="visibility:hidden"><span>foo</span></div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "self foo", "Self-referencing element with hidden labelledby child traversal");
  }

  // 13. Nested element with aria-label inside hidden labelledby target
  {
    const dom = createDom(`
      <img src="foo.jpg" id="test" alt="test" aria-labelledby="t1">
      <div id="t1" style="visibility:hidden"><span aria-label="override">ignored text</span></div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "override", "Nested aria-label inside hidden labelledby target");
  }

  // 14. Nested SVG with title inside hidden labelledby target
  {
    const dom = createDom(`
      <button id="test" aria-labelledby="t1"></button>
      <div id="t1" style="visibility:hidden"><svg><title>svg icon</title></svg></div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "svg icon", "Nested SVG title inside hidden labelledby target");
  }

  // 15. Nested list elements inside hidden labelledby target
  {
    const dom = createDom(`
      <button id="test" aria-labelledby="t1"></button>
      <div id="t1" style="visibility:hidden"><ul><li>first</li><li>second</li></ul></div>
    `);
    const res = runCalc(dom, dom.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res.name, "first second", "Nested list items inside hidden labelledby target");
  }

  // 16. Verify newly created test files
  {
    const f1 = path.join(__dirname, "docs/Name and Description Tests/form field with aria-labelledby + hidden.html");
    const html1 = fs.readFileSync(f1, "utf8");
    const dom1 = createDom(html1);
    const res1 = runCalc(dom1, dom1.window.document.getElementById("focusableElId"), calcNames);
    assert.strictEqual(res1.name, "foo", "Test file: form field with aria-labelledby + hidden.html");

    const f2 = path.join(__dirname, "docs/Proposed Name and Description Tests/Name labelledby-hidden-children.html");
    const html2 = fs.readFileSync(f2, "utf8");
    const dom2 = createDom(html2);
    const res2 = runCalc(dom2, dom2.window.document.getElementById("test"), calcNames);
    assert.strictEqual(res2.name, "hello world", "Test file: Name labelledby-hidden-children.html");
  }

  console.log(`All specific tests passed for ${label}.`);
}

function runW3CTestSuite(modulePath) {
  console.log(`Running regression check across W3C Autogenerated Testable Statements using ${modulePath}...`);
  delete require.cache[require.resolve(modulePath)];
  const { calcNames } = require(modulePath);
  const dir = path.join(__dirname, "docs/Autogenerated AccName 1.1 Testable Statements - W3C");
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".html"));

  let tested = 0;
  for (const file of files) {
    const html = fs.readFileSync(path.join(dir, file), "utf8");
    const dom = createDom(html);
    const el = dom.window.document.getElementById("test");
    if (el) {
      const res = runCalc(dom, el, calcNames);
      assert.strictEqual(typeof res.name, "string");
      assert.strictEqual(typeof res.desc, "string");
      tested++;
    }
  }
  console.log(`Successfully verified ${tested} W3C testable statement files with zero errors.`);
}

const recursionJs = "./docs/Sample JavaScript Recursion Algorithm/recursion.js";
const recursionMinJs = "./docs/Sample JavaScript Recursion Algorithm/recursion.min.js";

runTestWithModule(recursionJs, "recursion.js");
runTestWithModule(recursionMinJs, "recursion.min.js");
runW3CTestSuite(recursionJs);

console.log("\nAll test suites passed cleanly!");
