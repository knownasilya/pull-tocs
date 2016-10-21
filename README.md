# pull-tocs

Scrapes the Table of Contents from guides.emberjs.com
See https://github.com/ember-learn/guias/issues/4 for context.

## Usage

This scrapes the guides and table of contents, and uploads to couch.
This will run for all versions in the `versions.json` file located
in the [snapshots] directory.

To run:

```sh
GUIDES_DB_URL=urltocouch/db npm start
```

Note: Make sure the `GUIDES_DB_URL` has write access for the database it specifies.
If you don't specify the url, it defaults to localhost.

[snapshots]: https://github.com/emberjs/guides.emberjs.com/tree/master/snapshots
