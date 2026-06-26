import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, MessageCircle, Share2, MapPin, Search, PlusCircle, Users, Tractor, Wheat, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  useGetFarmConnectSummary,
  useGetFarmConnectFeed,
  useGetNearbyFarmers,
  useGetFarmerGroups,
  useGetLabourExchangeListings,
  useGetEquipmentExchange,
  useGetSeedExchange,
  useGetCommunityEvents,
  useCreateCommunityPost,
  getGetFarmConnectSummaryQueryKey,
  getGetFarmConnectFeedQueryKey,
  getGetNearbyFarmersQueryKey,
  getGetFarmerGroupsQueryKey,
  getGetLabourExchangeListingsQueryKey,
  getGetEquipmentExchangeQueryKey,
  getGetSeedExchangeQueryKey,
  getGetCommunityEventsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

export default function FarmConnect() {
  const queryClient = useQueryClient();
  const { data: summary } = useGetFarmConnectSummary({ query: { queryKey: getGetFarmConnectSummaryQueryKey() } });
  const { data: feed } = useGetFarmConnectFeed({ query: { queryKey: getGetFarmConnectFeedQueryKey() } });
  const { data: nearby } = useGetNearbyFarmers({ radiusKm: 25 }, { query: { queryKey: getGetNearbyFarmersQueryKey({ radiusKm: 25 }) } });
  const { data: groups } = useGetFarmerGroups({ query: { queryKey: getGetFarmerGroupsQueryKey() } });
  const { data: labour } = useGetLabourExchangeListings({ query: { queryKey: getGetLabourExchangeListingsQueryKey() } });
  const { data: equipment } = useGetEquipmentExchange({ query: { queryKey: getGetEquipmentExchangeQueryKey() } });
  const { data: seeds } = useGetSeedExchange({ query: { queryKey: getGetSeedExchangeQueryKey() } });
  const { data: events } = useGetCommunityEvents({ query: { queryKey: getGetCommunityEventsQueryKey() } });

  const createPost = useCreateCommunityPost();
  
  const form = useForm({
    defaultValues: {
      content: ""
    }
  });

  const onSubmitPost = (data: any) => {
    createPost.mutate({ data: { content: data.content } }, {
      onSuccess: () => {
        form.reset();
        queryClient.invalidateQueries({ queryKey: getGetFarmConnectFeedQueryKey() });
      }
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-muted/10 pb-[72px]">
      <header className="p-4 bg-background sticky top-0 z-10 border-b border-border/50">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h1 className="text-2xl font-bold">FarmConnect</h1>
            <p className="text-sm text-muted-foreground font-medium">Community & Network</p>
          </div>
          {summary && (
            <div className="text-right">
              <Badge variant="secondary" className="bg-accent/20 text-accent-foreground font-bold hover:bg-accent/30 border-accent/20">
                {summary.myCredits} Credits
              </Badge>
            </div>
          )}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search community, groups, farmers..." className="pl-9 bg-muted/50 border-transparent rounded-xl" />
        </div>
      </header>

      <div className="flex-1">
        <Tabs defaultValue="feed" className="w-full">
          <div className="bg-background pt-2 px-4 pb-2 border-b border-border/50">
            <ScrollArea className="w-full">
              <TabsList className="w-max bg-transparent p-0 h-auto gap-4 flex mb-1">
                <TabsTrigger value="feed" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 text-sm font-semibold">Feed</TabsTrigger>
                <TabsTrigger value="nearby" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 text-sm font-semibold">Nearby</TabsTrigger>
                <TabsTrigger value="groups" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 text-sm font-semibold">Groups</TabsTrigger>
                <TabsTrigger value="labour" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 text-sm font-semibold">Labour</TabsTrigger>
                <TabsTrigger value="equipment" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 text-sm font-semibold">Equipment</TabsTrigger>
                <TabsTrigger value="seeds" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 text-sm font-semibold">Seeds</TabsTrigger>
                <TabsTrigger value="events" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 text-sm font-semibold">Events</TabsTrigger>
              </TabsList>
            </ScrollArea>
          </div>
          
          <TabsContent value="feed" className="p-4 space-y-4 m-0">
            <Card className="border-border/50 shadow-sm bg-background mb-6">
              <CardContent className="p-3">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmitPost)} className="flex flex-col gap-2">
                    <div className="flex gap-3">
                      <Avatar className="w-10 h-10 shrink-0">
                        <AvatarImage src="https://i.pravatar.cc/150?u=aminu" />
                        <AvatarFallback>AK</AvatarFallback>
                      </Avatar>
                      <FormField
                        control={form.control}
                        name="content"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Textarea 
                                placeholder="Share an update or question..." 
                                className="min-h-[80px] bg-muted/30 border-transparent resize-none focus-visible:ring-1" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" className="rounded-full font-bold px-6" disabled={createPost.isPending}>
                        Post
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {feed?.map(post => (
              <Card key={post.id} className="border-border/50 shadow-sm mb-4 bg-background">
                <CardHeader className="p-4 pb-2 flex flex-row items-start gap-3 space-y-0">
                  <Avatar className="w-10 h-10 border border-border">
                    <AvatarImage src={post.authorAvatar || undefined} />
                    <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <h3 className="font-bold text-sm text-foreground">{post.authorName}</h3>
                      {post.authorVerified && <Badge variant="secondary" className="h-4 px-1 text-[8px] bg-blue-100 text-blue-700 hover:bg-blue-100">Verified</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      {new Date(post.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                </CardContent>
                <CardFooter className="p-3 pt-0 border-t border-border/50 flex justify-between">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary hover:bg-primary/5 gap-1.5 text-xs font-semibold">
                    <Heart className="w-4 h-4" /> {post.likes}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 text-xs font-semibold">
                    <MessageCircle className="w-4 h-4" /> {post.comments}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground gap-1.5 text-xs font-semibold">
                    <Share2 className="w-4 h-4" /> Share
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </TabsContent>

          {/* ... other tabs mapped similarly (omitted for brevity but would map nearby, groups, labour, equipment, seeds, events) ... */}
          <TabsContent value="nearby" className="p-4 m-0 space-y-4">
             {nearby?.map(farmer => (
              <Card key={farmer.id} className="border-border/50 shadow-sm bg-background">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="w-12 h-12 border-2 border-background shadow-sm">
                    <AvatarImage src={farmer.avatarUrl || undefined} />
                    <AvatarFallback>{farmer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                      {farmer.name}
                    </h3>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" /> {farmer.distanceKm}km away • {farmer.farmType}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="groups" className="p-4 m-0 space-y-4">
            {groups?.map(group => (
               <Card key={group.id} className="border-border/50 shadow-sm bg-background">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm">{group.name}</h3>
                    <p className="text-xs text-muted-foreground">{group.memberCount} members</p>
                  </div>
                  <Button size="sm" variant="outline">Join</Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="labour" className="p-4 m-0 space-y-4">
             {labour?.map(item => (
               <Card key={item.id} className="border-border/50 shadow-sm bg-background">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-sm">{item.title}</h3>
                    <Badge variant="secondary">{item.creditsOffered} Credits</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{item.description}</p>
                  <div className="flex justify-between items-center text-xs font-medium text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {item.location}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {new Date(item.dateNeeded).toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="equipment" className="p-4 m-0 space-y-4">
             {equipment?.map(item => (
               <Card key={item.id} className="border-border/50 shadow-sm bg-background flex overflow-hidden">
                <div className="w-24 bg-muted shrink-0 flex items-center justify-center">
                  <Tractor className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <CardContent className="p-4 flex-1">
                  <h3 className="font-bold text-sm mb-1">{item.name}</h3>
                  <p className="text-lg font-black text-primary">₦{item.pricePerDayNgn}<span className="text-xs text-muted-foreground font-normal">/day</span></p>
                  <Button size="sm" className="w-full mt-3 h-8">Rent Now</Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="seeds" className="p-4 m-0 space-y-4">
            {seeds?.map(item => (
               <Card key={item.id} className="border-border/50 shadow-sm bg-background flex overflow-hidden">
                <div className="w-24 bg-accent/10 shrink-0 flex items-center justify-center">
                  <Wheat className="w-8 h-8 text-accent" />
                </div>
                <CardContent className="p-4 flex-1">
                  <div className="flex justify-between">
                    <h3 className="font-bold text-sm mb-1">{item.cropType}</h3>
                    <Badge variant="outline" className="capitalize text-[10px] h-5">{item.listingType}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{item.quantityKg} kg available</p>
                  {item.priceNgn && <p className="text-lg font-black text-primary">₦{item.priceNgn}</p>}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="events" className="p-4 m-0 space-y-4">
            {events?.map(item => (
               <Card key={item.id} className="border-border/50 shadow-sm bg-background">
                <CardContent className="p-4">
                  <h3 className="font-bold text-sm mb-1">{item.title}</h3>
                  <p className="text-xs text-muted-foreground mb-3">{item.description}</p>
                  <div className="flex justify-between items-center text-xs font-medium">
                    <span className="flex items-center gap-1 text-primary"><Calendar className="w-3 h-3"/> {new Date(item.eventDate).toLocaleDateString()}</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs">RSVP</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
