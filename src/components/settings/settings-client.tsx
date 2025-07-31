"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WorkflowSettings from "./workflow-settings";
import SubcategorySettings from "./subcategory-settings";
import ImportanceSettings from "./importance-settings";
import OriginSettings from "./origin-settings";
import DataManagement from "./data-management";

export default function SettingsClient() {
  return (
    <Tabs defaultValue="workflow" className="w-full">
      <TabsList>
        <TabsTrigger value="workflow">Workflow</TabsTrigger>
        <TabsTrigger value="subcategories">Sub-Categories</TabsTrigger>
        <TabsTrigger value="importance">Importance</TabsTrigger>
        <TabsTrigger value="origins">Bid Origins</TabsTrigger>
        <TabsTrigger value="data">Data Management</TabsTrigger>
      </TabsList>
      <TabsContent value="workflow">
        <WorkflowSettings />
      </TabsContent>
      <TabsContent value="subcategories">
        <SubcategorySettings />
      </TabsContent>
      <TabsContent value="importance">
        <ImportanceSettings />
      </TabsContent>
      <TabsContent value="origins">
        <OriginSettings />
      </TabsContent>
      <TabsContent value="data">
        <DataManagement />
      </TabsContent>
    </Tabs>
  );
}
