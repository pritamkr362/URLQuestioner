import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import Auth from "@/pages/Auth";
import Products from "@/pages/Products";
import AddProduct from "@/pages/AddProduct";
import EditProduct from "@/pages/EditProduct";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/session/:id" component={Home} />
      <Route path="/auth" component={Auth} />
      <Route path="/products" component={Products} />
      <Route path="/add-product" component={AddProduct} />
      <Route path="/edit-product/:id" component={EditProduct} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [location, setLocation] = useLocation();

    useEffect(() => {
        const token = localStorage.getItem('token');
        setIsLoggedIn(!!token);
    }, [location]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsLoggedIn(false);
        setLocation('/auth');
    };

    return (
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <Toaster />
                {/* Top navigation removed per request */}
                <Router />
            </TooltipProvider>
        </QueryClientProvider>
    );
}

export default App;
