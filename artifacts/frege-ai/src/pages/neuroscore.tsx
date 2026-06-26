import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  useGetFarmerProfile,
  useGetNeuroScore,
  useGetNeuroScoreBreakdown,
  useGetReadinessScores,
  getGetFarmerProfileQueryKey,
  getGetNeuroScoreQueryKey,
  getGetNeuroScoreBreakdownQueryKey,
  getGetReadinessScoresQueryKey
} from "@workspace/api-client-react";
import { ShieldCheck, Award, TrendingUp, CreditCard, Landmark, HandHeart, CheckCircle2 } from "lucide-react";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function NeuroScore() {
  const { data: profile } = useGetFarmerProfile({ query: { queryKey: getGetFarmerProfileQueryKey() } });
  const { data: scoreData } = useGetNeuroScore({ query: { queryKey: getGetNeuroScoreQueryKey() } });
  const { data: breakdown } = useGetNeuroScoreBreakdown({ query: { queryKey: getGetNeuroScoreBreakdownQueryKey() } });
  const { data: readiness } = useGetReadinessScores({ query: { queryKey: getGetReadinessScoresQueryKey() } });

  const radarData = breakdown ? [
    { subject: 'Crops', A: breakdown.cropPerformance, fullMark: 100 },
    { subject: 'Livestock', A: breakdown.livestockPerformance, fullMark: 100 },
    { subject: 'Activity', A: breakdown.farmActivity, fullMark: 100 },
    { subject: 'Market', A: breakdown.marketplaceActivity, fullMark: 100 },
    { subject: 'Records', A: breakdown.farmRecords, fullMark: 100 },
  ] : [];

  return (
    <div className="flex flex-col min-h-screen bg-muted/10 pb-[72px]">
      <header className="p-4 bg-background border-b border-border/50 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">NeuroScore</h1>
          <p className="text-sm text-muted-foreground font-medium">Identity & Financial Trust</p>
        </div>
        <Award className="w-8 h-8 text-accent opacity-80" />
      </header>

      <div className="p-4 space-y-6">
        {/* Main Gauge */}
        {scoreData && (
          <Card className="border-none shadow-lg bg-gradient-to-br from-secondary/95 to-secondary text-secondary-foreground overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <ShieldCheck className="w-32 h-32" />
            </div>
            <CardContent className="p-6 flex flex-col items-center relative z-10 text-center">
              <h2 className="text-sm font-bold uppercase tracking-widest opacity-80 mb-6">Current Trust Score</h2>
              
              <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-8 border-white/10 mb-4">
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle
                    cx="80" cy="80" r="72"
                    fill="transparent" stroke="rgba(255,255,255,0.2)" strokeWidth="8"
                  />
                  <circle
                    cx="80" cy="80" r="72"
                    fill="transparent" stroke="#FBBF24" strokeWidth="8"
                    strokeDasharray={452}
                    strokeDashoffset={452 - (452 * scoreData.score) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="text-center">
                  <span className="text-5xl font-black block leading-none tracking-tighter">{scoreData.score}</span>
                </div>
              </div>
              
              <Badge className="bg-accent text-accent-foreground text-sm font-bold px-4 py-1 rounded-full border-none mb-3">
                {scoreData.level} Level
              </Badge>
              
              <div className="flex items-center gap-1.5 text-sm font-semibold bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
                <TrendingUp className="w-4 h-4 text-accent" />
                <span className="text-white">+{scoreData.change30Days} pts</span>
                <span className="opacity-70 font-medium ml-1">in 30 days</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Passport Card */}
        {profile && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 pl-1">Farm Passport</h2>
            <Card className="border border-border shadow-md overflow-hidden bg-card">
              <div className="h-1.5 w-full bg-gradient-to-r from-primary via-accent to-secondary" />
              <CardContent className="p-5">
                <div className="flex gap-4">
                  <div className="w-20 h-24 bg-muted rounded-lg border border-border/50 overflow-hidden shrink-0">
                     <img src="https://i.pravatar.cc/150?u=aminu" alt="Profile" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="font-black text-xl leading-none text-foreground">{profile.name}</h3>
                      {profile.verificationStatus === 'verified' && <CheckCircle2 className="w-5 h-5 text-primary" />}
                    </div>
                    <p className="text-sm font-semibold text-muted-foreground mb-3">ID: FRG-{profile.id.toString().padStart(6, '0')}</p>
                    
                    <div className="grid grid-cols-2 gap-y-2 gap-x-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Region</span>
                        <span className="font-semibold text-foreground">{profile.state}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Focus</span>
                        <span className="font-semibold text-foreground capitalize">{profile.farmingType}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Joined</span>
                        <span className="font-semibold text-foreground">{new Date(profile.joinedAt).getFullYear()}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px] uppercase font-bold">Status</span>
                        <span className="font-semibold text-primary uppercase">{profile.verificationStatus}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Radar Chart */}
        <section>
           <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 pl-1">Score Breakdown</h2>
           <Card className="border-border/50 shadow-sm">
            <CardContent className="p-4 pt-6 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Score" dataKey="A" stroke="#1E3A8A" fill="#1E3A8A" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
           </Card>
        </section>

        {/* Readiness Scores */}
        {readiness && (
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3 pl-1">Financial Readiness</h2>
            <div className="grid gap-3">
              <ReadinessCard 
                title="Micro-Loan" 
                score={readiness.loanReadiness.score} 
                level={readiness.loanReadiness.level} 
                icon={<Landmark className="w-5 h-5" />} 
              />
              <ReadinessCard 
                title="Crop Insurance" 
                score={readiness.insuranceReadiness.score} 
                level={readiness.insuranceReadiness.level} 
                icon={<ShieldCheck className="w-5 h-5" />} 
              />
              <ReadinessCard 
                title="Input Credit" 
                score={readiness.investorReadiness.score} 
                level={readiness.investorReadiness.level} 
                icon={<CreditCard className="w-5 h-5" />} 
              />
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ReadinessCard({ title, score, level, icon }: { title: string, score: number, level: string, icon: React.ReactNode }) {
  const isHigh = score >= 80;
  const isMed = score >= 50 && score < 80;
  const colorClass = isHigh ? "text-primary" : isMed ? "text-accent-foreground" : "text-destructive";
  const bgClass = isHigh ? "bg-primary" : isMed ? "bg-accent" : "bg-destructive";

  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-muted ${colorClass}`}>
              {icon}
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">{title}</h3>
              <p className="text-xs text-muted-foreground capitalize">{level} Probability</p>
            </div>
          </div>
          <span className={`text-lg font-black ${colorClass}`}>{score}%</span>
        </div>
        <Progress value={score} className="h-2 bg-muted" />
      </CardContent>
    </Card>
  );
}
