import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { apiUrl } from "@/lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import ContentPreview from "@/components/content-preview";
import ChatInterface from "@/components/chat-interface";
import type { ContentSession } from "@shared/schema";

interface ContentInputFormProps {
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

export default function Discuss({ onSessionCreated }: ContentInputFormProps) {
  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("url");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const { toast } = useToast();

  const { data: modelsData } = useQuery<ModelsResponse>({
    queryKey: ['/api/models'],
    queryFn: async () => {
      const res = await fetch(apiUrl('/api/models'), { credentials: 'include' });
      if (!res.ok) throw new Error(`${res.status}: ${(await res.text()) || res.statusText}`);
      return res.json();
    },
  });

  const { data: currentSession } = useQuery<ContentSession>({
    queryKey: ['/api/sessions', currentSessionId],
    enabled: !!currentSessionId,
  });

  const extractMutation = useMutation({
    mutationFn: async () => {
      let endpoint = "";
      let body: any = {
        topic: topic === "custom" ? customTopic : topic,
        preferredModel: selectedModel === "auto" ? undefined : selectedModel || undefined,
      };

      if (activeTab === "url") {
        endpoint = "/api/extract-content";
        body.url = url;
      } else if (activeTab === "pdf") {
        endpoint = "/api/extract-pdf";
        if (!pdfFile) {
          throw new Error("PDF file is required");
        }
        const formData = new FormData();
        Object.entries(body).forEach(([key, value]) => formData.append(key, value as any));
        formData.append("pdf", pdfFile);
        
        const response = await fetch(apiUrl(endpoint), { method: "POST", body: formData, credentials: "include" });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "PDF content extraction failed");
        }
        return response.json() as Promise<ExtractContentResponse>;
      } else if (activeTab === "topic-only") {
        endpoint = "/api/create-topic-session";
        body.topic = topic === "custom" ? customTopic : topic;
      } else {
        throw new Error("Please select a content source");
      }

      const response = await apiRequest("POST", endpoint, body);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Content extraction failed");
      }
      return response.json() as Promise<ExtractContentResponse>;
    },
    onSuccess: (data) => {
      setCurrentSessionId(data.session.id);
      onSessionCreated(data.session.id);
      toast({
        title: "Content extracted successfully!",
        description: `Analyzed ${data.session.wordCount} words in ${data.session.readTime} minutes`,
      });
    },
    onError: (error) => {
      toast({
        title: "Extraction failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    extractMutation.mutate();
  };

  const handleNewAnalysis = () => {
    setCurrentSessionId(null);
    setUrl("");
    setTopic("");
    setCustomTopic("");
    setPdfFile(null);
  };

  const formatModelName = (model: string) => {
    return model.split('/').pop()?.replace(':free', ' (Free)') || model;
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl mb-4">
          <i className="fas fa-comments text-white text-2xl"></i>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          Discuss with AI
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Extract content from any source and engage in intelligent conversations with advanced AI
        </p>
      </div>

      {/* Main Discussion Card */}
      <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-2 h-8 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-foreground">Content Source</h2>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger 
              value="url" 
              className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 rounded-lg transition-all duration-200"
            >
              <i className="fas fa-link text-sm"></i>
              <span>From URL</span>
            </TabsTrigger>
            <TabsTrigger 
              value="pdf"
              className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 rounded-lg transition-all duration-200"
            >
              <i className="fas fa-file-pdf text-sm"></i>
              <span>From PDF</span>
            </TabsTrigger>
            <TabsTrigger 
              value="topic-only"
              className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-emerald-600 rounded-lg transition-all duration-200"
            >
              <i className="fas fa-lightbulb text-sm"></i>
              <span>Topic Only</span>
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* URL Tab */}
            <TabsContent value="url" className="space-y-6 mt-6">
              <div className="space-y-2">
                <Label htmlFor="url-input" className="flex items-center space-x-2 text-sm font-medium text-foreground">
                  <i className="fas fa-link text-emerald-500"></i>
                  <span>Website URL</span>
                </Label>
                <Input
                  id="url-input"
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  required
                  data-testid="input-url"
                  className="h-12 border-2 border-border/50 focus:border-emerald-500 transition-colors duration-200 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="topic-select" className="block text-sm font-medium text-foreground mb-2">
                  Topic
                </Label>
                <Select value={topic} onValueChange={setTopic}>
                  <SelectTrigger data-testid="select-topic">
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="custom">Custom Topic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {topic === "custom" && (
                <div>
                  <Label htmlFor="custom-topic" className="block text-sm font-medium text-foreground mb-2">
                    Custom Topic
                  </Label>
                  <Input
                    id="custom-topic"
                    placeholder="Enter your custom topic"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    data-testid="input-custom-topic"
                  />
                </div>
              )}
            </TabsContent>

            {/* PDF Tab */}
            <TabsContent value="pdf" className="space-y-4">
              <div>
                <Label htmlFor="pdf-file" className="block text-sm font-medium text-foreground mb-2">
                  PDF File
                </Label>
                <Input
                  id="pdf-file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  required
                  data-testid="input-pdf"
                />
              </div>

              <div>
                <Label htmlFor="pdf-topic" className="block text-sm font-medium text-foreground mb-2">
                  Topic
                </Label>
                <Input
                  id="pdf-topic"
                  placeholder="Enter topic for PDF content"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  data-testid="input-pdf-topic"
                />
              </div>
            </TabsContent>

            {/* Topic Only Tab */}
            <TabsContent value="topic-only" className="space-y-4">
              <div>
                <Label htmlFor="topic-only-select" className="block text-sm font-medium text-foreground mb-2">
                  Topic
                </Label>
                <Select value={topic} onValueChange={setTopic}>
                  <SelectTrigger data-testid="select-topic-only">
                    <SelectValue placeholder="Select a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technology">Technology</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="health">Health</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="custom">Custom Topic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {topic === "custom" && (
                <div>
                  <Label htmlFor="topic-only-custom" className="block text-sm font-medium text-foreground mb-2">
                    Custom Topic
                  </Label>
                  <Input
                    id="topic-only-custom"
                    placeholder="Enter your custom topic"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    data-testid="input-topic-only-custom"
                  />
                </div>
              )}
            </TabsContent>

            {/* AI Model Selection */}
            <div>
              <Label className="block text-sm font-medium text-foreground mb-2">AI Model</Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger data-testid="select-model">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (Recommended)</SelectItem>
                  {modelsData?.models.map((model) => (
                    <SelectItem key={model} value={model}>
                      {formatModelName(model)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              disabled={extractMutation.isPending}
              data-testid="button-extract"
            >
              {extractMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-3 text-lg"></i>
                  <span className="text-lg">Extracting...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-search mr-3 text-lg"></i>
                  <span className="text-lg">Extract & Analyze</span>
                </>
              )}
            </Button>
          </form>
        </Tabs>
      </div>

      {/* Content Preview */}
      {currentSession && (
        <ContentPreview session={currentSession} />
      )}

      {/* Chat Interface */}
      {currentSession && (
        <div className="bg-card rounded-lg border border-border">
          <ChatInterface sessionId={currentSession.id} topic={currentSession.topic} />
        </div>
      )}

      {/* New Analysis Button */}
      {currentSession && (
        <div className="flex justify-center">
          <Button
            onClick={handleNewAnalysis}
            className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            data-testid="button-new-analysis"
          >
            <i className="fas fa-plus mr-2"></i>
            New Analysis
          </Button>
        </div>
      )}
    </div>
  );
}
