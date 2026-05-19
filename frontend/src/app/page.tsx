import { AuthGate } from "@/components/AuthGate";
import { KanbanBoard } from "@/components/KanbanBoard";
import { AIChatSidebar } from "@/components/AIChatSidebar";
import { BoardSyncProvider } from "@/components/BoardSync";

export default function Home() {
  return (
    <AuthGate>
      <BoardSyncProvider>
        <div className="flex min-h-screen">
          <div className="min-w-0 flex-1">
            <KanbanBoard />
          </div>
          <AIChatSidebar />
        </div>
      </BoardSyncProvider>
    </AuthGate>
  );
}
