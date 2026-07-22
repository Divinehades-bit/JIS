import { useState } from "react";
import usePortfolioStore from "../../store/portfolioStore";

function AddPositionForm() {
  const addPosition = usePortfolioStore((state) => state.addPosition);

  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!symbol || !shares || !price) return;

    addPosition({
      id: Date.now(),
      symbol: symbol.toUpperCase(),
      shares: Number(shares),
      price: Number(price),
    });

    setSymbol("");
    setShares("");
    setPrice("");
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-2xl font-bold mb-6">
        Add Position
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          className="w-full rounded-lg border p-3"
          placeholder="Symbol (AAPL)"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />

        <input
          className="w-full rounded-lg border p-3"
          placeholder="Shares"
          type="number"
          value={shares}
          onChange={(e) => setShares(e.target.value)}
        />

        <input
          className="w-full rounded-lg border p-3"
          placeholder="Price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 font-semibold"
          type="submit"
        >
          Add Position
        </button>
      </form>
    </div>
  );
}

export default AddPositionForm;