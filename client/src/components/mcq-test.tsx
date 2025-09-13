import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface MCQQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface MCQTestProps {
  questions: MCQQuestion[];
  onTestComplete: (score: number, totalQuestions: number, answers: number[]) => void;
  onBackToGenerator: () => void;
}

interface TestResult {
  score: number;
  totalQuestions: number;
  percentage: number;
  answers: number[];
  timeSpent: number;
}

export default function MCQTest({ questions, onTestComplete, onBackToGenerator }: MCQTestProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>(new Array(questions.length).fill(-1));
  const [isTestComplete, setIsTestComplete] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [timeSpent, setTimeSpent] = useState<number>(0);
  const { toast } = useToast();

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      handleSubmitTest();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitTest = () => {
    const finalTimeSpent = Math.floor((Date.now() - startTime) / 1000);
    let score = 0;
    
    questions.forEach((question, index) => {
      if (selectedAnswers[index] === question.correctAnswer) {
        score++;
      }
    });

    const percentage = Math.round((score / questions.length) * 100);
    
    const result: TestResult = {
      score,
      totalQuestions: questions.length,
      percentage,
      answers: selectedAnswers,
      timeSpent: finalTimeSpent
    };

    setTestResult(result);
    setIsTestComplete(true);
    onTestComplete(score, questions.length, selectedAnswers);

    // Show toast with result
    toast({
      title: "Test Completed!",
      description: `You scored ${score}/${questions.length} (${percentage}%)`,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-600";
    if (percentage >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBadgeVariant = (percentage: number) => {
    if (percentage >= 80) return "default" as const;
    if (percentage >= 60) return "secondary" as const;
    return "destructive" as const;
  };

  if (isTestComplete && testResult) {
    return (
      <div className="space-y-6">
        {/* Test Complete Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full mb-4">
            <i className="fas fa-trophy text-white text-3xl"></i>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Test Completed!</h1>
          <p className="text-lg text-muted-foreground">Here are your results</p>
        </div>

        {/* Results Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Your Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Display */}
            <div className="text-center space-y-4">
              <div className={`text-6xl font-bold ${getScoreColor(testResult.percentage)}`}>
                {testResult.percentage}%
              </div>
              <div className="text-2xl text-foreground">
                {testResult.score} out of {testResult.totalQuestions} correct
              </div>
              <Badge 
                variant={getScoreBadgeVariant(testResult.percentage)}
                className="text-lg px-4 py-2"
              >
                {testResult.percentage >= 80 ? "Excellent!" : 
                 testResult.percentage >= 60 ? "Good Job!" : "Keep Practicing!"}
              </Badge>
            </div>

            {/* Test Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-2xl font-semibold text-foreground">{formatTime(testResult.timeSpent)}</div>
                <div className="text-sm text-muted-foreground">Time Spent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold text-foreground">
                  {Math.round(testResult.timeSpent / testResult.totalQuestions)}s
                </div>
                <div className="text-sm text-muted-foreground">Avg per Question</div>
              </div>
            </div>

            {/* Question Review */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">Question Review</h3>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {questions.map((question, index) => {
                  const userAnswer = testResult.answers[index];
                  const isCorrect = userAnswer === question.correctAnswer;
                  
                  return (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg border ${
                        isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">Question {index + 1}</span>
                        <Badge variant={isCorrect ? "default" : "destructive"} className="text-xs">
                          {isCorrect ? "Correct" : "Incorrect"}
                        </Badge>
                      </div>
                      <div className="text-sm text-foreground mb-1">{question.question}</div>
                      <div className="text-xs text-muted-foreground">
                        Your answer: {userAnswer === -1 ? "Not answered" : String.fromCharCode(65 + userAnswer)}
                        {!isCorrect && (
                          <span className="ml-2">
                            • Correct: {String.fromCharCode(65 + question.correctAnswer)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <Button
                onClick={onBackToGenerator}
                className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl"
              >
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Generator
              </Button>
              <Button
                onClick={() => window.print()}
                className="flex-1 h-12 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl"
              >
                <i className="fas fa-print mr-2"></i>
                Print Results
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Test Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-4">
          <i className="fas fa-question-circle text-white text-2xl"></i>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Online Test
        </h1>
        <p className="text-lg text-muted-foreground">
          Answer all questions to complete the test
        </p>
      </div>

      {/* Progress Bar */}
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {formatTime(timeSpent)}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl">
            {currentQuestion.question}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {currentQuestion.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                className={`w-full p-4 text-left rounded-xl border-2 transition-all duration-200 ${
                  selectedAnswers[currentQuestionIndex] === index
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-border hover:border-blue-300 hover:bg-blue-50/50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                    selectedAnswers[currentQuestionIndex] === index
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedAnswers[currentQuestionIndex] === index && (
                      <i className="fas fa-check text-white text-xs"></i>
                    )}
                  </div>
                  <span className="font-medium">{String.fromCharCode(65 + index)})</span>
                  <span>{option}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              variant="outline"
              className="px-6"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Previous
            </Button>
            
            <div className="flex space-x-2">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    index === currentQuestionIndex
                      ? 'bg-blue-500 text-white'
                      : selectedAnswers[index] !== -1
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>

            <Button
              onClick={handleNextQuestion}
              className="px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
            >
              {currentQuestionIndex === questions.length - 1 ? (
                <>
                  <i className="fas fa-check mr-2"></i>
                  Submit Test
                </>
              ) : (
                <>
                  Next
                  <i className="fas fa-arrow-right ml-2"></i>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
