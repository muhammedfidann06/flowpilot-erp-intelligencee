# FlowPilot · English overview

FlowPilot is a working ERP operations intelligence portfolio application with Turkish, English and German interfaces. It connects synthetic procurement, inventory, sales and delivery records to explainable findings and browser-local follow-up actions.

## Run and publish

Extract the ZIP and upload its contents to your repository root. `index.html` must be at the root, alongside `src/`, `icons/`, `data.json`, `manifest.webmanifest` and `sw.js`. In GitHub **Settings → Pages**, choose **Deploy from a branch → main → / (root)**. No Node, Python, API key or database is required for the static website. The alternate manual Pages workflow publishes only `dist/`.

For local use, run `python -m http.server 8080` from the project root and open `http://localhost:8080`. Do not open the HTML through `file://`.

## Features

- Overview: calculated KPIs, period comparisons and evidence-based priorities.
- Procurement: supplier reliability, purchase commitments and linked receipts.
- Inventory: available stock, reservations, forecast coverage and replenishment risks.
- Sales: recognized revenue, weekly trends and customer / product contributions.
- Logistics: carrier and regional performance with delivery drilldown.
- Insights: observed contributions, source records, explicit cost assumptions and recommended actions.
- Explorer: combined filters, sorting, pagination, column selection and CSV export.
- Actions: owner, due date, notes and status stored in this browser.
- Global search / Ctrl+K, high-priority notifications, architecture and product introduction.

## Architecture

**ERP Integration Ready Architecture** means a separate data boundary; it does not mean a live SAP connector exists. The client uses semantic HTML, a CSS design system and native JavaScript modules. Pure analytics live in `engine.js`. A dependency-free Python mock REST API exposes the same fixtures and precomputed analytics from the same engine. A PostgreSQL reference schema is supplied, but is not connected to the running application.

The versioned dataset contains 30 suppliers, 120 products, 24 customers, 360 sales orders and 120 purchase orders across August–September 2026. Inventory is a fixed 30 September snapshot. All records are synthetic.

Revenue is recognized by actual delivery date. OTD is calculated over completed receipts in the selected month. Inventory value is snapshot stock × unit cost. Stock coverage excludes reservations. Delay impact is an assumption of quantity × unit cost × delay days × 0.5%; it is not an incurred loss. Replenishment impact is a budget estimate, not lost revenue. Annualized turnover uses current stock rather than unavailable average stock.

## Quality and limits

Run `npm ci`, `npm run build`, `npm run validate`, `npm test`, and `python -m unittest discover -s tests -p 'test_*.py' -v`. See [testing](TESTING.md) for actual coverage. DOM tests do not prove visual layout or native browser focus behavior. Chrome desktop and a 390 px mobile frame were inspected, including action persistence. Docker and PostgreSQL execution were not verified. See TESTING.md for the 213 automated checks and remaining boundaries.

No production authentication, multi-tenant isolation, real SAP connectivity, central task storage or live data synchronization is implemented. Never put confidential ERP data into the public static dataset. The [main README](../README.md) provides full formulas, module descriptions and deployment details.

## PWA in v1.1.0

The release fixes missing asset paths and adds a relative-scope manifest, PNG/maskable icons, offline shell and demo data, install guidance, and user-confirmed updates. After the first successful online cache, the app can reopen offline. Use HTTPS or localhost. Device installation varies by browser and has not been physically tested. Edit root sources, run `npm run build`, and commit the generated `sw.js` and `dist/` too. Upload all extracted files, not only index.html. See [PWA details](PWA.md).
