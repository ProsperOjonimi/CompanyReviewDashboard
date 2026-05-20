# Company Review Dashboard

Search real company ratings and reviews from Trustpilot, view detailed feedback, and bookmark favorites — all in a single-page dashboard.

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| UI | Vanilla HTML5 / CSS3 | The dashboard has exactly three user interactions (search, click card, favorite). A framework like React would require a build tool, JSX compilation, and virtual DOM diffing with zero benefit at this complexity level. Vanilla DOM APIs (`insertAdjacentHTML`, `querySelector`) keep the bundle at ~5 KB and the learning curve flat for contributors. |
| Styling | CSS Grid + custom properties | Tailwind or Bootstrap would ship 10-200 KB of utility classes for a layout that needs exactly one 4-column grid and one 2-column mobile breakpoint. A hand-rolled `grid-template-columns: 1fr 1fr 1fr 1fr` with a single `@media` query delivers the same result with zero dead CSS. |
| API Client | Fetch (native browser API) | Axios or ky would add HTTP interceptors, cancellation tokens, and retry logic that this project does not need. The Trustpilot API requires exactly two `GET` requests with the same static headers — `fetch` with an `options` object reused across both calls is sufficient and removes a dependency. |
| Backend Data | Trustpilot API via RapidAPI | The Trustpilot API provides both company search and per-company reviews from a single provider, eliminating the need to aggregate across multiple sources. RapidAPI handles key management and rate-limiting at the gateway level. |
| Persistence | `localStorage` (Web Storage API) | A backend with a database would require authentication, a server, and a persistence layer for what is essentially a bookmarking feature. `localStorage` keeps favorites free, offline-capable, and deployable as static files. The tradeoff is that data is siloed to one browser and lost on cache clear — acceptable for a demonstration project. |

## Features

### Company Search
- Users type a company name and hit Search, which triggers a `GET` request to the Trustpilot Company Search endpoint.
- Results render as interactive cards showing company name, star rating, and total review count.
- The search input is cleared after submission for a clean next-query experience.

### Review Exploration
- Clicking any company card fetches that company's reviews from the Trustpilot Reviews API using the company domain returned from the search response.
- Reviews are displayed in an overlay panel while the main content receives a CSS `filter: blur(5px)` backdrop to focus attention.
- A close button dismisses the overlay and removes the blur. Event propagation is managed with `stopPropagation` to prevent conflicts between card-level and button-level click handlers.

### Favorites Persistence
- Each search-result card has a star button that saves the company name, rating, and review count to `localStorage` under the key `"favorites"`.
- Duplicate detection runs via `Array.some()` before insertion to prevent double-bookmarks.
- On page load, a `DOMContentLoaded` listener reads stored favorites and re-renders them into a dedicated "Favorites" grid using `insertAdjacentHTML("beforeend", ...)`.

### Responsive Layout
- The card grid uses `grid-template-columns: 1fr 1fr 1fr 1fr` on desktop and collapses to `1fr 1fr` below 47.4375em via a single `@media` query.
- The search bar switches from a horizontal row to a stacked column layout on mobile.

## Architecture

```
CompanyReviewDashboard/
├── index.html          # Entry point — static shell with demo cards, search bar,
│                       # reviews overlay, and favorites container
├── css/
│   └── style.css       # All styles — reset, layout, cards, reviews, responsive
├── js/
│   └── script.js       # All logic — API calls, DOM rendering, event binding,
│                       # localStorage management
└── README.md
```

### Key Design Decisions

**1. Vanilla JavaScript over a framework (React, Vue, Svelte).** The application has a flat state model: a search result is fetched and rendered, a card is clicked and reviews are shown, a star is clicked and a record is saved. There is no shared state that needs to propagate across components, no routing, and no side-effect chain. Adding a framework would introduce a build step, a virtual DOM, and a component lifecycle model that complicates a codebase that fits in 200 lines. The tradeoff is that as features grow (pagination, filtering, user accounts), the absence of a structured component model will make the code harder to maintain — at which point migrating to a framework would be justified.

**2. Template literals over a templating engine (Handlebars, lit-html, EJS).** The rendered data shape is three fields (name, rating, review count). Using `insertAdjacentHTML` with a backtick template string keeps the rendering logic colocated with the event handlers and avoids a compile step. The tradeoff is XSS risk if user-generated content were interpolated — mitigated here because all interpolated values come from the Trustpilot API response, not from user input. A library like lit-html would be warranted if the templates grew beyond ~10 lines or needed conditional rendering in multiple branches.

**3. Single-event wiring over event delegation.** The search button click handler fetches data, builds a card, and attaches a `click` listener directly to that card and its favorite button. This works because only one card exists at a time in the current implementation. The tradeoff is that if multiple search results are rendered, `document.querySelector(".company-card")` will only bind to the first DOM match, leaving subsequent cards unresponsive. Moving to event delegation on the container (`cardsContainer.addEventListener("click", ...)`) would fix this at the cost of requiring a data-attribute or class-based dispatch to distinguish card clicks from favorite clicks.

