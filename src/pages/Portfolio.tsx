import { useState } from "react";
import AddTransactionModal from "../components/portfolio/AddTransactionModal";
import PortfolioAllocationChart from "../components/portfolio/PortfolioAllocationChart";
import PortfolioSummary from "../components/portfolio/PortfolioSummary";
import PortfolioTable from "../components/portfolio/PortfolioTable";
import PortfolioToolbar from "../components/portfolio/PortfolioToolbar";
import TransactionHistory from "../components/portfolio/TransactionHistory";

const Portfolio = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const [
    isTransactionModalOpen,
    setIsTransactionModalOpen,
  ] = useState(false);

  return (
    <>
      <div className="space-y-6">
        <PortfolioToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onRecordTransaction={() =>
            setIsTransactionModalOpen(true)
          }
        />

        <PortfolioSummary />

        <PortfolioAllocationChart />

        <PortfolioTable searchTerm={searchTerm} />

        <TransactionHistory
          searchTerm={searchTerm}
        />
      </div>

      <AddTransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() =>
          setIsTransactionModalOpen(false)
        }
      />
    </>
  );
};

export default Portfolio;