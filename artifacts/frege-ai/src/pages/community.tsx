import React, { useState } from "react";
import {
  Heart, MessageCircle, Share2, MapPin, Users, PlusCircle,
  Search, HelpCircle, Wheat, Tractor, Leaf, AlertCircle,
  Send, ChevronDown, ChevronUp, Shield
} from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useGetFarmConnectFeed,
  useGetFarmerGroups,
  useCreateCommunityPost,
  getGetFarmConnectFeedQueryKey,
  getGetFarmerGroupsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth";

type Tab = "feed" | "groups" | "help";

const HELP_TOPICS = [
  { id: "pest", icon: AlertCircle, label: "Pest & Disease", color: "bg-red-50 text-red-600", desc: "My crops are sick or attacked" },
  { id: "weather", icon: Leaf, label: "Weather & Planting", color: "bg-blue-50 text-blue-600", desc: "When to plant, rain info" },
  { id: "market", icon: Wheat, label: "Market & Prices", color: "bg-amber-50 text-amber-600", desc: "Where to sell, current prices" },
  { id: "animal", icon: Tractor, label: "Animal Problem", color: "bg-purple-50 text-purple-600", desc: "My animals are sick or not growing" },
];

const LOCAL_GROUPS_BY_STATE: Record<string, Array<{ name: string; desc: string; members: number; type: string }>> = {
  Kano: [
    { name: "Kano Grain Farmers", desc: "Maize, sorghum & millet farmers in Kano", members: 312, type: "crop" },
    { name: "Dawanau Traders Group", desc: "Sellers at Dawanau Grain Market", members: 180, type: "market" },
    { name: "Kano Livestock Owners", desc: "Cattle & goat farmers in Kano", members: 245, type: "livestock" },
    { name: "Rimi Cattle Sellers", desc: "Livestock traders — prices, tips, buyers", members: 98, type: "livestock" },
  ],
  Lagos: [
    { name: "Lagos Poultry Farmers", desc: "Broiler, layer & turkey farmers in Lagos", members: 267, type: "livestock" },
    { name: "Mile 12 Vegetable Sellers", desc: "Fresh produce farmers selling at Mile 12", members: 134, type: "market" },
    { name: "Lagos Urban Farmers", desc: "Small-scale urban & peri-urban farmers", members: 189, type: "crop" },
    { name: "Ikorodu Crop Farmers", desc: "Cassava, yam & plantain around Ikorodu", members: 77, type: "crop" },
  ],
  Oyo: [
    { name: "Ibadan Cassava Farmers", desc: "Cassava growers & processors in Oyo", members: 221, type: "crop" },
    { name: "Bodija Market Sellers", desc: "Farmers selling at Bodija, Ibadan", members: 156, type: "market" },
    { name: "Oyo Poultry Network", desc: "Poultry farmers sharing tips", members: 190, type: "livestock" },
    { name: "Cocoa Farmers Oyo", desc: "Cocoa & tree crop growers in Oyo", members: 103, type: "crop" },
  ],
  default: [
    { name: "Nigeria Rice Farmers", desc: "Rice farmers sharing tips & market prices nationwide", members: 1247, type: "crop" },
    { name: "Smallholder Livestock Group", desc: "Goat, cattle & chicken farmers across Nigeria", members: 894, type: "livestock" },
    { name: "Women in Agric Nigeria", desc: "Support group for female farmers", members: 567, type: "community" },
    { name: "Young Farmers Network", desc: "Youth farmers 18–35 learning together", members: 432, type: "community" },
  ],
};

