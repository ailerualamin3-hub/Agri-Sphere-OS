import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import Splash from "@/pages/splash";
import Home from "@/pages/home";
import FarmGpt from "@/pages/farmgpt";
import Farm from "@/pages/farm";
import FarmConnect from "@/pages/farmconnect";
import Market from "@/pages/market";
import NeuroScore from "@/pages/neuroscore";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Splash} />
      <Route path="/home">
        <Layout>
          <Home />
        </Layout>
      </Route>
      <Route path="/farmgpt">
        <Layout>
          <FarmGpt />
        </Layout>
      </Route>
      <Route path="/farm">
        <Layout>
          <Farm />
        </Layout>
      </Route>
      <Route path="/farmconnect">
        <Layout>
          <FarmConnect />
        </Layout>
      </Route>
      <Route path="/market">
        <Layout>
          <Market />
        </Layout>
      </Route>
      <Route path="/neuroscore">
        <Layout>
          <NeuroScore />
        </Layout>
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
