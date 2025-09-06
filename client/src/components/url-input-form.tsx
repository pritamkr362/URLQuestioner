import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";

interface UrlInputFormProps {
  onSessionCreated: (sessionId: string) => void;
}

interface ExtractContentResponse {
  session: {
    id: string;
    url: string;
    title: string;
    topic: string;
    extractedContent: string;
    wordCount: number;
    readTime: number;
    modelUsed: string;
  };
  analysis: {
    summary: string;
    keyPoints: string[];
    modelUsed: string;
  };
}

interface ModelsResponse {
  models: string[];
}

export default function UrlInputForm({ onSessionCreated }: UrlInputFormProps) {
  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const { toast } = useToast();

  const { data: modelsData } = useQuery<ModelsResponse>({
    queryKey: ['/api/models'],
  });

  const extractMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/extract-content", { 
        url, 
        topic, 
        preferredModel: selectedModel === "auto" ? undefined : selectedModel || undefined 
      });
      return response.json() as Promise<ExtractContentResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: "Content extracted successfully!",
        description: `Extracted ${data.session.wordCount} words using ${data.analysis.modelUsed}.`,
      });
      onSessionCreated(data.session.id);
      setUrl("");
      setTopic("");
      setSelectedModel("auto");
    },
    onError: (error) => {
      toast({
        title: "Content extraction failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a valid URL to analyze.",
        variant: "destructive",
      });
      return;
    }

    if (!topic) {
      toast({
        title: "Topic required",
        description: "Please select a topic focus for the analysis.",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(url);
      extractMutation.mutate();
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL starting with http:// or https://",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <i className="fas fa-link text-primary"></i>
        <h3 className="font-semibold text-foreground">Content Source</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="url" className="block text-sm font-medium text-foreground mb-2">
            URL to Analyze
          </Label>
          <div className="relative">
            <Input
              id="url"
              type="url"
              placeholder="https://example.com/article"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="pr-12"
              data-testid="input-url"
            />
            <button 
              type="button"
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                navigator.clipboard.readText().then(setUrl).catch(() => {});
              }}
              data-testid="button-paste"
            >
              <i className="fas fa-paste"></i>
            </button>
          </div>
        </div>
        
        <div>
          <Label htmlFor="topic" className="block text-sm font-medium text-foreground mb-2">
            Analysis Topic
          </Label>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger data-testid="select-topic">
              <SelectValue placeholder="Select a topic focus..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="technology">Technology</SelectItem>
              <SelectItem value="business">Business & Finance</SelectItem>
              <SelectItem value="science">Science & Research</SelectItem>
              <SelectItem value="health">Health & Medicine</SelectItem>
              <SelectItem value="education">Education</SelectItem>
              <SelectItem value="politics">Politics & Policy</SelectItem>
              <SelectItem value="environment">Environment</SelectItem>
              <SelectItem value="culture">Culture & Society</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="model" className="block text-sm font-medium text-foreground mb-2">
            AI Model (Optional)
          </Label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger data-testid="select-model">
              <SelectValue placeholder="Auto-select best model" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Auto-select (Recommended)</SelectItem>
              {modelsData?.models.map((model) => (
                <SelectItem key={model} value={model}>
                  {model.split('/').pop()?.replace(':free', ' (Free)') || model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Button
          type="submit"
          className="w-full py-3 gradient-bg text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
          disabled={extractMutation.isPending}
          data-testid="button-extract-content"
        >
          {extractMutation.isPending ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Extracting Content...
            </>
          ) : (
            <>
              <i className="fas fa-search mr-2"></i>
              Extract & Analyze Content
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
