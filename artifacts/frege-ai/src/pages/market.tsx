import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, Search, Filter, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  useGetMarketPrices,
  useGetMarketSummary,
  useGetMarketListings,
  getGetMarketPricesQueryKey,
  getGetMarketSummaryQueryKey,
  getGetMarketListingsQueryKey
} from "@workspace/api-client-react";

export default function Market() {
  const { data: prices } = useGetMarketPrices({ query: { queryKey: getGetMarketPricesQueryKey() } });
  const { data: summary } = useGetMarketSummary({ query: { queryKey: getGetMarketSummaryQueryKey() } });
  const { data: listings } = useGetMarketListings(undefined, { query: { queryKey: getGetMarketListingsQueryKey() } });

  return (
    <div className="flex flex-col min-h-screen bg-background pb-[72px]">
      <header className="p-4 bg-primary text-primary-foreground sticky top-0 z-10 shadow-md">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AgriMarket</h1>
            <p className="text-sm text-primary-foreground/80 font-medium">Live Prices & Trading</p>
          </div>
          <Button size="icon" variant="secondary" className="bg-white/20 hover:bg-white/30 text-white rounded-full border-none">
            <Plus className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-foreground/60" />
          <Input 
            placeholder="Search commodities..." 
            className="pl-9 bg-black/10 border-transparent text-primary-foreground placeholder:text-primary-foreground/60 rounded-xl focus-visible:ring-white/30 focus-visible:border-transparent" 
          />
        </div>
      </header>

      <div className="flex-1 p-4">
        <Tabs defaultValue="prices" className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-6 bg-muted/50 p-1 rounded-xl h-12">
            <TabsTrigger value="prices" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Prices</TabsTrigger>
            <TabsTrigger value="buy" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Buy</TabsTrigger>
            <TabsTrigger value="sell" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm">Sell</TabsTrigger>
          </TabsList>
          
          <TabsContent value="prices" className="space-y-4 focus-visible:outline-none m-0">
            {summary && (
              <div className="mb-6">
                <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Trending Now</h2>
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {summary.trendingCommodities.map((item, i) => (
                    <Badge key={i} variant="secondary" className="bg-accent/10 text-accent-foreground border-accent/20 px-3 py-1.5 font-bold whitespace-nowrap">
                      🔥 {item}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Card className="border-border/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/30 pb-3 pt-4 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold">Kano Regional Market</CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-xs font-semibold px-2">Change</Button>
              </CardHeader>
              <div className="divide-y divide-border/50">
                {prices?.map(price => (
                  <div key={price.id} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                    <div>
                      <h3 className="font-bold text-foreground">{price.commodity}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">per {price.unit}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="font-black text-lg">₦{price.pricePerKg.toLocaleString()}</p>
                      <div className={`flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm mt-1 ${
                        price.trend === 'rising' ? 'bg-primary/10 text-primary' :
                        price.trend === 'falling' ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                      }`}>
                        {price.trend === 'rising' ? <TrendingUp className="w-3 h-3" /> :
                         price.trend === 'falling' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {price.changePercent ? `${Math.abs(price.changePercent)}%` : 'Stable'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="buy" className="m-0 space-y-4 focus-visible:outline-none">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
               <Badge className="px-4 py-1.5 rounded-full font-bold whitespace-nowrap bg-secondary text-secondary-foreground">All</Badge>
               <Badge variant="outline" className="px-4 py-1.5 rounded-full font-bold whitespace-nowrap">Crops</Badge>
               <Badge variant="outline" className="px-4 py-1.5 rounded-full font-bold whitespace-nowrap">Livestock</Badge>
               <Badge variant="outline" className="px-4 py-1.5 rounded-full font-bold whitespace-nowrap">Equipment</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              {listings?.map(listing => (
                <Card key={listing.id} className="border-border/50 shadow-sm overflow-hidden flex flex-col">
                  <div className="h-28 bg-muted relative">
                    {listing.imageUrl ? (
                       <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
                    )}
                    <Badge className="absolute top-2 right-2 bg-black/60 text-white border-none backdrop-blur-sm font-semibold">{listing.type}</Badge>
                  </div>
                  <CardContent className="p-3 flex-1 flex flex-col">
                    <h3 className="font-bold text-sm leading-tight mb-1 line-clamp-2 flex-1">{listing.title}</h3>
                    <p className="text-lg font-black text-primary mt-2">₦{listing.priceNgn.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{listing.quantity} {listing.unit} available</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="sell" className="m-0 focus-visible:outline-none">
             <div className="text-center py-12">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">Create a Listing</h2>
                <p className="text-sm text-muted-foreground mb-8 px-4">Reach thousands of buyers across the region. Transparent pricing, secure trading.</p>
                <Button size="lg" className="w-full max-w-[200px] rounded-full font-bold shadow-md">Start Selling</Button>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
