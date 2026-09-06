<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
const API_URL = "https://api.coinbase.com/v2/exchange-rates?currency=USD";
const BTC_ALLOCATION = 0.7;
const ETH_ALLOCATION = 0.3;

const holdings = ref("10000");
const rates = ref<Record<string, number>>({});
const loading = ref(true);
const error = ref<string | null>(null);

const amount = computed(() => {
  const parsed = Number(holdings.value);

  return Number.isFinite(parsed) ? parsed : 0;
});

const btcUsdAllocation = computed(() => {
  return amount.value * BTC_ALLOCATION;
});
const ethUsdAllocation = computed(() => {
  return amount.value * ETH_ALLOCATION;
});

const btcAmount = computed(() => {
  return btcUsdAllocation.value * rates.value.BTC;
});

const ethAmount = computed(() => {
  return ethUsdAllocation.value * rates.value.ETH;
});

async function getRates() {
  try {
    loading.value = true;
    error.value = null;

    const response = await fetch(API_URL);
    const { data } = await response.json();

    if (!response.ok) throw new Error("Failed to fetch exchange rates");

    rates.value = data.rates;
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
