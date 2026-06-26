import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { AuthProvider, useAuth } from "@/contexts/auth";

import Splash from "@/pages/splash";
import Login from "@/pages/login";
import Signup from "@/pages/signup";
import ForgotPassword from "@/pages/forgot-password";
import Onboarding from "@/pages/onboarding";
import Home from "@/pages/home";
import FarmGpt from "@/pages/farmgpt";
import Farm from "@/pages/farm";
import Community from "@/pages/community";
import Market from "@/pages/market";
import Profile from "@/pages/profile";
import Diagnose from "@/pages/diagnose";
import Opportunities from "@/pages/opportunities";
import Payment from "@/pages/payment";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, farmer } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (!farmer?.onboardingComplete) return <Redirect to="/onboarding" />;
  return <>{children}</>;
}

function AppRouter() {
  const { isAuthenticated, isLoading, farmer } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1E3A8A]">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-white animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />

      <Route path="/onboarding">
        {!isAuthenticated
          ? <Redirect to="/login" />
          : farmer?.onboardingComplete
            ? <Redirect to="/home" />
            : <Onboarding />}
      </Route>

      <Route path="/home">
        <ProtectedRoute><Layout><Home /></Layout></ProtectedRoute>
      </Route>
      <Route path="/diagnose">
        <ProtectedRoute><Layout><Diagnose /></Layout></ProtectedRoute>
      </Route>
      <Route path="/farmgpt">
        <ProtectedRoute><Layout><FarmGpt /></Layout></ProtectedRoute>
      </Route>
      <Route path="/farm">
        <ProtectedRoute><Layout><Farm /></Layout></ProtectedRoute>
      </Route>
      <Route path="/community">
        <ProtectedRoute><Layout><Community /></Layout></ProtectedRoute>
      </Route>
      <Route path="/market">
        <ProtectedRoute><Layout><Market /></Layout></ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>
      </Route>
      <Route path="/opportunities">
        <ProtectedRoute><Layout><Opportunities /></Layout></ProtectedRoute>
      </Route>
      <Route path="/payment">
        <ProtectedRoute><Payment /></ProtectedRoute>
      </Route>
      <Route path="/scan">
        <ProtectedRoute><Layout><Diagnose /></Layout></ProtectedRoute>
      </Route>
      <Route path="/farmconnect">
        <ProtectedRoute><Layout><Community /></Layout></ProtectedRoute>
      </Route>
      <Route path="/neuroscore">
        <ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
