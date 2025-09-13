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
                <nav style={{ padding: '10px 20px', backgroundColor: '#f8f8f8', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                        <Link href="/"><a style={{ textDecoration: 'none', color: '#007bff' }}>Home</a></Link>
                        <Link href="/products"><a style={{ textDecoration: 'none', color: '#007bff' }}>Products</a></Link>
                        {isLoggedIn && (
                            <Link href="/add-product"><a style={{ textDecoration: 'none', color: '#007bff' }}>Add Product</a></Link>
                        )}
                    </div>
                    <div>
                        {isLoggedIn ? (
                            <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #dc3545', color: '#dc3545', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
                        ) : (
                            <Link href="/auth"><a style={{ textDecoration: 'none', color: '#007bff', border: '1px solid #007bff', padding: '8px 12px', borderRadius: '4px' }}>Login / Register</a></Link>
                        )}
                    </div>
                </nav>
                <Router />
            </TooltipProvider>
        </QueryClientProvider>
    );
}

export default App;
