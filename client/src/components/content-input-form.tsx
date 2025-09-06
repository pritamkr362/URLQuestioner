import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQuery } from "@tanstack/react-query";

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

export default function ContentInputForm({ onSessionCreated }: ContentInputFormProps) {
  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("url");
  
  // MCQ specific states
  const [mcqCustomHeader, setMcqCustomHeader] = useState("");
  const [mcqNumberOfQuestions, setMcqNumberOfQuestions] = useState(10);
  const [mcqDifficultyLevel, setMcqDifficultyLevel] = useState<string>("medium");
  const [mcqIncludeAnswers, setMcqIncludeAnswers] = useState(false);
  const [mcqSubtopic, setMcqSubtopic] = useState("");
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
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Content extraction failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const pdfMutation = useMutation({
    mutationFn: async () => {
      if (!pdfFile) throw new Error("No PDF file selected");
      
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('topic', topic);
      if (selectedModel !== "auto") {
        formData.append('preferredModel', selectedModel);
      }

      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'PDF processing failed');
      }

      return response.json() as Promise<ExtractContentResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: "PDF processed successfully!",
        description: `Extracted ${data.session.wordCount} words using ${data.analysis.modelUsed}.`,
      });
      onSessionCreated(data.session.id);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "PDF processing failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const topicMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/create-topic-session", { 
        topic, 
        preferredModel: selectedModel === "auto" ? undefined : selectedModel || undefined 
      });
      return response.json() as Promise<ExtractContentResponse>;
    },
    onSuccess: (data) => {
      toast({
        title: "Topic session created!",
        description: `Ready to discuss ${topic}.`,
      });
      onSessionCreated(data.session.id);
      resetForm();
    },
    onError: (error) => {
      toast({
        title: "Failed to create topic session",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setUrl("");
    setTopic("");
    setCustomTopic("");
    setSelectedModel("auto");
    setPdfFile(null);
    setMcqCustomHeader("");
    setMcqNumberOfQuestions(10);
    setMcqDifficultyLevel("medium");
    setMcqIncludeAnswers(false);
    setMcqSubtopic("");
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
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

  const handlePdfSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pdfFile) {
      toast({
        title: "PDF file required",
        description: "Please select a PDF file to analyze.",
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

    pdfMutation.mutate();
  };

  const handleTopicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalTopic = topic === 'custom' ? customTopic.trim() : topic;
    
    if (!finalTopic) {
      toast({
        title: "Topic required",
        description: topic === 'custom' ? "Please enter a custom topic." : "Please select a topic to discuss.",
        variant: "destructive",
      });
      return;
    }

    // Update the mutation to use the final topic
    const response = apiRequest("POST", "/api/create-topic-session", { 
      topic: finalTopic, 
      preferredModel: selectedModel === "auto" ? undefined : selectedModel || undefined 
    });
    
    response.then(res => res.json()).then((data) => {
      toast({
        title: "Topic session created!",
        description: `Ready to discuss ${finalTopic}.`,
      });
      onSessionCreated(data.session.id);
      resetForm();
    }).catch((error) => {
      toast({
        title: "Failed to create topic session",
        description: error.message,
        variant: "destructive",
      });
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please select a PDF file.",
          variant: "destructive",
        });
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB
        toast({
          title: "File too large",
          description: "Please select a PDF file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      setPdfFile(file);
    }
  };

  const isLoading = extractMutation.isPending || pdfMutation.isPending || topicMutation.isPending;

  return (
    <div className="bg-card rounded-xl border border-border p-6 space-y-4">
      <div className="flex items-center space-x-2 mb-4">
        <i className="fas fa-plus text-primary"></i>
        <h3 className="font-semibold text-foreground">Create New Analysis</h3>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="url" data-testid="tab-url">URL</TabsTrigger>
          <TabsTrigger value="pdf" data-testid="tab-pdf">PDF</TabsTrigger>
          <TabsTrigger value="topic" data-testid="tab-topic">Topic Only</TabsTrigger>
          <TabsTrigger value="mcq" data-testid="tab-mcq">MCQ Generator</TabsTrigger>
        </TabsList>
        
        <TabsContent value="url" className="space-y-4">
          <form onSubmit={handleUrlSubmit} className="space-y-4">
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
              disabled={isLoading}
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
        </TabsContent>

        <TabsContent value="pdf" className="space-y-4">
          <form onSubmit={handlePdfSubmit} className="space-y-4">
            <div>
              <Label htmlFor="pdf" className="block text-sm font-medium text-foreground mb-2">
                PDF File
              </Label>
              <div className="relative">
                <Input
                  id="pdf"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                  data-testid="input-pdf"
                />
                {pdfFile && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Selected: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <Label htmlFor="topic-pdf" className="block text-sm font-medium text-foreground mb-2">
                Analysis Topic
              </Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger data-testid="select-topic-pdf">
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
              <Label htmlFor="model-pdf" className="block text-sm font-medium text-foreground mb-2">
                AI Model (Optional)
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger data-testid="select-model-pdf">
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
              disabled={isLoading}
              data-testid="button-process-pdf"
            >
              {pdfMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Processing PDF...
                </>
              ) : (
                <>
                  <i className="fas fa-file-pdf mr-2"></i>
                  Process & Analyze PDF
                </>
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="topic" className="space-y-4">
          <form onSubmit={handleTopicSubmit} className="space-y-4">
            <div>
              <Label htmlFor="topic-only" className="block text-sm font-medium text-foreground mb-2">
                Discussion Topic
              </Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger data-testid="select-topic-only">
                  <SelectValue placeholder="Select a topic to discuss..." />
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
                  <SelectItem value="custom">Custom Topic</SelectItem>
                </SelectContent>
              </Select>
              
              {topic === 'custom' && (
                <div className="mt-3">
                  <Input
                    placeholder="Enter your custom topic (e.g., global warming, child labour, Indian economy)..."
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    data-testid="input-custom-topic"
                    className="w-full"
                  />
                </div>
              )}
              
              <p className="text-sm text-muted-foreground mt-1">
                Start a free-form discussion about your chosen topic without any specific content source.
              </p>
            </div>
            
            <div>
              <Label htmlFor="model-topic" className="block text-sm font-medium text-foreground mb-2">
                AI Model (Optional)
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger data-testid="select-model-topic">
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
              disabled={isLoading}
              data-testid="button-create-topic-session"
            >
              {topicMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Creating Session...
                </>
              ) : (
                <>
                  <i className="fas fa-comments mr-2"></i>
                  Start Topic Discussion
                </>
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="mcq" className="space-y-4">
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">MCQ Generator</h4>
              <p className="text-sm text-muted-foreground">
                Generate multiple choice questions from URL, PDF, or topic-based content with customizable options.
              </p>
            </div>
            
            <Tabs defaultValue="mcq-url" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="mcq-url">From URL</TabsTrigger>
                <TabsTrigger value="mcq-pdf">From PDF</TabsTrigger>
                <TabsTrigger value="mcq-topic">From Topic</TabsTrigger>
              </TabsList>
              
              <TabsContent value="mcq-url" className="space-y-4">
                <form className="space-y-4">
                  <div>
                    <Label htmlFor="mcq-url-input" className="block text-sm font-medium text-foreground mb-2">
                      URL to Generate MCQs From
                    </Label>
                    <Input
                      id="mcq-url-input"
                      type="url"
                      placeholder="https://example.com/article"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      data-testid="input-mcq-url"
                    />
                  </div>
                  
                  <div>
                    <Label className="block text-sm font-medium text-foreground mb-2">Topic Focus</Label>
                    <Select value={topic} onValueChange={setTopic}>
                      <SelectTrigger data-testid="select-mcq-url-topic">
                        <SelectValue placeholder="Select topic focus..." />
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
                </form>
              </TabsContent>
              
              <TabsContent value="mcq-pdf" className="space-y-4">
                <form className="space-y-4">
                  <div>
                    <Label htmlFor="mcq-pdf-input" className="block text-sm font-medium text-foreground mb-2">
                      PDF File
                    </Label>
                    <Input
                      id="mcq-pdf-input"
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/80"
                      data-testid="input-mcq-pdf"
                    />
                    {pdfFile && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Selected: {pdfFile.name} ({(pdfFile.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label className="block text-sm font-medium text-foreground mb-2">Topic Focus</Label>
                    <Select value={topic} onValueChange={setTopic}>
                      <SelectTrigger data-testid="select-mcq-pdf-topic">
                        <SelectValue placeholder="Select topic focus..." />
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
                </form>
              </TabsContent>
              
              <TabsContent value="mcq-topic" className="space-y-4">
                <form className="space-y-4">
                  <div>
                    <Label className="block text-sm font-medium text-foreground mb-2">Main Topic</Label>
                    <Select value={topic} onValueChange={setTopic}>
                      <SelectTrigger data-testid="select-mcq-topic-main">
                        <SelectValue placeholder="Select main topic..." />
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
                        <SelectItem value="custom">Custom Topic</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {topic === 'custom' && (
                      <div className="mt-3">
                        <Input
                          placeholder="Enter custom topic (e.g., global warming, child labour, Indian economy)..."
                          value={customTopic}
                          onChange={(e) => setCustomTopic(e.target.value)}
                          data-testid="input-mcq-custom-topic"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="mcq-subtopic" className="block text-sm font-medium text-foreground mb-2">
                      Subtopic (Optional)
                    </Label>
                    <Input
                      id="mcq-subtopic"
                      placeholder="e.g., renewable energy, market trends, climate change effects..."
                      value={mcqSubtopic}
                      onChange={(e) => setMcqSubtopic(e.target.value)}
                      data-testid="input-mcq-subtopic"
                    />
                  </div>
                </form>
              </TabsContent>
            </Tabs>
            
            {/* Common MCQ Options */}
            <div className="space-y-4 border-t border-border pt-4">
              <h5 className="font-medium text-foreground">MCQ Options</h5>
              
              <div>
                <Label htmlFor="mcq-header" className="block text-sm font-medium text-foreground mb-2">
                  Custom Header (Optional)
                </Label>
                <Input
                  id="mcq-header"
                  placeholder="e.g., Final Exam - Chapter 5, Quiz on Global Warming..."
                  value={mcqCustomHeader}
                  onChange={(e) => setMcqCustomHeader(e.target.value)}
                  data-testid="input-mcq-header"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mcq-questions" className="block text-sm font-medium text-foreground mb-2">
                    Number of Questions
                  </Label>
                  <Input
                    id="mcq-questions"
                    type="number"
                    min="1"
                    max="50"
                    value={mcqNumberOfQuestions}
                    onChange={(e) => setMcqNumberOfQuestions(parseInt(e.target.value) || 10)}
                    data-testid="input-mcq-questions"
                  />
                </div>
                
                <div>
                  <Label className="block text-sm font-medium text-foreground mb-2">Difficulty Level</Label>
                  <Select value={mcqDifficultyLevel} onValueChange={setMcqDifficultyLevel}>
                    <SelectTrigger data-testid="select-mcq-difficulty">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="mcq-answers"
                  checked={mcqIncludeAnswers}
                  onChange={(e) => setMcqIncludeAnswers(e.target.checked)}
                  className="rounded border-gray-300"
                  data-testid="checkbox-mcq-answers"
                />
                <Label htmlFor="mcq-answers" className="text-sm font-medium text-foreground">
                  Include answer key on last page
                </Label>
              </div>
              
              <div>
                <Label className="block text-sm font-medium text-foreground mb-2">AI Model (Optional)</Label>
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger data-testid="select-mcq-model">
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
                type="button"
                className="w-full py-3 gradient-bg text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
                disabled={isLoading}
                data-testid="button-generate-mcq"
              >
                {isLoading ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Generating MCQs...
                  </>
                ) : (
                  <>
                    <i className="fas fa-question-circle mr-2"></i>
                    Generate MCQs
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}