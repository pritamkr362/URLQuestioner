interface SidebarProps {
  onNewAnalysis: () => void;
}

export default function Sidebar({ onNewAnalysis }: SidebarProps) {
  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 gradient-bg rounded-lg flex items-center justify-center">
            <i className="fas fa-brain text-white text-lg"></i>
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">ContentQuery</h1>
            <p className="text-sm text-muted-foreground">AI Content Analysis</p>
          </div>
        </div>
      </div>
      
      {/* Navigation */}
      <nav className="p-4 space-y-2 flex-1">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Features</div>
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground px-3 py-1">• Discuss with AI</div>
          <div className="text-xs text-muted-foreground px-3 py-1">• MCQ Generator</div>
        </div>
        <div className="pt-4">
          <button 
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg bg-primary text-primary-foreground transition-colors"
            onClick={onNewAnalysis}
            data-testid="nav-new-analysis"
          >
            <i className="fas fa-plus w-4"></i>
            <span>New Analysis</span>
          </button>
        </div>
      </nav>
      
      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <span className="text-primary-foreground text-sm font-medium" data-testid="text-user-initials">JD</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate" data-testid="text-user-name">John Doe</p>
            <p className="text-xs text-muted-foreground">Free Plan</p>
          </div>
          <button 
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-logout"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>
      </div>
    </div>
  );
}