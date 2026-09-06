<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
const API_URL = "https://api.coinbase.com/v2/exchange-rates?currency=USD";
const BTC_ALLOCATION = 0.7;
const ETH_ALLOCATION = 0.3;

type ExchangeRatesResponse = {
  data: {
    currency: string;
    rates: {
      BTC: number;
      ETH: number;
    };
  };
};

const holdings = ref("10000");
const btcRate = ref<number | null>(null);
const ethRate = ref<number | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const amount = computed(() => {
  const parsed = Number(holdings.value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
});

const btcUsdAllocation = computed(() => amount.value * BTC_ALLOCATION);
const ethUsdAllocation = computed(() => amount.value * ETH_ALLOCATION);

const btcAmount = computed(() =>
  btcRate.value === null ? 0 : btcUsdAllocation.value * btcRate.value,
);

const ethAmount = computed(() =>
  ethRate.value === null ? 0 : ethUsdAllocation.value * ethRate.value,
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
  <section>
    <input
      id="holdings"
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck="false"
      min="0"
      v-model="holdings"
    />

    <span v-if="loading">Loading...</span>
    <span v-else-if="error">Error: {{ error }}</span>

    <section v-else>
      <div>
        <h2>BTC</h2>
        <strong>{{ btcAmount }}</strong>
        <span>${{ btcUsdAllocation }}</span>
      </div>
      <div>
        <h2>ETH</h2>
        <strong>{{ ethAmount }}</strong>
        <span>${{ ethUsdAllocation }}</span>
      </div>
    </section>
  </section>
</template>
