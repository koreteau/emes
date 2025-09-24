# EMES. - Enterprise Managment Ecosystem Solution

Oracle HFM–style application: ReactJS (frontend), ExpressJS (API), PostgreSQL (data).
Reports V1: tables only, same POV engine and the same GET /api/data as webforms, on-demand PDF/PNG export (no archiving)

## Features

* Explorer: lists documents stored in the DB (capaci_documents) and opens them in tabs.
* Webform: readable (and later writable) grids driven by webform_*.json.
* Report (V1): read-only reports using a JSON format compatible with webforms (identical POV), composed of table sections.
* POV (Point of View): member selection modes (Only, Descendants, Base) applied identically in webforms and reports.
* Export: PDF/PNG via Puppeteer, on demand (no automatic storage).
* Permissions: access filtered by security_classes on capaci_documents.

## Architecture

```
api/
    controllers/
        documentsController.js              # read documents (webform/report) + PDF/PNG export
        ...
    routes/
        documents.js                        # REST routes /api/documents/*
        ...
    custom/                                 # custom JS scripts
    dsl/                                    # futur Domain-Specific Language to replace the custom/ JS scripts
    middleware/                             # middleware for authentication and permissions
    utils/                                  # general utils files (here to write logs)
    server.js                               # file to run the API server
    ...


database/
    documents/                              # JSON files for webforms & reports (path = <doc.path>.json)
    config/                                 


app/ (React)
    ...                                     # React dependencies
    src/
        assets/
        components/
        Administration/
            Configuration/
                Configuration.jsx           # configuration main menu
                SystemMessages.jsx          # logs modules (caculations logs and detailed results...)
            ...
        Applications/
            Capaci/
                Capaci.jsx                  # app main menu
                Webform.jsx                 # webform (grid)
                Report.jsx                  # report (preview + export)
                PointOfView.jsx             # shared POV
                ...
            ...                             # Other apps to come
```

#### Data sources:

Dimensions: GET /api/dimensions/latest

Cells: GET /api/data?dimension1=...&dimension2=...
Reports reuse exactly the same mechanism as webforms (axis resolution, cartesian product, per-cell GET).

## Configuration

```
# .env
PORT=8080
DATABASE_URL=postgres://user:pass@localhost:5432/emes
JWT_SECRET=change-me
DIMENSION_ROOT=../database/config           # directory of dimension data files
LOGS_FOLDER=../database/logs
LOGS_PATHS=../database/logs
```

## Getting Started

```
# Back-end
cd api
npm i
npm start

# Front-end
cd app
npm i
npm start        # launches the app in development
```
> First make sure the database is running and the .env file is correctly configured

## JSON Formats

### Webform

```
{
    "_id": "webform_002",
    "name": "Webform name",
    "type": "webform",
    "parameters": { /* pov */ },
    "structure": {
        "rows":    ["dimension=expression", "..."],
        "columns": ["dimension=expression", "..."],
        "fixed":   ["dimension", "dimension", "..."]
    }
}
```

> Member selection expressions:
> * MEMBER$[Only] → the member itself
> * MEMBER$[Descendants] → the member + its descendants
> * MEMBER$[Base] → base (leaf) members under this node

### Reports

```
{
    "_id": "report_001",
        "name": "Exchange Rates – Report V1",
            "type": "report",
                "parameters": {
        "scenario": { "isActivated": true, "default": "ACT" },
        "year": { "isActivated": true, "default": "2025" },
        "entity": { "isActivated": true, "default": "[None]$[Only]" },
        "value": { "isActivated": false, "default": "Local" },
        "view": { "isActivated": false, "default": "YTD" }
    },
    "layout": {
        "pageSize": "A4",
            "orientation": "portrait",
                "margins": { "top": 24, "right": 18, "bottom": 24, "left": 18 },
        "fit": "auto"
    },
    "sections": [
        {
            "type": "title",
            "text": "Exchange Rates – {year}",
            "level": 1
        },
        {
            "type": "table",
            "title": "FX matrix",
            "source": {
                "rows": [
                    "account=CURRENCY$[Base]",
                    "custom2=CUR$[Base]"
                ],
                "columns": [
                    "period=Year$[Base]"
                ],
                "fixed": [
                    "scenario", "year", "entity",
                    "value", "view", "custom1", "custom3", "custom4", "ICP"
                ]
            },
            "options": {
                "repeatHeader": true,
                "cellFormat": "#,##0.000",
                "columnAutoWidth": true,
                "rowBanding": true
            }
        }
    ]
}
```

## API (main routes)

Documents
* GET /api/documents → list visible documents (permissions)
* GET /api/documents/:id → document metadata
* GET /api/documents/:id/content
    * type=webform → { type, parameters, structure }
    * type=report → { type, parameters, layout, sections }
* POST /api/documents/:id/render?format=pdf|png (report only)
    * Body: { "pov": { "scenario": ["ACT"], "year": ["2025"], ... } }
    * Returns a stream application/pdf or image/png.

Data & dimensions (existing)
* GET /api/dimensions/latest → hierarchies (members, parent, etc.)
* GET /api/data?... → cell value (dimension filters via query string)

> Reports V1 consume exactly GET /api/data per cell, just like webforms.

## Frontend (key components)

* Capaci.jsx
    * Manages tabs; receives doc from the Explorer.
    * handleOpenDocument(doc) opens Webform if doc.type === "webform", Report if doc.type === "report".
* PointOfView.jsx
    * Renders active parameters; resolves Only/Descendants/Base against GET /api/dimensions/latest.
    * Passed to Webform/Report to build filters.
* Webform.jsx
    * Builds axes (rows/columns), cartesian product of members, then GET /api/data per cell.
    * Toolbar: Refresh
* Report.jsx (V1)
    * Read-only preview with the same axes and same dataflow as Webform.
    * Toolbar: Refresh, Export PDF, Export PNG.
    * Export calls POST /api/documents/:id/render?format=... (server → Puppeteer).
