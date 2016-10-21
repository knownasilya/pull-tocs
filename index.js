var fs = require('fs');
var semver = require('semver');
var cheerio = require('cheerio');
var request = require('request');
var PouchDB = require('pouchdb');
var Bluebird = require('bluebird');
var dbUrl = 'http://localhost:5984/kittens';
var db = new PouchDB(dbUrl);
var language = 'en-US';
var baseUrl = 'https://guides.emberjs.com/';
var versionsUrl = 'https://cdn.rawgit.com/emberjs/guides.emberjs.com/master/snapshots/versions.json';

db.destroy().then(function () {
  db = new PouchDB(dbUrl);

  request(versionsUrl, function (error, response, body) {
    if (error) {
      throw new Error(error);
    }

    var versions = JSON.parse(body);

    versions.forEach(function(version, index) {
      var url = baseUrl + version;
      var toc = {
        type: 'toc',
        language: language,
        version: version,
        sections: []
      };

      request(url, function (error, response, body) {
        if (error) {
          throw new Error(error);
        }

        var $ = cheerio.load(body);
        var lt113 = semver.lt(version, 'v1.13.0');
        var $sections = $(lt113 ? 'li.level-1' : 'li.toc-level-0');

        if (!$sections.length) {
          throw new Error('No TOC available: ' + version);
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

          guides = Array.prototype.map.call(guides, function (item) {
            return {
              name: item.name,
              href: item.href,
              id: item.id,
              derived: item.derived
            };
          });

          section.guides = guides;
          toc.sections.push(section);
        });


        // TODO: Push result up to couch
        // Maybe scrape the guides as well and fix their ids and next/previous links.
        db.put({ _id: generateId(toc), data: toc }).then(function () {
          var tocGuide = getGuide($, version);
          // add version index
          var index = db.put({ _id: generateId({ version: version, section: 'index', guide: 'index' }), data: {
            type: 'guide',
            language: language,
            version: version,
            guide: 'index',
            html: tocGuide
          }});
          var all = [index];
          var guideDocs = toc.sections.reduce(function (all, section) {
            var localGuides = section.guides.map(function (guide) {
              return new Bluebird(function (resolve, reject) {
                var guideUrl = url + '/' + guide.href;
                request(guideUrl, function (error, response, body) {
                  if (error) {
                    return reject(error);
                  }

                  var $g = cheerio.load(body);
                  var guideHtml = getGuide($g, version);

                  resolve({
                    type: 'guide',
                    language: language,
                    version: version,
                    section: section.id,
                    guide: guide.id,
                    html: guideHtml
                  });
                });
              }).then(function (doc) {
                return db.put({ _id: generateId(doc), data: doc });
              });
            });
            all = all.concat(localGuides);
            return all;
          }, []);

          all = all.concat(guideDocs);

          return Bluebird.all(all);
        })
        .then(function () {
          console.log(version + ' success!');
        })
        .catch(function (error) {
          console.error(error);
          console.error(error.message);
          console.error(error.stack);
        });
      });
    });
  });
});

function getGuide($, version) {
  var $content;

  if (semver.lte(version, 'v2.2.0')) {
    $content = $('#content');
  } else {
    $content = $('article.chapter');
  }

  return $content.html();
}

function generateId(data) {
  var list = [
    data.type,
    2,
    language,
  ];
  var second = [
    data.version
  ];

  if (data.section) {
    second.push(data.section);
  }

  if (data.guide) {
    second.push(data.guide);
  }

  return list.join('-') + '--' + second.join('--');
}
