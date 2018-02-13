W3C Accessible Name Computation Prototype 1.4
A functional prototype for the W3C Alternative Text Computation.

The Accessible Name Computation Prototype
-----

For testing purposes, a naming computation algorithm has been created using JavaScript for the purpose of simulating the accessible name computation that browsers should be reflecting in the accessibility tree, which has been constructed in accordance with the W3C AccName specification at
http://www.w3.org/TR/accname-aam-1.1/

Introduction
-----

To ensure interoperability, the W3C Alternative Text Computation must be supported in all browsers equally.

Five tests are included to see how well this is implemented; by using the same convoluted markup structure for each that combines many various aspects of labelling, including programmatically hidden content and nested markup structures.

If equally supported, all browsers would reflect the same strings as shown below for the Name and Description calculation.

Current Testing Results
-----

At present, accurate recursion within browsers is inconsistently and unreliably supported, and no Assistive Technologies match any of these naming algorithms.

The following test pages demonstrate this, which can be verified using Accessibility Tree examination utilities as documented at
http://whatsock.com/training/#hd2

Standard use of role="link" with nested content structures.
-----

https://whatsock.github.io/w3c-alternative-text-computation/Name%20and%20Description%20Tests/focusable%20role=link.html

The Accessibility Tree should match: Name: "My name is Garaventa the weird. (QED) Where are my marbles?" Description: ""

Browser Test Results:

* Win7 IE11: Name: "Hello,  My name is Zambino the weird. (QED) and don't you forget it. Where in the world are my marbles?" Description: ""
* Win7 Firefox: Name: "Hello, My name is Eli the weird. ( QED )" Description: ""
* (MATCHES) Win7 Chrome: Name: "My name is Garaventa the weird. (QED) Where are my marbles?" Description: ""
* iOS Safari: Name: "My name is Zambino the weird. (QED) Where are my marbles?" Description: ""

Standard form field with aria-labelledby to recursively process embedded markup.
-----

https://whatsock.github.io/w3c-alternative-text-computation/Name%20and%20Description%20Tests/form%20field%20with%20aria-labelledby.html

The Accessibility Tree should match: Name: "My name is Garaventa the weird. (QED) Where are my marbles?" Description: ""

Browser Test Results:

* Win7 IE11: Name: "" Description: ""
* Win7 Firefox: Name: "Hello, My name is Eli the weird. ( QED )" Description: ""
* (MATCHES) Win7 Chrome: Name: "My name is Garaventa the weird. (QED) Where are my marbles?" Description: ""
* iOS Safari: Name: "My name is Eli the weird. (QED) Where in are my marbles?" Description: ""

Standard form field that uses an HTML label element with matching 'for' and 'id' attributes.
-----

https://whatsock.github.io/w3c-alternative-text-computation/Name%20and%20Description%20Tests/form%20field%20with%20label%20element.html

The Accessibility Tree should match: Name: "My name is Garaventa the weird. (QED) Where are my marbles?" Description: ""

Browser Test Results:

* Win7 IE11: Name: "Hello, My name is Zambino the weird. (QED) and don't you forget it. Where in the world are my marbles?" Description: ""
* Win7 Firefox: Name: "Hello, My name is Eli the weird. (QED)" Description: ""
* (MATCHES) Win7 Chrome: Name: "My name is Garaventa the weird. (QED) Where are my marbles?" Description: ""
* iOS Safari: Name: "My name is Zambino the weird. (QED) Where are my marbles?" Description: ""

Standard form field that uses aria-label to set the Name and aria-describedby to set the Description.
-----

https://whatsock.github.io/w3c-alternative-text-computation/Name%20and%20Description%20Tests/form%20field%20with%20aria-describedby.html

The Accessibility Tree should match: Name: "Important stuff" Description: "My name is Garaventa the weird. (QED) Where are my marbles?"

Browser Test Results:

* Win7 IE11: Name: "Important stuff" Description: ""
* Win7 Firefox: Name: "Important stuff" Description: "Hello, My name is Eli the weird. ( QED )"
* (MATCHES) Win7 Chrome: Name: "Important stuff" Description: "My name is Garaventa the weird. (QED) Where are my marbles?"
* iOS Safari: Name: "Important stuff" Description: "My name is Eli the weird. (QED) Where in are my marbles?"

Standard form field that uses aria-labelledby to set the Name and aria-describedby to set the Description including hidden sections that surround the referenced elements.
-----

https://whatsock.github.io/w3c-alternative-text-computation/Name%20and%20Description%20Tests/form%20field%20with%20aria-describedby%20+%20hidden.html

The Accessibility Tree should match: Name: "Important stuff" Description: "My name is Garaventa the weird. (QED) Where are my marbles?"

Browser Test Results:

* Win7 IE11: Name: "Important stuff" Description: ""
* Win7 Firefox: Name: "Important stuff" Description: "Hello, My name is Zambino the weird. (QED) and don't you forget it. Where in the world are my marbles?"
* Win7 Chrome: Name: "" Description: "My name is Garaventa the weird. (QED) Where are my marbles?"
* iOS Safari: Name: "Important stuff" Description: "Hello, My name is Zambino the weird. (QED) and don't you forget it. Where in the world are my marbles?"

Conclusion
-----

Whenever external containers are referenced via aria-labelledby or aria-describedby or the HTML label element using matching 'for' and 'id' attributes, the recursive Alternative Text Computation should process the same subtrees even when aria-labelledby and aria-describedby referenced parent containers are hidden using CSS. When comparing these in the Accessibility Tree though, even within the same browsers, these algorithms don't match between the most common browsers.

Additionally, screen readers such as JAWS and NVDA don't come anywhere near conveying the same algorithm, often varying widely across differing browsers despite what is conveyed within the Accessibility Tree.

In the interest of ensuring future interoperability for web technologies across all devices, it would be beneficial for all browsers to equally support the same Alternative Text Computation algorithm, and have the same algorithm supported in ATs like screen readers as well, for all of the previously mentioned interactive elements and ARIA roles. If assistive technologies utilize the accessibility tree to convey this information, then these browser improvements will automatically increase accessibility within these assistive technologies.

Otherwise, it will be impossible to create complex dynamic constructs that are consistently and reliably labelled for Assistive Technology users in the future.