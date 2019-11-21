/*!
CalcNames: The AccName Computation Prototype, compute the Name and Description property values for a DOM node
Returns an object with 'name' and 'desc' properties.
Functionality mirrors the steps within the W3C Accessible Name and Description computation algorithm.
http://www.w3.org/TR/accname-aam-1.1/
Authored by Bryan Garaventa, plus refactoring contrabutions by Tobias Bengfort
https://github.com/whatsock/w3c-alternative-text-computation
Distributed under the terms of the Open Source Initiative OSI - MIT License
*/

(function() {
  var nameSpace = window.AccNamePrototypeNameSpace || window;
  if (nameSpace && typeof nameSpace === "string" && nameSpace.length) {
    window[nameSpace] = {};
    nameSpace = window[nameSpace];
  }
  nameSpace.getAccNameVersion = "2.39";
  // AccName Computation Prototype
  nameSpace.getAccName = nameSpace.calcNames = function(
    node,
    fnc,
    preventVisualARIASelfCSSRef,
    overrides
  ) {
    overrides = overrides || {};
    var docO = overrides.document || document;
    var props = { name: "", desc: "", error: "" };
    var nameFromPlaceholder = false;
    try {
      if (!node || node.nodeType !== 1) {
        return props;
      }
      var rootNode = node;

      // Track nodes to prevent duplicate node reference parsing.
      var nodes = [];
      // Track aria-owns references to prevent duplicate parsing.
      var owns = [];

      // Recursively process a DOM node to compute an accessible name in accordance with the spec
      var walk = function(
        refNode,
        stop,
        skip,
        nodesToIgnoreValues,
        skipAbort,
        ownedBy,
        skipTo
      ) {
        skipTo = skipTo || {};
        skipTo.tag = skipTo.tag || false;
        skipTo.role = skipTo.role || false;
        skipTo.go = skipTo.go || false;
        var fullResult = {
          name: "",
          title: ""
        };

        /*
  ARIA Role Exception Rule Set 1.1
  The following Role Exception Rule Set is based on the following ARIA Working Group discussion involving all relevant browser venders.
  https://lists.w3.org/Archives/Public/public-aria/2017Jun/0057.html
Plus roles extended for the Role Parity project.
  */
        var isException = function(node, refNode) {
          if (
            !refNode ||
            !node ||
            refNode.nodeType !== 1 ||
            node.nodeType !== 1
          ) {
            return false;
          }

          var inList = function(node, list) {
            var role = getRole(node);
            var tag = node.nodeName.toLowerCase();
            return (
              (role && list.roles.indexOf(role) >= 0) ||
              (!role && list.tags.indexOf(tag) >= 0)
            );
          };

          // The list3 overrides must be checked first.
          if (inList(node, list3)) {
            if (
              node === refNode &&
              !(node.id && ownedBy[node.id] && ownedBy[node.id].node)
            ) {
              return !isFocusable(node);
            } else {
              // Note: the inParent checker needs to be present to allow for embedded roles matching list3 when the referenced parent is referenced using aria-labelledby, aria-describedby, or aria-owns.
              return !(
                (inParent(node, ownedBy.top) &&
                  node.nodeName.toLowerCase() !== "select") ||
                inList(refNode, list1)
              );
            }
          }
          // Otherwise process list2 to identify roles to ignore processing name from content.
          else if (
            (inList(node, list2) ||
              (node === rootNode && !inList(node, list1))) &&
            !skipTo.go
          ) {
            return true;
          } else {
            return false;
          }
        };

        var inParent = function(node, parent) {
          var trackNodes = [];
          while (node) {
            if (
              node.id &&
              ownedBy[node.id] &&
              ownedBy[node.id].node &&
              trackNodes.indexOf(node) === -1
            ) {
              trackNodes.push(node);
              node = ownedBy[node.id].node;
            } else {
              node = node.parentNode;
            }
            if (node && node === parent) {
              return true;
            } else if (!node || node === ownedBy.top || node === docO.body) {
              return false;
            }
          }
          return false;
        };

        // Placeholder for storing CSS before and after pseudo element text values for the top level node
        var cssOP = {
          before: "",
          after: ""
        };

        if (ownedBy.ref) {
          if (isParentHidden(refNode, docO.body, true, true)) {
            // If referenced via aria-labelledby or aria-describedby, do not return a name or description if a parent node is hidden.
            return fullResult;
          } else if (isHidden(refNode, docO.body)) {
            // Otherwise, if aria-labelledby or aria-describedby reference a node that is explicitly hidden, then process all children regardless of their individual hidden states.
            var ignoreHidden = true;
          }
        }

        if (!skipTo.tag && !skipTo.role && nodes.indexOf(refNode) === -1) {
          // Store the before and after pseudo element 'content' values for the top level DOM node
          // Note: If the pseudo element includes block level styling, a space will be added, otherwise inline is asumed and no spacing is added.
          cssOP = getCSSText(refNode, null);

          // Enabled in Visual ARIA to prevent self referencing by Visual ARIA tooltips
          if (preventVisualARIASelfCSSRef) {
            if (
              cssOP.before.indexOf(" [ARIA] ") !== -1 ||
              cssOP.before.indexOf(" aria-") !== -1 ||
              cssOP.before.indexOf(" accName: ") !== -1
            )
              cssOP.before = "";
            if (
              cssOP.after.indexOf(" [ARIA] ") !== -1 ||
              cssOP.after.indexOf(" aria-") !== -1 ||
              cssOP.after.indexOf(" accDescription: ") !== -1
            )
              cssOP.after = "";
          }
        }

        // Recursively apply the same naming computation to all nodes within the referenced structure
        var walkDOM = function(node, fn, refNode) {
          var res = {
            name: "",
            title: ""
          };
          if (!node) {
            return res;
          }
          var nodeIsBlock =
            node && node.nodeType === 1 && isBlockLevelElement(node)
              ? true
              : false;
          var currentNode = node;
          var fResult = fn(node) || {};
          if (fResult.name && fResult.name.length) {
            res.name += fResult.name;
          }
          if (!fResult.skip && !isException(node, ownedBy.top)) {
            if (skipTo.go) skipTo.go = false;
            node = node.firstChild;
            while (node) {
              res.name += walkDOM(node, fn, refNode).name;
              node = node.nextSibling;
            }
          }
          res.name += fResult.owns || "";
          if (
            rootNode === currentNode &&
            refNode === currentNode &&
            !trim(res.name) &&
            trim(fResult.title)
          ) {
            res.name = addSpacing(fResult.title);
          } else if (
            rootNode === currentNode &&
            refNode === currentNode &&
            trim(fResult.title)
          ) {
            res.title = addSpacing(fResult.title);
          }
          if (
            rootNode === currentNode &&
            refNode === currentNode &&
            trim(fResult.desc)
          ) {
            res.title = addSpacing(fResult.desc);
          }
          if (
            rootNode === currentNode &&
            refNode === currentNode &&
            trim(fResult.placeholder) &&
            !trim(res.name)
          ) {
            res.name = addSpacing(fResult.placeholder);
            nameFromPlaceholder = true;
          } else if (
            rootNode === currentNode &&
            refNode === currentNode &&
            trim(fResult.placeholder) &&
            !trim(res.title)
          ) {
            res.title = addSpacing(fResult.placeholder);
          }
          if (nodeIsBlock || fResult.isWidget) {
            res.name = addSpacing(res.name);
          }
          return res;
        };

        fullResult = walkDOM(
          refNode,
          function(node) {
            var i = 0;
            var element = null;
            var ids = [];
            var parts = [];
            var result = {
              name: "",
              title: "",
              owns: "",
              skip: false
            };
            var isEmbeddedNode =
              node &&
              node.nodeType === 1 &&
              nodesToIgnoreValues &&
              nodesToIgnoreValues.length &&
              nodesToIgnoreValues.indexOf(node) !== -1 &&
              node === rootNode &&
              node !== refNode
                ? true
                : false;

            if (
              (skip ||
                !node ||
                nodes.indexOf(node) !== -1 ||
                (!ignoreHidden && isHidden(node, ownedBy.top))) &&
              !skipAbort &&
              !isEmbeddedNode
            ) {
              // Abort if algorithm step is already completed, or if node is a hidden child of refNode, or if this node has already been processed, or skip abort if aria-labelledby self references same node.
              return result;
            }

            if (!skipTo.tag && !skipTo.role && nodes.indexOf(node) === -1) {
              nodes.push(node);
            }

            // Store name for the current node.
            var name = "";
            // Store name from aria-owns references if detected.
            var ariaO = "";
            // Placeholder for storing CSS before and after pseudo element text values for the current node container element
            var cssO = {
              before: "",
              after: ""
            };

            var parent = refNode === node ? node : node.parentNode;
            if (!skipTo.tag && !skipTo.role && nodes.indexOf(parent) === -1) {
              nodes.push(parent);
              // Store the before and after pseudo element 'content' values for the current node container element
              // Note: If the pseudo element includes block level styling, a space will be added, otherwise inline is asumed and no spacing is added.
              cssO = getCSSText(parent, refNode);

              // Enabled in Visual ARIA to prevent self referencing by Visual ARIA tooltips
              if (preventVisualARIASelfCSSRef) {
                if (
                  cssO.before.indexOf(" [ARIA] ") !== -1 ||
                  cssO.before.indexOf(" aria-") !== -1 ||
                  cssO.before.indexOf(" accName: ") !== -1
                )
                  cssO.before = "";
                if (
                  cssO.after.indexOf(" [ARIA] ") !== -1 ||
                  cssO.after.indexOf(" aria-") !== -1 ||
                  cssO.after.indexOf(" accDescription: ") !== -1
                )
                  cssO.after = "";
              }
            }

            // Process standard DOM element node
            if (node.nodeType === 1) {
              var nTag = node.nodeName.toLowerCase();
              var nRole = getRole(node);
              var aLabelledby =
                (!skipTo.tag &&
                  !skipTo.role &&
                  node.getAttribute("aria-labelledby")) ||
                "";
              var aDescribedby =
                (!skipTo.tag &&
                  !skipTo.role &&
                  node.getAttribute("aria-describedby")) ||
                "";
              var aLabel =
                (!skipTo.tag &&
                  !skipTo.role &&
                  node.getAttribute("aria-label")) ||
                "";
              var nTitle =
                (!skipTo.tag && !skipTo.role && node.getAttribute("title")) ||
                "";

              var isNativeFormField = nativeFormFields.indexOf(nTag) !== -1;
              var isNativeButton = ["input"].indexOf(nTag) !== -1;
              var isRangeWidgetRole = rangeWidgetRoles.indexOf(nRole) !== -1;
              var isEditWidgetRole = editWidgetRoles.indexOf(nRole) !== -1;
              var isSelectWidgetRole = selectWidgetRoles.indexOf(nRole) !== -1;
              var isSimulatedFormField =
                isRangeWidgetRole ||
                isEditWidgetRole ||
                isSelectWidgetRole ||
                nRole === "combobox";
              var isWidgetRole =
                (isSimulatedFormField ||
                  otherWidgetRoles.indexOf(nRole) !== -1) &&
                nRole !== "link";
              result.isWidget = isNativeFormField || isWidgetRole;

              var hasName = false;
              var hasDesc = false;
              var aOwns = node.getAttribute("aria-owns") || "";
              var isSeparatChildFormField =
                !skipTo.tag &&
                !skipTo.role &&
                !isEmbeddedNode &&
                ((node !== refNode &&
                  (isNativeFormField || isSimulatedFormField)) ||
                  (node.id &&
                    ownedBy[node.id] &&
                    ownedBy[node.id].target &&
                    ownedBy[node.id].target === node))
                  ? true
                  : false;

              // Check for non-empty value of aria-describedby if current node equals reference node, follow each ID ref, then stop and process no deeper.
              if (
                !stop &&
                node === refNode &&
                !skipTo.tag &&
                !skipTo.role &&
                aDescribedby
              ) {
                var desc = "";
                ids = aDescribedby.split(/\s+/);
                parts = [];
                for (i = 0; i < ids.length; i++) {
                  element = docO.getElementById(ids[i]);
                  // Also prevent the current form field from having its value included in the naming computation if nested as a child of label
                  parts.push(
                    walk(element, true, false, [node], false, {
                      ref: ownedBy,
                      top: element
                    }).name
                  );
                }
                // Check for blank value, since whitespace chars alone are not valid as a name
                desc = trim(parts.join(" "));

                if (trim(desc)) {
                  result.desc = desc;
                  hasDesc = true;
                }
              }

              // Check for non-empty value of aria-labelledby on current node, follow each ID ref, then stop and process no deeper.
              if (!stop && !skipTo.tag && !skipTo.role && aLabelledby) {
                ids = aLabelledby.split(/\s+/);
                parts = [];
                for (i = 0; i < ids.length; i++) {
                  element = docO.getElementById(ids[i]);
                  // Also prevent the current form field from having its value included in the naming computation if nested as a child of label
                  parts.push(
                    walk(element, true, skip, [node], element === refNode, {
                      ref: ownedBy,
                      top: element
                    }).name
                  );
                }
                // Check for blank value, since whitespace chars alone are not valid as a name
                name = trim(parts.join(" "));

                if (trim(name)) {
                  hasName = true;
                  // Abort further recursion if name is valid.
                  result.skip = true;
                }
              }

              // Otherwise, if current node has a non-empty aria-label then set as name and process no deeper within the branch.
              if (
                !skipTo.tag &&
                !skipTo.role &&
                !hasName &&
                trim(aLabel) &&
                !isSeparatChildFormField
              ) {
                name = aLabel;

                // Check for blank value, since whitespace chars alone are not valid as a name
                if (trim(name)) {
                  hasName = true;
                  if (node === refNode) {
                    // If name is non-empty and both the current and refObject nodes match, then don't process any deeper within the branch.
                    skip = true;
                  }
                }
              }

              var rolePresentation =
                !skipTo.tag &&
                !skipTo.role &&
                !hasName &&
                nRole &&
                presentationRoles.indexOf(nRole) !== -1 &&
                !isFocusable(node) &&
                !hasGlobalAttr(node)
                  ? true
                  : false;

              // Otherwise, if the current node is not a nested widget control within the parent ref obj, but is instead a native markup element that includes a host-defined labelling mechanism, then set the name and description accordingly if present.
              if (!isSeparatChildFormField) {
                // Otherwise, if name is still empty and the current node matches the ref node and is a standard form field with a non-empty associated label element, process label with same naming computation algorithm.
                if (
                  !skipTo.tag &&
                  !skipTo.role &&
                  !hasName &&
                  node === refNode &&
                  isNativeFormField
                ) {
                  // Logic modified to match issue
                  // https://github.com/WhatSock/w3c-alternative-text-computation/issues/12 */
                  var labels = docO.querySelectorAll("label");
                  var lblName = "";
                  var implicitLabel = getParent(node, "label") || false;

                  for (i = 0; i < labels.length; i++) {
                    if (
                      (labels[i] === implicitLabel ||
                        labels[i].getAttribute("for") === node.id) &&
                      !isParentHidden(labels[i], docO.body, true)
                    ) {
                      lblName += addSpacing(
                        walk(labels[i], true, skip, [node], false, {
                          ref: ownedBy,
                          top: labels[i]
                        }).name
                      );
                    }
                  }

                  name = lblName;

                  if (trim(name)) {
                    hasName = true;
                  }
                }

                // Process native form field buttons in accordance with the HTML AAM
                // https://w3c.github.io/html-aam/#accessible-name-and-description-computation
                var btnType =
                  (!skipTo.tag &&
                    !skipTo.role &&
                    isNativeButton &&
                    node.getAttribute("type")) ||
                  false;
                var btnValue =
                  (!skipTo.tag &&
                    !skipTo.role &&
                    btnType &&
                    trim(node.getAttribute("value"))) ||
                  false;

                var nAlt = rolePresentation
                  ? ""
                  : trim(node.alt || node.getAttribute("alt"));

                // Otherwise, if name is still empty and current node is a standard non-presentational img or image button with a non-empty alt attribute, set alt attribute value as the accessible name.
                if (
                  !skipTo.tag &&
                  !skipTo.role &&
                  !hasName &&
                  !rolePresentation &&
                  (nTag === "img" || btnType === "image") &&
                  nAlt
                ) {
                  // Check for blank value, since whitespace chars alone are not valid as a name
                  name = trim(nAlt);
                  if (trim(name)) {
                    hasName = true;
                  }
                }

                // Process native HTML area tags to use alt as name when not explicitly set using aria-labelledby or aria-label.
                if (
                  !skipTo.tag &&
                  !skipTo.role &&
                  !hasName &&
                  !rolePresentation &&
                  nTag === "area" &&
                  nAlt
                ) {
                  // Check for blank value, since whitespace chars alone are not valid as a name
                  name = trim(nAlt);
                  if (trim(name)) {
                    hasName = true;
                  }
                }

                // Process native HTML optgroup tags to use label as name when not explicitly set using aria-labelledby or aria-label.
                if (nTag === "optgroup") {
                  if (
                    !skipTo.tag &&
                    !skipTo.role &&
                    !hasName &&
                    !rolePresentation &&
                    node.getAttribute("label")
                  ) {
                    // Check for blank value, since whitespace chars alone are not valid as a name
                    name = trim(node.getAttribute("label"));
                    if (trim(name)) {
                      hasName = true;
                    }
                  }
                  result.skip = true;
                }

                // Process the accessible names for native HTML buttons
                if (
                  !skipTo.tag &&
                  !skipTo.role &&
                  !hasName &&
                  node === refNode &&
                  btnType &&
                  ["button", "image", "submit", "reset"].indexOf(btnType) !== -1
                ) {
                  if (btnValue) {
                    name = btnValue;
                  } else {
                    switch (btnType) {
                      case "submit":
                      case "image":
                        name = "submit";
                        break;
                      case "reset":
                        name = "reset";
                        break;
                      default:
                        name = "";
                    }
                  }
                  if (trim(name)) {
                    hasName = true;
                  }
                }

                if (
                  !skipTo.tag &&
                  !skipTo.role &&
                  hasName &&
                  node === refNode &&
                  btnType &&
                  ["button", "submit", "reset"].indexOf(btnType) !== -1 &&
                  btnValue &&
                  btnValue !== name &&
                  !result.desc
                ) {
                  result.desc = btnValue;
                  hasDesc = true;
                }

                var isFieldset =
                  !skipTo.tag &&
                  !skipTo.role &&
                  !hasName &&
                  node === rootNode &&
                  (nRole === "group" ||
                    nRole === "radiogroup" ||
                    (!nRole && nTag === "fieldset"));

                // Otherwise, if name is still empty and the current node matches the root node and is a standard fieldset element with a non-empty associated legend element as the first child node, process legend with same naming computation algorithm.
                // Plus do the same for role="group" and role="radiogroup" with embedded role="legend", or a combination of these.
                if (isFieldset) {
                  var fChild =
                    firstChild(node, ["legend"], ["legend"]) || false;
                  if (fChild) {
                    name = trim(
                      walk(fChild, stop, false, [], false, {
                        ref: ownedBy,
                        top: fChild
                      }).name
                    );
                  }
                  if (trim(name)) {
                    hasName = true;
                  }
                  skip = true;
                }

                var isTable =
                  !skipTo.tag &&
                  !skipTo.role &&
                  !hasName &&
                  node === rootNode &&
                  (nRole === "table" || (!nRole && nTag === "table"));

                // Otherwise, if name is still empty and the current node matches the root node and is a standard table element with a non-empty associated caption element as the first child node, process caption with same naming computation algorithm.
                // Plus do the same for role="table" with embedded role="caption", or a combination of these.
                if (isTable) {
                  var fChild =
                    firstChild(node, ["caption"], ["caption"]) || false;
                  if (fChild) {
                    name = trim(
                      walk(fChild, stop, false, [], false, {
                        ref: ownedBy,
                        top: fChild
                      }).name
                    );
                  }
                  if (trim(name)) {
                    hasName = true;
                  }
                  skip = true;
                }

                var isFigure =
                  !skipTo.tag &&
                  !skipTo.role &&
                  !hasName &&
                  node === rootNode &&
                  (nRole === "figure" || (!nRole && nTag === "figure"));

                // Otherwise, if name is still empty and the current node matches the root node and is a standard figure element with a non-empty associated figcaption element as the first or last child node, process caption with same naming computation algorithm.
                // Plus do the same for role="figure" with embedded role="caption", or a combination of these.
                if (isFigure) {
                  var fChild =
                    firstChild(node, ["figcaption"], ["caption"]) ||
                    lastChild(node, ["figcaption"], ["caption"]) ||
                    false;
                  if (fChild) {
                    name = trim(
                      walk(fChild, stop, false, [], false, {
                        ref: ownedBy,
                        top: fChild
                      }).name
                    );
                  }
                  if (trim(name)) {
                    hasName = true;
                  }
                  skip = true;
                }

                // Otherwise, if name is still empty and the root node and the current node are the same and node is an svg element, then parse the content of the title element to set the name and the desc element to set the description.
                if (!skipTo.tag && !skipTo.role && nTag === "svg") {
                  var svgT = node.querySelector("title") || false;
                  var svgD =
                    (node === rootNode && node.querySelector("desc")) || false;
                  if (!hasName && svgT) {
                    name = trim(
                      walk(svgT, true, false, [], false, {
                        ref: ownedBy,
                        top: svgT
                      }).name
                    );
                    if (trim(name)) {
                      hasName = true;
                    }
                  }
                  if (!hasDesc && svgD) {
                    var dE = trim(
                      walk(svgD, true, false, [], false, {
                        ref: ownedBy,
                        top: svgD
                      }).name
                    );
                    if (trim(dE)) {
                      result.desc = dE;
                      hasDesc = true;
                    }
                  }
                  result.skip = true;
                }
              }

              // Otherwise, if the current node is a nested widget control within the parent ref obj, then add only its value and process no deeper within the branch.
              if (!skipTo.tag && !skipTo.role && isSeparatChildFormField) {
                // Prevent the referencing node from having its value included in the case of form control labels that contain the element with focus.
                if (
                  !(
                    nodesToIgnoreValues &&
                    nodesToIgnoreValues.length &&
                    nodesToIgnoreValues.indexOf(node) !== -1
                  )
                ) {
                  if (isRangeWidgetRole) {
                    // For range widgets, append aria-valuetext if non-empty, or aria-valuenow if non-empty, or node.value if applicable.
                    name = getObjectValue(nRole, node, true);
                  } else if (
                    isEditWidgetRole ||
                    (nRole === "combobox" && isNativeFormField)
                  ) {
                    // For simulated edit widgets, append text from content if applicable, or node.value if applicable.
                    name = getObjectValue(nRole, node, false, true);
                  } else if (isSelectWidgetRole) {
                    // For simulated select widgets, append same naming computation algorithm for all child nodes including aria-selected="true" separated by a space when multiple.
                    // Also filter nodes so that only valid child roles of relevant parent role that include aria-selected="true" are included.
                    name = getObjectValue(nRole, node, false, false, true);
                  } else if (
                    isNativeFormField &&
                    ["input", "textarea"].indexOf(nTag) !== -1 &&
                    (!isWidgetRole || isEditWidgetRole)
                  ) {
                    // For native edit fields, append node.value when applicable.
                    name = getObjectValue(
                      nRole,
                      node,
                      false,
                      false,
                      false,
                      true
                    );
                  } else if (
                    isNativeFormField &&
                    nTag === "select" &&
                    (!isWidgetRole || nRole === "combobox")
                  ) {
                    // For native select fields, get text from content for all options with selected attribute separated by a space when multiple, but don't process if another widget role is present unless it matches role="combobox".
                    // Reference: https://github.com/WhatSock/w3c-alternative-text-computation/issues/7
                    name = getObjectValue(
                      nRole,
                      node,
                      false,
                      false,
                      true,
                      true
                    );
                  }

                  // Check for blank value, since whitespace chars alone are not valid as a name
                  name = trim(name);
                }

                if (trim(name)) {
                  hasName = true;
                }
              }

              // Otherwise, if current node is the same as rootNode and is non-presentational and includes a non-empty title attribute, store title attribute value as the accessible name if name is still empty, or the description if not.
              // Processing for this is handled within the walkDOM function.
              if (
                !skipTo.tag &&
                !skipTo.role &&
                !rolePresentation &&
                trim(nTitle)
              ) {
                result.title = trim(nTitle);
              }

              var nType = isNativeFormField && trim(node.getAttribute("type"));
              if (!nType) nType = "text";
              var placeholder =
                !skipTo.tag &&
                !skipTo.role &&
                node === rootNode &&
                node === refNode &&
                (isEditWidgetRole ||
                  (isNativeFormField &&
                    (nTag === "textarea" ||
                      (nTag === "input" &&
                        [
                          "password",
                          "search",
                          "tel",
                          "text",
                          "url",
                          "email"
                        ].indexOf(nType) !== -1)))) &&
                trim(
                  node.getAttribute("placeholder") ||
                    node.getAttribute("aria-placeholder")
                );

              if (placeholder) {
                result.placeholder = placeholder;
              }

              var isSkipTo =
                (skipTo.role && skipTo.role === nRole) ||
                (!nRole && skipTo.tag && skipTo.tag === nTag);

              // Process custom tag and role searches if needed.
              if (isSkipTo) {
                name = trim(
                  walk(node, stop, false, [], false, {
                    ref: ownedBy,
                    top: node
                  }).name
                );
                if (trim(name)) {
                  hasName = true;
                  skip = true;
                }
              }

              // Check for non-empty value of aria-owns, follow each ID ref, then process with same naming computation.
              // Also abort aria-owns processing if contained on an element that does not support child elements.
              if (
                !isSkipTo &&
                aOwns &&
                ["input", "img", "progress"].indexOf(nTag) === -1
              ) {
                ids = aOwns.split(/\s+/);
                parts = [];
                for (i = 0; i < ids.length; i++) {
                  element = docO.getElementById(ids[i]);
                  // Abort processing if the referenced node has already been traversed
                  if (element && owns.indexOf(ids[i]) === -1) {
                    owns.push(ids[i]);
                    var oBy = { ref: ownedBy, top: ownedBy.top };
                    oBy[ids[i]] = {
                      refNode: refNode,
                      node: node,
                      target: element
                    };
                    if (!isParentHidden(element, docO.body, true)) {
                      parts.push(
                        walk(element, true, skip, [], false, oBy).name
                      );
                    }
                  }
                }
                // Join without adding whitespace since this is already handled by parsing individual nodes within the algorithm steps.
                ariaO = parts.join("");
              }
            }

            // Otherwise, process text node
            else if (!skipTo.tag && !skipTo.role && node.nodeType === 3) {
              name = node.data;
            }

            // Prepend and append the current CSS pseudo element text, plus normalize all whitespace such as newline characters and others into flat spaces.
            name = cssO.before + name.replace(/\s+/g, " ") + cssO.after;

            if (
              name.length &&
              !hasParentLabelOrHidden(node, ownedBy.top, ownedBy, ignoreHidden)
            ) {
              result.name = name;
            }

            result.owns = ariaO;

            return result;
          },
          refNode
        );

        // Prepend and append the refObj CSS pseudo element text, plus normalize whitespace chars into flat spaces.
        fullResult.name =
          cssOP.before + fullResult.name.replace(/\s+/g, " ") + cssOP.after;

        return fullResult;
      };

      var firstChild = function(e, t, r, s) {
        var e = e ? e.firstChild : null;
        while (e) {
          var tr = getRole(e) || false;
          if (
            e.nodeType === 1 &&
            ((!t && !r) ||
              (tr && r && r.indexOf(tr) !== -1) ||
              (!tr && t && t.indexOf(e.nodeName.toLowerCase()) !== -1))
          ) {
            return e;
          } else if (!s && e.nodeType === 1 && (t || r)) {
            return null;
          }
          e = e.nextSibling;
        }
        return e;
      };

      var lastChild = function(e, t, r, s) {
        var e = e ? e.lastChild : null;
        while (e) {
          var tr = getRole(e) || false;
          if (
            e.nodeType === 1 &&
            ((!t && !r) ||
              (tr && r && r.indexOf(tr) !== -1) ||
              (!tr && t && t.indexOf(e.nodeName.toLowerCase()) !== -1))
          ) {
            return e;
          } else if (!s && e.nodeType === 1 && (t || r)) {
            return null;
          }
          e = e.previousSibling;
        }
        return e;
      };

      var getRole = function(node) {
        var role = node && node.getAttribute ? node.getAttribute("role") : "";
        if (!trim(role)) {
          return "";
        }
        var inList = function(list) {
          return trim(role).length > 0 && list.roles.indexOf(role) >= 0;
        };
        var roles = role.split(/\s+/);
        for (var i = 0; i < roles.length; i++) {
          role = roles[i];
          if (
            inList(list1) ||
            inList(list2) ||
            inList(list3) ||
            inList(list4) ||
            presentationRoles.indexOf(role) !== -1
          ) {
            return role;
          }
        }
        return "";
      };

      var isFocusable = function(node) {
        var nodeName = node.nodeName.toLowerCase();
        if (node.getAttribute("tabindex")) {
          return true;
        }
        if (nodeName === "a" && node.getAttribute("href")) {
          return true;
        }
        if (
          ["button", "input", "select", "textarea"].indexOf(nodeName) !== -1 &&
          node.getAttribute("type") !== "hidden"
        ) {
          return true;
        }
        return false;
      };

      // ARIA Role Exception Rule Set 1.1
      // The following Role Exception Rule Set is based on the following ARIA Working Group discussion involving all relevant browser venders.
      // https://lists.w3.org/Archives/Public/public-aria/2017Jun/0057.html

      // Always include name from content when the referenced node matches list1, as well as when child nodes match those within list3
      // Note: gridcell was added to list1 to account for focusable gridcells that match the ARIA 1.0 paradigm for interactive grids.
      // So too was row to match 'name from author' and 'name from content' in accordance with the spec.
      var list1 = {
        roles: [
          "button",
          "checkbox",
          "link",
          "option",
          "radio",
          "switch",
          "tab",
          "treeitem",
          "menuitem",
          "menuitemcheckbox",
          "menuitemradio",
          "row",
          "cell",
          "gridcell",
          "columnheader",
          "rowheader",
          "tooltip",
          "heading"
        ],
        tags: [
          "a",
          "button",
          "summary",
          "input",
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "menuitem",
          "option",
          "tr",
          "td",
          "th"
        ]
      };
      // Never include name from content when current node matches list2
      // The rowgroup role was added to prevent 'name from content' in accordance with relevant ARIA 1.1 spec changes.
      // The fieldset element and group role was added to account for implicit mappings where name from content is not supported.
      var list2 = {
        roles: [
          "application",
          "alert",
          "log",
          "marquee",
          "timer",
          "alertdialog",
          "dialog",
          "banner",
          "complementary",
          "form",
          "main",
          "navigation",
          "region",
          "search",
          "article",
          "document",
          "feed",
          "figure",
          "img",
          "math",
          "toolbar",
          "menu",
          "menubar",
          "grid",
          "listbox",
          "radiogroup",
          "textbox",
          "searchbox",
          "spinbutton",
          "scrollbar",
          "slider",
          "tablist",
          "tabpanel",
          "tree",
          "treegrid",
          "separator",
          "rowgroup",
          "group"
        ],
        tags: [
          "article",
          "aside",
          "body",
          "select",
          "datalist",
          "optgroup",
          "dialog",
          "figure",
          "footer",
          "form",
          "header",
          "hr",
          "img",
          "textarea",
          "input",
          "main",
          "math",
          "menu",
          "nav",
          "section",
          "thead",
          "tbody",
          "tfoot",
          "fieldset"
        ]
      };
      // As an override of list2, conditionally include name from content if current node is focusable, or if the current node matches list3 while the referenced parent node (root node) matches list1.
      var list3 = {
        roles: [
          "term",
          "definition",
          "directory",
          "list",
          "note",
          "status",
          "table",
          "contentinfo"
        ],
        tags: ["dl", "ul", "ol", "dd", "details", "output", "table"]
      };
      // Subsequent roles added as part of the Role Parity project for ARIA 1.2.
      // Tracks roles that don't specifically belong within the prior process lists.
      var list4 = {
        roles: ["legend", "caption"],
        tags: ["legend", "caption", "figcaption"]
      };

      var nativeFormFields = ["button", "input", "select", "textarea"];
      var rangeWidgetRoles = ["scrollbar", "slider", "spinbutton"];
      var editWidgetRoles = ["searchbox", "textbox"];
      var selectWidgetRoles = [
        "grid",
        "listbox",
        "tablist",
        "tree",
        "treegrid"
      ];
      var otherWidgetRoles = [
        "button",
        "checkbox",
        "link",
        "switch",
        "option",
        "menu",
        "menubar",
        "menuitem",
        "menuitemcheckbox",
        "menuitemradio",
        "radio",
        "tab",
        "treeitem",
        "gridcell"
      ];
      var presentationRoles = ["presentation", "none"];

      var hasGlobalAttr = function(node) {
        var globalPropsAndStates = [
          "labelledby",
          "label",
          "describedby",
          "busy",
          "controls",
          "current",
          "details",
          "disabled",
          "dropeffect",
          "errormessage",
          "flowto",
          "grabbed",
          "haspopup",
          "invalid",
          "keyshortcuts",
          "live",
          "owns",
          "roledescription"
        ];
        for (var i = 0; i < globalPropsAndStates.length; i++) {
          var a = trim(node.getAttribute("aria-" + globalPropsAndStates[i]));
          if (a) {
            return true;
          }
        }
        return false;
      };

      var isHidden =
        overrides.isHidden ||
        function(node, refNode) {
          var hidden = function(node) {
            if (!node || node.nodeType !== 1 || node === refNode) {
              return false;
            }
            if (node.getAttribute("aria-hidden") === "true") {
              return true;
            }
            if (node.getAttribute("hidden")) {
              return true;
            }
            var style = getStyleObject(node);
            if (
              style["display"] === "none" ||
              style["visibility"] === "hidden"
            ) {
              return true;
            }
            return false;
          };
          return hidden(node);
        };

      var isParentHidden = function(node, refNode, skipOwned, skipCurrent) {
        while (node && node !== refNode) {
          if (!skipCurrent && node.nodeType === 1 && isHidden(node, refNode)) {
            return true;
          } else skipCurrent = false;
          node = node.parentNode;
        }
        return false;
      };

      var getStyleObject =
        overrides.getStyleObject ||
        function(node) {
          var style = {};
          if (docO.defaultView && docO.defaultView.getComputedStyle) {
            style = docO.defaultView.getComputedStyle(node, "");
          } else if (node.currentStyle) {
            style = node.currentStyle;
          }
          return style;
        };

      var cleanCSSText = function(node, text) {
        var s = text;
        if (s.indexOf("attr(") !== -1) {
          var m = s.match(/attr\((.|\n|\r\n)*?\)/g);
          for (var i = 0; i < m.length; i++) {
            var b = m[i].slice(5, -1);
            b = node.getAttribute(b) || "";
            s = s.replace(m[i], b);
          }
        }
        return s || text;
      };

      var isBlockLevelElement = function(node, cssObj) {
        var styleObject = cssObj || getStyleObject(node);
        for (var prop in blockStyles) {
          var values = blockStyles[prop];
          for (var i = 0; i < values.length; i++) {
            if (
              styleObject[prop] &&
              ((values[i].indexOf("!") === 0 &&
                [values[i].slice(1), "inherit", "initial", "unset"].indexOf(
                  styleObject[prop]
                ) === -1) ||
                styleObject[prop].indexOf(values[i]) === 0)
            ) {
              return true;
            }
          }
        }
        if (
          !cssObj &&
          node.nodeName &&
          blockElements.indexOf(node.nodeName.toLowerCase()) !== -1 &&
          !(
            styleObject["display"] &&
            styleObject["display"].indexOf("inline") === 0 &&
            node.nodeName.toLowerCase() !== "br"
          )
        ) {
          return true;
        }
        return false;
      };

      // CSS Block Styles indexed from:
      // https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Block_formatting_context
      var blockStyles = {
        display: ["block", "grid", "table", "flow-root", "flex"],
        position: ["absolute", "fixed"],
        float: ["left", "right", "inline"],
        clear: ["left", "right", "both", "inline"],
        overflow: ["hidden", "scroll", "auto"],
        "column-count": ["!auto"],
        "column-width": ["!auto"],
        "column-span": ["all"],
        contain: ["layout", "content", "strict"]
      };

      // HTML5 Block Elements indexed from:
      // https://github.com/webmodules/block-elements
      // Note: 'br' was added to this array because it impacts visual display and should thus add a space .
      // Reference issue: https://github.com/w3c/accname/issues/4
      // Note: Added in 1.13, td, th, tr, and legend
      var blockElements = [
        "address",
        "article",
        "aside",
        "blockquote",
        "br",
        "canvas",
        "dd",
        "div",
        "dl",
        "dt",
        "fieldset",
        "figcaption",
        "figure",
        "footer",
        "form",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "header",
        "hgroup",
        "hr",
        "legend",
        "li",
        "main",
        "nav",
        "noscript",
        "ol",
        "output",
        "p",
        "pre",
        "section",
        "table",
        "td",
        "tfoot",
        "th",
        "tr",
        "ul",
        "video"
      ];

      var getObjectValue = function(
        role,
        node,
        isRange,
        isEdit,
        isSelect,
        isNative
      ) {
        var val = "";
        var bypass = false;

        if (isRange && !isNative) {
          val =
            node.getAttribute("aria-valuetext") ||
            node.getAttribute("aria-valuenow") ||
            "";
        } else if (isEdit && !isNative) {
          val = getText(node) || "";
        } else if (isSelect && !isNative) {
          var childRoles = [];
          if (role === "grid" || role === "treegrid") {
            childRoles = ["gridcell", "rowheader", "columnheader"];
          } else if (role === "listbox") {
            childRoles = ["option"];
          } else if (role === "tablist") {
            childRoles = ["tab"];
          } else if (role === "tree") {
            childRoles = ["treeitem"];
          }
          val = joinSelectedParts(
            node,
            node.querySelectorAll('*[aria-selected="true"]'),
            false,
            childRoles
          );
          bypass = true;
        }
        val = trim(val);
        if (!val && (isRange || isEdit) && node.value) {
          val = node.value;
        }
        if (!bypass && !val && isNative) {
          if (isSelect) {
            val = joinSelectedParts(
              node,
              node.querySelectorAll("option[selected]"),
              true
            );
          } else {
            val = node.value;
          }
        }

        return val;
      };

      var addSpacing = function(s) {
        return trim(s).length ? " " + s + " " : " ";
      };

      var joinSelectedParts = function(node, nOA, isNative, childRoles) {
        if (!nOA || !nOA.length) {
          return "";
        }
        var parts = [];
        for (var i = 0; i < nOA.length; i++) {
          var role = getRole(nOA[i]);
          var isValidChildRole = !childRoles || childRoles.indexOf(role) !== -1;
          if (isValidChildRole) {
            parts.push(
              isNative
                ? getText(nOA[i])
                : walk(nOA[i], true, false, [], false, { top: nOA[i] }).name
            );
          }
        }
        return parts.join(" ");
      };

      var getPseudoElStyleObj =
        overrides.getPseudoElStyleObj ||
        function(node, position) {
          var styleObj = {};
          for (var prop in blockStyles) {
            styleObj[prop] = docO.defaultView
              .getComputedStyle(node, position)
              .getPropertyValue(prop);
          }
          styleObj["content"] = docO.defaultView
            .getComputedStyle(node, position)
            .getPropertyValue("content")
            .replace(/^"|\\|"$/g, "");
          return styleObj;
        };

      var getText = function(node, position) {
        if (!position && node.nodeType === 1) {
          return node.innerText || node.textContent || "";
        }
        var styles = getPseudoElStyleObj(node, position);
        var text = styles["content"];
        if (!text || text === "none") {
          return "";
        }
        if (isBlockLevelElement({}, styles)) {
          if (position === ":before") {
            text += " ";
          } else if (position === ":after") {
            text = " " + text;
          }
        }
        return text;
      };

      var getCSSText =
        overrides.getCSSText ||
        function(node, refNode) {
          if (
            (node && node.nodeType !== 1) ||
            node === refNode ||
            [
              "input",
              "select",
              "textarea",
              "img",
              "iframe",
              "optgroup"
            ].indexOf(node.nodeName.toLowerCase()) !== -1
          ) {
            return { before: "", after: "" };
          }
          return {
            before: cleanCSSText(node, getText(node, ":before")),
            after: cleanCSSText(node, getText(node, ":after"))
          };
        };

      var getParent = function(node, nTag, nRole, noRole) {
        var noRole = noRole ? true : false;
        while (node) {
          node = node.parentNode;
          if (
            node &&
            ((nRole && getRole(node) === nRole) ||
              (nTag &&
                node.nodeName &&
                node.nodeName.toLowerCase() === nTag &&
                (!noRole || getRole(node).length < 1)))
          ) {
            return node;
          }
        }
        return {};
      };

      var hasParentLabelOrHidden = function(
        node,
        refNode,
        ownedBy,
        ignoreHidden
      ) {
        var trackNodes = [];
        while (node && node !== refNode) {
          if (
            node.id &&
            ownedBy &&
            ownedBy[node.id] &&
            ownedBy[node.id].node &&
            trackNodes.indexOf(node) === -1
          ) {
            trackNodes.push(node);
            node = ownedBy[node.id].node;
          } else {
            node = node.parentNode;
          }
          if (node && node.getAttribute) {
            if (
              trim(node.getAttribute("aria-label")) ||
              (!ignoreHidden && isHidden(node, refNode))
            ) {
              return true;
            }
          }
        }
        return false;
      };

      var trim = function(str) {
        if (typeof str !== "string") {
          return "";
        }
        return str.replace(/^\s+|\s+$/g, "");
      };

      if (
        isParentHidden(
          node,
          docO.body,
          true,
          node && node.nodeName && node.nodeName.toLowerCase() === "area"
            ? true
            : false
        )
      ) {
        return props;
      }

      // Compute accessible Name and Description properties value for node
      var accProps = walk(node, false, false, [], false, { top: node });

      var accName = trim(accProps.name.replace(/\s+/g, " "));
      var accDesc = trim(accProps.title.replace(/\s+/g, " "));

      if (accName === accDesc) {
        // If both Name and Description properties match, then clear the Description property value.
        accDesc = "";
      }

      props.name = accName;
      props.desc = accDesc;

      // Clear track variables
      nodes = [];
      owns = [];
    } catch (e) {
      props.error = e;
    }
    props.placeholder = nameFromPlaceholder;

    if (fnc && typeof fnc === "function") {
      return fnc.apply(node, [props, node]);
    } else {
      return props;
    }
  };

  // Customize returned string for testable statements

  nameSpace.getAccNameMsg = nameSpace.getNames = function(node, overrides) {
    var props = nameSpace.getAccName(node, null, false, overrides);
    if (props.error) {
      return (
        props.error +
        "\n\n" +
        "An error has been thrown in AccName Prototype version " +
        nameSpace.getAccNameVersion +
        ". Please copy this error message and the HTML markup that caused it, and submit both as a new GitHub issue at\n" +
        "https://github.com/whatsock/w3c-alternative-text-computation"
      );
    }
    var r =
      'accName: "' + props.name + '"\n\naccDesc: "' + props.desc + '"\n\n';
    if (props.placeholder) r += "Name from placeholder: true\n\n";
    r +=
      "(Running AccName Computation Prototype version: " +
      nameSpace.getAccNameVersion +
      ")";
    return r;
  };

  if (typeof module === "object" && module.exports) {
    module.exports = {
      getNames: nameSpace.getNames,
      calcNames: nameSpace.calcNames
    };
  }
})();
