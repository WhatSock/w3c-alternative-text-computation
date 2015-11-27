# w3c-alternative-text-computation
A study of browser and Assistive Technology support for the W3C Alternative Text Computation.

Updated: 11/27/2015

To ensure interoperability, the W3C Alternative Text Computation should be supported in all browsers equally. So I built 5 tests to see how well this is implemented; by using the same convoluted markup structure for each that combines many various aspects of labelling, including programmatically hidden content and nested markup structures. If equally supported, all browsers would reflect the same strings as shown below for the Name and Description calculation.

Visual ARIA is included within each test page to validate a shared Name and Description according to the Alternative Text Computation, as documented at
http://www.w3.org/TR/accname-aam-1.1/#mapping_additional_nd_te
(Which is exposed when mousing over the ARIA Link or form edit field on the test pages after loading Visual ARIA)

This Name and Description algorithm is specifically geared for the following active element types and ARIA roles:

* All HTML input, select, and button elements. 
* All HTML A elements that include an 'href' attribute.  
* All of the ARIA roles: "button", "checkbox", "link", "searchbox", "scrollbar", "slider", "spinbutton", "switch", "textbox", "combobox", "option", "menuitem", "menuitemcheckbox", "menuitemradio", "radio", "tab", "treeitem"

A summary of this calculation is documented at
http://whatsock.com/training/matrices/visual-aria.htm#alternative-text-calculation

Currently, accurate recursion within browsers is inconsistently and unreliably supported, and no Assistive Technologies match any of these naming algorithms.

The following test pages demonstrate this, which can be verified using Accessibility Tree examination utilities as documented at
http://whatsock.com/training/#hd2

Standard use of role="link" with nested content structures.
-----

http://whatsock.com/test/Alternative%20Text%20Calculation/focusable%20role=link.html

The Accessibility Tree should match: Name: "My name is Garaventa the weird. (QED) Where are my marbles?" Description: ""

Browser Test Results:

* Win7 IE11: Name: "Hello,  My name is Zambino the weird. (QED) and don't you forget it. Where in the world are my marbles?" Description: ""
* Win7 Firefox: Name: "Hello, My name is Eli the weird. ( QED )" Description: ""
* Win7 Chrome: Name: "My name is Eli the weird. (QED) Where in are my marbles?" Description: ""
* iOS Safari: Name: "My name is Zambino the weird. (QED) Where are my marbles?" Description: ""

Standard form field with aria-labelledby to recursively process embedded markup.
-----

http://whatsock.com/test/Alternative%20Text%20Calculation/form%20field%20with%20aria-labelledby.html

The Accessibility Tree should match: Name: "My name is Garaventa the weird. (QED) Where are my marbles?" Description: ""

Browser Test Results:

* Win7 IE11: Name: "" Description: ""
* Win7 Firefox: Name: "Hello, My name is Eli the weird. ( QED )" Description: ""
* Win7 Chrome: Name: "Hello, My name is Bryan Zambino the weird. (QED) and don't you forget it. Where in the world are my marbles?" Description: ""
* iOS Safari: Name: "My name is Eli the weird. (QED) Where in are my marbles?" Description: ""

Standard form field that uses an HTML label element with matching 'for' and 'id' attributes.
-----

http://whatsock.com/test/Alternative%20Text%20Calculation/form%20field%20with%20label%20element.html

The Accessibility Tree should match: Name: "My name is Garaventa the weird. (QED) Where are my marbles?" Description: ""

Browser Test Results:

* Win7 IE11: Name: "Hello, My name is Zambino the weird. (QED) and don't you forget it. Where in the world are my marbles?" Description: ""
* Win7 Firefox: Name: "Hello, My name is Eli the weird. (QED)" Description: ""
* Win7 Chrome: Name: "My name isGaraventathe weird. (QED)Whereare my marbles?" Description: ""
* iOS Safari: Name: "My name is Zambino the weird. (QED) Where are my marbles?" Description: ""

Standard form field that uses aria-label to set the Name and aria-describedby to set the Description.
-----

http://whatsock.com/test/Alternative%20Text%20Calculation/form%20field%20with%20aria-describedby.html

The Accessibility Tree should match: Name: "Important stuff" Description: "My name is Garaventa the weird. (QED) Where are my marbles?"

Browser Test Results:

* Win7 IE11: Name: "Important stuff" Description: ""
* Win7 Firefox: Name: "Important stuff" Description: "Hello, My name is Eli the weird. ( QED )"
* Win7 Chrome: Name: "Important stuff" Description: " Hello, My name is Bryan Zambino the weird. (QED) and don't you forget it. Where in the world are my marbles?"
* iOS Safari: Name: "Important stuff" Description: "My name is Eli the weird. (QED) Where in are my marbles?"

Standard form field that uses aria-labelledby to set the Name and aria-describedby to set the Description including hidden sections that surround the referenced elements.
-----

http://whatsock.com/test/Alternative%20Text%20Calculation/form%20field%20with%20aria-describedby%20+%20hidden.html

The Accessibility Tree should match: Name: "Important stuff" Description: "My name is Garaventa the weird. (QED) Where are my marbles?"

Browser Test Results:

* Win7 IE11: Name: "Important stuff" Description: ""
* Win7 Firefox: Name: "Important stuff" Description: "Hello, My name is Zambino the weird. (QED) and don't you forget it. Where in the world are my marbles?"
* Win7 Chrome: Name: "Important stuff" Description: " Hello, My name is Bryan Zambino the weird. (QED) and don't you forget it. Where in the world are my marbles?"
* iOS Safari: Name: "Important stuff" Description: "Hello, My name is Zambino the weird. (QED) and don't you forget it. Where in the world are my marbles?"

Conclusion
-----

Whenever external containers are referenced via aria-labelledby or aria-describedby or the HTML label element using matching 'for' and 'id' attributes, the recursive Alternative Text Computation should process the same subtrees even when aria-labelledby and aria-describedby referenced parent containers are hidden using CSS. When comparing these in the Accessibility Tree though, even within the same browsers, these algorithms don't match between the most common browsers.

Additionally, screen readers such as JAWS and NVDA don't come anywhere near conveying the same algorithm, often varying widely across differing browsers despite what is conveyed within the Accessibility Tree.

In the interest of ensuring future interoperability for web technologies across all devices, it would be beneficial for all browsers to equally support the same Alternative Text Computation algorithm, and have the same algorithm supported in ATs like screen readers as well, for all of the previously mentioned interactive elements and ARIA roles.

Otherwise, it will be impossible to create complex dynamic constructs that are consistently and reliably labelled for Assistive Technology users in the future.