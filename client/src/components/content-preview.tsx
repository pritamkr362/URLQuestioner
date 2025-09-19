import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ContentSession } from "@shared/schema";

interface ContentPreviewProps {
  session: ContentSession;
}

export default function ContentPreview({ session }: ContentPreviewProps) {
  const [showFullContent, setShowFullContent] = useState(false);

  const formatTopic = (topic: string) => {
    return topic.charAt(0).toUpperCase() + topic.slice(1);
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <i className="fas fa-file-text text-accent"></i>
          <h3 className="font-semibold text-foreground">Extracted Content</h3>
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <i className="fas fa-check-circle text-accent"></i>
          <span>Content ready for analysis</span>
        </div>
      </div>
      
      {/* Source Information */}
      <div className="mb-4 p-3 bg-muted rounded-lg">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <i className={`fas ${session.sourceType === 'url' ? 'fa-link' : session.sourceType === 'pdf' ? 'fa-file-pdf' : 'fa-comments'}`}></i>
          <span>
            {session.sourceType === 'url' && session.url && `Source: ${session.url}`}
            {session.sourceType === 'pdf' && session.fileName && `Source: ${session.fileName}`}
            {session.sourceType === 'topic-only' && 'Topic Discussion'}
          </span>
        </div>
      </div>

      {/* Content Metadata */}
      {session.sourceType !== 'topic-only' && (
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="text-word-count">
              {session.wordCount?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground">Words</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="text-read-time">
              {session.readTime || 0} min
            </div>
            <div className="text-sm text-muted-foreground">Read Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="text-topic">
              {formatTopic(session.topic)}
            </div>
            <div className="text-sm text-muted-foreground">Topic</div>
          </div>
        </div>
      )}
      
      {session.sourceType === 'topic-only' && (
        <div className="text-center p-6 bg-muted rounded-lg mb-6">
          <div className="text-2xl font-bold text-foreground mb-2" data-testid="text-topic">
            {formatTopic(session.topic)}
          </div>
          <div className="text-sm text-muted-foreground">
            Open discussion - no specific content source
          </div>
        </div>
      )}
      
      {/* Content Preview */}
      {session.sourceType !== 'topic-only' && session.extractedContent && (
        <>
          <div className="relative">
            <div className="max-h-64 overflow-hidden">
              <div className="prose prose-sm max-w-none text-muted-foreground">
                <h4 className="text-foreground font-semibold mb-2" data-testid="text-content-title">
                  {session.title || "Extracted Content"}
                </h4>
                <div className="whitespace-pre-wrap" data-testid="text-content-preview">
                  {session.extractedContent.slice(0, 500)}
                  {session.extractedContent.length > 500 && "..."}
                </div>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-12 content-fade"></div>
          </div>
          
          <Dialog open={showFullContent} onOpenChange={setShowFullContent}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                className="mt-4 text-primary hover:text-primary/80 text-sm font-medium p-0 h-auto"
                data-testid="button-view-full-content"
              >
                <i className="fas fa-expand-alt mr-2"></i>
                View Full Content
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>{session.title || "Extracted Content"}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[60vh] pr-4">
                <div className="whitespace-pre-wrap text-sm" data-testid="text-full-content">
                  {session.extractedContent}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
