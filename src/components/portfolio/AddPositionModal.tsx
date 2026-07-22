import { useState } from "react";
import usePortfolioStore from "../../store/portfolioStore";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function AddPositionModal({
  isOpen,
  onClose,
}: Props) {
  const addPosition = usePortfolioStore((state) => state.addPosition);

  const [symbol, setSymbol] = useState("");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");

  if (!isOpen) return null;

  const handleSave = () => {
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

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">

      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">

        <h2 className="text-2xl font-bold mb-6">
          Add Position
        </h2>

        <div className="space-y-4">

          <input
            className="w-full border rounded-xl p-3"
            placeholder="Symbol"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          />

          <input
            className="w-full border rounded-xl p-3"
            placeholder="Shares"
            type="number"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
          />

          <input
            className="w-full border rounded-xl p-3"
            placeholder="Average Price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

        </div>

        <div className="flex justify-end gap-3 mt-8">

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white"
          >
            Save
          </button>

        </div>

      </div>

    </div>
  );
}