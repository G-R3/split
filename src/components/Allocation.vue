<script setup lang="ts">
import { computed, ref } from "vue";
import { useExchangeRates } from "../composables/useExchangeRates";

const USD_AMOUNT_PATTERN = /^\$?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{0,2})?|\.\d{1,2})$/;

const ASSETS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "DOGE", name: "Dogecoin" },
] as const;

type AssetSymbol = (typeof ASSETS)[number]["symbol"];

type Allocation = {
  name?: string;
  symbol: AssetSymbol;
  percentage: number;
  quantity?: number;
  usd?: number;
};

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const cryptoFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 8,
  maximumFractionDigits: 8,
});

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeStyle: "short",
});

const primarySplit = ref(70);
const holdings = ref("10000");
const selectedSymbols = ref<[AssetSymbol, AssetSymbol]>(["BTC", "ETH"]);
const { rates, lastUpdated, loading, error, refreshRates } = useExchangeRates(
  ASSETS.map((asset) => asset.symbol),
);

const splitPercentages = computed(() => [primarySplit.value, 100 - primarySplit.value] as const);

const parsedHoldings = computed(() => {
  const input = holdings.value.trim();

  if (!input) return { error: "Enter an amount." };
  if (!USD_AMOUNT_PATTERN.test(input)) return { error: "Enter a valid USD amount." };

  const value = Number(input.replaceAll(",", "").replace(/^\$/, ""));

  if (!Number.isFinite(value)) return { error: "Enter a valid USD amount." };

  return { amount: value };
});

const allocations = computed(() => {
  return selectedSymbols.value.map((symbol, i) => {
    const asset = ASSETS.find((asset) => asset.symbol === symbol);
    const rate = rates.value.get(symbol);
    const percentage = splitPercentages.value[i];
    const usd =
      parsedHoldings.value.amount === undefined
        ? undefined
        : parsedHoldings.value.amount * (percentage / 100);
    const quantity = usd !== undefined && rate !== undefined ? usd * rate : undefined;

    return {
      name: asset?.name,
      symbol,
      percentage: percentage,
      quantity,
      usd,
    } satisfies Allocation;
  });
});

function updateSplitPercentages(rowIndex: number, event: Event) {
  const input = event.currentTarget as HTMLInputElement;

  if (!Number.isFinite(input.valueAsNumber)) return;

  const split = Math.min(100, Math.max(0, Math.round(input.valueAsNumber)));

  input.value = String(split);
  primarySplit.value = rowIndex === 0 ? split : 100 - split;
}
</script>

