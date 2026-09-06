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
  <main>
    <section>
      <label for="holdings">USD holdings</label>

      <input
        id="holdings"
        v-model="holdings"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        spellcheck="false"
      />
    </section>

    <p v-if="loading">Loading exchange rates...</p>

    <p v-else-if="error">
      {{ error }}
      <button type="button" @click="getRates">Try again</button>
    </p>

    <section v-else>
      <article>
        <h2>BTC</h2>
        <strong>{{ cryptoFormatter.format(btcAmount) }}</strong>
        <span>{{ usdFormatter.format(btcUsdAllocation) }}</span>
      </article>

      <article>
        <h2>ETH</h2>
        <strong>{{ cryptoFormatter.format(ethAmount) }}</strong>
        <span>{{ usdFormatter.format(ethUsdAllocation) }}</span>
      </article>
    </section>
  </main>
</template>
