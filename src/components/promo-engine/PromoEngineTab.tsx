import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Film, Layers, Wand2, Download } from 'lucide-react';
import { SceneLibrary } from './SceneLibrary';
import { StoryBuilder } from './StoryBuilder';
import { ExportManager } from './ExportManager';

export const PromoEngineTab = () => {
  return (
    <Tabs defaultValue="scenes" className="space-y-6">
      <TabsList className="grid w-full max-w-md grid-cols-3">
        <TabsTrigger value="scenes" className="gap-1.5">
          <Layers className="h-4 w-4" />
          <span className="hidden sm:inline">Scene Library</span>
          <span className="sm:hidden">Scenes</span>
        </TabsTrigger>
        <TabsTrigger value="builder" className="gap-1.5">
          <Wand2 className="h-4 w-4" />
          <span className="hidden sm:inline">Story Builder</span>
          <span className="sm:hidden">Builder</span>
        </TabsTrigger>
        <TabsTrigger value="exports" className="gap-1.5">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export Manager</span>
          <span className="sm:hidden">Exports</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="scenes">
        <SceneLibrary />
      </TabsContent>

      <TabsContent value="builder">
        <StoryBuilder />
      </TabsContent>

      <TabsContent value="exports">
        <ExportManager />
      </TabsContent>
    </Tabs>
  );
};
