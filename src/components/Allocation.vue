<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
const API_URL = "https://api.coinbase.com/v2/exchange-rates?currency=USD";
const BTC_ALLOCATION = 0.7;
const ETH_ALLOCATION = 0.3;

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const cryptoFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 8,
  maximumFractionDigits: 8,
});

type ExchangeRatesResponse = {
  data: {
    currency: string;
    rates: {
      BTC: string;
      ETH: string;
    };
  };
};

const holdings = ref("10000");
const btcRate = ref<number | null>(null);
const ethRate = ref<number | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const amount = computed(() => {
  const normalized = holdings.value.trim().replaceAll(",", "").replace(/^\$/, "");

  if (!normalized) return { error: "Enter an amount." };

  const value = Number(normalized);

  if (!Number.isFinite(value) || value < 0) return { error: "Enter a valid amount." };

  return { amount: value };
});

const btcUsdAllocation = computed(() =>
  amount.value.amount === undefined ? undefined : amount.value.amount * BTC_ALLOCATION,
);
const ethUsdAllocation = computed(() =>
  amount.value.amount === undefined ? undefined : amount.value.amount * ETH_ALLOCATION,
);

const btcAmount = computed(() =>
  btcUsdAllocation.value === undefined || btcRate.value === null
    ? undefined
    : btcUsdAllocation.value * btcRate.value,
);

const ethAmount = computed(() =>
  ethUsdAllocation.value === undefined || ethRate.value === null
    ? undefined
    : ethUsdAllocation.value * ethRate.value,
);

async function getRates() {
  try {
    loading.value = true;
    error.value = null;

    const response = await fetch(API_URL);

    if (!response.ok) throw new Error("Failed to fetch exchange rates");

    const { data }: ExchangeRatesResponse = await response.json();

    btcRate.value = Number(data.rates.BTC);
    ethRate.value = Number(data.rates.ETH);
  } catch (err) {
    error.value = err instanceof Error ? err.message : "An unknown error occurred";
  } finally {
    loading.value = false;
  }
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
            <span class="rate-status">Placeholder: Updated now</span>
          </div>
        </div>

        <span id="holdings-error" class="holdings-error" role="status" aria-live="polite">
          {{ amount.error }}
        </span>
      </section>

      <section>
        <article>
          <div>
            <h2>BTC</h2>
            <strong v-if="btcAmount !== undefined">{{ cryptoFormatter.format(btcAmount) }}</strong>
            <span v-else-if="loading && !amount.error" aria-hidden="true">-</span>
            <span
              v-else
              :aria-label="amount.error ? 'Enter a valid amount' : 'Bitcoin rate unavailable'"
              >---</span
            >
          </div>
          <div>
            <span>{{ BTC_ALLOCATION * 100 }}% · </span>
            <span>
              {{ btcUsdAllocation === undefined ? "---" : usdFormatter.format(btcUsdAllocation) }}
            </span>
          </div>
        </article>

        <article>
          <div>
            <h2>ETH</h2>
            <strong v-if="ethAmount !== undefined">{{ cryptoFormatter.format(ethAmount) }}</strong>
            <span v-else-if="loading && !amount.error" aria-hidden="true">-</span>
            <span
              v-else
              :aria-label="amount.error ? 'Enter a valid amount' : 'Ethereum rate unavailable'"
              >---</span
            >
          </div>
          <div>
            <span>{{ ETH_ALLOCATION * 100 }}% · </span>
            <span>
              {{ ethUsdAllocation === undefined ? "---" : usdFormatter.format(ethUsdAllocation) }}
            </span>
          </div>
        </article>
      </section>
    </div>
  </main>
</template>
