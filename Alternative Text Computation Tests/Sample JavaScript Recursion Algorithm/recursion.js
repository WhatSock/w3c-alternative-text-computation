/*!
[Excerpted from Visual ARIA Bookmarklet (02/01/2017)]
( https://raw.githubusercontent.com/accdc/aria-matrices/master/The%20ARIA%20Role%20Conformance%20Matrices/visual-aria/roles.js )
*/

var calcNames = function(node){
	if (!node || node.nodeType !== 1)
		return;

	var trim = function(str){
		if (typeof str !== 'string')
			return '';

		return str.replace(/^\s+|\s+$/g, '');
	}, walkDOM = function(node, fn, refObj){
		if (!node)
			return;
		fn(node, refObj);
		node = node.firstChild;

		while (node){
			walkDOM(node, fn, refObj);
			node = node.nextSibling;
		}
	}, isHidden = function(o, refObj){
		if (o.nodeType !== 1 || o == refObj)
			return false;

		if (o != refObj && ((o.getAttribute && o.getAttribute('aria-hidden') == 'true')
			|| (o.currentStyle && (o.currentStyle['display'] == 'none' || o.currentStyle['visibility'] == 'hidden'))
				|| (document.defaultView && document.defaultView.getComputedStyle && (document.defaultView.getComputedStyle(o,
					'')['display'] == 'none' || document.defaultView.getComputedStyle(o, '')['visibility'] == 'hidden'))
				|| (o.style && (o.style['display'] == 'none' || o.style['visibility'] == 'hidden'))))
			return true;
		return false;
	}, inArray = function(search, stack){
		for (var i = 0; i < stack.length; i++){
			if (stack[i] === search){
				return i;
			}
		}

		return -1;
	}, getCSSText = function(o, refObj){
		if (o.nodeType !== 1 || o == refObj
			|| ' input select textarea img iframe '.indexOf(' ' + o.nodeName.toLowerCase() + ' ') !== -1)
			return false;
		var css =
						{
						before: '',
						after: ''
						};

		if ((document.defaultView && document.defaultView.getComputedStyle
			&& (document.defaultView.getComputedStyle(o, ':before').getPropertyValue('content')
				|| document.defaultView.getComputedStyle(o, ':after').getPropertyValue('content')))){
			css.before = trim(document.defaultView.getComputedStyle(o, ':before').getPropertyValue('content'));
			css.after = trim(document.defaultView.getComputedStyle(o, ':after').getPropertyValue('content'));

			if (css.before == 'none')
				css.before = '';

			if (css.after == 'none')
				css.after = '';
		}
		return css;
	}, hasParentLabel = function(start, targ, noLabel, refObj){
		if (!start || !targ || start == targ)
			return false;

		while (start){
			start = start.parentNode;

			var rP = start.getAttribute ? start.getAttribute('role') : '';
			rP = (rP != 'presentation' && rP != 'none') ? false : true;

			if (!rP && start.getAttribute && ((!noLabel && trim(start.getAttribute('aria-label'))) || isHidden(start, refObj))){
				return true;
			}

			else if (start == targ)
				return false;
		}

		return false;
	};

	if (isHidden(node, document.body) || hasParentLabel(node, document.body, true, document.body))
		return;

	var accName = '', accDesc = '', desc = '', aDescribedby = node.getAttribute('aria-describedby') || '',
		title = node.getAttribute('title') || '', skip = false, rPresentation = node.getAttribute('role');
	rPresentation = (rPresentation != 'presentation' && rPresentation != 'none') ? false : true;

	var walk = function(obj, stop, refObj, isIdRef){
		var nm = '', nds = [], cssOP = {}, idRefNode = null;

		if (inArray(obj, nds) === -1){
			nds.push(obj);

			if (isIdRef)
				idRefNode = obj;
			cssOP = getCSSText(obj, null);
		}

		walkDOM(obj, function(o, refObj){
			if (skip || !o || (o.nodeType === 1 && isHidden(o, refObj)))
				return;

			var name = '', cssO = {};

			if (inArray(idRefNode && idRefNode == o ? o : o.parentNode, nds) === -1){
				nds.push(idRefNode && idRefNode == o ? o : o.parentNode);
				cssO = getCSSText(idRefNode && idRefNode == o ? o : o.parentNode, refObj);
			}

			if (o.nodeType === 1){
				var aLabelledby = o.getAttribute('aria-labelledby') || '', aLabel = o.getAttribute('aria-label') || '',
					nTitle = o.getAttribute('title') || '', rolePresentation = o.getAttribute('role');
				rolePresentation = (rolePresentation != 'presentation' && rolePresentation != 'none') ? false : true;
			}

			if (o.nodeType === 1
				&& ((!o.firstChild || (o == refObj && (aLabelledby || aLabel))) || (o.firstChild && o != refObj && aLabel))){
				if (!stop && o == refObj && aLabelledby){
					if (!rolePresentation){
						var a = aLabelledby.split(' ');

						for (var i = 0; i < a.length; i++){
							var rO = document.getElementById(a[i]);
							name += ' ' + walk(rO, true, rO, true) + ' ';
						}
					}

					if (trim(name) || rolePresentation)
						skip = true;
				}

				if (!trim(name) && aLabel && !rolePresentation){
					name = ' ' + trim(aLabel) + ' ';

					if (trim(name) && o == refObj)
						skip = true;
				}

				if (!trim(name)
					&& !rolePresentation && ' input select textarea '.indexOf(' ' + o.nodeName.toLowerCase() + ' ') !== -1 && o.id
						&& document.querySelectorAll('label[for="' + o.id + '"]').length){
					var rO = document.querySelectorAll('label[for="' + o.id + '"]')[0];
					name = ' ' + trim(walk(rO, true, rO, true)) + ' ';
				}

				if (!trim(name) && !rolePresentation && (o.nodeName.toLowerCase() == 'img') && (trim(o.getAttribute('alt')))){
					name = ' ' + trim(o.getAttribute('alt')) + ' ';
				}

				if (!trim(name) && !rolePresentation && nTitle){
					name = ' ' + trim(nTitle) + ' ';
				}
			}

			else if (o.nodeType === 3){
				name = o.data;
			}

			if (cssO.before)
				name = cssO.before + ' ' + name;

			if (cssO.after)
				name += ' ' + cssO.after;
			name = ' ' + trim(name) + ' ';

			if (trim(name) && !hasParentLabel(o, refObj, false, refObj)){
				nm += name;
			}
		}, refObj);

		if (cssOP.before)
			nm = cssOP.before + ' ' + nm;

		if (cssOP.after)
			nm += ' ' + cssOP.after;
		nm = trim(nm);

		return nm;
	};

	accName = walk(node, false, node);
	skip = false;

	if (title && !rPresentation){
		if (!trim(accName))
			accName = trim(title);

		else
			desc = trim(title);
	}

	if (aDescribedby && !rPresentation){
		var s = '', d = aDescribedby.split(' ');

		for (var j = 0; j < d.length; j++){
			var rO = document.getElementById(d[j]);
			s += ' ' + walk(rO, true, rO, true) + ' ';
		}

		if (trim(s))
			desc = s;
	}

	if (trim(desc) && !rPresentation)
		accDesc = desc;

	accName = trim(accName.replace(/\s/g, ' ').replace(/\s\s+/g, ' '));
	accDesc = trim(accDesc.replace(/\s/g, ' ').replace(/\s\s+/g, ' '));

	if (accName == accDesc)
		accDesc = '';

	return 'accName: "' + accName + '"\naccDescription: "' + accDesc + '"';
};