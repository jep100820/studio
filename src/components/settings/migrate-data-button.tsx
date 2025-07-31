
'use client';

import { migrateData } from "@/lib/data-migration";

export function MigrateDataButton() {
    const handleMigration = async () => {
        try {
            await migrateData();
            alert('Data migration successful!');
        } catch (error) {
            console.error("Migration failed: ", error);
            alert('Data migration failed. Check the console for details.');
        }
    };

    return (
        <div className="my-4">
            <button
              onClick={handleMigration}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
                Migrate Provided Data
            </button>
        </div>
    )
}
