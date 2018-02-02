/*!
calcNames 1.2, compute the Name and Description property values for a DOM node
Returns an object with 'name' and 'desc' properties.
Authored by Bryan Garaventa plus contrabutions by Tobias Bengfort
Distributed under the terms of the Open Source Initiative OSI - MIT License
*/

var calcNames = function(node, fnc, preventVisualARIASelfCSSRef) {
	if (!node || node.nodeType !== 1) {
		return;
	}

	var trim = function(str) {
		if (typeof str !== 'string') {
			return '';
		}

		return str.replace(/^\s+|\s+$/g, '');
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

	var isException = function(node, refNode) {
		if (!refNode || !node || refNode.nodeType !== 1 || node.nodeType !== 1) {
			return false;
		}

		var list1 = {
			roles: ['link', 'button', 'checkbox', 'option', 'radio', 'switch', 'tab', 'treeitem', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'cell', 'columnheader', 'rowheader', 'tooltip', 'heading'],
			tags: ['a', 'button', 'summary', 'input', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'menuitem', 'option', 'td', 'th']
		};

		var list2 = {
			roles: ['application', 'alert', 'log', 'marquee', 'timer', 'alertdialog', 'dialog', 'banner', 'complementary', 'form', 'main', 'navigation', 'region', 'search', 'article', 'document', 'feed', 'figure', 'img', 'math', 'toolbar', 'menu', 'menubar', 'grid', 'listbox', 'radiogroup', 'textbox', 'searchbox', 'spinbutton', 'scrollbar', 'slider', 'tablist', 'tabpanel', 'tree', 'treegrid', 'separator'],
			tags: ['article', 'aside', 'body', 'select', 'datalist', 'optgroup', 'dialog', 'figure', 'footer', 'form', 'header', 'hr', 'img', 'textarea', 'input', 'main', 'math', 'menu', 'nav', 'section']
		};

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

	var isHidden = function(node, refNode) {
		if (node.nodeType !== 1 || node == refNode) {
			return false;
		}

		if (node.getAttribute('aria-hidden') === 'true') {
			return true;
		}

		var style = {};
		if (document.defaultView && document.defaultView.getComputedStyle) {
			style = document.defaultView.getComputedStyle(node, '');
		} else if (node.currentStyle) {
			style = node.currentStyle;
		}
		if (style['display'] === 'none' || style['visibility'] === 'hidden') {
			return true;
		}

		return false;
	};

	var getCSSText = function(node, refNode) {
		if (node.nodeType !== 1 || node == refNode || ['input', 'select', 'textarea', 'img', 'iframe'].indexOf(node.nodeName.toLowerCase()) !== -1) {
						return {before: '', after: ''};
		}

		var getText = function(node, position) {
			var text = document.defaultView.getComputedStyle(node, position).getPropertyValue('content').replace(/^\"|\"$/g, '');
			if (!text || text === 'none') {
								return '';
			} else {
				return text;
			}
		};

		if (document.defaultView && document.defaultView.getComputedStyle) {
			return {
				before: getText(node, ':before'),
				after: getText(node, ':after')
			};
		} else {
			return {before: '', after: ''};
		}
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

	var walk = function(refNode, stop, skip) {
		var fullName = '';
		var nodes = [];
		var cssOP = {
			before: '',
			after: ''
		};

		if (nodes.indexOf(refNode) === -1) {
			nodes.push(refNode);
			cssOP = getCSSText(refNode, null);

			// Enabled in Visual ARIA to prevent self referencing by Visual ARIA tooltips
			if (preventVisualARIASelfCSSRef) {
				if (cssOP.before.indexOf(' [ARIA] ') !== -1 || cssOP.before.indexOf(' aria-') !== -1) 
					cssOP.before = '';
				if (cssOP.after.indexOf(' [ARIA] ') !== -1 || cssOP.after.indexOf(' aria-') !== -1)  
					cssOP.after = '';
			}
		}

		walkDOM(refNode, function(node) {
			if (skip || !node || (isHidden(node, refNode))) {
				return;
			}

			var name = '';
			var cssO = {
				before: '',
				after: ''
			};

			var parent = refNode === node ? node : node.parentNode;
			if (nodes.indexOf(parent) === -1) {
				nodes.push(parent);
				cssO = getCSSText(parent, refNode);

				// Enabled in Visual ARIA to prevent self referencing by Visual ARIA tooltips
				if (preventVisualARIASelfCSSRef) {
					if (cssO.before.indexOf(' [ARIA] ') !== -1 || cssO.before.indexOf(' aria-') !== -1) 
						cssO.before = '';
					if (cssO.after.indexOf(' [ARIA] ') !== -1 || cssO.after.indexOf(' aria-') !== -1)  
						cssO.after = '';
				}

			}

			if (node.nodeType === 1) {
				var aLabelledby = node.getAttribute('aria-labelledby') || '';
				var aLabel = node.getAttribute('aria-label') || '';
				var nTitle = node.getAttribute('title') || '';
				var rolePresentation = ['presentation', 'none'].indexOf(node.getAttribute('role')) !== -1;

				if (!node.firstChild || (node == refNode && (aLabelledby || aLabel)) || (node.firstChild && node != refNode && aLabel)) {
					if (!stop && node === refNode && aLabelledby) {
						if (!rolePresentation) {
							var ids = aLabelledby.split(/\s+/);
							var parts = [];

							for (var i = 0; i < ids.length; i++) {
								var element = document.getElementById(ids[i]);
								parts.push(walk(element, true, skip));
							}
							name = parts.join(' ');
						}

						if (name || rolePresentation) {
							skip = true;
						}
					}

/*!@ Add values of custom controls here if recursive controls with values */

					if (!name && !rolePresentation && aLabel) {
						name = aLabel;

						if (name && node === refNode) {
							skip = true;
						}
					}

					if (!name && !rolePresentation && ['input', 'select', 'textarea'].indexOf(node.nodeName.toLowerCase()) !== -1 && node.id && document.querySelectorAll('label[for="' + node.id + '"]').length) {
						var label = document.querySelector('label[for="' + node.id + '"]');
						name = walk(label, true, skip);
					}

					if (!name && !rolePresentation && node.nodeName.toLowerCase() == 'img' && node.getAttribute('alt')) {
						name = node.getAttribute('alt');
					}

					if (!name && !rolePresentation && nTitle) {
						name = nTitle;
					}
				}
			} else if (node.nodeType === 3) {
				name = node.data;
			}

			name = cssO.before + name + cssO.after;

			if (name && !hasParentLabel(node, false, refNode)) {
				fullName += name;
			}
		}, refNode);

		fullName = cssOP.before + fullName + cssOP.after;
		return fullName;
	};

	if (isHidden(node, document.body) || hasParentLabel(node, true, document.body)) {
		return;
	}

	var accName = walk(node, false);
	var accDesc = '';

	if (['presentation', 'none'].indexOf(node.getAttribute('role')) === -1) {
		var desc = '';

		var title = node.getAttribute('title') || '';
		if (title) {
			if (!accName) {
				accName = title;
			} else {
				accDesc = title;
			}
		}

		var describedby = node.getAttribute('aria-describedby') || '';
		if (describedby) {
			var ids = describedby.split(/\s+/);
			var parts = [];

			for (var j = 0; j < ids.length; j++) {
				var element = document.getElementById(ids[j]);
				parts.push(walk(element, true));
			}

			if (parts.length) {
				accDesc = parts.join(' ');
			}
		}
	}

	accName = trim(accName.replace(/\s+/g, ' '));
	accDesc = trim(accDesc.replace(/\s+/g, ' '));

	if (accName === accDesc) {
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