import React, { useState } from "react";
import { useLocation } from "wouter";
import {
  Heart, MessageCircle, Share2, MapPin, Users, Calendar,
  PlusCircle, Search, ChevronRight, Star, Shield, BookOpen,
  Tractor, Wheat, Lightbulb, HelpCircle, Award
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetFarmConnectFeed,
  useGetFarmerGroups,
  useGetCommunityEvents,
  useCreateCommunityPost,
  useGetFarmConnectSummary,
  getGetFarmConnectFeedQueryKey,
  getGetFarmerGroupsQueryKey,
  getGetCommunityEventsQueryKey,
  getGetFarmConnectSummaryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

type Tab = "feed" | "groups" | "events";

const expertAdvice = [
  { expert: "Dr. Bello Gana", role: "Plant Pathologist", topic: "Managing Fall Armyworm in 2026", avatar: "https://i.pravatar.cc/150?u=expert1", replies: 34 },
  { expert: "Aisha Ahmad, ADP", role: "Extension Officer", topic: "Optimal planting dates for Kano State", avatar: "https://i.pravatar.cc/150?u=expert2", replies: 21 },
];

export default function Community() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [postContent, setPostContent] = useState("");
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());

  const { data: summary } = useGetFarmConnectSummary({ query: { queryKey: getGetFarmConnectSummaryQueryKey() } });
  const { data: feed, isLoading: isFeedLoading } = useGetFarmConnectFeed({ query: { queryKey: getGetFarmConnectFeedQueryKey() } });
  const { data: groups, isLoading: isGroupsLoading } = useGetFarmerGroups({ query: { queryKey: getGetFarmerGroupsQueryKey() } });
  const { data: events, isLoading: isEventsLoading } = useGetCommunityEvents({ query: { queryKey: getGetCommunityEventsQueryKey() } });
  const createPost = useCreateCommunityPost();

  const handlePost = () => {
    if (!postContent.trim()) return;
    createPost.mutate(
      { data: { content: postContent } },
      {
        onSuccess: () => {
          setPostContent("");
          queryClient.invalidateQueries({ queryKey: getGetFarmConnectFeedQueryKey() });
        },
      }
    );
  };

  const toggleLike = (postId: number) => {
    setLikedPosts((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "feed", label: "Feed", icon: <MessageCircle className="w-4 h-4" /> },
    { id: "groups", label: "Groups", icon: <Users className="w-4 h-4" /> },
    { id: "events", label: "Events", icon: <Calendar className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-0 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Community</h1>
            <p className="text-xs text-gray-500">
              {summary ? `${summary.totalMembers?.toLocaleString() ?? "1,247"} members` : "Farmer Network"}
            </p>
          </div>
          {summary && (
            <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-bold text-xs">
              <Star className="w-3 h-3 mr-1" /> {summary.myCredits} Credits
            </Badge>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-[#16A34A] text-[#16A34A]"
                  : "border-transparent text-gray-400"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Tab */}
      {activeTab === "feed" && (
        <div className="px-4 pt-4 pb-8 space-y-4">
          {/* Compose Post */}
          <Card className="rounded-2xl border-0 bg-white shadow-sm">
            <CardContent className="p-3">
              <div className="flex gap-3 mb-2">
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarImage src="https://i.pravatar.cc/150?u=aminu" />
                  <AvatarFallback className="bg-[#16A34A] text-white text-sm font-bold">AK</AvatarFallback>
                </Avatar>
                <Textarea
                  placeholder="Share an update, question, or farming tip..."
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="flex-1 min-h-[72px] resize-none bg-gray-50 border-gray-100 rounded-xl text-sm focus-visible:ring-green-400"
                />
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-2 text-gray-400">
                  <button className="text-xs flex items-center gap-1 hover:text-gray-600">
                    <PlusCircle className="w-3.5 h-3.5" /> Photo
                  </button>
                </div>
                <Button
                  size="sm"
                  onClick={handlePost}
                  disabled={!postContent.trim() || createPost.isPending}
                  className="bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl px-5 h-8"
                >
                  Post
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ask Community */}
          <Card className="rounded-xl border-0 bg-gradient-to-r from-green-50 to-emerald-50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#16A34A]/10 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Ask the Community</p>
                <p className="text-[11px] text-gray-500">Get advice from 1,247 farmers</p>
              </div>
              <button className="text-xs font-bold text-[#16A34A] bg-[#16A34A]/10 px-3 py-1.5 rounded-lg">
                Ask Now
              </button>
            </CardContent>
          </Card>

          {/* Expert Advice */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#1E3A8A]" /> Expert Advice
            </h3>
            <div className="space-y-2">
              {expertAdvice.map((expert, i) => (
                <Card key={i} className="rounded-xl border-0 bg-white shadow-sm">
                  <CardContent className="p-3.5 flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-blue-100 shrink-0">
                      <AvatarImage src={expert.avatar} />
                      <AvatarFallback className="bg-[#1E3A8A] text-white text-xs font-bold">
                        {expert.expert.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <p className="text-xs font-bold text-gray-900 truncate">{expert.expert}</p>
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-[9px] font-bold shrink-0">Expert</Badge>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{expert.role}</p>
                      <p className="text-[11px] text-gray-700 font-medium mt-1 line-clamp-1">{expert.topic}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-400 mb-1">{expert.replies} replies</p>
                      <button className="text-[10px] font-bold text-[#1E3A8A] bg-blue-50 px-2 py-1 rounded-lg">View</button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Feed Posts */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-2">Farmer Feed</h3>
            {isFeedLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </div>
            ) : feed?.length ? (
              <div className="space-y-3">
                {feed.map((post) => (
                  <Card key={post.id} className="rounded-2xl border-0 bg-white shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="w-10 h-10 border border-gray-100 shrink-0">
                          <AvatarImage src={post.authorAvatar || undefined} />
                          <AvatarFallback className="bg-green-100 text-green-700 text-sm font-bold">
                            {post.authorName?.charAt(0) ?? "F"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-sm font-bold text-gray-900">{post.authorName}</span>
                            {post.authorVerified && (
                              <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">Verified</span>
                            )}
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">{post.authorReputation}</span>
                          </div>
                          <p className="text-[10px] text-gray-400 font-medium">
                            {new Date(post.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed">{post.content}</p>
                    </CardContent>
                    <CardFooter className="px-4 py-2.5 border-t border-gray-50 flex gap-0">
                      <button
                        onClick={() => toggleLike(post.id)}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors flex-1 justify-center ${
                          likedPosts.has(post.id) ? "text-red-500 bg-red-50" : "text-gray-400 hover:bg-gray-50"
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${likedPosts.has(post.id) ? "fill-red-500" : ""}`} />
                        {post.likes + (likedPosts.has(post.id) ? 1 : 0)}
                      </button>
                      <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 px-3 py-2 rounded-lg hover:bg-gray-50 flex-1 justify-center">
                        <MessageCircle className="w-4 h-4" /> {post.comments}
                      </button>
                      <button className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 px-3 py-2 rounded-lg hover:bg-gray-50 flex-1 justify-center">
                        <Share2 className="w-4 h-4" /> Share
                      </button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="rounded-2xl border-0 bg-white shadow-sm">
                <CardContent className="p-8 text-center">
                  <Users className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No posts yet. Be the first to share!</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === "groups" && (
        <div className="px-4 pt-4 pb-8">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search groups..." className="pl-9 bg-white border-gray-100 rounded-xl h-10 text-sm" />
          </div>

          {isGroupsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </div>
          ) : groups?.length ? (
            <div className="space-y-3">
              {groups.map((group) => (
                <Card key={group.id} className="rounded-2xl border-0 bg-white shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                      {group.type === "livestock" ? (
                        <Tractor className="w-7 h-7 text-[#1E3A8A]" />
                      ) : group.type === "location" ? (
                        <MapPin className="w-7 h-7 text-amber-500" />
                      ) : (
                        <Wheat className="w-7 h-7 text-[#16A34A]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 leading-tight mb-0.5">{group.name}</h3>
                      <p className="text-[11px] text-gray-500 line-clamp-1">{group.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                          <Users className="w-3 h-3" /> {group.memberCount?.toLocaleString()} members
                        </span>
                        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold capitalize">{group.category}</span>
                      </div>
                    </div>
                    <Button size="sm" className="bg-[#16A34A] hover:bg-[#15803d] text-white font-bold h-8 px-4 rounded-xl shrink-0">
                      Join
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-8 text-center text-sm text-gray-400">No groups available.</CardContent>
            </Card>
          )}

          <Button variant="outline" className="w-full mt-4 h-12 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 font-semibold flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Create New Group
          </Button>
        </div>
      )}

      {/* Events Tab */}
      {activeTab === "events" && (
        <div className="px-4 pt-4 pb-8 space-y-3">
          {isEventsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          ) : events?.length ? (
            events.map((event) => (
              <Card key={event.id} className="rounded-2xl border-0 bg-white shadow-sm overflow-hidden">
                <div className="h-1.5 bg-gradient-to-r from-[#16A34A] to-[#1E3A8A]" />
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-14 rounded-xl bg-green-50 flex flex-col items-center justify-center shrink-0 border border-green-100">
                      <span className="text-[10px] font-bold text-green-600 uppercase">
                        {new Date(event.eventDate).toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-xl font-black text-gray-900 leading-none">
                        {new Date(event.eventDate).getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-sm text-gray-900 leading-tight mb-1">{event.title}</h3>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mb-2">{event.description}</p>
                      <div className="flex items-center gap-3 text-[10px] text-gray-400 font-semibold">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event.rsvpCount} RSVPs</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="flex-1 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold h-9 rounded-xl text-xs">
                      RSVP
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 border-gray-200 h-9 rounded-xl text-xs font-bold text-gray-600">
                      Share
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card className="rounded-2xl border-0 bg-white shadow-sm">
              <CardContent className="p-8 text-center text-sm text-gray-400">No upcoming events.</CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
