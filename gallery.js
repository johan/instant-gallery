var links = $x('//a[@href and .//img]');
if (links.length) {
  chrome.extension.sendRequest({ urls: links.map(url) }, init);
}

function url(a) {
  return a.href;
}


function init(response) {
}
