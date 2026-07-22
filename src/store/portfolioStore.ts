import { create } from "zustand";

export type Position = {
  id: number;
  symbol: string;
  shares: number;
  price: number;
};

type PortfolioStore = {
  positions: Position[];
  addPosition: (position: Position) => void;
  removePosition: (id: number) => void;
};

const defaultPositions: Position[] = [
  {
    id: 1,
    symbol: "VOO",
    shares: 12,
    price: 560,
  },
  {
    id: 2,
    symbol: "IXN",
    shares: 8,
    price: 95,
  },
  {
    id: 3,
    symbol: "VEU",
    shares: 20,
    price: 63,
  },
];

const savedPositions = localStorage.getItem("portfolio");

const initialPositions: Position[] = savedPositions
  ? JSON.parse(savedPositions)
  : defaultPositions;

const usePortfolioStore = create<PortfolioStore>((set) => ({
  positions: initialPositions,

  addPosition: (position) =>
    set((state) => {
      const existing = state.positions.find(
        (p) => p.symbol === position.symbol
      );

      let positions: Position[];

      if (existing) {
        positions = state.positions.map((p) =>
          p.symbol === position.symbol
            ? {
                ...p,
                shares: p.shares + position.shares,
              }
            : p
        );
      } else {
        positions = [...state.positions, position];
      }

      localStorage.setItem(
        "portfolio",
        JSON.stringify(positions)
      );

      return { positions };
    }),

  removePosition: (id) =>
    set((state) => {
      const positions = state.positions.filter(
        (p) => p.id !== id
      );

      localStorage.setItem(
        "portfolio",
        JSON.stringify(positions)
      );

      return { positions };
    }),
}));

export default usePortfolioStore;