<template>
  <main class="app-shell">
    <header class="app-intro">
      <h1>Split</h1>
      <p>
        A tool to calculate how much of each asset to buy based on your
        <code>USD</code>
        allocation
      </p>
    </header>

    <section class="app-grid">
      <section class="configure-card" aria-labelledby="configure-title">
        <div class="configure-header">
          <h2 id="configure-title">Configure</h2>
        </div>
        <div class="holdings-field">
          <label for="holdings-input" class="amount-field">
            <span>USD holdings</span>
            <span class="amount-input" :class="{ 'amount-input--invalid': parsedHoldings.error }">
              <span class="currency-mark" aria-hidden="true">$</span>
              <input
                id="holdings-input"
                v-model="holdings"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                spellcheck="false"
                :aria-invalid="Boolean(parsedHoldings.error)"
                aria-describedby="holdings-error"
              />
              <span class="currency-code" aria-hidden="true">USD</span>
            </span>
          </label>

          <span id="holdings-error" class="holdings-error" role="status" aria-live="polite">
            {{ parsedHoldings.error }}
          </span>
        </div>
        <fieldset class="allocation-section">
          <legend class="allocation-section-header">Allocation</legend>
          <div class="allocation-fields">
            <template v-for="(asset, rowIndex) in allocations" :key="rowIndex">
              <article class="allocation-row" :aria-labelledby="`asset-${asset.symbol}`">
                <div class="allocation-asset-field">
                  <select
                    v-model="selectedSymbols[rowIndex]"
                    :aria-label="`Asset for ${asset.percentage}% allocation`"
                    :id="`asset-${asset.symbol}`"
                    class="allocation-asset-select"
                  >
                    <option
                      v-for="option in ASSETS"
                      :value="option.symbol"
                      :key="option.symbol"
                      :disabled="
                        selectedSymbols.some(
                          (selectedSymbol, selectedIndex) =>
                            selectedIndex !== rowIndex && selectedSymbol === option.symbol,
                        )
                      "
                    >
                      {{ option.name }} ({{ option.symbol }})
                    </option>
                  </select>
                  <span class="allocation-asset-chevron" aria-hidden="true">
                    <svg viewBox="0 0 12 8">
                      <path d="m1 1 5 5 5-5" />
                    </svg>
                  </span>
                </div>

                <label class="allocation-percentage-field">
                  <input
                    :value="asset.percentage"
                    type="number"
                    inputmode="numeric"
                    min="0"
                    max="100"
                    step="1"
                    :aria-label="`${asset.name} allocation percentage`"
                    @input="updateSplitPercentages(rowIndex, $event)"
                    @blur="
                      (event) => {
                        const input = event.currentTarget as HTMLInputElement;
                        input.value = String(splitPercentages[rowIndex]);
                      }
                    "
                  />
                  <span aria-hidden="true">%</span>
                </label>
              </article>

              <label v-if="rowIndex === 0" class="allocation-range-field">
                <input
                  v-model.number="primarySplit"
                  class="allocation-range"
                  type="range"
                  min="0"
                  max="100"
                  :aria-label="`${asset.name} allocation percentage slider`"
                />
              </label>
            </template>
          </div>
        </fieldset>
        <div class="rate-refresh">
          <span
            class="rate-refresh-status"
            :class="{ 'rate-refresh-status--error': error }"
            role="status"
            aria-live="polite"
          >
            <span v-if="loading" class="rate-refresh-status-skeleton" aria-hidden="true" />
            <template v-else-if="error && lastUpdated">
              Refresh failed. Using&nbsp;<time :datetime="lastUpdated.toISOString()">{{
                timeFormatter.format(lastUpdated)
              }}</time
              >&nbsp;rates.
            </template>
            <template v-else-if="error">Rates unavailable. Try again.</template>
            <template v-else-if="lastUpdated">
              Rates fetched at&nbsp;<time :datetime="lastUpdated.toISOString()">{{
                timeFormatter.format(lastUpdated)
              }}</time>
            </template>
          </span>
          <button
            class="rate-refresh-button"
            type="button"
            :disabled="loading"
            @click="refreshRates"
          >
            Refresh rates
          </button>
        </div>
      </section>

      <section class="results-panel">
        <div>
          <h2 class="results-title">What to buy?</h2>
          <div class="results-list">
            <template v-for="(asset, rowIndex) in allocations" :key="rowIndex">
              <article class="results-item" :aria-labelledby="`result-${asset.symbol}`">
                <strong :id="`result-${asset.symbol}`" class="results-item-header">
                  {{ asset.name }} ({{ asset.symbol }})
                </strong>

                <p class="results-item-quantity">
                  <span
                    v-if="loading && !parsedHoldings.error"
                    class="results-item-quantity-skeleton"
                    aria-hidden="true"
                  />
                  <template v-else-if="asset.quantity !== undefined">
                    {{ cryptoFormatter.format(asset.quantity) }} {{ asset.symbol }}
                  </template>
                  <span v-else>
                    <span aria-hidden="true">---</span>
                    <span class="sr-only">
                      {{
                        parsedHoldings.error
                          ? "Enter a valid amount"
                          : `${asset.name} rate unavailable`
                      }}
                    </span>
                  </span>
                </p>

                <p class="results-item-allocated">
                  {{ asset.usd === undefined ? "---" : usdFormatter.format(asset.usd) }} allocated
                </p>
              </article>
            </template>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>