export default function Community() {
  const queryClient = useQueryClient();
  const { farmer } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("feed");
  const [postContent, setPostContent] = useState("");
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [helpTopic, setHelpTopic] = useState<string | null>(null);
  const [helpText, setHelpText] = useState("");
  const [expandedHelp, setExpandedHelp] = useState(false);

  const { data: feed, isLoading: isFeedLoading } = useGetFarmConnectFeed({ query: { queryKey: getGetFarmConnectFeedQueryKey() } });
  const { data: groups, isLoading: isGroupsLoading } = useGetFarmerGroups({ query: { queryKey: getGetFarmerGroupsQueryKey() } });
  const createPost = useCreateCommunityPost();

  const farmerState = (farmer as any)?.state ?? "";
  const localGroups = LOCAL_GROUPS_BY_STATE[farmerState] ?? LOCAL_GROUPS_BY_STATE.default;

  const allGroups = [
    ...localGroups,
    ...(groups ?? []).map(g => ({ name: g.name, desc: g.description, members: g.memberCount ?? 0, type: g.type })),
  ];

  const filteredGroups = allGroups.filter(g =>
    !searchTerm || g.name.toLowerCase().includes(searchTerm.toLowerCase()) || g.desc.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePost = () => {
    if (!postContent.trim()) return;
    createPost.mutate(
      { data: { content: postContent } },
      { onSuccess: () => { setPostContent(""); queryClient.invalidateQueries({ queryKey: getGetFarmConnectFeedQueryKey() }); } }
    );
  };

  const handleHelpPost = () => {
    if (!helpText.trim() || !helpTopic) return;
    const fullContent = `[${HELP_TOPICS.find(t => t.id === helpTopic)?.label ?? helpTopic}] ${helpText}`;
    createPost.mutate(
      { data: { content: fullContent } },
      { onSuccess: () => { setHelpText(""); setHelpTopic(null); queryClient.invalidateQueries({ queryKey: getGetFarmConnectFeedQueryKey() }); setActiveTab("feed"); } }
    );
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "feed", label: "Feed", icon: <MessageCircle className="w-4 h-4" /> },
    { id: "groups", label: "Groups", icon: <Users className="w-4 h-4" /> },
    { id: "help", label: "Ask for Help", icon: <HelpCircle className="w-4 h-4" /> },
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="bg-white px-4 pt-12 pb-0 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Farmer Community</h1>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {farmerState ? `${farmerState} State farmers` : "Farmers across Nigeria"}
            </p>
          </div>
        </div>
        <div className="flex gap-0 border-b border-gray-100">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition-colors flex-1 justify-center ${activeTab === tab.id ? "border-[#16A34A] text-[#16A34A]" : "border-transparent text-gray-400"}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Tab */}
      {activeTab === "feed" && (
        <div className="px-4 pt-4 pb-8 space-y-4">
          <Card className="rounded-2xl border-0 bg-white shadow-sm">
            <CardContent className="p-3">
              <div className="flex gap-3 mb-2">
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarFallback className="bg-[#16A34A] text-white text-sm font-black">
                    {(farmer?.name ?? "F").charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Textarea placeholder="Share a tip, update, or question with other farmers..." value={postContent} onChange={(e) => setPostContent(e.target.value)}
                  className="flex-1 min-h-[72px] resize-none bg-gray-50 border-gray-100 rounded-xl text-sm focus-visible:ring-green-400" />
              </div>
              <div className="flex justify-end">
                <Button size="sm" onClick={handlePost} disabled={!postContent.trim() || createPost.isPending}
                  className="bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl px-5 h-8">
                  {createPost.isPending ? "Posting..." : "Post"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Ask for help shortcut */}
          <button onClick={() => setActiveTab("help")} className="w-full">
            <Card className="rounded-xl border-0 bg-gradient-to-r from-green-50 to-emerald-50 shadow-sm">
              <CardContent className="p-3.5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#16A34A]/10 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-5 h-5 text-[#16A34A]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-bold text-gray-900">Need help with your farm?</p>
                  <p className="text-[11px] text-gray-500">Ask farmers near you — they know your area</p>
                </div>
                <span className="text-xs font-bold text-[#16A34A] bg-[#16A34A]/10 px-3 py-1.5 rounded-lg">Ask</span>
              </CardContent>
            </Card>
          </button>

          {isFeedLoading ? (
            <div className="space-y-3">{[1,2].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}</div>
          ) : feed?.length ? (
            <div className="space-y-3">
              {feed.map((post) => (
                <Card key={post.id} className="rounded-2xl border-0 bg-white shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="w-10 h-10 border border-gray-100 shrink-0">
                        <AvatarImage src={post.authorAvatar || undefined} />
                        <AvatarFallback className="bg-green-100 text-green-700 text-sm font-black">
                          {post.authorName?.charAt(0) ?? "F"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">{post.authorName}</span>
                          {post.authorVerified && (
                            <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">Verified</span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {new Date(post.createdAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{post.content}</p>
                  </CardContent>
                  <CardFooter className="px-4 py-2.5 border-t border-gray-50 flex gap-0">
                    <button onClick={() => setLikedPosts(p => { const n = new Set(p); n.has(post.id) ? n.delete(post.id) : n.add(post.id); return n; })}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg flex-1 justify-center ${likedPosts.has(post.id) ? "text-red-500 bg-red-50" : "text-gray-400 hover:bg-gray-50"}`}>
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
                <p className="text-sm font-bold text-gray-600 mb-1">No posts yet</p>
                <p className="text-xs text-gray-400">Be the first to share a tip with farmers near you!</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Groups Tab */}
      {activeTab === "groups" && (
        <div className="px-4 pt-4 pb-8">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search groups..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 bg-white border-gray-100 rounded-xl h-10 text-sm" />
          </div>

          {farmerState && (
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-3.5 h-3.5 text-[#16A34A]" />
              <p className="text-xs font-bold text-[#16A34A]">Groups in {farmerState} State</p>
            </div>
          )}

          <div className="space-y-3">
            {filteredGroups.map((group, i) => (
              <Card key={i} className="rounded-2xl border-0 bg-white shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                    {group.type === "livestock" ? <Tractor className="w-6 h-6 text-[#1E3A8A]" />
                      : group.type === "market" ? <Wheat className="w-6 h-6 text-amber-500" />
                      : <Leaf className="w-6 h-6 text-[#16A34A]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm text-gray-900 leading-tight">{group.name}</h3>
                    <p className="text-[11px] text-gray-500 line-clamp-1">{group.desc}</p>
                    <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1 mt-1">
                      <Users className="w-3 h-3" /> {group.members.toLocaleString()} members
                    </span>
                  </div>
                  <Button size="sm" className="bg-[#16A34A] hover:bg-[#15803d] text-white font-bold h-8 px-3 rounded-xl shrink-0 text-xs">
                    Join
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button variant="outline" className="w-full mt-4 h-12 rounded-2xl border-2 border-dashed border-gray-200 text-gray-500 font-semibold flex items-center gap-2">
            <PlusCircle className="w-4 h-4" /> Create a Group in Your Area
          </Button>
        </div>
      )}

      {/* Help Tab */}
      {activeTab === "help" && (
        <div className="px-4 pt-4 pb-8 space-y-4">
          <Card className="rounded-2xl border-0 bg-white shadow-sm">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-1">What is your problem?</h3>
              <p className="text-xs text-gray-500 mb-3">Farmers near you will see your question and help you</p>

              <div className="grid grid-cols-2 gap-2 mb-4">
                {HELP_TOPICS.map((topic) => (
                  <button key={topic.id} onClick={() => setHelpTopic(topic.id === helpTopic ? null : topic.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center ${helpTopic === topic.id ? "border-[#16A34A] bg-green-50" : "border-gray-100 bg-gray-50"}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${topic.color}`}>
                      <topic.icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-gray-800">{topic.label}</p>
                    <p className="text-[10px] text-gray-400 leading-tight">{topic.desc}</p>
                  </button>
                ))}
              </div>

              {helpTopic && (
                <div className="space-y-3">
                  <Textarea
                    placeholder={`Describe your ${HELP_TOPICS.find(t => t.id === helpTopic)?.label.toLowerCase()} problem in detail. Where is it? When did it start? What does it look like?`}
                    value={helpText}
                    onChange={e => setHelpText(e.target.value)}
                    className="min-h-[100px] resize-none bg-gray-50 border-gray-100 rounded-xl text-sm"
                  />
                  <Button onClick={handleHelpPost} disabled={!helpText.trim() || createPost.isPending}
                    className="w-full h-11 bg-[#16A34A] hover:bg-[#15803d] text-white font-bold rounded-xl flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    {createPost.isPending ? "Posting..." : "Post My Question — Get Help"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Expert line */}
          <Card className="rounded-xl border-0 bg-blue-50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1E3A8A]/10 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-[#1E3A8A]" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Extension Officer Line</p>
                <p className="text-xs text-gray-500">Talk to a government extension officer free</p>
                <p className="text-xs font-bold text-[#1E3A8A] mt-0.5">Call: 0800-FADAMA-01 (free)</p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border-0 bg-green-50 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#16A34A]/10 flex items-center justify-center shrink-0">
                <HelpCircle className="w-5 h-5 text-[#16A34A]" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">FarmGPT AI Helper</p>
                <p className="text-xs text-gray-500">Ask FarmGPT — available 24/7 in Hausa, English, Yoruba</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
