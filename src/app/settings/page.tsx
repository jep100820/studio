
import SettingsClient from "@/components/settings/settings-client";
import { MigrateDataButton } from "@/components/settings/migrate-data-button";

export default function SettingsPage() {
    return (
        <div className="p-4 md:p-6">
            <h1 className="text-3xl font-bold mb-6">Settings</h1>
            <MigrateDataButton />
            <SettingsClient />
        </div>
    );
}
