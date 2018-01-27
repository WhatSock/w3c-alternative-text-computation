/*!
calcNames 1.1 (01/15/2018), compute the Name and Description property values for a DOM node
Returns an object with 'name' and 'desc' properties.
[Excerpted from Visual ARIA ( https://raw.githubusercontent.com/accdc/visual-aria/master/docs/visual-aria/roles.js )
Copyright 2018 Bryan Garaventa (http://whatsock.com/training/matrices/visual-aria.htm)
Part of the ARIA Role Conformance Matrices, distributed under the terms of the Open Source Initiative OSI - MIT License
*/

var calcNames = function(node, fnc, preventSelfCSSRef) {
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
		fn(node, refNode);

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
			return false;
		}

		var getText = function(node, position) {
			var text = document.defaultView.getComputedStyle(node, position).getPropertyValue('content');
			if (!text || text === 'none') {
				return '';
			} else {
				return trim(text);
			}
		};

		if (document.defaultView && document.defaultView.getComputedStyle) {
			return {
				before: getText(node, ':before'),
				after: getText(node, ':after')
			};
		} else {
			return {
				before: '',
				after: ''
			};
		}
	};

	var hasParentLabel = function(node, noLabel, refNode) {
		while (node && node !== refNode) {
			node = node.parentNode;

			if (node.getAttribute) {
				if (['presentation', 'none'].indexOf(node.getAttribute('role')) === -1) {
					if (!noLabel && trim(node.getAttribute('aria-label'))) {
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

	var skip = false;
	var walk = function(refNode, stop) {
		var nm = '';
		var nds = [];
		var cssOP = {};

		if (nds.indexOf(refNode) === -1) {
			nds.push(refNode);

			// Enabled in Visual ARIA to prevent self referencing by Visual ARIA tooltips
			if (!preventSelfCSSRef) {
				cssOP = getCSSText(refNode, null);
			}
		}

		walkDOM(refNode, function(o, refNode) {
			if (skip || !o || (o.nodeType === 1 && isHidden(o, refNode))) {
				return;
			}

			var name = '', cssO = {};

			if (nds.indexOf(refNode && refNode == o ? o : o.parentNode) === -1) {
				nds.push(refNode && refNode == o ? o : o.parentNode);
				cssO = getCSSText(refNode && refNode == o ? o : o.parentNode, refNode);
			}

			if (o.nodeType === 1) {
				var aLabelledby = o.getAttribute('aria-labelledby') || '', aLabel = o.getAttribute('aria-label') || '',
					nTitle = o.getAttribute('title') || '', rolePresentation = o.getAttribute('role');
				rolePresentation = (rolePresentation != 'presentation' && rolePresentation != 'none') ? false : true;
			}

			if (o.nodeType === 1
				&& ((!o.firstChild || (o == refNode && (aLabelledby || aLabel))) || (o.firstChild && o != refNode && aLabel))) {
				if (!stop && o == refNode && aLabelledby) {
					if (!rolePresentation) {
						var a = aLabelledby.split(' ');

						for (var i = 0; i < a.length; i++) {
							var rO = document.getElementById(a[i]);
							name += ' ' + walk(rO, true) + ' ';
						}
					}

					if (trim(name) || rolePresentation) {
						skip = true;
					}
				}

				if (!trim(name) && aLabel && !rolePresentation) {
					name = ' ' + trim(aLabel) + ' ';

					if (trim(name) && o == refNode) {
						skip = true;
					}
				}

				if (!trim(name)
					&& !rolePresentation && ' input select textarea '.indexOf(' ' + o.nodeName.toLowerCase() + ' ') !== -1 && o.id
						&& document.querySelectorAll('label[for="' + o.id + '"]').length) {
					var rO = document.querySelectorAll('label[for="' + o.id + '"]')[0];
					name = ' ' + trim(walk(rO, true)) + ' ';
				}

				if (!trim(name) && !rolePresentation && (o.nodeName.toLowerCase() == 'img') && (trim(o.getAttribute('alt')))) {
					name = ' ' + trim(o.getAttribute('alt')) + ' ';
				}

				if (!trim(name) && !rolePresentation && nTitle) {
					name = ' ' + trim(nTitle) + ' ';
				}
			} else if (o.nodeType === 3) {
				name = o.data;
			}

			if (cssO.before) {
				name = cssO.before + ' ' + name;
			}

			if (cssO.after) {
				name += ' ' + cssO.after;
			}
			name = ' ' + trim(name) + ' ';

			if (trim(name) && !hasParentLabel(o, false, refNode)) {
				nm += name;
			}
		}, refNode);

		if (cssOP.before) {
			nm = cssOP.before + ' ' + nm;
		}

		if (cssOP.after) {
			nm += ' ' + cssOP.after;
		}
		nm = trim(nm);

		return nm;
	};

	if (isHidden(node, document.body) || hasParentLabel(node, true, document.body)) {
		return;
	}

	var accName = trim(walk(node, false));
	var accDesc = '';
	skip = false;

	if (['presentation', 'none'].indexOf(node.getAttribute('role')) === -1) {
		var desc = '';

		var title = trim(node.getAttribute('title')) || '';
		if (title) {
			if (!accName) {
				accName = title;
			} else {
				accDesc = title;
			}
		}

		var describedby = node.getAttribute('aria-describedby') || '';
		if (describedby) {
			var s = '';
			var ids = aDescribedby.split(' ');

			for (var j = 0; j < ids.length; j++) {
				var element = document.getElementById(ids[j]);
				s += ' ' + walk(element, true) + ' ';
			}
			s = trim(s);

			if (s) {
				accDesc = s;
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