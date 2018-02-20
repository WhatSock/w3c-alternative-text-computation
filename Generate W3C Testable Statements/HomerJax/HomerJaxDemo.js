sFile = 'C:\\HomerJax\\HomerJax.wsc'
oJax = GetObject('script:' + sFile)

/*

sUrl = 'http://google.com'
oJax.DialogShow('Task', 'Get content type of front page of google.com')
sText = oJax.WebUrlContentType(sUrl)
oJax.DialogShow('Result', sText)

oJax.DialogShow('Task', 'Check whether content type of front page of google.com is HTML')
if (oJax.WebUrlIsHtml(sUrl)) {
sText = 'True'}
else {
sText = 'False'
}
oJax.DialogShow('Result', sText)

oJax.DialogShow('Task', 'Get source HTML of front page of google.com')
sText = oJax.WebUrlToString(sUrl)
oJax.DialogShow('Result', sText)

oJax.DialogShow('Task', 'Get plain text of front page of google.com')
sText = oJax.HtmlGetText(sUrl)
oJax.DialogShow('Result', sText)

oJax.DialogShow('Task', 'Get list of URLs and linked text from front page of google.com')
lLinks = oJax.HtmlGetLinks(sUrl)
sText = ''
for (i = 0; i <lLinks.Count; i++) {
lLink = lLinks(i)
sText += lLink(0) + ' = ' + lLink(1) + '\r\n'
}
oJax.DialogShow('Result', sText)

oJax.DialogShow('Task', 'Save front page of google.com to temporary file')
sFile = oJax.PathGetTempFile()
bResult = oJax.WebUrlToFile(sUrl, sFile)
sText = 'Failed to save to file' + '\r\n' + sFile
if (bResult) {
sText = 'Saved to' + '\r\n' + sFile + '\r\n' + 'About to delete this temporary file'
}
oJax.DialogShow('Result', sText)
oJax.FileDelete(sFile)

*/

/*
oJax.DialogShow('Task', "Translate 'Hello world' to Italian via Google API")
sUrl = 'http://ajax.googleapis.com/ajax/services/language/translate'
dData = oJax.JsToVt("{'q' : 'Hello world', 'v' : '1.0', 'langpair' : 'en|it'}")
dHeaders = oJax.JsToVt("{'Referer' : 'http://EmpowermentZone.com'}")
sJs = oJax.WebRequestPostToString(sUrl, dData, dHeaders, null, null)
vData = oJax.JsToVt(sJs)
dData = vData.Item('responseData')
sText = dData.Item('translatedText')
oJax.DialogShow('Result', sText)
*/



oJax.DialogShow('Task', 'Read recent items from RSS feed of AccessibleWorld.org')
sUrl = 'http://accessibleworld.org/rss.xml'
oDoc = oJax.WebUrlToXml(sUrl)
oNodes = oJax.XmlGetNodes(oDoc, '*/item')
sText = ''
for (i = 0; i < oNodes.Count; i++) {
oNode = oNodes.Item(i)
s = oJax.XmlGetText(oNode, 'title')
sText = sText + s + '\n'
}
oJax.DialogShow('Result', sText)

oJax.DialogShow('Task', 'Get a list of MP3 files linked to the front page of AccessibleWorld.org')
sUrl = 'http://accessibleworld.org'
lUrls = oJax.HtmlGetUrls(sUrl)
sMatch = '\\.mp3$'
lUrls = oJax.VtListFilterByRegExp(lUrls, sMatch)
s = oJax.StringPlural('file', lUrls.Count)
sText = 'This list of ' + s + ' could be downloaded with a single method\n\n'
s = oJax.VtListToString(lUrls, '\n')
sText = sText + s
oJax.DialogShow('Result', sText)


oJax.DialogShow('Task', 'Get last 20 tweets from public timeline of twitter.com')
sUrl = 'http://twitter.com/statuses/public_timeline.json'
sJs = oJax.WebUrlToString(sUrl)
// oJax.DialogShow('JSON from Twitter', sJs)
sJs = "[{user: 'dog', screen_name: 'Rover Robertson', text: 'Woof'}, {user: 'cat', screen_name: 'Kitty Kitaldo', text: 'Meow'}]"
// a = eval(sJs, "unsafe")
// s = oJax.JsInspectObject('test', a)
// oJax.DialogShow('s', s)

lTweets = oJax.JsToVt(sJs)
sText = ''
oJax.DialogShow('count', lTweets.Count)
for (i = 0; i < lTweets.Count; i++) {
dTweet = lTweets(i)
s = dTweet('user')
sText = sText + s
s = dTweet('text')
sText = sText + ': ' + s + '\r\n'
}
oJax.DialogShow('Result', sText)

oJax.DialogShow('oJax demo is done', '')
dTweet = null
lTweets = null
lLink = null
lLinks = null
oJax = null
