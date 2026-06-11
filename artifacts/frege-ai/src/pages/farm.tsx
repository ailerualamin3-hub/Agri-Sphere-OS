import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MapPin, Map, Sun, Thermometer, Droplets, Activity, AlertTriangle, Bot, CloudRain } from "lucide-react";
import {
  useGetFarms,
  useGetCrops,
  useGetLivestock,
  useGetClimateForecast,
  useGetFarmSummary,
  useGetLivestockSummary,
  getGetFarmsQueryKey,
  getGetCropsQueryKey,
  getGetLivestockQueryKey,
  getGetClimateForecastQueryKey,
  getGetFarmSummaryQueryKey,
  getGetLivestockSummaryQueryKey
} from "@workspace/api-client-react";

export default function Farm() {
  const { data: farms } = useGetFarms({ query: { queryKey: getGetFarmsQueryKey() } });
  const { data: crops } = useGetCrops({ query: { queryKey: getGetCropsQueryKey() } });
  const { data: livestock } = useGetLivestock({ query: { queryKey: getGetLivestockQueryKey() } });
  const { data: climate } = useGetClimateForecast({ query: { queryKey: getGetClimateForecastQueryKey() } });
  const { data: farmSummary } = useGetFarmSummary({ query: { queryKey: getGetFarmSummaryQueryKey() } });
  const { data: livestockSummary } = useGetLivestockSummary({ query: { queryKey: getGetLivestockSummaryQueryKey() } });

  return (
    <div className="flex flex-col min-h-screen bg-background pb-[72px]">
      <header className="p-4 bg-background sticky top-0 z-10">
        <h1 className="text-2xl font-bold">Farm Management</h1>
        <p className="text-sm text-muted-foreground font-medium">Track your operations & climate</p>
      </header>

      <div className="flex-1 p-4 pt-0">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6 bg-muted/50 p-1 rounded-xl h-12">
            <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Overview</TabsTrigger>
            <TabsTrigger value="crops" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Crops</TabsTrigger>
            <TabsTrigger value="livestock" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Livestock</TabsTrigger>
            <TabsTrigger value="climate" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Climate</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4 focus-visible:outline-none">
            {farmSummary && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <Card className="bg-primary/10 border-primary/20 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-primary mb-1">Total Farms</p>
                    <p className="text-2xl font-black text-primary-foreground">{farmSummary.totalFarms}</p>
                  </CardContent>
                </Card>
                <Card className="bg-secondary/10 border-secondary/20 shadow-sm">
                  <CardContent className="p-4">
                    <p className="text-xs font-medium text-secondary mb-1">Total Hectares</p>
                    <p className="text-2xl font-black text-secondary-foreground">{farmSummary.totalHectares}ha</p>
                  </CardContent>
                </Card>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">Your Farms</h2>
              <Button size="sm" className="h-8 gap-1 rounded-full"><Plus className="w-3.5 h-3.5"/> Add</Button>
            </div>

            <div className="space-y-3">
              {farms?.map(farm => (
                <Card key={farm.id} className="overflow-hidden border-border/50 hover:border-primary/30 transition-colors shadow-sm">
                  <div className="h-2 w-full bg-gradient-to-r from-primary to-secondary" />
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-lg">{farm.name}</h3>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {farm.lga}, {farm.state}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 capitalize font-semibold">{farm.farmType}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Size</p>
                        <p className="text-sm font-medium">{farm.sizeHectares} Hectares</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">Health Score</p>
                        <p className="text-sm font-bold text-primary flex items-center gap-1">
                          {farm.healthScore}/100 <Activity className="w-3.5 h-3.5" />
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="mt-6 border-border/50 bg-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Map className="w-4 h-4 text-primary" /> AgriVision Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[150px] bg-card rounded-xl border border-border flex items-center justify-center relative overflow-hidden">
                   {/* Placeholder for stylized map */}
                   <div className="absolute inset-0 opacity-10 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PHBhdGggZD0iTTAgMGgyMHYyMEgwem0xMCAxMGgxMHYxMEgxMHoiIGZpbGw9IiM2YmU1ODUiIGZpbGwtb3BhY2l0eT0iMC40IiBmaWxsLXJ1bGU9ImV2ZW5vZGQiLz48L3N2Zz4=')]" />
                   <Button variant="secondary" size="sm" className="relative z-10 shadow-sm font-bold">View Full Map</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="crops" className="space-y-4 focus-visible:outline-none">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Crop Inventory</h2>
              <Button size="sm" className="h-8 gap-1 rounded-full"><Plus className="w-3.5 h-3.5"/> Plant</Button>
            </div>
            
            <div className="space-y-3">
              {crops?.map(crop => (
                <Card key={crop.id} className="border-border/50 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold">{crop.name}</h3>
                        <p className="text-xs text-muted-foreground">{crop.variety || "Local Variety"}</p>
                      </div>
                      <Badge className={
                        crop.stage === 'harvest' ? 'bg-accent text-accent-foreground' : 
                        crop.stage === 'planted' ? 'bg-primary/80' : 'bg-primary'
                      }>
                        {crop.stage}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center bg-muted/50 p-2.5 rounded-lg">
                      <div className="text-center flex-1 border-r border-border">
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-0.5">Expected Yield</p>
                        <p className="text-sm font-bold">{crop.expectedYieldKg} kg</p>
                      </div>
                      <div className="text-center flex-1">
                        <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-0.5">Health</p>
                        <p className={`text-sm font-bold capitalize ${
                          crop.healthStatus === 'excellent' ? 'text-primary' : 
                          crop.healthStatus === 'poor' || crop.healthStatus === 'critical' ? 'text-destructive' : 'text-accent'
                        }`}>
                          {crop.healthStatus}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="livestock" className="space-y-4 focus-visible:outline-none">
             {livestockSummary && (
              <Card className="bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground border-none shadow-md mb-6">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-90">Total Animals</p>
                    <p className="text-3xl font-black">{livestockSummary.totalAnimals}</p>
                  </div>
                  {livestockSummary.vaccinationsDueSoon > 0 && (
                    <div className="bg-destructive text-destructive-foreground px-3 py-2 rounded-lg flex items-center gap-2 shadow-inner">
                      <AlertTriangle className="w-4 h-4" />
                      <div className="text-xs font-bold leading-tight">
                        <div>{livestockSummary.vaccinationsDueSoon} Due</div>
                        <div className="opacity-80 font-medium">Vaccinations</div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Livestock Register</h2>
              <Button size="sm" className="h-8 gap-1 rounded-full"><Plus className="w-3.5 h-3.5"/> Add</Button>
            </div>

            <div className="space-y-3">
              {livestock?.map(animal => (
                <Card key={animal.id} className="border-border/50 shadow-sm flex overflow-hidden">
                  <div className="w-2 bg-secondary shrink-0" />
                  <CardContent className="p-4 flex-1">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-lg capitalize">{animal.species} <span className="text-muted-foreground text-sm font-normal ml-1">({animal.count})</span></h3>
                      <Badge variant="outline" className={
                        animal.healthStatus === 'excellent' ? 'border-primary text-primary bg-primary/5' : 
                        animal.healthStatus === 'poor' ? 'border-destructive text-destructive bg-destructive/5' : 'border-accent text-accent-foreground bg-accent/5'
                      }>
                        {animal.healthStatus}
                      </Badge>
                    </div>
                    {animal.nextVaccinationDate && (
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5 bg-muted/50 p-2 rounded-md">
                        <AlertTriangle className="w-3 h-3 text-accent" /> Next Vax: {new Date(animal.nextVaccinationDate).toLocaleDateString()}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="climate" className="space-y-4 focus-visible:outline-none">
            {climate && (
              <>
                <Card className="bg-primary text-primary-foreground border-none shadow-md overflow-hidden">
                  <div className="absolute inset-0 bg-black/5" />
                  <CardContent className="p-5 relative z-10">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h2 className="text-lg font-bold">7-Day Forecast</h2>
                        <p className="text-xs opacity-90">{climate.current.location}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-black">{climate.current.temperature}°</p>
                        <p className="text-xs font-medium capitalize opacity-90">{climate.current.condition}</p>
                      </div>
                    </div>
                    
                    <ScrollArea className="w-full pb-2">
                      <div className="flex gap-2 w-max">
                        {climate.forecast.map((day, i) => (
                          <div key={i} className="flex flex-col items-center bg-white/10 rounded-xl p-2.5 w-16 text-center backdrop-blur-sm">
                            <span className="text-[10px] font-bold uppercase mb-1">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                            {day.condition.includes('rain') ? <CloudRain className="w-5 h-5 my-1.5" /> : <Sun className="w-5 h-5 my-1.5" />}
                            <span className="text-xs font-bold">{day.highTemp}°</span>
                            <span className="text-[10px] opacity-70">{day.lowTemp}°</span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>

                <h3 className="font-bold text-lg mt-6 mb-3">Risk Assessment</h3>
                <div className="grid grid-cols-2 gap-3">
                  <RiskCard title="Flood Risk" value={climate.risks.floodRisk} icon={<Droplets className="w-4 h-4" />} />
                  <RiskCard title="Drought Risk" value={climate.risks.droughtRisk} icon={<Thermometer className="w-4 h-4" />} />
                  <RiskCard title="Heat Risk" value={climate.risks.heatRisk} icon={<Sun className="w-4 h-4" />} />
                  <RiskCard title="Pest Risk" value={climate.risks.pestRisk} icon={<AlertTriangle className="w-4 h-4" />} />
                </div>

                {climate.recommendations.length > 0 && (
                  <Card className="mt-6 border-accent/30 bg-accent/5">
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="text-sm flex items-center gap-2 text-accent-foreground">
                        <Bot className="w-4 h-4" /> AI Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {climate.recommendations.map((rec, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-accent shrink-0">•</span>
                            <span className="text-foreground/90 leading-tight">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function RiskCard({ title, value, icon }: { title: string, value: string, icon: React.ReactNode }) {
  const isHigh = value === 'high' || value === 'severe';
  const isMod = value === 'moderate';
  
  return (
    <Card className={`border-border/50 shadow-sm ${isHigh ? 'bg-destructive/5 border-destructive/20' : isMod ? 'bg-accent/5 border-accent/20' : 'bg-card'}`}>
      <CardContent className="p-3">
        <div className={`flex items-center gap-1.5 text-xs font-semibold mb-2 ${isHigh ? 'text-destructive' : isMod ? 'text-accent-foreground' : 'text-primary'}`}>
          {icon} {title}
        </div>
        <p className="text-sm font-bold capitalize">{value}</p>
      </CardContent>
    </Card>
  );
}
