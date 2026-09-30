const { test, describe } = require("node:test");
const assert = require("node:assert");

function setupEnvironment(jsPath) {
  // Clear any existing cached module
  delete require.cache[require.resolve(jsPath)];

  function createElement(tag, attrs = {}, children = [], style = {}) {
    const el = {
      nodeType: 1,
      nodeName: tag.toUpperCase(),
      id: attrs.id || "",
      value: attrs.value !== undefined ? attrs.value : "",
      attributes: { ...attrs },
      style: { ...style },
      childNodes: [...children],
      parentNode: null,
      getAttribute(name) {
        if (name === "value" && this.value !== undefined) {
          return this.value;
        }
        return this.attributes[name] !== undefined ? this.attributes[name] : null;
      },
      setAttribute(name, value) {
        this.attributes[name] = String(value);
        if (name === "value") {
          this.value = String(value);
        }
      },
      hasAttribute(name) {
        return this.attributes[name] !== undefined;
      },
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

    Object.defineProperty(el, "textContent", {
      get() {
        return this.childNodes
          .map((c) => (c.nodeType === 3 ? c.data : c.textContent || ""))
          .join("");
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

    Object.defineProperty(node, "textContent", {
      get() {
        return this.data;
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
    querySelectorAll(selector) {
      const results = [];
      function search(node) {
        for (const child of node.childNodes || []) {
          if (child.nodeType === 1) {
            if (selector === "label" && child.nodeName.toLowerCase() === "label") {
              results.push(child);
            }
            search(child);
          }
        }
      }
      search(this.body);
      return results;
    },
  };

  global.window = global;
  global.document = doc;
  const mod = require(jsPath);

  function registerElement(el) {
    if (el.id) {
      doc.elements[el.id] = el;
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
  describe(`Step 2E Embedded Control Role Check - ${suiteName}`, () => {
    test("Issue #18: Embedded input with role=presentation and aria-labelledby resolves aria-labelledby instead of input value", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const testInput = createElement("input", { id: "test" });
      const embeddedInput = createElement("input", {
        value: "value",
        "aria-labelledby": "aria",
        disabled: "disabled",
        role: "presentation",
      });
      const label = createElement("label", { for: "test" }, [
        createText("before\n"),
        embeddedInput,
        createText("\nafter"),
      ]);
      const ariaDiv = createElement("div", { id: "aria" }, [createText("aria-labelledby")]);
      appendToBody(testInput, label, ariaDiv);

      const props = mod.calcNames(testInput, null, false, { document: doc });
      assert.strictEqual(props.name, "before aria-labelledby after");
    });

    test("Issue #18: Embedded input with role=none and aria-labelledby resolves aria-labelledby instead of input value", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const testInput = createElement("input", { id: "test" });
      const embeddedInput = createElement("input", {
        value: "value",
        "aria-labelledby": "aria",
        disabled: "disabled",
        role: "none",
      });
      const label = createElement("label", { for: "test" }, [
        createText("before\n"),
        embeddedInput,
        createText("\nafter"),
      ]);
      const ariaDiv = createElement("div", { id: "aria" }, [createText("aria-labelledby")]);
      appendToBody(testInput, label, ariaDiv);

      const props = mod.calcNames(testInput, null, false, { document: doc });
      assert.strictEqual(props.name, "before aria-labelledby after");
    });

    test("Normal embedded input without presentation role resolves its value under Step 2E", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const testInput = createElement("input", { id: "test" });
      const embeddedInput = createElement("input", { value: "value" });
      const label = createElement("label", { for: "test" }, [
        createText("before\n"),
        embeddedInput,
        createText("\nafter"),
      ]);
      appendToBody(testInput, label);

      const props = mod.calcNames(testInput, null, false, { document: doc });
      assert.strictEqual(props.name, "before value after");
    });

    test("Normal embedded input with aria-labelledby still resolves its value under Step 2E", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const testInput = createElement("input", { id: "test" });
      const embeddedInput = createElement("input", {
        value: "value",
        "aria-labelledby": "aria",
      });
      const label = createElement("label", { for: "test" }, [
        createText("before\n"),
        embeddedInput,
        createText("\nafter"),
      ]);
      const ariaDiv = createElement("div", { id: "aria" }, [createText("aria-labelledby")]);
      appendToBody(testInput, label, ariaDiv);

      const props = mod.calcNames(testInput, null, false, { document: doc });
      assert.strictEqual(props.name, "before value after");
    });

    test("Embedded input with role=presentation and no aria-labelledby does not use input value", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const testInput = createElement("input", { id: "test" });
      const embeddedInput = createElement("input", {
        value: "value",
        disabled: "disabled",
        role: "presentation",
      });
      const label = createElement("label", { for: "test" }, [
        createText("before\n"),
        embeddedInput,
        createText("\nafter"),
      ]);
      appendToBody(testInput, label);

      const props = mod.calcNames(testInput, null, false, { document: doc });
      assert.strictEqual(props.name, "before after");
    });

    test("Embedded textarea with role=presentation and aria-labelledby resolves aria-labelledby instead of content", () => {
      const { createElement, createText, doc, mod, appendToBody } = setupEnvironment(jsFile);
      const testInput = createElement("input", { id: "test" });
      const embeddedTextarea = createElement(
        "textarea",
        {
          "aria-labelledby": "aria",
          role: "presentation",
        },
        [createText("textarea content")]
      );
      const label = createElement("label", { for: "test" }, [
        createText("before\n"),
        embeddedTextarea,
        createText("\nafter"),
      ]);
      const ariaDiv = createElement("div", { id: "aria" }, [createText("from aria")]);
      appendToBody(testInput, label, ariaDiv);

      const props = mod.calcNames(testInput, null, false, { document: doc });
      assert.strictEqual(props.name, "before from aria after");
    });
  });
}
