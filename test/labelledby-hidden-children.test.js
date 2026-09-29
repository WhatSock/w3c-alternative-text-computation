const { test, describe } = require("node:test");
const assert = require("node:assert");

function setupEnvironment(jsPath) {
  // Clear any existing cached module
  delete require.cache[require.resolve(jsPath)];

  function createElement(tag, attrs = {}, children = [], style = {}) {
    const el = {
      nodeType: 1,
      nodeName: tag.toUpperCase(),
      attributes: { ...attrs },
      style: { ...style },
      getAttribute(name) {
        return this.attributes[name] !== undefined ? this.attributes[name] : null;
      },
      setAttribute(name, value) {
        this.attributes[name] = String(value);
      },
      hasAttribute(name) {
        return this.attributes[name] !== undefined;
      },
      childNodes: [...children],
      parentNode: null,
    };
    for (const child of el.childNodes) {
      child.parentNode = el;
    }
    Object.defineProperty(el, "firstChild", {
      get() {
        return this.childNodes[0] || null;
      },
    });
    Object.defineProperty(el, "nextSibling", {
      get() {
        if (!this.parentNode) return null;
        const idx = this.parentNode.childNodes.indexOf(this);
        return this.parentNode.childNodes[idx + 1] || null;
      },
    });
    return el;
  }

  function createText(text) {
    const node = {
      nodeType: 3,
      nodeName: "#text",
      data: text,
      parentNode: null,
    };
    Object.defineProperty(node, "firstChild", {
      get() {
        return null;
      },
    });
    Object.defineProperty(node, "nextSibling", {
      get() {
        if (!this.parentNode) return null;
        const idx = this.parentNode.childNodes.indexOf(this);
        return this.parentNode.childNodes[idx + 1] || null;
      },
    });
    return node;
  }

  const doc = {
    elements: {},
    getElementById(id) {
      return this.elements[id] || null;
    },
    body: createElement("body"),
    defaultView: {
      getComputedStyle: (n) => ({
        getPropertyValue: (prop) => (n.style && n.style[prop]) || "",
        ...n.style,
      }),
    },
    querySelectorAll: () => [],
  };

  global.window = global;
  global.document = doc;
  const mod = require(jsPath);

  function registerElement(el) {
    if (el.attributes && el.attributes.id) {
      doc.elements[el.attributes.id] = el;
    }
    for (const child of el.childNodes || []) {
      registerElement(child);
    }
  }

  function appendToBody(...elements) {
    for (const el of elements) {
      doc.body.childNodes.push(el);
      el.parentNode = doc.body;
      registerElement(el);
    }
  }

  return { createElement, createText, doc, mod, appendToBody };
}

