var currentVersion = '2.6';

/*!
CalcNames: The AccName Computation Prototype, compute the Name and Description property values for a DOM node
Returns an object with 'name' and 'desc' properties.
Functionality mirrors the steps within the W3C Accessible Name and Description computation algorithm.
http://www.w3.org/TR/accname-aam-1.1/
Authored by Bryan Garaventa, plus refactoring contrabutions by Tobias Bengfort
https://github.com/whatsock/w3c-alternative-text-computation
Distributed under the terms of the Open Source Initiative OSI - MIT License
*/

// AccName Computation Prototype
var calcNames = function(node, fnc, preventVisualARIASelfCSSRef) {

	var props = {name: '', desc: ''};
	if (!node || node.nodeType !== 1) {
		return props;
	}
	var topNode = node;

	// Track nodes to prevent duplicate node reference parsing.
	var nodes = [];
	// Track aria-owns references to prevent duplicate parsing.
	var owns = [];

	// Recursively process a DOM node to compute an accessible name in accordance with the spec
	var walk = function(refNode, stop, skip, nodesToIgnoreValues, skipAbort, ownedBy) {
		var fullResult = {
			name: '',
			title: ''
		};

		/*
		ARIA Role Exception Rule Set 1.1
		The following Role Exception Rule Set is based on the following ARIA Working Group discussion involving all relevant browser venders.
		https://lists.w3.org/Archives/Public/public-aria/2017Jun/0057.html
		*/
		var isException = function(node, refNode) {
			if (!refNode || !node || refNode.nodeType !== 1 || node.nodeType !== 1) {
				return false;
			}

			var inList = function(node, list) {
				var role = getRole(node);
				var tag = node.nodeName.toLowerCase();
				return (role && list.roles.indexOf(role) >= 0) || (!role && list.tags.indexOf(tag) >= 0);
			};

			// The list3 overrides must be checked first.
			if (inList(node, list3)) {
				if (node === refNode && !(node.id && ownedBy[node.id] && ownedBy[node.id].node)) {
					return !isFocusable(node);
				} else {
					// Note: the inParent checker needs to be present to allow for embedded roles matching list3 when the referenced parent is referenced using aria-labelledby, aria-describedby, or aria-owns.
					return !((inParent(node, ownedBy.top) && node.nodeName.toLowerCase() != 'select') || inList(refNode, list1));
				}
			}
			// Otherwise process list2 to identify roles to ignore processing name from content.
			else if (inList(node, list2) || (node === topNode && !inList(node, list1))) {
				return true;
			}
			else {
				return false;
			}
		};

		var inParent = function(node, parent) {
			var trackNodes = [];
			while (node) {
				if (node.id && ownedBy[node.id] && ownedBy[node.id].node && trackNodes.indexOf(node) === -1) {
					trackNodes.push(node);
					node = ownedBy[node.id].node;
				} else {
					node = node.parentNode;
				}
				if (node && node === parent) {
					return true;
				}
				else if ((!node || node === ownedBy.top) || node === document.body) {
					return false;
				}
			}
			return false;
		};

		// Placeholder for storing CSS before and after pseudo element text values for the top level node
		var cssOP = {
			before: '',
			after: ''
		};

		if (nodes.indexOf(refNode) === -1) {
			// Store the before and after pseudo element 'content' values for the top level DOM node
			// Note: If the pseudo element includes block level styling, a space will be added, otherwise inline is asumed and no spacing is added.
			cssOP = getCSSText(refNode, null);

			// Enabled in Visual ARIA to prevent self referencing by Visual ARIA tooltips
			if (preventVisualARIASelfCSSRef) {
				if (cssOP.before.indexOf(' [ARIA] ') !== -1 || cssOP.before.indexOf(' aria-') !== -1 || cssOP.before.indexOf(' accName: ') !== -1) cssOP.before = '';
				if (cssOP.after.indexOf(' [ARIA] ') !== -1 || cssOP.after.indexOf(' aria-') !== -1 || cssOP.after.indexOf(' accDescription: ') !== -1) cssOP.after = '';
			}
		}

		// Recursively apply the same naming computation to all nodes within the referenced structure
		var walkDOM = function(node, fn, refNode) {
			var res = {
				name: '',
				title: ''
			};
			if (!node) {
				return res;
			}
			var nodeIsBlock = node && node.nodeType === 1 && isBlockLevelElement(node);
			if (nodeIsBlock) {
				res.name = ' ';
			}
			var fResult = fn(node) || {};
			if (fResult.name && fResult.name.length) {
				res.name += fResult.name;
			}
			if (!isException(node, ownedBy.top, ownedBy)) {
				node = node.firstChild;
				while (node) {
					res.name += walkDOM(node, fn, refNode).name;
					node = node.nextSibling;
				}
			}
			if (nodeIsBlock) {
				res.name += ' ';
			}
			res.name += fResult.owns || '';
			if (!trim(res.name) && trim(fResult.title) && !fResult.hasDesc) {
				res.name = fResult.title;
			} else {
				res.title = fResult.title;
			}
			return res;
		};

		fullResult = walkDOM(refNode, function(node) {
			var result = {
				name: '',
				title: '',
				owns: ''
			};
			var isEmbeddedNode = node && node.nodeType === 1 && nodesToIgnoreValues && nodesToIgnoreValues.length && nodesToIgnoreValues.indexOf(node) !== -1 && node === topNode && node !== refNode ? true : false;

			if ((skip || !node || nodes.indexOf(node) !== -1 || (isHidden(node, ownedBy.top))) && !skipAbort && !isEmbeddedNode) {
				// Abort if algorithm step is already completed, or if node is a hidden child of refNode, or if this node has already been processed, or skip abort if aria-labelledby self references same node.
				return result;
			}

			if (nodes.indexOf(node) === -1) {
				nodes.push(node);
			}

			// Store name for the current node.
			var name = '';
			// Store name from aria-owns references if detected.
			var ariaO = '';
			// Placeholder for storing CSS before and after pseudo element text values for the current node container element
			var cssO = {
				before: '',
				after: ''
			};

			var parent = refNode === node ? node : node.parentNode;
			if (nodes.indexOf(parent) === -1) {
				nodes.push(parent);
				// Store the before and after pseudo element 'content' values for the current node container element
				// Note: If the pseudo element includes block level styling, a space will be added, otherwise inline is asumed and no spacing is added.
				cssO = getCSSText(parent, refNode);

				// Enabled in Visual ARIA to prevent self referencing by Visual ARIA tooltips
				if (preventVisualARIASelfCSSRef) {
					if (cssO.before.indexOf(' [ARIA] ') !== -1 || cssO.before.indexOf(' aria-') !== -1 || cssO.before.indexOf(' accName: ') !== -1) cssO.before = '';
					if (cssO.after.indexOf(' [ARIA] ') !== -1 || cssO.after.indexOf(' aria-') !== -1 || cssO.after.indexOf(' accDescription: ') !== -1) cssO.after = '';
				}

			}

			// Process standard DOM element node
			if (node.nodeType === 1) {

				var aLabelledby = node.getAttribute('aria-labelledby') || '';
				var aDescribedby = node.getAttribute('aria-describedby') || '';
				var aLabel = node.getAttribute('aria-label') || '';
				var nTitle = node.getAttribute('title') || '';
				var nTag = node.nodeName.toLowerCase();
				var nRole = getRole(node);

				var isNativeFormField = nativeFormFields.indexOf(nTag) !== -1;
				var isRangeWidgetRole = rangeWidgetRoles.indexOf(nRole) !== -1;
				var isEditWidgetRole = editWidgetRoles.indexOf(nRole) !== -1;
				var isSelectWidgetRole = selectWidgetRoles.indexOf(nRole) !== -1;
				var isSimulatedFormField = isRangeWidgetRole || isEditWidgetRole || isSelectWidgetRole || nRole == 'combobox';
				var isWidgetRole = isSimulatedFormField || otherWidgetRoles.indexOf(nRole) !== -1;

				var hasName = false;
				var aOwns = node.getAttribute('aria-owns') || '';
				var isSeparatChildFormField = (!isEmbeddedNode && ((node !== refNode && (isNativeFormField || isSimulatedFormField)) || (node.id && ownedBy[node.id] && ownedBy[node.id].target && ownedBy[node.id].target === node))) ? true : false;

				if (!stop && node === refNode) {

					// Check for non-empty value of aria-labelledby if current node equals reference node, follow each ID ref, then stop and process no deeper.
					if (aLabelledby) {
						var ids = aLabelledby.split(/\s+/);
						var parts = [];
						for (var i = 0; i < ids.length; i++) {
							var element = document.getElementById(ids[i]);
							// Also prevent the current form field from having its value included in the naming computation if nested as a child of label
							parts.push(walk(element, true, skip, [node], element === refNode, {ref: ownedBy, top: element}).name);
						}
						// Check for blank value, since whitespace chars alone are not valid as a name
						name = addSpacing(trim(parts.join(' ')));

						if (trim(name)) {
							hasName = true;
							// Abort further recursion if name is valid.
							skip = true;
						}
					}

					// Check for non-empty value of aria-labelledby if current node equals reference node, follow each ID ref, then stop and process no deeper.
					if (aDescribedby) {
						var desc = '';
						ids = aDescribedby.split(/\s+/);
						var parts = [];
						for (var i = 0; i < ids.length; i++) {
							var element = document.getElementById(ids[i]);
							// Also prevent the current form field from having its value included in the naming computation if nested as a child of label
							parts.push(walk(element, true, false, [node], false, {ref: ownedBy, top: element}).name);
						}
						// Check for blank value, since whitespace chars alone are not valid as a name
						desc = addSpacing(trim(parts.join(' ')));

						if (trim(desc) || trim(nTitle)) {
							result.hasDesc = true;
							result.title = desc || nTitle;
						}
					}

				}

				// Otherwise, if the current node is a nested widget control within the parent ref obj, then add only its value and process no deeper within the branch.
				if (isSeparatChildFormField) {

					// Prevent the referencing node from having its value included in the case of form control labels that contain the element with focus.
					if (!(nodesToIgnoreValues && nodesToIgnoreValues.length && nodesToIgnoreValues.indexOf(node) !== -1)) {

						if (isRangeWidgetRole) {
							// For range widgets, append aria-valuetext if non-empty, or aria-valuenow if non-empty, or node.value if applicable.
							name = getObjectValue(nRole, node, true);
						}
						else if (isEditWidgetRole || (nRole == 'combobox' && isNativeFormField)) {
							// For simulated edit widgets, append text from content if applicable, or node.value if applicable.
							name = getObjectValue(nRole, node, false, true);
						}
						else if (isSelectWidgetRole) {
							// For simulated select widgets, append same naming computation algorithm for all child nodes including aria-selected="true" separated by a space when multiple.
							// Also filter nodes so that only valid child roles of relevant parent role that include aria-selected="true" are included.
							name = getObjectValue(nRole, node, false, false, true);
						}
						else if (isNativeFormField && ['input', 'textarea'].indexOf(nTag) !== -1 && (!isWidgetRole || isEditWidgetRole)) {
							// For native edit fields, append node.value when applicable.
							name = getObjectValue(nRole, node, false, false, false, true);
						}
						else if (isNativeFormField && nTag === 'select' && (!isWidgetRole || nRole == 'combobox')) {
							// For native select fields, get text from content for all options with selected attribute separated by a space when multiple, but don't process if another widget role is present unless it matches role="combobox".
							// Reference: https://github.com/WhatSock/w3c-alternative-text-computation/issues/7
							name = getObjectValue(nRole, node, false, false, true, true);
						}

						// Check for blank value, since whitespace chars alone are not valid as a name
						name = addSpacing(trim(name));

					}

					if (trim(name)) {
						hasName = true;
					}
				}

				// Otherwise, if current node has a non-empty aria-label then set as name and process no deeper within the branch.
				if (!hasName && trim(aLabel) && !isSeparatChildFormField) {
					// Check for blank value, since whitespace chars alone are not valid as a name
					name = addSpacing(trim(aLabel));

					if (trim(name)) {
						hasName = true;
						if (node === refNode) {
							// If name is non-empty and both the current and refObject nodes match, then don't process any deeper within the branch.
							skip = true;
						}
					}
				}

				// Otherwise, if name is still empty and the current node matches the ref node and is a standard form field with a non-empty associated label element, process label with same naming computation algorithm.
				if (!hasName && node === refNode && isNativeFormField) {

					// Logic modified to match issue
					// https://github.com/WhatSock/w3c-alternative-text-computation/issues/12 */
					var labels = document.querySelectorAll('label');
					var implicitLabel = getParent(node, 'label') || false;
					var explicitLabel = node.id && document.querySelectorAll('label[for="' + node.id + '"]').length ? document.querySelector('label[for="' + node.id + '"]') : false;
					var implicitI = 0;
					var explicitI = 0;
					for (var i = 0; i < labels.length; i++) {
						if (labels[i] === implicitLabel) {
							implicitI = i;
						}
						else if (labels[i] === explicitLabel) {
							explicitI = i;
						}
					}
					var isImplicitFirst = implicitLabel && implicitLabel.nodeType === 1 && explicitLabel && explicitLabel.nodeType === 1 && implicitI < explicitI ? true : false;

					if (implicitLabel && explicitLabel && isImplicitFirst) {
						// Check for blank value, since whitespace chars alone are not valid as a name
						name = addSpacing(trim(walk(implicitLabel, true, skip, [node], false, {ref: ownedBy, top: implicitLabel}).name)) + addSpacing(trim(walk(explicitLabel, true, skip, [node], false, {ref: ownedBy, top: explicitLabel}).name));
					}
					else if (explicitLabel && implicitLabel) {
						// Check for blank value, since whitespace chars alone are not valid as a name
						name = addSpacing(trim(walk(explicitLabel, true, skip, [node], false, {ref: ownedBy, top: explicitLabel}).name)) + addSpacing(trim(walk(implicitLabel, true, skip, [node], false, {ref: ownedBy, top: implicitLabel}).name));
					}
					else if (explicitLabel) {
						// Check for blank value, since whitespace chars alone are not valid as a name
						name = addSpacing(trim(walk(explicitLabel, true, skip, [node], false, {ref: ownedBy, top: explicitLabel}).name));
					}
					else if (implicitLabel) {
						// Check for blank value, since whitespace chars alone are not valid as a name
						name = addSpacing(trim(walk(implicitLabel, true, skip, [node], false, {ref: ownedBy, top: implicitLabel}).name));
					}

					if (trim(name)) {
						hasName = true;
					}
				}

				var rolePresentation = !hasName && nRole && presentationRoles.indexOf(nRole) !== -1 && !isFocusable(node) && !hasGlobalAttr(node) ? true : false;
				var nAlt = rolePresentation ? '' : trim(node.getAttribute('alt'));

				// Otherwise, if name is still empty and current node is a standard non-presentational img or image button with a non-empty alt attribute, set alt attribute value as the accessible name.
				if (!hasName && !rolePresentation && (nTag == 'img' || (nTag == 'input' && node.getAttribute('type') == 'image')) && nAlt) {
					// Check for blank value, since whitespace chars alone are not valid as a name
					name = addSpacing(nAlt);
					if (trim(name)) {
						hasName = true;
					}
				}

				// Otherwise, if current node is non-presentational and includes a non-empty title attribute and is not another form field, store title attribute value as the accessible name if name is still empty, or the description if not.
				if (!rolePresentation && trim(nTitle) && !isSeparatChildFormField) {
					// Check for blank value, since whitespace chars alone are not valid as a name
					result.title = addSpacing(trim(nTitle));
				}

				// Check for non-empty value of aria-owns, follow each ID ref, then process with same naming computation.
				// Also abort aria-owns processing if contained on an element that does not support child elements.
				if (aOwns && !isNativeFormField && nTag != 'img') {
					var ids = aOwns.split(/\s+/);
					var parts = [];
					for (var i = 0; i < ids.length; i++) {
						var element = document.getElementById(ids[i]);
						// Abort processing if the referenced node has already been traversed
						if (element && owns.indexOf(ids[i]) === -1) {
							owns.push(ids[i]);
							var oBy = {ref: ownedBy, top: ownedBy.top};
							oBy[ids[i]] = {
								refNode: refNode,
								node: node,
target: element
							};
							parts.push(trim(walk(element, true, skip, [], false, oBy).name));
						}
					}
					// Surround returned aria-owns naming computation with spaces since these will be separated visually if not already included as nested DOM nodes.
					ariaO = addSpacing(parts.join(' '));
				}

			}

			// Otherwise, process text node
			else if (node.nodeType === 3) {
				name = node.data;
			}

			// Prepend and append the current CSS pseudo element text, plus normalize all whitespace such as newline characters and others into flat spaces.
			name = cssO.before + name.replace(/\s+/g, ' ') + cssO.after;

			if (name.length && !hasParentLabel(node, false, ownedBy.top, ownedBy)) {
				result.name = name;
			}

			result.owns = ariaO;

			return result;
		}, refNode);

		// Prepend and append the refObj CSS pseudo element text, plus normalize whitespace chars into flat spaces.
		fullResult.name = cssOP.before + fullResult.name.replace(/\s+/g, ' ') + cssOP.after;

		return fullResult;
	};

	var getRole = function(node) {
		var role = node && node.getAttribute ? node.getAttribute('role') : '';
		if (!trim(role)) {
			return '';
		}
		var inList = function(list) {
			return trim(role).length > 0 && list.roles.indexOf(role) >= 0;
		};
		var roles = role.split(/\s+/);
		for (var i = 0; i < roles.length; i++) {
role = roles[i];
			if (inList(list1) || inList(list2) || inList(list3) || presentationRoles.indexOf(role) !== -1) {
				return role;
			}
		}
		return '';
	};

	var isFocusable = function(node) {
		var nodeName = node.nodeName.toLowerCase();
		if (node.getAttribute('tabindex')) {
			return true;
		}
		if (nodeName === 'a' && node.getAttribute('href')) {
			return true;
		}
		if (['button', 'input', 'select'].indexOf(nodeName) !== -1 && node.getAttribute('type') !== 'hidden') {
			return true;
		}
		return false;
	};

	// ARIA Role Exception Rule Set 1.1
	// The following Role Exception Rule Set is based on the following ARIA Working Group discussion involving all relevant browser venders.
	// https://lists.w3.org/Archives/Public/public-aria/2017Jun/0057.html

	// Always include name from content when the referenced node matches list1, as well as when child nodes match those within list3
	// Note: gridcell was added to list1 to account for focusable gridcells that match the ARIA 1.0 paradigm for interactive grids.
	var list1 = {
		roles: ['button', 'checkbox', 'link', 'option', 'radio', 'switch', 'tab', 'treeitem', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'cell', 'gridcell', 'columnheader', 'rowheader', 'tooltip', 'heading'],
		tags: ['a', 'button', 'summary', 'input', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'menuitem', 'option', 'td', 'th']
	};
	// Never include name from content when current node matches list2
	var list2 = {
		roles: ['application', 'alert', 'log', 'marquee', 'timer', 'alertdialog', 'dialog', 'banner', 'complementary', 'form', 'main', 'navigation', 'region', 'search', 'article', 'document', 'feed', 'figure', 'img', 'math', 'toolbar', 'menu', 'menubar', 'grid', 'listbox', 'radiogroup', 'textbox', 'searchbox', 'spinbutton', 'scrollbar', 'slider', 'tablist', 'tabpanel', 'tree', 'treegrid', 'separator'],
		tags: ['article', 'aside', 'body', 'select', 'datalist', 'optgroup', 'dialog', 'figure', 'footer', 'form', 'header', 'hr', 'img', 'textarea', 'input', 'main', 'math', 'menu', 'nav', 'section']
	};
	// As an override of list2, conditionally include name from content if current node is focusable, or if the current node matches list3 while the referenced parent node matches list1.
	var list3 = {
		roles: ['term', 'definition', 'directory', 'list', 'group', 'note', 'status', 'table', 'rowgroup', 'row', 'contentinfo'],
		tags: ['dl', 'ul', 'ol', 'dd', 'details', 'output', 'table', 'thead', 'tbody', 'tfoot', 'tr']
	};

	var nativeFormFields = ['input', 'select', 'textarea'];
	var rangeWidgetRoles = ['scrollbar', 'slider', 'spinbutton'];
	var editWidgetRoles = ['searchbox', 'textbox'];
	var selectWidgetRoles = ['grid', 'listbox', 'tablist', 'tree', 'treegrid'];
	var otherWidgetRoles = ['button', 'checkbox', 'link', 'switch', 'option', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'radio', 'tab', 'treeitem', 'gridcell'];
	var presentationRoles = ['presentation', 'none'];

	var hasGlobalAttr = function(node) {
		var globalPropsAndStates = ['busy', 'controls', 'current', 'describedby', 'details', 'disabled', 'dropeffect', 'errormessage', 'flowto', 'grabbed', 'haspopup', 'invalid', 'keyshortcuts', 'live', 'owns', 'roledescription'];
		for (var i = 0; i < globalPropsAndStates.length; i++) {
			var a = trim(node.getAttribute('aria-' + globalPropsAndStates[i]));
			if (a) {
				return true;
			}
		}
		return false;
	};

	var isHidden = function(node, refNode) {
		if (node.nodeType !== 1 || node == refNode) {
			return false;
		}

		if (node.getAttribute('aria-hidden') === 'true') {
			return true;
		}

		if (node.getAttribute('hidden')) {
			return true;
		}

		var style = getStyleObject(node);
		if (style['display'] === 'none' || style['visibility'] === 'hidden') {
			return true;
		}

		return false;
	};

	var getStyleObject = function(node) {
		var style = {};
		if (document.defaultView && document.defaultView.getComputedStyle) {
			style = document.defaultView.getComputedStyle(node, '');
		} else if (node.currentStyle) {
			style = node.currentStyle;
		}
		return style;
	};

	var cleanCSSText = function(node, text) {
		var s = text;
		if (s.indexOf('attr(') !== -1) {
			var m = s.match(/attr\((.|\n|\r\n)*?\)/g);
			for (var i = 0; i < m.length; i++) {
				var b = m[i].slice(5, -1);
				b = node.getAttribute(b) || '';
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
				if (styleObject[prop] && ((values[i].indexOf('!') === 0 && [values[i].slice(1), 'inherit', 'initial', 'unset'].indexOf(styleObject[prop]) === -1) || styleObject[prop].indexOf(values[i]) !== -1)) {
					return true;
				}
			}
		}
		if (!cssObj && node.nodeName && blockElements.indexOf(node.nodeName.toLowerCase()) !== -1) {
			return true;
		}
		return false;
	};

	// CSS Block Styles indexed from:
	// https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Block_formatting_context
	var blockStyles = {
		'display': ['block', 'grid', 'table', 'flow-root', 'flex'],
		'position': ['absolute', 'fixed'],
		'float': ['left', 'right', 'inline'],
		'clear': ['left', 'right', 'both', 'inline'],
		'overflow': ['hidden', 'scroll', 'auto'],
		'column-count': ['!auto'],
		'column-width': ['!auto'],
		'column-span': ['all'],
		'contain': ['layout', 'content', 'strict']
	};

	// HTML5 Block Elements indexed from:
	// https://github.com/webmodules/block-elements
	// Note: 'br' was added to this array because it impacts visual display and should thus add a space .
	// Reference issue: https://github.com/w3c/accname/issues/4
	// Note: Added in 1.13, td, th, tr, and legend
	var blockElements = ['address', 'article', 'aside', 'blockquote', 'br', 'canvas', 'dd', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'legend', 'li', 'main', 'nav', 'noscript', 'ol', 'output', 'p', 'pre', 'section', 'table', 'td', 'tfoot', 'th', 'tr', 'ul', 'video'];

	var getObjectValue = function(role, node, isRange, isEdit, isSelect, isNative) {
		var val = '';
		var bypass = false;

		if (isRange && !isNative) {
			val = node.getAttribute('aria-valuetext') || node.getAttribute('aria-valuenow') || '';
		}
		else if (isEdit && !isNative) {
			val = getText(node) || '';
		}
		else if (isSelect && !isNative) {
			var childRoles = [];
			if (role == 'grid' || role == 'treegrid') {
				childRoles = ['gridcell', 'rowheader', 'columnheader'];
			}
			else if (role == 'listbox') {
				childRoles = ['option'];
			}
			else if (role == 'tablist') {
				childRoles = ['tab'];
			}
			else if (role == 'tree') {
				childRoles = ['treeitem'];
			}
			val = joinSelectedParts(node, node.querySelectorAll('*[aria-selected="true"]'), false, childRoles);
			bypass = true;
		}
		val = trim(val);
		if (!val && (isRange || isEdit) && node.value) {
			val = node.value;
		}
		if (!bypass && !val && isNative) {
			if (isSelect) {
				val = joinSelectedParts(node, node.querySelectorAll('option[selected]'), true);
			} else {
				val = node.value;
			}
		}

		return val;
	};

	var addSpacing = function(str) {
		return str.length ? ' ' + str + ' ' : '';
	};

	var joinSelectedParts = function(node, nOA, isNative, childRoles) {
		if (!nOA || !nOA.length) {
			return '';
		}
		var parts = [];
		for (var i = 0; i < nOA.length; i++) {
			var role = getRole(nOA[i]);
			var isValidChildRole = !childRoles || childRoles.indexOf(role) !== -1;
			if (isValidChildRole) {
				parts.push(isNative ? getText(nOA[i]) : walk(nOA[i], true, false, [], false, {top: nOA[i]}).name);
			}
		}
		return parts.join(' ');
	};

	var getPseudoElStyleObj = function(node, position) {
		var styleObj = {};
		for (var prop in blockStyles) {
			styleObj[prop] = document.defaultView.getComputedStyle(node, position).getPropertyValue(prop);
		}
		styleObj['content'] = document.defaultView.getComputedStyle(node, position).getPropertyValue('content').replace(/^\"|\\|\"$/g, '');
		return styleObj;
	};

	var getText = function(node, position) {
		if (!position && node.nodeType === 1) {
			return node.innerText || node.textContent || '';
		}
		var styles = getPseudoElStyleObj(node, position);
		var text = styles['content'];
		if (!text || text === 'none') {
			return '';
		}
		if (isBlockLevelElement({}, styles)) {
			if (position == ':before') {
				text += ' ';
			}
			else if (position == ':after') {
				text = ' ' + text;
			}
		}
		return text;
	};

	var getCSSText = function(node, refNode) {
		if (node && node.nodeType !== 1 || node == refNode || ['input', 'select', 'textarea', 'img', 'iframe'].indexOf(node.nodeName.toLowerCase()) !== -1) {
			return {before: '', after: ''};
		}
		if (document.defaultView && document.defaultView.getComputedStyle) {
			return {
				before: cleanCSSText(node, getText(node, ':before')),
				after: cleanCSSText(node, getText(node, ':after'))
			};
		} else {
			return {before: '', after: ''};
		}
	};

	var getParent = function(node, nTag) {
		while (node) {
			node = node.parentNode;
			if (node && node.nodeName && node.nodeName.toLowerCase() == nTag) {
				return node;
			}
		}
		return {};
	};

	var hasParentLabel = function(node, noLabel, refNode, ownedBy) {
		var trackNodes = [];
		while (node && node !== refNode) {
				if (node.id && ownedBy && ownedBy[node.id] && ownedBy[node.id].node && trackNodes.indexOf(node) === -1) {
				trackNodes.push(node);
				node = ownedBy[node.id].node;
			} else {
				node = node.parentNode;
			}
			if (node && node.getAttribute) {
				if (!noLabel && node.getAttribute('aria-label')) {
					return true;
				}
				if (isHidden(node, refNode)) {
					return true;
				}
			}
		}
		return false;
	};

	var trim = function(str) {
		if (typeof str !== 'string') {
			return '';
		}
		return str.replace(/^\s+|\s+$/g, '');
	};

	if (isHidden(node, document.body) || hasParentLabel(node, true, document.body)) {
		return props;
	}

	// Compute accessible Name and Description properties value for node
	var accProps = walk(node, false, false, [], false, {top: node});

	accName = trim(accProps.name.replace(/\s+/g, ' '));
	accDesc = trim(accProps.title.replace(/\s+/g, ' '));

	if (accName === accDesc) {
		// If both Name and Description properties match, then clear the Description property value.
		accDesc = '';
	}

	props.name = accName;
	props.desc = accDesc;

	// Clear track variables
	nodes = [];
	owns = [];

	if (fnc && typeof fnc == 'function') {
		return fnc.apply(node, [
			node,
			props
		]);
	} else {
		return props;
	}
};

// Customize returned string for testable statements

var getNames = function(node) {
	var props = calcNames(node);
	return 'accName: "' + props.name + '"\n\naccDesc: "' + props.desc + '"\n\n(Running AccName Computation Prototype version: ' + currentVersion + ')';
};

if (typeof module === 'object' && module.exports) {
	module.exports = {
		getNames: getNames,
		calcNames: calcNames,
	};
}