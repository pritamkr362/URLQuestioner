import { useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import ContentInputForm from "@/components/content-input-form";
import ContentPreview from "@/components/content-preview";
import ChatInterface from "@/components/chat-interface";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { ContentSession } from "@shared/schema";

export default function Home() {
  const [location] = useLocation();
  const sessionId = location.startsWith("/session/") ? location.split("/")[2] : null;
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId);

  const { toast } = useToast();
  
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

  const handleExport = async () => {
    if (!currentSession) {
      toast({
        title: "No session to export",
        description: "Please select a session to export.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/sessions/${currentSession.id}/export-pdf`);
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const exportData = await response.json();
      
      // Import jsPDF dynamically
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(20);
      doc.text(exportData.exportData.title, 20, 20);
      
      // Add metadata
      doc.setFontSize(12);
      let yPos = 40;
      doc.text(`Topic: ${exportData.exportData.topic}`, 20, yPos);
      yPos += 10;
      
      if (exportData.exportData.sourceType === 'url' && exportData.exportData.url) {
        doc.text(`Source: ${exportData.exportData.url}`, 20, yPos);
        yPos += 10;
      } else if (exportData.exportData.sourceType === 'pdf' && exportData.exportData.fileName) {
        doc.text(`Source: ${exportData.exportData.fileName} (PDF)`, 20, yPos);
        yPos += 10;
      } else if (exportData.exportData.sourceType === 'topic-only') {
        doc.text('Source: Topic Discussion', 20, yPos);
        yPos += 10;
      }
      
      if (exportData.exportData.wordCount) {
        doc.text(`Word Count: ${exportData.exportData.wordCount}`, 20, yPos);
        yPos += 10;
      }
      
      doc.text(`Created: ${new Date(exportData.exportData.createdAt).toLocaleDateString()}`, 20, yPos);
      yPos += 20;
      
      // Add messages
      doc.setFontSize(16);
      doc.text('Conversation:', 20, yPos);
      yPos += 15;
      
      doc.setFontSize(10);
      exportData.messages.forEach((message: any) => {
        const role = message.role === 'user' ? 'You' : 'AI Assistant';
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        
        // Add role and timestamp
        doc.setFont('helvetica', 'bold');
        doc.text(`${role} (${timestamp}):`, 20, yPos);
        yPos += 7;
        
        // Add message content (with text wrapping)
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(message.content, 170);
        lines.forEach((line: string) => {
          if (yPos > 270) { // Start new page if needed
            doc.addPage();
            yPos = 20;
          }
          doc.text(line, 20, yPos);
          yPos += 5;
        });
        
        yPos += 10; // Space between messages
      });
      
      // Save the PDF
      const fileName = `${exportData.exportData.title.replace(/[^a-z0-9]/gi, '_')}_chat_export.pdf`;
      doc.save(fileName);
      
      toast({
        title: "Export successful!",
        description: `Chat exported as ${fileName}`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export chat as PDF.",
        variant: "destructive",
      });
    }
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
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
                onClick={handleExport}
                disabled={!currentSession}
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
            <ContentInputForm onSessionCreated={handleNewSession} />
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
