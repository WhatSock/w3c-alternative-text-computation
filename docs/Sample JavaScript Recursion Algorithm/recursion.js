/*!
CalcNames 1.4, compute the Name and Description property values for a DOM node
Returns an object with 'name' and 'desc' properties.
Functionality mirrors the steps within the W3C Accessible Name and Description computation algorithm.
http://www.w3.org/TR/accname-aam-1.1/
Authored by Bryan Garaventa plus refactoring contrabutions by Tobias Bengfort
https://github.com/whatsock/w3c-alternative-text-computation
Distributed under the terms of the Open Source Initiative OSI - MIT License
*/

var calcNames = function(node, fnc, preventVisualARIASelfCSSRef) {
	if (!node || node.nodeType !== 1) {
		return;
	}

	// Track nodes to prevent duplicate node reference parsing.
	var nodes = [];

	// Recursively process a DOM node to compute an accessible name in accordance with the spec
	var walk = function(refNode, stop, skip, nodesToIgnoreValues) {
		var fullName = '';

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

		var blockNodeStack = [];

		var hasLeftBlockNodeStack = function(node) {
			var blocks = blockNodeStack.length;
			for (var i = blocks; i; i--) {
				if (!inParent(node, blockNodeStack[i - 1], refNode)) {
					blockNodeStack.splice(i - 1, 1);
				}
			}
			if (blockNodeStack.length < blocks) {
				return true;
			}
			return false;
		};

		// Recursively apply the same naming computation to all nodes within the referenced structure
		walkDOM(refNode, function(node) {

			if (skip || !node || nodes.indexOf(node) !== -1 || (isHidden(node, refNode))) {
				// Abort if algorithm step is already completed, or if node is a hidden child of refNode, or if this node has already been processed.
				return;
			}

			if (nodes.indexOf(node) === -1) {
				nodes.push(node);
			}

			// Store name for the current node.
			var name = '';
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

				var nodeIsBlock = isBlockLevelElement(node);
				if (nodeIsBlock && blockNodeStack.indexOf(node) === -1) {
					blockNodeStack.push(node);
				}
				if (nodeIsBlock && node !== refNode) {
					// Add space at beginning of block level element if detected.
					name += ' ';
				}

				var aLabelledby = node.getAttribute('aria-labelledby') || '';
				var aLabel = node.getAttribute('aria-label') || '';
				var nTitle = node.getAttribute('title') || '';
				var nTag = node.nodeName.toLowerCase();
				var nRole = node.getAttribute('role');
				var rolePresentation = ['presentation', 'none'].indexOf(nRole) !== -1;
				var isNativeFormField = ['input', 'select', 'textarea'].indexOf(nTag) !== -1;
				var isSimulatedFormField = ['searchbox', 'scrollbar', 'slider', 'spinbutton', 'textbox', 'combobox', 'grid', 'listbox', 'tablist', 'tree', 'treegrid'].indexOf(nRole) !== -1;
				var aOwns = node.getAttribute('aria-owns') || '';

				// Check for non-empty value of aria-labelledby if current node equals reference node, follow each ID ref, then stop and process no deeper.
				if (!stop && node === refNode && aLabelledby) {
					if (!rolePresentation) {
						var ids = aLabelledby.split(/\s+/);
						var parts = [];
						for (var i = 0; i < ids.length; i++) {
							var element = document.getElementById(ids[i]);
							// Also prevent the current form field from having its value included in the naming computation if nested as a child of label
							parts.push(walk(element, true, skip, [node]));
						}
						// Check for blank value, since whitespace chars alone are not valid as a name
						name = addSpacing(trim(parts.join(' ')));
					}

					if (name || rolePresentation) {
						// Abort further recursion if name is valid or if the referenced node is presentational.
						skip = true;
					}
				}

				// Otherwise, if the current node is non-presentational and is a nested widget control within the parent ref obj, then add only its value and process no deeper
				if (!rolePresentation && node !== refNode && (isNativeFormField || isSimulatedFormField)) {

					// Prevent the referencing node from having its value included in the case of form control labels that contain the element with focus.
					if (!(nodesToIgnoreValues && nodesToIgnoreValues.length && nodesToIgnoreValues.indexOf(node) !== -1)) {

						if (isSimulatedFormField && ['scrollbar', 'slider', 'spinbutton'].indexOf(nRole) !== -1) {
							// For range widgets, append aria-valuetext if non-empty, or aria-valuenow if non-empty, or node.value if applicable.
							name = getObjectValue(nRole, node, true);
						}
						else if (isSimulatedFormField && ['searchbox', 'textbox', 'combobox'].indexOf(nRole) !== -1) {
							// For simulated edit widgets, append text from content if applicable, or node.value if applicable.
							name = getObjectValue(nRole, node, false, true);
						}
						else if (isSimulatedFormField && ['grid', 'listbox', 'tablist', 'tree', 'treegrid'].indexOf(nRole) !== -1) {
							// For simulated select widgets, append same naming computation algorithm for all child nodes including aria-selected="true" separated by a space when multiple.
							// Also filter nodes so that only valid child roles of relevant parent role that include aria-selected="true" are included.
							name = getObjectValue(nRole, node, false, false, true);
						}
						else if (isNativeFormField && ['input', 'textarea'].indexOf(nTag) !== -1) {
							// For native edit fields, append node.value when applicable.
							name = getObjectValue(nRole, node, false, false, false, true);
						}
						else if (isNativeFormField && nTag === 'select') {
							// For native select fields, append node.value for single select, or text from content for all options with selected attribute separated by a space when multiple.
							name = getObjectValue(nRole, node, false, false, true, true);
						}

						// Check for blank value, since whitespace chars alone are not valid as a name
						name = addSpacing(trim(name));

					}
				}

				// Otherwise, if current node is non-presentational and has a non-empty aria-label then set as name and process no deeper.
				else if (!name && !rolePresentation && aLabel) {
					// Check for blank value, since whitespace chars alone are not valid as a name
					name = addSpacing(trim(aLabel));

					if (name && node === refNode) {
						// If name is non-empty and both the current and refObject nodes match, then don't process any deeper.
						skip = true;
					}
				}

				// Otherwise, if name is still empty and the current node is non-presentational and matches the ref node and is a standard form field with a non-empty associated label element, process label with same naming computation algorithm.
				if (!name && !rolePresentation && node === refNode && isNativeFormField && node.id && document.querySelectorAll('label[for="' + node.id + '"]').length) {
					var label = document.querySelector('label[for="' + node.id + '"]');
					// Check for blank value, since whitespace chars alone are not valid as a name
					name = addSpacing(trim(walk(label, true, skip, [node])));
				}

				// Otherwise, if name is still empty and the current node is non-presentational and matches the ref node and is a standard form field with an implicit label element surrounding it, process label with same naming computation algorithm.
				if (!name && !rolePresentation && node === refNode && isNativeFormField && getParent(node, 'label').nodeType === 1) {
					// Check for blank value, since whitespace chars alone are not valid as a name
					name = addSpacing(trim(walk(getParent(node, 'label'), true, skip, [node])));
				}

				// Otherwise, if name is still empty and current node is non-presentational and is a standard img with a non-empty alt attribute, set alt attribute value as the accessible name.
				else if (!name && !rolePresentation && nTag == 'img' && node.getAttribute('alt')) {
					// Check for blank value, since whitespace chars alone are not valid as a name
					name = addSpacing(trim(node.getAttribute('alt')));
				}

				// Otherwise, if name is still empty and current node is non-presentational and includes a non-empty title attribute, set title attribute value as the accessible name.
				if (!name && !rolePresentation && nTitle) {
					// Check for blank value, since whitespace chars alone are not valid as a name
					name = addSpacing(trim(nTitle));
				}

				// Check for non-empty value of aria-owns, follow each ID ref, then process with same naming computation.
				// Also abort aria-owns processing if contained on an element that does not support child elements.
				if (aOwns && !isNativeFormField && nTag != 'img') {
					var ids = aOwns.split(/\s+/);
					var parts = [];
					for (var i = 0; i < ids.length; i++) {
						var element = document.getElementById(ids[i]);
						// Abort processing if the referenced node is already a child DOM node
						if (!inParent(element, node)) {
							parts.push(trim(walk(element, true, skip)));
						}
					}
					// Surround returned aria-owns naming computation with spaces since these will be separated visually if not already included as nested DOM nodes.
					name += addSpacing(parts.join(' '));
				}

			}

			// Otherwise, process text node
			else if (node.nodeType === 3) {

				// Add space at end of block level element if detected.
				name = (hasLeftBlockNodeStack(node) ? ' ' : '') + node.data;

			}

			// Prepend and append the current CSS pseudo element text, plus normalize all whitespace such as newline characters and others into flat spaces.
			name = cssO.before + name.replace(/\s+/g, ' ') + cssO.after;

			if (name && !hasParentLabel(node, false, refNode)) {
				fullName += name;
			}

		}, refNode);

		// Prepend and append the refObj CSS pseudo element text, plus normalize whitespace chars into flat spaces.
		fullName = cssOP.before + fullName.replace(/\s+/g, ' ') + cssOP.after;

		// Clear the tracked nodes array for garbage collection.
		nodes = [];

		return fullName;
	};

	/*
	ARIA Role Exception Rule Set 1.0
	The following Role Exception Rule Set is based on the following ARIA Working Group discussion involving all relevant browser venders.
	https://lists.w3.org/Archives/Public/public-aria/2017Jun/0057.html
	*/
	var isException = function(node, refNode) {
		if (!refNode || !node || refNode.nodeType !== 1 || node.nodeType !== 1) {
			return false;
		}

		// Always include name from content when the referenced node matches list1, as well as when child nodes match those within list3
		var list1 = {
			roles: ['link', 'button', 'checkbox', 'option', 'radio', 'switch', 'tab', 'treeitem', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'cell', 'columnheader', 'rowheader', 'tooltip', 'heading'],
			tags: ['a', 'button', 'summary', 'input', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'menuitem', 'option', 'td', 'th']
		};

		// Never include name from content when current node matches list2
		var list2 = {
			roles: ['application', 'alert', 'log', 'marquee', 'timer', 'alertdialog', 'dialog', 'banner', 'complementary', 'form', 'main', 'navigation', 'region', 'search', 'article', 'document', 'feed', 'figure', 'img', 'math', 'toolbar', 'menu', 'menubar', 'grid', 'listbox', 'radiogroup', 'textbox', 'searchbox', 'spinbutton', 'scrollbar', 'slider', 'tablist', 'tabpanel', 'tree', 'treegrid', 'separator'],
			tags: ['article', 'aside', 'body', 'select', 'datalist', 'optgroup', 'dialog', 'figure', 'footer', 'form', 'header', 'hr', 'img', 'textarea', 'input', 'main', 'math', 'menu', 'nav', 'section']
		};

		// As an override of list2, conditionally include name from content if current node is focusable, or if the current node matches list3 while the referenced parent node matches list1.
		var list3 = {
			roles: ['combobox', 'term', 'definition', 'directory', 'list', 'group', 'note', 'status', 'table', 'rowgroup', 'row', 'contentinfo'],
			tags: ['dl', 'ul', 'ol', 'dd', 'details', 'output', 'table', 'thead', 'tbody', 'tfoot', 'tr']
		};

		var inList = function(node, list) {
			var role = node.getAttribute('role');
			var tag = node.nodeName.toLowerCase();
			return (
				list.roles.indexOf(role) >= 0 ||
				(!role && list2.tags.indexOf(tag) >= 0)
			);
		};

		if (inList(node, list2)) {
			return true;
		} else if (inList(node, list3)) {
			if (node === refNode) {
				return !isFocusable(node);
			} else {
				return !inList(refNode, list1);
			}
		} else {
			return false;
		}
	};

	var isFocusable = function(node) {
		var nodeName = node.nodeName.toLowerCase();
		if (node.getAttribute('tabindex')) {
			return true;
		}
		if (nodeName === 'a' && node.getAttribute('href')) {
			return true;
		}
		if (['input', 'select', 'button'].indexOf(nodeName) !== -1 && node.getAttribute('type') !== 'hidden') {
			return true;
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

		var style = getStyleObject(node);
		if (style['display'] === 'none' || style['visibility'] === 'hidden') {
			return true;
		}

		return false;
	};

	var walkDOM = function(node, fn, refNode) {
		if (!node) {
			return;
		}
		fn(node);
		if (!isException(node, refNode)) {
			node = node.firstChild;
			while (node) {
				walkDOM(node, fn, refNode);
				node = node.nextSibling;
			}
		}
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

	/*
	CSS Block Styles indexed from:
	https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Block_formatting_context
	*/
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

	/*
	HTML5 Block Elements indexed from:
	https://github.com/webmodules/block-elements
	Note: 'br' was added to this array because it impacts visual display and should thus add a space .
	Reference issue: https://github.com/w3c/accname/issues/4
	*/
	var blockElements = ['address', 'article', 'aside', 'blockquote', 'br', 'canvas', 'dd', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li', 'main', 'nav', 'noscript', 'ol', 'output', 'p', 'pre', 'section', 'table', 'tfoot', 'ul', 'video'];

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
			val = (isSelect && node.multiple) ? joinSelectedParts(node, node.querySelectorAll('option[selected]'), true) : node.value;
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
			var role = nOA[i].getAttribute('role');
			var isValidChildRole = !childRoles || childRoles.indexOf(role) !== -1;
			if (isValidChildRole) {
				parts.push(isNative ? getText(nOA[i]) : walk(nOA[i], true));
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
		if (node.nodeType !== 1 || node == refNode || ['input', 'select', 'textarea', 'img', 'iframe'].indexOf(node.nodeName.toLowerCase()) !== -1) {
			return {before: '', after: ''};
		}
		if (document.defaultView && document.defaultView.getComputedStyle) {
			return {
				before: getText(node, ':before'),
				after: getText(node, ':after')
			};
		} else {
			return {before: '', after: ''};
		}
	};

	var inParent = function(node, parent, refNode) {
		while (node) {
			node = node.parentNode;
			if (node == parent) {
				return true;
			}
			else if (node == refNode) {
				return false;
			}
		}
		return false;
	};

	var getParent = function(node, nTag) {
		while (node) {
			node = node.parentNode;
			if (node.nodeName.toLowerCase() == nTag) {
				return node;
			}
		}
		return {};
	};

	var hasParentLabel = function(node, noLabel, refNode) {
		while (node && node !== refNode) {
			node = node.parentNode;

			if (node.getAttribute) {
				if (['presentation', 'none'].indexOf(node.getAttribute('role')) === -1) {
					if (!noLabel && node.getAttribute('aria-label')) {
						return true;
					}
					if (isHidden(node, refNode)) {
						return true;
					}
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
		return;
	}

	// Compute accessible Name property value for node
	var accName = walk(node, false);

	var accDesc = '';
	if (['presentation', 'none'].indexOf(node.getAttribute('role')) === -1) {
		// Check for blank value, since whitespace chars alone are not valid as a name
		var title = trim(node.getAttribute('title'));
		if (title) {
			if (!accName) {
				// Set accessible Name to title value as a fallback if no other labelling mechanism is available.
				accName = title;
			} else {
				// Otherwise, set Description using title attribute if available and including more than whitespace characters.
				accDesc = title;
			}
		}

		// Compute accessible Description property value
		var describedby = node.getAttribute('aria-describedby') || '';
		if (describedby) {
			var ids = describedby.split(/\s+/);
			var parts = [];
			for (var j = 0; j < ids.length; j++) {
				var element = document.getElementById(ids[j]);
				parts.push(walk(element, true));
			}
			// Check for blank value, since whitespace chars alone are not valid as a name
			var desc = trim(parts.join(' '));
			if (desc) {
				// Set Description if computation includes more than whitespace characters.
				// Note: Setting the Description property using computation from aria-describedby will overwrite any prior Description set using the title attribute.
				accDesc = desc;
			}
		}
	}

	accName = trim(accName.replace(/\s+/g, ' '));
	accDesc = trim(accDesc.replace(/\s+/g, ' '));

	if (accName === accDesc) {
		// If both Name and Description properties match, then clear the Description property value.
		accDesc = '';
	}

	var props = {
		name: accName,
		desc: accDesc
	};

	if (fnc && typeof fnc == 'function') {
		return fnc.apply(node, [
			node,
			props
		]);
	} else {
		return props;
	}
};

// Customize returned string

var getNames = function(node) {
	var props = calcNames(node);
	return 'accName: "' + props.name + '"\n\naccDesc: "' + props.desc + '"';
};

if (typeof module === 'object' && module.exports) {
	module.exports = {
		getNames: getNames,
		calcNames: calcNames,
	};
}