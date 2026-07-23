import DataManagement from "../components/settings/DataManagement";
import GeneralSettings from "../components/settings/GeneralSettings";
import useSettingsStore from "../store/settingsStore";

const Settings = () => {
  const settings = useSettingsStore(
    (state) => state.settings,
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">
          JIS configuration
        </p>

        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Settings
        </h1>

        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Configure {settings.portfolioName}, protect your
          data with backups and manage the information
          stored in this browser.
        </p>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(340px,0.8fr)_minmax(0,1.2fr)]">
        <GeneralSettings />

        <DataManagement />
      </section>

      <p className="px-1 text-xs leading-5 text-slate-400">
        JIS currently stores its information locally in
        this browser. Export a backup before deleting
        browser data, changing computers or reinstalling
        the application.
      </p>
    </div>
  );
};

export default Settings;