**4. No error handling on API calls.** The `fetch` calls are not wrapped in `try/catch` and the JSON responses are accessed without checking `ok` status or response shape. This was a deliberate time-boxing decision to prioritize the happy-path flow during the 6-hour build window. The cost is that a network failure, rate-limit response, or malformed API reply will produce a silent JavaScript error instead of a user-facing message. Adding a centralized `fetchWithErrorHandling` wrapper is the single highest-impact improvement available.

## Getting Started

### Prerequisites
- A modern browser (Chrome, Firefox, Edge, Safari)
- A local HTTP server (the Trustpilot API requires `https` context — `file://` protocol may be blocked by CORS)

### Installation

```bash
git clone https://github.com/prosperOjonimi/CompanyReviewDashboard.git
cd CompanyReviewDashboard
```

Open `index.html` via a local server. For example, with Python:

```bash
python -m http.server 8000
# Visit http://localhost:8000
```

Or with VS Code — right-click `index.html` and select "Open with Live Server."

### Environment Variables

The API key is currently hardcoded in `js/script.js`. Before deploying or sharing, replace it with your own RapidAPI key:

| Variable | Description | Where to Get It |
|---|---|---|
| `x-rapidapi-key` | RapidAPI subscription key | [RapidAPI Hub](https://rapidapi.com/) -> Trustpilot Company and Reviews Data API |
| `x-rapidapi-host` | API hostname | `trustpilot-company-and-reviews-data.p.rapidapi.com` |

To externalize the key, replace the inline value in `js/script.js:65` with an environment lookup or a config object:

```js
const API_CONFIG = {
  host: "trustpilot-company-and-reviews-data.p.rapidapi.com",
  key: process.env.RAPIDAPI_KEY || "your-fallback-key",
};
```

### API Endpoints Used

```
GET https://trustpilot-company-and-reviews-data.p.rapidapi.com/company-search?query={companyName}
GET https://trustpilot-company-and-reviews-data.p.rapidapi.com/company-reviews?company_domain={domain}
```

Both require the same headers:
```js
{
  "x-rapidapi-host": "trustpilot-company-and-reviews-data.p.rapidapi.com",
  "x-rapidapi-key": "<your-key>"
}
```

## What I Learned

- **Two-phase API integration with dependent requests**: The company search endpoint returns a `domain` field that must be extracted and passed as a query parameter to the reviews endpoint. This taught me how to chain async `fetch` calls where the second request depends on data from the first, managing the promise flow with `async/await` rather than nested `.then()` chains.

- **Numerical rating to star-string conversion with edge-case handling**: Trustpilot returns ratings as decimals (e.g., 4.2). Converting these to star display strings required `Math.round()` and a five-branch conditional. I learned to handle boundary cases where the rating is exactly 0 (no match in the conditional chain — results in an empty string) and where it exceeds 5 (truncated to 5 because the conditional chain stops there).

- **Client-side state persistence with deduplication**: Saving favorites to `localStorage` required serializing objects, parsing them back on load, and checking for duplicates with `Array.some()` before insertion. I learned that `localStorage` is synchronous and blocks the main thread — acceptable for a handful of objects, but a reason to consider `IndexedDB` for larger datasets.

- **Event propagation management with nested click targets**: The company card has two clickable areas — the card itself (opens reviews) and the star button inside it (saves favorite). Without `e.stopPropagation()`, clicking the star would also trigger the card's click handler. I learned to use `stopPropagation` selectively, understanding that it also prevents parent-container delegation from working.

- **CSS backdrop blur pattern for modal focus**: Applying `filter: blur(5px)` to the `<main>` element while displaying the reviews overlay creates a visual depth effect without a separate overlay div. I learned that `filter` impacts the entire element subtree and that `transition: filter 0.3s ease` is needed to avoid an abrupt state change.

- **Responsive grid without a framework**: Building a 4-column layout that collapses to 2-columns on mobile using only `grid-template-columns` and one `@media` query taught me that CSS Grid's `auto-fit`/`minmax()` pattern could eliminate the media query entirely for fluid layouts, but that a fixed breakpoint gives more control over the exact point of collapse.

## Roadmap

- [x] Company search via Trustpilot API
- [x] Review display on card click
- [x] Favorites with localStorage persistence
- [ ] Error handling — `try/catch` wrappers on both `fetch` calls with user-facing toast messages for network errors, rate limits, and empty results
- [ ] Loading states — skeleton cards or a spinner during API requests
- [ ] Pagination — Trustpilot returns paginated results; "Load more" button or infinite scroll
- [ ] Search result deduplication — clear previous results before appending new ones
- [ ] Favorites removal — option to unfavorite a company
- [ ] Rating/review count sort and filter controls
- [ ] Dark mode — `prefers-color-scheme` media query with CSS custom properties
- [ ] Search debouncing — live suggestions as the user types, using `AbortController` to cancel in-flight requests
