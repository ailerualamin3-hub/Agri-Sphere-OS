import React from "react";
import { useLocation } from "wouter";
import { Link } from "wouter";
import { 
  CloudRain, 
  Wind, 
  Droplets, 
  Thermometer, 
  Mic, 
  Camera, 
  ShieldAlert, 
  Phone, 
  Bell, 
  ChevronRight,
  Sprout,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useGetDashboardSummary, 
  useGetAiInsights, 
  useGetEmergencyContacts,
  getGetDashboardSummaryQueryKey,
  getGetAiInsightsQueryKey,
  getGetEmergencyContactsQueryKey
} from "@workspace/api-client-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: summary, isLoading: isSummaryLoading } = useGetDashboardSummary({ query: { queryKey: getGetDashboardSummaryQueryKey() } });
  const { data: insights, isLoading: isInsightsLoading } = useGetAiInsights({ query: { queryKey: getGetAiInsightsQueryKey() } });
  const { data: emergency, isLoading: isEmergencyLoading } = useGetEmergencyContacts(undefined, { query: { queryKey: getGetEmergencyContactsQueryKey() } });

  return (
    <div className="p-4 space-y-6 pb-24 bg-background">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border-2 border-primary/20">
            <AvatarImage src="https://i.pravatar.cc/150?u=aminu" alt="Aminu Kano" />
            <AvatarFallback>AK</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Welcome back, Aminu</h1>
            <p className="text-xs text-muted-foreground font-medium">Kano State, Nigeria</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 hover:bg-muted">
          <Bell className="w-5 h-5 text-primary" />
        </Button>
      </header>

      {/* Weather Widget */}
      <section>
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Current Weather</h2>
        </div>
        {isSummaryLoading ? (
          <Skeleton className="h-28 w-full rounded-2xl" />
        ) : summary?.weather ? (
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-none overflow-hidden relative shadow-lg shadow-primary/20">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
              <CloudRain className="w-32 h-32 -mt-4 -mr-4" />
            </div>
            <CardContent className="p-4 flex items-center justify-between relative z-10">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black">{summary.weather.temperature}°C</span>
                </div>
                <p className="text-sm font-medium opacity-90">{summary.weather.condition}</p>
                <p className="text-xs opacity-75 mt-1">{summary.weather.location}</p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-medium bg-black/10 p-3 rounded-xl backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5" /> {summary.weather.humidity}%
                </div>
                <div className="flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5" /> {summary.weather.windSpeed} km/h
                </div>
                <div className="flex items-center gap-1.5 col-span-2">
                  <CloudRain className="w-3.5 h-3.5" /> {summary.weather.rainProbability}% Rain Prob
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">Weather unavailable</CardContent></Card>
        )}
      </section>

      {/* Farm Health Card */}
      <section>
        {isSummaryLoading ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : summary?.farmHealth ? (
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex-shrink-0 w-16 h-16 rounded-full border-4 border-accent flex items-center justify-center bg-accent/10 relative">
                <span className="text-xl font-bold text-accent-foreground">{summary.farmHealth.overallScore}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">Farm Health</h3>
                <div className="flex gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                    Crops: {summary.farmHealth.cropHealthStatus}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] bg-secondary/5 text-secondary border-secondary/20">
                    Livestock: {summary.farmHealth.livestockHealthStatus}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setLocation('/farm')} className="text-muted-foreground">
                <ChevronRight className="w-5 h-5" />
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </section>

      {/* FarmGPT Quick Card */}
      <section>
        <Card className="bg-secondary text-secondary-foreground border-none overflow-hidden relative shadow-lg shadow-secondary/20">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
            <BotIcon className="w-32 h-32 -mb-8 -mr-8" />
          </div>
          <CardContent className="p-5 relative z-10">
            <h3 className="text-lg font-bold mb-1">FarmGPT Assistant</h3>
            <p className="text-sm opacity-80 mb-4 max-w-[80%]">Get instant answers about crops, diseases, and market prices.</p>
            <div className="flex gap-2">
              <Button onClick={() => setLocation('/farmgpt')} className="bg-white text-secondary hover:bg-white/90 shadow-sm font-semibold flex-1">
                Ask FarmGPT
              </Button>
              <Button variant="outline" size="icon" onClick={() => setLocation('/farmgpt')} className="bg-white/10 border-white/20 hover:bg-white/20">
                <Mic className="w-4 h-4 text-white" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Smart Scans */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Smart Scans</h2>
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-card hover:bg-muted/50 transition-colors cursor-pointer border-border/50">
            <CardContent className="p-3 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Camera className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold">Crop Scan</span>
            </CardContent>
          </Card>
          <Card className="bg-card hover:bg-muted/50 transition-colors cursor-pointer border-border/50">
            <CardContent className="p-3 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold">Animal Scan</span>
            </CardContent>
          </Card>
          <Card className="bg-card hover:bg-muted/50 transition-colors cursor-pointer border-border/50">
            <CardContent className="p-3 flex flex-col items-center justify-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent-foreground">
                <Sprout className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-semibold">Soil Scan</span>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* AI Insights */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">AI Insights</h2>
        </div>
        {isInsightsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : insights?.length ? (
          <div className="space-y-3">
            {insights.slice(0, 3).map((insight) => (
              <Card key={insight.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                <CardContent className="p-3.5 flex gap-3">
                  <div className={`w-2 h-full min-h-[40px] rounded-full shrink-0 ${
                    insight.priority === 'high' || insight.priority === 'urgent' ? 'bg-destructive' :
                    insight.priority === 'medium' ? 'bg-accent' : 'bg-primary'
                  }`} />
                  <div>
                    <h4 className="text-sm font-semibold">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{insight.message}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No new insights right now.</CardContent></Card>
        )}
      </section>

      {/* Emergency Locator */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Emergency Services
        </h2>
        {isEmergencyLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : emergency?.length ? (
          <ScrollArea className="w-full whitespace-nowrap pb-2">
            <div className="flex w-max gap-3 pr-4">
              {emergency.map((contact) => (
                <Card key={contact.id} className="w-[180px] shrink-0 border-border/50">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-xs font-bold capitalize text-primary">{contact.type}</h4>
                      <span className="text-[10px] text-muted-foreground">{contact.distance}km</span>
                    </div>
                    <p className="text-sm font-semibold truncate">{contact.name}</p>
                    <Button variant="secondary" size="sm" className="w-full mt-3 h-8 text-xs font-bold">
                      <Phone className="w-3 h-3 mr-1.5" /> Call
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <Card><CardContent className="p-4 text-center text-sm text-muted-foreground">No emergency contacts nearby.</CardContent></Card>
        )}
      </section>

    </div>
  );
}

function BotIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  );
}
