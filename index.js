var fs = require('fs');
var cheerio = require('cheerio');
var request = require('request');
var baseUrl = 'https://guides.emberjs.com/';
var version = 'v2.8.0';
var url = baseUrl + version;
var toc = {
  language: 'en-us',
  version: version,
  sections: []
};

request(url, function (error, response, body) {
  var $ = cheerio.load(body);
  var $sections = $('li.toc-level-0');

  $sections.each(function () {
    var $section = $(this);
    var $link = $section.find('> a');
    var name = $link.text().trim();
    var href = $link.attr('href');
    var $guides = $section.find('ol li a');
    var section = {
      name: name
    };

    var guides = $guides.map(function () {
      var $guide = $(this);
      var guideName = $guide.text();
      var guideHref = $guide.attr('href');
      var hrefSplit = guideHref.split('/').map(function (i) { return i.trim() })
        .filter(function (i) { return !!i });
      var sectionId, guideId, derived;

      if (hrefSplit.length === 2) {
        sectionId = hrefSplit[0];
        guideId = hrefSplit[1];
      } else if (hrefSplit.length === 1) {
        sectionId = hrefSplit[0];
        guideId = guideName.toLowerCase().replace(/\s+/g, '-');
        derived = true;
      }

      if (!section.id) {
        section.id = sectionId;
      }

      return { name: guideName, href: guideHref, id: guideId, derived: derived };
    });

    section.guides = guides;
    toc.sections.push(section);
  });
  // Result
  console.log(toc);
});
