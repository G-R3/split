# Split

Split takes a USD holding and calculates how much of two assets to buy based on a percentage split.

Live demo: https://split-iota.vercel.app/

## Tech stack

- Vue 3
- TypeScript
- Vite / Vite+
- Coinbase Exchange Rates API
- CSS

Vue is the only runtime dependency, and the UI is implemented without a component library, CSS framework, or state management library. I opted to keep the allocation state, calculations, and UI together in one component. However, the rates fetching, validation, and request state live in a focused composable.

## Running it locally

Requires `pnpm`.

```bash
pnpm install
pnpm dev
```

Create and preview a production build:

```bash
pnpm build
pnpm preview
```

## Decisions

### The Coinbase API

The tool uses the Coinbase Exchange Rates API:

`GET https://api.coinbase.com/v2/exchange-rates?currency=USD`

The API returns each rate as the amount of an asset you can get for one USD. We then calculate the quantity to buy with:

```text
asset quantity = USD allocation * exchange rate
```

We fetch the exchange rates when the page loads and stores the validated rate map locally. Changing the selected assets does not make another API request.

Before using a response, the app checks that the base currency is USD and that every supported asset has a finite, positive exchange rate. Network errors, unsuccessful HTTP responses, and invalid API responses all show an error state. If a refresh fails, we keep the last valid rates and shows when they were fetched. We also keep using the last valid rates and identifies when they were fetched instead of clearing useful results.

### Allocation state

The default allocation is a `70% / 30%` split, and only the primary percentage, `70%`, is stored as mutable state. The second percentage is derived:

```text
second allocation = 100 - primary allocation
```

This keeps the two values at a total of 100% without storing and synchronizing two separate percentages. The range slider and percentage inputs update the same value.

### Curated asset selection

The original requirement focuses on `BTC` and `ETH`. I added `SOL`, `ADA`, and `DOGE` to show that the allocation logic works with other assets.

The Coinbase Exchange Rates API includes asset symbols, but it does not include the asset metadata needed for a good asset picker. Rather than add another API and support a much larger list of currencies, I opted to use a small curated set instead.

The asset selectors also prevent the same asset from being selected twice.

## Product and UI decisions

The main question the UI needs to answer is:

"How much of each asset should I buy?"

So the calculated asset quantity gets the strongest visual emphasis. The corresponding USD allocation is shown as secondary information in the UI.

The layout is responsive. On larger screens, the Configuration and Results sections appear side by side. On smaller screens, they stack into a single column.

The CSS uses shared variables for spacing, typography, colors, borders, border radius, and sizing to keep the UI consistent without adding a CSS framework.

Other UI details include:

- Editable allocation percentages through numeric inputs and a range slider
- Loading skeletons while exchange rates are fetched from the Coinbase API
- A manual rate refresh button, fetch timestamp, and stale-rate fallback
- Invalid input and API error states
- A responsive layout that does not truncate financial values
- Light and dark modes based on system preference
- Semantic labels, fieldsets, status regions, and screen reader fallback text
- Visible keyboard focus states
- Reduced-motion support for animations

## Next steps

I kept the implementation small and focused on the allocation flow. I avoided adding infrastructure that the current scope did not require.

However, some changes I would consider for a larger version:

- Add automated tests for allocation math, input parsing, asset selection, and API failure states
- Refresh rates in the background or cache them for longer sessions
- Show the current USD price for each selected asset
- Support base currencies other than USD
- Store the current configuration in the URL so users can share or bookmark it
- Support more assets
