import { useState } from "react";

import PortfolioSummary from "../components/portfolio/PortfolioSummary";
import PortfolioToolbar from "../components/portfolio/PortfolioToolbar";
import PortfolioTable from "../components/portfolio/PortfolioTable";
import AddPositionModal from "../components/portfolio/AddPositionModal";

export default function Portfolio() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">

      <PortfolioSummary />

      <PortfolioToolbar
        onAddPosition={() => setIsModalOpen(true)}
      />

      <PortfolioTable />

      <AddPositionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

    </div>
  );
}