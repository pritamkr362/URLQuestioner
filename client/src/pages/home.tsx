import { useState } from "react";
import { useLocation } from "wouter";
import Sidebar from "@/components/sidebar";
import MCQGenerator from "@/components/mcq-generator";
import Discuss from "@/components/discuss";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { ContentSession } from "@shared/schema";

export default function Home() {
  const [location] = useLocation();
  const sessionId = location.startsWith("/session/") ? location.split("/")[2] : null;
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(sessionId);
  const [activeTab, setActiveTab] = useState("discuss");

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
              <h2 className="text-xl font-semibold text-foreground">ContentQuery</h2>
              <p className="text-sm text-muted-foreground">AI-powered content analysis and MCQ generation</p>
            </div>
            <div className="flex items-center space-x-3">
              {currentSession && (
                <button 
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                  onClick={handleExport}
                  data-testid="button-export"
                >
                  <i className="fas fa-download mr-2"></i>
                  Export
                </button>
              )}
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
        <div className="flex-1 p-6 pt-16">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-12 bg-muted/30 p-1 rounded-2xl">
              <TabsTrigger 
                value="discuss" 
                className="flex items-center space-x-3 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-emerald-600 rounded-xl transition-all duration-300 py-4 px-6"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <i className="fas fa-comments text-white text-sm"></i>
                </div>
                <div className="text-left">
                  <div className="font-semibold">Discuss with AI</div>
                  <div className="text-xs text-muted-foreground">Extract & chat</div>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="mcq" 
                className="flex items-center space-x-3 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600 rounded-xl transition-all duration-300 py-4 px-6"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <i className="fas fa-question-circle text-white text-sm"></i>
                </div>
                <div className="text-left">
                  <div className="font-semibold">MCQ Generator</div>
                  <div className="text-xs text-muted-foreground">Create questions</div>
                </div>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="discuss" className="space-y-6">
              <Discuss onSessionCreated={handleNewSession} />
            </TabsContent>

            <TabsContent value="mcq" className="space-y-6">
              <MCQGenerator />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
