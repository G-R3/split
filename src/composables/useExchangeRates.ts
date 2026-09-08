import { onMounted, ref } from "vue";

const API_URL = "https://api.coinbase.com/v2/exchange-rates?currency=USD";

const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeStyle: "short",
});

export function useExchangeRates<Symbol extends string>(symbols: readonly Symbol[]) {
  const rates = ref(new Map<Symbol, number>());
  const lastUpdated = ref<{ datetime: string; label: string } | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);

  async function refreshRates() {
    try {
      loading.value = true;
      error.value = null;

      const response = await fetch(API_URL);

      if (!response.ok) throw new Error("Failed to fetch exchange rates");

      rates.value = parseRates(await response.json(), symbols);

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

  onMounted(refreshRates);

  return { rates, lastUpdated, loading, error, refreshRates };
}

function parseRates<Symbol extends string>(input: unknown, symbols: readonly Symbol[]) {
  if (typeof input !== "object" || input === null || !("data" in input)) {
    throw new Error("Received an invalid exchange rate response");
  }

  const data = input.data;

  if (
    typeof data !== "object" ||
    data === null ||
    !("currency" in data) ||
    data.currency !== "USD" ||
    !("rates" in data) ||
    typeof data.rates !== "object" ||
    data.rates === null
  ) {
    throw new Error("Received an invalid exchange rate response");
  }

  const rawRates = data.rates as Record<string, unknown>;

  return new Map(
    symbols.map((symbol) => {
      const rawRate = symbol in rawRates ? rawRates[symbol] : undefined;
      const rate = typeof rawRate === "string" ? Number(rawRate) : Number.NaN;

      if (!Number.isFinite(rate) || rate <= 0) {
        throw new Error("Received an invalid exchange rate response");
      }

      return [symbol, rate] as const;
    }),
  );
}
