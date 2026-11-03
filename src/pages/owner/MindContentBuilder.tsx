import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MindContentEditor } from "@/components/owner/MindContentEditor";

/** Owner drills area: Game situations (Mind) and Coach's advice editors. */
export default function MindContentBuilder() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "advice" ? "advice" : "situations";
  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6 p-4">
        <h1 className="text-2xl font-bold">Mind & advice builder</h1>
        <Tabs value={tab} onValueChange={(v) => { const n = new URLSearchParams(params); n.set("tab", v); setParams(n); }}>
          <TabsList className="h-auto flex-wrap">
            <TabsTrigger value="situations">Game situations (Mind)</TabsTrigger>
            <TabsTrigger value="advice">Coach's advice</TabsTrigger>
          </TabsList>
          <TabsContent value="situations"><MindContentEditor kind="situation" /></TabsContent>
          <TabsContent value="advice"><MindContentEditor kind="advice" /></TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
