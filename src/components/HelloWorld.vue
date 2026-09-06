<script setup lang="ts">
import { computed, ref } from "vue";
const holdings = ref("10000");

const btcRate = ref(0.00001249);
const ethRate = ref(0.0003623);

const amount = computed(() => {
  const parsed = Number(holdings.value);

  return Number.isFinite(parsed) ? parsed : 0;
});

const btcAmount = computed(() => {
  return amount.value * 0.7 * btcRate.value;
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

    <span>{{ holdings }}</span>

    <section>
      <span>Buy</span>
      <span>BTC {{ btcAmount }}</span>
    </section>
  </section>
</template>
