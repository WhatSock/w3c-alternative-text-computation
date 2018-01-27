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
			names: ['a', 'button', 'summary', 'input', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'menuitem', 'option', 'td', 'th']
		};

		var list2 = {
			roles: ['application', 'alert', 'log', 'marquee', 'timer', 'alertdialog', 'dialog', 'banner', 'complementary', 'form', 'main', 'navigation', 'region', 'search', 'article', 'document', 'feed', 'figure', 'img', 'math', 'toolbar', 'menu', 'menubar', 'grid', 'listbox', 'radiogroup', 'textbox', 'searchbox', 'spinbutton', 'scrollbar', 'slider', 'tablist', 'tabpanel', 'tree', 'treegrid', 'separator',
			names: ['article', 'aside', 'body', 'select', 'datalist', 'optgroup', 'dialog', 'figure', 'footer', 'form', 'header', 'hr', 'img', 'textarea', 'input', 'main', 'math', 'menu', 'nav', 'section']
		};

		var list3 = {
			roles: ['combobox', 'term', 'definition', 'directory', 'list', 'group', 'note', 'status', 'table', 'rowgroup', 'row', 'contentinfo'],
			names: ['dl', 'ul', 'ol', 'dd', 'details', 'output', 'table', 'thead', 'tbody', 'tfoot', 'tr']
		};

		var inList = function(node, list) {
			var role = node.getAttribute('role');
			var name = node.nodeName.toLowerCase();
			return (
				list.roles.indexOf(role) >= 0 ||
				(!role && list2.names.indexOf(name) >= 0)
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

	var isHidden = function(o, refNode) {
		if (o.nodeType !== 1 || o == refNode) {
			return false;
		}

		if (o != refNode && ((o.getAttribute && o.getAttribute('aria-hidden') == 'true')
			|| (o.currentStyle && (o.currentStyle['display'] == 'none' || o.currentStyle['visibility'] == 'hidden'))
				|| (document.defaultView && document.defaultView.getComputedStyle && (document.defaultView.getComputedStyle(o,
					'')['display'] == 'none' || document.defaultView.getComputedStyle(o, '')['visibility'] == 'hidden'))
				|| (o.style && (o.style['display'] == 'none' || o.style['visibility'] == 'hidden'))))
			return true;
		return false;
	};

	var inArray = function(search, stack) {
		for (var i = 0; i < stack.length; i++) {
			if (stack[i] === search) {
				return i;
			}
		}

		return -1;
	};

	var getCSSText = function(o, refNode) {
		if (o.nodeType !== 1 || o == refNode
			|| ['input', 'select', 'textarea', 'img', 'iframe'].indexOf(o.nodeName.toLowerCase()) !== -1)
			return false;
		var css = {
			before: '',
			after: ''
		};

		if ((document.defaultView && document.defaultView.getComputedStyle
			&& (document.defaultView.getComputedStyle(o, ':before').getPropertyValue('content')
				|| document.defaultView.getComputedStyle(o, ':after').getPropertyValue('content')))) {
			css.before = trim(document.defaultView.getComputedStyle(o, ':before').getPropertyValue('content'));
			css.after = trim(document.defaultView.getComputedStyle(o, ':after').getPropertyValue('content'));

			if (css.before == 'none') {
				css.before = '';
			}

			if (css.after == 'none') {
				css.after = '';
			}
		}
		return css;
	}

	var hasParentLabel = function(start, targ, noLabel, refNode) {
		if (!start || !targ || start == targ) {
			return false;
		}

		while (start) {
			start = start.parentNode;

			var rP = start.getAttribute ? start.getAttribute('role') : '';
			rP = (rP != 'presentation' && rP != 'none') ? false : true;

			if (!rP && start.getAttribute && ((!noLabel && trim(start.getAttribute('aria-label'))) || isHidden(start, refNode))) {
				return true;
			}

			else if (start == targ)
				return false;
		}

		return false;
	};

	if (isHidden(node, document.body) || hasParentLabel(node, document.body, true, document.body)) {
		return;
	}

	var accName = '';
	var accDesc = '';
	var desc = '';
	var aDescribedby = node.getAttribute('aria-describedby') || '';
	var title = node.getAttribute('title') || '';
	var skip = false;
	var rPresentation = node.getAttribute('role');
	rPresentation = (rPresentation != 'presentation' && rPresentation != 'none') ? false : true;

	var walk = function(obj, stop, refNode, isIdRef) {
		var nm = '', nds = [], cssOP = {}, idRefNode = null;

		if (inArray(obj, nds) === -1) {
			nds.push(obj);

			if (isIdRef || obj == refNode) {
				idRefNode = obj;
			}

			// Enabled in Visual ARIA to prevent self referencing by Visual ARIA tooltips
			if (!preventSelfCSSRef) {
				cssOP = getCSSText(obj, null);
			}
		}

		walkDOM(obj, function(o, refNode) {
			if (skip || !o || (o.nodeType === 1 && isHidden(o, refNode))) {
				return;
			}

			var name = '', cssO = {};

			if (inArray(idRefNode && idRefNode == o ? o : o.parentNode, nds) === -1) {
				nds.push(idRefNode && idRefNode == o ? o : o.parentNode);
				cssO = getCSSText(idRefNode && idRefNode == o ? o : o.parentNode, refNode);
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
							name += ' ' + walk(rO, true, rO, true) + ' ';
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
					name = ' ' + trim(walk(rO, true, rO, true)) + ' ';
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

			if (trim(name) && !hasParentLabel(o, refNode, false, refNode)) {
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

	accName = walk(node, false, node);
	skip = false;

	if (title && !rPresentation) {
		if (!trim(accName)) {
			accName = trim(title);
		} else {
			desc = trim(title);
		}
	}

	if (aDescribedby && !rPresentation) {
		var s = '', d = aDescribedby.split(' ');

		for (var j = 0; j < d.length; j++) {
			var rO = document.getElementById(d[j]);
			s += ' ' + walk(rO, true, rO, true) + ' ';
		}

		if (trim(s)) {
			desc = s;
		}
	}

	if (trim(desc) && !rPresentation) {
		accDesc = desc;
	}

	accName = trim(accName.replace(/\s/g, ' ').replace(/\s\s+/g, ' '));
	accDesc = trim(accDesc.replace(/\s/g, ' ').replace(/\s\s+/g, ' '));

	if (accName == accDesc) {
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