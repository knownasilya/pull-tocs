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
  if (error) {
    throw new Error(error);
  }

  var $ = cheerio.load(body);
  var $sections = $('li.toc-level-0');

  if (!$sections.length) {
    throw new Error('No TOC available');
  }

  $sections.each(function () {
    var $section = $(this);
    var $link = $section.find('> a');
    var name = $link.text().trim();
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

      // Both section and guide available
      if (hrefSplit.length === 2) {
        sectionId = hrefSplit[0];
        guideId = hrefSplit[1];
      // Only section is available, derive the guide id
      } else if (hrefSplit.length === 1) {
        sectionId = hrefSplit[0];
        guideId = guideName.toLowerCase().replace(/\s+/g, '-');
        derived = true;
      }

      // Set section id if it doesn't have one yet
      if (!section.id) {
        section.id = sectionId;
      }

      return {
        name: guideName,
        href: guideHref,
        id: guideId,
        derived: derived
      };
    });

    section.guides = guides;
    toc.sections.push(section);
  });

  // TODO: Push result up to couch
  // Maybe scrape the guides as well and fix their ids and next/previous links.
  console.log(toc);
});
