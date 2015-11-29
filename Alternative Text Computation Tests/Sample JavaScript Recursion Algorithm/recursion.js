/*!
[Excerpted from Visual ARIA Bookmarklet (11/28/2015)]
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

	var walk = function(obj, stop, refObj){
		var nm = '';

		walkDOM(obj, function(o, refObj){
			if (skip || !o || (o.nodeType === 1 && isHidden(o, refObj)))
				return;

			var name = '';

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
							name += ' ' + walk(rO, true, rO) + ' ';
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
					&& !rolePresentation && (o.nodeName.toLowerCase() == 'input' || o.nodeName.toLowerCase() == 'select') && o.id
						&& document.querySelectorAll('label[for="' + o.id + '"]').length){
					var rO = document.querySelectorAll('label[for="' + o.id + '"]')[0];
					name = ' ' + trim(walk(rO, true, rO)) + ' ';
				}

				if (!trim(name)
					&& !rolePresentation && (o.nodeName.toLowerCase() == 'img') && (trim(o.getAttribute('alt')) || nTitle)){
					name = ' ' + trim(o.getAttribute('alt') || nTitle) + ' ';
				}
			}

			else if (o.nodeType === 3){
				name = o.data;
			}

			if (name && !hasParentLabel(o, refObj, false, refObj)){
				nm += name;
			}
		}, refObj);

		return nm;
	};

	accName = walk(node, false, node);
	skip = false;

	if (title && !rPresentation){
		desc = trim(title);
	}

	if (aDescribedby && !rPresentation){
		var s = '', d = aDescribedby.split(' ');

		for (var j = 0; j < d.length; j++){
			var rO = document.getElementById(d[j]);
			s += ' ' + walk(rO, true, rO) + ' ';
		}

		if (trim(s))
			desc = s;
	}

	if (trim(desc) && !rPresentation)
		accDesc = desc;

	accName = trim(accName.replace(/\s/g, ' ').replace(/\s\s+/g, ' '));
	accDesc = trim(accDesc.replace(/\s/g, ' ').replace(/\s\s+/g, ' '));

	return 'accName: "' + accName + '"\naccDescription: "' + accDesc + '"';
};