for (const [suiteName, jsFile] of [
  ["recursion.js", "../docs/Sample JavaScript Recursion Algorithm/recursion.js"],
  ["recursion.min.js", "../docs/Sample JavaScript Recursion Algorithm/recursion.min.js"],
]) {
  describe(`Accessible Name Computation - ${suiteName}`, () => {
    test("Issue #19: referenced visibility:hidden element with child span returns full text", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const img = createElement("img", { id: "test", alt: "test", "aria-labelledby": "t1" });
      const span = createElement("span", {}, [createText("foo")], { visibility: "hidden" });
      const t1 = createElement("div", { id: "t1" }, [span], { visibility: "hidden" });
      appendToBody(img, t1);

      const props = mod.calcNames(img, null, false, { document: doc });
      assert.strictEqual(props.name, "foo");
    });

    test("referenced visibility:hidden element with direct text child returns full text", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const img = createElement("img", { id: "test", alt: "test", "aria-labelledby": "t1" });
      const t1 = createElement("div", { id: "t1" }, [createText("foo")], { visibility: "hidden" });
      appendToBody(img, t1);

      const props = mod.calcNames(img, null, false, { document: doc });
      assert.strictEqual(props.name, "foo");
    });

    test("referenced display:none element with multiple child spans returns concatenated text", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const img = createElement("img", { id: "test", alt: "test", "aria-labelledby": "t2" });
      const span1 = createElement("span", {}, [createText("Hello ")], { display: "none" });
      const span2 = createElement("span", {}, [createText("World")], { display: "none" });
      const t2 = createElement("div", { id: "t2" }, [span1, span2], { display: "none" });
      appendToBody(img, t2);

      const props = mod.calcNames(img, null, false, { document: doc });
      assert.strictEqual(props.name, "Hello World");
    });

    test("referenced element inside a display:none container traverses children", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const btn = createElement("button", { id: "btn", "aria-labelledby": "t3" });
      const span = createElement("span", {}, [createText("inside hidden container")]);
      const t3 = createElement("div", { id: "t3" }, [span]);
      const container = createElement("div", { class: "hidden" }, [t3], { display: "none" });
      appendToBody(btn, container);

      const props = mod.calcNames(btn, null, false, { document: doc });
      assert.strictEqual(props.name, "inside hidden container");
    });

    test("referenced element with hidden attribute traverses children", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const btn = createElement("button", { id: "btn", "aria-labelledby": "t4" });
      const span = createElement("span", {}, [createText("attribute hidden text")]);
      const t4 = createElement("div", { id: "t4", hidden: "hidden" }, [span]);
      appendToBody(btn, t4);

      const props = mod.calcNames(btn, null, false, { document: doc });
      assert.strictEqual(props.name, "attribute hidden text");
    });

    test("referenced element with aria-hidden=true traverses children", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const btn = createElement("button", { id: "btn", "aria-labelledby": "t5" });
      const span = createElement("span", {}, [createText("aria hidden text")]);
      const t5 = createElement("div", { id: "t5", "aria-hidden": "true" }, [span]);
      appendToBody(btn, t5);

      const props = mod.calcNames(btn, null, false, { document: doc });
      assert.strictEqual(props.name, "aria hidden text");
    });

    test("deeply nested elements in hidden referenced element return full text", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const btn = createElement("button", { id: "btn", "aria-labelledby": "t6" });
      const spanInner = createElement("span", {}, [createText("Deep")]);
      const spanMid = createElement("span", {}, [spanInner]);
      const p = createElement("p", {}, [spanMid, createText(" text")]);
      const divWrap = createElement("div", {}, [p]);
      const t6 = createElement("div", { id: "t6" }, [divWrap], { display: "none" });
      appendToBody(btn, t6);

      const props = mod.calcNames(btn, null, false, { document: doc });
      assert.strictEqual(props.name, "Deep text");
    });

    test("visible referenced element with hidden child does NOT expose hidden child", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const btn = createElement("button", { id: "btn", "aria-labelledby": "t7" });
      const spanVis = createElement("span", {}, [createText("visible text")]);
      const spanHid = createElement("span", {}, [createText("hidden text")], { display: "none" });
      const t7 = createElement("div", { id: "t7" }, [spanVis, spanHid]);
      appendToBody(btn, t7);

      const props = mod.calcNames(btn, null, false, { document: doc });
      assert.strictEqual(props.name, "visible text");
    });

    test("aria-describedby referencing a hidden element extracts full description from child spans", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const inp = createElement("input", { id: "inp", type: "text", "aria-describedby": "desc" });
      const span1 = createElement("span", {}, [createText("Helpful ")], { display: "none" });
      const span2 = createElement("span", {}, [createText("description")], { display: "none" });
      const descDiv = createElement("div", { id: "desc" }, [span1, span2], { display: "none" });
      appendToBody(inp, descDiv);

      const props = mod.calcNames(inp, null, false, { document: doc });
      assert.strictEqual(props.desc, "Helpful description");
    });

    test("aria-describedby referencing a visible element with hidden child does NOT expose hidden child", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const inp = createElement("input", { id: "inp", type: "text", "aria-describedby": "desc2" });
      const span1 = createElement("span", {}, [createText("secret ")], { display: "none" });
      const span2 = createElement("span", {}, [createText("public description")]);
      const descDiv = createElement("div", { id: "desc2" }, [span1, span2]);
      appendToBody(inp, descDiv);

      const props = mod.calcNames(inp, null, false, { document: doc });
      assert.strictEqual(props.desc, "public description");
    });
  });
}
