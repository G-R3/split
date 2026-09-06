<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
const API_URL = "https://api.coinbase.com/v2/exchange-rates?currency=USD";

const holdings = ref("10000");

const rates = ref<Record<string, number>>({});

const amount = computed(() => {
  const parsed = Number(holdings.value);

  return Number.isFinite(parsed) ? parsed : 0;
});

const btcAmount = computed(() => {
  return amount.value * 0.7 * rates.value.BTC;
});

const ethAmount = computed(() => {
  return amount.value * 0.3 * rates.value.ETH;
});

async function getRates() {
  try {
    const response = await fetch(API_URL);
    const { data } = await response.json();

    rates.value = data.rates;
  } catch (error) {
    console.error("Error fetching rates:", error);
  }
}

onMounted(() => {
  getRates();
});
</script>

<template>
  <section>
    <input
      id="holdings"
      type="text"
      inputMode="decimal"
      autoComplete="off"
      spellCheck="false"
      :value="holdings"
    />

    <section>
      <span>Buy</span>
      <span>BTC {{ btcAmount }}</span>
      <span>ETH {{ ethAmount }}</span>
    </section>
  </section>
</template>
