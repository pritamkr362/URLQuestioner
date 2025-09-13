import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import MCQTest from "@/components/mcq-test";

interface ModelsResponse {
  models: string[];
}

export default function MCQGenerator() {
  const [url, setUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [customTopic, setCustomTopic] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("auto");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState("mcq-url");
  const [mcqResult, setMcqResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  
  // MCQ specific states
  const [mcqCustomHeader, setMcqCustomHeader] = useState("");
  const [mcqNumberOfQuestions, setMcqNumberOfQuestions] = useState(10);
  const [mcqDifficultyLevel, setMcqDifficultyLevel] = useState<string>("medium");
  const [mcqIncludeAnswers, setMcqIncludeAnswers] = useState(false);
  const [mcqSubtopic, setMcqSubtopic] = useState("");
  
  // Institute details for PDF export
  const [instituteName, setInstituteName] = useState("");
  const [instituteAddress, setInstituteAddress] = useState("");
  
  // Language selection
  const [selectedLanguage, setSelectedLanguage] = useState("english");
  
  const { toast } = useToast();

  const { data: modelsData } = useQuery<ModelsResponse>({
    queryKey: ['/api/models'],
  });

  // Common MCQ generation handler
  const handleGenerateMCQ = async () => {
    console.log("MCQ Generation started", { activeTab, url, topic, customTopic, pdfFile });
    
    // Validation based on active tab
    if (activeTab === "mcq-url") {
      if (!url.trim()) {
        toast({
          title: "URL required",
          description: "Please enter a valid URL to generate MCQs from.",
          variant: "destructive",
        });
        return;
      }
      if (!topic) {
        toast({
          title: "Topic required",
          description: "Please select a topic focus for the MCQs.",
          variant: "destructive",
        });
        return;
      }
      if (topic === "custom" && !customTopic.trim()) {
        toast({
          title: "Custom topic required",
          description: "Please enter a custom topic.",
          variant: "destructive",
        });
        return;
      }
    } else if (activeTab === "mcq-pdf") {
      if (!pdfFile) {
        toast({
          title: "PDF file required",
          description: "Please select a PDF file to generate MCQs from.",
          variant: "destructive",
        });
        return;
      }
      if (!topic.trim()) {
        toast({
          title: "Topic required",
          description: "Please enter a topic for the PDF content.",
          variant: "destructive",
        });
        return;
      }
    } else if (activeTab === "mcq-topic") {
      const finalTopic = topic === "custom" ? customTopic : topic;
      if (!finalTopic) {
        toast({
          title: "Topic required",
          description: topic === 'custom' ? "Please enter a custom topic." : "Please select a topic to generate MCQs about.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    
    try {
      let endpoint = "";
      let body: any = {
        customHeader: mcqCustomHeader,
        numberOfQuestions: mcqNumberOfQuestions,
        difficultyLevel: mcqDifficultyLevel,
        includeAnswers: mcqIncludeAnswers,
        preferredModel: selectedModel === "auto" ? undefined : selectedModel || undefined,
        subtopic: mcqSubtopic,
        language: selectedLanguage,
      };
      
      if (activeTab === "mcq-url") {
        endpoint = "/api/generate-mcq-url";
        body.url = url;
        body.topic = topic === "custom" ? customTopic : topic;
      } else if (activeTab === "mcq-pdf") {
        endpoint = "/api/generate-mcq-pdf";
        body.topic = topic;
        // PDF file upload
        const formData = new FormData();
        Object.entries(body).forEach(([key, value]) => formData.append(key, value as any));
        formData.append("pdf", pdfFile!);
        
        const response = await fetch(endpoint, { method: "POST", body: formData });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "PDF MCQ generation failed");
        }
        const result = await response.json();
        setMcqResult(result);
        toast({ title: "MCQs generated!", description: "PDF MCQs created successfully." });
        return;
      } else if (activeTab === "mcq-topic") {
        endpoint = "/api/generate-mcq-topic";
        body.topic = topic === "custom" ? customTopic : topic;
      }
      
      console.log("Making API request to:", endpoint, body);
      const response = await apiRequest("POST", endpoint, body);
      console.log("API response status:", response.status);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error:", errorData);
        throw new Error(errorData.message || "MCQ generation failed");
      }
      const result = await response.json();
      console.log("MCQ result:", result);
      setMcqResult(result);
      toast({ title: "MCQs generated!", description: "MCQs created successfully." });
    } catch (error: any) {
      console.error("MCQ generation error:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to generate MCQs. Please try again.",
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Export MCQs to PDF
  const handleExportPDF = () => {
    if (!mcqResult || !mcqResult.formattedContent) {
      toast({ title: "No MCQs", description: "Generate MCQs first.", variant: "destructive" });
      return;
    }
    import("jspdf").then(({ jsPDF }) => {
      const doc = new jsPDF();
      let yPos = 20;
      
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Add institute name in bold at top center
      if (instituteName.trim()) {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const textWidth = doc.getTextWidth(instituteName);
        doc.text(instituteName, (pageWidth - textWidth) / 2, yPos);
        yPos += 10;
      }
      
      // Add institute address below (not bold)
      if (instituteAddress.trim()) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const addressLines = doc.splitTextToSize(instituteAddress, 180);
        addressLines.forEach((line: string) => {
          const textWidth = doc.getTextWidth(line);
          doc.text(line, (pageWidth - textWidth) / 2, yPos);
          yPos += 6;
        });
        yPos += 10;
      }
      
      // Add a line separator
      if (instituteName.trim() || instituteAddress.trim()) {
        doc.line(20, yPos, pageWidth - 20, yPos);
        yPos += 15;
      }
      
      // Add MCQ content
      doc.setFontSize(10);
      const content = mcqResult.formattedContent;
      const lines = doc.splitTextToSize(content, 180);
      lines.forEach((line: string) => {
        if (yPos > 270) { // Start new page if needed
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 10, yPos);
        yPos += 5;
      });
      
      doc.save("mcq_questions.pdf");
      toast({ title: "PDF exported!", description: "MCQ questions saved as PDF." });
    });
  };

  const formatModelName = (model: string) => {
    return model.split('/').pop()?.replace(':free', ' (Free)') || model;
  };

  const handleTestComplete = (score: number, totalQuestions: number, answers: number[]) => {
    // Test completed, could save results or show additional info
    console.log('Test completed:', { score, totalQuestions, answers });
  };

  const handleBackToGenerator = () => {
    setIsTestMode(false);
    setMcqResult(null);
  };

  // If in test mode and we have results, show the test interface
  if (isTestMode && mcqResult && mcqResult.questions) {
    return (
      <MCQTest
        questions={mcqResult.questions}
        onTestComplete={handleTestComplete}
        onBackToGenerator={handleBackToGenerator}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
          <i className="fas fa-brain text-white text-2xl"></i>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          MCQ Generator
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Create intelligent multiple choice questions from any content source using advanced AI
        </p>
      </div>

      {/* Main Generator Card */}
      <div className="bg-card rounded-2xl border border-border shadow-lg p-8">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-full"></div>
          <h2 className="text-xl font-semibold text-foreground">Content Source</h2>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger 
              value="mcq-url" 
              className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 rounded-lg transition-all duration-200"
            >
              <i className="fas fa-link text-sm"></i>
              <span>From URL</span>
            </TabsTrigger>
            <TabsTrigger 
              value="mcq-pdf"
              className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 rounded-lg transition-all duration-200"
            >
              <i className="fas fa-file-pdf text-sm"></i>
              <span>From PDF</span>
            </TabsTrigger>
            <TabsTrigger 
              value="mcq-topic"
              className="flex items-center space-x-2 data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 rounded-lg transition-all duration-200"
            >
              <i className="fas fa-lightbulb text-sm"></i>
              <span>From Topic</span>
            </TabsTrigger>
          </TabsList>

          {/* URL Tab */}
          <TabsContent value="mcq-url" className="space-y-6 mt-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="mcq-url-input" className="flex items-center space-x-2 text-sm font-medium text-foreground">
                  <i className="fas fa-link text-blue-500"></i>
                  <span>Website URL</span>
                </Label>
                <Input
                  id="mcq-url-input"
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  data-testid="input-mcq-url"
                  required
                  className="h-12 border-2 border-border/50 focus:border-blue-500 transition-colors duration-200 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mcq-topic-select" className="flex items-center space-x-2 text-sm font-medium text-foreground">
                  <i className="fas fa-tags text-green-500"></i>
                  <span>Topic Category</span>
                </Label>
                <Select value={topic} onValueChange={setTopic}>
                  <SelectTrigger 
                    data-testid="select-mcq-topic"
                    className="h-12 border-2 border-border/50 focus:border-green-500 transition-colors duration-200 rounded-xl"
                  >
                    <SelectValue placeholder="Select a topic category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2">
                    <SelectItem value="technology" className="rounded-lg">🚀 Technology</SelectItem>
                    <SelectItem value="science" className="rounded-lg">🔬 Science</SelectItem>
                    <SelectItem value="business" className="rounded-lg">💼 Business</SelectItem>
                    <SelectItem value="health" className="rounded-lg">🏥 Health</SelectItem>
                    <SelectItem value="education" className="rounded-lg">📚 Education</SelectItem>
                    <SelectItem value="custom" className="rounded-lg">✨ Custom Topic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {topic === "custom" && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="mcq-custom-topic" className="flex items-center space-x-2 text-sm font-medium text-foreground">
                    <i className="fas fa-edit text-purple-500"></i>
                    <span>Custom Topic</span>
                  </Label>
                  <Input
                    id="mcq-custom-topic"
                    placeholder="Enter your custom topic (e.g., Machine Learning, Climate Change, etc.)"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    data-testid="input-mcq-custom-topic"
                    className="h-12 border-2 border-border/50 focus:border-purple-500 transition-colors duration-200 rounded-xl"
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* PDF Tab */}
          <TabsContent value="mcq-pdf" className="space-y-6 mt-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="mcq-pdf-file" className="flex items-center space-x-2 text-sm font-medium text-foreground">
                  <i className="fas fa-file-pdf text-red-500"></i>
                  <span>PDF Document</span>
                </Label>
                <div className="relative">
                  <Input
                    id="mcq-pdf-file"
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                    data-testid="input-mcq-pdf"
                    required
                    className="h-12 border-2 border-border/50 focus:border-red-500 transition-colors duration-200 rounded-xl file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-red-50 file:text-red-700 hover:file:bg-red-100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mcq-pdf-topic" className="flex items-center space-x-2 text-sm font-medium text-foreground">
                  <i className="fas fa-tags text-green-500"></i>
                  <span>Content Topic</span>
                </Label>
                <Input
                  id="mcq-pdf-topic"
                  placeholder="Enter topic for PDF content (e.g., Financial Analysis, Research Paper, etc.)"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  data-testid="input-mcq-pdf-topic"
                  required
                  className="h-12 border-2 border-border/50 focus:border-green-500 transition-colors duration-200 rounded-xl"
                />
              </div>
            </div>
          </TabsContent>

          {/* Topic Tab */}
          <TabsContent value="mcq-topic" className="space-y-6 mt-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="mcq-topic-only" className="flex items-center space-x-2 text-sm font-medium text-foreground">
                  <i className="fas fa-lightbulb text-yellow-500"></i>
                  <span>Topic Category</span>
                </Label>
                <Select value={topic} onValueChange={setTopic}>
                  <SelectTrigger 
                    data-testid="select-mcq-topic-only"
                    className="h-12 border-2 border-border/50 focus:border-yellow-500 transition-colors duration-200 rounded-xl"
                  >
                    <SelectValue placeholder="Select a topic category" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-2">
                    <SelectItem value="technology" className="rounded-lg">🚀 Technology</SelectItem>
                    <SelectItem value="science" className="rounded-lg">🔬 Science</SelectItem>
                    <SelectItem value="business" className="rounded-lg">💼 Business</SelectItem>
                    <SelectItem value="health" className="rounded-lg">🏥 Health</SelectItem>
                    <SelectItem value="education" className="rounded-lg">📚 Education</SelectItem>
                    <SelectItem value="custom" className="rounded-lg">✨ Custom Topic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {topic === "custom" && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="mcq-topic-custom" className="flex items-center space-x-2 text-sm font-medium text-foreground">
                    <i className="fas fa-edit text-purple-500"></i>
                    <span>Custom Topic</span>
                  </Label>
                  <Input
                    id="mcq-topic-custom"
                    placeholder="Enter your custom topic (e.g., Quantum Computing, Sustainable Energy, etc.)"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    data-testid="input-mcq-topic-custom"
                    className="h-12 border-2 border-border/50 focus:border-purple-500 transition-colors duration-200 rounded-xl"
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* MCQ Configuration */}
        <div className="mt-8 space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-6 bg-gradient-to-b from-green-500 to-blue-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-foreground">MCQ Configuration</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="mcq-subtopic" className="flex items-center space-x-2 text-sm font-medium text-foreground">
                <i className="fas fa-layer-group text-indigo-500"></i>
                <span>Subtopic (Optional)</span>
              </Label>
              <Input
                id="mcq-subtopic"
                placeholder="e.g., renewable energy, market trends, climate change effects..."
                value={mcqSubtopic}
                onChange={(e) => setMcqSubtopic(e.target.value)}
                data-testid="input-mcq-subtopic"
                className="h-11 border-2 border-border/50 focus:border-indigo-500 transition-colors duration-200 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mcq-header" className="flex items-center space-x-2 text-sm font-medium text-foreground">
                <i className="fas fa-heading text-orange-500"></i>
                <span>Custom Header (Optional)</span>
              </Label>
              <Input
                id="mcq-header"
                placeholder="e.g., Final Exam - Chapter 5, Quiz on Global Warming..."
                value={mcqCustomHeader}
                onChange={(e) => setMcqCustomHeader(e.target.value)}
                data-testid="input-mcq-header"
                className="h-11 border-2 border-border/50 focus:border-orange-500 transition-colors duration-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center space-x-2 text-sm font-medium text-foreground">
                <i className="fas fa-list-ol text-teal-500"></i>
                <span>Number of Questions</span>
              </Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={mcqNumberOfQuestions}
                onChange={(e) => setMcqNumberOfQuestions(parseInt(e.target.value) || 10)}
                data-testid="input-mcq-questions"
                className="h-11 border-2 border-border/50 focus:border-teal-500 transition-colors duration-200 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center space-x-2 text-sm font-medium text-foreground">
                <i className="fas fa-chart-line text-pink-500"></i>
                <span>Difficulty Level</span>
              </Label>
              <Select value={mcqDifficultyLevel} onValueChange={setMcqDifficultyLevel}>
                <SelectTrigger 
                  data-testid="select-mcq-difficulty"
                  className="h-11 border-2 border-border/50 focus:border-pink-500 transition-colors duration-200 rounded-xl"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2">
                  <SelectItem value="easy" className="rounded-lg">🟢 Easy</SelectItem>
                  <SelectItem value="medium" className="rounded-lg">🟡 Medium</SelectItem>
                  <SelectItem value="hard" className="rounded-lg">🔴 Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-xl border border-border/50">
              <input
                type="checkbox"
                id="mcq-answers"
                checked={mcqIncludeAnswers}
                onChange={(e) => setMcqIncludeAnswers(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-2"
                data-testid="checkbox-mcq-answers"
              />
              <Label htmlFor="mcq-answers" className="flex items-center space-x-2 text-sm font-medium text-foreground cursor-pointer">
                <i className="fas fa-key text-amber-500"></i>
                <span>Include answers in output</span>
              </Label>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-muted/30 rounded-xl border border-border/50">
              <input
                type="checkbox"
                id="test-mode"
                checked={isTestMode}
                onChange={(e) => setIsTestMode(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-gray-300 text-purple-600 focus:ring-purple-500 focus:ring-2"
                data-testid="checkbox-test-mode"
              />
              <Label htmlFor="test-mode" className="flex items-center space-x-2 text-sm font-medium text-foreground cursor-pointer">
                <i className="fas fa-laptop text-purple-500"></i>
                <span>Enable online test mode</span>
              </Label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="flex items-center space-x-2 text-sm font-medium text-foreground">
                <i className="fas fa-globe text-cyan-500"></i>
                <span>Language</span>
              </Label>
              <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                <SelectTrigger 
                  data-testid="select-language"
                  className="h-11 border-2 border-border/50 focus:border-cyan-500 transition-colors duration-200 rounded-xl"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2">
                  <SelectItem value="english" className="rounded-lg">🇺🇸 English</SelectItem>
                  <SelectItem value="spanish" className="rounded-lg">🇪🇸 Spanish</SelectItem>
                  <SelectItem value="french" className="rounded-lg">🇫🇷 French</SelectItem>
                  <SelectItem value="german" className="rounded-lg">🇩🇪 German</SelectItem>
                  <SelectItem value="italian" className="rounded-lg">🇮🇹 Italian</SelectItem>
                  <SelectItem value="portuguese" className="rounded-lg">🇵🇹 Portuguese</SelectItem>
                  <SelectItem value="russian" className="rounded-lg">🇷🇺 Russian</SelectItem>
                  <SelectItem value="chinese" className="rounded-lg">🇨🇳 Chinese</SelectItem>
                  <SelectItem value="japanese" className="rounded-lg">🇯🇵 Japanese</SelectItem>
                  <SelectItem value="korean" className="rounded-lg">🇰🇷 Korean</SelectItem>
                  <SelectItem value="arabic" className="rounded-lg">🇸🇦 Arabic</SelectItem>
                  <SelectItem value="hindi" className="rounded-lg">🇮🇳 Hindi</SelectItem>
                  <SelectItem value="bengali" className="rounded-lg">🇧🇩 Bengali</SelectItem>
                  <SelectItem value="urdu" className="rounded-lg">🇵🇰 Urdu</SelectItem>
                  <SelectItem value="turkish" className="rounded-lg">🇹🇷 Turkish</SelectItem>
                  <SelectItem value="dutch" className="rounded-lg">🇳🇱 Dutch</SelectItem>
                  <SelectItem value="swedish" className="rounded-lg">🇸🇪 Swedish</SelectItem>
                  <SelectItem value="norwegian" className="rounded-lg">🇳🇴 Norwegian</SelectItem>
                  <SelectItem value="danish" className="rounded-lg">🇩🇰 Danish</SelectItem>
                  <SelectItem value="finnish" className="rounded-lg">🇫🇮 Finnish</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center space-x-2 text-sm font-medium text-foreground">
                <i className="fas fa-robot text-cyan-500"></i>
                <span>AI Model</span>
              </Label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger 
                  data-testid="select-mcq-model"
                  className="h-11 border-2 border-border/50 focus:border-cyan-500 transition-colors duration-200 rounded-xl"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-2">
                  <SelectItem value="auto" className="rounded-lg">🤖 Auto (Recommended)</SelectItem>
                  {modelsData?.models.map((model) => (
                    <SelectItem key={model} value={model} className="rounded-lg">
                      {formatModelName(model)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Institute Details for PDF Export */}
        <div className="mt-8 space-y-6">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-6 bg-gradient-to-b from-orange-500 to-red-500 rounded-full"></div>
            <h3 className="text-lg font-semibold text-foreground">Institute Details (Optional)</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="institute-name" className="flex items-center space-x-2 text-sm font-medium text-foreground">
                <i className="fas fa-university text-orange-500"></i>
                <span>Institute Name</span>
              </Label>
              <Input
                id="institute-name"
                placeholder="e.g., ABC University, XYZ College..."
                value={instituteName}
                onChange={(e) => setInstituteName(e.target.value)}
                className="h-11 border-2 border-border/50 focus:border-orange-500 transition-colors duration-200 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="institute-address" className="flex items-center space-x-2 text-sm font-medium text-foreground">
                <i className="fas fa-map-marker-alt text-red-500"></i>
                <span>Institute Address</span>
              </Label>
              <Input
                id="institute-address"
                placeholder="e.g., 123 Main St, City, State, Country..."
                value={instituteAddress}
                onChange={(e) => setInstituteAddress(e.target.value)}
                className="h-11 border-2 border-border/50 focus:border-red-500 transition-colors duration-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-8">
          <Button
            onClick={handleGenerateMCQ}
            disabled={isLoading}
            className="w-full h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            data-testid="button-generate-mcq"
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-3 text-lg"></i>
                <span className="text-lg">Generating MCQs...</span>
              </>
            ) : (
              <>
                <i className="fas fa-magic mr-3 text-lg"></i>
                <span className="text-lg">Generate MCQs</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* MCQ Results */}
      {mcqResult && !isTestMode && (
        <div className="bg-card rounded-2xl border border-border shadow-lg p-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                <i className="fas fa-check text-white text-lg"></i>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Generated MCQs</h3>
                <p className="text-sm text-muted-foreground">Ready for use in your assessments</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                type="button"
                className="h-11 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                onClick={() => setIsTestMode(true)}
              >
                <i className="fas fa-laptop mr-2"></i>
                Take Test
              </Button>
              <Button
                type="button"
                className="h-11 px-6 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                disabled={!mcqResult || !mcqResult.formattedContent}
                data-testid="button-export-mcq-pdf"
                onClick={handleExportPDF}
              >
                <i className="fas fa-download mr-2"></i>
                Export PDF
              </Button>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-6 max-h-96 overflow-y-auto border border-border/50">
            <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
              {mcqResult.formattedContent}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
