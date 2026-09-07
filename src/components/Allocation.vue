<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
type AssetSymbol = "BTC" | "ETH" | "SOL" | "ADA" | "DOGE";
type Asset = {
  symbol: AssetSymbol;
  name: string;
};

type Allocation = {
  name?: string;
  symbol: AssetSymbol;
  percentage: number;
  quantity?: number;
  usd?: number;
};

type ExchangeRatesResponse = {
  data: {
    currency: string;
    rates: Record<string, string>;
  };
};

const API_URL = "https://api.coinbase.com/v2/exchange-rates?currency=USD";

const ASSETS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "DOGE", name: "Dogecoin" },
] satisfies readonly Asset[];

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
const rates = ref<Record<string, string>>({});
const selectedSymbols = ref<[AssetSymbol, AssetSymbol]>(["BTC", "ETH"]);
const lastUpdated = ref<{ datetime: string; label: string } | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const splitPercentages = computed(() => [primarySplit.value, 100 - primarySplit.value] as const);

const amount = computed(() => {
  const normalized = holdings.value.trim().replaceAll(",", "").replace(/^\$/, "");

  if (!normalized) return { error: "Enter an amount." };

  const value = Number(normalized);

  if (!Number.isFinite(value) || value < 0) return { error: "Enter a valid amount." };

  return { amount: value };
});

const allocations = computed(() => {
  return selectedSymbols.value.map((symbol, i) => {
    const asset = ASSETS.find((asset) => asset.symbol === symbol);
    const rate = Number(rates.value[symbol]);
    const percentage = splitPercentages.value[i];
    const usd =
      amount.value.amount === undefined ? undefined : amount.value.amount * (percentage / 100);
    const quantity = usd !== undefined && Number.isFinite(rate) ? usd * rate : undefined;

    return {
      name: asset?.name,
      symbol,
      percentage: percentage,
      quantity,
      usd,
    } satisfies Allocation;
  });
});

async function getRates() {
  try {
    loading.value = true;
    error.value = null;

    const response = await fetch(API_URL);

    if (!response.ok) throw new Error("Failed to fetch exchange rates");

    const { data }: ExchangeRatesResponse = await response.json();

    rates.value = data.rates;

    const updatedAt = new Date();
    lastUpdated.value = {
      datetime: updatedAt.toISOString(),
      label: timeFormatter.format(updatedAt),
    };
  } catch (err) {
    error.value = err instanceof Error ? err.message : "An unknown error occurred";
  } finally {
    loading.value = false;
  }
}

function updateSplitPercentages(rowIndex: number, event: Event) {
  const input = event.currentTarget as HTMLInputElement;

  if (!Number.isFinite(input.valueAsNumber)) return;

  const split = Math.min(100, Math.max(0, Math.round(input.valueAsNumber)));

  input.value = String(split);
  primarySplit.value = rowIndex === 0 ? split : 100 - split;
}

onMounted(getRates);
</script>

<template>
  <main>
    <div class="allocation-card">
      <section class="holdings">
        <div class="holdings-row">
          <label for="holdings-input" class="amount-field">
            <span>USD holdings</span>
            <span class="amount-input" :class="{ 'amount-input--invalid': amount.error }">
              <span class="currency-mark" aria-hidden="true">$</span>
              <input
                id="holdings-input"
                v-model="holdings"
                type="text"
                inputmode="decimal"
                autocomplete="off"
                spellcheck="false"
                :aria-invalid="Boolean(amount.error)"
                aria-describedby="holdings-error"
              />
              <span class="currency-code" aria-hidden="true">USD</span>
            </span>
          </label>

          <div class="rate-refresh">
            <button type="button" :disabled="loading" @click="getRates">Refresh rates</button>
            <span class="rate-status" role="status" aria-live="polite">
              <template v-if="lastUpdated">
                Updated at <time :datetime="lastUpdated.datetime">{{ lastUpdated.label }}</time>
              </template>
              <span v-else-if="loading" class="timestamp-placeholder" aria-hidden="true" />
            </span>
          </div>
        </div>

        <span id="holdings-error" class="holdings-error" role="status" aria-live="polite">
          {{ amount.error }}
        </span>
      </section>

      <section class="allocation" aria-labelledby="allocation-heading">
        <h2 id="allocation-heading" class="allocation-heading">Allocation</h2>

        <div class="allocation-list">
          <template v-for="(asset, rowIndex) in allocations" :key="rowIndex">
            <article class="allocation-row" :aria-labelledby="`asset-${asset.symbol}`">
              <div class="allocation-asset-field">
                <select
                  v-model="selectedSymbols[rowIndex]"
                  :aria-label="`Asset for ${asset.percentage}% allocation`"
                  :id="`asset-${asset.symbol}`"
                  class="allocation-asset"
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
                <svg
                  class="allocation-asset-chevron"
                  aria-hidden="true"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="m4 6 4 4 4-4"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>

              <label class="allocation-percentage">
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

              <div class="allocation-result">
                <span class="allocation-label">Buy</span>
                <strong class="allocation-quantity">
                  <template v-if="asset.quantity !== undefined">
                    {{ cryptoFormatter.format(asset.quantity) }} {{ asset.symbol }}
                  </template>
                  <span
                    v-else-if="loading && !amount.error"
                    class="quantity-placeholder"
                    aria-hidden="true"
                  />
                  <span
                    v-else
                    :aria-label="
                      amount.error ? 'Enter a valid amount' : `${asset.name} rate unavailable`
                    "
                    >---</span
                  >
                </strong>
                <span class="allocation-value">
                  {{ asset.usd === undefined ? "---" : usdFormatter.format(asset.usd) }}
                  · {{ asset.percentage }}%
                </span>
              </div>
            </article>

            <label v-if="rowIndex == 0" for="allocation-range">
              <input
                v-model.number="primarySplit"
                id="allocation-range"
                type="range"
                min="0"
                max="100"
                :aria-label="`${asset.name} allocation percentage slider`"
              />
            </label>
          </template>
        </div>
      </section>
    </div>
  </main>
</template>
