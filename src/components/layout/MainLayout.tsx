import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

type MainLayoutProps = {
  children?: React.ReactNode;
};

function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex">

        {/* Sidebar */}
        <Sidebar />

        {/* Contenido */}
        <div className="flex flex-col flex-1 min-w-0">

          <TopBar />

          <main className="flex-1 p-8 overflow-auto">
            {children}
          </main>

        </div>

      </div>
    </div>
  );
}

export default MainLayout;