import { useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import UrlInputForm from "@/components/url-input-form";
import ContentPreview from "@/components/content-preview";
import ChatInterface from "@/components/chat-interface";
import { useQuery } from "@tanstack/react-query";
import type { ContentSession } from "@shared/schema";

export default function Home() {
  const [location] = useLocation();
  const sessionId = location.startsWith("/session/") ? location.split("/")[2] : null;
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId);

  const { data: currentSession } = useQuery<ContentSession>({
    queryKey: ['/api/sessions', currentSessionId],
    enabled: !!currentSessionId,
  });

  const handleNewSession = (newSessionId: string) => {
    setCurrentSessionId(newSessionId);
  };

  const handleNewAnalysis = () => {
    setCurrentSessionId(null);
  };

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar onNewAnalysis={handleNewAnalysis} />
      
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">URL Content Analysis</h2>
              <p className="text-sm text-muted-foreground">Extract and analyze content from any URL with AI-powered insights</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                data-testid="button-export"
              >
                <i className="fas fa-download mr-2"></i>
                Export
              </button>
              <button 
                className="px-4 py-2 gradient-bg text-white rounded-lg hover:opacity-90 transition-opacity"
                onClick={handleNewAnalysis}
                data-testid="button-new-analysis"
              >
                <i className="fas fa-plus mr-2"></i>
                New Analysis
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex">
          {/* URL Input & Content Display */}
          <div className="flex-1 p-6 space-y-6">
            <UrlInputForm onSessionCreated={handleNewSession} />
            {currentSession && <ContentPreview session={currentSession} />}
          </div>
          
          {/* Q&A Interface */}
          {currentSession && (
            <div className="w-96 border-l border-border bg-card/50">
              <ChatInterface sessionId={currentSession.id} topic={currentSession.topic} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
