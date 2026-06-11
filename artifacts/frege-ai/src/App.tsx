import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Splash from "@/pages/splash";
import Home from "@/pages/home";
import FarmGpt from "@/pages/farmgpt";
import Farm from "@/pages/farm";
import Community from "@/pages/community";
import Market from "@/pages/market";
import Profile from "@/pages/profile";
import Scan from "@/pages/scan";
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

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/home">
        <Layout><Home /></Layout>
      </Route>
      <Route path="/scan">
        <Layout><Scan /></Layout>
      </Route>
      <Route path="/farmgpt">
        <Layout><FarmGpt /></Layout>
      </Route>
      <Route path="/farm">
        <Layout><Farm /></Layout>
      </Route>
      <Route path="/community">
        <Layout><Community /></Layout>
      </Route>
      <Route path="/market">
        <Layout><Market /></Layout>
      </Route>
      <Route path="/profile">
        <Layout><Profile /></Layout>
      </Route>
      {/* Legacy redirects */}
      <Route path="/farmconnect">
        <Layout><Community /></Layout>
      </Route>
      <Route path="/neuroscore">
        <Layout><Profile /></Layout>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
