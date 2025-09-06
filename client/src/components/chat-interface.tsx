import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Message } from "@shared/schema";

interface ChatInterfaceProps {
  sessionId: string;
  topic: string;
}

interface AskQuestionResponse {
  userMessage: Message;
  assistantMessage: Message;
}

export default function ChatInterface({ sessionId, topic }: ChatInterfaceProps) {
  const [question, setQuestion] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['/api/sessions', sessionId, 'messages'],
  });

  const askMutation = useMutation({
    mutationFn: async (q: string) => {
      const response = await apiRequest("POST", `/api/sessions/${sessionId}/ask`, { question: q });
      return response.json() as Promise<AskQuestionResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/sessions', sessionId, 'messages'] });
      setQuestion("");
    },
    onError: (error) => {
      toast({
        title: "Failed to send question",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (question.trim()) {
      askMutation.mutate(question.trim());
    }
  };

  const handleQuickQuestion = (quickQ: string) => {
    askMutation.mutate(quickQ);
  };

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, askMutation.isPending]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-2 mb-2">
          <i className="fas fa-comments text-primary"></i>
          <h3 className="font-semibold text-foreground">Ask Questions</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Ask questions about the extracted content. Responses will be focused on {topic}.
        </p>
      </div>
      
      {/* Chat Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-6">
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center">
              <div className="text-muted-foreground text-sm">Loading messages...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm">
              <i className="fas fa-comment-dots text-2xl mb-2 block"></i>
              Start asking questions about the content!
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'message-user text-white rounded-br-sm'
                      : 'message-assistant rounded-bl-sm'
                  }`}
                  data-testid={`message-${message.role}-${message.id}`}
                >
                  <div
                    className={`text-sm whitespace-pre-wrap ${
                      message.role === 'assistant' ? 'text-foreground' : ''
                    }`}
                    data-testid="text-message-content"
                  >
                    {message.content}
                  </div>
                  <div
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'opacity-75' : 'text-muted-foreground'
                    }`}
                    data-testid="text-message-timestamp"
                  >
                    {formatTime(message.timestamp!)}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {/* Typing Indicator */}
          {askMutation.isPending && (
            <div className="flex justify-start">
              <div className="message-assistant p-3 rounded-lg rounded-bl-sm">
                <div className="flex space-x-1" data-testid="typing-indicator">
                  <div className="typing-indicator"></div>
                  <div className="typing-indicator"></div>
                  <div className="typing-indicator"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
      
      {/* Message Input */}
      <div className="p-6 border-t border-border">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            type="text"
            placeholder="Ask a question about the content..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={askMutation.isPending}
            className="flex-1 text-sm"
            data-testid="input-question"
          />
          <Button
            type="submit"
            disabled={!question.trim() || askMutation.isPending}
            className="gradient-bg text-white hover:opacity-90"
            data-testid="button-send-question"
          >
            <i className="fas fa-paper-plane"></i>
          </Button>
        </form>
        
        {/* Quick Questions */}
        <div className="mt-3 space-y-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">Quick Questions:</div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickQuestion("Summarize the key points")}
              disabled={askMutation.isPending}
              className="text-xs"
              data-testid="button-quick-summarize"
            >
              Summarize key points
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickQuestion("What are the main arguments?")}
              disabled={askMutation.isPending}
              className="text-xs"
              data-testid="button-quick-arguments"
            >
              Main arguments
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQuickQuestion("Are there any key statistics mentioned?")}
              disabled={askMutation.isPending}
              className="text-xs"
              data-testid="button-quick-statistics"
            >
              Key statistics
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
