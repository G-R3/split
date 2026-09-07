<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
const API_URL = "https://api.coinbase.com/v2/exchange-rates?currency=USD";
// const BTC_ALLOCATION = 0.7;
// const ETH_ALLOCATION = 0.3;
const ASSET_SPLIT = [0.7, 0.3] as const;

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

const ASSETS = [
  { symbol: "BTC", name: "Bitcoin" },
  { symbol: "ETH", name: "Ethereum" },
  { symbol: "SOL", name: "Solana" },
  { symbol: "ADA", name: "Cardano" },
  { symbol: "DOGE", name: "Dogecoin" },
];
type AssetSymbol = (typeof ASSETS)[number]["symbol"];

type Allocation = {
  name?: string;
  symbol: string;
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

const holdings = ref("10000");
const rates = ref<Record<string, string>>({});
const selectedSymbols = ref<[AssetSymbol, AssetSymbol]>(["BTC", "ETH"]);
const lastUpdated = ref<{ datetime: string; label: string } | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const amount = computed(() => {
  const normalized = holdings.value.trim().replaceAll(",", "").replace(/^\$/, "");

  if (!normalized) return { error: "Enter an amount." };

  const value = Number(normalized);

  if (!Number.isFinite(value) || value < 0) return { error: "Enter a valid amount." };

  return { amount: value };
});

const allocations = computed<Allocation[] | null>(() => {
  return selectedSymbols.value.map((symbol, i) => {
    const asset = ASSETS.find((asset) => asset.symbol === symbol);
    const rate = Number(rates.value[symbol]);
    const percentage = ASSET_SPLIT[i];
    const usd = amount.value.amount === undefined ? undefined : amount.value.amount * percentage;
    const quantity = usd !== undefined && Number.isFinite(rate) ? usd * rate : undefined;

    return {
      name: asset?.name,
      symbol,
      percentage: percentage * 100,
      quantity,
      usd,
    };
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
console.log(allocations.value);
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
          <article
            v-for="(asset, rowIndex) in allocations"
            :key="rowIndex"
            class="allocation-row"
            :aria-labelledby="`asset-${asset.symbol}`"
          >
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
            <span class="allocation-percentage">{{ asset.percentage }}%</span>

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
        </div>
      </section>
    </div>
  </main>
</template>
