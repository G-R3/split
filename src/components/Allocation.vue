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
  if (!holdings.value.trim()) return null;

  const parsed = Number(holdings.value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
});

const btcUsdAllocation = computed(() => (amount.value ?? 0) * BTC_ALLOCATION);
const ethUsdAllocation = computed(() => (amount.value ?? 0) * ETH_ALLOCATION);

const btcAmount = computed(() => btcUsdAllocation.value * (btcRate.value ?? 0));

const ethAmount = computed(() => ethUsdAllocation.value * (ethRate.value ?? 0));

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

      <p v-if="amount === null">Enter a valid USD amount.</p>
    </section>

    <p v-if="loading">Loading exchange rates...</p>

    <p v-else-if="error">
      {{ error }}
      <button type="button" @click="getRates">Try again</button>
    </p>

    <section v-else>
      <article>
        <div>
          <h2>BTC</h2>
          <strong>{{ cryptoFormatter.format(btcAmount) }}</strong>
        </div>
        <div>
          <span>{{ BTC_ALLOCATION * 100 }}%</span>
          <span>{{ usdFormatter.format(btcUsdAllocation) }}</span>
        </div>
      </article>

      <article>
        <div>
          <h2>ETH</h2>
          <strong>{{ cryptoFormatter.format(ethAmount) }}</strong>
        </div>
        <div>
          <span>{{ ETH_ALLOCATION * 100 }}%</span>
          <span>{{ usdFormatter.format(ethUsdAllocation) }}</span>
        </div>
      </article>
    </section>
  </main>
</template>
